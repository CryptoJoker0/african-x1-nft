import { createIsomorphicFn } from "@tanstack/react-start";
import { getInjectedProvider } from "@/lib/wallet";

export interface MintTxParams {
  rpcUrl: string;
  treasury: string;
  address: string;
  totalXnt: number;
  walletId: string | null;
  onStage: (stage: "signing" | "confirming") => void;
}

/**
 * Build + sign + submit the treasury transfer using @solana/web3.js.
 * Isomorphic: the server build gets a stub that throws, so @solana/web3.js
 * (and its rpc-websockets dep, which is not workerd-compatible) never
 * lands in the SSR / Cloudflare Workers bundle.
 */
export const submitMintTransfer = createIsomorphicFn()
  .server(async (_params: MintTxParams): Promise<string> => {
    throw new Error("submitMintTransfer must run in the browser");
  })
  .client(async (params: MintTxParams): Promise<string> => {
    const { rpcUrl, treasury, address, totalXnt, walletId, onStage } = params;
    const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } =
      await import("@solana/web3.js");

    const connection = new Connection(rpcUrl, "confirmed");
    const from = new PublicKey(address);
    const to = new PublicKey(treasury);
    const lamports = Math.round(totalXnt * LAMPORTS_PER_SOL);

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
