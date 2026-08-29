/**
 * App settings: RPC endpoint and the watched (cold wallet) public key.
 * The phone never holds private keys — only the public key from the
 * USB wallet's pubkey.txt, used for balance display and composing.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keep in sync with config.py in the repo root.
export const DEFAULT_RPC_URL = 'https://rayyana-mainnet-dd08.mainnet.rpcpool.com';

const KEY_RPC_URL = 'coldstar.rpcUrl';
const KEY_WATCH_ADDRESS = 'coldstar.watchAddress';

interface SettingsState {
  rpcUrl: string;
  watchAddress: string;
  loaded: boolean;
  setRpcUrl: (url: string) => Promise<void>;
  setWatchAddress: (address: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [rpcUrl, setRpcUrlState] = useState(DEFAULT_RPC_URL);
  const [watchAddress, setWatchAddressState] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedRpc, storedAddress] = await Promise.all([
          AsyncStorage.getItem(KEY_RPC_URL),
          AsyncStorage.getItem(KEY_WATCH_ADDRESS),
        ]);
        if (storedRpc) setRpcUrlState(storedRpc);
        if (storedAddress) setWatchAddressState(storedAddress);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const value = useMemo<SettingsState>(
    () => ({
      rpcUrl,
      watchAddress,
      loaded,
      setRpcUrl: async (url: string) => {
        const trimmed = url.trim();
        if (!/^https?:\/\/.+/.test(trimmed)) {
          throw new Error('RPC URL must start with http:// or https://');
        }
        setRpcUrlState(trimmed);
        await AsyncStorage.setItem(KEY_RPC_URL, trimmed);
      },
      setWatchAddress: async (address: string) => {
        const trimmed = address.trim();
        setWatchAddressState(trimmed);
        await AsyncStorage.setItem(KEY_WATCH_ADDRESS, trimmed);
      },
    }),
    [rpcUrl, watchAddress, loaded]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
