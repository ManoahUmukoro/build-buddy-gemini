import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: 'bank' | 'wallet' | 'cash';
  currency: string;
  opening_balance: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type assertion for the data
      const typedData = (data || []).map(acc => ({
        ...acc,
        account_type: acc.account_type as 'bank' | 'wallet' | 'cash',
        opening_balance: Number(acc.opening_balance),
      })) as BankAccount[];
      
      setAccounts(typedData);

      // If no accounts exist, create a default primary account
      if (typedData.length === 0 && user) {
        await createDefaultAccount();
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createDefaultAccount = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: 'Primary Account',
          account_type: 'bank',
          currency: 'NGN',
          opening_balance: 0,
          is_primary: true,
        })
        .select()
        .single();

      if (error) throw error;

      const typedAccount = {
        ...data,
        account_type: data.account_type as 'bank' | 'wallet' | 'cash',
        opening_balance: Number(data.opening_balance),
      } as BankAccount;
      
      setAccounts([typedAccount]);
      toast.success('Default account created. You can rename it anytime.');
      return typedAccount;
    } catch (error) {
      console.error('Error creating default account:', error);
      return null;
    }
  };

  const createAccount = async (accountData: {
    bank_name: string;
    account_type: 'bank' | 'wallet' | 'cash';
    currency: string;
    opening_balance: number;
    is_primary?: boolean;
  }) => {
    if (!user) return null;
    
    try {
      // If setting as primary, unset other primary accounts
      if (accountData.is_primary) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          ...accountData,
        })
        .select()
        .single();

      if (error) throw error;

      const typedAccount = {
        ...data,
        account_type: data.account_type as 'bank' | 'wallet' | 'cash',
        opening_balance: Number(data.opening_balance),
      } as BankAccount;

      setAccounts(prev => [...prev, typedAccount].sort((a, b) => 
        (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
      ));
      toast.success(`${accountData.bank_name} account created!`);
      return typedAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
      return null;
    }
  };

  const updateAccount = async (id: string, updates: Partial<Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return false;
    
    try {
      // If setting as primary, unset other primary accounts
      if (updates.is_primary) {
        await supabase
          .from('bank_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...updates } as BankAccount : 
        updates.is_primary ? { ...acc, is_primary: false } : acc
      ).sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)));
      
      toast.success('Account updated!');
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
      return false;
    }
  };

  const deleteAccount = async (id: string) => {
    if (!user) return false;
    
    const account = accounts.find(a => a.id === id);
    if (account?.is_primary && accounts.length > 1) {
      toast.error('Cannot delete primary account. Set another account as primary first.');
      return false;
    }

    if (accounts.length === 1) {
      toast.error('Cannot delete your only account.');
      return false;
    }
    
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(acc => acc.id !== id));
      toast.success('Account deleted!');
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
      return false;
    }
  };

  const getPrimaryAccount = () => accounts.find(a => a.is_primary) || accounts[0];

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    selectedAccountId,
    setSelectedAccountId,
    createAccount,
    updateAccount,
    deleteAccount,
    getPrimaryAccount,
    refetch: fetchAccounts,
  };
}
