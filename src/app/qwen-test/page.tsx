"use client";

import { useState, useRef } from "react";

type Tab = "text" | "analyze-image" | "analyze-video" | "generate-image";

const TABS: { id: Tab; label: string }[] = [
    { id: "text", label: "Text Chat" },
    { id: "analyze-image", label: "Analyze Image" },
    { id: "analyze-video", label: "Analyze Video" },
    { id: "generate-image", label: "Generate Image" },
];

export default function QwenTestPage() {
    const [activeTab, setActiveTab] = useState<Tab>("text");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // form fields
    const [textPrompt, setTextPrompt] = useState("Say hello and tell me what you can do.");
    const [imagePrompt, setImagePrompt] = useState("Describe this image in detail. Identify any crops, plants, or agricultural elements.");
    const [videoUrl, setVideoUrl] = useState("");
    const [videoPrompt, setVideoPrompt] = useState("Describe what is happening in this video.");
    const [genPrompt, setGenPrompt] = useState("A lush green Kenyan farm with maize crops under a clear blue sky, photorealistic.");
    const [genSize, setGenSize] = useState("1024*1024");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    function reset() {
        setResult(null);
        setGeneratedImage(null);
        setError(null);
    }

    async function runTest() {
        reset();
        setLoading(true);
        try {
            const fd = new FormData();

            if (activeTab === "text") {
                fd.append("action", "text");
                fd.append("prompt", textPrompt);
            } else if (activeTab === "analyze-image") {
                if (!imageFile) { setError("Please select an image file."); setLoading(false); return; }
                fd.append("action", "analyze-image");
                fd.append("prompt", imagePrompt);
                fd.append("file", imageFile);
            } else if (activeTab === "analyze-video") {
                if (!videoUrl.trim()) { setError("Please enter a video URL."); setLoading(false); return; }
                fd.append("action", "analyze-video-url");
                fd.append("prompt", videoPrompt);
                fd.append("videoUrl", videoUrl);
            } else if (activeTab === "generate-image") {
                fd.append("action", "generate-image");
                fd.append("prompt", genPrompt);
                fd.append("size", genSize);
            }

            const res = await fetch("/api/qwen-test", { method: "POST", body: fd });
            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Unknown error");
            } else if (activeTab === "generate-image") {
                setGeneratedImage(data.imageUrl);
            } else {
                setResult(data.result);
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
        reset();
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerBadge}>QWEN API</div>
                    <h1 style={styles.title}>Qwen API Test Console</h1>
                    <p style={styles.subtitle}>
                        Test image generation, image analysis, video analysis, and text chat powered by Alibaba Qwen.
                    </p>
                </div>

                {/* Tabs */}
                <div style={styles.tabBar}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            style={{
                                ...styles.tabBtn,
                                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
                            }}
                            onClick={() => { setActiveTab(tab.id); reset(); }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={styles.tabContent}>
                    {/* ── Text Chat ─────────────────────────── */}
                    {activeTab === "text" && (
                        <div style={styles.form}>
                            <label style={styles.label}>Prompt</label>
                            <textarea
                                style={styles.textarea}
                                value={textPrompt}
                                onChange={(e) => setTextPrompt(e.target.value)}
                                rows={4}
                                placeholder="Enter your message..."
                            />
                        </div>
                    )}

                    {/* ── Analyze Image ─────────────────────── */}
                    {activeTab === "analyze-image" && (
                        <div style={styles.form}>
                            <label style={styles.label}>Upload Image</label>
                            <div
                                style={styles.dropzone}
                                onClick={() => fileRef.current?.click()}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" style={styles.preview} />
                                ) : (
                                    <span style={styles.dropzoneText}>Click to select an image (JPEG, PNG, WEBP)</span>
                                )}
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />
                            <label style={styles.label}>Analysis Prompt</label>
                            <textarea
                                style={styles.textarea}
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                rows={3}
                                placeholder="What do you want to know about this image?"
                            />
                        </div>
                    )}

                    {/* ── Analyze Video ─────────────────────── */}
                    {activeTab === "analyze-video" && (
                        <div style={styles.form}>
                            <label style={styles.label}>Video URL</label>
                            <p style={styles.hint}>
                                Provide a publicly accessible video URL (MP4, MOV, AVI). The model will analyze the content.
                            </p>
                            <input
                                style={styles.input}
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://example.com/video.mp4"
                            />
                            <label style={styles.label}>Analysis Prompt</label>
                            <textarea
                                style={styles.textarea}
                                value={videoPrompt}
                                onChange={(e) => setVideoPrompt(e.target.value)}
                                rows={3}
                                placeholder="What do you want to know about this video?"
                            />
                        </div>
                    )}

                    {/* ── Generate Image ────────────────────── */}
                    {activeTab === "generate-image" && (
                        <div style={styles.form}>
                            <label style={styles.label}>Image Prompt</label>
                            <textarea
                                style={styles.textarea}
                                value={genPrompt}
                                onChange={(e) => setGenPrompt(e.target.value)}
                                rows={4}
                                placeholder="Describe the image you want to generate..."
                            />
                            <label style={styles.label}>Size</label>
                            <select
                                style={styles.select}
                                value={genSize}
                                onChange={(e) => setGenSize(e.target.value)}
                            >
                                <option value="1024*1024">1024 x 1024 (Square)</option>
                                <option value="720*1280">720 x 1280 (Portrait)</option>
                                <option value="1280*720">1280 x 720 (Landscape)</option>
                            </select>
                            <p style={styles.hint}>
                                Note: Image generation uses the Wanx model and may take 15-60 seconds.
                            </p>
                        </div>
                    )}
                </div>

                {/* Run Button */}
                <button
                    style={{
                        ...styles.runBtn,
                        ...(loading ? styles.runBtnDisabled : {}),
                    }}
                    onClick={runTest}
                    disabled={loading}
                >
                    {loading ? (
                        <span style={styles.spinner} />
                    ) : null}
                    {loading
                        ? activeTab === "generate-image"
                            ? "Generating image..."
                            : "Processing..."
                        : "Run Test"}
                </button>

                {/* Error */}
                {error && (
                    <div style={styles.errorBox}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Text / Vision Result */}
                {result && (
                    <div style={styles.resultBox}>
                        <div style={styles.resultLabel}>Response</div>
                        <pre style={styles.resultText}>{result}</pre>
                    </div>
                )}

                {/* Generated Image Result */}
                {generatedImage && (
                    <div style={styles.resultBox}>
                        <div style={styles.resultLabel}>Generated Image</div>
                        <img src={generatedImage} alt="Generated" style={styles.generatedImg} />
                        <a
                            href={generatedImage}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.downloadLink}
                        >
                            Open full image in new tab
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 50%, #0a1628 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px 60px",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    },
    card: {
        width: "100%",
        maxWidth: "760px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "20px",
        backdropFilter: "blur(16px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        overflow: "hidden",
    },
    header: {
        padding: "36px 36px 28px",
        background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.10) 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
    },
    headerBadge: {
        display: "inline-block",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#fff",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "2px",
        padding: "4px 10px",
        borderRadius: "20px",
        marginBottom: "12px",
    },
    title: {
        margin: 0,
        fontSize: "26px",
        fontWeight: 700,
        color: "#f1f5f9",
        letterSpacing: "-0.5px",
    },
    subtitle: {
        margin: "8px 0 0",
        fontSize: "14px",
        color: "#94a3b8",
        lineHeight: "1.6",
    },
    tabBar: {
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 36px",
        gap: "4px",
        overflowX: "auto",
    },
    tabBtn: {
        padding: "14px 18px",
        background: "none",
        border: "none",
        borderBottom: "2px solid transparent",
        color: "#64748b",
        fontSize: "13px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "color 0.2s, border-color 0.2s",
        whiteSpace: "nowrap",
    },
    tabBtnActive: {
        color: "#818cf8",
        borderBottom: "2px solid #818cf8",
    },
    tabContent: {
        padding: "28px 36px 0",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "14px",
    },
    label: {
        fontSize: "12px",
        fontWeight: 600,
        color: "#94a3b8",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
    },
    textarea: {
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "10px",
        color: "#e2e8f0",
        fontSize: "14px",
        padding: "12px 14px",
        resize: "vertical",
        outline: "none",
        fontFamily: "inherit",
        lineHeight: "1.6",
        boxSizing: "border-box",
    },
    input: {
        width: "100%",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "10px",
        color: "#e2e8f0",
        fontSize: "14px",
        padding: "12px 14px",
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
    },
    select: {
        width: "100%",
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "10px",
        color: "#e2e8f0",
        fontSize: "14px",
        padding: "12px 14px",
        outline: "none",
        cursor: "pointer",
    },
    dropzone: {
        width: "100%",
        minHeight: "160px",
        border: "2px dashed rgba(99,102,241,0.4)",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        background: "rgba(99,102,241,0.04)",
        transition: "border-color 0.2s, background 0.2s",
        overflow: "hidden",
        boxSizing: "border-box",
    },
    dropzoneText: {
        color: "#64748b",
        fontSize: "14px",
        textAlign: "center" as const,
        padding: "20px",
    },
    preview: {
        maxWidth: "100%",
        maxHeight: "300px",
        objectFit: "contain" as const,
        borderRadius: "8px",
    },
    hint: {
        fontSize: "12px",
        color: "#64748b",
        margin: 0,
        lineHeight: "1.5",
    },
    runBtn: {
        margin: "24px 36px 28px",
        width: "calc(100% - 72px)",
        padding: "14px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        border: "none",
        borderRadius: "12px",
        color: "#fff",
        fontSize: "15px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "opacity 0.2s, transform 0.1s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        letterSpacing: "0.3px",
        boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
    },
    runBtnDisabled: {
        opacity: 0.65,
        cursor: "not-allowed",
    },
    spinner: {
        display: "inline-block",
        width: "16px",
        height: "16px",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTop: "2px solid #fff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    errorBox: {
        margin: "0 36px 24px",
        padding: "14px 16px",
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: "10px",
        color: "#fca5a5",
        fontSize: "13px",
        lineHeight: "1.6",
        wordBreak: "break-word" as const,
    },
    resultBox: {
        margin: "0 36px 36px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        overflow: "hidden",
    },
    resultLabel: {
        padding: "10px 16px",
        background: "rgba(99,102,241,0.10)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "1px",
        textTransform: "uppercase" as const,
        color: "#818cf8",
    },
    resultText: {
        margin: 0,
        padding: "16px",
        color: "#cbd5e1",
        fontSize: "14px",
        lineHeight: "1.75",
        whiteSpace: "pre-wrap" as const,
        wordBreak: "break-word" as const,
        fontFamily: "inherit",
    },
    generatedImg: {
        width: "100%",
        display: "block",
        borderRadius: "0 0 0 0",
    },
    downloadLink: {
        display: "block",
        padding: "10px 16px",
        fontSize: "12px",
        color: "#818cf8",
        textDecoration: "none",
        borderTop: "1px solid rgba(255,255,255,0.06)",
    },
};
