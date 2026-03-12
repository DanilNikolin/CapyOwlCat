import { useRef, MutableRefObject } from 'react';
import { usePlayerStore, AnimationGroup, EmotionAnimation } from '@/store/usePlayerStore';
import { useShallow } from 'zustand/react/shallow';

interface PlaybackHandlersProps {
    videoRefs: {
        idle: MutableRefObject<HTMLVideoElement | null>;
        transIn: MutableRefObject<HTMLVideoElement | null>;
        talk: MutableRefObject<HTMLVideoElement | null>;
        transOut: MutableRefObject<HTMLVideoElement | null>;
    };
    audioRef: MutableRefObject<HTMLAudioElement | null>;
    setSafeTimeout: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
    uiActions: {
        setSubtitleText: (val: { text: string; id: number }) => void;
        setIsSubtitleVisible: (visible: boolean) => void;
        subtitleCounterRef: MutableRefObject<number>;
    };
    activeStates: {
        activeGroupRef: MutableRefObject<AnimationGroup | null>;
        setActiveGroup: (g: AnimationGroup | null) => void;
        activeEmotionAnimRef: MutableRefObject<EmotionAnimation | null>;
        setActiveEmotionAnim: (a: EmotionAnimation | null) => void;
    };
}

export function usePlayerPlaybackHandlers({
    videoRefs,
    audioRef,
    setSafeTimeout,
    uiActions,
    activeStates
}: PlaybackHandlersProps) {
    const { currentState, setState, currentEvent, clearEvent } = usePlayerStore(useShallow(state => ({
        currentState: state.currentState,
        setState: state.setState,
        currentEvent: state.currentEvent,
        clearEvent: state.clearEvent
    })));

    const isAudioFinishedRef = useRef(false);

    const handleTransInEnded = () => {
        console.log('[Player] transIn закончился, стартует talk + audio');
        setState('talk');
        isAudioFinishedRef.current = false;

        if (currentEvent?.text) {
            uiActions.setSubtitleText({ text: currentEvent.text, id: ++uiActions.subtitleCounterRef.current });
            uiActions.setIsSubtitleVisible(true);
        }

        if (videoRefs.talk.current) {
            videoRefs.talk.current.currentTime = 0;
            videoRefs.talk.current.play().catch(console.error);
        }

        if (audioRef.current && currentEvent?.audioUrl) {
            audioRef.current.src = currentEvent.audioUrl;
            audioRef.current.play().catch(console.error);
        } else {
            console.warn("Нет audioUrl, таймер 3 сек...");
            setSafeTimeout(() => {
                handleAudioEnded();
            }, 3000);
        }
    };

    const handleAudioEnded = () => {
        console.log('[Player] Audio закончилось. Ждем конца talk loop...');
        isAudioFinishedRef.current = true;

        setSafeTimeout(() => {
            uiActions.setIsSubtitleVisible(false);
            setSafeTimeout(() => uiActions.setSubtitleText({ text: '', id: ++uiActions.subtitleCounterRef.current }), 300);
        }, 4000);
    };

    const handleTalkLoopEnded = () => {
        if (isAudioFinishedRef.current && currentState === 'talk') {
            console.log('[Player] Цикл talk завершен. Транзишн Out');
            setState('trans_out');

            if (videoRefs.transOut.current) {
                videoRefs.transOut.current.currentTime = 0;
                videoRefs.transOut.current.play().catch(console.error);
            }
        } else if (videoRefs.talk.current) {
            videoRefs.talk.current.play().catch(console.error);
        }
    };

    const handleTransOutEnded = () => {
        const { activeGroupRef, setActiveGroup } = activeStates;
        const activeGroup = activeGroupRef.current;
        console.log('[Player] transOut закончен, возврат в Idle на отметку:', activeGroup?.triggerTime);
        setState('idle');

        if (currentEvent?.audioUrl) {
            URL.revokeObjectURL(currentEvent.audioUrl);
        }

        clearEvent();

        if (videoRefs.idle.current && activeGroup) {
            videoRefs.idle.current.currentTime = activeGroup.triggerTime;
            videoRefs.idle.current.play().catch(console.error);
        }
        setActiveGroup(null);
    };

    const handleEmotionEnded = () => {
        const { activeEmotionAnimRef, setActiveEmotionAnim } = activeStates;
        const activeEmotionAnim = activeEmotionAnimRef.current;
        console.log('[Player] Emotion AnimEnded');
        const triggerTime = activeEmotionAnim?.triggerTime || 0;
        setState('idle');
        setActiveEmotionAnim(null);
        if (currentEvent?.audioUrl) {
            URL.revokeObjectURL(currentEvent.audioUrl);
        }
        clearEvent();
        if (videoRefs.idle.current) {
            videoRefs.idle.current.currentTime = triggerTime;
            videoRefs.idle.current.play().catch(console.error);
        }
    };

    return {
        handleTransInEnded,
        handleAudioEnded,
        handleTalkLoopEnded,
        handleTransOutEnded,
        handleEmotionEnded
    };
}
