/**
 * Settings — RPC endpoint and the watched cold-wallet public key.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Dim, ErrorText, Input, Label, Screen, SuccessText, Title } from '../components';
import { validateAddress } from '../lib/compose';
import { DEFAULT_RPC_URL, useSettings } from '../lib/settings';
import { colors, spacing } from '../theme';

export default function SettingsScreen() {
  const settings = useSettings();
  const [rpcUrl, setRpcUrl] = useState(settings.rpcUrl);
  const [address, setAddress] = useState(settings.watchAddress);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    if (settings.loaded) {
      setRpcUrl(settings.rpcUrl);
      setAddress(settings.watchAddress);
    }
    // Sync local fields once persisted settings finish loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.loaded]);

  const save = async () => {
    setError('');
    setMessage('');
    try {
      if (address.trim()) validateAddress(address);
      await settings.setRpcUrl(rpcUrl);
      await settings.setWatchAddress(address);
      setMessage('Saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    }
  };

  const scanAddress = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setError('Camera permission is required to scan');
        return;
      }
    }
    setScanning(true);
  };

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Card>
          <Title>Settings</Title>
          <Label>Cold wallet public key (from pubkey.txt)</Label>
          <Input value={address} onChangeText={setAddress} placeholder="Public key to watch" />
          {scanning ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  setScanning(false);
                  setAddress(data.trim());
                }}
              />
              <Button title="Cancel scan" variant="secondary" onPress={() => setScanning(false)} />
            </View>
          ) : (
            <Button title="Scan address QR" variant="secondary" onPress={scanAddress} />
          )}
          <Label>Solana RPC URL</Label>
          <Input value={rpcUrl} onChangeText={setRpcUrl} placeholder={DEFAULT_RPC_URL} />
          <Dim>
            The default endpoint is shared infrastructure — for privacy, consider your own RPC
            provider. Must include https://.
          </Dim>
          <Button title="Save" onPress={save} />
          {message ? <SuccessText>{message}</SuccessText> : null}
          {error ? <ErrorText>{error}</ErrorText> : null}
        </Card>
        <Card>
          <Title>Security model</Title>
          <Dim>
            This companion app is watch-only: it composes unsigned transactions and broadcasts
            signed ones. Private keys exist only on your air-gapped Coldstar USB device, and only
            in RAM while signing.
          </Dim>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { marginTop: spacing.sm },
  camera: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
