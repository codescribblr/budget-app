'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface Account {
  accountId: number;
  role: 'owner' | 'editor' | 'viewer';
  accountName: string;
  isOwner: boolean;
}

interface BudgetAccountsContextValue {
  accounts: Account[];
  activeAccountId: number | null;
  hasOwnAccount: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const BudgetAccountsContext = createContext<BudgetAccountsContextValue | undefined>(undefined);

export function BudgetAccountsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [hasOwnAccount, setHasOwnAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const loadAccounts = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      const response = await fetch('/api/budget-accounts');
      if (response.ok) {
        const data = await response.json();
        const accountsList = data.accounts || [];
        setAccounts(accountsList);
        setActiveAccountId(data.activeAccountId);
        setHasOwnAccount(data.hasOwnAccount || false);
      }
    } catch (error) {
      console.error('Error loading budget accounts:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    loadAccounts();

    // Listen for account rename events to refresh the account list
    const handleAccountRenamed = () => {
      loadAccounts();
    };

    window.addEventListener('accountRenamed', handleAccountRenamed);
    return () => {
      window.removeEventListener('accountRenamed', handleAccountRenamed);
    };
  }, []);

  return (
    <BudgetAccountsContext.Provider
      value={{
        accounts,
        activeAccountId,
        hasOwnAccount,
        loading,
        refresh: loadAccounts,
      }}
    >
      {children}
    </BudgetAccountsContext.Provider>
  );
}

export function useBudgetAccounts() {
  const context = useContext(BudgetAccountsContext);
  if (context === undefined) {
    throw new Error('useBudgetAccounts must be used within a BudgetAccountsProvider');
  }
  return context;
}









