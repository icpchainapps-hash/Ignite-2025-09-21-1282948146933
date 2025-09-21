// frontend/src/hooks/useSubscriptions.ts
// Centralized subscription/feature-gating hooks.
// No self-imports or shims—this file implements everything directly.

import { useQuery, useMutation } from '@tanstack/react-query';
import { useActor } from './useActor';

/* -------------------- Types -------------------- */

export type FeatureScope = 'user' | 'club' | 'team';

export interface FeatureAccess {
  hasAccess: boolean;
  plan?: 'Free' | 'Plus' | 'Pro';
  reason?: string;
}

// Minimal type for checkout items; inline to avoid ../backend import
export type ShoppingItem = { priceId: string; quantity: number };

/* -------------------- Feature Access -------------------- */

/**
 * Feature gate hook.
 * TODO: replace the queryFn body with a real backend check when available.
 */
export function useCanAccessFeature(
  feature: string,
  scope: FeatureScope = 'user',
  scopeId?: string
) {
  return useQuery<FeatureAccess>({
    queryKey: ['feature-access', feature, scope, scopeId],
    queryFn: async () => {
      // Allow-list any always-free features here if you have them.
      const freeAllowed = new Set<string>([
        // e.g., 'basic_chat'
      ]);

      if (freeAllowed.has(feature)) {
        return { hasAccess: true, plan: 'Free' };
      }

      // Default: gated until wired to backend/subscription state
      return { hasAccess: false, plan: 'Free', reason: 'stubbed' };
    },
    staleTime: 60_000,
  });
}

// Friendly aliases used around the app
export const useFeatureAccess = useCanAccessFeature;
export const useCanAccessProFeatures = () => useCanAccessFeature('pro_features', 'user');
export const useCanAccessAdvancedChat = (scope: FeatureScope = 'club', scopeId?: string) =>
  useCanAccessFeature('advanced_chat', scope, scopeId);
export const useCanAccessSocialFeed = (scope: FeatureScope = 'club', scopeId?: string) =>
  useCanAccessFeature('social_feed', scope, scopeId);
export const useCanCreateUnlimitedAnnouncements = (
  scope: FeatureScope = 'club',
  scopeId?: string
) => useCanAccessFeature('unlimited_announcements', scope, scopeId);

/* -------------------- Subscription Status (stubs) -------------------- */

export function useGetSubscriptionStatus() {
  return useQuery<{ plan: 'Free' | 'Plus' | 'Pro'; status: 'active' | 'canceled' | 'none' }>({
    queryKey: ['subscription-status'],
    queryFn: async () => ({ plan: 'Free', status: 'none' }),
    staleTime: 60_000,
  });
}

export function useHasProAccess() {
  return useQuery<boolean>({
    queryKey: ['has-pro-access'],
    queryFn: async () => false,
    staleTime: 60_000,
  });
}

export function useGetAllSubscriptions() {
  return useQuery<Array<{ id: string; plan: 'Free' | 'Plus' | 'Pro'; status: string }>>({
    queryKey: ['all-subscriptions'],
    queryFn: async () => [],
    staleTime: 60_000,
  });
}

export function useUpgradeToProPlan() {
  return useMutation({
    mutationFn: async (_opts?: { paymentMethodId?: string }) => ({ success: false }),
  });
}

export function useCancelProSubscription() {
  return useMutation({
    mutationFn: async () => ({ success: false }),
  });
}

/* -------------------- Stripe Checkout -------------------- */

export interface CheckoutSession {
  id: string;
  url: string;
}

/** Create a Stripe Checkout session via the backend actor */
export function useCreateCheckoutSession() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (items: ShoppingItem[]): Promise<CheckoutSession> => {
      if (!actor) throw new Error('Actor not available');

      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-failure`;

      const result = await actor.createCheckoutSession(items, successUrl, cancelUrl);
      return JSON.parse(result) as CheckoutSession;
    },
  });
}

/* -------------------- Default export -------------------- */
export default useCanAccessFeature;