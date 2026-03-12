import React from 'react';
import SectionHeader from './SectionHeader';

interface BgmSectionProps {
    isOpen: boolean;
    onToggle: () => void;
    bgmFile: string | null;
    bgmVolume: number;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVolumeChange: (value: number) => void;
}

export default function BgmSection({
    isOpen,
    onToggle,
    bgmFile,
    bgmVolume,
    onUpload,
    onVolumeChange
}: BgmSectionProps) {
    return (
        <>
            <SectionHeader
                title="Background Music"
                isOpen={isOpen}
                onToggle={onToggle}
            />
            {isOpen && (
                <div className="flex flex-col gap-2 mt-2 pl-2 border-l border-zinc-800">
                    <div className="flex flex-col gap-2 bg-black border border-zinc-800 rounded-lg p-3 relative">
                        <span className="text-xs text-zinc-500 font-bold mb-1">BGM Audio File</span>
                        <div className="flex bg-zinc-900 border border-zinc-700/50 rounded p-1 w-full items-center gap-2">
                            <span className={`text-xs ml-2 truncate font-mono ${bgmFile ? 'text-green-400' : 'text-zinc-500 italic'}`}>
                                {bgmFile || 'No file selected'}
                            </span>
                            <input
                                type="file"
                                id="bgm_upload"
                                accept="audio/mpeg, audio/wav, audio/ogg"
                                onChange={onUpload}
                                className="hidden"
                            />
                            <label
                                htmlFor="bgm_upload"
                                className="ml-auto bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] uppercase font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                            >
                                Upload / Select
                            </label>
                        </div>

                        <div className="flex items-center justify-between mt-3 bg-zinc-900 p-2 rounded text-xs text-white border border-zinc-800">
                            <span className="text-zinc-400">Volume:</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={bgmVolume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value) || 0)}
                                className="bg-black text-white w-14 text-right outline-none pr-1 focus:border-green-500 transition-colors border border-transparent"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
