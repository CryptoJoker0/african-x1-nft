/**
 * marketplace.logic.ts — pure business logic for the AFRICAN X1 marketplace.
 *
 * Mirrors the funds-safety pattern established in mint.logic.ts: identity is
 * the wallet address (no sign-in required), the service-role admin client is
 * used for every write (RLS is bypassed deliberately, ownership/payment are
 * verified in code before any write happens), and on-chain payments are
 * independently confirmed via raw JSON-RPC before state changes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { verifyPaymentOnChain } from "@/lib/mint.logic";

export type DB = SupabaseClient<Database>;

interface MarketConfig {
  marketplace_enabled: boolean;
  platform_fee_bps: number;
  fee_wallet: string | null;
  treasury_wallet: string | null;
  rpc_url: string;
  listing_application_fee_xnt: number;
}

async function loadConfig(admin: DB): Promise<MarketConfig> {
  const { data, error } = await admin
    .from("collection_config")
    .select(
      "marketplace_enabled, platform_fee_bps, fee_wallet, treasury_wallet, rpc_url, listing_application_fee_xnt",
    )
    .eq("id", 1)
    .single();
  if (error || !data) throw new Error("Collection configuration is unavailable");
  return data;
}

function requireMarketplaceOpen(config: MarketConfig) {
  if (!config.marketplace_enabled) throw new Error("The marketplace is currently closed");
  if (!config.treasury_wallet) throw new Error("Administrator error: treasury wallet not set");
  if (!config.rpc_url) throw new Error("Administrator error: X1 RPC URL not set");
}

function feeWalletOf(config: MarketConfig): string {
  return config.fee_wallet || config.treasury_wallet!;
}

// ─── Listing creation ────────────────────────────────────────────────────────

export interface CreateListingParams {
  walletAddress: string;
  nftId: string;
  price: number;
  category?: string;
  description?: string;
  getAdmin: () => Promise<DB>;
}

export async function processCreateListing(params: CreateListingParams) {
  const { walletAddress, nftId, price, category, description, getAdmin } = params;
  if (price <= 0) throw new Error("Price must be greater than zero");

  const admin = await getAdmin();
  const config = await loadConfig(admin);
  requireMarketplaceOpen(config);

  const { data: nft, error: nftErr } = await admin
    .from("nfts")
    .select("id, status, owner_wallet")
    .eq("id", nftId)
    .maybeSingle();
  if (nftErr) throw new Error(`Database error: ${nftErr.message}`);
  if (!nft) throw new Error("NFT not found");
  if (nft.status !== "minted") throw new Error("Only minted NFTs you own can be listed");
  if (nft.owner_wallet !== walletAddress) {
    throw new Error("You do not own this NFT — only the current owner can list it");
  }

  const { data: existing } = await admin
    .from("listings")
    .select("id")
    .eq("nft_id", nftId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) throw new Error("This NFT already has an active listing");

  // Official AFRICAN X1 collection is the only tradable collection today.
  const { data: officialCollection } = await admin
    .from("collections")
    .select("id")
    .eq("is_official", true)
    .maybeSingle();

  const { data: listing, error: insErr } = await admin
    .from("listings")
    .insert({
      nft_id: nftId,
      seller_wallet: walletAddress,
      price,
      category: category || null,
      description: description || null,
      collection_id: officialCollection?.id ?? null,
      status: "active",
    })
    .select("id, price, status")
    .single();
  if (insErr) throw new Error(`Failed to create listing: ${insErr.message}`);

  return listing;
}

export interface CancelListingParams {
  walletAddress: string;
  listingId: string;
  getAdmin: () => Promise<DB>;
}

export async function processCancelListing(params: CancelListingParams) {
  const { walletAddress, listingId, getAdmin } = params;
  const admin = await getAdmin();

  const { data: listing, error } = await admin
    .from("listings")
    .select("id, seller_wallet, status")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!listing) throw new Error("Listing not found");
  if (listing.seller_wallet !== walletAddress) {
    throw new Error("Only the seller can cancel this listing");
  }
  if (listing.status !== "active") throw new Error("Listing is not active");

  const { error: updErr } = await admin
    .from("listings")
    .update({ status: "cancelled" })
    .eq("id", listingId);
  if (updErr) throw new Error(`Failed to cancel listing: ${updErr.message}`);

  return { ok: true as const };
}

// ─── Purchase flow ────────────────────────────────────────────────────────────

export interface PreflightPurchaseParams {
  listingId: string;
  buyerWallet: string;
  getAdmin: () => Promise<DB>;
}

export interface PreflightPurchaseResult {
  ok: true;
  listingId: string;
  price: number;
  platformFee: number;
  total: number;
  sellerWallet: string;
  sellerAmount: number;
  feeWallet: string;
  rpcUrl: string;
}

export async function processPreflightPurchase(
  params: PreflightPurchaseParams,
): Promise<PreflightPurchaseResult> {
  const { listingId, buyerWallet, getAdmin } = params;
  const admin = await getAdmin();
  const config = await loadConfig(admin);
  requireMarketplaceOpen(config);

  const { data: listing, error } = await admin
    .from("listings")
    .select("id, price, seller_wallet, status")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "active") throw new Error("This listing is no longer active");
  if (listing.seller_wallet === buyerWallet) {
    throw new Error("You cannot buy your own listing");
  }

  const price = Number(listing.price);
  const platformFee = roundXnt((price * config.platform_fee_bps) / 10_000);
  const sellerAmount = roundXnt(price - platformFee);

  return {
    ok: true,
    listingId,
    price,
    platformFee,
    total: price,
    sellerWallet: listing.seller_wallet,
    sellerAmount,
    feeWallet: feeWalletOf(config),
    rpcUrl: config.rpc_url,
  };
}

export interface ClaimPurchaseParams {
  listingId: string;
  buyerWallet: string;
  signature: string;
  getAdmin: () => Promise<DB>;
}

export async function processClaimPurchase(params: ClaimPurchaseParams) {
  const { listingId, buyerWallet, signature, getAdmin } = params;
  const admin = await getAdmin();
  const config = await loadConfig(admin);
  requireMarketplaceOpen(config);

  // Idempotency
  const { data: priorSale } = await admin
    .from("sales")
    .select("id, status")
    .eq("signature", signature)
    .maybeSingle();
  if (priorSale && priorSale.status === "confirmed") {
    return { alreadyClaimed: true as const, signature };
  }

  const { data: listing, error } = await admin
    .from("listings")
    .select("id, nft_id, price, seller_wallet, status")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "active") throw new Error("This listing is no longer active");

  const price = Number(listing.price);
  const platformFee = roundXnt((price * config.platform_fee_bps) / 10_000);
  const sellerAmount = roundXnt(price - platformFee);
  const feeWallet = feeWalletOf(config);

  // Claim lock — sales.signature is UNIQUE
  const { data: lockRows, error: lockErr } = await admin
    .from("sales")
    .insert({
      listing_id: listingId,
      nft_id: listing.nft_id,
      seller_wallet: listing.seller_wallet,
      buyer_wallet: buyerWallet,
      price,
      platform_fee_amount: platformFee,
      seller_amount: sellerAmount,
      signature,
      status: "pending",
    })
    .select("id");
  if (lockErr) {
    const isUnique =
      lockErr.code === "23505" || (lockErr.message ?? "").toLowerCase().includes("duplicate");
    if (isUnique) return { alreadyClaimed: true as const, signature };
    throw new Error(`Failed to create sale record: ${lockErr.message}`);
  }
  const saleId = lockRows![0].id as string;

  try {
    // Verify both transfers landed in the same transaction: seller amount to
    // the seller wallet, platform fee to the fee wallet.
    await verifyPaymentOnChain({
      signature,
      walletAddress: buyerWallet,
      treasury: listing.seller_wallet,
      expectedLamports: Math.round(sellerAmount * 1_000_000_000),
      rpcUrl: config.rpc_url,
    });
    if (platformFee > 0) {
      await verifyPaymentOnChain({
        signature,
        walletAddress: buyerWallet,
        treasury: feeWallet,
        expectedLamports: Math.round(platformFee * 1_000_000_000),
        rpcUrl: config.rpc_url,
      });
    }

    // Atomically flip the listing to sold — only if still active.
    const { data: updatedListing, error: listErr } = await admin
      .from("listings")
      .update({
        status: "sold",
        buyer_wallet: buyerWallet,
        sold_at: new Date().toISOString(),
      })
      .eq("id", listingId)
      .eq("status", "active")
      .select("id")
      .maybeSingle();
    if (listErr) throw new Error(`Failed to finalize listing: ${listErr.message}`);
    if (!updatedListing) {
      throw new Error("Listing was already sold — another purchase completed simultaneously");
    }

    // Transfer NFT ownership in the DB (mirrors mint's ownership model — this
    // app tracks ownership off-chain, consistent with how NFTs are assigned
    // at mint time).
    await admin
      .from("nfts")
      .update({ owner_wallet: buyerWallet })
      .eq("id", listing.nft_id);

    await admin
      .from("sales")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", saleId);

    return { alreadyClaimed: false as const, signature };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await admin.from("sales").update({ status: "failed", error_message: message }).eq("id", saleId);
    throw err;
  }
}

function roundXnt(n: number): number {
  return Math.round(n * 1e9) / 1e9;
}

// ─── Community collection applications ───────────────────────────────────────

export interface SubmitApplicationParams {
  projectName: string;
  collectionName: string;
  website?: string;
  xAccount?: string;
  telegram?: string;
  contractAddress?: string;
  creatorWallet: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  signature: string;
  getAdmin: () => Promise<DB>;
}

export async function processSubmitApplication(params: SubmitApplicationParams) {
  const {
    projectName,
    collectionName,
    website,
    xAccount,
    telegram,
    contractAddress,
    creatorWallet,
    description,
    logoUrl,
    bannerUrl,
    signature,
    getAdmin,
  } = params;

  const admin = await getAdmin();
  const config = await loadConfig(admin);
  if (!config.treasury_wallet) throw new Error("Administrator error: treasury wallet not set");
  if (!config.rpc_url) throw new Error("Administrator error: X1 RPC URL not set");

  const { data: existing } = await admin
    .from("collection_applications")
    .select("id")
    .eq("listing_fee_signature", signature)
    .maybeSingle();
  if (existing) return { alreadySubmitted: true as const };

  const feeWallet = feeWalletOf(config);
  const feeAmount = Number(config.listing_application_fee_xnt);

  await verifyPaymentOnChain({
    signature,
    walletAddress: creatorWallet,
    treasury: feeWallet,
    expectedLamports: Math.round(feeAmount * 1_000_000_000),
    rpcUrl: config.rpc_url,
  });

  const { data: application, error } = await admin
    .from("collection_applications")
    .insert({
      project_name: projectName,
      collection_name: collectionName,
      website: website || null,
      x_account: xAccount || null,
      telegram: telegram || null,
      contract_address: contractAddress || null,
      creator_wallet: creatorWallet,
      description: description || null,
      logo_url: logoUrl || null,
      banner_url: bannerUrl || null,
      listing_fee_amount: feeAmount,
      listing_fee_signature: signature,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to submit application: ${error.message}`);

  return { alreadySubmitted: false as const, applicationId: application.id };
}
