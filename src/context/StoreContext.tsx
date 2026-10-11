import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Shop, Language } from '../types';
import { INITIAL_SHOPS } from '../data/mockStores';
import { getSubscriptionStatus } from '../services/mpesaService';

interface StoreContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  shops: Shop[];
  currentShop: Shop;
  setCurrentShopId: (id: string) => void;
  updateShop: (updatedShop: Shop) => void;
  refreshSubscriptionStatus: () => Promise<void>;
  subscriptionDaysRemaining: number;
  showSubscriptionPlan: boolean;
  setShopSubscriptionDays: (days: number) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SHOPS: 'odrystudio_accounts_v2',
  CURRENT_SHOP_ID: 'odrystudio_active_account_id_v2',
  LANG: 'odrystudio_lang_v2',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LANG);
      return saved === 'en' || saved === 'sw' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const [shops, setShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHOPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SHOPS;
  });

  const [currentShopId, setCurrentShopId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID) || INITIAL_SHOPS[0].id;
    } catch {
      return INITIAL_SHOPS[0].id;
    }
  });

  const [subscriptionDaysRemaining, setSubscriptionDaysRemaining] = useState<number>(3);
  const [showSubscriptionPlan, setShowSubscriptionPlan] = useState<boolean>(false);

  const currentShop = shops.find((s) => s.id === currentShopId) || shops[0] || INITIAL_SHOPS[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
    } catch {
      // ignore
    }
  }, [shops]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, currentShopId);
    } catch {
      // ignore
    }
  }, [currentShopId]);

  const updateShop = useCallback((updatedShop: Shop) => {
    setShops((prev) => prev.map((s) => (s.id === updatedShop.id ? updatedShop : s)));
  }, []);

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!currentShop?.id) return;
    try {
      const res = await getSubscriptionStatus(currentShop.id);
      if (res && res.success) {
        const days =
          typeof res.subscription?.daysRemaining === 'number'
            ? res.subscription.daysRemaining
            : 3;
        setSubscriptionDaysRemaining(days);
        const shouldShow =
          typeof res.showSubscriptionPlan === 'boolean'
            ? res.showSubscriptionPlan
            : days <= 1 || res.subscription?.status === 'PENDING_APPROVAL';
        setShowSubscriptionPlan(shouldShow);

        setShops((prev) =>
          prev.map((s) => {
            if (s.id !== currentShop.id) return s;
            return {
              ...s,
              isPro: res.isPro,
              proPlan: res.subscription.plan,
              proStatus: res.subscription.status,
              proMpesaCode: res.subscription.mpesaCode,
              proExpiresAt: res.subscription.expiresAt,
              proDaysRemaining: days,
              trialUsed: res.subscription.trialUsed,
            };
          })
        );
      }
    } catch {
      // ignore offline
    }
  }, [currentShop?.id]);

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  const setShopSubscriptionDays = useCallback(
    async (days: number) => {
      try {
        const response = await fetch('/api/subscription/set-days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: currentShop.id,
            daysRemaining: days,
          }),
        });
        if (response.ok) {
          await refreshSubscriptionStatus();
        }
      } catch {
        // ignore
      }
    },
    [currentShop.id, refreshSubscriptionStatus]
  );

  return (
    <StoreContext.Provider
      value={{
        language,
        setLanguage,
        shops,
        currentShop,
        setCurrentShopId,
        updateShop,
        refreshSubscriptionStatus,
        subscriptionDaysRemaining,
        showSubscriptionPlan,
        setShopSubscriptionDays,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
