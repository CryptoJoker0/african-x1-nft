import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, logAdminAction } from "./admin-guard.server";

const RARITY = z.enum(["legendary", "elite", "rare", "uncommon", "common"]);

const NftBase = z.object({
  name: z.string().min(1).max(200),
  token_id: z.number().int().min(0),
  description: z.string().max(2000).optional().nullable(),
  image_url: z.string().url().max(1000).optional().nullable(),
  animation_url: z.string().url().max(1000).optional().nullable(),
  external_url: z.string().url().max(1000).optional().nullable(),
  metadata_uri: z.string().url().max(1000).optional().nullable(),
  rarity: RARITY.default("common"),
  is_featured: z.boolean().default(false),
  traits: z.record(z.string(), z.any()).default({}),
});

export const createNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NftBase.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("nfts")
      .insert({ ...data, creator_user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAdminAction("nft.create", "nft", row.id, { name: row.name, token_id: row.token_id });
    return row;
  });

export const updateNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), patch: NftBase.partial() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("nfts")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logAdminAction("nft.update", "nft", data.id, { fields: Object.keys(data.patch) });
    return row;
  });

export const deleteNft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("nfts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAdminAction("nft.delete", "nft", data.id);
    return { ok: true };
  });

// Returns a signed upload URL to nft-artwork. Admin only.
export const createArtworkUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      filename: z.string().min(1).max(200).regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename"),
      contentType: z.string().min(1).max(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${Date.now()}-${data.filename}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("nft-artwork")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("nft-artwork").getPublicUrl(path);
    return { signedUrl: signed.signedUrl, path: signed.path, publicUrl: pub.publicUrl };
  });

export const listAllNfts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("nfts")
      .select("*")
      .order("token_id", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
