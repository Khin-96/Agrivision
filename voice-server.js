const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Requirements specify PORT variable
const PORT = process.env.VOICE_PORT || process.env.PORT || 5000;

// Conversation history store (In-memory, indexed by CallSid)
const conversations = new Map();

// Helper to log with timestamp
const log = (level, message, data = '') => {
    const timestamp = new Date().toISOString();
    const icons = {
        info: '🔵',
        success: '✅',
        warn: '🟡',
        error: '🔴'
    };
    console.log(`${icons[level] || '⚪'} [${timestamp}] ${message}`, data);
};

// --- LLM API CALLS ---

async function callClaude(messages) {
    if (!process.env.CLAUDE_API_KEY) throw new Error("Claude API key missing");

    log('info', 'Attempting Claude API (claude-opus-4-1)...');
    // Using the user-specified model string. Note: it may fail if not a valid Anthropic model.
    // Fallback logic will handle the failure.
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-opus-4-1',
        max_tokens: 1024,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        system: "You are a Vision AI assistant. You must be extremely brief. Respond in 1 or 2 sentences maximum. No long explanations. Be natural and conversational."
    }, {
        headers: {
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
    });
    return response.data.content[0].text;
}

async function callGemini(messages) {
    if (!process.env.GEMINI_API_KEY) throw new Error("Gemini API key missing");

    log('info', 'Attempting Gemini API (gemini-pro)...');
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        contents: contents
    });

    return response.data.candidates[0].content.parts[0].text;
}

async function callGroq(messages) {
    if (!process.env.GROQ_API_KEY) throw new Error("Groq API (llama-3.1-8b-instant)...");

    log('info', 'Attempting Groq API...');
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [
            { role: 'system', content: 'You are a Vision AI agricultural assistant. Keep responses brief for voice conversation.' },
            ...messages
        ]
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data.choices[0].message.content;
}

// --- VOICE ENDPOINTS ---

// 1. Initial Call Entry
app.post('/voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;

    log('info', `New call received. SID: ${callSid}`);

    // Initialize history
    conversations.set(callSid, []);

    const gather = twiml.gather({
        input: 'speech',
        action: '/handle-speech',
        timeout: 10,
        speechTimeout: 2, // More natural breathing room
        language: 'en-US'
    });

    const responseText = "Hello! I am an VIsion AI assistant. How can I help you today?";
    gather.say({ voice: 'Google.en-US-Standard-C', language: 'en-US' },
        `<speak><break time="100ms"/>${responseText}</speak>`);

    // If no input, loop back
    twiml.redirect('/voice');

    res.type('text/xml');
    res.send(twiml.toString());
});

// 2. Handle Speech Input
app.post('/handle-speech', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult;

    if (!speechResult) {
        log('warn', `No speech detected for SID: ${callSid}`);
        const gather = twiml.gather({
            input: 'speech',
            action: '/handle-speech',
            timeout: 10,
            speechTimeout: 2
        });
        gather.say({ voice: 'Google.en-US-Standard-C', language: 'en-US' },
            `<speak><break time="100ms"/>I didn't catch that. Could you repeat?</speak>`);
        return res.send(twiml.toString());
    }

    log('info', `User [${callSid}]: ${speechResult}`);

    // Check for exit
    if (speechResult.toLowerCase().includes('goodbye') || speechResult.toLowerCase().includes('bye')) {
        twiml.say({ voice: 'Polly.Joanna-Neural' }, "Goodbye! Have a great day.");
        twiml.hangup();
        conversations.delete(callSid);
        return res.send(twiml.toString());
    }

    // Get history
    let history = conversations.get(callSid) || [];
    history.push({ role: 'user', content: speechResult });

    let aiResponse = "";
    let usedLLM = "";

    // Fallback Chain: Claude -> Gemini -> Groq
    try {
        aiResponse = await callClaude(history);
        usedLLM = "Claude";
    } catch (err) {
        log('error', `Claude failed: ${err.response?.data?.error?.message || err.message}`);
        try {
            aiResponse = await callGemini(history);
            usedLLM = "Gemini";
        } catch (err2) {
            log('error', `Gemini failed: ${err2.response?.data?.error?.message || err2.message}`);
            try {
                aiResponse = await callGroq(history);
                usedLLM = "Groq";
            } catch (err3) {
                log('error', `Groq failed: ${err3.response?.data?.error?.message || err3.message}`);
                aiResponse = "I'm having trouble processing your request. Please try again.";
                usedLLM = "None (Error)";
            }
        }
    }

    log('success', `[${usedLLM}] Response: ${aiResponse}`);

    // Update history
    history.push({ role: 'assistant', content: aiResponse });
    conversations.set(callSid, history);

    // Speak response with SSML for smoothness
    twiml.say({ voice: 'Google.en-US-Standard-C', language: 'en-US' },
        `<speak><break time="100ms"/>${aiResponse}</speak>`);

    // Gather more input
    twiml.gather({
        input: 'speech',
        action: '/handle-speech',
        timeout: 10,
        speechTimeout: 2,
        language: 'en-US'
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// Cleanup when call ends
app.post('/status-callback', (req, res) => {
    const callSid = req.body.CallSid;
    conversations.delete(callSid);
    log('info', `Cleaned up conversation for SID: ${callSid}`);
    res.sendStatus(200);
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), port: PORT });
});

app.listen(PORT, () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🌐 Voice Server running at http://localhost:${PORT}`);
    console.log(`📞 Twilio Webhook (Voice): POST /voice`);
    console.log(`💊 Health check: GET /health`);
    console.log(`========================================\n`);
});
