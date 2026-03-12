import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
}

export default function SectionHeader({ title, isOpen, onToggle }: SectionHeaderProps) {
    return (
        <div
            className="flex justify-between items-center cursor-pointer bg-zinc-800/50 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            onClick={onToggle}
        >
            <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {title}
            </h4>
        </div>
    );
}
