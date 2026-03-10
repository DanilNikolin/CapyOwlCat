"use client";

import React, { useEffect, useState } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getTransformMatrix } from '@/utils/math';
import { Cpu, Radio, Volume2, Waves } from 'lucide-react'; // Массивные иконки

const IDLE_MESSAGES = [
    "[ STATUS: LISTENING ]",
    "AWAITING RADIO LINK",
    "TRANSLATOR ONLINE",
    "NO INCOMING SIGNAL"
];

export default function VirtualMonitor() {
    const { monitorConfig, isThinking, currentState } = usePlayerStore();

    // We can add some internal rotating logic or states here if needed
    const [idleTextIndex, setIdleTextIndex] = useState(0);

    const [eqBars] = useState(() =>
        [...Array(8)].map(() => ({
            height: 30 + Math.random() * 70,
            duration: 0.3 + Math.random() * 0.4
        }))
    );

    useEffect(() => {
        if (currentState === 'idle' && !isThinking) {
            const interval = setInterval(() => {
                setIdleTextIndex((prev) => (prev + 1) % IDLE_MESSAGES.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [currentState, isThinking]);

    const { width, height, borderRadius = 12, tlX, tlY, trX, trY, brX, brY, blX, blY } = monitorConfig;

    const matrix = getTransformMatrix(
        width, height,
        tlX, tlY,
        trX, trY,
        brX, brY,
        blX, blY
    ).join(',');

    const isProcessing = isThinking || currentState === 'trans_in';

    return (
        <div
            className="absolute top-0 left-0 pointer-events-none z-[60] flex flex-col items-center justify-center overflow-hidden transform-gpu"
            style={{
                width: `${width}px`,
                height: `${height}px`,
                transform: `matrix3d(${matrix})`,
                transformOrigin: '0 0 0',
            }}
        >
            {/* INVISIBLE WRAPPER - CYBER BLUE / CYAN THEME */}
            <div
                className="relative w-full h-full bg-[#001122]/90 backdrop-blur-md border-[3px] border-[#00f0ff]/50 overflow-hidden font-mono flex flex-col p-4"
                style={{
                    borderRadius: `${borderRadius}px`,
                    boxShadow: '0 0 50px rgba(0, 240, 255, 0.2) inset, 0 0 20px rgba(0, 240, 255, 0.3)'
                }}
            >
                {/* Header terminal bar - STATIC */}
                <div className="text-[10px] md:text-xs text-[#00f0ff]/70 mb-2 border-b-2 border-dashed border-[#00f0ff]/30 pb-2 flex justify-between uppercase font-bold tracking-widest leading-none items-center">
                    <span>CAPY_LINK // DECODER</span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${currentState === 'talk' ? 'bg-[#ff0055] animate-pulse shadow-[0_0_8px_#ff0055]' : 'bg-[#00f0ff]/30'}`} />
                </div>

                {/* Main Content Area - BIG ICONS */}
                <div className="flex-1 flex flex-col items-center justify-center text-center">

                    {isProcessing ? (
                        /* STATE: GROK THINKING / TRANS_IN */
                        <div className="flex flex-col items-center gap-4 text-[#00f0ff]">
                            <div className="relative">
                                <Cpu className="w-16 h-16 md:w-20 md:h-20 text-[#00f0ff] animate-pulse drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]" strokeWidth={1} />
                                <div className="absolute inset-0 bg-[#00f0ff]/20 animate-ping rounded-full mix-blend-screen" />
                            </div>
                            <span className="font-bold tracking-widest uppercase text-sm md:text-base drop-shadow-[0_0_10px_rgba(0,240,255,1)]">
                                INCOMING DATA...
                            </span>
                        </div>
                    ) : currentState === 'talk' ? (
                        /* STATE: TALKING (AUDIO PLAYBACK) */
                        <div className="flex flex-col items-center gap-4 text-[#00ffaa]">
                            <Volume2 className="w-16 h-16 md:w-20 md:h-20 drop-shadow-[0_0_15px_rgba(0,255,170,0.8)] animate-pulse" strokeWidth={1.5} />

                            {/* Live Playback Tag */}
                            <span className="font-bold tracking-widest text-sm md:text-base drop-shadow-[0_0_10px_rgba(0,255,170,0.8)] bg-[#00ffaa]/10 border border-[#00ffaa]/50 px-3 py-1 uppercase">
                                LIVE STREAM
                            </span>

                            {/* Giant Cyan Equalizer */}
                            <div className="flex gap-1.5 md:gap-2 h-12 md:h-16 items-end mt-2 w-full justify-center">
                                {[...Array(8)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-3 md:w-4 bg-[#00ffaa] shadow-[0_0_10px_rgba(0,255,170,0.8)]"
                                        style={{
                                            borderTopLeftRadius: '4px',
                                            borderTopRightRadius: '4px',
                                            height: `${eqBars[i].height}%`,
                                            animationName: 'bounceEq',
                                            animationDuration: `${eqBars[i].duration}s`,
                                            animationIterationCount: 'infinite',
                                            animationDirection: 'alternate',
                                            animationDelay: `${i * 0.05}s`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* STATE: IDLE / TRANS_OUT */
                        <div className="flex flex-col items-center text-[#00aaff]/60 transition-all duration-700">
                            <Radio className="w-16 h-16 md:w-20 md:h-20 mb-4 opacity-70 animate-[pulse_4s_infinite]" strokeWidth={1} />
                            <span className="text-sm md:text-base font-bold tracking-widest uppercase">
                                {IDLE_MESSAGES[idleTextIndex]}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Deco - STATIC */}
                <div className="mt-auto border-t border-[#00f0ff]/20 pt-2 flex justify-between items-center text-[8px] md:text-[10px] text-[#00f0ff]/40 font-bold uppercase">
                    <div className="flex gap-2">
                        <span>SYS: OK</span>
                        <span>[T] 34°C</span>
                    </div>
                    <Waves className="w-4 h-4 animate-pulse opacity-50" />
                </div>

                {/* Heavy CRT Scanlines Effect Overlay (Blue Tint) */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,10,30,0.9) 2px, rgba(0,10,30,0.9) 4px)',
                        backgroundSize: '100% 4px'
                    }}
                />

                {/* Vignette Edge Darkening */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,5,15,0.95)] rounded-[inherit]" />

                {/* Custom keyframes injected scoped */}
                <style>{`
                    @keyframes bounceEq {
                        0% { height: 20%; opacity: 0.5; }
                        100% { height: 100%; opacity: 1; }
                    }
                `}</style>
            </div>
        </div>
    );
}
