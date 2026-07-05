import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, logAdminAction } from "./admin-guard.server";

const Provider = z.enum(["lovable", "openai", "anthropic"]);

// Return provider + which keys are present (booleans only — never the value).
export const getAiSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("platform_settings")
      .select("ai_provider, updated_at")
      .eq("id", 1)
      .maybeSingle();
    return {
      provider: (data?.ai_provider ?? "lovable") as z.infer<typeof Provider>,
      updated_at: data?.updated_at ?? null,
      lovableKeyPresent: !!process.env.LOVABLE_API_KEY,
      openaiKeyPresent: !!process.env.OPENAI_API_KEY,
      anthropicKeyPresent: !!process.env.ANTHROPIC_API_KEY,
    };
  });

export const setAiProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: Provider }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("platform_settings")
      .upsert(
        { id: 1, ai_provider: data.provider, updated_by: context.userId, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    await logAdminAction("ai.provider.set", "settings", "1", { provider: data.provider });
    return { ok: true };
  });

export const testAiConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: Provider }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    try {
      if (data.provider === "lovable") {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return { ok: false, error: "LOVABLE_API_KEY missing" };
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 5,
          }),
        });
        return { ok: r.ok, status: r.status, error: r.ok ? null : await r.text() };
      }
      if (data.provider === "openai") {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return { ok: false, error: "OPENAI_API_KEY missing" };
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        return { ok: r.ok, status: r.status, error: r.ok ? null : await r.text() };
      }
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return { ok: false, error: "ANTHROPIC_API_KEY missing" };
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return { ok: r.ok, status: r.status, error: r.ok ? null : await r.text() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
