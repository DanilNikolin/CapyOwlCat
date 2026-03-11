"use client";

import { usePlayerStore } from '@/store/usePlayerStore';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

type ChatEvent = {
    type: 'chat';
    timestamp: number;
    cleanText: string;
    score: number;
    data: {
        uniqueId: string;
        comment: string;
    };
};

type GiftEvent = {
    type: 'gift';
    timestamp: number;
    data: {
        uniqueId: string;
        giftName: string;
        giftType: number;
        repeatEnd?: boolean;
    };
};
type RawTikTokChatEvent = {
    type: 'chat';
    data?: {
        uniqueId?: string;
        comment?: string;
    };
};

type RawTikTokGiftEvent = {
    type: 'gift';
    data?: {
        uniqueId?: string;
        giftName?: string;
        giftType?: number;
        repeatEnd?: boolean;
        diamondCount?: number;
    };
};

type RawTikTokEvent = RawTikTokChatEvent | RawTikTokGiftEvent;

type IncomingMessage =
    | { username: string; text: string; type: 'chat' }
    | { username: string; text: string; type: 'gift'; giftName: string };

export default function MockTrigger() {
    const { setThinking, triggerEvent, selectedVoice, fetchVoice, updateVoice, setIncomingMessage, enqueueGift, isPanicMode, setPanicMode } = usePlayerStore();
    const [inputValue, setInputValue] = useState('Testing. Just say hi and hello world and nothing else.');

    // Manage Loading State + Ref for setInterval access
    const [isLoading, _setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);
    const setIsLoading = (val: boolean) => {
        isLoadingRef.current = val;
        _setIsLoading(val);
    };

    const [voicesList, setVoicesList] = useState<string[]>([]);

    // TikTok Live State
    const [tiktokUsername, setTiktokUsername] = useState('any_live_creator_username');
    const [isTiktokConnected, setIsTiktokConnected] = useState(false);

    // Queues and Anti-Spam
    const currentWindowRef = useRef<ChatEvent[]>([]);
    const vipQueueRef = useRef<GiftEvent[]>([]);
    const spamBlacklistRef = useRef<{ [username: string]: number }>({});
    const userMsgTimestampsRef = useRef<{ [username: string]: number[] }>({});
    const consecutiveVipsRef = useRef(0);

    // History State
    const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/grok');
            const data = await res.json();
            if (data.history) setChatHistory(data.history);
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    const clearHistory = async () => {
        try {
            await fetch('/api/grok', { method: 'DELETE' });
            setChatHistory([]);
        } catch (e) {
            console.error("Failed to clear history", e);
        }
    };

    // Обновляем историю при первой загрузке
    useEffect(() => {
        fetchHistory();
    }, []);

    // --- EFFECT: Polling TikTok Queue if Connected ---
    useEffect(() => {
        let isActive = true;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const pollTikTok = async () => {
            if (!isActive || !isTiktokConnected || usePlayerStore.getState().isPanicMode) {
                if (isActive && isTiktokConnected) {
                    timeoutId = setTimeout(pollTikTok, 2000);
                }
                return;
            }

            let nextPollDelay = 1000;

            try {
                const res = await fetch('/api/tiktok');

                if (!res.ok) {
                    console.error(`[TikTok] Polling failed with status ${res.status}`);
                    nextPollDelay = 3000;
                } else {
                    const data = await res.json();
                    if (!data.connected && isTiktokConnected) {
                        setIsTiktokConnected(false);
                        console.log("[TikTok] System reported disconnect.");
                        return;
                    }
                    if (data.events && data.events.length > 0) {
                        const now = Date.now();

                        // 1. Очистка старых банов (30 сек)
                        for (const user in spamBlacklistRef.current) {
                            if (now - spamBlacklistRef.current[user] > 30000) {
                                delete spamBlacklistRef.current[user];
                            }
                        }

                        // Очистка старых таймстемпов сообщений (храним только последние 10 сек)
                        for (const user in userMsgTimestampsRef.current) {
                            userMsgTimestampsRef.current[user] = userMsgTimestampsRef.current[user].filter(t => now - t < 10000);
                            if (userMsgTimestampsRef.current[user].length === 0) delete userMsgTimestampsRef.current[user];
                        }

                        // Очистка мертвых сообщений "корзины" (старше 15 сек)
                        currentWindowRef.current = currentWindowRef.current.filter(x => now - x.timestamp < 15000);

                        // Очистка мертвых VIP подарков (старше 30 сек)
                        vipQueueRef.current = vipQueueRef.current.filter(x => now - x.timestamp < 30000);

                        // 2. Сортировка свежих сообщений
                        (data.events as RawTikTokEvent[]).forEach((e) => {
                            if (
                                e.type === 'gift' &&
                                e.data?.uniqueId &&
                                e.data?.giftName &&
                                !e.data?.repeatEnd // Игнорим промежуточные спам-ивенты, если не repeatEnd. Или ловим все, чтобы набивать комбо?
                                // У тиктока repeatEnd=true приходит в конце комбо, но нам лучше закидывать по одному, чтобы наша giftQueue сама стакала комбо!
                            ) {
                                // Если это обычный эвент подарка
                                const diamonds = e.data.diamondCount || 1; // Фоллбэк, если пока нет diamondCount
                                let tier = 'low';
                                if (diamonds >= 100 && diamonds < 1000) tier = 'mid';
                                else if (diamonds >= 1000) tier = 'high';

                                enqueueGift(tier);

                                // VIP-очередь больше не юзаем для подарков, они идут напрямую в плеер.
                            } else if (e.type === 'chat' && e.data?.comment && e.data?.uniqueId) {
                                const rawText = e.data.comment.trim();
                                const user = e.data.uniqueId;

                                // Нормализация текста (нижний регистр, убираем мусор, схлопываем повторяющиеся буквы "aaaa" -> "aa")
                                const cleanText = rawText.toLowerCase().replace(/[^\p{L}\p{N}\s?]/gu, '').replace(/(.)\1{2,}/g, '$1$1').trim();

                                // LEVEL 1: Грубый фильтр
                                if (spamBlacklistRef.current[user]) return; // Юзер в муте
                                if (cleanText.length === 0) return; // Один мусор (типа пустые эмодзи)

                                // Защита от спама (Rate Limit: 4 сообщения за 10 сек)
                                if (!userMsgTimestampsRef.current[user]) userMsgTimestampsRef.current[user] = [];
                                userMsgTimestampsRef.current[user].push(now);

                                if (userMsgTimestampsRef.current[user].length > 3) {
                                    spamBlacklistRef.current[user] = now; // Мут на 30с
                                    currentWindowRef.current = currentWindowRef.current.filter(
                                        x => x.data.uniqueId !== user
                                    );
                                    return;
                                }

                                // Защита от прямых дублей ОТ ТОГО ЖЕ ЮЗЕРА в окне (позволяет мемам жить от РАЗНЫХ юзеров)
                                if (currentWindowRef.current.some(x => x.data.uniqueId === user && x.cleanText === cleanText)) return;

                                // Scoring
                                let score = 0;
                                if (cleanText.includes('?')) score += 3; // Вопросы круто
                                if (rawText.length >= 10 && rawText.length < 50) score += 2; // Развернутые, но не спам
                                if (/^(hi|yo|gg|ok|wow|lol|lmao)$/i.test(cleanText)) score += 1; // Точный матч коротких сленгов
                                if (/(.)\1{4,}/.test(rawText)) score -= 3; // Одинаковые символы подряд (aaaaaaa)

                                // Санкции за явный CAPS
                                const lettersOnly = rawText.replace(/[^\p{L}]/gu, '');
                                const isCapsSpam = lettersOnly.length >= 6 && lettersOnly === lettersOnly.toUpperCase();
                                if (isCapsSpam) score -= 2;

                                // Social Boost
                                const duplicateCount = currentWindowRef.current.filter(
                                    x => x.cleanText === cleanText && x.data.uniqueId !== user
                                ).length;
                                score += Math.min(duplicateCount, 3);

                                currentWindowRef.current.push({
                                    type: 'chat',
                                    timestamp: now,
                                    cleanText,
                                    score,
                                    data: {
                                        uniqueId: user,
                                        comment: rawText,
                                    }
                                }); // Временное окно
                            }
                        });
                    }

                    // 3. Выбор сообщения и ответ (если Кот свободен!)
                    const isBusy = isLoadingRef.current || usePlayerStore.getState().isThinking || usePlayerStore.getState().currentState !== 'idle';

                    if (!isBusy) {
                        let selectedEvent: ChatEvent | null = null;
                        const hasChat = currentWindowRef.current.length > 0;

                        if (hasChat) {
                            const sortedWindow = [...currentWindowRef.current].sort((a, b) => b.score - a.score);

                            // Берем топ-3 (или меньше) с лучшим скором и рандомим между ними
                            const topCandidates = sortedWindow.slice(0, 3);
                            selectedEvent = topCandidates[Math.floor(Math.random() * topCandidates.length)];

                            // СЖИГАЕМ ОКНО (Chat clears!)
                            currentWindowRef.current = [];
                        }

                        if (selectedEvent && selectedEvent.type === 'chat') {
                            const prompt = `${selectedEvent.data.uniqueId} asks: ${selectedEvent.data.comment}`;
                            handleAskGrok(prompt, { username: selectedEvent.data.uniqueId, text: selectedEvent.data.comment, type: 'chat' });
                        }
                    }
                }
            } catch (err) {
                console.error("[TikTok] Polling error", err);
                nextPollDelay = 3000; // Увеличиваем делею при ошибке сети
            }

            if (isActive) {
                timeoutId = setTimeout(pollTikTok, nextPollDelay); // Рекурсивный поллинг 
            }
        };

        if (isTiktokConnected) {
            pollTikTok();
        }

        return () => {
            isActive = false; // Отрубаем поллинг при размонтировании
            if (timeoutId) clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTiktokConnected]);

    useEffect(() => {
        fetchVoice();
        // Загружаем список голосов с бэкенда при маунте
        fetch('http://localhost:8000/voices')
            .then(res => res.json())
            .then(data => {
                if (data.voices) setVoicesList(data.voices);
            })
            .catch(err => console.error("Voices fetch failed:", err));
    }, [fetchVoice]);

    const handleAskGrok = async (customPrompt?: string, customMessage?: IncomingMessage) => {
        if (usePlayerStore.getState().isPanicMode) return;
        // У нас может быть click event (React.MouseEvent), поэтому чекаем тип:
        const isString = typeof customPrompt === 'string';
        const promptToUse = isString ? customPrompt : inputValue;

        if (!promptToUse.trim() || isLoadingRef.current) return;

        // Если не передали кастомное сообщение (ручной ввод), создаем фейковое
        if (!customMessage) {
            setIncomingMessage({ username: "Streamer", text: promptToUse, type: 'chat' });
        } else {
            setIncomingMessage(customMessage);
        }

        // 1. Бросаем эвент "Думаю" (загорятся лампочки, польется пульс)
        setThinking(true);
        setIsLoading(true);

        try {
            let textReply = "";

            try {
                // -- Шаг 1. Генерим текст через xAI --
                const usernameToSend = customMessage ? customMessage.username : "Streamer";

                const grokRes = await fetch('/api/grok', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: promptToUse, username: usernameToSend }),
                });

                if (!grokRes.ok) {
                    console.error(`[MockTrigger] xAI Error: ${grokRes.status}`);
                    textReply = "I seem to have lost connection to the main frame. Please check your microphone.";
                } else {
                    const data = await grokRes.json();
                    textReply = data.reply || "Grok returned no content";
                    fetchHistory(); // Обновляем историю после ответа
                }
            } catch (grokErr) {
                console.error("[MockTrigger] Failed to reach xAI endpoint:", grokErr);
                textReply = "I seem to have lost connection to the main frame. Please check your microphone.";
            }

            // -- Шаг 2. Генерим аудио из текста через локальный Python TTS --
            let audioUrl: string | undefined = undefined;
            try {
                const ttsRes = await fetch("http://localhost:8000/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: textReply,
                        voice: selectedVoice,
                    }),
                });

                if (ttsRes.ok) {
                    const blob = await ttsRes.blob();
                    audioUrl = URL.createObjectURL(blob);
                } else {
                    console.warn(`TTS generation failed with status ${ttsRes.status}`);
                }
            } catch (err) {
                console.warn("TTS Service unavailable, falling back to text only.", err);
            }

            // -- Шаг 3. Кидаем ответ в плеер --
            triggerEvent({
                text: textReply,
                audioUrl, // Передаем сгенерированный blob: URL
            });

            // Очищаем инпут после успешного вопроса
            setInputValue('');

        } catch (error: unknown) {
            console.error("Full pipeline error:", error);
            triggerEvent({
                text: "Critical pipeline error. The system needs maintenance.",
                audioUrl: undefined,
            });
        } finally {
            setIsLoading(false);
            setThinking(false);
        }
    };

    // --- TIKTOK LIVE CONNECTION ---
    const toggleTiktokConnection = async () => {
        if (isTiktokConnected) {
            try {
                await fetch('/api/tiktok', { method: 'DELETE' });
                setIsTiktokConnected(false);
                console.log("[TikTok] Disconnected manually.");
            } catch (err) {
                console.error("[TikTok] Failed to disconnect", err);
            }
            return;
        }

        if (!tiktokUsername.trim()) return;

        try {
            const res = await fetch('/api/tiktok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: tiktokUsername })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                console.info(`[TikTok] Connected to room ${data.roomId}`);
                setIsTiktokConnected(true);
            } else {
                console.error('[TikTok] Connection Failed', data.error);
                alert("Не удалось подключиться к TikTok. Проверь юзернейм (стрим должен быть LIVE).");
            }
        } catch (error) {
            console.error("Failed to setup TikTok client:", error);
            alert("Ошибка сети при попытке подключиться к API.");
        }
    };

    return (
        <div className="absolute top-4 right-4 z-50 bg-zinc-900 border border-zinc-700 p-4 rounded-xl flex flex-col gap-3 w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'}`} />
                    Grok AI Trigger
                </h3>

                <button
                    onClick={() => setPanicMode(!isPanicMode)}
                    className={`px-2 py-1 flex items-center gap-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors border ${isPanicMode
                        ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                >
                    {isPanicMode ? 'PANIC: ON' : 'PANIC: OFF'}
                </button>
            </div>

            <select
                value={selectedVoice}
                onChange={(e) => updateVoice(e.target.value)}
                className="w-full bg-black text-green-400 p-1.5 rounded text-[10px] font-mono border border-zinc-800 outline-none focus:border-green-500 transition-colors cursor-pointer"
            >
                {voicesList.length === 0 && <option value={selectedVoice}>{selectedVoice.replace('.onnx', '')}</option>}
                {voicesList.map(v => (
                    <option key={v} value={v}>{v.replace('.onnx', '')}</option>
                ))}
            </select>

            <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAskGrok(inputValue);
                    }
                }}
                disabled={isLoading}
                className="w-full bg-black text-green-400 p-2 rounded text-xs font-mono border border-zinc-800 resize-none h-20 outline-none focus:border-green-500 transition-colors disabled:opacity-50"
                placeholder="Спроси что-нибудь..."
            />

            <div className="flex gap-2">
                <button
                    onClick={() => handleAskGrok(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-[10px] font-bold py-2 rounded uppercase tracking-wider transition-colors active:scale-95"
                >
                    {isLoading ? 'Thinking...' : 'Ask Grok'}
                </button>
                <button
                    onClick={async () => {
                        if (!inputValue.trim()) return;

                        try {
                            const ttsRes = await fetch("http://localhost:8000/tts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    text: inputValue,
                                    voice: selectedVoice,
                                }),
                            });

                            if (ttsRes.ok) {
                                const blob = await ttsRes.blob();
                                const audioUrl = URL.createObjectURL(blob);
                                const audio = new Audio(audioUrl);
                                audio.onended = () => URL.revokeObjectURL(audioUrl); // Fix Memory Leak
                                await audio.play();
                            } else {
                                alert(`TTS failed: ${ttsRes.status}`);
                            }
                        } catch (err: unknown) {
                            alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
                        }
                    }}
                    disabled={!inputValue.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-[10px] font-bold py-2 rounded uppercase tracking-wider transition-colors active:scale-95"
                >
                    Test TTS
                </button>
            </div>

            {/* --- GROK BRAIN HISTORY --- */}
            <div className="border border-zinc-700 bg-black/40 rounded flex flex-col mt-2">
                <div
                    className="flex justify-between items-center bg-zinc-800/80 p-2 cursor-pointer select-none hover:bg-zinc-700 transition"
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                >
                    <span className="text-[10px] uppercase font-bold text-zinc-300 flex items-center gap-1">
                        {isHistoryOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        Brain Memory ({chatHistory.length})
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                        className="text-zinc-500 hover:text-red-500 transition-colors p-1"
                        title="Clear Memory (Wipe System)"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>

                {isHistoryOpen && (
                    <div className="p-2 flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 h-[150px]">
                        {chatHistory.length === 0 ? (
                            <span className="text-xs text-zinc-600 italic text-center py-2">Blank slate. No memory.</span>
                        ) : (
                            chatHistory.map((msg, i) => (
                                <div key={i} className={`text-[10px] leading-tight flex flex-col p-1.5 rounded ${msg.role === 'user' ? 'bg-blue-900/30' : 'bg-green-900/20'}`}>
                                    <span className={`font-bold uppercase ${msg.role === 'user' ? 'text-blue-400' : 'text-green-500'}`}>
                                        {msg.role}:
                                    </span>
                                    <span className="text-zinc-300 font-mono mt-0.5">{msg.content}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* --- TikTok Live Integration --- */}
            <div className="border-t border-zinc-700 pt-3 mt-1 flex flex-col gap-2">
                <h4 className="text-[10px] uppercase font-bold text-[#00ffcc] flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isTiktokConnected ? 'bg-[#00ffcc] animate-pulse shadow-[0_0_8px_#00ffcc]' : 'bg-red-500'}`} />
                    TikTok Live Module
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={tiktokUsername}
                        onChange={(e) => setTiktokUsername(e.target.value)}
                        disabled={isTiktokConnected}
                        placeholder="@username"
                        className="flex-1 bg-black text-xs p-1.5 rounded border border-zinc-800 text-white outline-none focus:border-[#00ffcc] transition-colors disabled:opacity-50"
                    />
                    <button
                        onClick={toggleTiktokConnection}
                        className={`text-[10px] font-bold px-3 rounded uppercase tracking-wider transition-colors ${isTiktokConnected
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-[#00ffcc] hover:bg-[#00ffaa] text-black'
                            }`}
                    >
                        {isTiktokConnected ? 'DISCONNECT' : 'CONNECT'}
                    </button>
                </div>
            </div>

            <p className="text-[10px] text-zinc-500 text-center leading-tight mt-1">
                Отправляет POST /api/grok → ждет xAI → triggerEvent()
            </p>
        </div >
    );
}
