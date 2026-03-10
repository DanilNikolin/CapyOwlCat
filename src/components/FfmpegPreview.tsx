"use client";
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Maximize } from 'lucide-react';

export default function FfmpegPreview({
    file,
    videoSrc,
    color,
    tolerance,
    spill,
    bypassChromakey,
}: {
    file: File | null;
    videoSrc: string;
    color: string;
    tolerance: number;
    spill: number;
    bypassChromakey: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Pan & Zoom State ---
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Keep latest params in ref for reliable debounced capturing without re-triggering effects
    const paramsRef = useRef({ color, tolerance, spill, bypassChromakey });
    useEffect(() => {
        paramsRef.current = { color, tolerance, spill, bypassChromakey };
    }, [color, tolerance, spill, bypassChromakey]);

    const generatePreview = React.useCallback(async () => {
        if (!file || !videoRef.current) return;

        // Safety check - don't render while the video is actively playing (save CPU)
        if (!videoRef.current.paused) return;

        setIsGenerating(true);

        try {
            const time = videoRef.current.currentTime;
            const formData = new FormData();
            formData.append("file", file);
            formData.append("color", paramsRef.current.color);
            formData.append("tolerance", paramsRef.current.tolerance.toString());
            formData.append("spill", paramsRef.current.spill.toString());
            formData.append("bypass", paramsRef.current.bypassChromakey.toString());
            formData.append("time", time.toString());

            const res = await fetch("/api/preview-frame", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to generate preview");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    }, [file]);

    // 1. Auto-render when sliders change (Debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            // Trigger update if we have a file loaded
            if (file) generatePreview();
        }, 400); // 400ms debounce
        return () => clearTimeout(timer);
    }, [color, tolerance, spill, bypassChromakey, file, generatePreview]);

    // 2. Auto-render when video timeline is seeked or paused
    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const handleSeekOrPause = () => {
            // slight delay to ensure visual DOM update happened
            setTimeout(generatePreview, 100);
        };

        vid.addEventListener('seeked', handleSeekOrPause);
        vid.addEventListener('pause', handleSeekOrPause);

        return () => {
            vid.removeEventListener('seeked', handleSeekOrPause);
            vid.removeEventListener('pause', handleSeekOrPause);
        };
    }, [file, generatePreview]);

    // --- Pan & Zoom Handlers ---
    const handleWheel = (e: React.WheelEvent) => {
        if (!previewUrl) return;
        // zoom factor
        const zoomFactor = 0.15;
        const newScale = e.deltaY < 0 ? scale * (1 + zoomFactor) : scale * (1 - zoomFactor);
        setScale(Math.max(0.2, Math.min(newScale, 10)));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!previewUrl) return;
        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !previewUrl) return;
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setPos({ x: pos.x + dx, y: pos.y + dy });
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const resetZoom = () => {
        setScale(1);
        setPos({ x: 0, y: 0 });
    };

    if (!file) {
        return (
            <div className="text-zinc-600 font-mono text-sm flex flex-col items-center gap-3 w-full h-full justify-center">
                <Camera className="w-12 h-12 opacity-50" />
                NO SIGNAL
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col pt-4 px-4 overflow-hidden gap-4">

            {/* TOOLBAR */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                <p className="text-xs font-mono text-zinc-400">
                    Source Time: <span className="font-bold text-white">{videoRef.current?.currentTime.toFixed(2) || '0.00'}s</span>
                </p>

                <div className="flex items-center gap-2">
                    {previewUrl && (
                        <button
                            onClick={resetZoom}
                            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-lg text-xs font-bold transition-colors active:scale-95"
                            title="Reset Zoom"
                        >
                            <Maximize className="w-4 h-4" />
                            <span>{Math.round(scale * 100)}%</span>
                        </button>
                    )}
                    <button
                        onClick={generatePreview}
                        disabled={isGenerating}
                        className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-lg text-xs font-black transition-all disabled:opacity-50 active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'RENDERING...' : 'FORCE REFRESH'}
                    </button>
                </div>
            </div>

            {/* VIEWS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 pb-4">

                {/* Source Video */}
                <div className="flex flex-col gap-2 rounded-xl overflow-hidden bg-black border border-zinc-800 relative">
                    <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur px-2 py-1 rounded border border-zinc-700 text-[10px] font-bold text-zinc-400 uppercase">
                        Raw Input (Seek Here)
                    </div>
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        controls
                        loop
                        muted
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* Rendered Preview with Pan/Zoom logic */}
                <div className="flex flex-col gap-2 rounded-xl border-2 border-green-500/20 overflow-hidden relative shadow-inner">
                    <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur px-2 py-1 rounded border border-green-500/50 text-[10px] font-bold text-green-400 uppercase flex items-center gap-2">
                        FFmpeg Exact Output
                        <span className="text-zinc-500 font-normal lowercase">(scroll to zoom, drag to pan)</span>
                    </div>

                    <div
                        className="w-full h-full flex flex-col items-center justify-center relative touch-none select-none"
                        style={{
                            backgroundImage: 'repeating-conic-gradient(#3f3f46 0% 25%, #18181b 0% 25% 50%)',
                            backgroundSize: '32px 32px'
                        }}
                        onWheel={handleWheel}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                    >
                        {previewUrl ? (
                            <div className="w-full h-full relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    className="max-w-none filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-transform duration-75 origin-center"
                                    style={{
                                        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                                        willChange: 'transform'
                                    }}
                                    alt="Preview Frame"
                                    draggable={false}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-zinc-500 font-mono text-xs text-center px-4">
                                <Camera className="w-8 h-8 opacity-20" />
                                Pause video & click <br /><span className="text-green-500/50 uppercase font-bold">Force Refresh</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
