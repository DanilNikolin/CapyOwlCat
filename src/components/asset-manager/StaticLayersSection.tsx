import React from 'react';
import SectionHeader from './SectionHeader';
import UploadSlot from './UploadSlot';

interface StaticSlot {
    id: string;
    label: string;
    file: string;
    desc: string;
}

interface StaticLayersSectionProps {
    isOpen: boolean;
    onToggle: () => void;
    slots: StaticSlot[];
    scannedFiles: string[];
    loadingObj: Record<string, boolean>;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, role: string) => void;
    onDelete: (filename: string) => void;
}

export default function StaticLayersSection({
    isOpen,
    onToggle,
    slots,
    scannedFiles,
    loadingObj,
    onUpload,
    onDelete
}: StaticLayersSectionProps) {
    return (
        <>
            <div className="mt-2">
                <SectionHeader
                    title="Static Layers"
                    isOpen={isOpen}
                    onToggle={onToggle}
                />
            </div>
            {isOpen && (
                <div className="flex flex-col gap-2 mt-2 pl-2 border-l border-zinc-800">
                    {slots.map((slot) => (
                        <UploadSlot
                            key={slot.id}
                            role={slot.id}
                            expectedFileName={slot.file}
                            label={slot.label}
                            accept={slot.id === 'loopAddon' ? 'video/mp4' : 'video/webm'}
                            isPresent={scannedFiles.includes(slot.file)}
                            isLoading={loadingObj[slot.id]}
                            onUpload={onUpload}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
