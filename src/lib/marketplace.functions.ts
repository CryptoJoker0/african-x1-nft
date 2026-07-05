import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, logAdminAction } from "./admin-guard.server";

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      nftId: z.string().uuid(),
      price: z.number().positive().max(1_000_000_000),
      sellerWallet: z.string().min(20).max(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: nft, error: nftErr } = await context.supabase
      .from("nfts")
      .select("id, owner_user_id, status")
      .eq("id", data.nftId)
      .single();
    if (nftErr) throw new Error(nftErr.message);
    if (!nft || nft.owner_user_id !== context.userId) {
      throw new Error("Only the owner can list this NFT");
    }
    if (nft.status !== "minted") throw new Error("NFT must be minted before listing");

    // Cancel any existing active listing for this NFT
    await context.supabase
      .from("listings")
      .update({ status: "cancelled" })
      .eq("nft_id", data.nftId)
      .eq("status", "active");

    const { data: row, error } = await context.supabase
      .from("listings")
      .insert({
        nft_id: data.nftId,
        seller_user_id: context.userId,
        seller_wallet: data.sellerWallet,
        price: data.price,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Update NFT's cached list price
    await context.supabase
      .from("nfts")
      .update({ list_price: data.price, listed_at: new Date().toISOString() })
      .eq("id", data.nftId);

    return row;
  });

export const cancelListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ listingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("listings")
      .update({ status: "cancelled" })
      .eq("id", data.listingId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("nfts")
      .update({ list_price: null, listed_at: null })
      .eq("id", row.nft_id);
    return { ok: true };
  });

export const adminCancelListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ listingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .update({ status: "cancelled" })
      .eq("id", data.listingId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (row) {
      await supabaseAdmin
        .from("nfts")
        .update({ list_price: null, listed_at: null })
        .eq("id", row.nft_id);
    }
    await logAdminAction("listing.cancel", "listing", data.listingId);
    return { ok: true };
  });

export const recordSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      listingId: z.string().uuid(),
      buyerWallet: z.string().min(20).max(100),
      signature: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load listing + config atomically-ish
    const { data: listing, error: lErr } = await supabaseAdmin
      .from("listings")
      .select("*")
      .eq("id", data.listingId)
      .eq("status", "active")
      .single();
    if (lErr || !listing) throw new Error("Listing unavailable");

    const { data: config } = await supabaseAdmin
      .from("collection_config")
      .select("royalty_bps, platform_fee_bps, marketplace_enabled")
      .eq("id", 1)
      .single();
    if (!config?.marketplace_enabled) throw new Error("Marketplace is disabled");

    const price = Number(listing.price);
    const royalty = (price * (config.royalty_bps ?? 0)) / 10_000;
    const platformFee = (price * (config.platform_fee_bps ?? 0)) / 10_000;
    const sellerAmount = price - royalty - platformFee;

    const { data: sale, error: sErr } = await supabaseAdmin
      .from("sales")
      .insert({
        nft_id: listing.nft_id,
        listing_id: listing.id,
        buyer_user_id: context.userId,
        buyer_wallet: data.buyerWallet,
        seller_wallet: listing.seller_wallet,
        price,
        royalty_amount: royalty,
        platform_fee_amount: platformFee,
        seller_amount: sellerAmount,
        signature: data.signature ?? null,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (sErr) throw new Error(sErr.message);

    // Mark listing sold, transfer NFT ownership
    await supabaseAdmin.from("listings").update({ status: "sold" }).eq("id", listing.id);
    await supabaseAdmin
      .from("nfts")
      .update({
        owner_user_id: context.userId,
        owner_wallet: data.buyerWallet,
        list_price: null,
        listed_at: null,
      })
      .eq("id", listing.nft_id);

    return sale;
  });

export const listActiveListings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await client
    .from("listings")
    .select("id, nft_id, price, seller_wallet, created_at, nfts(name, image_url, rarity, token_id)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminListAllListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("listings")
      .select("*, nfts(name, token_id)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("sales")
      .select("*, nfts(name, token_id)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
