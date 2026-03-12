import { useEffect, useRef } from 'react';

interface UsePlayerBgmProps {
    bgmFile: string | null;
    bgmVolume: number;
    fetchBgmSettings: () => void;
}

/**
 * Хук для управления жизненным циклом фоновой музыки (BGM).
 * Отвечает за:
 * 1. Первоначальную загрузку настроек.
 * 2. Синхронизацию громкости.
 * 3. Обработку политик Autoplay (повторные попытки при взаимодействии).
 */
export function usePlayerBgm({ bgmFile, bgmVolume, fetchBgmSettings }: UsePlayerBgmProps) {
    const bgmRef = useRef<HTMLAudioElement>(null);

    // 1. Initial fetch при монтировании
    useEffect(() => {
        fetchBgmSettings();
    }, [fetchBgmSettings]);

    // 2. Синхронизация громкости
    useEffect(() => {
        if (bgmRef.current) {
            bgmRef.current.volume = bgmVolume;
        }
    }, [bgmVolume, bgmFile]);

    // 3. Обработка политик автоплея браузера
    useEffect(() => {
        const tryPlayBgm = () => {
            if (bgmRef.current && bgmRef.current.paused && bgmFile) {
                bgmRef.current.play().catch(e => console.warn("[BGM] AutoPlay prevented:", e));
            }
        };

        // Пытаемся проиграть сразу (вдруг браузер разрешит без клика)
        tryPlayBgm();

        // Если не разрешил - ждем любого клика/нажатия клавиши по окну
        window.addEventListener('click', tryPlayBgm);
        window.addEventListener('keydown', tryPlayBgm);

        return () => {
            window.removeEventListener('click', tryPlayBgm);
            window.removeEventListener('keydown', tryPlayBgm);
        };
    }, [bgmFile]);

    return bgmRef;
}
