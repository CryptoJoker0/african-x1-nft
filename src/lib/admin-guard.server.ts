// Server-only helpers for admin authorization + audit logging.
// Filename ends with .server.ts so the bundler blocks it from client imports.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function assertAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin role required");
}

export async function logAdminAction(
  action: string,
  entityType: string | null,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_logs").insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata as never,
  });
}
