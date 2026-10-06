import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Generate a random password of the given length.
 */
function generateRandomPassword(length = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
}

/* ─────────────────────────────────────────────────────────────
   CORS headers — MUST be on every response
───────────────────────────────────────────────────────────── */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, apikey, Authorization",
};

Deno.serve(async (req) => {
  /* ── Handle preflight OPTIONS request ────────────────────── */

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed." }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 405,
      },
    );
  }

  try {
    const {
      registration_id,
      requester_work_id,
      requester_username,
      requester_email,
      requester_password,
    } = await req.json();

    if (!registration_id) {
      return new Response(
        JSON.stringify({ success: false, error: "registration_id is required." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 },
      );
    }

    if (!requester_password) {
      return new Response(
        JSON.stringify({ success: false, error: "requester_password is required." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration missing." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    /* ── 1. Find the admin ───────────────────────────────────── */

    const lookups = [
      requester_work_id
        ? { column: "custom_id", value: requester_work_id }
        : null,
      requester_username
        ? { column: "username", value: requester_username }
        : null,
      requester_email
        ? { column: "email", value: requester_email.toLowerCase() }
        : null,
    ].filter(Boolean) as { column: string; value: string }[];

    let adminRow = null;

    for (const lookup of lookups) {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, user_id, email, custom_id, username, password")
        .eq(lookup.column, lookup.value)
        .maybeSingle();

      if (!error && data) {
        adminRow = data;
        break;
      }
    }

    if (!adminRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: administrator account not found." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 },
      );
    }

    /* ── 2. Verify admin password ────────────────────────────── */

    const encoder = new TextEncoder();
    const salt = "hackerai-salt-2024";
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(`${requester_password}${salt}`),
    );
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (adminRow.password !== hash) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid administrator password." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 401 },
      );
    }

    /* ── 3. Find pending registration ────────────────────────── */

    const { data: reg, error: regError } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("id", registration_id)
      .maybeSingle();

    if (regError || !reg) {
      return new Response(
        JSON.stringify({ success: false, error: "Registration not found." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 404 },
      );
    }

    if (reg.status === "approved") {
      return new Response(
        JSON.stringify({ success: true, created: false, message: "Account is already approved." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const fullName =
      reg.full_name ||
      [reg.first_name, reg.middle_name, reg.last_name].filter(Boolean).join(" ") ||
      "";

    const email = reg.email || "";
    const username = reg.username || email.split("@")[0] || "";

    /* ── 4. Find or create Supabase Auth user ─────────────────── */

    let authUserId = "";
    let authUserCreated = false;

    // Try by registration id (OAuth flow)
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(reg.id);
      if (authData?.user) authUserId = authData.user.id;
    } catch {
      /* ignored */
    }

    // Try by email
    if (!authUserId && email) {
      try {
        const { data: byEmail } = await supabase.auth.admin.getUserByEmail(email);
        if (byEmail?.user) authUserId = byEmail.user.id;
      } catch {
        /* ignored */
      }
    }

    // Create new auth user if none exists
    if (!authUserId) {
      let authPassword = reg.password || "";

      if (authPassword.length === 64 && /^[0-9a-f]+$/.test(authPassword)) {
        authPassword = generateRandomPassword(16);
      }

      if (!authPassword) {
        authPassword = generateRandomPassword(16);
      }

      try {
        const { data: authData, error: authError } =
          await supabase.auth.admin.createUser({
            email,
            password: authPassword,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              first_name: reg.first_name || "",
              middle_name: reg.middle_name || "",
              last_name: reg.last_name || "",
              username,
              role: "user",
            },
          });

        if (authError) {
          console.error("Auth creation error:", authError);
        } else if (authData?.user) {
          authUserId = authData.user.id;
          authUserCreated = true;
        }
      } catch (e) {
        console.error("Auth creation exception:", e);
      }
    }

    if (!authUserId) {
      authUserId = reg.id;
    }

    /* ── 5. Create or update profiles record ────────────────── */

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    const profileData = {
      id: authUserId,
      full_name: fullName,
      first_name: reg.first_name || "",
      middle_name: reg.middle_name || "",
      last_name: reg.last_name || "",
      email,
      role: "user",
      age: reg.age,
      birthdate: reg.birthdate || null,
      address: reg.address || null,
      mobile_number: reg.mobile_number || null,
      user_id: reg.user_id || username || null,
      is_active: true,
      username,
      profile_picture: reg.profile_picture || null,
      id_type: reg.id_type || null,
      id_front_image_url: reg.id_front_image_url || reg.id_image_url || null,
      id_back_image_url: reg.id_back_image_url || null,
      id_holder_image_url: reg.id_holder_image_url || null,
      created_at: new Date().toISOString(),
    };

    if (existingProfile) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", authUserId);

      if (upErr) console.error("Profile update error:", upErr);
    } else {
      const { error: insErr } = await supabase
        .from("profiles")
        .insert(profileData);

      if (insErr) console.error("Profile insert error:", insErr);
    }

    /* ── 6. Mark registration as approved ───────────────────── */

    const { error: statusErr } = await supabase
      .from("pending_registrations")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration_id);

    if (statusErr) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update registration status." }),
        { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 },
      );
    }

    /* ── 7. Return success ────────────────────────────────────── */

    const isOAuthUser = !authUserCreated && authUserId === reg.id;

    return new Response(
      JSON.stringify({
        success: true,
        created: authUserCreated,
        isOAuthUser,
        message: isOAuthUser
          ? "Account approved. The user can now sign in with Google/Facebook."
          : "Account approved successfully.",
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("approve-registration error:", e);

    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 500 },
    );
  }
});
