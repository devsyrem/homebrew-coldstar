# ❄️ Coldstar Mobile

Companion app for the [Coldstar](../README.md) cold wallet — for **Solana Seeker / Android** and **iOS** from a single React Native (Expo) codebase.

## Security model

The phone is the **online half** of Coldstar's air-gap flow and **never holds private keys**:

1. **Compose** — build an unsigned SOL transfer (the phone fetches the blockhash; it only knows your public key).
2. **Transfer** — hand the unsigned transaction to the air-gapped Coldstar USB signer via QR code or file (`{"type": "unsigned_transaction", "version": "1.0", "data": base64}` — identical to the signer's inbox format in `src/transaction.py`).
3. **Sign** — happens on the USB-booted device; keys exist only in locked RAM inside the Rust signer.
4. **Broadcast** — scan or paste the signed transaction back into the phone and submit it.

Wire compatibility with the Python/Rust signer is cross-checked: a transaction composed with this app's `src/lib/compose.ts` parses via `solders.Transaction.from_bytes`, signs, and round-trips back through `src/lib/airgap.ts`.

## Screens

- **Portfolio** — watch-only balance of the cold wallet address (from the USB stick's `pubkey.txt`).
- **Compose** — build the unsigned transfer, show it as a QR, or share it as a file for the USB inbox.
- **Broadcast** — scan the signed QR (or paste the outbox JSON), submit, and confirm.
- **Settings** — cold wallet address (typable or QR-scannable) and RPC endpoint.

## Development

```bash
cd mobile
npm install
npm run typecheck   # tsc --noEmit
npx expo start      # QR to open in Expo Go (camera features need a dev build)
```

Device builds (camera requires a dev build, not Expo Go):

```bash
npx expo run:android   # Seeker / any Android device
npx expo run:ios       # iOS (needs macOS + Xcode)
```

## Platform notes

- **Seeker (Android):** runs as-is. Seed Vault / Mobile Wallet Adapter integration is intentionally not used — Coldstar's model keeps keys on the disposable USB signer, not in phone hardware. A future dApp-facing MWA mode could be added on Android only.
- **iOS:** identical feature set; there is no Seed Vault/MWA on iOS, which is why the companion design was chosen — it keeps both apps at parity.
- The default RPC endpoint mirrors `config.py`. For privacy, point Settings at your own RPC provider.
