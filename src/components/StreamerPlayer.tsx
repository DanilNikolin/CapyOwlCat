"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePlayerStore, AnimationGroup, IdleAnimation, GiftAnimation, EmotionAnimation } from '@/store/usePlayerStore';
import { useTypewriter } from '@/hooks/useTypewriter';
import { ChevronDown, ChevronUp } from 'lucide-react';
import VirtualMonitor from './VirtualMonitor';

interface StreamerPlayerProps {
    isEditorMode?: boolean;
}

export default function StreamerPlayer({ isEditorMode = false }: StreamerPlayerProps) {
    const {
        currentState, setState,
        isThinking, currentEvent, incomingMessage, clearEvent,
        layerColors, fetchLayerColors,
        idleAnimations,
        groups, fetchMonitorConfig,
        giftAnimations, giftQueue, consumeGiftQueueItem
    } = usePlayerStore();

    useEffect(() => {
        fetchLayerColors();
        fetchMonitorConfig();
    }, [fetchLayerColors, fetchMonitorConfig]);

    // Refs для всех видео слоев
    const idleRef = useRef<HTMLVideoElement>(null);
    const idleAnimRef = useRef<HTMLVideoElement>(null);
    const giftAnimRef = useRef<HTMLVideoElement>(null);
    const transInRef = useRef<HTMLVideoElement>(null);
    const talkRef = useRef<HTMLVideoElement>(null);
    const transOutRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [activeGroup, setActiveGroup] = useState<AnimationGroup | null>(null);
    const [activeIdleAnim, setActiveIdleAnim] = useState<IdleAnimation | null>(null);
    const [pendingIdleAnim, setPendingIdleAnim] = useState<IdleAnimation | null>(null);

    const [activeGiftAnim, setActiveGiftAnim] = useState<GiftAnimation | null>(null);
    const [activeEmotionAnim, setActiveEmotionAnim] = useState<EmotionAnimation | null>(null);
    const lastIdleTriggerTimeRef = useRef<number>(-1);
    const prevIdleTimeRef = useRef<number>(-1);

    // Для UI-тайпрайтера и длительности субтитров
    const [subtitleText, setSubtitleText] = useState('');
    const [isSubtitleVisible, setIsSubtitleVisible] = useState(false);
    const typedText = useTypewriter(subtitleText, 30);

    // Таймеры отладки (только для EditorMode)
    const [debugTime, setDebugTime] = useState({ vid: '0.00 / 0.00', aud: 'OFF' });
    const [isPipelineOpen, setIsPipelineOpen] = useState(true);

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

    // requestAnimationFrame цикл (слушаем нужную отсечку activeGroup)
    useEffect(() => {
        let animationFrameId: number;

        const checkTime = () => {
            const idleVideo = idleRef.current;
            const transInVideo = transInRef.current;

            if (idleVideo) {
                const now = idleVideo.currentTime;
                // Детект лупа: если время пошло назад (видео началось сначала) - сбрасываем триггеры
                if (now < prevIdleTimeRef.current) {
                    lastIdleTriggerTimeRef.current = -1;
                }
                prevIdleTimeRef.current = now;
            }

            // --- GIFTS LOGIC ---
            if (currentState === 'idle' && giftQueue.length > 0 && giftAnimations.length > 0 && idleVideo) {
                const now = idleVideo.currentTime;
                const targetGift = giftQueue[0];

                let bestAnim: GiftAnimation | null = null;
                const matches = giftAnimations.filter((a: GiftAnimation) =>
                    (a.targetTier === targetGift.tier || a.targetTier === 'universal') &&
                    a.minCombo <= targetGift.count
                );

                if (matches.length > 0) {
                    matches.sort((a: GiftAnimation, b: GiftAnimation) => {
                        if (b.minCombo !== a.minCombo) return b.minCombo - a.minCombo;
                        if (a.targetTier !== b.targetTier) return a.targetTier === targetGift.tier ? -1 : 1;
                        return 0;
                    });
                    bestAnim = matches[0];
                }

                if (bestAnim) {
                    // Если есть очередь на разговор (currentEvent), подарки ждут, КРОМЕ priority
                    if (!currentEvent || bestAnim.isPriority) {
                        if (bestAnim.isPriority) {
                            console.log(`[Player] Priority Gift Trigger! ${bestAnim.id}`);
                            idleVideo.pause();
                            setState('gift_anim');
                            setActiveGiftAnim(bestAnim);
                            consumeGiftQueueItem(targetGift.id, bestAnim.minCombo);

                            if (giftAnimRef.current) {
                                giftAnimRef.current.src = `/assets/${bestAnim.video}`;
                                giftAnimRef.current.currentTime = 0;
                                giftAnimRef.current.play().catch(console.error);
                            }
                            return;
                        } else {
                            if (giftAnimRef.current && giftAnimRef.current.src.indexOf(bestAnim.video) === -1) {
                                giftAnimRef.current.src = `/assets/${bestAnim.video}`;
                                giftAnimRef.current.load();
                            }

                            if (now >= bestAnim.triggerTime && now <= bestAnim.triggerTime + 0.15) {
                                console.log(`[Player] Normal Gift Trigger @${bestAnim.triggerTime}s! ${bestAnim.id}`);
                                idleVideo.pause();
                                setState('gift_anim');
                                setActiveGiftAnim(bestAnim);
                                consumeGiftQueueItem(targetGift.id, bestAnim.minCombo);

                                if (giftAnimRef.current) {
                                    giftAnimRef.current.currentTime = 0;
                                    giftAnimRef.current.play().catch(console.error);
                                }
                                return;
                            }
                        }
                    }
                } else {
                    console.warn(`[Player] No gift anim found for tier '${targetGift.tier}'. Discarding gift.`);
                    consumeGiftQueueItem(targetGift.id, targetGift.count);
                }
            }


            // Если мы в релаксе (idle), и пришел эвент!
            if (currentState === 'idle' && currentEvent && idleVideo && groups.length > 0) {
                const now = idleVideo.currentTime;

                // Если в ивенте есть emotionTarget!
                if (currentEvent.emotionTarget) {
                    const store = usePlayerStore.getState();
                    const targetGroup = store.emotionGroups.find(g => g.triggerName === currentEvent.emotionTarget);

                    if (targetGroup && targetGroup.animations.length > 0) {
                        // Find closest future animation
                        let closestAnim = targetGroup.animations[0];
                        let minDiff = Infinity;

                        for (const anim of targetGroup.animations) {
                            let diff = anim.triggerTime - now;
                            if (diff < 0) diff += idleVideo.duration; // wrap around loop

                            if (diff < minDiff) {
                                minDiff = diff;
                                closestAnim = anim;
                            }
                        }

                        // Preload
                        if (giftAnimRef.current && giftAnimRef.current.src.indexOf(closestAnim.video) === -1) {
                            giftAnimRef.current.src = `/assets/${closestAnim.video}`;
                            giftAnimRef.current.load();
                        }

                        // It's time to trigger!
                        if (now >= closestAnim.triggerTime && now <= closestAnim.triggerTime + 0.15) {
                            console.log(`[Player] Emotion Trigger @${closestAnim.triggerTime}s! ${closestAnim.id}`);
                            idleVideo.pause();
                            setState('emotion_anim');
                            setActiveEmotionAnim(closestAnim);

                            setSubtitleText(currentEvent.text);
                            setIsSubtitleVisible(true);

                            if (giftAnimRef.current) {
                                giftAnimRef.current.currentTime = 0;
                                giftAnimRef.current.play().catch(console.error);
                            }

                            // Play audio overlay
                            if (audioRef.current && currentEvent.audioUrl) {
                                audioRef.current.src = currentEvent.audioUrl;
                                audioRef.current.play().catch(console.error);
                            }
                            return;
                        }
                    } else {
                        // Эмоция найдена, но нет загруженных анимаций. Фолбек на обычный разговор!
                        console.warn(`[Player] Emotion group '${currentEvent.emotionTarget}' has no anims. Fallback to normal talk.`);
                        currentEvent.emotionTarget = undefined; // Удаляем таргет и пускаем по обычному флоу
                    }
                }

                // Обычный флоу (Без Эмоции)
                if (!currentEvent.emotionTarget) {
                    // Если мы еще не выбрали "цель", выбираем ближайшую!
                    if (!activeGroup) {
                        const now = idleVideo.currentTime;
                        const duration = idleVideo.duration || 10; // fallback

                        let bestGroup = groups[0];
                        let minWait = Infinity;

                        for (const g of groups) {
                            let waitTime = g.triggerTime - now;
                            // Если время уже прошло в этом цикле, придется ждать следующий луп
                            if (waitTime < 0) {
                                waitTime += duration;
                            }

                            if (waitTime < minWait) {
                                minWait = waitTime;
                                bestGroup = g;
                            }
                        }

                        console.log(`[Player] Выбрана группа ${bestGroup.id} (ждать ${minWait.toFixed(2)}s)`);
                        setActiveGroup(bestGroup);

                        // Предзагружаем все ассеты выбранной группы как можно раньше
                        if (transInVideo) {
                            transInVideo.src = `/assets/${bestGroup.transIn}`;
                            transInVideo.load();
                        }

                        if (talkRef.current) {
                            talkRef.current.src = `/assets/${bestGroup.talk}`;
                            talkRef.current.load();
                        }
                        if (transOutRef.current) {
                            transOutRef.current.src = `/assets/${bestGroup.transOut}`;
                            transOutRef.current.load();
                        }
                    }
                    // Если цель выбрана, ждем именно эту секунду!
                    else if (transInVideo) {
                        const target = activeGroup.triggerTime;

                        if (idleVideo.currentTime >= target && idleVideo.currentTime <= target + 0.15) {
                            console.log(`[Player] Точка ${target}s пробита! Стартуем группу ${activeGroup.id}`);

                            idleVideo.pause();
                            setState('trans_in');

                            // Запускаем предзагруженный заранее файл!
                            transInVideo.currentTime = 0;
                            transInVideo.play().catch(e => console.error("TransIn Play Error:", e));

                            return;
                        }
                    }
                }

                // Если мы в релаксе (idle), и НЕТ эвента, проверяем рандомные Idle Animations
                if (currentState === 'idle' && !currentEvent && !isThinking && idleVideo && idleAnimations.length > 0) {
                    const now = idleVideo.currentTime;

                    // 1. Пытаемся заранее выбрать (preload) анимацию, если её ещё нет на горизонте
                    if (!pendingIdleAnim) {
                        for (const anim of idleAnimations) {
                            // Окно для выбора (за пару секунд ДО самого триггера)
                            if (now < anim.triggerTime && anim.triggerTime - now < 3) {
                                if (Math.abs(lastIdleTriggerTimeRef.current - anim.triggerTime) > 1) {
                                    lastIdleTriggerTimeRef.current = anim.triggerTime;

                                    const roll = Math.random() * 100;
                                    if (roll <= anim.chance) {
                                        console.log(`[Player] Pre-rolled / Pending Idle Anim: ${anim.id}`);
                                        setPendingIdleAnim(anim);

                                        if (idleAnimRef.current) {
                                            idleAnimRef.current.src = `/assets/${anim.video}`;
                                            idleAnimRef.current.load();
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // 2. Если анимация была выбрана (preload), ждём её миллисекунду
                    if (pendingIdleAnim) {
                        if (now >= pendingIdleAnim.triggerTime && now <= pendingIdleAnim.triggerTime + 0.15) {
                            console.log(`[Player] Прокнул Idle Anim: ${pendingIdleAnim.id}`);
                            setActiveIdleAnim(pendingIdleAnim);
                            setPendingIdleAnim(null); // Очищаем ожидание

                            idleVideo.pause();
                            setState('idle_anim');

                            // Запускаем предзагруженную анимацию
                            if (idleAnimRef.current) {
                                idleAnimRef.current.currentTime = 0;
                                const playPromise = idleAnimRef.current.play();
                                if (playPromise !== undefined) {
                                    playPromise.catch(e => console.error("Idle Anim Play Error:", e));
                                }
                            }
                            return;
                        } else if (now > pendingIdleAnim.triggerTime + 0.3) {
                            // Срок годности ивента прошел (чтоб не залипало если промахнулись)
                            setPendingIdleAnim(null);
                        }
                    }
                }
            }
        }; // End of checkTime

        if (currentState === 'idle') {
            animationFrameId = requestAnimationFrame(checkTime);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [currentState, currentEvent, isThinking, groups, activeGroup, pendingIdleAnim, idleAnimations, giftAnimations, giftQueue, setState, consumeGiftQueueItem, activeEmotionAnim]);


    // Обработчики завершения видео/аудио
    const isAudioFinishedRef = useRef(false);

    const handleTransInEnded = () => {
        console.log('[Player] transIn закончился, стартует talk + audio');
        setState('talk');
        isAudioFinishedRef.current = false; // reset flag

        // Показываем субтитры ТОЛЬКО когда начинается речь
        if (currentEvent?.text) {
            setSubtitleText(currentEvent.text);
            setIsSubtitleVisible(true);
        }

        if (talkRef.current) {
            talkRef.current.currentTime = 0;
            talkRef.current.play().catch(console.error);
        }

        if (audioRef.current && currentEvent?.audioUrl) {
            audioRef.current.src = currentEvent.audioUrl;
            audioRef.current.play().catch(console.error);
        } else {
            console.warn("Нет audioUrl, таймер 3 сек...");
            setTimeout(() => {
                handleAudioEnded();
            }, 3000);
        }
    };

    const handleAudioEnded = () => {
        console.log('[Player] Audio закончилось. Ждем конца talk loop...');
        isAudioFinishedRef.current = true;

        // Даем зрителям дочитать текст (Оставляем на экране после финала речи)
        setTimeout(() => {
            setIsSubtitleVisible(false);
            // Даем время на плавный fade-out перед очисткой текста
            setTimeout(() => setSubtitleText(''), 300);
        }, 4000); // 4 секунды экстра-времени на чтение
    };

    const handleTalkLoopEnded = () => {
        if (isAudioFinishedRef.current && currentState === 'talk') {
            console.log('[Player] Цикл talk завершен. Транзишн Out');
            setState('trans_out');

            if (transOutRef.current) {
                transOutRef.current.currentTime = 0;
                transOutRef.current.play().catch(console.error);
            }
        } else if (talkRef.current) {
            talkRef.current.play().catch(console.error);
        }
    };

    const handleTransOutEnded = () => {
        console.log('[Player] transOut закончен, возврат в Idle на отметку:', activeGroup?.triggerTime);
        setState('idle');

        // Fix Memory Leak: Отзываем Blob URL после окончания проигрывания
        if (currentEvent?.audioUrl) {
            URL.revokeObjectURL(currentEvent.audioUrl);
        }

        clearEvent();

        if (idleRef.current && activeGroup) {
            idleRef.current.currentTime = activeGroup.triggerTime;
            idleRef.current.play().catch(console.error);
        }
        setActiveGroup(null); // Сбрасываем выбранную группу для след. раза
        // Fallback for TTS if emotion ends early but audio still playing - handled via CSS or we can do manual cleanup.
        // Actually if audio plays longer than emotion video, it will continue playing during `idle`. This is fine.
        // If audio finishes first, we wait for emotion video to finish. 
    };

    const handleEmotionEnded = () => {
        console.log('[Player] Emotion AnimEnded');
        setState('idle');
        setActiveEmotionAnim(null);
        clearEvent(); // Clear the event since we consumed it
        if (idleRef.current) {
            idleRef.current.currentTime = activeEmotionAnim?.triggerTime || 0;
            idleRef.current.play().catch(console.error);
        }
    };

    const getLayerStyle = (slotId: string) => {
        const defaultColors = { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
        const s = { ...defaultColors, ...(layerColors[slotId] || {}) };
        return {
            filter: `url(#temp-${slotId}) hue-rotate(${s.hue}deg) saturate(${s.saturate}) brightness(${s.brightness}) contrast(${s.contrast})`
        };
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">

            {/* SVG фильтры цвета */}
            <svg className="hidden">
                <defs>
                    {['transIn', 'talk', 'transOut', ...idleAnimations.map(a => a.id), ...giftAnimations.map(a => a.id)].map((slotId) => {
                        const defaultColors = { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
                        const s = { ...defaultColors, ...(layerColors[slotId] || {}) };
                        const v = s.temperature / 100;
                        const tintVal = s.tint / 100;
                        const rScale = 1 + (v * 0.3) - (tintVal * 0.15);
                        const gScale = 1 + (v * 0.1) + (tintVal * 0.3);
                        const bScale = 1 - (v * 0.3) - (tintVal * 0.15);
                        return (
                            <filter id={`temp-${slotId}`} key={slotId}>
                                <feColorMatrix
                                    type="matrix"
                                    values={`
                                        ${rScale} 0 0 0 0
                                        0 ${gScale} 0 0 0
                                        0 0 ${bScale} 0 0
                                        0 0 0 1 0
                                    `}
                                />
                            </filter>
                        );
                    })}
                </defs>
            </svg>

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

            {/* СЛОЙ 0: Контейнер Каписовокота */}
            <div className="absolute inset-0 w-full h-full z-10">

                {/* 1. IDLE (Единственный бесконечный) */}
                <video
                    ref={idleRef}
                    src="/assets/idle.webm"
                    loop autoPlay muted playsInline
                    className={`absolute inset-0 w-full h-full object-contain transition-none ${currentState === 'idle' ? 'z-20 opacity-100' : 'z-0 opacity-0'}`}
                />

                {/* 1.5 IDLE BREAKDOWN ANIMATION */}
                <video
                    ref={idleAnimRef}
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-contain transition-none ${currentState === 'idle_anim' ? 'z-25 opacity-100' : 'z-0 opacity-0'}`}
                    style={activeIdleAnim ? getLayerStyle(activeIdleAnim.id) : {}}
                    onEnded={() => {
                        console.log('[Player] Idle anim закончен, возврат в Idle');
                        setState('idle');
                        setActiveIdleAnim(null);
                        if (idleRef.current) {
                            idleRef.current.currentTime = activeIdleAnim?.triggerTime || 0;
                            idleRef.current.play().catch(console.error);
                        }
                    }}
                />

                {/* 1.75 GIFTS & EMOTION ANIMATION (Re-using this layer for emotions since they are mutually exclusive with gifts priority) */}
                <video
                    ref={giftAnimRef}
                    playsInline
                    muted={currentState === 'gift_anim'} // For emotions we play voice, video can remain muted if it has no audio. We overlay TTS manually.
                    className={`absolute inset-0 w-full h-full object-contain transition-none ${(currentState === 'gift_anim' || currentState === 'emotion_anim') ? 'z-26 opacity-100' : 'z-0 opacity-0'}`}
                    style={(activeGiftAnim || activeEmotionAnim) ? getLayerStyle((activeGiftAnim?.id || activeEmotionAnim?.id)!) : {}}
                    onEnded={() => {
                        if (currentState === 'emotion_anim') {
                            handleEmotionEnded();
                        } else {
                            console.log('[Player] Gift anim закончился, возврат в Idle');
                            setState('idle');
                            const isPriority = activeGiftAnim?.isPriority;
                            setActiveGiftAnim(null);
                            if (idleRef.current) {
                                if (!isPriority) {
                                    idleRef.current.currentTime = activeGiftAnim?.triggerTime || 0;
                                }
                                idleRef.current.play().catch(console.error);
                            }
                        }
                    }}
                />

                {/* 2. TRANSITION IN */}
                <video
                    ref={transInRef}
                    playsInline
                    style={getLayerStyle('transIn')}
                    onEnded={handleTransInEnded}
                    className={`absolute inset-0 w-full h-full object-contain ${currentState === 'trans_in' || currentState === 'talk' ? 'z-30 opacity-100' : 'z-0 opacity-0'}`}
                />

                {/* 3. TALKING LOOP */}
                <video
                    ref={talkRef}
                    playsInline
                    style={getLayerStyle('talk')}
                    onEnded={handleTalkLoopEnded}
                    className={`absolute inset-0 w-full h-full object-contain ${currentState === 'talk' || currentState === 'trans_out' ? 'z-40 opacity-100' : 'z-0 opacity-0'}`}
                />

                {/* 4. TRANSITION OUT */}
                <video
                    ref={transOutRef}
                    playsInline
                    style={getLayerStyle('transOut')}
                    onEnded={handleTransOutEnded}
                    className={`absolute inset-0 w-full h-full object-contain ${currentState === 'trans_out' ? 'z-50 opacity-100' : 'z-0 opacity-0'}`}
                />

                {/* 5. PANIC MODE LOOP (Top most layer over everything else except UI) */}
                <video
                    src="/assets/panic.webm"
                    loop autoPlay muted playsInline
                    style={getLayerStyle('idle')} // Re-use idle color grading or transIn if preferred
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${currentState === 'panic' ? 'z-60 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
                />

                {/* 5. VIRTUAL MONITOR LAYER */}
                <VirtualMonitor />
            </div>

            <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

            <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center w-full max-w-sm px-4 pointer-events-none transition-all duration-500 transform ${isSubtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {incomingMessage && (
                    <div className="bg-[#00ffcc] text-black font-bold text-xs uppercase px-3 py-1 rounded-t-lg shadow-lg self-start ml-2 mb-[-1px] z-30">
                        {incomingMessage.type === 'gift' ? '🎁 ' : '💬 '}{incomingMessage.username} {incomingMessage.type === 'gift' ? `sent ${incomingMessage.giftName}` : 'asks'}:
                    </div>
                )}

                {/* Экран субтитров */}
                <div className="w-full bg-black/80 backdrop-blur-md border border-zinc-800 rounded-xl p-4 text-left z-20 flex flex-col gap-2">
                    {incomingMessage && (
                        <p className="text-sm font-mono text-zinc-300 italic border-l-2 border-[#00ffcc] pl-3 py-1 bg-white/5 rounded-r w-fit max-w-[90%] self-start">
                            &quot;{incomingMessage.text}&quot;
                        </p>
                    )}
                    <p className="text-xl leading-relaxed text-center font-mono text-[#00ffaa] drop-shadow-[0_0_8px_rgba(0,255,170,0.5)] mt-1">
                        {typedText}
                        {isSubtitleVisible && currentState === 'talk' && <span className="animate-pulse inline-block w-2.5 h-5 bg-[#00ffaa] ml-1 translate-y-1" />}
                    </p>
                </div>
            </div>

            {/* Pipeline Monitor (только Режим Редактора) */}
            {isEditorMode && (
                <div className="absolute bottom-4 right-4 z-50 bg-black/70 text-white font-mono text-[10px] p-4 rounded-xl backdrop-blur-md border border-zinc-800 flex flex-col gap-2 shadow-2xl pointer-events-auto transition-all duration-300">
                    <div
                        className="text-green-500 font-bold border-zinc-700 tracking-widest uppercase flex items-center justify-between cursor-pointer group"
                        onClick={() => setIsPipelineOpen(!isPipelineOpen)}
                    >
                        <div className="flex items-center gap-2">
                            <span>Pipeline Monitor</span>
                            {isPipelineOpen && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        </div>
                        <button className="text-zinc-500 group-hover:text-white transition-colors p-1">
                            {isPipelineOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    </div>

                    {isPipelineOpen && (
                        <div className="flex flex-col gap-2 border-t border-zinc-700 pt-2 mt-1">
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">STATE LAYER:</span>
                                <span className="font-bold text-white uppercase">{currentState}</span>
                            </div>
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">ACTIVE GROUP:</span>
                                <span className={`font-bold ${activeGroup ? 'text-purple-400' : 'text-zinc-600'}`}>
                                    {activeGroup ? activeGroup.id : 'NONE'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">ACTIVE IDLE ANIM:</span>
                                <span className={`font-bold ${activeIdleAnim ? 'text-blue-400' : 'text-zinc-600'}`}>
                                    {activeIdleAnim ? activeIdleAnim.id : 'NONE'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">GIFT QUEUE:</span>
                                <span className={`font-bold ${giftQueue.length > 0 ? 'text-yellow-400' : 'text-zinc-600'}`}>
                                    {giftQueue.length > 0 ? `${giftQueue.length} groups (Head: x${giftQueue[0].count} ${giftQueue[0].tier})` : 'EMPTY'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">VIDEO TIME:</span>
                                <span className="font-bold text-yellow-400">{debugTime.vid}</span>
                            </div>
                            <div className="flex justify-between gap-6 pointer-events-none">
                                <span className="text-zinc-500">AUDIO TIME:</span>
                                <span className={`font-bold ${debugTime.aud === 'OFF' ? 'text-zinc-600' : 'text-blue-400'}`}>{debugTime.aud}</span>
                            </div>
                            {activeGroup && (
                                <div className="flex justify-between gap-6 border-t border-zinc-800 pt-2 mt-1 pointer-events-none">
                                    <span className="text-zinc-500">TARGET:</span>
                                    <span className="font-bold text-purple-400">{parseFloat(activeGroup.triggerTime.toString()).toFixed(1)}s (Grp: {groups.length})</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* DEBUG Инфо (Обычный режим, мелкое в углу) */}
            {!isEditorMode && (
                <div className="absolute top-4 right-4 z-50 bg-black/50 text-white font-mono text-[10px] p-2 rounded backdrop-blur border border-white/10 pointer-events-none text-right">
                    <div className="text-yellow-400">STATE: {currentState.toUpperCase()}</div>
                    {activeGroup && <div className="text-purple-400">WAITING TARGET: {parseFloat(activeGroup.triggerTime.toString()).toFixed(1)}s</div>}
                </div>
            )}

        </div>
    );
}
