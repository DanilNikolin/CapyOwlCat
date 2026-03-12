import React from 'react';
import { ColorSettings, IdleAnimation, GiftAnimation } from '@/store/usePlayerStore';

interface PlayerColorFiltersProps {
    layerColors: Record<string, ColorSettings>;
    idleAnimations: IdleAnimation[];
    giftAnimations: GiftAnimation[];
}

const PlayerColorFilters: React.FC<PlayerColorFiltersProps> = ({ 
    layerColors, 
    idleAnimations, 
    giftAnimations 
}) => {
    // Собираем все ID слотов и анимаций, для которых нужны фильтры
    const allSlotIds = Array.from(new Set([
        'idle', 'transIn', 'talk', 'transOut',
        ...Object.keys(layerColors),
        ...idleAnimations.map(a => a.id),
        ...giftAnimations.map(a => a.id)
    ]));

    return (
        <svg className="hidden">
            <defs>
                {allSlotIds.map((slotId) => {
                    const defaultColors = { 
                        temperature: 0, 
                        tint: 0, 
                        hue: 0, 
                        saturate: 1, 
                        brightness: 1, 
                        contrast: 1 
                    };
                    const s = { ...defaultColors, ...(layerColors[slotId] || {}) };
                    
                    const v = s.temperature / 100;
                    const tintVal = s.tint / 100;
                    const rScale = 1 + (v * 0.3) - (tintVal * 0.15);
                    const gScale = 1 + (v * 0.1) + (tintVal * 0.3);
                    const bScale = 1 - (v * 0.3) - (tintVal * 0.15);
                    
                    return (
                        <filter id={`temp-${slotId}`} key={slotId}>
                            <feColorMatrix
                                type="matrix"
                                values={`
                                    ${rScale} 0 0 0 0
                                    0 ${gScale} 0 0 0
                                    0 0 ${bScale} 0 0
                                    0 0 0 1 0
                                `}
                            />
                        </filter>
                    );
                })}
            </defs>
        </svg>
    );
};

export default PlayerColorFilters;
