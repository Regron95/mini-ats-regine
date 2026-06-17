import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, password, role, company_id } = await req.json();

    if (!email || !password) {
      return json({ error: "E-post och lösenord krävs" });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return json({ error: authError.message });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: authData.user.email,
        role: role ?? "customer",
        company_id: company_id ?? null,
      });

    if (profileError) {
      return json({ error: "Användare skapad men profil misslyckades: " + profileError.message });
    }

    return json({ user: { id: authData.user.id, email: authData.user.email } });
  } catch (err) {
    return json({ error: String(err) });
  }
});
