import { writable, derived } from 'svelte/store';
import { type SubscriptionTier, TIER_CONFIG } from '$lib/types/tier';

const STORAGE_KEY = 'menuapp_subscription_tier';

function createTierStore() {
  // Default to MINI as requested by user to prioritize the MenuMini backbone
  let initialTier: SubscriptionTier = 'MINI';

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY) as SubscriptionTier;
    if (saved === 'MINI' || saved === 'PRO') {
      initialTier = saved;
    }
  }

  const { subscribe, set, update } = writable<SubscriptionTier>(initialTier);

  return {
    subscribe,
    setTier: (tier: SubscriptionTier) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, tier);
      }
      set(tier);
    },
    toggleTier: () => {
      update(current => {
        const next: SubscriptionTier = current === 'MINI' ? 'PRO' : 'MINI';
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, next);
        }
        return next;
      });
    }
  };
}

export const activeTier = createTierStore();

export const activeFeatures = derived(activeTier, $tier => TIER_CONFIG[$tier]);
export const isMiniTier = derived(activeTier, $tier => $tier === 'MINI');
export const isProTier = derived(activeTier, $tier => $tier === 'PRO');
