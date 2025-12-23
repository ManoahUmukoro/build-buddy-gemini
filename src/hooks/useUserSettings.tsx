import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useExchangeRates, currencySymbolToCode, currencyCodeToSymbol } from './useExchangeRates';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  week_start: 'sunday' | 'monday';
}

export interface UserNotifications {
  email_enabled: boolean;
  push_enabled: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
}

interface UserSettingsContextType {
  preferences: UserPreferences;
  notifications: UserNotifications;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateNotifications: (updates: Partial<UserNotifications>) => Promise<void>;
  refetch: () => Promise<void>;
  // Currency conversion helpers
  convert: (amount: number, fromCurrency: string, toCurrency: string) => number;
  formatAmount: (amount: number) => string;
  // Convert user input in selected currency to base (NGN)
  toBaseCurrency: (amount: number) => number;
  // Convert from base (NGN) to selected currency for display
  fromBaseCurrency: (amount: number) => number;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  currency: '₦',
  week_start: 'monday',
};

const defaultNotifications: UserNotifications = {
  email_enabled: true,
  push_enabled: false,
  daily_digest: true,
  weekly_digest: true,
};

const UserSettingsContext = createContext<UserSettingsContextType | null>(null);

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { convert, formatWithConversion, loading: ratesLoading } = useExchangeRates();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [notifications, setNotifications] = useState<UserNotifications>(defaultNotifications);
  const [loading, setLoading] = useState(true);

  // Apply theme to document
  const applyTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, []);

  // Load settings from database
  const fetchSettings = useCallback(async () => {
    if (!user) {
      // Load from localStorage for unauthenticated users
      const savedTheme = localStorage.getItem('theme') as UserPreferences['theme'] | null;
      if (savedTheme) {
        setPreferences(prev => ({ ...prev, theme: savedTheme }));
        applyTheme(savedTheme);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('preferences, notifications')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user settings:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const prefs = data.preferences as unknown as UserPreferences | null;
        const notifs = data.notifications as unknown as UserNotifications | null;
        
        if (prefs) {
          const mergedPrefs = { ...defaultPreferences, ...prefs };
          setPreferences(mergedPrefs);
          applyTheme(mergedPrefs.theme);
        }
        if (notifs) {
          setNotifications({ ...defaultNotifications, ...notifs });
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user, applyTheme]);

  useEffect(() => {
    if (!authLoading) {
      fetchSettings();
    }
  }, [authLoading, fetchSettings]);

  // Listen for system theme changes
  useEffect(() => {
    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [preferences.theme]);

  const saveToDatabase = async (prefs: UserPreferences, notifs: UserNotifications) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_settings')
          .update({
            preferences: prefs as any,
            notifications: notifs as any,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            preferences: prefs as any,
            notifications: notifs as any,
          });
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    
    // Apply theme immediately
    if (updates.theme) {
      applyTheme(updates.theme);
    }
    
    await saveToDatabase(newPrefs, notifications);
  };

  const updateNotifications = async (updates: Partial<UserNotifications>) => {
    const newNotifs = { ...notifications, ...updates };
    setNotifications(newNotifs);
    await saveToDatabase(preferences, newNotifs);
  };

  // Convert amount from base currency (NGN) to selected currency for display
  const fromBaseCurrency = useCallback(
    (amount: number): number => {
      return convert(amount, 'NGN', preferences.currency);
    },
    [convert, preferences.currency]
  );

  // Convert amount from selected currency to base currency (NGN) for storage
  const toBaseCurrency = useCallback(
    (amount: number): number => {
      return convert(amount, preferences.currency, 'NGN');
    },
    [convert, preferences.currency]
  );

  // Format amount in selected currency (converts from base NGN)
  const formatAmount = useCallback(
    (amount: number): string => {
      return formatWithConversion(amount, preferences.currency, 'NGN');
    },
    [formatWithConversion, preferences.currency]
  );

  return (
    <UserSettingsContext.Provider
      value={{
        preferences,
        notifications,
        loading: loading || authLoading || ratesLoading,
        updatePreferences,
        updateNotifications,
        refetch: fetchSettings,
        convert,
        formatAmount,
        toBaseCurrency,
        fromBaseCurrency,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}
