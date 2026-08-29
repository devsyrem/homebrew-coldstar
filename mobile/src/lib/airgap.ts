/**
 * Coldstar air-gap interchange format.
 *
 * Wire-compatible with the USB signer (src/transaction.py):
 *   { "type": "unsigned_transaction" | "signed_transaction",
 *     "version": "1.0",
 *     "data": base64(serialized legacy Transaction) }
 *
 * The same JSON envelope is used for QR codes and for files dropped
 * into the USB stick's inbox/outbox directories.
 */
import { Buffer } from 'buffer';
import { Transaction } from '@solana/web3.js';

export const ENVELOPE_VERSION = '1.0';

export type EnvelopeType = 'unsigned_transaction' | 'signed_transaction';

export interface TxEnvelope {
  type: EnvelopeType;
  version: string;
  data: string; // base64
}

export function encodeEnvelope(type: EnvelopeType, txBytes: Uint8Array): string {
  const envelope: TxEnvelope = {
    type,
    version: ENVELOPE_VERSION,
    data: Buffer.from(txBytes).toString('base64'),
  };
  return JSON.stringify(envelope, null, 2);
}

export function decodeEnvelope(raw: string, expectedType: EnvelopeType): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Not a valid Coldstar transaction file (invalid JSON)');
  }
  const envelope = parsed as Partial<TxEnvelope>;
  if (envelope.type !== expectedType) {
    throw new Error(
      `Wrong transaction type: expected "${expectedType}", got "${envelope.type ?? 'unknown'}"`
    );
  }
  if (typeof envelope.data !== 'string' || envelope.data.length === 0) {
    throw new Error('Transaction file has no data field');
  }
  const bytes = Buffer.from(envelope.data, 'base64');
  if (bytes.length === 0) {
    throw new Error('Transaction data is empty or not valid base64');
  }
  return new Uint8Array(bytes);
}

/** Parse a signed transaction envelope and verify it carries a real signature. */
export function decodeSignedEnvelope(raw: string): { txBytes: Uint8Array; tx: Transaction } {
  const txBytes = decodeEnvelope(raw, 'signed_transaction');
  const tx = Transaction.from(Buffer.from(txBytes));
  const hasSignature = tx.signatures.some(
    (s) => s.signature !== null && s.signature.some((b) => b !== 0)
  );
  if (!hasSignature) {
    throw new Error('Transaction is not signed');
  }
  return { txBytes, tx };
}
