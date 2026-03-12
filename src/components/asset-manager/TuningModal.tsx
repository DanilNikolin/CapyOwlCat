import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import ProSlider from '../ProSlider';

interface TuningSlotData {
    id: string;
    label: string;
    file: string;
    isGlobal: boolean;
    groupId?: string;
}

interface TuningModalProps {
    tuningSlot: TuningSlotData;
    setTuningSlot: (slot: TuningSlotData | null) => void;
    getSlotColors: (slotId: string) => any;
    updateLayerColor: (slotId: string, colors: any) => void;
}

export default function TuningModal({
    tuningSlot,
    setTuningSlot,
    getSlotColors,
    updateLayerColor
}: TuningModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto" onClick={() => setTuningSlot(null)} />

            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col w-full max-w-7xl h-[90vh] pointer-events-auto overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-black/20">
                    <div>
                        <h2 className="text-white font-bold tracking-wider flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-purple-400" />
                            Tuning: <span className="text-purple-300">{tuningSlot.label}</span>
                        </h2>
                        <p className="text-xs text-zinc-500 leading-tight mt-1 flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer text-blue-400 hover:text-blue-300 font-bold transition-colors">
                                <input
                                    type="checkbox"
                                    checked={tuningSlot.isGlobal}
                                    onChange={(e) => setTuningSlot({ ...tuningSlot, isGlobal: e.target.checked })}
                                    className="accent-blue-500"
                                />
                                Apply to ALL slots in the group (Linked)
                            </label>
                            <span className="text-zinc-600">|</span>
                            <span>Disable to tune only this specific loop.</span>
                        </p>
                    </div>
                    <button onClick={() => setTuningSlot(null)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Split Screen Previews */}
                <div className="flex-1 flex w-full relative h-full min-h-0">

                    {/* LEFT: IDLE LOOP (Reference) */}
                    <div className="w-1/2 h-full relative border-r border-zinc-800 bg-black"
                        style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '30px 30px' }}
                    >
                        <span className="absolute top-2 left-2 z-20 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-mono uppercase tracking-widest border border-white/10 shadow-lg">
                            Reference (Idle)
                        </span>
                        <video
                            src="/assets/idle.webm"
                            loop autoPlay muted playsInline
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                    </div>

                    {/* RIGHT: TARGET ASSET (Being Tuned) */}
                    <div className="w-1/2 h-full relative bg-black"
                        style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '30px 30px' }}
                    >
                        <span className="absolute top-2 right-2 z-20 bg-purple-500/80 text-white text-[10px] px-2 py-1 rounded font-mono uppercase tracking-widest border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                            Live Tuning
                        </span>

                        {/* SVG Temperature Math Component */}
                        <svg className="hidden">
                            <defs>
                                <filter id={`temp-tuner`}>
                                    <feColorMatrix
                                        type="matrix"
                                        values={`
                                        ${1 + (getSlotColors(tuningSlot.id).temperature / 100 * 0.3) - (getSlotColors(tuningSlot.id).tint / 100 * 0.15)} 0 0 0 0
                                        0 ${1 + (getSlotColors(tuningSlot.id).temperature / 100 * 0.1) + (getSlotColors(tuningSlot.id).tint / 100 * 0.3)} 0 0 0
                                        0 0 ${1 - (getSlotColors(tuningSlot.id).temperature / 100 * 0.3) - (getSlotColors(tuningSlot.id).tint / 100 * 0.15)} 0 0
                                        0 0 0 1 0
                                    `}
                                    />
                                </filter>
                            </defs>
                        </svg>

                        <video
                            src={`/assets/${tuningSlot.file}`}
                            loop autoPlay muted playsInline
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{
                                filter: `url(#temp-tuner) hue-rotate(${getSlotColors(tuningSlot.id).hue}deg) saturate(${getSlotColors(tuningSlot.id).saturate}) brightness(${getSlotColors(tuningSlot.id).brightness}) contrast(${getSlotColors(tuningSlot.id).contrast})`
                            }}
                        />
                    </div>

                </div>

                {/* Bottom Controls Panel */}
                <div className="bg-black/40 border-t border-zinc-800 p-6 flex items-start gap-4 justify-center">

                    <div className="flex-1 max-w-[160px] flex flex-col gap-4">
                        <ProSlider
                            label="Temp"
                            value={getSlotColors(tuningSlot.id).temperature}
                            min={-100} max={100} step={1} defaultValue={0}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { temperature: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { temperature: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { temperature: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { temperature: v });
                                }
                            }}
                            leftLabel="COOL" rightLabel="WARM"
                            trackClass="bg-gradient-to-r from-blue-500 via-zinc-600 to-orange-500"
                        />
                        <ProSlider
                            label="Tint"
                            value={getSlotColors(tuningSlot.id).tint}
                            min={-100} max={100} step={1} defaultValue={0}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { tint: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { tint: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { tint: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { tint: v });
                                }
                            }}
                            leftLabel="MAG" rightLabel="GRN"
                            trackClass="bg-gradient-to-r from-fuchsia-500 via-zinc-600 to-green-500"
                        />
                    </div>

                    <div className="flex-1 max-w-[160px] flex flex-col gap-4">
                        <ProSlider
                            label="Hue"
                            value={getSlotColors(tuningSlot.id).hue}
                            min={-180} max={180} step={1} defaultValue={0}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { hue: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { hue: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { hue: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { hue: v });
                                }
                            }}
                            leftLabel="-180°" rightLabel="+180°"
                            valueSuffix="°"
                        />
                        <ProSlider
                            label="Saturation"
                            value={getSlotColors(tuningSlot.id).saturate}
                            min={0} max={2} step={0.05} defaultValue={1}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { saturate: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { saturate: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { saturate: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { saturate: v });
                                }
                            }}
                        />
                    </div>

                    <div className="flex-1 max-w-[160px] flex flex-col gap-4">
                        <ProSlider
                            label="Brightness"
                            value={getSlotColors(tuningSlot.id).brightness}
                            min={0.5} max={1.5} step={0.05} defaultValue={1}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { brightness: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { brightness: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { brightness: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { brightness: v });
                                }
                            }}
                        />
                        <ProSlider
                            label="Contrast"
                            value={getSlotColors(tuningSlot.id).contrast}
                            min={0.5} max={1.5} step={0.05} defaultValue={1}
                            onChange={(v) => {
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, { contrast: v });
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, { contrast: v });
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, { contrast: v });
                                } else {
                                    updateLayerColor(tuningSlot.id, { contrast: v });
                                }
                            }}
                        />
                    </div>

                    <div className="ml-4 flex items-center h-full">
                        <button
                            onClick={() => {
                                const r = { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
                                if (tuningSlot.isGlobal && tuningSlot.groupId) {
                                    updateLayerColor(`${tuningSlot.groupId}_transIn`, r);
                                    updateLayerColor(`${tuningSlot.groupId}_talk`, r);
                                    updateLayerColor(`${tuningSlot.groupId}_transOut`, r);
                                } else {
                                    updateLayerColor(tuningSlot.id, r);
                                }
                            }}
                            className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider px-4 py-3 bg-zinc-800 hover:bg-red-500/20 rounded transition-colors h-fit mt-5"
                        >
                            {tuningSlot.isGlobal ? 'Reset All (Group)' : 'Reset This'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
