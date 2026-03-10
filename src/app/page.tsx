"use client";
import { useState } from 'react';
import Link from 'next/link';
import StreamerPlayer from '@/components/StreamerPlayer';
import MockTrigger from '@/components/MockTrigger';
import AssetManager from '@/components/AssetManager';
import { Settings, PlayCircle, Scissors } from 'lucide-react';

export default function Home() {
  const [isEditorMode, setIsEditorMode] = useState(true);

  return (
    <main className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Плеер крутится всегда */}
      <StreamerPlayer isEditorMode={isEditorMode} />

      {/* Скрываем все лишнее, кроме секретной кнопки, если это Stream Mode */}
      {isEditorMode ? (
        <>
          <AssetManager />
          <MockTrigger />
          <div className="absolute top-4 inset-x-0 mx-auto w-fit z-50 flex gap-2">
            <button
              onClick={() => setIsEditorMode(false)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-full text-xs font-black transition-all active:scale-95 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
            >
              <PlayCircle className="w-4 h-4" />
              GO LIVE (HIDE UI)
            </button>
            <Link
              href="/chromakey"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all border border-zinc-700 shadow-xl"
            >
              <Scissors className="w-4 h-4" />
              ALPHA FORGE
            </Link>
          </div>
        </>
      ) : (
        <button
          onClick={() => setIsEditorMode(true)}
          className="absolute top-4 left-4 z-50 text-white/10 hover:text-white/50 transition-colors p-2"
          title="Enter Editor Mode"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}
