import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  processCreateListing,
  processCancelListing,
  processPreflightPurchase,
  processClaimPurchase,
  processSubmitApplication,
  type DB,
} from "@/lib/marketplace.logic";

async function getAdmin(): Promise<DB> {
  const { validateAdminKey, supabaseAdmin } = await import("@/integrations/supabase/client.server");
  validateAdminKey();
  return supabaseAdmin as unknown as DB;
}

async function logFailure(action: string, metadata: Record<string, unknown>) {
  try {
    const admin = await getAdmin();
    await admin
      .from("audit_logs")
      .insert({ action, entity_type: "marketplace", metadata: metadata as never });
  } catch (logErr) {
    console.error(`[marketplace] audit log insert failed:`, logErr instanceof Error ? logErr.message : logErr);
  }
}

// ─── Listing ────────────────────────────────────────────────────────────────

const CreateListingInput = z.object({
  walletAddress: z.string().min(32),
  nftId: z.string().uuid(),
  price: z.number().positive(),
  category: z.string().max(64).optional(),
  description: z.string().max(2000).optional(),
});

export const createListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => CreateListingInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processCreateListing({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[createListing] FAILED", { ...data, error: message });
      await logFailure("listing_create_failed", { ...data, error: message });
      throw err;
    }
  });

const CancelListingInput = z.object({
  walletAddress: z.string().min(32),
  listingId: z.string().uuid(),
});

export const cancelListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => CancelListingInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processCancelListing({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[cancelListing] FAILED", { ...data, error: message });
      throw err;
    }
  });

// ─── Purchase ───────────────────────────────────────────────────────────────

const PreflightPurchaseInput = z.object({
  listingId: z.string().uuid(),
  buyerWallet: z.string().min(32),
});

export const preflightPurchase = createServerFn({ method: "POST" })
  .validator((data: unknown) => PreflightPurchaseInput.parse(data))
  .handler(async ({ data }) => processPreflightPurchase({ ...data, getAdmin }));

const ClaimPurchaseInput = z.object({
  listingId: z.string().uuid(),
  buyerWallet: z.string().min(32),
  signature: z.string().min(32),
});

export const claimPurchase = createServerFn({ method: "POST" })
  .validator((data: unknown) => ClaimPurchaseInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processClaimPurchase({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[claimPurchase] FAILED", { ...data, error: message });
      await logFailure("purchase_failed", { ...data, error: message });
      throw err;
    }
  });

// ─── Community collection applications ─────────────────────────────────────

const SubmitApplicationInput = z.object({
  projectName: z.string().min(1).max(120),
  collectionName: z.string().min(1).max(120),
  website: z.string().url().optional().or(z.literal("")),
  xAccount: z.string().max(120).optional(),
  telegram: z.string().max(120).optional(),
  contractAddress: z.string().max(200).optional(),
  creatorWallet: z.string().min(32),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
  signature: z.string().min(32),
});

export const submitApplication = createServerFn({ method: "POST" })
  .validator((data: unknown) => SubmitApplicationInput.parse(data))
  .handler(async ({ data }) => {
    try {
      return await processSubmitApplication({ ...data, getAdmin });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[submitApplication] FAILED", { ...data, error: message });
      await logFailure("application_submit_failed", { ...data, error: message });
      throw err;
    }
  });

// ─── Admin actions ──────────────────────────────────────────────────────────
// These require an authenticated Supabase session with the admin role. RLS on
// every underlying table already restricts writes to admins for the anon/auth
// client, but these run through the admin client for atomic multi-step updates
// (e.g. approving an application also creates the collection row).

const AdminAuthedInput = z.object({ requesterId: z.string().uuid() });

async function assertAdmin(admin: DB, requesterId: string) {
  const { data, error } = await admin.rpc("has_role", { _user_id: requesterId, _role: "admin" });
  if (error) throw new Error(`Failed to verify admin role: ${error.message}`);
  if (!data) throw new Error("Admin privileges required");
}

const ApproveApplicationInput = AdminAuthedInput.extend({ applicationId: z.string().uuid() });

export const adminApproveApplication = createServerFn({ method: "POST" })
  .validator((data: unknown) => ApproveApplicationInput.parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    await assertAdmin(admin, data.requesterId);

    const { data: app, error } = await admin
      .from("collection_applications")
      .select("*")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (error) throw new Error(`Database error: ${error.message}`);
    if (!app) throw new Error("Application not found");
    if (app.status !== "pending") throw new Error("Application already reviewed");

    const slugBase = app.collection_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let slug = slugBase || `collection-${app.id.slice(0, 8)}`;
    const { data: clash } = await admin.from("collections").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${app.id.slice(0, 6)}`;

    const { data: collection, error: collErr } = await admin
      .from("collections")
      .insert({
        slug,
        project_name: app.project_name,
        collection_name: app.collection_name,
        description: app.description,
        logo_url: app.logo_url,
        banner_url: app.banner_url,
        website: app.website,
        x_account: app.x_account,
        telegram: app.telegram,
        contract_address: app.contract_address,
        creator_wallet: app.creator_wallet,
        is_official: false,
        verified: true,
        status: "active",
      })
      .select("id")
      .single();
    if (collErr) throw new Error(`Failed to create collection: ${collErr.message}`);

    await admin
      .from("collection_applications")
      .update({
        status: "approved",
        reviewed_by: data.requesterId,
        reviewed_at: new Date().toISOString(),
        collection_id: collection.id,
      })
      .eq("id", data.applicationId);

    return { ok: true as const, collectionId: collection.id };
  });

const RejectApplicationInput = AdminAuthedInput.extend({
  applicationId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const adminRejectApplication = createServerFn({ method: "POST" })
  .validator((data: unknown) => RejectApplicationInput.parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    await assertAdmin(admin, data.requesterId);
    const { error } = await admin
      .from("collection_applications")
      .update({
        status: "rejected",
        rejection_reason: data.reason || null,
        reviewed_by: data.requesterId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.applicationId)
      .eq("status", "pending");
    if (error) throw new Error(`Failed to reject application: ${error.message}`);
    return { ok: true as const };
  });

const ListingModerationInput = AdminAuthedInput.extend({
  listingId: z.string().uuid(),
});

export const adminRemoveListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => ListingModerationInput.parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    await assertAdmin(admin, data.requesterId);
    const { error } = await admin
      .from("listings")
      .update({ status: "removed" })
      .eq("id", data.listingId);
    if (error) throw new Error(`Failed to remove listing: ${error.message}`);
    return { ok: true as const };
  });

export const adminRestoreListing = createServerFn({ method: "POST" })
  .validator((data: unknown) => ListingModerationInput.parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    await assertAdmin(admin, data.requesterId);
    const { error } = await admin
      .from("listings")
      .update({ status: "active" })
      .eq("id", data.listingId)
      .in("status", ["removed", "cancelled"]);
    if (error) throw new Error(`Failed to restore listing: ${error.message}`);
    return { ok: true as const };
  });

const CollectionFlagsInput = AdminAuthedInput.extend({
  collectionId: z.string().uuid(),
  verified: z.boolean().optional(),
  featured: z.boolean().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export const adminSetCollectionFlags = createServerFn({ method: "POST" })
  .validator((data: unknown) => CollectionFlagsInput.parse(data))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    await assertAdmin(admin, data.requesterId);
    const patch: Record<string, unknown> = {};
    if (data.verified !== undefined) patch.verified = data.verified;
    if (data.featured !== undefined) patch.featured = data.featured;
    if (data.status !== undefined) patch.status = data.status;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await admin
      .from("collections")
      .update(patch as never)
      .eq("id", data.collectionId);
    if (error) throw new Error(`Failed to update collection: ${error.message}`);
    return { ok: true as const };
  });
