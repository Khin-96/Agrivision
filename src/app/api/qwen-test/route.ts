import { NextRequest, NextResponse } from "next/server";

const HF_API_KEY = process.env.HF_API_KEY!;
const HF_MODEL = process.env.HF_MODEL || "Qwen/Qwen2.5-VL-7B-Instruct";
const HF_BASE_URL = "https://router.huggingface.co/v1";

// ─── Image/Video Analysis (vision) ──────────────────────────────────────────
async function analyzeVision(imageBase64: string, mimeType: string, prompt: string) {
    const body = {
        model: HF_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${imageBase64}`,
                        },
                    },
                    {
                        type: "text",
                        text: prompt || "Describe this content in detail.",
                    },
                ],
            },
        ],
        max_tokens: 1000,
    };

    const res = await fetch(`${HF_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || data?.error || JSON.stringify(data));
    return data.choices[0].message.content;
}

// ─── Image Generation (Using direct model endpoint) ──
async function generateImage(prompt: string) {
    const res = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: prompt }),
        }
    );

    if (!res.ok) {
        const text = await res.text();
        try {
            const err = JSON.parse(text);
            throw new Error(err?.error?.message || err?.error || "Image generation failed.");
        } catch {
            throw new Error(`Image generation failed: ${res.statusText}`);
        }
    }

    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
}

// ─── Text Chat ─────────────────────────────────────────────────────────────
async function textChat(prompt: string) {
    const body = {
        model: HF_MODEL,
        messages: [
            { role: "user", content: prompt },
        ],
        max_tokens: 1000,
    };

    const res = await fetch(`${HF_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || data?.error || JSON.stringify(data));
    return data.choices[0].message.content;
}

// ─── Route Handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const action = formData.get("action") as string;
        const prompt = formData.get("prompt") as string;

        if (action === "text") {
            const result = await textChat(prompt);
            return NextResponse.json({ success: true, result });
        }

        if (action === "analyze-image" || action === "analyze-video") {
            const file = formData.get("file") as File;
            if (!file) throw new Error("No file uploaded");

            const buffer = await file.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");

            // For video, Qwen2.5-VL can handle frames. On HF serverless, we send it as an "image" block.
            // If it's a real video file, the first frame is usually what's extracted by simpler integrations.
            const result = await analyzeVision(base64, file.type, prompt);
            return NextResponse.json({ success: true, result });
        }

        if (action === "generate-image") {
            const imageUrl = await generateImage(prompt);
            return NextResponse.json({ success: true, imageUrl });
        }

        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("❌ Qwen HF Test Error:", message);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
