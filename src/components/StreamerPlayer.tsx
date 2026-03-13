"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { usePlayerStore, AnimationGroup, IdleAnimation, GiftAnimation, EmotionAnimation } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import { useTypewriter } from '@/hooks/useTypewriter';
import { safePlay } from '@/utils/playerHelpers';
import VirtualMonitor from './VirtualMonitor';
import { usePlayerPlaybackHandlers } from '@/hooks/usePlayerPlaybackHandlers';
import { usePlayerTimelineEngine } from '@/hooks/usePlayerTimelineEngine';
import PlayerColorFilters from './player/PlayerColorFilters';
import PlayerSubtitleOverlay from './player/PlayerSubtitleOverlay';
import PlayerDebugPanel from './player/PlayerDebugPanel';
import PlayerVideoLayers from './player/PlayerVideoLayers';
import { usePlayerBgm } from '@/hooks/usePlayerBgm';

interface StreamerPlayerProps {
    isEditorMode?: boolean;
}

export default function StreamerPlayer({ isEditorMode = false }: StreamerPlayerProps) {
    const {
        currentState, setState, isPanicMode,
        incomingMessage,
        layerColors, fetchLayerColors,
        idleAnimations, fetchIdleAnimations,
        groups, fetchGroups,
        fetchMonitorConfig, 
        giftAnimations, fetchGiftAnimations,
        fetchEmotionGroups,
        giftQueue,
        setActiveGiftItem, bgmFile, bgmVolume, fetchBgmSettings
    } = usePlayerStore(useShallow(state => ({
        currentState: state.currentState,
        setState: state.setState,
        isPanicMode: state.isPanicMode,
        incomingMessage: state.incomingMessage,
        layerColors: state.layerColors,
        fetchLayerColors: state.fetchLayerColors,
        idleAnimations: state.idleAnimations,
        fetchIdleAnimations: state.fetchIdleAnimations,
        groups: state.groups,
        fetchGroups: state.fetchGroups,
        fetchMonitorConfig: state.fetchMonitorConfig,
        giftAnimations: state.giftAnimations,
        fetchGiftAnimations: state.fetchGiftAnimations,
        fetchEmotionGroups: state.fetchEmotionGroups,
        giftQueue: state.giftQueue,
        setActiveGiftItem: state.setActiveGiftItem,
        bgmFile: state.bgmFile,
        bgmVolume: state.bgmVolume,
        fetchBgmSettings: state.fetchBgmSettings
    })));

    useEffect(() => {
        fetchLayerColors();
        fetchMonitorConfig();
        fetchGroups();
        fetchIdleAnimations();
        fetchGiftAnimations();
        fetchEmotionGroups();
    }, [fetchLayerColors, fetchMonitorConfig, fetchGroups, fetchIdleAnimations, fetchGiftAnimations, fetchEmotionGroups]);

    // Refs для всех видео слоев
    const idleRef = useRef<HTMLVideoElement>(null);
    const idleAnimRef = useRef<HTMLVideoElement>(null);
    const giftAnimRef = useRef<HTMLVideoElement>(null);
    const transInRef = useRef<HTMLVideoElement>(null);
    const talkRef = useRef<HTMLVideoElement>(null);
    const transOutRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [activeGroup, _setActiveGroup] = useState<AnimationGroup | null>(null);
    const activeGroupRef = useRef<AnimationGroup | null>(null);
    const setActiveGroup = useCallback((g: AnimationGroup | null) => {
        _setActiveGroup(g);
        activeGroupRef.current = g;
    }, []);

    const [activeIdleAnim, setActiveIdleAnim] = useState<IdleAnimation | null>(null);
    const [pendingIdleAnim, _setPendingIdleAnim] = useState<IdleAnimation | null>(null);
    const pendingIdleAnimRef = useRef<IdleAnimation | null>(null);
    const setPendingIdleAnim = useCallback((a: IdleAnimation | null) => {
        _setPendingIdleAnim(a);
        pendingIdleAnimRef.current = a;
    }, []);

    const [activeGiftAnim, setActiveGiftAnim] = useState<GiftAnimation | null>(null);
    
    const [activeEmotionAnim, _setActiveEmotionAnim] = useState<EmotionAnimation | null>(null);
    const activeEmotionAnimRef = useRef<EmotionAnimation | null>(null);
    const setActiveEmotionAnim = useCallback((a: EmotionAnimation | null) => {
        _setActiveEmotionAnim(a);
        activeEmotionAnimRef.current = a;
    }, []);

    const lastIdleTriggerTimeRef = useRef<number>(-1);
    const prevIdleTimeRef = useRef<number>(-1);

    // Для UI-тайпрайтера и длительности субтитров
    const [subtitleText, setSubtitleText] = useState({ text: '', id: 0 });
    const subtitleCounterRef = useRef(0);
    const [isSubtitleVisible, setIsSubtitleVisible] = useState(false);
    const typedText = useTypewriter(subtitleText.text, 30, subtitleText.id);

    // Таймеры отладки (только для EditorMode)
    const [debugTime, setDebugTime] = useState({ vid: '0.00 / 0.00', aud: 'OFF' });
    const [isPipelineOpen, setIsPipelineOpen] = useState(true);

    const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
    const setSafeTimeout = useCallback((callback: () => void, ms: number) => {
        const id = setTimeout(() => {
            timeoutRefs.current.delete(id);
            callback();
        }, ms);
        timeoutRefs.current.add(id);
        return id;
    }, []);

    // Panic Mode Cleanup
    useEffect(() => {
        if (isPanicMode || currentState === 'panic') {
            console.log('[Player] PANIC MODE: Aborting all active playbacks and resetting states.');
            [idleRef, idleAnimRef, giftAnimRef, transInRef, talkRef, transOutRef].forEach(ref => {
                if (ref.current) {
                    ref.current.pause();
                    ref.current.currentTime = 0;
                }
            });
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            timeoutRefs.current.forEach(clearTimeout);
            timeoutRefs.current.clear();

            queueMicrotask(() => {
                setActiveGroup(null);
                setActiveIdleAnim(null);
                setPendingIdleAnim(null);
                setActiveGiftAnim(null);
                setActiveEmotionAnim(null);
                setIsSubtitleVisible(false);
                setSubtitleText({ text: '', id: 0 });
            });
        }
    }, [isPanicMode, currentState]);

    useEffect(() => {
        if (!isEditorMode) return;

        let frameId: number;

        const updateTimer = () => {
            let activeVideo: HTMLVideoElement | null = null;
            if (currentState === 'idle') activeVideo = idleRef.current;
            else if (currentState === 'idle_anim') activeVideo = idleAnimRef.current;
            else if (currentState === 'gift_anim') activeVideo = giftAnimRef.current;
            else if (currentState === 'emotion_anim') activeVideo = giftAnimRef.current; // Re-use giftAnimRef or create new? Let's re-use.
            else if (currentState === 'trans_in') activeVideo = transInRef.current;
            else if (currentState === 'talk') activeVideo = talkRef.current;
            else if (currentState === 'trans_out') activeVideo = transOutRef.current;
            else if (currentState === 'panic') activeVideo = null; // Maybe add ref later if we need time tracking

            const aud = audioRef.current;

            setDebugTime({
                vid: activeVideo ? `${activeVideo.currentTime.toFixed(2)}s / ${(activeVideo.duration || 0).toFixed(2)}s` : '0.00 / 0.00',
                aud: aud && currentState === 'talk' ? `${aud.currentTime.toFixed(2)}s / ${(aud.duration || 0).toFixed(2)}s` : 'OFF'
            });

            frameId = requestAnimationFrame(updateTimer);
        };

        frameId = requestAnimationFrame(updateTimer);
        return () => cancelAnimationFrame(frameId);
    }, [isEditorMode, currentState]);

    const timelineVideoRefs = useMemo(() => ({
        idle: idleRef,
        idleAnim: idleAnimRef,
        giftAnim: giftAnimRef,
        transIn: transInRef,
        talk: talkRef,
        transOut: transOutRef
    }), []);

    const timelineTimeRefs = useMemo(() => ({
        lastIdleTriggerTimeRef,
        prevIdleTimeRef
    }), []);

    const timelineActiveStates = useMemo(() => ({
        activeGroupRef,
        setActiveGroup,
        pendingIdleAnimRef,
        setPendingIdleAnim,
        setActiveIdleAnim,
        setActiveGiftAnim,
        setActiveGiftItem,
        setActiveEmotionAnim
    }), [setActiveGroup, setPendingIdleAnim, setActiveEmotionAnim, setActiveIdleAnim, setActiveGiftAnim, setActiveGiftItem]);

    const handleIdleAnimEnded = () => {
        console.log('[Player] Idle anim закончен, возврат в Idle');
        setState('idle');
        const triggerTime = activeIdleAnim?.triggerTime || 0;
        setActiveIdleAnim(null);
        if (idleRef.current) {
            idleRef.current.currentTime = triggerTime;
            safePlay(idleRef.current);
        }
    };

    const handleGiftAnimEnded = () => {
        console.log('[Player] Gift anim закончился, возврат в Idle');
        setState('idle');
        const isPriority = activeGiftAnim?.isPriority;
        const triggerTime = activeGiftAnim?.triggerTime || 0;
        setActiveGiftAnim(null);
        setActiveGiftItem(null);
        if (idleRef.current) {
            if (!isPriority) {
                idleRef.current.currentTime = triggerTime;
            }
            safePlay(idleRef.current);
        }
    };

    const handleGiftOrEmotionEnded = () => {
        if (currentState === 'emotion_anim') {
            handleEmotionEnded();
        } else {
            handleGiftAnimEnded();
        }
    };

    const timelineUiActions = useMemo(() => ({
        setSubtitleText,
        setIsSubtitleVisible,
        subtitleCounterRef
    }), []);

    // Инициализация движка таймлайна (requestAnimationFrame цикл)
    usePlayerTimelineEngine({
        videoRefs: timelineVideoRefs,
        audioRef,
        setSafeTimeout,
        timeRefs: timelineTimeRefs,
        activeStates: timelineActiveStates,
        uiActions: timelineUiActions
    });

    // Инициализация хендлеров воспроизведения
    const {
        handleTransInEnded,
        handleAudioEnded,
        handleTalkLoopEnded,
        handleTransOutEnded,
        handleEmotionEnded
    } = usePlayerPlaybackHandlers({
        videoRefs: {
            idle: idleRef,
            transIn: transInRef,
            talk: talkRef,
            transOut: transOutRef
        },
        audioRef,
        setSafeTimeout,
        uiActions: {
            setSubtitleText,
            setIsSubtitleVisible,
            subtitleCounterRef
        },
        activeStates: {
            activeGroupRef,
            setActiveGroup,
            activeEmotionAnimRef,
            setActiveEmotionAnim
        }
    });

    const getLayerColorFilter = (colors: { temperature?: number, tint?: number, hue?: number, saturate?: number, brightness?: number, contrast?: number } | undefined, slotId: string) => {
        const defaultColors = { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
        const s = { ...defaultColors, ...(colors || {}) };
        return {
            filter: `url(#temp-${slotId}) hue-rotate(${s.hue}deg) saturate(${s.saturate}) brightness(${s.brightness}) contrast(${s.contrast})`
        };
    };

    const getLayerStyle = (layerId: string) => {
        if (layerId === 'transIn' || layerId === 'talk' || layerId === 'transOut') {
            const dynamicId = `${activeGroup?.id}_${layerId}`;
            return getLayerColorFilter(layerColors[dynamicId], layerId);
        }
        return getLayerColorFilter(layerColors[layerId], layerId);
    };

    const bgmRef = usePlayerBgm({ bgmFile, bgmVolume, fetchBgmSettings });

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">

            {bgmFile && (
                <audio
                    ref={bgmRef}
                    src={`/assets/${bgmFile}`}
                    loop
                    autoPlay
                    className="hidden"
                />
            )}

            {/* SVG фильтры цвета */}
            <PlayerColorFilters 
                layerColors={layerColors}
                idleAnimations={idleAnimations}
                giftAnimations={giftAnimations}
            />

            {/* TIKTOK 9:16 SAFE ZONE OVERLAY (Режим Редактора) */}
            {isEditorMode && (
                <div className="absolute top-0 bottom-0 z-40 pointer-events-none flex items-center justify-center"
                    style={{ aspectRatio: '9/16', border: '2px dashed rgba(255, 0, 255, 0.5)', boxShadow: '0 0 50px rgba(0,0,0,0.8) inset' }}>
                    <div className="absolute top-4 bg-fuchsia-500/20 text-fuchsia-300 font-mono text-[10px] uppercase font-bold px-2 py-0.5 border border-fuchsia-500/50 rounded backdrop-blur whitespace-nowrap">
                        Mobile 9:16 Safe Zone
                    </div>
                </div>
            )}

            {/* СЛОЙ -1: Фон за окном (Loop Addon) */}
            <video
                src="/assets/loop_addon.mp4"
                loop autoPlay muted playsInline
                className="absolute inset-0 w-full h-full object-contain z-0"
            />

            {/* СЛОЙ 0: Контейнер Каписовокота (Video Layers) */}
            <PlayerVideoLayers 
                currentState={currentState}
                videoRefs={{
                    idle: idleRef,
                    idleAnim: idleAnimRef,
                    giftAnim: giftAnimRef,
                    transIn: transInRef,
                    talk: talkRef,
                    transOut: transOutRef
                }}
                activeStates={{
                    activeGroup,
                    activeIdleAnim,
                    activeGiftAnim,
                    activeEmotionAnim
                }}
                handlers={{
                    handleTransInEnded,
                    handleTalkLoopEnded,
                    handleTransOutEnded,
                    handleIdleAnimEnded,
                    handleGiftOrEmotionEnded
                }}
                getLayerStyle={getLayerStyle}
            />

            {/* 6. VIRTUAL MONITOR LAYER */}
            <VirtualMonitor />

            <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

            {/* UI LAYER: Subtitles & Messages */}
            <PlayerSubtitleOverlay 
                isSubtitleVisible={isSubtitleVisible}
                currentState={currentState}
                incomingMessage={incomingMessage}
                typedText={typedText}
            />

            {/* Pipeline Monitor & Debug Info */}
            <PlayerDebugPanel 
                isEditorMode={!!isEditorMode}
                isPipelineOpen={isPipelineOpen}
                setIsPipelineOpen={setIsPipelineOpen}
                currentState={currentState}
                debugTime={debugTime}
                activeStates={{ activeGroup, activeIdleAnim }}
                giftQueue={giftQueue}
                groupsCount={groups.length}
            />

        </div>
    );
}
