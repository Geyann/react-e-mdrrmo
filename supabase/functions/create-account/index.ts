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
  Deno.env.get("ALLOWED_ORIGIN") ||
  DEFAULT_ORIGINS.join(",")
)
  .split(",")
  .map((origin) =>
    origin.trim().replace(/\/+$/, ""),
  )
  .filter(Boolean);

const serviceRole = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

type JsonBody = Record<string, unknown>;

type AccountIdentity = {
  workId: string;
  username: string;
  email: string;
};

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const clean = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const rawText = (value: unknown) =>
  String(value ?? "").trim();

const normalizeUsername = (value: unknown) =>
  rawText(value).toLowerCase();

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const errorCode = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(
      (error as { code?: unknown }).code || "",
    );
  }

  return "";
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "Unknown error");
};

const hashSalted = async (password: string) => {
  const encoded = new TextEncoder().encode(
    `${password}${PASSWORD_SALT}`,
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
};

const hashUnsalted = async (password: string) => {
  const encoded = new TextEncoder().encode(
    password,
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded,
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
};

const firstRow = async (query: any) => {
  const { data, error } = await query.limit(1);

  if (error) {
    throw new HttpError(error.message, 500);
  }

  return data?.[0] || null;
};

const uniqueRows = (
  rows: unknown[],
  table: string,
) => {
  const map = new Map<string, any>();

  rows.filter(Boolean).forEach((row: any) => {
    map.set(`${table}:${String(row.id)}`, row);
  });

  if (map.size > 1) {
    throw new HttpError(
      "The Work ID, username, or email matches more than one account.",
      409,
    );
  }

  return [...map.values()][0] || null;
};

/* ══════════════════════════════════════════════════════════════════
   CORS
   ══════════════════════════════════════════════════════════════════ */

const getCorsHeaders = (request: Request) => {
  const requestOrigin = rawText(
    request.headers.get("origin"),
  ).replace(/\/+$/, "");

  let allowOrigin = "*";

  if (requestOrigin) {
    allowOrigin = allowedOrigins.includes(
      requestOrigin,
    )
      ? requestOrigin
      : "";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, accept, x-supabase-api-version",
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
   STAFF LOOKUP
   ══════════════════════════════════════════════════════════════════ */

const findStaffAccount = async ({
  workId,
  username,
  email,
}: AccountIdentity) => {
  const columns =
    "id, user_id, username, email, password, full_name, role, department, is_active, mobile_number, created_at";

  const candidates = await Promise.all([
    workId
      ? firstRow(
          serviceRole
            .from("staff_users")
            .select(columns)
            .eq("user_id", workId),
        )
      : null,

    username
      ? firstRow(
          serviceRole
            .from("staff_users")
            .select(columns)
            .eq("username", username),
        )
      : null,

    email
      ? firstRow(
          serviceRole
            .from("staff_users")
            .select(columns)
            .ilike("email", email),
        )
      : null,
  ]);

  return uniqueRows(candidates, "staff_users");
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN LOOKUP
   ══════════════════════════════════════════════════════════════════ */

const findAdminAccount = async ({
  workId,
  username,
  email,
}: AccountIdentity) => {
  const columns =
    "id, email, full_name, role, custom_id, user_id, username, password, created_at, updated_at";

  const candidates = await Promise.all([
    workId
      ? firstRow(
          serviceRole
            .from("admin_users")
            .select(columns)
            .eq("custom_id", workId),
        )
      : null,

    username
      ? firstRow(
          serviceRole
            .from("admin_users")
            .select(columns)
            .eq("username", username),
        )
      : null,

    email
      ? firstRow(
          serviceRole
            .from("admin_users")
            .select(columns)
            .ilike("email", email),
        )
      : null,

    isUuid(workId)
      ? firstRow(
          serviceRole
            .from("admin_users")
            .select(columns)
            .eq("user_id", workId),
        )
      : null,
  ]);

  return uniqueRows(candidates, "admin_users");
};

/* ══════════════════════════════════════════════════════════════════
   RESIDENT / PENDING CONFLICT LOOKUP
   ══════════════════════════════════════════════════════════════════ */

const findResidentIdentity = async ({
  workId,
  username,
  email,
}: AccountIdentity) => {
  const candidates = await Promise.all([
    workId
      ? firstRow(
          serviceRole
            .from("profiles")
            .select("id, user_id, username, email, full_name")
            .eq("user_id", workId),
        )
      : null,

    username
      ? firstRow(
          serviceRole
            .from("profiles")
            .select("id, user_id, username, email, full_name")
            .eq("username", username),
        )
      : null,

    email
      ? firstRow(
          serviceRole
            .from("profiles")
            .select("id, user_id, username, email, full_name")
            .ilike("email", email),
        )
      : null,

    workId
      ? firstRow(
          serviceRole
            .from("pending_registrations")
            .select("id, user_id, username, email")
            .eq("user_id", workId),
        )
      : null,

    username
      ? firstRow(
          serviceRole
            .from("pending_registrations")
            .select("id, user_id, username, email")
            .eq("username", username),
        )
      : null,

    email
      ? firstRow(
          serviceRole
            .from("pending_registrations")
            .select("id, user_id, username, email")
            .ilike("email", email),
        )
      : null,
  ]);

  const profileCandidates = candidates
    .slice(0, 3)
    .filter(Boolean);

  const pendingCandidates = candidates
    .slice(3)
    .filter(Boolean);

  const profile = uniqueRows(
    profileCandidates,
    "profiles",
  );

  const pending = uniqueRows(
    pendingCandidates,
    "pending_registrations",
  );

  if (profile && pending) {
    throw new HttpError(
      "This username, Work ID, or email already belongs to resident accounts.",
      409,
    );
  }

  return profile || pending || null;
};

/* ══════════════════════════════════════════════════════════════════
   AUTH USER LOOKUP
   ══════════════════════════════════════════════════════════════════ */

const findAuthUserByEmail = async (
  email: string,
) => {
  if (!email) return null;

  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } =
      await serviceRole.auth.admin.listUsers({
        page,
        perPage,
      });

    if (error) {
      throw new HttpError(error.message, 500);
    }

    const found = (data?.users || []).find(
      (user) => clean(user.email) === clean(email),
    );

    if (found) return found;

    if (
      !data?.users ||
      data.users.length < perPage
    ) {
      break;
    }
  }

  return null;
};

/* ══════════════════════════════════════════════════════════════════
   AUTHORIZE THE CURRENT ADMINISTRATOR
   ══════════════════════════════════════════════════════════════════ */

const authorizeAdministrator = async (
  request: Request,
  body: JsonBody,
) => {
  const authorization = rawText(
    request.headers.get("Authorization"),
  );

  const bearerToken = authorization
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (bearerToken) {
    try {
      const { data, error } =
        await serviceRole.auth.getUser(
          bearerToken,
        );

      if (!error && data?.user) {
        const authUser = data.user;
        const authEmail = clean(authUser.email);

        const adminRow = await firstRow(
          serviceRole
            .from("admin_users")
            .select("id, role")
            .eq("id", authUser.id),
        );

        if (
          adminRow &&
          clean(adminRow.role) === "admin"
        ) {
          return;
        }

        const profileRow = await firstRow(
          serviceRole
            .from("profiles")
            .select("id, role")
            .eq("id", authUser.id),
        );

        if (
          profileRow &&
          clean(profileRow.role) === "admin"
        ) {
          return;
        }

        if (authEmail) {
          const staffRow = await firstRow(
            serviceRole
              .from("staff_users")
              .select("role, is_active")
              .ilike("email", authEmail),
          );

          if (
            staffRow &&
            clean(staffRow.role) === "admin" &&
            staffRow.is_active !== false
          ) {
            return;
          }
        }

        throw new HttpError(
          "Administrator access is required.",
          403,
        );
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      // Expected for the anon/publishable key.
    }
  }

  const requesterWorkId = rawText(
    body.requester_work_id,
  );

  const requesterUsername =
    normalizeUsername(
      body.requester_username,
    );

  const requesterEmail = clean(
    body.requester_email,
  );

  const requesterPassword = String(
    body.requester_password || "",
  );

  if (
    (!requesterWorkId &&
      !requesterUsername &&
      !requesterEmail) ||
    !requesterPassword
  ) {
    throw new HttpError(
      "Current administrator credentials are required.",
      400,
    );
  }

  const identity: AccountIdentity = {
    workId: requesterWorkId,
    username: requesterUsername,
    email: requesterEmail,
  };

  const requester =
    (await findAdminAccount(identity)) ||
    (await findStaffAccount(identity));

  if (!requester) {
    throw new HttpError(
      "Administrator account not found.",
      403,
    );
  }

  if (clean(requester.role) !== "admin") {
    throw new HttpError(
      "Administrator access is required.",
      403,
    );
  }

  if (requester.is_active === false) {
    throw new HttpError(
      "Your administrator account is inactive.",
      403,
    );
  }

  const saltedHash =
    await hashSalted(requesterPassword);

  const unsaltedHash =
    await hashUnsalted(requesterPassword);

  if (
    String(requester.password || "") !==
      saltedHash &&
    String(requester.password || "") !==
      unsaltedHash
  ) {
    throw new HttpError(
      "The current administrator password is incorrect.",
      403,
    );
  }
};

/* ══════════════════════════════════════════════════════════════════
   VALIDATE INPUT
   ══════════════════════════════════════════════════════════════════ */

const validateInput = (body: JsonBody) => {
  const accountType = clean(
    body.account_type,
  );

  if (
    accountType !== "staff" &&
    accountType !== "admin"
  ) {
    throw new HttpError(
      "Account type must be staff or admin.",
      400,
    );
  }

  const workId = rawText(body.work_id);
  const username =
    normalizeUsername(body.username);
  const fullName = rawText(body.full_name);
  const email = clean(body.email);
  const password = String(
    body.password || "",
  );
  const department =
    rawText(body.department) || null;
  const mobileNumber =
    rawText(body.mobile_number) || null;

  if (workId.length < 3) {
    throw new HttpError(
      "Work ID must contain at least 3 characters.",
      400,
    );
  }

  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new HttpError(
      "Username must be 3–50 characters and contain only letters, numbers, dots, underscores, or hyphens.",
      400,
    );
  }

  if (fullName.length < 2) {
    throw new HttpError(
      "Full name is required.",
      400,
    );
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new HttpError(
      "A valid email address is required.",
      400,
    );
  }

  if (password.length < 6) {
    throw new HttpError(
      "Password must be at least 6 characters.",
      400,
    );
  }

  return {
    accountType,
    workId,
    username,
    fullName,
    email,
    password,
    department,
    mobileNumber,
  };
};

/* ══════════════════════════════════════════════════════════════════
   STAFF CREATE / UPDATE
   ══════════════════════════════════════════════════════════════════ */

const saveStaffAccount = async (input: {
  workId: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
  department: string | null;
  mobileNumber: string | null;
}) => {
  const identity: AccountIdentity = {
    workId: input.workId,
    username: input.username,
    email: input.email,
  };

  const existing =
    await findStaffAccount(identity);

  const adminConflict =
    await findAdminAccount(identity);

  if (adminConflict) {
    throw new HttpError(
      "This Work ID, username, or email already belongs to an administrator.",
      409,
    );
  }

  const residentConflict =
    await findResidentIdentity(identity);

  if (residentConflict) {
    throw new HttpError(
      "This Work ID, username, or email already belongs to a resident account.",
      409,
    );
  }

  const authConflict =
    await findAuthUserByEmail(input.email);

  if (authConflict) {
    throw new HttpError(
      "An Auth account with that email already exists.",
      409,
    );
  }

  const passwordHash =
    await hashSalted(input.password);

  if (existing) {
    const { data: updated, error } =
      await serviceRole
        .from("staff_users")
        .update({
          user_id: input.workId,
          username: input.username,
          email: input.email,
          password: passwordHash,
          full_name: input.fullName,
          role: "staff",
          department:
            input.department ??
            existing.department,
          mobile_number:
            input.mobileNumber ??
            existing.mobile_number,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

    if (error) {
      throw new HttpError(error.message, 409);
    }

    return {
      created: false,
      row: updated,
      message:
        "Staff account updated successfully. No duplicate was created.",
    };
  }

  const { data: created, error } =
    await serviceRole
      .from("staff_users")
      .insert([
        {
          user_id: input.workId,
          username: input.username,
          email: input.email,
          password: passwordHash,
          full_name: input.fullName,
          role: "staff",
          department: input.department,
          is_active: true,
          mobile_number:
            input.mobileNumber,
        },
      ])
      .select("*")
      .single();

  if (error) {
    throw new HttpError(error.message, 409);
  }

  return {
    created: true,
    row: created,
    message:
      "Staff account created successfully in staff_users.",
  };
};

/* ══════════════════════════════════════════════════════════════════
   ADMIN CREATE / UPDATE
   ══════════════════════════════════════════════════════════════════ */

const saveAdminAccount = async (input: {
  workId: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
}) => {
  const identity: AccountIdentity = {
    workId: input.workId,
    username: input.username,
    email: input.email,
  };

  const existing =
    await findAdminAccount(identity);

  const staffConflict =
    await findStaffAccount(identity);

  if (staffConflict) {
    throw new HttpError(
      "This Work ID, username, or email already belongs to a staff account.",
      409,
    );
  }

  const residentConflict =
    await findResidentIdentity(identity);

  if (residentConflict) {
    throw new HttpError(
      "This Work ID, username, or email already belongs to a resident account.",
      409,
    );
  }

  const passwordHash =
    await hashSalted(input.password);

  if (existing) {
    const { data: updated, error } =
      await serviceRole
        .from("admin_users")
        .update({
          custom_id: input.workId,
          username: input.username,
          email: input.email,
          full_name: input.fullName,
          role: "admin",
          password: passwordHash,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

    if (error) {
      throw new HttpError(error.message, 409);
    }

    /*
     * Keep the corresponding Auth user synchronized when possible.
     * The manual admin_users password remains authoritative for
     * the existing admin/staff login.
     */
    await serviceRole.auth.admin
      .updateUserById(existing.id, {
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName,
          username: input.username,
          work_id: input.workId,
          role: "admin",
        },
      })
      .catch(() => null);

    return {
      created: false,
      row: updated,
      authUserId: existing.id,
      message:
        "Administrator account updated successfully. No duplicate was created.",
    };
  }

  let authUser =
    await findAuthUserByEmail(input.email);

  let createdAuthUser = false;

  if (!authUser) {
    const { data, error } =
      await serviceRole.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName,
          username: input.username,
          work_id: input.workId,
          role: "admin",
        },
      });

    if (error || !data?.user) {
      throw new HttpError(
        error?.message ||
          "Unable to create the Auth user.",
        409,
      );
    }

    authUser = data.user;
    createdAuthUser = true;
  } else {
    await serviceRole.auth.admin.updateUserById(
      authUser.id,
      {
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName,
          username: input.username,
          work_id: input.workId,
          role: "admin",
        },
      },
    );
  }

  const { data: created, error } =
    await serviceRole
      .from("admin_users")
      .insert([
        {
          id: authUser.id,
          email: input.email,
          full_name: input.fullName,
          role: "admin",
          custom_id: input.workId,
          user_id: authUser.id,
          username: input.username,
          password: passwordHash,
        },
      ])
      .select("*")
      .single();

  if (error) {
    if (createdAuthUser) {
      await serviceRole.auth.admin.deleteUser(
        authUser.id,
      );
    }

    throw new HttpError(error.message, 409);
  }

  return {
    created: true,
    row: created,
    authUserId: authUser.id,
    message:
      "Administrator account created successfully in admin_users.",
  };
};

/* ══════════════════════════════════════════════════════════════════
   EDGE FUNCTION
   ══════════════════════════════════════════════════════════════════ */

Deno.serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);

  if (
    request.method === "OPTIONS" &&
    corsHeaders["Access-Control-Allow-Origin"]
  ) {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
      corsHeaders,
    );
  }

  if (!corsHeaders["Access-Control-Allow-Origin"]) {
    return jsonResponse(
      { error: "Origin is not allowed." },
      403,
      corsHeaders,
    );
  }

  let body: JsonBody;

  try {
    const parsed = await request.json();

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return jsonResponse(
        { error: "Invalid JSON body." },
        400,
        corsHeaders,
      );
    }

    body = parsed as JsonBody;
  } catch {
    return jsonResponse(
      { error: "Invalid JSON body." },
      400,
      corsHeaders,
    );
  }

  try {
    await authorizeAdministrator(request, body);

    const input = validateInput(body);

    if (input.accountType === "staff") {
      const result =
        await saveStaffAccount(input);

      return jsonResponse(
        {
          success: true,
          created: result.created,
          action: result.created
            ? "created"
            : "updated",
          account_type: "staff",
          table: "staff_users",
          account_id: result.row.id,
          username: result.row.username,
          message: result.message,
        },
        200,
        corsHeaders,
      );
    }

    const result =
      await saveAdminAccount(input);

    return jsonResponse(
      {
        success: true,
        created: result.created,
        action: result.created
          ? "created"
          : "updated",
        account_type: "admin",
        table: "admin_users",
        account_id: result.row.id,
        auth_user_id: result.authUserId,
        username: result.row.username,
        message: result.message,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    if (errorCode(error) === "23505") {
      return jsonResponse(
        {
          error:
            "That Work ID, username, or email already exists. No duplicate account was created.",
        },
        409,
        corsHeaders,
      );
    }

    const status =
      error instanceof HttpError
        ? error.status
        : 500;

    console.error("create-account error:", error);

    return jsonResponse(
      {
        error: errorMessage(error),
      },
      status,
      corsHeaders,
    );
  }
});
