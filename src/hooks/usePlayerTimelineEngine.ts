import { useEffect, MutableRefObject } from 'react';
import {
    usePlayerStore,
    AnimationGroup,
    IdleAnimation,
    GiftAnimation,
    EmotionAnimation,
    QueuedGift
} from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';
import {
    checkTimelineCrossed,
    findBestGiftAnimation,
    findClosestEmotionAnimation,
    findClosestConversationGroup,
    selectIdleBreakdown,
    safePlay
} from '@/utils/playerHelpers';
import { useRef } from 'react';

interface TimelineEngineProps {
    videoRefs: {
        idle: MutableRefObject<HTMLVideoElement | null>;
        idleAnim: MutableRefObject<HTMLVideoElement | null>;
        giftAnim: MutableRefObject<HTMLVideoElement | null>;
        transIn: MutableRefObject<HTMLVideoElement | null>;
        talk: MutableRefObject<HTMLVideoElement | null>;
        transOut: MutableRefObject<HTMLVideoElement | null>;
    };
    audioRef: MutableRefObject<HTMLAudioElement | null>;
    setSafeTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;

    timeRefs: {
        lastIdleTriggerTimeRef: MutableRefObject<number>;
        prevIdleTimeRef: MutableRefObject<number>;
    };

    activeStates: {
        activeGroupRef: MutableRefObject<AnimationGroup | null>;
        setActiveGroup: (g: AnimationGroup | null) => void;
        pendingIdleAnimRef: MutableRefObject<IdleAnimation | null>;
        setPendingIdleAnim: (a: IdleAnimation | null) => void;

        setActiveIdleAnim: (a: IdleAnimation | null) => void;
        setActiveGiftAnim: (a: GiftAnimation | null) => void;
        setActiveGiftItem: (item: QueuedGift | null) => void;
        setActiveEmotionAnim: (a: EmotionAnimation | null) => void;
    };

    uiActions: {
        setSubtitleText: (val: { text: string; id: number }) => void;
        setIsSubtitleVisible: (visible: boolean) => void;
        subtitleCounterRef: MutableRefObject<number>;
    };
}

export function usePlayerTimelineEngine({
    videoRefs,
    audioRef,
    setSafeTimeout,
    timeRefs,
    activeStates,
    uiActions
}: TimelineEngineProps) {
    const {
        currentState, setState, isThinking, currentEvent,
        groups, idleAnimations, giftAnimations, emotionGroups,
        giftQueue, consumeGiftQueueItem, clearEmotionTarget
    } = usePlayerStore(useShallow(state => ({
        currentState: state.currentState,
        setState: state.setState,
        isThinking: state.isThinking,
        currentEvent: state.currentEvent,
        groups: state.groups,
        idleAnimations: state.idleAnimations,
        giftAnimations: state.giftAnimations,
        emotionGroups: state.emotionGroups,
        giftQueue: state.giftQueue,
        consumeGiftQueueItem: state.consumeGiftQueueItem,
        clearEmotionTarget: state.clearEmotionTarget
    })));

    const transitionLockRef = useRef(false);

    useEffect(() => {
        // Reset lock when state is not idle
        if (currentState !== 'idle') {
            transitionLockRef.current = false;
        }

        let animationFrameId: number;

        const checkTime = () => {
            const idleVideo = videoRefs.idle.current;
            const transInVideo = videoRefs.transIn.current;
            const idleAnimVideo = videoRefs.idleAnim.current;
            const giftAnimVideo = videoRefs.giftAnim.current;
            const talkVideo = videoRefs.talk.current;

            let prevTime = timeRefs.prevIdleTimeRef.current;
            let currentVidTime = 0;
            let isLooped = false;

            if (idleVideo) {
                currentVidTime = idleVideo.currentTime;
                if (currentVidTime < prevTime) {
                    timeRefs.lastIdleTriggerTimeRef.current = -1;
                    isLooped = true;
                }
                timeRefs.prevIdleTimeRef.current = currentVidTime;
            }

            const hasCrossed = (target: number) => checkTimelineCrossed(prevTime, currentVidTime, target, isLooped);
            const now = currentVidTime;

            // --- PRIORITY 1: GIFTS ---
            if (currentState === 'idle' && giftQueue.length > 0 && idleVideo) {
                if (activeStates.pendingIdleAnimRef.current) activeStates.setPendingIdleAnim(null);
                if (activeStates.activeGroupRef.current) activeStates.setActiveGroup(null);


                const targetGift = giftQueue[0];
                let bestAnim: GiftAnimation | null = null;

                if (giftAnimations.length > 0) {
                    bestAnim = findBestGiftAnimation(targetGift, giftAnimations, now, idleVideo.duration || 10);
                }

                if (bestAnim) {
                    if (bestAnim.isPriority) {
                        if (transitionLockRef.current) return;
                        console.log(`[Player] Priority Gift Trigger! ${bestAnim.id}`);
                        idleVideo.pause();
                        setState('gift_anim');
                        activeStates.setActiveGiftAnim(bestAnim);
                        activeStates.setActiveGiftItem(targetGift);
                        consumeGiftQueueItem(targetGift.id, bestAnim.minCombo);

                        if (giftAnimVideo) {
                            giftAnimVideo.src = `/assets/${bestAnim.video}`;
                            giftAnimVideo.currentTime = 0;
                            safePlay(giftAnimVideo);
                        }
                        transitionLockRef.current = true;
                        return;
                    } else {
                        if (giftAnimVideo && !giftAnimVideo.src.endsWith(bestAnim.video)) {
                            console.log(`[Player] Preloading gift video: ${bestAnim.video}`);
                            giftAnimVideo.src = `/assets/${bestAnim.video}`;
                            giftAnimVideo.load();
                        }

                        if (hasCrossed(bestAnim.triggerTime)) {
                            if (transitionLockRef.current) return;
                            console.log(`[Player] Normal Gift Trigger @${bestAnim.triggerTime}s! ${bestAnim.id}`);
                            idleVideo.pause();
                            setState('gift_anim');
                            activeStates.setActiveGiftAnim(bestAnim);
                            activeStates.setActiveGiftItem(targetGift);
                            consumeGiftQueueItem(targetGift.id, bestAnim.minCombo);

                            if (giftAnimVideo) {
                                giftAnimVideo.currentTime = 0;
                                safePlay(giftAnimVideo);
                            }
                            transitionLockRef.current = true;
                            return;
                        }
                    }
                } else {
                    if (transitionLockRef.current) return;
                    console.log(`[Player] No exact video found for tier '${targetGift.tier}'. Fallback monitor.`);
                    idleVideo.pause();
                    setState('gift_anim');
                    activeStates.setActiveGiftAnim(null);
                    activeStates.setActiveGiftItem(targetGift);
                    consumeGiftQueueItem(targetGift.id, targetGift.count);

                    setSafeTimeout(() => {
                        const state = usePlayerStore.getState();
                        if (state.currentState === 'gift_anim') {
                            state.setState('idle');
                            activeStates.setActiveGiftItem(null);
                            activeStates.setActiveGiftAnim(null);
                            if (videoRefs.idle.current) safePlay(videoRefs.idle.current);
                        }
                    }, 4000);
                    transitionLockRef.current = true;
                    return;
                }

                animationFrameId = requestAnimationFrame(checkTime);
                return;
            }

            // --- PRIORITY 2: CONVERSATION / EMOTION ---
            if (currentState === 'idle' && giftQueue.length === 0 && currentEvent && idleVideo && groups.length > 0) {
                if (activeStates.pendingIdleAnimRef.current) activeStates.setPendingIdleAnim(null);

                if (currentEvent.emotionTarget) {
                    const targetGroup = emotionGroups.find(g => g.triggerName === currentEvent.emotionTarget);
                    if (targetGroup && targetGroup.animations.length > 0) {
                        const closestAnim = findClosestEmotionAnimation(targetGroup.animations, now, idleVideo.duration || 10);
                        if (!closestAnim) {
                            clearEmotionTarget();
                            return;
                        }

                        if (giftAnimVideo && giftAnimVideo.src.indexOf(closestAnim.video) === -1) {
                            giftAnimVideo.src = `/assets/${closestAnim.video}`;
                            giftAnimVideo.load();
                        }

                        if (hasCrossed(closestAnim.triggerTime)) {
                            if (transitionLockRef.current) return;
                            idleVideo.pause();
                            setState('emotion_anim');
                            activeStates.setActiveEmotionAnim(closestAnim);
                            uiActions.setSubtitleText({ text: currentEvent.text, id: ++uiActions.subtitleCounterRef.current });
                            uiActions.setIsSubtitleVisible(true);
                            if (giftAnimVideo) {
                                giftAnimVideo.currentTime = 0;
                                safePlay(giftAnimVideo);
                            }
                            if (audioRef.current && currentEvent.audioUrl) {
                                audioRef.current.src = currentEvent.audioUrl;
                                safePlay(audioRef.current);
                            }
                            transitionLockRef.current = true;
                            return;
                        }
                    } else {
                        clearEmotionTarget();
                    }
                }

                if (!currentEvent.emotionTarget) {
                    if (!activeStates.activeGroupRef.current) {
                        const bestGroup = findClosestConversationGroup(groups, now, idleVideo.duration || 10);
                        if (bestGroup) {
                            activeStates.setActiveGroup(bestGroup);
                            if (transInVideo) { transInVideo.src = `/assets/${bestGroup.transIn}`; transInVideo.load(); }
                            if (talkVideo) { talkVideo.src = `/assets/${bestGroup.talk}`; talkVideo.load(); }
                            if (videoRefs.transOut.current) {
                                videoRefs.transOut.current.src = `/assets/${bestGroup.transOut}`;
                                videoRefs.transOut.current.load();
                            }
                        }
                    } else {
                        if (hasCrossed(activeStates.activeGroupRef.current.triggerTime)) {
                            if (transitionLockRef.current) return;
                            idleVideo.pause();
                            setState('trans_in');
                            if (transInVideo) {
                                transInVideo.currentTime = 0;
                                safePlay(transInVideo);
                            }
                            transitionLockRef.current = true;
                            return;
                        }
                    }
                }

                animationFrameId = requestAnimationFrame(checkTime);
                return;
            }

            // --- PRIORITY 3: IDLE BREAKDOWNS ---
            if (currentState === 'idle' && giftQueue.length === 0 && !currentEvent && !isThinking && idleVideo && idleAnimations.length > 0) {
                if (!activeStates.pendingIdleAnimRef.current) {
                    const { animation, attemptedTriggerTime } = selectIdleBreakdown(idleAnimations, now, timeRefs.lastIdleTriggerTimeRef.current);

                    if (attemptedTriggerTime !== null) {
                        timeRefs.lastIdleTriggerTimeRef.current = attemptedTriggerTime;
                    }

                    if (animation) {
                        activeStates.setPendingIdleAnim(animation);
                        if (idleAnimVideo) {
                            idleAnimVideo.src = `/assets/${animation.video}`;
                            idleAnimVideo.load();
                        }
                    }
                }

                if (activeStates.pendingIdleAnimRef.current) {
                    const pending = activeStates.pendingIdleAnimRef.current;
                    if (hasCrossed(pending.triggerTime)) {
                        if (transitionLockRef.current) return;
                        activeStates.setActiveIdleAnim(pending);
                        activeStates.setPendingIdleAnim(null);
                        idleVideo.pause();
                        setState('idle_anim');
                        if (idleAnimVideo) {
                            idleAnimVideo.currentTime = 0;
                            safePlay(idleAnimVideo);
                        }
                        transitionLockRef.current = true;
                        return;
                    } else if (now > pending.triggerTime + 0.3) {
                        activeStates.setPendingIdleAnim(null);
                    }
                }
            }

            animationFrameId = requestAnimationFrame(checkTime);
        };

        if (currentState === 'idle') {
            animationFrameId = requestAnimationFrame(checkTime);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [currentState, currentEvent, isThinking, groups, idleAnimations, giftAnimations, emotionGroups, giftQueue, setState, consumeGiftQueueItem, clearEmotionTarget, activeStates, timeRefs, uiActions, videoRefs, audioRef, setSafeTimeout]);
}
