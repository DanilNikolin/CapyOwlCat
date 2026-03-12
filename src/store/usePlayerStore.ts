import { create } from 'zustand';

// Стейты нашего плеера (Стейт-машина)
export type PlayerState = 'idle' | 'idle_anim' | 'trans_in' | 'talk' | 'trans_out' | 'gift_anim' | 'panic' | 'emotion_anim';

interface StreamEvent {
  text: string;           // Готовый текст ответа
  audioUrl?: string;      // URL аудио для озвучки
  emotionTarget?: string; // Например "angry" (если найдено в тексте)
}

export interface IncomingMessage {
  username: string;
  text: string;
  type: 'chat' | 'gift';
  giftName?: string;
}

export interface ColorSettings {
  temperature: number; // -100 to 100
  tint: number;        // -100 to 100 (green/magenta)
  hue: number;         // -180 to 180 (degrees)
  saturate: number;
  brightness: number;
  contrast: number;
}

export interface AnimationGroup {
  id: string;
  triggerTime: number;
  transIn: string;
  transInMuted?: boolean;
  talk: string;
  talkMuted?: boolean;
  transOut: string;
  transOutMuted?: boolean;
}

export interface IdleAnimation {
  id: string;
  triggerTime: number; // время на основном idle.webm
  video: string;       // сам asset например sit_down.webm
  chance: number;      // 0-100%
  isMuted?: boolean;   // Mute video audio
}

export interface GiftAnimation {
  id: string;
  triggerTime: number; // Секунда перехвата в айдле (для обычных)
  video: string;       // Сама webm-ка
  targetTier: string;  // 'low', 'mid', 'high'
  minCombo: number;    // 1, 5, 10 и т.д.
  isPriority: boolean; // ОГОНЬ-ФЛАГ (мгновенный триггер)
  isMuted?: boolean;   // Mute video audio
}

export interface QueuedGift {
  id: string;
  tier: string;
  count: number;
  username?: string;
  giftName?: string;
}

export interface EmotionAnimation {
  id: string;
  triggerTime: number; // Время перехвата в айдле
  video: string;       // Сама webm-ка
  isMuted?: boolean;   // Mute video audio
}

export interface EmotionGroup {
  id: string;
  triggerName: string; // Идентификатор для триггера (напр. "angry")
  promptDesc: string;  // Описание для LLM (напр. "Используй, когда юзер пишет тупость")
  animations: EmotionAnimation[];
}

export interface MonitorConfig {
  width: number;
  height: number;
  borderRadius: number;
  tlX: number; tlY: number; // top-left
  trX: number; trY: number; // top-right
  brX: number; brY: number; // bottom-right
  blX: number; blY: number; // bottom-left
}

interface PlayerStore {
  // Текущее состояние кота
  currentState: PlayerState;

  // Группы анимаций
  groups: AnimationGroup[];
  fetchGroups: () => Promise<void>;
  updateGroups: (groups: AnimationGroup[]) => Promise<void>;
  addGroup: () => void;
  removeGroup: (id: string) => void;
  updateGroupField: <K extends keyof AnimationGroup>(id: string, field: K, value: AnimationGroup[K]) => void;

  // Idle Animations
  idleAnimations: IdleAnimation[];
  fetchIdleAnimations: () => Promise<void>;
  updateIdleAnimations: (anims: IdleAnimation[]) => Promise<void>;
  addIdleAnimation: () => void;
  removeIdleAnimation: (id: string) => void;
  updateIdleAnimationField: <K extends keyof IdleAnimation>(id: string, field: K, value: IdleAnimation[K]) => void;

  // Gift Animations
  giftAnimations: GiftAnimation[];
  fetchGiftAnimations: () => Promise<void>;
  updateGiftAnimations: (anims: GiftAnimation[]) => Promise<void>;
  addGiftAnimation: () => void;
  removeGiftAnimation: (id: string) => void;
  updateGiftAnimationField: <K extends keyof GiftAnimation>(id: string, field: K, value: GiftAnimation[K]) => void;

  giftQueue: QueuedGift[];
  enqueueGift: (tier: string, username?: string, giftName?: string) => void;
  consumeGiftQueueItem: (id: string, count: number) => void;
  
  activeGiftItem: QueuedGift | null;
  setActiveGiftItem: (item: QueuedGift | null) => void;

  // Emotion Animations
  emotionGroups: EmotionGroup[];
  fetchEmotionGroups: () => Promise<void>;
  updateEmotionGroups: (groups: EmotionGroup[]) => Promise<void>;
  addEmotionGroup: () => void;
  removeEmotionGroup: (id: string) => void;
  updateEmotionGroupField: <K extends keyof EmotionGroup>(id: string, field: K, value: EmotionGroup[K]) => void;
  addEmotionAnimation: (groupId: string) => void;
  removeEmotionAnimation: (groupId: string, animId: string) => void;
  updateEmotionAnimationField: <K extends keyof EmotionAnimation>(groupId: string, animId: string, field: K, value: EmotionAnimation[K]) => void;

  // Настройки голоса TTS
  selectedVoice: string;
  fetchVoice: () => Promise<void>;
  updateVoice: (voice: string) => Promise<void>;

  // BGM
  bgmFile: string;
  bgmVolume: number;
  fetchBgmSettings: () => Promise<void>;
  updateBgmSettings: (file: string, vol: number) => Promise<void>;

  // Цветокоррекция для каждого слота (например, { "talk": { hue: ... } })
  layerColors: Record<string, ColorSettings>;
  fetchLayerColors: () => Promise<void>;
  updateLayerColor: (slotId: string, settings: Partial<ColorSettings>) => Promise<void>;

  // Конфигурация 3D-монитора
  monitorConfig: MonitorConfig;
  fetchMonitorConfig: () => Promise<void>;
  updateMonitorConfig: (config: Partial<MonitorConfig>) => Promise<void>;

  // Флаг, когда бэк думает над ответом (мигают индикаторы)
  isThinking: boolean;

  // Флаг аварийного режима (Никаких генераций и LLM)
  isPanicMode: boolean;
  setPanicMode: (panic: boolean) => void;

  // Очередь или текущий ответ бэкенда для воспроизведения
  currentEvent: StreamEvent | null;

  // Текущее сообщение из чата, на которое зверёк отвечает
  incomingMessage: IncomingMessage | null;
  setIncomingMessage: (msg: IncomingMessage | null) => void;

  // Экшены для переключения стейта плеером
  setState: (state: PlayerState) => void;

  // Экшены для бэкенда (дергаются, когда прилетает эвент)
  setThinking: (thinking: boolean) => void;
  triggerEvent: (event: StreamEvent) => void;
  clearEmotionTarget: () => void;

  // Сброс эвента после завершения болтовни
  clearEvent: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentState: 'idle',
  isThinking: false,
  isPanicMode: false,
  currentEvent: null,
  incomingMessage: null,
  activeGiftItem: null,

  groups: [],
  idleAnimations: [],
  giftAnimations: [],
  giftQueue: [],
  emotionGroups: [],
  selectedVoice: 'en_US-lessac-medium.onnx',
  bgmFile: '',
  bgmVolume: 0.2,
  layerColors: {},
  monitorConfig: {
    width: 640, height: 480,
    borderRadius: 12,
    tlX: 0, tlY: 0,
    trX: 640, trY: 0,
    brX: 640, brY: 480,
    blX: 0, blY: 480
  },

  fetchGroups: async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        set({ groups: data });
      }
    } catch (e) {
      console.error("Failed to fetch groups", e);
    }
  },

  updateGroups: async (groups: AnimationGroup[]) => {
    set({ groups });
    try {
      await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groups)
      });
    } catch (e) {
      console.error("Failed to save groups", e);
    }
  },

  addGroup: () => {
    const currentGroups = get().groups;
    const newId = `group_${Date.now()}`;
    const newGroups = [
      ...currentGroups,
      {
        id: newId,
        triggerTime: 5.0,
        transIn: `${newId}_trans_in.webm`,
        transInMuted: true,
        talk: `${newId}_talk.webm`,
        talkMuted: true,
        transOut: `${newId}_trans_out.webm`,
        transOutMuted: true,
      }
    ];
    get().updateGroups(newGroups);
  },

  removeGroup: (id: string) => {
    const currentGroups = get().groups;
    const newGroups = currentGroups.filter(g => g.id !== id);
    get().updateGroups(newGroups);
  },

  updateGroupField: (id, field, value) => {
    const currentGroups = get().groups;
    const newGroups = currentGroups.map(g =>
      g.id === id ? { ...g, [field]: value } : g
    );
    get().updateGroups(newGroups);
  },

  fetchIdleAnimations: async () => {
    try {
      const res = await fetch('/api/idle-animations');
      if (res.ok) {
        const data = await res.json();
        set({ idleAnimations: data || [] });
      }
    } catch (e) {
      console.error("Failed to fetch idle animations", e);
    }
  },

  updateIdleAnimations: async (anims: IdleAnimation[]) => {
    set({ idleAnimations: anims });
    try {
      await fetch('/api/idle-animations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anims)
      });
    } catch (e) {
      console.error("Failed to save idle animations", e);
    }
  },

  addIdleAnimation: () => {
    const current = get().idleAnimations;
    const newId = `idlanim_${Date.now()}`;
    const newAnims = [
      ...current,
      {
        id: newId,
        triggerTime: 5.0,
        video: `${newId}.webm`,
        chance: 30, // 30% default chance
        isMuted: true,
      }
    ];
    get().updateIdleAnimations(newAnims);
  },

  removeIdleAnimation: (id: string) => {
    const current = get().idleAnimations;
    const newAnims = current.filter(a => a.id !== id);
    get().updateIdleAnimations(newAnims);
  },

  updateIdleAnimationField: (id, field, value) => {
    const current = get().idleAnimations;
    const newAnims = current.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    );
    get().updateIdleAnimations(newAnims);
  },

  fetchGiftAnimations: async () => {
    try {
      const res = await fetch('/api/gifts-animations');
      if (res.ok) {
        const data = await res.json();
        set({ giftAnimations: data || [] });
      }
    } catch (e) {
      console.error("Failed to fetch gift animations", e);
    }
  },

  updateGiftAnimations: async (anims: GiftAnimation[]) => {
    set({ giftAnimations: anims });
    try {
      await fetch('/api/gifts-animations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anims)
      });
    } catch (e) {
      console.error("Failed to save gift animations", e);
    }
  },

  addGiftAnimation: () => {
    const current = get().giftAnimations;
    const newId = `giftanim_${Date.now()}`;
    const newAnims = [
      ...current,
      {
        id: newId,
        triggerTime: 2.0,
        video: `${newId}.webm`,
        targetTier: 'low',
        minCombo: 1,
        isPriority: false,
        isMuted: true,
      }
    ];
    get().updateGiftAnimations(newAnims);
  },

  removeGiftAnimation: (id: string) => {
    const current = get().giftAnimations;
    const newAnims = current.filter(a => a.id !== id);
    get().updateGiftAnimations(newAnims);
  },

  updateGiftAnimationField: (id, field, value) => {
    const current = get().giftAnimations;
    const newAnims = current.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    );
    get().updateGiftAnimations(newAnims);
  },

  enqueueGift: (tier: string, username?: string, giftName?: string) => {
    const queue = get().giftQueue;
    const last = queue[queue.length - 1];
    if (last && last.tier === tier && last.username === username && last.giftName === giftName) {
      const clonedLast = { ...last, count: last.count + 1 };
      set({ giftQueue: [...queue.slice(0, -1), clonedLast] });
    } else {
      set({ giftQueue: [...queue, { id: `gq_${Date.now()}_${Math.random()}`, tier, count: 1, username, giftName }] });
    }
  },

  consumeGiftQueueItem: (id: string, count: number) => {
    const queue = get().giftQueue;
    const itemIndex = queue.findIndex(q => q.id === id);
    if (itemIndex > -1) {
      const clonedItem = { ...queue[itemIndex], count: Math.max(0, queue[itemIndex].count - count) };
      if (clonedItem.count <= 0) {
        set({ giftQueue: [...queue.slice(0, itemIndex), ...queue.slice(itemIndex + 1)] });
      } else {
        set({ giftQueue: [...queue.slice(0, itemIndex), clonedItem, ...queue.slice(itemIndex + 1)] });
      }
    }
  },

  fetchEmotionGroups: async () => {
    try {
      const res = await fetch('/api/emotion-animations');
      if (res.ok) {
        const data = await res.json();
        set({ emotionGroups: data || [] });
      }
    } catch (e) {
      console.error("Failed to fetch emotion groups", e);
    }
  },

  updateEmotionGroups: async (groups: EmotionGroup[]) => {
    set({ emotionGroups: groups });
    try {
      await fetch('/api/emotion-animations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groups)
      });
    } catch (e) {
      console.error("Failed to save emotion groups", e);
    }
  },

  addEmotionGroup: () => {
    const current = get().emotionGroups;
    const newId = `emotion_${Date.now()}`;
    const newGroups = [
      ...current,
      {
        id: newId,
        triggerName: 'angry',
        promptDesc: 'Опиши причину использования (для LLM)',
        animations: []
      }
    ];
    get().updateEmotionGroups(newGroups);
  },

  removeEmotionGroup: (id: string) => {
    const current = get().emotionGroups;
    const newGroups = current.filter(g => g.id !== id);
    get().updateEmotionGroups(newGroups);
  },

  updateEmotionGroupField: (id, field, value) => {
    const current = get().emotionGroups;
    const newGroups = current.map(g =>
      g.id === id ? { ...g, [field]: value } : g
    );
    get().updateEmotionGroups(newGroups);
  },

  addEmotionAnimation: (groupId: string) => {
    const current = get().emotionGroups;
    const newGroups = current.map(g => {
      if (g.id === groupId) {
        const newAnimId = `emanim_${Date.now()}`;
        return {
          ...g,
          animations: [
            ...g.animations,
            {
              id: newAnimId,
              triggerTime: 2.0,
              video: `${newAnimId}.webm`,
              isMuted: true,
            }
          ]
        };
      }
      return g;
    });
    get().updateEmotionGroups(newGroups);
  },

  removeEmotionAnimation: (groupId: string, animId: string) => {
    const current = get().emotionGroups;
    const newGroups = current.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          animations: g.animations.filter(a => a.id !== animId)
        };
      }
      return g;
    });
    get().updateEmotionGroups(newGroups);
  },

  updateEmotionAnimationField: (groupId: string, animId: string, field, value) => {
    const current = get().emotionGroups;
    const newGroups = current.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          animations: g.animations.map(a =>
            a.id === animId ? { ...a, [field]: value } : a
          )
        };
      }
      return g;
    });
    get().updateEmotionGroups(newGroups);
  },

  fetchVoice: async () => {
    try {
      const res = await fetch('/api/voice-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.voice) set({ selectedVoice: data.voice });
      }
    } catch (e) {
      console.error("Failed to fetch voice settings", e);
    }
  },

  updateVoice: async (voice: string) => {
    set({ selectedVoice: voice });
    try {
      await fetch('/api/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice })
      });
    } catch (e) {
      console.error("Failed to save voice setting", e);
    }
  },

  fetchBgmSettings: async () => {
    try {
      const res = await fetch('/api/bgm-settings');
      if (res.ok) {
        const data = await res.json();
        set({ bgmFile: data.bgmFile || '', bgmVolume: data.bgmVolume ?? 0.2 });
      }
    } catch (e) {
      console.error("Failed to fetch bgm settings", e);
    }
  },

  updateBgmSettings: async (file: string, vol: number) => {
    set({ bgmFile: file, bgmVolume: vol });
    try {
      await fetch('/api/bgm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bgmFile: file, bgmVolume: vol })
      });
    } catch (e) {
      console.error("Failed to save bgm settings", e);
    }
  },

  fetchLayerColors: async () => {
    try {
      const res = await fetch('/api/color-settings');
      if (res.ok) {
        const data = await res.json();
        set({ layerColors: data });
      }
    } catch (e) {
      console.error("Failed to fetch layer colors", e);
    }
  },

  fetchMonitorConfig: async () => {
    try {
      const res = await fetch('/api/monitor-settings');
      if (res.ok) {
        const data = await res.json();
        // Fallback for old configs
        if ('rotateX' in data && !('tlX' in data)) {
          console.warn("Found old monitor config, keeping defaults");
        } else {
          // Add default border radius if missing
          if (data.borderRadius === undefined) data.borderRadius = 12;
          set({ monitorConfig: data });
        }
      }
    } catch (e) {
      console.error("Failed to fetch monitor config", e);
    }
  },

  updateMonitorConfig: async (config: Partial<MonitorConfig>) => {
    const current = get().monitorConfig;
    const nextConfig = { ...current, ...config };
    set({ monitorConfig: nextConfig });

    // Save to backend with simple debounce
    if (typeof window !== 'undefined') {
      const w = window as unknown as { monitorSaveTimeout?: ReturnType<typeof setTimeout> };
      if (w.monitorSaveTimeout) clearTimeout(w.monitorSaveTimeout);
      w.monitorSaveTimeout = setTimeout(async () => {
        try {
          await fetch('/api/monitor-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextConfig)
          });
        } catch (e) {
          console.error("Failed to save monitor config", e);
        }
      }, 500);
    }
  },

  updateLayerColor: async (slotId: string, settings: Partial<ColorSettings>) => {
    const currentMap = get().layerColors;
    const existing = currentMap[slotId] || { temperature: 0, tint: 0, hue: 0, saturate: 1, brightness: 1, contrast: 1 };
    const newSettings = { ...existing, ...settings };

    set({
      layerColors: {
        ...currentMap,
        [slotId]: newSettings
      }
    });

    if (typeof window !== 'undefined') {
      const w = window as unknown as { colorSaveTimeout?: ReturnType<typeof setTimeout> };
      if (w.colorSaveTimeout) clearTimeout(w.colorSaveTimeout);

      w.colorSaveTimeout = setTimeout(async () => {
        try {
          // get fresh map after all sync updates
          const mergedMap = get().layerColors;
          // Format it as bulk array for the new API
          const payload = Object.entries(mergedMap).map(([id, s]) => ({ slotId: id, settings: s }));

          await fetch('/api/color-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.error(`Failed to save color settings`, e);
        }
      }, 500);
    }
  },

  setState: (state) => set({ currentState: state }),
  setActiveGiftItem: (item) => set({ activeGiftItem: item }),
  setThinking: (thinking) => set({ isThinking: thinking }),
  setPanicMode: (panic) => {
    set({ isPanicMode: panic });
    // Если мы включили панику - сразу обрубаем стейт в panic
    if (panic) {
      set({ currentState: 'panic', currentEvent: null, isThinking: false, giftQueue: [] });
    } else {
      set({ currentState: 'idle' });
    }
  },
  triggerEvent: (event) => {
    if (get().isPanicMode) return;
    set({ isThinking: false, currentEvent: event });
  },
  clearEmotionTarget: () => {
    const { currentEvent } = get();
    if (currentEvent) {
      set({ currentEvent: { ...currentEvent, emotionTarget: undefined } });
    }
  },
  setIncomingMessage: (msg) => set({ incomingMessage: msg }),
  clearEvent: () => set({ currentEvent: null, incomingMessage: null })
}));
