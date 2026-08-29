/**
 * Compose — build an unsigned SOL transfer for the air-gapped signer.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, View } from 'react-native';
import { Connection } from '@solana/web3.js';
import QRCode from 'react-native-qrcode-svg';
import { Button, Card, Dim, ErrorText, Input, Label, Mono, Screen, SuccessText, Title, truncateAddress } from '../components';
import { encodeEnvelope } from '../lib/airgap';
import { composeTransfer, ComposedTransfer } from '../lib/compose';
import { useSettings } from '../lib/settings';
import { colors, spacing } from '../theme';

export default function ComposeScreen() {
  const { rpcUrl, watchAddress } = useSettings();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(watchAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [composed, setComposed] = useState<ComposedTransfer | null>(null);
  const [envelope, setEnvelope] = useState('');

  // Keep the from-field in sync when settings load after first render.
  React.useEffect(() => {
    setFrom((prev) => prev || watchAddress);
  }, [watchAddress]);

  const compose = async () => {
    setBusy(true);
    setError('');
    setComposed(null);
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const result = await composeTransfer(connection, from, to, parseFloat(amount));
      setComposed(result);
      setEnvelope(encodeEnvelope('unsigned_transaction', result.txBytes));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compose transaction');
    } finally {
      setBusy(false);
    }
  };

  const shareEnvelope = async () => {
    await Share.share({ message: envelope });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          <Card>
            <Title>Compose Transfer</Title>
            <Label>From (cold wallet address)</Label>
            <Input value={from} onChangeText={setFrom} placeholder="Cold wallet public key" />
            <Label>To</Label>
            <Input value={to} onChangeText={setTo} placeholder="Recipient address" />
            <Label>Amount (SOL)</Label>
            <Input
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0"
              keyboardType="decimal-pad"
            />
            <Button title="Build unsigned transaction" onPress={compose} loading={busy} />
            {error ? <ErrorText>{error}</ErrorText> : null}
          </Card>

          {composed ? (
            <Card>
              <Title>Unsigned Transaction</Title>
              <Dim>
                {truncateAddress(composed.from)} → {truncateAddress(composed.to)} ·{' '}
                {composed.amountSol} SOL
              </Dim>
              <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
                <View style={{ backgroundColor: '#ffffff', padding: spacing.sm, borderRadius: 8 }}>
                  <QRCode value={envelope} size={260} />
                </View>
              </View>
              <Dim>
                Scan this with your air-gapped Coldstar signer, or share it as a file and copy it
                to the USB inbox. Blockhash expires in ~1–2 minutes — sign and broadcast promptly.
              </Dim>
              <Mono>blockhash: {composed.blockhash.slice(0, 16)}…</Mono>
              <Button title="Share as file / text" onPress={shareEnvelope} variant="secondary" />
              <SuccessText>
                Next: sign on the USB device, then use the Broadcast tab with the signed result.
              </SuccessText>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
