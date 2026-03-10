"use client";
import { useState } from "react";
import Link from 'next/link';
import FfmpegPreview from "@/components/FfmpegPreview";
import { Download, UploadCloud, Settings2, PlayCircle } from "lucide-react";

export default function ChromakeyPage() {
    const [file, setFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>("");
    const [color, setColor] = useState("#00FF00");
    const [tolerance, setTolerance] = useState(0.1);
    const [spill, setSpill] = useState(0.1);
    const [pingPong, setPingPong] = useState(false);
    const [bypassChromakey, setBypassChromakey] = useState(false);
    const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const [downloadUrl, setDownloadUrl] = useState("");
    const [errorText, setErrorText] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            setVideoUrl(URL.createObjectURL(f));
            setStatus("idle");
            setProgress(0);
            setDownloadUrl("");
        }
    };

    const handleRender = async () => {
        if (!file) return;
        setStatus("uploading");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("color", color);
        formData.append("tolerance", tolerance.toString());
        formData.append("spill", spill.toString());
        formData.append("pingPong", pingPong.toString());
        formData.append("bypass", bypassChromakey.toString());

        try {
            const res = await fetch("/api/chromakey", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setStatus("processing");
            const { jobId } = data;

            // Start pinging status
            const interval = setInterval(async () => {
                try {
                    const pRes = await fetch(`/api/chromakey?jobId=${jobId}`);
                    if (!pRes.ok) return; // Keep trying if network blips
                    const pData = await pRes.json();

                    if (pData.status === "processing") {
                        setProgress(pData.progress || 0);
                    } else if (pData.status === "done") {
                        clearInterval(interval);
                        setStatus("done");
                        setDownloadUrl(`/api/download?jobId=${jobId}`);
                    } else if (pData.status === "error") {
                        clearInterval(interval);
                        setStatus("error");
                        setErrorText(pData.error);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);

        } catch (err: unknown) {
            setStatus("error");
            setErrorText(err instanceof Error ? err.message : "Unknown error");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* HEADER */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-4xl font-black tracking-tight text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
                            ALPHA FORGE
                        </h1>
                        <Link href="/" className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-zinc-700">
                            BACK TO STUDIO
                        </Link>
                    </div>
                    <p className="text-zinc-400 font-mono text-sm max-w-xl">
                        Internal Pipeline Tool: Strip green screen from raw MP4s and export production-ready WebM files with native alpha channel. Powered by FFmpeg.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT PANEL: CONTROLS */}
                    <div className="lg:col-span-4 space-y-6 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl">

                        {/* 1. Upload */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase text-zinc-300">
                                <UploadCloud className="w-4 h-4 text-green-400" />
                                Input Media
                            </label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 hover:border-green-500 hover:bg-zinc-800/50 rounded-xl cursor-pointer transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p className="text-sm font-semibold text-zinc-300">Click to upload MP4</p>
                                    <p className="text-xs text-zinc-500 mt-1 max-w-[200px] text-center truncate">
                                        {file ? file.name : "Solid background color recommended"}
                                    </p>
                                </div>
                                <input type="file" accept="video/mp4, video/quicktime" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>

                        <div className={`space-y-6 pt-4 border-t border-zinc-800 transition-opacity duration-300 ${bypassChromakey ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase text-zinc-300">
                                <Settings2 className="w-4 h-4 text-green-400" />
                                Chromakey Engine Params
                            </h3>

                            <div className="space-y-3">
                                <label className="block text-xs font-mono text-zinc-400">Target Color (HEX)</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-lg border-2 border-zinc-700 overflow-hidden shrink-0 shadow-inner">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            className="absolute -inset-2 w-16 h-16 cursor-pointer opacity-0"
                                        />
                                        <div className="w-full h-full" style={{ backgroundColor: color }} />
                                    </div>
                                    <input
                                        type="text"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm focus:border-green-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="flex justify-between text-xs font-mono text-zinc-400">
                                    <span>Tolerance (Similarity)</span>
                                    <span className="text-green-400">{tolerance.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.01" max="0.5" step="0.01"
                                    value={tolerance}
                                    onChange={e => setTolerance(parseFloat(e.target.value))}
                                    className="w-full accent-green-500"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex justify-between text-xs font-mono text-zinc-400">
                                    <span>Spill Supression (Blend)</span>
                                    <span className="text-green-400">{spill.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.01" max="0.5" step="0.01"
                                    value={spill}
                                    onChange={e => setSpill(parseFloat(e.target.value))}
                                    className="w-full accent-green-500"
                                />
                            </div>
                        </div>

                        <hr className="border-zinc-800" />

                        <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl cursor-pointer border border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={bypassChromakey}
                                    onChange={e => setBypassChromakey(e.target.checked)}
                                    className="w-4 h-4 accent-green-500 rounded border-none bg-black cursor-pointer"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[12px] font-bold text-white uppercase tracking-wider text-blue-400">Direct Encode (Bypass Chromakey)</span>
                                    <span className="text-[10px] text-zinc-400 leading-tight">Skip green screen removal. Just convert file to transparent WebM.</span>
                                </div>
                            </label>
                        </div>

                        <div className={`transition-opacity duration-300 ${bypassChromakey ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-xl cursor-pointer border border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={pingPong}
                                        onChange={e => setPingPong(e.target.checked)}
                                        className="w-4 h-4 accent-green-500 rounded border-none bg-black cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-bold text-white uppercase tracking-wider">Ping-Pong Loop</span>
                                        <span className="text-[10px] text-zinc-400 leading-tight">Create a seamless forward + reverse loop (doubles render time)</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-6 border-t border-zinc-800">
                            <button
                                onClick={handleRender}
                                disabled={!file || status === 'uploading' || status === 'processing'}
                                className="w-full group relative flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-extrabold py-4 rounded-xl transition-all active:scale-95"
                            >
                                {status === 'idle' || status === 'error' ? (
                                    <>
                                        <PlayCircle className="w-5 h-5 text-black group-disabled:text-zinc-500" />
                                        RENDER VP9 (WEBM)
                                    </>
                                ) : status === 'done' ? (
                                    'RENDER AGAIN'
                                ) : (
                                    'QUEUED TO FFMPEG...'
                                )}
                            </button>

                            {/* Status Display */}
                            {status === "error" && (
                                <div className="bg-red-950/50 border border-red-900 text-red-400 text-xs p-3 rounded-lg mt-4 font-mono">
                                    ERROR: {errorText}
                                </div>
                            )}

                            {(status === "uploading" || status === "processing") && (
                                <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl mt-4">
                                    <div className="flex justify-between text-xs font-mono text-green-400 mb-2">
                                        <span>{status === 'uploading' ? 'UPLOADING...' : 'ENCODING VP9...'}</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="bg-green-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_#4ade80]"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {status === "done" && (
                                <a
                                    href={downloadUrl}
                                    download
                                    className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500 text-green-400 font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(74,222,128,0.1)]"
                                >
                                    <Download className="w-4 h-4" />
                                    DOWNLOAD FILE
                                </a>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: WEBBGL PREVIEW */}
                    <div className="lg:col-span-8 flex flex-col items-end">
                        <div className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden bg-black/50 border border-zinc-800 shadow-2xl relative flex items-center justify-center pb-2">
                            {videoUrl ? (
                                <FfmpegPreview
                                    file={file}
                                    videoSrc={videoUrl}
                                    color={color}
                                    tolerance={tolerance}
                                    spill={spill}
                                    bypassChromakey={bypassChromakey}
                                />
                            ) : (
                                <div className="text-zinc-600 font-mono text-sm flex flex-col items-center gap-3 w-full h-full justify-center">
                                    <PlayCircle className="w-12 h-12 opacity-50" />
                                    NO SIGNAL
                                </div>
                            )}
                        </div>
                        {videoUrl && (
                            <p className="text-[10px] font-mono text-zinc-500 mt-2 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Direct FFmpeg Render Pipeline (100% WYSIWYG)
                            </p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
