import { create } from 'zustand';

// Стейты нашего плеера (Стейт-машина)
export type PlayerState = 'idle' | 'idle_anim' | 'trans_in' | 'talk' | 'trans_out';

interface StreamEvent {
  text: string;           // Готовый текст ответа
  audioUrl?: string;      // URL аудио для озвучки
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
  talk: string;
  transOut: string;
}

export interface IdleAnimation {
  id: string;
  triggerTime: number; // время на основном idle.webm
  video: string;       // сам asset например sit_down.webm
  chance: number;      // 0-100%
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

  // Настройки голоса TTS
  selectedVoice: string;
  fetchVoice: () => Promise<void>;
  updateVoice: (voice: string) => Promise<void>;

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

  // Сброс эвента после завершения болтовни
  clearEvent: () => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentState: 'idle',
  isThinking: false,
  currentEvent: null,
  incomingMessage: null,

  groups: [],
  idleAnimations: [],
  selectedVoice: 'en_US-lessac-medium.onnx',
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
        talk: `${newId}_talk.webm`,
        transOut: `${newId}_trans_out.webm`,
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
  setThinking: (thinking) => set({ isThinking: thinking }),
  triggerEvent: (event) => set({ isThinking: false, currentEvent: event }),
  setIncomingMessage: (msg) => set({ incomingMessage: msg }),
  clearEvent: () => set({ currentEvent: null, incomingMessage: null })
}));
