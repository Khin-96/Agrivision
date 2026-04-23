# 🎙️ Twilio Voice AI Agent Setup Guide

This guide explains how to run and configure the Voice-based AI Assistant with automatic LLM fallback (Claude -> Gemini -> Groq).

## 📋 Prerequisites

Ensure you have the following installed and configured:
- **Node.js** (v16 or higher)
- **Twilio Account**: A Twilio phone number with Voice capabilities.
- **ngrok**: For exposing your local server to the internet.
- **API Keys**:
  - Twilio Account SID & Auth Token
  - Gemini API Key (Primary Fallback)
  - Groq API Key (Secondary Fallback)
  - Claude API Key (Optional, Primary)

---

## ⚙️ 1. Environment Configuration

Your `.env` file should contain the following keys:

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_sid_here
TWILIO_AUTH_TOKEN=your_token_here
TWILIO_PHONE_NUMBER=+18312736077

# LLM API Keys
CLAUDE_API_KEY=your_claude_key_here
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here

# Server Configuration
VOICE_PORT=5000
```

---

## 🚀 2. Running the Server

1. **Install Dependencies** (if not already done):
   ```bash
   npm install express body-parser twilio axios dotenv
   ```

2. **Start the Voice Server**:
   ```bash
   node voice-server.js
   ```
   The server will start on port `5000`.

---

## 🌐 3. Exposing to the Internet (ngrok)

Open a new terminal window and run:
```bash
npx ngrok http 5000
```
Copy the **Forwarding URL** (e.g., `https://xxxx-xxxx.ngrok-free.dev`).

---

## 📞 4. Twilio Webhook Configuration

1. Log in to the [Twilio Console](https://www.twilio.com/console/voice/numbers).
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**.
3. Click on your number (**+18312736077**).
4. Scroll down to the **Voice & Fax** section.
5. Under **A CALL COMES IN**, set:
   - **Endpoint**: Webhook
   - **URL**: `https://YOUR_NGROK_URL/voice`
   - **Method**: HTTP POST
6. (Optional) Set **Status Callback URL** to `https://YOUR_NGROK_URL/status-callback` to clean up memory after calls.
7. Click **Save Configuration**.

---

## 🧠 How It Works

### LLM Fallback Chain
The agent attempts to generate a response in this order:
1. **Claude API** (`claude-opus-4-1`)
2. **Gemini API** (`gemini-pro`) - *If Claude fails or key is missing*
3. **Groq API** (`llama-3.1-8b-instant`) - *If Gemini fails*

### Premium Features
- **Neural Voice**: Uses `Polly.Joanna-Neural` for smooth, human-like speech.
- **Real-time Memory**: Remembers the conversation context throughout the call.
- **Auto-Cleanup**: Automatically deletes conversation history when the call ends.
- **Logging**: Every interaction is logged in the terminal, including which AI was used for the response.

---

## 🛠️ Troubleshooting

- **No sound?** Ensure your Twilio balance is sufficient and the webhook URL is correct (must end in `/voice`).
- **AI taking too long?** Check your internet connection or try reducing the history length in the code.
- **Port already in use?** Change `VOICE_PORT` in `.env` to a different number (e.g., `5001`) and update ngrok accordingly.
