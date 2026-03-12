import React from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Trash2, Upload } from 'lucide-react';

interface UploadSlotProps {
    role: string;
    expectedFileName: string;
    label: string;
    accept?: string;
    isPresent: boolean;
    isLoading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, role: string) => void;
    onDelete: (filename: string) => void;
}

export default function UploadSlot({
    role,
    expectedFileName,
    label,
    accept = "video/webm",
    isPresent,
    isLoading,
    onUpload,
    onDelete
}: UploadSlotProps) {
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
                        onClick={() => onDelete(expectedFileName)}
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
                        onChange={(e) => onUpload(e, role)}
                    />
                </label>
            </div>
            {!isPresent && !isLoading && (
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-red-500/30 w-full" />
            )}
        </div>
    );
}
