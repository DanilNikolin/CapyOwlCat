import React, { RefObject } from 'react';
import { PlayerState, AnimationGroup, IdleAnimation, GiftAnimation, EmotionAnimation } from '@/store/usePlayerStore';

interface PlayerVideoLayersProps {
    currentState: PlayerState;
    videoRefs: {
        idle: RefObject<HTMLVideoElement | null>;
        idleAnim: RefObject<HTMLVideoElement | null>;
        giftAnim: RefObject<HTMLVideoElement | null>;
        transIn: RefObject<HTMLVideoElement | null>;
        talk: RefObject<HTMLVideoElement | null>;
        transOut: RefObject<HTMLVideoElement | null>;
    };
    activeStates: {
        activeGroup: AnimationGroup | null;
        activeIdleAnim: IdleAnimation | null;
        activeGiftAnim: GiftAnimation | null;
        activeEmotionAnim: EmotionAnimation | null;
    };
    handlers: {
        handleTransInEnded: () => void;
        handleTalkLoopEnded: () => void;
        handleTransOutEnded: () => void;
        handleIdleAnimEnded: () => void;
        handleGiftOrEmotionEnded: () => void;
    };
    getLayerStyle: (layerId: string) => React.CSSProperties;
}

const PlayerVideoLayers: React.FC<PlayerVideoLayersProps> = ({
    currentState,
    videoRefs,
    activeStates,
    handlers,
    getLayerStyle
}) => {
    const { activeGroup, activeIdleAnim, activeGiftAnim, activeEmotionAnim } = activeStates;

    return (
        <div className="absolute inset-0 w-full h-full z-10">
            {/* 1. IDLE (Единственный бесконечный) */}
            <video
                ref={videoRefs.idle}
                src="/assets/idle.webm"
                loop autoPlay muted playsInline
                className={`absolute inset-0 w-full h-full object-contain transition-none ${currentState === 'idle' ? 'z-20 opacity-100' : 'z-0 opacity-0'}`}
            />

            {/* 1.5 IDLE BREAKDOWN ANIMATION */}
            <video
                ref={videoRefs.idleAnim}
                playsInline
                muted={activeIdleAnim?.isMuted !== false}
                className={`absolute inset-0 w-full h-full object-contain transition-none ${currentState === 'idle_anim' ? 'z-[25] opacity-100' : 'z-0 opacity-0'}`}
                style={activeIdleAnim ? getLayerStyle(activeIdleAnim.id) : {}}
                onEnded={handlers.handleIdleAnimEnded}
            />

            {/* 1.75 GIFTS & EMOTION ANIMATION */}
            <video
                ref={videoRefs.giftAnim}
                playsInline
                muted={currentState === 'emotion_anim' ? (activeEmotionAnim?.isMuted !== false) : (activeGiftAnim?.isMuted !== false)}
                className={`absolute inset-0 w-full h-full object-contain transition-none ${((currentState === 'gift_anim' && activeGiftAnim) || currentState === 'emotion_anim') ? 'z-[26] opacity-100' : 'z-0 opacity-0'}`}
                style={(activeGiftAnim || activeEmotionAnim) ? getLayerStyle((activeGiftAnim?.id || activeEmotionAnim?.id)!) : {}}
                onEnded={handlers.handleGiftOrEmotionEnded}
            />

            {/* 2. TRANSITION IN */}
            <video
                ref={videoRefs.transIn}
                playsInline
                muted={activeGroup?.transInMuted !== false}
                style={getLayerStyle('transIn')}
                onEnded={handlers.handleTransInEnded}
                className={`absolute inset-0 w-full h-full object-contain ${currentState === 'trans_in' || currentState === 'talk' ? 'z-30 opacity-100' : 'z-0 opacity-0'}`}
            />

            {/* 3. TALKING LOOP */}
            <video
                ref={videoRefs.talk}
                playsInline
                muted={activeGroup?.talkMuted !== false}
                style={getLayerStyle('talk')}
                onEnded={handlers.handleTalkLoopEnded}
                className={`absolute inset-0 w-full h-full object-contain ${currentState === 'talk' || currentState === 'trans_out' ? 'z-40 opacity-100' : 'z-0 opacity-0'}`}
            />

            {/* 4. TRANSITION OUT */}
            <video
                ref={videoRefs.transOut}
                playsInline
                muted={activeGroup?.transOutMuted !== false}
                style={getLayerStyle('transOut')}
                onEnded={handlers.handleTransOutEnded}
                className={`absolute inset-0 w-full h-full object-contain ${currentState === 'trans_out' ? 'z-50 opacity-100' : 'z-0 opacity-0'}`}
            />

            {/* 5. PANIC MODE LOOP */}
            <video
                src="/assets/panic.webm"
                loop autoPlay muted playsInline
                style={getLayerStyle('idle')}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${currentState === 'panic' ? 'z-[60] opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}
            />
        </div>
    );
};

export default PlayerVideoLayers;
