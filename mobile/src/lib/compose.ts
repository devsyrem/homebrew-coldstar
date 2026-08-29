/**
 * Unsigned transaction composer — the online half of Coldstar's flow.
 * Builds a legacy SOL transfer Transaction serialized exactly as the
 * USB signer expects (solders legacy Transaction wire format).
 */
import { Buffer } from 'buffer';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

export interface ComposedTransfer {
  txBytes: Uint8Array;
  blockhash: string;
  lastValidBlockHeight: number;
  from: string;
  to: string;
  amountSol: number;
}

export function validateAddress(address: string): PublicKey {
  try {
    const pk = new PublicKey(address.trim());
    if (!PublicKey.isOnCurve(pk.toBytes())) {
      // Off-curve addresses (PDAs) are valid transfer destinations,
      // so only warn via the caller if desired; accept here.
    }
    return pk;
  } catch {
    throw new Error('Invalid Solana address');
  }
}

export function solToLamports(amountSol: number): number {
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    throw new Error('Amount must be a positive number');
  }
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  if (lamports < 1) {
    throw new Error('Amount is below 1 lamport');
  }
  return lamports;
}

export async function composeTransfer(
  connection: Connection,
  fromAddress: string,
  toAddress: string,
  amountSol: number
): Promise<ComposedTransfer> {
  const fromPubkey = validateAddress(fromAddress);
  const toPubkey = validateAddress(toAddress);
  const lamports = solToLamports(amountSol);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

  const tx = new Transaction({
    feePayer: fromPubkey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
  );

  // Serialize with zeroed signature placeholders — same layout as
  // solders' Transaction.new_unsigned, which the USB signer parses.
  const txBytes = new Uint8Array(
    tx.serialize({ requireAllSignatures: false, verifySignatures: false })
  );

  return {
    txBytes,
    blockhash,
    lastValidBlockHeight,
    from: fromPubkey.toBase58(),
    to: toPubkey.toBase58(),
    amountSol,
  };
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}
