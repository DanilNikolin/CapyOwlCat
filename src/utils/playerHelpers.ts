import { GiftAnimation, EmotionAnimation, AnimationGroup, IdleAnimation, QueuedGift } from '@/store/usePlayerStore';

/**
 * Pure helper to check if a target time has been crossed in the timeline.
 */
export const checkTimelineCrossed = (prevTime: number, currentTime: number, targetTime: number, isLooped: boolean) => {
    if (isLooped) return prevTime <= targetTime || currentTime >= targetTime;
    return prevTime <= targetTime && currentTime >= targetTime;
};

/**
 * Logic for picking the right gift video based on combo and priority.
 */
export const findBestGiftAnimation = (
    targetGift: QueuedGift,
    giftAnimations: GiftAnimation[],
    currentTime: number,
    duration: number
): GiftAnimation | null => {
    if (giftAnimations.length === 0) return null;

    const matches = giftAnimations.filter((a: GiftAnimation) =>
        a.targetTier === targetGift.tier && a.minCombo <= targetGift.count
    );

    if (matches.length === 0) return null;

    // Sort by highest combo first
    matches.sort((a: GiftAnimation, b: GiftAnimation) => b.minCombo - a.minCombo);
    const highestCombo = matches[0].minCombo;
    const bestOptions = matches.filter((a: GiftAnimation) => a.minCombo === highestCombo);

    let bestAnim: GiftAnimation | null = null;
    let minDiff = Infinity;

    for (const anim of bestOptions) {
        if (anim.isPriority) {
            return anim;
        }
        let diff = anim.triggerTime - currentTime;
        if (diff < -0.3) diff += duration || 10;
        if (diff < minDiff) {
            minDiff = diff;
            bestAnim = anim;
        }
    }

    return bestAnim;
};

/**
 * Generic helper for picking the nearest emotion animation.
 */
export const findClosestEmotionAnimation = (
    animations: EmotionAnimation[],
    currentTime: number,
    duration: number
): EmotionAnimation | null => {
    if (animations.length === 0) return null;

    let closestAnim = animations[0];
    let minDiff = Infinity;

    for (const anim of animations) {
        let diff = anim.triggerTime - currentTime;
        if (diff < 0) diff += duration;
        if (diff < minDiff) {
            minDiff = diff;
            closestAnim = anim;
        }
    }

    return closestAnim;
};

/**
 * Logic for picking the next conversation group.
 */
export const findClosestConversationGroup = (
    groups: AnimationGroup[],
    currentTime: number,
    duration: number
): AnimationGroup | null => {
    if (groups.length === 0) return null;

    let bestGroup = groups[0];
    let minWait = Infinity;

    for (const g of groups) {
        let waitTime = g.triggerTime - currentTime;
        if (waitTime < 0) waitTime += duration;
        if (waitTime < minWait) {
            minWait = waitTime;
            bestGroup = g;
        }
    }

    return bestGroup;
};

/**
 * Logic for rolling chance and picking the next idle breakdown.
 */
export const selectIdleBreakdown = (
    idleAnimations: IdleAnimation[],
    currentTime: number,
    lastTriggerTime: number,
    randomValue: number = Math.random() * 100
): { animation: IdleAnimation | null, attemptedTriggerTime: number | null } => {
    for (const anim of idleAnimations) {
        if (currentTime < anim.triggerTime && anim.triggerTime - currentTime < 3) {
            if (Math.abs(lastTriggerTime - anim.triggerTime) > 0.5) {
                if (randomValue <= anim.chance) {
                    return { animation: anim, attemptedTriggerTime: anim.triggerTime };
                }
                // Even if roll fails, we mark this trigger as attempted
                return { animation: null, attemptedTriggerTime: anim.triggerTime };
            }
        }
    }
    return { animation: null, attemptedTriggerTime: null };
};
