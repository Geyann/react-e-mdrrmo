import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ══════════════════════════════════════════════════════════════════
   CONFIG
   ══════════════════════════════════════════════════════════════════ */

const PASSWORD_SALT = "hackerai-salt-2024";

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const allowedOrigins = (
  Deno.env.get("ALLOWED_ORIGIN") || DEFAULT_ORIGINS.join(",")
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/* ══════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════ */

type JsonBody = Record<string, unknown>;

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const rawText = (value: unknown) => String(value ?? "").trim();

const cleanLower = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

const errorCode = (error: unknown) => {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }
  return "";
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error || "Unknown error");
};

const generateRandomPassword = (length = 16) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    password += chars[randomValues[i] % chars.length];
  }
  return password;
};

const hashSalted = async (password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${password}${PASSWORD_SALT}`);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const hashUnsalted = async (password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/* ══════════════════════════════════════════════════════════════════
   CORS
   ══════════════════════════════════════════════════════════════════ */

const getCorsHeaders = (request: Request) => {
  const requestOrigin = rawText(request.headers.get("origin")).replace(
    /\/+$/,
    "",
  );

  let allowOrigin = "*";

  if (requestOrigin) {
    allowOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : "";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, accept, x-supabase-api-version, x-request-id",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "content-type",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
};

const jsonResponse = (
  body: JsonBody,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

/* ══════════════════════════════════════════════════════════════════
   ADMIN LOOKUP
   ══════════════════════════════════════════════════════════════════ */

const findAdmin = async (
  supabase: ReturnType<typeof createClient>,
  {
    workId,
    username,
    email,
  }: { workId: string; username: string; email: string },
) => {
  const lookups: Array<{ column: string; value: string; ilike?: boolean }> = [];

  if (workId) {
    lookups.push({ column: "custom_id", value: workId });
  }
  if (username) {
    lookups.push({ column: "username", value: username });
  }
  if (email) {
    lookups.push({ column: "email", value: email, ilike: true });
  }

  for (const lookup of lookups) {
    const query = supabase
      .from("admin_users")
      .select("id, user_id, email, custom_id, username, password, role")
      .limit(1);

    const filtered = lookup.ilike
      ? query.ilike(lookup.column, lookup.value)
      : query.eq(lookup.column, lookup.value);

    const { data, error } = await filtered;

    if (error) {
      console.error("[approve-registration] admin lookup error", {
        column: lookup.column,
        value: lookup.value,
        message: error.message,
      });
      continue;
    }

    if (data && data[0]) {
      return data[0];
    }
  }

  return null;
};

/* ══════════════════════════════════════════════════════════════════
   EDGE FUNCTION
   ══════════════════════════════════════════════════════════════════ */

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);
  const requestId =
    rawText(request.headers.get("x-request-id")) ||
    crypto.randomUUID().slice(0, 8);

  /* ── Preflight ────────────────────────────────────────────── */

  if (request.method === "OPTIONS") {
    if (!corsHeaders["Access-Control-Allow-Origin"]) {
      return new Response(null, { status: 403, headers: corsHeaders });
    }
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { success: false, error: "Method not allowed." },
      405,
      corsHeaders,
    );
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    console.warn(
      `[approve-registration][${requestId}] origin not allowed:`,
      request.headers.get("origin"),
    );
    return jsonResponse(
      {
        success: false,
        error:
          "Origin is not allowed. Add this origin to ALLOWED_ORIGIN and redeploy.",
      },
      403,
      corsHeaders,
    );
  }

  /* ── Parse body ───────────────────────────────────────────── */

  let body: JsonBody;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse(
        { success: false, error: "Invalid JSON body." },
        400,
        corsHeaders,
      );
    }
    body = parsed as JsonBody;
  } catch {
    return jsonResponse(
      { success: false, error: "Invalid JSON body." },
      400,
      corsHeaders,
    );
  }

  const registrationId = rawText(body.registration_id);
  const requesterWorkId = rawText(body.requester_work_id);
  const requesterUsername = rawText(body.requester_username);
  const requesterEmail = cleanLower(body.requester_email);
  const requesterPassword = String(body.requester_password || "");

  if (!registrationId) {
    return jsonResponse(
      { success: false, error: "registration_id is required." },
      400,
      corsHeaders,
    );
  }

  if (!requesterPassword) {
    return jsonResponse(
      { success: false, error: "requester_password is required." },
      400,
      corsHeaders,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      `[approve-registration][${requestId}] server configuration missing`,
    );
    return jsonResponse(
      { success: false, error: "Server configuration missing." },
      500,
      corsHeaders,
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    /* ── 1. Locate the admin ──────────────────────────────── */

    const admin = await findAdmin(supabase, {
      workId: requesterWorkId,
      username: requesterUsername,
      email: requesterEmail,
    });

    if (!admin) {
      console.warn(
        `[approve-registration][${requestId}] admin not found`,
        { requesterWorkId, requesterUsername, requesterEmail },
      );
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized: administrator account not found.",
        },
        401,
        corsHeaders,
      );
    }

    /* ── 2. Verify the admin password ─────────────────────── */

    const salted = await hashSalted(requesterPassword);
    const unsalted = await hashUnsalted(requesterPassword);
    const stored = rawText(admin.password);

    if (stored !== salted && stored !== unsalted) {
      console.warn(
        `[approve-registration][${requestId}] invalid admin password`,
      );
      return jsonResponse(
        { success: false, error: "Invalid administrator password." },
        401,
        corsHeaders,
      );
    }

    /* ── 3. Locate the pending registration ───────────────── */

    const { data: reg, error: regError } = await supabase
      .from("pending_registrations")
      .select("*")
      .eq("id", registrationId)
      .maybeSingle();

    if (regError) {
      console.error(
        `[approve-registration][${requestId}] registration lookup error`,
        regError.message,
      );
      return jsonResponse(
        { success: false, error: "Registration lookup failed." },
        500,
        corsHeaders,
      );
    }

    if (!reg) {
      return jsonResponse(
        { success: false, error: "Registration not found." },
        404,
        corsHeaders,
      );
    }

    if (reg.status === "approved") {
      return jsonResponse(
        {
          success: true,
          created: false,
          message: "Account is already approved.",
        },
        200,
        corsHeaders,
      );
    }

    const fullName =
      reg.full_name ||
      [reg.first_name, reg.middle_name, reg.last_name]
        .filter(Boolean)
        .join(" ") ||
      "";

    const email = rawText(reg.email);
    const username = rawText(reg.username) || email.split("@")[0] || "";

    /* ── 4. Find or create the Supabase Auth user ─────────── */

    let authUserId = "";
    let authUserCreated = false;

    // 4a. Try by registration id (OAuth flow).
    try {
      const { data: authData } = await supabase.auth.admin.getUserById(reg.id);
      if (authData?.user) authUserId = authData.user.id;
    } catch {
      /* ignore */
    }

    // 4b. Try by email.
    if (!authUserId && email) {
      try {
        const { data: byEmail } = await supabase.auth.admin.getUserByEmail(
          email,
        );
        if (byEmail?.user) authUserId = byEmail.user.id;
      } catch {
        /* ignore */
      }
    }

    // 4c. Create a new Auth user if none exists.
    if (!authUserId && email) {
      let authPassword = rawText(reg.password);

      // A 64-char hex string is the legacy SHA-256 hash — not a valid
      // Supabase Auth password. Replace it with a random one.
      if (authPassword.length === 64 && /^[0-9a-f]+$/i.test(authPassword)) {
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
          console.error(
            `[approve-registration][${requestId}] auth user creation error`,
            authError.message,
          );
        } else if (authData?.user) {
          authUserId = authData.user.id;
          authUserCreated = true;
        }
      } catch (e) {
        console.error(
          `[approve-registration][${requestId}] auth user creation exception`,
          errorMessage(e),
        );
      }
    }

    if (!authUserId) {
      authUserId = reg.id;
    }

    /* ── 5. Upsert the profile row ────────────────────────── */

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
      id_front_image_url:
        reg.id_front_image_url || reg.id_image_url || null,
      id_back_image_url: reg.id_back_image_url || null,
      id_holder_image_url: reg.id_holder_image_url || null,
    };

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (existingProfile) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", authUserId);

      if (upErr) {
        console.error(
          `[approve-registration][${requestId}] profile update error`,
          upErr.message,
        );
      }
    } else {
      const { error: insErr } = await supabase
        .from("profiles")
        .insert(profileData);

      if (insErr) {
        console.error(
          `[approve-registration][${requestId}] profile insert error`,
          insErr.message,
        );
      }
    }

    /* ── 6. Mark the registration as approved ─────────────── */

    const { error: statusErr } = await supabase
      .from("pending_registrations")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);

    if (statusErr) {
      console.error(
        `[approve-registration][${requestId}] status update error`,
        statusErr.message,
      );
      return jsonResponse(
        {
          success: false,
          error: "Failed to update registration status.",
        },
        500,
        corsHeaders,
      );
    }

    /* ── 7. Return success ────────────────────────────────── */

    const isOAuthUser = !authUserCreated && authUserId === reg.id;

    console.log(
      `[approve-registration][${requestId}] approved registration ${registrationId}`,
      { isOAuthUser, authUserCreated },
    );

    return jsonResponse(
      {
        success: true,
        created: authUserCreated,
        isOAuthUser,
        message: isOAuthUser
          ? "Account approved. The user can now sign in with Google/Facebook."
          : "Account approved successfully.",
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error(
      `[approve-registration][${requestId}] unhandled error`,
      errorMessage(error),
      { code: errorCode(error) },
    );

    return jsonResponse(
      { success: false, error: "Internal server error." },
      500,
      corsHeaders,
    );
  }
});