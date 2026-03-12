import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PlayerState, AnimationGroup, IdleAnimation, QueuedGift } from '@/store/usePlayerStore';

interface PlayerDebugPanelProps {
    isEditorMode: boolean;
    isPipelineOpen: boolean;
    setIsPipelineOpen: (open: boolean) => void;
    currentState: PlayerState;
    debugTime: { vid: string; aud: string };
    activeStates: {
        activeGroup: AnimationGroup | null;
        activeIdleAnim: IdleAnimation | null;
    };
    giftQueue: QueuedGift[];
    groupsCount: number;
}

const PlayerDebugPanel: React.FC<PlayerDebugPanelProps> = ({
    isEditorMode,
    isPipelineOpen,
    setIsPipelineOpen,
    currentState,
    debugTime,
    activeStates,
    giftQueue,
    groupsCount
}) => {
    const { activeGroup, activeIdleAnim } = activeStates;

    // Обычный режим (не эдитор) — мелкая инфа в углу
    if (!isEditorMode) {
        return (
            <div className="absolute top-4 right-4 z-50 bg-black/50 text-white font-mono text-[10px] p-2 rounded backdrop-blur border border-white/10 pointer-events-none text-right">
                <div className="text-yellow-400">STATE: {currentState.toUpperCase()}</div>
                {activeGroup && (
                    <div className="text-purple-400">
                        WAITING TARGET: {parseFloat(activeGroup.triggerTime.toString()).toFixed(1)}s
                    </div>
                )}
            </div>
        );
    }

    // Режим редактора — подробный Pipeline Monitor
    return (
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
                            <span className="font-bold text-purple-400">{parseFloat(activeGroup.triggerTime.toString()).toFixed(1)}s (Grp: {groupsCount})</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlayerDebugPanel;
