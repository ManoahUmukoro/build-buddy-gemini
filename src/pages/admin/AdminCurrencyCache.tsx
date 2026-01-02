import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { RefreshCw, Clock, DollarSign, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface ExchangeRates {
  NGN: number;
  USD: number;
  GBP: number;
  EUR: number;
}

export default function AdminCurrencyCache() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const { data, error } = await supabase.functions.invoke('get-exchange-rates');

      if (error) throw error;

      setRates(data.rates || data);
      setLastUpdated(new Date());
      
      if (forceRefresh) {
        toast.success('Exchange rates refreshed');
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      toast.error('Failed to fetch exchange rates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const formatRate = (rate: number, decimals = 4) => {
    return rate.toFixed(decimals);
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      NGN: '₦',
      USD: '$',
      GBP: '£',
      EUR: '€',
    };
    return symbols[code] || code;
  };

  const getCurrencyName = (code: string) => {
    const names: Record<string, string> = {
      NGN: 'Nigerian Naira',
      USD: 'US Dollar',
      GBP: 'British Pound',
      EUR: 'Euro',
    };
    return names[code] || code;
  };

  // Calculate conversion rates (rates are stored relative to NGN)
  const getConversionRate = (from: string, to: string) => {
    if (!rates) return 0;
    if (from === to) return 1;
    
    // Rates are: 1 NGN = X foreign currency
    // So to convert NGN to USD: amount * rates.USD
    // To convert USD to NGN: amount / rates.USD
    
    if (from === 'NGN') {
      return rates[to as keyof ExchangeRates] || 0;
    }
    if (to === 'NGN') {
      return 1 / (rates[from as keyof ExchangeRates] || 1);
    }
    
    // Cross conversion through NGN
    const toNGN = 1 / (rates[from as keyof ExchangeRates] || 1);
    return toNGN * (rates[to as keyof ExchangeRates] || 0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="text-primary" />
              Currency Cache
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and refresh exchange rates
            </p>
          </div>
          <Button 
            onClick={() => fetchRates(true)} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <RefreshCw size={16} className="mr-2" />
            )}
            Refresh Rates
          </Button>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : rates ? (
          <div className="space-y-6">
            {/* Rate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(rates).map(([code, rate]) => (
                <div 
                  key={code}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{getCurrencySymbol(code)}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {code}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{getCurrencyName(code)}</p>
                  <p className="text-lg font-semibold">
                    {code === 'NGN' ? '1.0000' : formatRate(rate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    per 1 NGN
                  </p>
                </div>
              ))}
            </div>

            {/* Conversion Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Conversion Matrix</h3>
                <p className="text-sm text-muted-foreground">How much 1 unit of each currency is worth</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">From / To</th>
                      {Object.keys(rates).map(code => (
                        <th key={code} className="text-right p-3 font-medium">{code}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(rates).map(fromCode => (
                      <tr key={fromCode} className="border-t border-border">
                        <td className="p-3 font-medium">{fromCode}</td>
                        {Object.keys(rates).map(toCode => (
                          <td key={toCode} className="text-right p-3">
                            {fromCode === toCode ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              formatRate(getConversionRate(fromCode, toCode), 6)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Conversions */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Quick Reference (₦1,000,000)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['USD', 'GBP', 'EUR'].map(code => {
                  const converted = 1000000 * (rates[code as keyof ExchangeRates] || 0);
                  return (
                    <div key={code} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">₦1,000,000 =</span>
                      <span className="font-semibold">
                        {getCurrencySymbol(code)}{converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <DollarSign className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="font-semibold text-lg mb-2">No Exchange Rates</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Unable to load exchange rates
            </p>
            <Button onClick={() => fetchRates(true)}>
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
