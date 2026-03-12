"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, SlidersHorizontal, X, Plus, Trash2, Monitor } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import MonitorTuner from './MonitorTuner';
import UploadSlot from './asset-manager/UploadSlot';
import SectionHeader from './asset-manager/SectionHeader';
import TuningModal from './asset-manager/TuningModal';
import BgmSection from './asset-manager/BgmSection';
import StaticLayersSection from './asset-manager/StaticLayersSection';

const STATIC_SLOTS = [
    { id: 'idle', label: 'Idle Loop', file: 'idle.webm', desc: 'Main resting loop (cat breathing)' },
    { id: 'loopAddon', label: 'Loop Addon', file: 'loop_addon.mp4', desc: 'Background extra loop (e.g. rain)' },
    { id: 'panic', label: 'Panic Mode', file: 'panic.webm', desc: 'Emergency loop for when things break' },
];

export default function AssetManager() {
    // В api/assets теперь возвращается массив строк (имен файлов), а не объект boolean
    const [scannedFiles, setScannedFiles] = useState<string[]>([]);
    const [loadingObj, setLoadingObj] = useState<Record<string, boolean>>({});
    const [showMonitorTuner, setShowMonitorTuner] = useState(false);
    const [openSection, setOpenSection] = useState<'static' | 'groups' | 'idle' | 'gifts' | 'emotions' | 'bgm' | ''>('groups');

    const {
        groups, fetchGroups, addGroup, removeGroup, updateGroupField,
        idleAnimations, fetchIdleAnimations, addIdleAnimation, removeIdleAnimation, updateIdleAnimationField,
        giftAnimations, fetchGiftAnimations, addGiftAnimation, removeGiftAnimation, updateGiftAnimationField,
        emotionGroups, fetchEmotionGroups, addEmotionGroup, removeEmotionGroup, updateEmotionGroupField, addEmotionAnimation, removeEmotionAnimation, updateEmotionAnimationField,
        bgmFile, bgmVolume, fetchBgmSettings, updateBgmSettings,
        layerColors, updateLayerColor
    } = usePlayerStore();

    // Tuning state
    type TuningSlotData = { id: string; label: string; file: string; isGlobal: boolean; groupId?: string };
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
        fetchGiftAnimations();
        fetchEmotionGroups();
        fetchBgmSettings();
    }, [fetchGroups, fetchIdleAnimations, fetchGiftAnimations, fetchEmotionGroups, fetchBgmSettings]);

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
                <StaticLayersSection
                    isOpen={openSection === 'static'}
                    onToggle={() => setOpenSection(openSection === 'static' ? '' : 'static')}
                    slots={STATIC_SLOTS}
                    scannedFiles={scannedFiles}
                    loadingObj={loadingObj}
                    onUpload={handleUpload}
                    onDelete={handleDeleteFile}
                />

                {/* --- BGM --- */}
                <BgmSection
                    isOpen={openSection === 'bgm'}
                    onToggle={() => setOpenSection(openSection === 'bgm' ? '' : 'bgm')}
                    bgmFile={bgmFile}
                    bgmVolume={bgmVolume}
                    onUpload={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('role', 'bgm');
                            fetch('/api/assets', { method: 'POST', body: formData }).then(async (res) => {
                                if (res.ok) {
                                    const data = await res.json();
                                    updateBgmSettings(data.filename, bgmVolume);
                                    checkAssets();
                                }
                            });
                        }
                    }}
                    onVolumeChange={(v) => updateBgmSettings(bgmFile, v)}
                />

                <div className="h-[1px] bg-zinc-800 my-1" />

                {/* --- ANIMATION GROUPS --- */}
                <SectionHeader
                    title={`Talk Event Groups (${groups.length})`}
                    isOpen={openSection === 'groups'}
                    onToggle={() => setOpenSection(openSection === 'groups' ? '' : 'groups')}
                />
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
                                    <div className="flex-1">
                                        <UploadSlot
                                            role={`${group.id}_trans_in`}
                                            expectedFileName={group.transIn}
                                            label="Trans IN"
                                            isPresent={scannedFiles.includes(group.transIn)}
                                            isLoading={loadingObj[`${group.id}_trans_in`]}
                                            onUpload={handleUpload}
                                            onDelete={handleDeleteFile}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setTuningSlot({ id: `${group.id}_transIn`, label: `Tuning Group #${index + 1} (Trans IN)`, file: group.transIn, isGlobal: true, groupId: group.id })}
                                            className="ml-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                            title="Tune Trans IN Colors"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Mute</span>
                                            <input
                                                type="checkbox"
                                                checked={group.transInMuted !== false}
                                                onChange={(e) => updateGroupField(group.id, 'transInMuted', e.target.checked)}
                                                className="accent-purple-500 w-3 h-3"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex border-b border-zinc-800 pb-2 mb-2 items-center justify-between">
                                    <div className="flex-1">
                                        <UploadSlot
                                            role={`${group.id}_talk`}
                                            expectedFileName={group.talk}
                                            label="Talk Loop"
                                            isPresent={scannedFiles.includes(group.talk)}
                                            isLoading={loadingObj[`${group.id}_talk`]}
                                            onUpload={handleUpload}
                                            onDelete={handleDeleteFile}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setTuningSlot({ id: `${group.id}_talk`, label: `Tuning Group #${index + 1} (Talk Loop)`, file: group.talk, isGlobal: true, groupId: group.id })}
                                            className="ml-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                            title="Tune Talk Colors"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Mute</span>
                                            <input
                                                type="checkbox"
                                                checked={group.talkMuted !== false}
                                                onChange={(e) => updateGroupField(group.id, 'talkMuted', e.target.checked)}
                                                className="accent-purple-500 w-3 h-3"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <UploadSlot
                                            role={`${group.id}_trans_out`}
                                            expectedFileName={group.transOut}
                                            label="Trans OUT"
                                            isPresent={scannedFiles.includes(group.transOut)}
                                            isLoading={loadingObj[`${group.id}_trans_out`]}
                                            onUpload={handleUpload}
                                            onDelete={handleDeleteFile}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setTuningSlot({ id: `${group.id}_transOut`, label: `Tuning Group #${index + 1} (Trans OUT)`, file: group.transOut, isGlobal: true, groupId: group.id })}
                                            className="ml-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-purple-400 hover:text-purple-300 rounded flex items-center justify-center transition-colors"
                                            title="Tune Trans OUT Colors"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Mute</span>
                                            <input
                                                type="checkbox"
                                                checked={group.transOutMuted !== false}
                                                onChange={(e) => updateGroupField(group.id, 'transOutMuted', e.target.checked)}
                                                className="accent-purple-500 w-3 h-3"
                                            />
                                        </label>
                                    </div>
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
                <SectionHeader
                    title={`Idle Breakdowns (${idleAnimations.length})`}
                    isOpen={openSection === 'idle'}
                    onToggle={() => setOpenSection(openSection === 'idle' ? '' : 'idle')}
                />

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
                                    <div className="flex-1">
                                        <UploadSlot
                                            role={anim.id}
                                            expectedFileName={anim.video}
                                            label="Animation Video"
                                            isPresent={scannedFiles.includes(anim.video)}
                                            isLoading={loadingObj[anim.id]}
                                            onUpload={handleUpload}
                                            onDelete={handleDeleteFile}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setTuningSlot({ id: anim.id, label: `Tuning Idle Anim #${index + 1} (${anim.id})`, file: anim.video, isGlobal: false })}
                                            className="ml-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-blue-400 hover:text-blue-300 rounded flex items-center justify-center transition-colors border border-blue-900/40 shadow shrink-0"
                                            title="Tune Animation Colors"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Mute</span>
                                            <input
                                                type="checkbox"
                                                checked={anim.isMuted !== false}
                                                onChange={(e) => updateIdleAnimationField(anim.id, 'isMuted', e.target.checked)}
                                                className="accent-blue-500 w-3 h-3"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {idleAnimations.length === 0 && (
                            <div className="text-center text-xs text-zinc-600 py-4 italic">No idle animations defined.</div>
                        )}
                    </div>
                )}

                <div className="h-[1px] bg-zinc-800 my-1" />

                {/* --- GIFTS BREAKDOWNS --- */}
                <SectionHeader
                    title={`Gifts Breakdowns (${giftAnimations.length})`}
                    isOpen={openSection === 'gifts'}
                    onToggle={() => setOpenSection(openSection === 'gifts' ? '' : 'gifts')}
                />

                {openSection === 'gifts' && (
                    <div className="flex flex-col gap-3 mt-2 pl-2 border-l border-zinc-800">
                        <button
                            onClick={addGiftAnimation}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] py-2 px-2 rounded flex items-center justify-center gap-1 font-bold mb-1 w-full"
                        >
                            <Plus className="w-4 h-4" /> ADD NEW GIFT ANIM
                        </button>

                        {giftAnimations.map((anim, index) => (
                            <div key={anim.id} className="bg-black border border-yellow-900/40 rounded-lg p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-yellow-400">Gift Anim #{index + 1}</span>
                                    <button onClick={() => removeGiftAnimation(anim.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Target Tier:</span>
                                    <select
                                        value={anim.targetTier}
                                        onChange={(e) => updateGiftAnimationField(anim.id, 'targetTier', e.target.value)}
                                        className="bg-black text-white w-24 text-right outline-none rounded px-1 border border-zinc-700 focus:border-yellow-500 transition-colors"
                                    >
                                        <option value="low">Low</option>
                                        <option value="mid">Mid</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Min Combo:</span>
                                    <input
                                        type="number"
                                        step="1"
                                        min="1"
                                        value={anim.minCombo}
                                        onChange={(e) => updateGiftAnimationField(anim.id, 'minCombo', parseInt(e.target.value) || 1)}
                                        className="bg-black text-white w-16 text-right outline-none rounded px-1 border border-zinc-700 focus:border-yellow-500 transition-colors"
                                    />
                                </div>

                                {/* Флаг Priority */}
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-white bg-zinc-900 p-2 rounded border border-zinc-800">
                                    <input
                                        type="checkbox"
                                        checked={anim.isPriority}
                                        onChange={(e) => updateGiftAnimationField(anim.id, 'isPriority', e.target.checked)}
                                        className="accent-yellow-500 w-4 h-4"
                                    />
                                    <span className="flex-1">Instant Priority <span className="text-zinc-500 text-[10px]">(skips time)</span></span>
                                </label>

                                {/* Trigger Time Input */}
                                <div className={`flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800 transition-opacity ${anim.isPriority ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                    <span>Trigger @ Sec <span className="text-zinc-500 text-[10px]">(in Idle)</span>:</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={anim.triggerTime}
                                        onChange={(e) => updateGiftAnimationField(anim.id, 'triggerTime', parseFloat(e.target.value) || 0)}
                                        disabled={anim.isPriority}
                                        className="bg-black text-white w-16 text-right outline-none rounded px-1 border border-zinc-700 focus:border-yellow-500 transition-colors disabled:opacity-50"
                                    />
                                </div>

                                <div className="flex border-t border-zinc-800 pt-2 mt-2 items-center justify-between">
                                    <div className="flex-1">
                                        <UploadSlot
                                            role={anim.id}
                                            expectedFileName={anim.video}
                                            label="Animation Video"
                                            isPresent={scannedFiles.includes(anim.video)}
                                            isLoading={loadingObj[anim.id]}
                                            onUpload={handleUpload}
                                            onDelete={handleDeleteFile}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <button
                                            onClick={() => setTuningSlot({ id: anim.id, label: `Tuning Gift Anim #${index + 1} (${anim.id})`, file: anim.video, isGlobal: false })}
                                            className="ml-2 w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-yellow-400 hover:text-yellow-300 rounded flex items-center justify-center transition-colors border border-yellow-900/40 shadow shrink-0"
                                            title="Tune Animation Colors"
                                        >
                                            <SlidersHorizontal className="w-4 h-4" />
                                        </button>
                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                            <span className="text-[9px] text-zinc-500 font-bold uppercase">Mute</span>
                                            <input
                                                type="checkbox"
                                                checked={anim.isMuted !== false}
                                                onChange={(e) => updateGiftAnimationField(anim.id, 'isMuted', e.target.checked)}
                                                className="accent-yellow-500 w-3 h-3"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {giftAnimations.length === 0 && (
                            <div className="text-center text-xs text-zinc-600 py-4 italic">No gift animations defined.</div>
                        )}
                    </div>
                )}


                <div className="h-[1px] bg-zinc-800 my-1" />

                {/* --- EMOTION GROUPS --- */}
                <SectionHeader
                    title={`Emotion Groups (${emotionGroups.length})`}
                    isOpen={openSection === 'emotions'}
                    onToggle={() => setOpenSection(openSection === 'emotions' ? '' : 'emotions')}
                />

                {openSection === 'emotions' && (
                    <div className="flex flex-col gap-3 mt-2 pl-2 border-l border-zinc-800">
                        <button
                            onClick={addEmotionGroup}
                            className="bg-pink-600 hover:bg-pink-500 text-white text-[10px] py-2 px-2 rounded flex items-center justify-center gap-1 font-bold mb-1 w-full"
                        >
                            <Plus className="w-4 h-4" /> ADD NEW EMOTION GROUP
                        </button>

                        {emotionGroups.map((group, index) => (
                            <div key={group.id} className="bg-black border border-pink-900/40 rounded-lg p-3 flex flex-col gap-2 relative">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-pink-400">Emotion #{index + 1}</span>
                                    <button onClick={() => removeEmotionGroup(group.id)} className="text-zinc-600 hover:text-red-500 p-1">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span>Trigger Name:</span>
                                    <input
                                        type="text"
                                        value={group.triggerName}
                                        onChange={(e) => updateEmotionGroupField(group.id, 'triggerName', e.target.value)}
                                        className="bg-black text-white w-24 text-right outline-none rounded px-1 border border-zinc-700 focus:border-pink-500 transition-colors"
                                        placeholder="angry"
                                    />
                                </div>

                                <div className="flex flex-col gap-1 bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                                    <span className="text-zinc-400 mb-1">Prompt Instructions (for Grok):</span>
                                    <textarea
                                        value={group.promptDesc}
                                        onChange={(e) => updateEmotionGroupField(group.id, 'promptDesc', e.target.value)}
                                        className="bg-black text-white w-full h-16 outline-none rounded p-1 border border-zinc-700 focus:border-pink-500 transition-colors resize-none"
                                        placeholder="Describe when to use this emotion..."
                                    />
                                </div>

                                <div className="mt-2">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-[10px] text-zinc-500 font-bold">ANIMATIONS ({group.animations.length})</span>
                                        <button
                                            onClick={() => addEmotionAnimation(group.id)}
                                            className="text-pink-400 hover:text-pink-300 text-[10px] font-bold px-2 py-1 bg-zinc-900 rounded border border-zinc-800"
                                        >
                                            + ADD ANIM
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {group.animations.map((anim, aIdx) => (
                                            <div key={anim.id} className="flex flex-col gap-2 bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-zinc-500">Var #{aIdx + 1}</span>
                                                    <button onClick={() => removeEmotionAnimation(group.id, anim.id)} className="text-zinc-600 hover:text-red-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between bg-black p-1 rounded border border-zinc-800 text-xs">
                                                    <span className="text-zinc-400 px-1">Trigger @ Sec:</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={anim.triggerTime}
                                                        onChange={(e) => updateEmotionAnimationField(group.id, anim.id, 'triggerTime', parseFloat(e.target.value) || 0)}
                                                        className="bg-transparent text-white w-14 text-right outline-none pr-1"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 scale-90 origin-left">
                                                        <UploadSlot
                                                            role={anim.id}
                                                            expectedFileName={anim.video}
                                                            label="WebM"
                                                            isPresent={scannedFiles.includes(anim.video)}
                                                            isLoading={loadingObj[anim.id]}
                                                            onUpload={handleUpload}
                                                            onDelete={handleDeleteFile}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1 items-end pt-1">
                                                        <button
                                                            onClick={() => setTuningSlot({ id: anim.id, label: `Tune Emotion ${group.triggerName} (${anim.id})`, file: anim.video, isGlobal: false })}
                                                            className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-pink-400 hover:text-pink-300 rounded flex items-center justify-center border border-pink-900/40"
                                                        >
                                                            <SlidersHorizontal className="w-3 h-3" />
                                                        </button>
                                                        <label className="flex items-center gap-1 cursor-pointer ml-2">
                                                            <span className="text-[8px] text-zinc-500 font-bold uppercase">Mute</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={anim.isMuted !== false}
                                                                onChange={(e) => updateEmotionAnimationField(group.id, anim.id, 'isMuted', e.target.checked)}
                                                                className="accent-pink-500 w-2.5 h-2.5"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {emotionGroups.length === 0 && (
                            <div className="text-center text-xs text-zinc-600 py-4 italic">No emotion groups defined.</div>
                        )}
                    </div>
                )}
            </div>

            {showMonitorTuner && <MonitorTuner onClose={() => setShowMonitorTuner(false)} />}

            {/* GIANT TUNING MODAL OVERLAY */}
            {tuningSlot && (
                <TuningModal
                    tuningSlot={tuningSlot}
                    setTuningSlot={setTuningSlot}
                    getSlotColors={getSlotColors}
                    updateLayerColor={updateLayerColor}
                />
            )}
        </>
    );
}
