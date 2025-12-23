import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRates {
  NGN: number;
  USD: number;
  GBP: number;
  EUR: number;
}

const CACHE_KEY = 'exchange_rates';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Currency symbol to code mapping
export const currencySymbolToCode: Record<string, string> = {
  '₦': 'NGN',
  '$': 'USD',
  '£': 'GBP',
  '€': 'EUR',
};

export const currencyCodeToSymbol: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

// Default fallback rates (1 NGN = X other currency)
const defaultRates: ExchangeRates = {
  NGN: 1,
  USD: 0.000625,
  GBP: 0.0005,
  EUR: 0.00057,
};

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>(defaultRates);
  const [loading, setLoading] = useState(true);

  const fetchRates = useCallback(async () => {
    try {
      // Check local cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { rates: cachedRates, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION_MS) {
          setRates(cachedRates);
          setLoading(false);
          return;
        }
      }

      // Fetch from edge function
      const { data, error } = await supabase.functions.invoke('get-exchange-rates');

      if (error) {
        console.error('Exchange rate fetch error:', error);
        setLoading(false);
        return;
      }

      if (data?.rates) {
        setRates(data.rates);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rates: data.rates,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Convert amount from one currency to another
  // All stored amounts are in NGN (base currency)
  const convert = useCallback(
    (amount: number, fromCurrency: string, toCurrency: string): number => {
      const fromCode = currencySymbolToCode[fromCurrency] || fromCurrency;
      const toCode = currencySymbolToCode[toCurrency] || toCurrency;

      if (fromCode === toCode) return amount;

      // Convert to NGN first (if not already), then to target currency
      const fromRate = rates[fromCode as keyof ExchangeRates] || 1;
      const toRate = rates[toCode as keyof ExchangeRates] || 1;

      // amount is in fromCurrency -> convert to NGN -> convert to toCurrency
      const amountInNGN = amount / fromRate;
      const amountInTarget = amountInNGN * toRate;

      return amountInTarget;
    },
    [rates]
  );

  // Format amount with currency symbol and conversion
  const formatWithConversion = useCallback(
    (amount: number, displayCurrency: string, baseCurrency: string = 'NGN'): string => {
      const displayCode = currencySymbolToCode[displayCurrency] || displayCurrency;
      const symbol = currencyCodeToSymbol[displayCode] || displayCurrency;

      const convertedAmount = convert(amount, baseCurrency, displayCurrency);

      const formatted = new Intl.NumberFormat(displayCode === 'USD' ? 'en-US' : 'en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Math.abs(convertedAmount));

      return `${symbol}${formatted}`;
    },
    [convert]
  );

  return {
    rates,
    loading,
    convert,
    formatWithConversion,
    refetch: fetchRates,
  };
}
