import { supabase } from "./supabase";

export async function logActivity(
  action_type: string,
  entity_name: string,
  details?: Record<string, string>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  await supabase.from("activity_log").insert({
    user_id: user.id,
    user_email: user.email ?? "",
    user_role: profile?.role ?? "customer",
    action_type,
    entity_name,
    details: details ?? null,
  });
}
