"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Monitor, X, Move, Lock, Unlock } from 'lucide-react';

interface MonitorTunerProps {
    onClose: () => void;
}

type Corner = 'tl' | 'tr' | 'br' | 'bl';

export default function MonitorTuner({ onClose }: MonitorTunerProps) {
    const { monitorConfig, updateMonitorConfig } = usePlayerStore();
    const [activeCorner, setActiveCorner] = useState<Corner | null>(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [isRatioLocked, setIsRatioLocked] = useState(true);

    // Auto-focus container to capture keyboard events immediately
    const containerRef = useRef<HTMLDivElement>(null);

    const handleChange = (field: keyof typeof monitorConfig, value: number) => {
        if (isNaN(value)) return;

        if (isRatioLocked && field === 'width') {
            const ratio = monitorConfig.height / monitorConfig.width;
            updateMonitorConfig({ width: value, height: Math.round(value * ratio) });
            return;
        }
        if (isRatioLocked && field === 'height') {
            const ratio = monitorConfig.width / monitorConfig.height;
            updateMonitorConfig({ height: value, width: Math.round(value * ratio) });
            return;
        }

        updateMonitorConfig({ [field]: value });
    };

    // Keyboard navigation for active corner
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeCorner) return;
            // Ignore if user is typing inside an input field
            if (document.activeElement?.tagName === 'INPUT') return;

            const step = e.shiftKey ? 10 : 1;
            const xField = `${activeCorner}X` as keyof typeof monitorConfig;
            const yField = `${activeCorner}Y` as keyof typeof monitorConfig;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateMonitorConfig({ [yField]: monitorConfig[yField] - step });
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateMonitorConfig({ [yField]: monitorConfig[yField] + step });
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                updateMonitorConfig({ [xField]: monitorConfig[xField] - step });
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                updateMonitorConfig({ [xField]: monitorConfig[xField] + step });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [monitorConfig, updateMonitorConfig, activeCorner]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setCursorPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    const renderField = (label: string, field: keyof typeof monitorConfig, min: number, max: number, step: number, colorLabel: string) => {
        return (
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-400">{label}</span>
                    <input
                        type="number"
                        value={monitorConfig[field]}
                        onChange={e => handleChange(field, parseFloat(e.target.value))}
                        className={`bg-black ${colorLabel} text-right w-16 px-1 rounded border border-zinc-700 outline-none`}
                    />
                </div>
            </div>
        );
    };

    const renderCornerSelector = (id: Corner, label: string) => {
        const isActive = activeCorner === id;
        return (
            <div
                onClick={() => setActiveCorner(isActive ? null : id)}
                className={`p-2 border rounded-lg cursor-pointer transition-all flex flex-col gap-2 ${isActive ? 'bg-green-500/20 border-green-500' : 'bg-black/40 border-zinc-800 hover:border-zinc-600'
                    }`}
            >
                <div className="text-[10px] font-bold uppercase text-center tracking-widest text-zinc-300">
                    {label}
                </div>
                {renderField('X', `${id}X` as keyof typeof monitorConfig, -2000, 3000, 1, 'text-green-400')}
                {renderField('Y', `${id}Y` as keyof typeof monitorConfig, -2000, 3000, 1, 'text-green-400')}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none">
            {/* Invis overlay for full screen crosshair when tunning */}
            <div className="absolute inset-0 cursor-crosshair pointer-events-auto" />

            <div className="absolute inset-y-0 right-0 p-8 flex flex-col justify-center pointer-events-none">
                <div
                    ref={containerRef}
                    tabIndex={0}
                    className="w-[360px] max-w-md bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto outline-none"
                >
                    {/* HEAD */}
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                        <h2 className="text-white font-bold flex items-center gap-2 uppercase tracking-wide text-sm">
                            <Monitor className="w-4 h-4 text-green-400" />
                            Virtual Monitor Tuning
                        </h2>
                        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 text-[10px] text-blue-300 font-mono flex items-center justify-between gap-2 shadow-[0_0_10px_rgba(59,130,246,0.1)_inset]">
                            <div className="flex items-center gap-2">
                                <Move className="w-4 h-4 flex-shrink-0" />
                                <span>Select a corner and use <b>Arrow Keys</b> to pin it. Hold <b>Shift</b> for 10x speed. P.S. Make sure you don&apos;t focus an input.</span>
                            </div>
                        </div>

                        {/* Cursor Tracker */}
                        <div className="flex justify-between items-center bg-black/40 border border-zinc-800 p-2 rounded-lg text-xs font-mono text-zinc-400">
                            <span>Cursor Position:</span>
                            <span className="text-white bg-zinc-800 px-2 py-1 rounded">X: {cursorPos.x} | Y: {cursorPos.y}</span>
                        </div>

                        {/* Basic Geometry */}
                        <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-zinc-800">
                            <div className="flex justify-between items-center mb-1">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resolution</h3>
                                <button
                                    onClick={() => setIsRatioLocked(!isRatioLocked)}
                                    className={`px-2 py-1 rounded flex items-center gap-1 text-[10px] uppercase font-bold transition-colors ${isRatioLocked ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                                >
                                    {isRatioLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                    {isRatioLocked ? 'Locked' : 'Unlocked'}
                                </button>
                            </div>

                            <div className="flex gap-2 mb-3">
                                <button onClick={() => updateMonitorConfig({ width: 200, height: 150 })} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] py-1 rounded text-zinc-300 transition-colors">200x150</button>
                                <button onClick={() => updateMonitorConfig({ width: 640, height: 480 })} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] py-1 rounded text-zinc-300 transition-colors">4:3 TV</button>
                                <button onClick={() => updateMonitorConfig({ width: 854, height: 480 })} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] py-1 rounded text-zinc-300 transition-colors">16:9</button>
                                <button onClick={() => updateMonitorConfig({ width: 500, height: 500 })} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] py-1 rounded text-zinc-300 transition-colors">1:1</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {renderField('WIDTH', 'width', 100, 3840, 1, 'text-blue-400')}
                                {renderField('HEIGHT', 'height', 100, 2160, 1, 'text-blue-400')}
                            </div>

                            <div className="pt-3 border-t border-zinc-800/50 mt-2">
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10px] font-mono">
                                        <span className="text-zinc-400">CORNER ROUNDING</span>
                                        <input
                                            type="number"
                                            value={monitorConfig.borderRadius ?? 0}
                                            onChange={e => handleChange('borderRadius', parseFloat(e.target.value))}
                                            className="bg-black text-blue-400 text-right w-16 px-1 rounded border border-zinc-700 outline-none"
                                        />
                                    </div>
                                    <input
                                        type="range" min={0} max={150} step={1}
                                        value={monitorConfig.borderRadius ?? 0}
                                        onChange={e => handleChange('borderRadius', parseFloat(e.target.value))}
                                        className="w-full h-1 mt-1 accent-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Corner Pins</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {renderCornerSelector('tl', 'Top Left')}
                                {renderCornerSelector('tr', 'Top Right')}
                                {renderCornerSelector('bl', 'Bottom Left')}
                                {renderCornerSelector('br', 'Bottom Right')}
                            </div>
                        </div>

                    </div>

                    {/* FOOTER */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
                        <p className="text-[10px] font-mono text-zinc-500 text-right">
                            Auto-saves to <span className="text-green-500">monitor.json</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
