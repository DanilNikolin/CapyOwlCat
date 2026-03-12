import React from 'react';
import { IncomingMessage, PlayerState } from '@/store/usePlayerStore';

interface PlayerSubtitleOverlayProps {
    isSubtitleVisible: boolean;
    currentState: PlayerState;
    incomingMessage: IncomingMessage | null;
    typedText: string;
}

const PlayerSubtitleOverlay: React.FC<PlayerSubtitleOverlayProps> = ({
    isSubtitleVisible,
    currentState,
    incomingMessage,
    typedText
}) => {
    // Оверлей виден, если есть либо субтитры, либо входящее сообщение
    const isOverlayVisible = isSubtitleVisible || !!incomingMessage;

    return (
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center w-full max-w-sm px-4 pointer-events-none transition-all duration-500 transform ${isOverlayVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            
            {/* Плашка с именем пользователя */}
            {incomingMessage && (
                <div className="bg-[#00ffcc] text-black font-bold text-xs uppercase px-3 py-1 rounded-t-lg shadow-lg self-start ml-2 mb-[-1px] z-30">
                    {incomingMessage.type === 'gift' ? '🎁 ' : '💬 '}{incomingMessage.username} {incomingMessage.type === 'gift' ? `sent ${incomingMessage.giftName}` : 'asks'}:
                </div>
            )}

            {/* Контейнер текста */}
            <div className="w-full bg-black/80 backdrop-blur-md border border-zinc-800 rounded-xl p-4 text-left z-20 flex flex-col gap-2">
                {/* Цитируемое сообщение (если есть) */}
                {incomingMessage && (
                    <p className="text-sm font-mono text-zinc-300 italic border-l-2 border-[#00ffcc] pl-3 py-1 bg-white/5 rounded-r w-fit max-w-[90%] self-start">
                        &quot;{incomingMessage.text}&quot;
                    </p>
                )}
                
                {/* Текст ответа персонажа */}
                <p className="text-xl leading-relaxed text-center font-mono text-[#00ffaa] drop-shadow-[0_0_8px_rgba(0,255,170,0.5)] mt-1">
                    {typedText}
                    {isSubtitleVisible && currentState === 'talk' && (
                        <span className="animate-pulse inline-block w-2.5 h-5 bg-[#00ffaa] ml-1 translate-y-1" />
                    )}
                </p>
            </div>
        </div>
    );
};

export default PlayerSubtitleOverlay;
