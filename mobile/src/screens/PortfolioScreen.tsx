/**
 * Portfolio — watch-only view of the cold wallet's balance.
 * The address comes from the USB wallet's pubkey.txt (entered in Settings).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import { Card, Dim, Mono, Screen, Title, ErrorText, truncateAddress } from '../components';
import { lamportsToSol } from '../lib/compose';
import { useSettings } from '../lib/settings';
import { colors, spacing } from '../theme';

export default function PortfolioScreen() {
  const { rpcUrl, watchAddress, loaded } = useSettings();
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (!watchAddress) {
      setBalance(null);
      setError('');
      return;
    }
    setRefreshing(true);
    setError('');
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const lamports = await connection.getBalance(new PublicKey(watchAddress));
      setBalance(lamports);
    } catch (e) {
      setBalance(null);
      setError(e instanceof Error ? e.message : 'Failed to fetch balance');
    } finally {
      setRefreshing(false);
    }
  }, [rpcUrl, watchAddress]);

  useEffect(() => {
    if (loaded) refresh();
  }, [loaded, refresh]);

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <Card>
          <Title>❄️ Cold Wallet</Title>
          {watchAddress ? (
            <>
              <Mono>{truncateAddress(watchAddress)}</Mono>
              <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 36, fontWeight: '800' }}>
                  {balance === null ? '—' : lamportsToSol(balance).toLocaleString(undefined, { maximumFractionDigits: 9 })}
                </Text>
                <Dim>SOL</Dim>
              </View>
              {error ? <ErrorText>{error}</ErrorText> : null}
              <View style={{ marginTop: spacing.md }}>
                <Dim>Pull down to refresh. Balance is read-only — private keys never touch this phone.</Dim>
              </View>
            </>
          ) : (
            <Dim>
              No wallet address set. Open Settings and enter the public key from your Coldstar
              USB drive (pubkey.txt).
            </Dim>
          )}
        </Card>
        <Card>
          <Title>How it works</Title>
          <Dim>
            1. Compose a transaction here (phone is online, holds no keys).{'\n'}
            2. Pass it to your air-gapped Coldstar USB signer via QR or file.{'\n'}
            3. Bring the signed transaction back and broadcast it from this phone.
          </Dim>
        </Card>
      </ScrollView>
    </Screen>
  );
}
