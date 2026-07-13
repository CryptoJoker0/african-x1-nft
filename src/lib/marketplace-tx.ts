import { createIsomorphicFn } from "@tanstack/react-start";
import { getInjectedProvider, type WalletId } from "@/lib/wallet";

/**
 * Build + sign + submit a purchase transaction: two SystemProgram.transfer
 * instructions in ONE atomic transaction — seller proceeds and the platform
 * fee. The server verifies both destinations independently before finalizing
 * the sale (see marketplace.logic.ts::processClaimPurchase).
 */
export interface PurchaseTxParams {
  rpcUrl: string;
  buyerAddress: string;
  sellerWallet: string;
  sellerAmount: number;
  feeWallet: string;
  platformFee: number;
  walletId: WalletId | null;
  onStage: (stage: "signing" | "confirming") => void;
}

export const submitPurchaseTransfer = createIsomorphicFn()
  .server(async (_params: PurchaseTxParams): Promise<string> => {
    throw new Error("submitPurchaseTransfer must run in the browser");
  })
  .client(async (params: PurchaseTxParams): Promise<string> => {
    const { rpcUrl, buyerAddress, sellerWallet, sellerAmount, feeWallet, platformFee, walletId, onStage } =
      params;
    const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } =
      await import("@solana/web3.js");

    const connection = new Connection(rpcUrl, "confirmed");
    const from = new PublicKey(buyerAddress);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: from, blockhash, lastValidBlockHeight }).add(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: new PublicKey(sellerWallet),
        lamports: Math.round(sellerAmount * LAMPORTS_PER_SOL),
      }),
    );
    if (platformFee > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: new PublicKey(feeWallet),
          lamports: Math.round(platformFee * LAMPORTS_PER_SOL),
        }),
      );
    }

    const provider = getInjectedProvider(walletId);
    if (!provider) throw new Error("Wallet provider not found. Reconnect your wallet.");

    onStage("signing");
    let sig: string;
    if (typeof provider.signAndSendTransaction === "function") {
      const res = await provider.signAndSendTransaction(tx);
      sig = res.signature;
    } else if (typeof provider.signTransaction === "function") {
      const signed = (await provider.signTransaction(tx)) as InstanceType<typeof Transaction>;
      sig = await connection.sendRawTransaction(signed.serialize());
    } else {
      throw new Error("Wallet does not support signing transactions");
    }

    onStage("confirming");
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    return sig;
  });

/** Single treasury transfer, reused for the community collection listing fee. */
export interface FeeTxParams {
  rpcUrl: string;
  fromAddress: string;
  toWallet: string;
  amountXnt: number;
  walletId: WalletId | null;
  onStage: (stage: "signing" | "confirming") => void;
}

export const submitFeeTransfer = createIsomorphicFn()
  .server(async (_params: FeeTxParams): Promise<string> => {
    throw new Error("submitFeeTransfer must run in the browser");
  })
  .client(async (params: FeeTxParams): Promise<string> => {
    const { rpcUrl, fromAddress, toWallet, amountXnt, walletId, onStage } = params;
    const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } =
      await import("@solana/web3.js");

    const connection = new Connection(rpcUrl, "confirmed");
    const from = new PublicKey(fromAddress);
    const to = new PublicKey(toWallet);
    const lamports = Math.round(amountXnt * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: from, blockhash, lastValidBlockHeight }).add(
      SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports }),
    );

    const provider = getInjectedProvider(walletId);
    if (!provider) throw new Error("Wallet provider not found. Reconnect your wallet.");

    onStage("signing");
    let sig: string;
    if (typeof provider.signAndSendTransaction === "function") {
      const res = await provider.signAndSendTransaction(tx);
      sig = res.signature;
    } else if (typeof provider.signTransaction === "function") {
      const signed = (await provider.signTransaction(tx)) as InstanceType<typeof Transaction>;
      sig = await connection.sendRawTransaction(signed.serialize());
    } else {
      throw new Error("Wallet does not support signing transactions");
    }

    onStage("confirming");
    await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    return sig;
  });
