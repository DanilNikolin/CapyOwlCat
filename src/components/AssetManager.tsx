"use client";

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, RefreshCw, SlidersHorizontal, X, Plus, Trash2, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import ProSlider from './ProSlider';
import MonitorTuner from './MonitorTuner';

const STATIC_SLOTS = [
    { id: 'idle', label: 'Idle Loop', file: 'idle.webm', desc: 'Main resting loop (cat breathing)' },
    { id: 'loopAddon', label: 'Loop Addon', file: 'loop_addon.mp4', desc: 'Background extra loop (e.g. rain)' },
];

export default function AssetManager() {
    // В api/assets теперь возвращается массив строк (имен файлов), а не объект boolean
    const [scannedFiles, setScannedFiles] = useState<string[]>([]);
    const [loadingObj, setLoadingObj] = useState<Record<string, boolean>>({});
    const [showMonitorTuner, setShowMonitorTuner] = useState(false);
    const [openSection, setOpenSection] = useState<'static' | 'groups' | 'idle' | ''>('groups');

    const {
        groups, fetchGroups, addGroup, removeGroup, updateGroupField,
        idleAnimations, fetchIdleAnimations, addIdleAnimation, removeIdleAnimation, updateIdleAnimationField,
        layerColors, updateLayerColor
    } = usePlayerStore();

    // Tuning state
    type TuningSlotData = { id: string; label: string; file: string; isGlobal: boolean; };
    const [tuningSlot, setTuningSlot] = useState<TuningSlotData | null>(null);

    const checkAssets = async () => {
        try {
            const res = await fetch('/api/assets');
            const data = await res.json();
            setScannedFiles(data.files || []);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        checkAssets();
        fetchGroups();
        fetchIdleAnimations();
    }, [fetchGroups, fetchIdleAnimations]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, role: string) => {
        if (!e.target.files || !e.target.files[0]) return;

        setLoadingObj((prev) => ({ ...prev, [role]: true }));

        const formData = new FormData();
        formData.append('file', e.target.files[0]);
        formData.append('role', role);

        try {
            await fetch('/api/assets', {
                method: 'POST',
                body: formData,
            });
            await checkAssets();
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingObj((prev) => ({ ...prev, [role]: false }));
        }
    };

    const handleDeleteFile = async (filename: string) => {
        if (!confirm(`Are you sure you want to delete ${filename} from disk?`)) return;
        try {
            await fetch(`/api/assets?filename=${filename}`, { method: 'DELETE' });
            await checkAssets();
        } catch (e) {
            console.error('Delete error', e);
        }
    };

    const getSlotColors = (slotId: string) => {
        const defaultColors = { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
        return { ...defaultColors, ...(layerColors[slotId] || {}) };
    };

    // Компонент-рендер одного загружаемого слота
    const renderUploadSlot = (role: string, expectedFileName: string, label: string, accept: string = "video/webm") => {
        const isPresent = scannedFiles.includes(expectedFileName);
        const isLoading = loadingObj[role];

        return (
            <div key={role} className="bg-black/40 border border-zinc-800 rounded px-3 py-2 flex flex-col gap-1 relative overflow-hidden group">
                <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-white tracking-wide">{label}</span>
                    <div className="flex items-center gap-1 font-mono">
                        {isLoading ? (
                            <span className="text-blue-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> ...</span>
                        ) : isPresent ? (
                            <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> READY</span>
                        ) : (
                            <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> MISS</span>
                        )}
                    </div>
                </div>

                <div className="flex justify-end mt-1 gap-2">
                    {/* Delete File Button */}
                    {isPresent && (
                        <button
                            onClick={() => handleDeleteFile(expectedFileName)}
                            className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                            title="Delete File"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}

                    {/* Upload */}
                    <label className="bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold py-1 px-2 rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        Upload
                        <input
                            key={Date.now()}
                            type="file"
                            accept={accept}
                            className="hidden"
                            onChange={(e) => handleUpload(e, role)}
                        />
                    </label>
                </div>
                {!isPresent && !isLoading && (
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-red-500/30 w-full" />
                )}
            </div>
        );
    };


    return (
        <>
            <div className="absolute top-4 left-4 z-40 bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex flex-col gap-3 w-80 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Asset Manager
                    </h3>
                    <button onClick={checkAssets} className="text-zinc-500 hover:text-white transition-colors p-1" title="Refresh Files">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={() => setShowMonitorTuner(true)}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-green-400 hover:text-green-300 text-[10px] font-bold py-2 px-3 rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)_inset]"
                >
                    <Monitor className="w-4 h-4" />
                    Setup Virtual Monitor
                </button>

                {/* --- STATIC SLOTS --- */}
                <div
                    className="flex justify-between items-center mt-2 cursor-pointer bg-zinc-800/50 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    onClick={() => setOpenSection(openSection === 'static' ? '' : 'static')}
                >
                    <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                        {openSection === 'static' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Static Layers
                    </h4>
                </div>
                {openSection === 'static' && (
                    <div className="flex flex-col gap-2 mt-2 pl-2 border-l border-zinc-800">
                        {STATIC_SLOTS.map((slot) => renderUploadSlot(slot.id, slot.file, slot.label, slot.id === 'loopAddon' ? 'video/mp4' : 'video/webm'))}
                    </div>
                )}

                <div className="h-[1px] bg-zinc-800 my-1" />

                {/* --- ANIMATION GROUPS --- */}
                <div
                    className="flex justify-between items-center cursor-pointer bg-zinc-800/50 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    onClick={() => setOpenSection(openSection === 'groups' ? '' : 'groups')}
                >
                    <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                        {openSection === 'groups' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Talk Event Groups ({groups.length})
                    </h4>
                </div>
                {openSection === 'groups' && (
                    <div className="flex flex-col gap-3 mt-2 pl-2 border-l border-zinc-800">
                        <button
                            onClick={addGroup}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-[10px] py-2 px-2 rounded flex items-center justify-center gap-1 font-bold mb-1 w-full"
                        >
                            <Plus className="w-4 h-4" /> ADD NEW TALK GROUP
                        </button>

                        {groups.map((group, index) => (
                            <div key={group.id} className="bg-black border border-purple-900/40 rounded-lg p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-purple-400">Group #{index + 1}</span>
                                    <button onClick={() => removeGroup(group.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Trigger Time Input */}
                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Trigger @ Sec <span className="text-zinc-500 text-[10px]">(in Idle)</span>:</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={group.triggerTime}
                                        onChange={(e) => updateGroupField(group.id, 'triggerTime', parseFloat(e.target.value) || 0)}
                                        className="bg-black text-white w-16 text-right outline-none rounded px-1 border border-zinc-700 focus:border-purple-500 transition-colors"
                                    />
                                </div>

                                {/* 3 Uploads for this group */}
                                <div className="flex border-b border-zinc-800 pb-2 mb-2 items-center justify-between">
                                    <div className="flex-1">{renderUploadSlot(`${group.id}_trans_in`, group.transIn, 'Trans IN')}</div>
                                    <button
                                        onClick={() => setTuningSlot({ id: 'transIn', label: `Tuning Group #${index + 1} (Trans IN)`, file: group.transIn, isGlobal: true })}
                                        className="ml-2 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                        title="Tune Trans IN Colors"
                                    >
                                        <SlidersHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex border-b border-zinc-800 pb-2 mb-2 items-center justify-between">
                                    <div className="flex-1">{renderUploadSlot(`${group.id}_talk`, group.talk, 'Talk Loop')}</div>
                                    <button
                                        onClick={() => setTuningSlot({ id: 'talk', label: `Tuning Group #${index + 1} (Talk Loop)`, file: group.talk, isGlobal: true })}
                                        className="ml-2 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                        title="Tune Talk Colors"
                                    >
                                        <SlidersHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">{renderUploadSlot(`${group.id}_trans_out`, group.transOut, 'Trans OUT')}</div>
                                    <button
                                        onClick={() => setTuningSlot({ id: 'transOut', label: `Tuning Group #${index + 1} (Trans OUT)`, file: group.transOut, isGlobal: true })}
                                        className="ml-2 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                        title="Tune Trans OUT Colors"
                                    >
                                        <SlidersHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {groups.length === 0 && (
                            <div className="text-center text-xs text-zinc-600 py-4 italic">No groups defined.</div>
                        )}
                    </div>
                )}

                <div className="h-[1px] bg-zinc-800 my-1" />

                {/* --- IDLE BREAKDOWNS --- */}
                <div
                    className="flex justify-between items-center cursor-pointer bg-zinc-800/50 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    onClick={() => setOpenSection(openSection === 'idle' ? '' : 'idle')}
                >
                    <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                        {openSection === 'idle' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Idle Breakdowns ({idleAnimations.length})
                    </h4>
                </div>

                {openSection === 'idle' && (
                    <div className="flex flex-col gap-3 mt-2 pl-2 border-l border-zinc-800">
                        <button
                            onClick={addIdleAnimation}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-2 px-2 rounded flex items-center justify-center gap-1 font-bold mb-1 w-full"
                        >
                            <Plus className="w-4 h-4" /> ADD NEW IDLE ANIM
                        </button>

                        {idleAnimations.map((anim, index) => (
                            <div key={anim.id} className="bg-black border border-blue-900/40 rounded-lg p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-blue-400">Idle Anim #{index + 1}</span>
                                    <button onClick={() => removeIdleAnimation(anim.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Trigger @ Sec:</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={anim.triggerTime}
                                        onChange={(e) => updateIdleAnimationField(anim.id, 'triggerTime', parseFloat(e.target.value) || 0)}
                                        className="bg-black text-white w-16 text-right outline-none rounded px-1 border border-zinc-700 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Chance (%):</span>
                                    <input
                                        type="number"
                                        step="1"
                                        min="0" max="100"
                                        value={anim.chance}
                                        onChange={(e) => updateIdleAnimationField(anim.id, 'chance', parseInt(e.target.value) || 0)}
                                        className="bg-black text-white w-16 text-right outline-none rounded px-1 border border-zinc-700 focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="flex border-t border-zinc-800 pt-2 mt-2 items-center justify-between">
                                    <div className="flex-1">{renderUploadSlot(anim.id, anim.video, 'Animation Video')}</div>
                                    <button
                                        onClick={() => setTuningSlot({ id: anim.id, label: `Tuning Idle Anim #${index + 1} (${anim.id})`, file: anim.video, isGlobal: false })}
                                        className="ml-2 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-blue-400 hover:text-blue-300 rounded flex items-center justify-center transition-colors border border-blue-900/40 shadow shrink-0"
                                        title="Tune Animation Colors"
                                    >
                                        <SlidersHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {idleAnimations.length === 0 && (
                            <div className="text-center text-xs text-zinc-600 py-4 italic">No idle animations defined.</div>
                        )}
                    </div>
                )}
            </div>

            {showMonitorTuner && <MonitorTuner onClose={() => setShowMonitorTuner(false)} />}

            {/* GIANT TUNING MODAL OVERLAY */}
            {tuningSlot && (
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { temperature: v });
                                            updateLayerColor('talk', { temperature: v });
                                            updateLayerColor('transOut', { temperature: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { tint: v });
                                            updateLayerColor('talk', { tint: v });
                                            updateLayerColor('transOut', { tint: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { hue: v });
                                            updateLayerColor('talk', { hue: v });
                                            updateLayerColor('transOut', { hue: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { saturate: v });
                                            updateLayerColor('talk', { saturate: v });
                                            updateLayerColor('transOut', { saturate: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { brightness: v });
                                            updateLayerColor('talk', { brightness: v });
                                            updateLayerColor('transOut', { brightness: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', { contrast: v });
                                            updateLayerColor('talk', { contrast: v });
                                            updateLayerColor('transOut', { contrast: v });
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
                                        if (tuningSlot.isGlobal) {
                                            updateLayerColor('transIn', r);
                                            updateLayerColor('talk', r);
                                            updateLayerColor('transOut', r);
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
            )}
        </>
    );
}
