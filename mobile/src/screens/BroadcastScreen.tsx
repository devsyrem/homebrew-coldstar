/**
 * Broadcast — scan or paste the signed transaction produced by the
 * air-gapped USB signer and submit it to the network.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { Button, Card, Dim, ErrorText, Input, Label, Mono, Screen, SuccessText, Title } from '../components';
import { decodeSignedEnvelope } from '../lib/airgap';
import { useSettings } from '../lib/settings';
import { colors, spacing } from '../theme';

export default function BroadcastScreen() {
  const { rpcUrl } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const submit = async (raw: string) => {
    setBusy(true);
    setError('');
    setSignature('');
    setConfirmed(false);
    try {
      const { txBytes } = decodeSignedEnvelope(raw);
      const connection = new Connection(rpcUrl, 'confirmed');
      const sig = await connection.sendRawTransaction(Buffer.from(txBytes), {
        skipPreflight: false,
      });
      setSignature(sig);
      const latest = await connection.getLatestBlockhash('confirmed');
      const result = await connection.confirmTransaction(
        { signature: sig, ...latest },
        'confirmed'
      );
      if (result.value.err) {
        setError(`Transaction landed but failed: ${JSON.stringify(result.value.err)}`);
      } else {
        setConfirmed(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Broadcast failed');
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Camera permission is required to scan QR codes');
        return;
      }
    }
    setError('');
    setScanning(true);
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Card>
          <Title>Broadcast Signed Transaction</Title>
          <Dim>
            After signing on your air-gapped Coldstar USB device, bring the signed transaction
            back here by QR code or by pasting the outbox file's contents.
          </Dim>
          {scanning ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  setScanning(false);
                  submit(data);
                }}
              />
              <Button title="Cancel scan" variant="secondary" onPress={() => setScanning(false)} />
            </View>
          ) : (
            <Button title="Scan signed QR" onPress={startScan} loading={busy} />
          )}
          <Label>Or paste the signed transaction JSON</Label>
          <Input
            value={pasted}
            onChangeText={setPasted}
            placeholder='{"type": "signed_transaction", …}'
            multiline
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Button
            title="Broadcast pasted transaction"
            variant="secondary"
            onPress={() => submit(pasted)}
            disabled={!pasted.trim()}
            loading={busy}
          />
          {error ? <ErrorText>{error}</ErrorText> : null}
          {signature ? (
            <View style={{ marginTop: spacing.md }}>
              <Label>Signature</Label>
              <Mono>{signature}</Mono>
              {confirmed ? (
                <SuccessText>✓ Confirmed on-chain</SuccessText>
              ) : (
                <Dim>Submitted, awaiting confirmation…</Dim>
              )}
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { marginTop: spacing.md },
  camera: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
