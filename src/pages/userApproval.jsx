"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../createClient";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Hash,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =============================================================
 * CONSTANTS
 * ============================================================= */

const PHOTO_BUCKETS = [
  "pending_ids",
  "profile-pics",
  "id-previews",
  "avatars",
  "uploads",
  "images",
];

const TABLE_PRIORITY = {
  admin_users: 4,
  staff_users: 3,
  profiles: 2,
  pending_registrations: 1,
};

const TABLE_LABELS = {
  admin_users: "Administrators",
  staff_users: "Staff Users",
  profiles: "Approved Users",
  pending_registrations: "Pending Registrations",
};

const ACCOUNT_TABLES = [
  "admin_users",
  "staff_users",
  "profiles",
  "pending_registrations",
];

const EMPTY_CREATE_FORM = {
  work_id: "",
  username: "",
  full_name: "",
  email: "",
  password: "",
  confirmPassword: "",
  department: "",
  mobile_number: "",
  requester_password: "",
  role: "staff",
};

const USERNAME_PATTERN = /^[a-z0-9._-]{3,50}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ID_TYPE_OPTIONS = [
  {
    value: "philippine-passport",
    label: "Philippine Passport",
  },
  {
    value: "drivers-license",
    label: "Driver's License / LTO ID",
  },
  {
    value: "philsys-id",
    label: "PhilSys ID",
  },
  {
    value: "umid",
    label: "UMID",
  },
  {
    value: "barangay-id",
    label: "Barangay ID",
  },
  {
    value: "voter-id",
    label: "Voter ID",
  },
  {
    value: "philhealth-id",
    label: "PhilHealth ID",
  },
  {
    value: "postal-id",
    label: "Postal ID",
  },
  {
    value: "tin",
    label: "Tax Identification Number (TIN)",
  },
  {
    value: "school-id",
    label: "School ID",
  },
  {
    value: "other-valid-id",
    label: "Other Valid ID",
  },
];

const prettyStatus = (status) => {
  const value = String(status || "pending")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");

  return value
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
};

/* =============================================================
 * HELPERS
 * ============================================================= */

const rawText = (value) =>
  String(value ?? "").trim();

const normalizeUsername = (value) =>
  rawText(value).toLowerCase();

const normalizeEmail = (value) =>
  rawText(value).toLowerCase();

const validUsername = (value) =>
  USERNAME_PATTERN.test(
    normalizeUsername(value),
  );

const getIdTypeLabel = (value) => {
  const idType = rawText(value);

  if (!idType) {
    return "Not provided";
  }

  return (
    ID_TYPE_OPTIONS.find(
      (option) => option.value === idType,
    )?.label || idType
  );
};

const readCurrentStaff = () => {
  try {
    const raw =
      localStorage.getItem("currentStaff");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const resolveImageUrl = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value);

  if (
    /^(https?:\/\/|data:image\/|blob:)/i.test(text)
  ) {
    return text;
  }

  const firstSegment = text.split("/")[0];

  if (PHOTO_BUCKETS.includes(firstSegment)) {
    try {
      const { data } = supabase.storage
        .from(firstSegment)
        .getPublicUrl(text);

      return data?.publicUrl || text;
    } catch {
      return text;
    }
  }

  for (const bucket of PHOTO_BUCKETS) {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(text);

      if (data?.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // Continue to the next possible bucket.
    }
  }

  return text;
};

const normalizePhotos = (record) => {
  const avatar =
    record.avatar_url ||
    record.profile_picture ||
    record.profile_pic ||
    record.profile_photo ||
    record.photo_url ||
    record.picture ||
    record.avatar ||
    null;

  /*
   * Front ID:
   * id_image_url remains a fallback for older records.
   */
  const idFrontPhoto =
    record.id_front_image_url ||
    record.front_id_image_url ||
    record.id_image_url ||
    record.id_photo_url ||
    record.id_preview ||
    record.id_picture ||
    record.id_photo ||
    record.id_card ||
    record.id_pic ||
    record.id_url ||
    record.identification ||
    null;

  const idBackPhoto =
    record.id_back_image_url ||
    record.back_id_image_url ||
    record.id_back ||
    record.back_id ||
    record.id_back_photo ||
    record.id_back_picture ||
    record.id_back_preview ||
    null;

  const idHolderPhoto =
    record.id_holder_image_url ||
    record.person_holding_id_image_url ||
    record.id_holder_photo ||
    record.holder_image_url ||
    record.holder_photo ||
    record.selfie_with_id ||
    null;

  return {
    avatar_url: avatar,

    // Compatibility fields.
    id_image_url: idFrontPhoto,
    id_photo_url: idFrontPhoto,

    id_front_image_url: idFrontPhoto,
    id_back_image_url: idBackPhoto,
    id_holder_image_url: idHolderPhoto,
  };
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const hashPassword = async (password) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Secure password encryption is not available in this browser.",
    );
  }

  const salt = "hackerai-salt-2024";
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${password}${salt}`,
  );

  const hashBuffer =
    await globalThis.crypto.subtle.digest(
      "SHA-256",
      data,
    );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer),
  );

  return hashArray
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
};

const parseFunctionError = async (error) => {
  if (!error) {
    return "Unknown error.";
  }

  const possibleContexts = [
    error.context,
    error.context?.response,
    error.response,
  ];

  for (const context of possibleContexts) {
    if (!context) {
      continue;
    }

    if (typeof context.json === "function") {
      try {
        const body = await context.json();

        if (body?.error) {
          return String(body.error);
        }
      } catch {
        // Continue trying other contexts.
      }
    }

    if (typeof context === "object") {
      if (context.error) {
        return String(context.error);
      }

      if (context.message) {
        return String(context.message);
      }
    }
  }

  return (
    error.message ||
    "The account could not be created."
  );
};

const getWorkId = (record, sourceTable) => {
  if (sourceTable === "admin_users") {
    return (
      record.custom_id ||
      record.username ||
      record.user_id ||
      ""
    );
  }

  if (sourceTable === "staff_users") {
    return (
      record.user_id ||
      record.username ||
      record.id ||
      ""
    );
  }

  return (
    record.user_id ||
    record.username ||
    ""
  );
};

const getAccountIdentity = ({
  email,
  username,
  workId,
  recordId,
}) => {
  return String(
    normalizeEmail(email) ||
      normalizeUsername(username) ||
      rawText(workId).toLowerCase() ||
      recordId ||
      "",
  );
};

/**
 * Copies missing photos and identity fields from a
 * lower-priority duplicate record.
 */
const mergeMissingFields = (
  primary,
  fallback,
) => {
  const merged = {
    ...primary,
  };

  const fieldsToMerge = [
    "avatar_url",
    "id_photo_url",
    "id_image_url",
    "id_front_image_url",
    "id_back_image_url",
    "id_holder_image_url",
    "id_type",
    "id_number",
    "birthdate",
    "address",
    "mobile_number",
    "age",
    "department",
    "full_name",
    "first_name",
    "middle_name",
    "last_name",
    "created_at",
    "updated_at",
  ];

  for (const field of fieldsToMerge) {
    const primaryValue = primary[field];
    const fallbackValue = fallback[field];

    const primaryMissing =
      primaryValue === null ||
      primaryValue === undefined ||
      primaryValue === "";

    if (
      primaryMissing &&
      fallbackValue !== null &&
      fallbackValue !== undefined &&
      fallbackValue !== ""
    ) {
      merged[field] = fallbackValue;
    }
  }

  return merged;
};

/* =============================================================
 * REUSABLE UI
 * ============================================================= */

function StatusBadge({ user }) {
  const status = String(
    user.status || "",
  ).toLowerCase();

  const isActive =
    status === "approved" ||
    user.is_active === true;

  const isPending =
    status === "pending" ||
    status === "pending_approval";

  const isInactive =
    status === "rejected" ||
    status === "inactive" ||
    user.is_active === false;

  let className =
    "border border-slate-200 bg-slate-100 text-slate-700";

  let label = "Unknown";

  if (isActive) {
    className =
      "border border-emerald-200 bg-emerald-100 text-emerald-700";

    label = "Active";
  } else if (isPending) {
    className =
      "border border-yellow-200 bg-yellow-100 text-yellow-700";

    label = "Pending";
  } else if (isInactive) {
    className =
      "border border-red-200 bg-red-100 text-red-700";

    label =
      status === "rejected"
        ? "Rejected"
        : "Inactive";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {label}
    </span>
  );
}

function RoleBadge({ role }) {
  const colors = {
    admin:
      "border border-purple-200 bg-purple-100 text-purple-700",
    staff:
      "border border-blue-200 bg-blue-100 text-blue-700",
    moderator:
      "border border-indigo-200 bg-indigo-100 text-indigo-700",
    user:
      "border border-emerald-200 bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-bold capitalize ${
        colors[role] ||
        "border border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {role || "user"}
    </span>
  );
}

function SmartImage({
  src,
  alt,
  className = "",
  fallback = null,
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return fallback;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function Avatar({ user, size = "md" }) {
  const sizeClasses = {
    sm: "h-9 w-9 text-sm",
    md: "h-14 w-14 text-xl",
    lg: "h-24 w-24 text-3xl",
  };

  const colorClasses =
    user.displayRole === "admin"
      ? "bg-purple-600"
      : user.displayRole === "staff"
        ? "bg-blue-600"
        : "bg-emerald-600";

  const fullName =
    user.full_name ||
    [
      user.first_name,
      user.middle_name,
      user.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    user.email ||
    "";

  const nameParts = String(fullName)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initials =
    nameParts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "?";

  const src = resolveImageUrl(user.avatar_url);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ${sizeClasses[size]} ${colorClasses}`}
    >
      <span>{initials}</span>

      {src && (
        <img
          src={src}
          alt={`${fullName || "User"} profile`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display =
              "none";
          }}
        />
      )}
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}

function PhotoCard({
  label,
  value,
  alt,
  icon: IconComponent = CreditCard,
  contain = false,
}) {
  const source = resolveImageUrl(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        <IconComponent className="h-3.5 w-3.5" />

        {label}
      </p>

      <SmartImage
        src={source}
        alt={alt}
        className={`h-48 w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 ${
          contain
            ? "object-contain"
            : "object-cover"
        }`}
        fallback={
          <div className="flex h-48 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700">
            <IconComponent className="mb-2 h-8 w-8" />

            <p className="px-3 text-center text-xs font-semibold">
              No {label.toLowerCase()}
            </p>
          </div>
        }
      />
    </div>
  );
}

function ActiveToggle({
  value,
  onToggle,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={value}
      aria-label={
        value
          ? "Set account as inactive"
          : "Set account as active"
      }
      className={`relative h-6 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        value ? "bg-green-500" : "bg-red-400"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${
          value ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

/* =============================================================
 * MAIN COMPONENT
 * ============================================================= */

export default function AdminUserManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [users, setUsers] = useState([]);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [detailsUser, setDetailsUser] =
    useState(null);

  const [showEditModal, setShowEditModal] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editForm, setEditForm] = useState({
    work_id: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    id_type: "",
    role: "user",
    is_active: true,
  });

  const [showReport, setShowReport] =
    useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [createRole, setCreateRole] =
    useState("staff");

  const [createForm, setCreateForm] = useState({
    ...EMPTY_CREATE_FORM,
  });

  const [createSaving, setCreateSaving] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [createSuccess, setCreateSuccess] =
    useState("");

  const currentStaff = useMemo(
    () => readCurrentStaff(),
    [],
  );

  const isPortalAccount = (user) =>
    user?.sourceTable === "staff_users" ||
    user?.sourceTable === "admin_users";

  const supportsIdType = (user) =>
    user?.sourceTable === "profiles" ||
    user?.sourceTable === "pending_registrations" ||
    Boolean(user?.id_type);

  const isCurrentAccount = useCallback(
    (user) => {
      if (!currentStaff || !user) {
        return false;
      }

      const currentId = String(
        currentStaff.id || "",
      );

      const sourceId = String(
        user.sourceId || "",
      );

      const currentEmail = normalizeEmail(
        currentStaff.email,
      );

      const userEmail = normalizeEmail(
        user.email,
      );

      return Boolean(
        (currentId && currentId === sourceId) ||
          (currentEmail &&
            currentEmail === userEmail),
      );
    },
    [currentStaff],
  );

  /* ===========================================================
     FETCH ALL USERS
  =========================================================== */

  const fetchAllUsers = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const results =
          await Promise.allSettled([
            supabase
              .from("admin_users")
              .select("*")
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("staff_users")
              .select("*")
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("profiles")
              .select("*")
              .order("created_at", {
                ascending: false,
              }),

            supabase
              .from("pending_registrations")
              .select("*")
              .order("created_at", {
                ascending: false,
              }),
          ]);

        const failed = [];
        const accountMap = new Map();

        const addUser = (
          record,
          sourceTable,
        ) => {
          if (!record) {
            return;
          }

          const sourceId = record.id;
          const workId = getWorkId(
            record,
            sourceTable,
          );

          const username = rawText(
            record.username,
          );

          const identity = getAccountIdentity({
            email: record.email,
            username,
            workId,
            recordId: sourceId,
          });

          if (!identity) {
            return;
          }

          const isAdminRow =
            sourceTable === "admin_users";

          const isStaffRow =
            sourceTable === "staff_users";

          const fullName =
            record.full_name ||
            [
              record.first_name,
              record.middle_name,
              record.last_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            "";

          const photos =
            normalizePhotos(record);

          const priority =
            TABLE_PRIORITY[sourceTable] || 0;

          const normalized = {
            ...record,
            ...photos,

            source: sourceTable,
            sourceTable,
            sourceId,
            databaseId: record.id,
            priority,

            workId,
            username:
              username || rawText(workId),

            full_name: fullName,

            displayRole: isAdminRow
              ? "admin"
              : isStaffRow
                ? "staff"
                : record.role || "user",

            status: isAdminRow
              ? "approved"
              : isStaffRow
                ? record.is_active === false
                  ? "inactive"
                  : "approved"
                : record.status ||
                  (record.is_active === false
                    ? "inactive"
                    : "approved"),

            is_active: isAdminRow
              ? true
              : record.is_active,

            // Never expose password hashes in the UI.
            password: null,
          };

          const key = `account:${identity}`;
          const previous =
            accountMap.get(key);

          if (!previous) {
            accountMap.set(key, normalized);
            return;
          }

          if (
            priority >
            (previous.priority || 0)
          ) {
            accountMap.set(
              key,
              mergeMissingFields(
                normalized,
                previous,
              ),
            );
            return;
          }

          accountMap.set(
            key,
            mergeMissingFields(
              previous,
              normalized,
            ),
          );
        };

        results.forEach((result, index) => {
          const table = ACCOUNT_TABLES[index];

          if (result.status === "rejected") {
            failed.push(
              TABLE_LABELS[table],
            );
            return;
          }

          if (result.value.error) {
            failed.push(
              TABLE_LABELS[table],
            );
            return;
          }

          const rows =
            result.value.data || [];

          rows.forEach((record) => {
            addUser(record, table);
          });
        });

        const sortedUsers = [
          ...accountMap.values(),
        ].sort((a, b) => {
          const aTime = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const bTime = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return bTime - aTime;
        });

        setUsers(sortedUsers);

        if (failed.length > 0) {
          setError(
            `Some account tables could not be read: ${failed.join(
              ", ",
            )}. Check your Supabase RLS policies.`,
          );
        }
      } catch (err) {
        console.error(
          "Error fetching users:",
          err,
        );

        setError(
          err?.message ||
            "Failed to load user accounts.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchAllUsers(true);
  }, [fetchAllUsers]);

  /* ===========================================================
     DERIVED FILTERS
  =========================================================== */

  const filteredUsers = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      const idTypeLabel =
        user.id_type
          ? getIdTypeLabel(user.id_type)
          : "";

      const matchesSearch =
        !query ||
        [
          user.full_name,
          user.first_name,
          user.middle_name,
          user.last_name,
          user.email,
          user.username,
          user.workId,
          user.user_id,
          user.databaseId,
          user.sourceTable,
          user.id_type,
          idTypeLabel,
          user.id_number,
        ]
          .filter(Boolean)
          .map((value) =>
            String(value).toLowerCase(),
          )
          .join(" ")
          .includes(query);

      const matchesRole =
        roleFilter === "all" ||
        user.displayRole === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        user.status === statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const stats = useMemo(() => {
    return {
      total: users.length,

      users: users.filter(
        (user) =>
          user.displayRole === "user" ||
          !user.displayRole,
      ).length,

      staff: users.filter(
        (user) =>
          user.displayRole === "staff",
      ).length,

      admins: users.filter(
        (user) =>
          user.displayRole === "admin",
      ).length,

      pending: users.filter(
        (user) =>
          user.status === "pending" ||
          user.status === "pending_approval",
      ).length,

      active: users.filter(
        (user) =>
          user.status === "approved" ||
          user.is_active === true,
      ).length,
    };
  }, [users]);

  /* ===========================================================
     EDIT ACCOUNT
  =========================================================== */

  const openEditModal = (user) => {
    setSelectedUser(user);

    setEditForm({
      work_id: rawText(
        user.workId ||
          user.user_id ||
          user.custom_id,
      ),

      username: normalizeUsername(
        user.username || user.workId,
      ),

      email: normalizeEmail(user.email),

      password: "",
      confirmPassword: "",

      full_name:
        user.full_name ||
        [
          user.first_name,
          user.middle_name,
          user.last_name,
        ]
          .filter(Boolean)
          .join(" "),

      id_type: rawText(user.id_type),

      role: user.displayRole || "user",

      is_active:
        user.is_active !== false &&
        user.status !== "rejected",
    });

    setShowPassword(false);
    setShowConfirm(false);
    setError("");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    const workId = rawText(
      editForm.work_id,
    );

    const username = normalizeUsername(
      editForm.username,
    );

    const fullName = rawText(
      editForm.full_name,
    );

    const email = normalizeEmail(
      editForm.email,
    );

    const idType = rawText(
      editForm.id_type,
    );

    if (!fullName) {
      setError("Full name is required.");
      return;
    }

    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (
      idType &&
      !ID_TYPE_OPTIONS.some(
        (option) =>
          option.value === idType,
      )
    ) {
      setError("Select a valid ID type.");
      return;
    }

    if (isPortalAccount(selectedUser)) {
      if (workId.length < 3) {
        setError(
          "Work ID must contain at least 3 characters.",
        );
        return;
      }

      if (!validUsername(username)) {
        setError(
          "Username must be 3–50 characters and contain only letters, numbers, dots, underscores, or hyphens.",
        );
        return;
      }
    }

    if (
      editForm.password &&
      editForm.password.length < 6
    ) {
      setError(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (
      editForm.password &&
      editForm.password !==
        editForm.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const table = selectedUser.sourceTable;
      const recordId = selectedUser.sourceId;
      const updateData = {};

      if (table === "profiles") {
        const nameParts =
          fullName.split(/\s+/);

        updateData.first_name =
          nameParts.shift() || "";

        updateData.middle_name =
          nameParts.length > 1
            ? nameParts.shift()
            : "";

        updateData.last_name =
          nameParts.join(" ") || "";

        updateData.full_name = fullName;
        updateData.email = email;
        updateData.username =
          username || null;

        updateData.id_type =
          idType || null;

        updateData.is_active =
          editForm.is_active;

        updateData.role =
          editForm.role || "user";
      }

      if (
        table === "pending_registrations"
      ) {
        const nameParts =
          fullName.split(/\s+/);

        updateData.first_name =
          nameParts.shift() || "";

        updateData.middle_name =
          nameParts.length > 1
            ? nameParts.shift()
            : "";

        updateData.last_name =
          nameParts.join(" ") || "";

        updateData.full_name = fullName;
        updateData.email = email;

        updateData.username =
          username || null;

        updateData.id_type =
          idType || null;

        updateData.status =
          editForm.is_active
            ? "approved"
            : "rejected";

        updateData.is_active =
          editForm.is_active;
      }

      if (table === "staff_users") {
        updateData.full_name = fullName;
        updateData.email = email;
        updateData.user_id = workId;
        updateData.username = username;
        updateData.role = "staff";

        updateData.is_active =
          editForm.is_active;
      }

      if (table === "admin_users") {
        updateData.full_name = fullName;
        updateData.email = email;
        updateData.custom_id = workId;
        updateData.username = username;
        updateData.role = "admin";

        updateData.updated_at =
          new Date().toISOString();
      }

      if (editForm.password) {
        updateData.password =
          await hashPassword(
            editForm.password,
          );
      }

      const { error: updateError } =
        await supabase
          .from(table)
          .update(updateData)
          .eq("id", recordId);

      if (updateError) {
        throw updateError;
      }

      await fetchAllUsers(false);

      setShowEditModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error(
        "Update user error:",
        err,
      );

      setError(
        err?.message ||
          "Failed to update the user.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
     DELETE ACCOUNT
  =========================================================== */

  const handleDeleteUser = async (user) => {
    const userName =
      user.full_name ||
      user.email ||
      "this account";

    if (isCurrentAccount(user)) {
      setError(
        "You cannot delete the account that is currently signed in.",
      );
      return;
    }

    const firstConfirmation =
      window.confirm(
        `Delete ${userName}?\n\nThis removes the record from the ${user.sourceTable} table.`,
      );

    if (!firstConfirmation) {
      return;
    }

    const secondConfirmation =
      window.confirm(
        "FINAL CONFIRMATION\n\nThis action cannot be undone. Continue?",
      );

    if (!secondConfirmation) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { error: deleteError } =
        await supabase
          .from(user.sourceTable)
          .delete()
          .eq("id", user.sourceId);

      if (deleteError) {
        throw deleteError;
      }

      await fetchAllUsers(false);
    } catch (err) {
      console.error(
        "Delete user error:",
        err,
      );

      setError(
        err?.message ||
          "Failed to delete the user.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ===========================================================
     CREATE STAFF OR ADMIN ACCOUNT
  =========================================================== */

  const openCreateAccountModal = (
    role = "staff",
  ) => {
    const normalizedRole =
      role === "admin" ? "admin" : "staff";

    setCreateRole(normalizedRole);

    setCreateForm({
      ...EMPTY_CREATE_FORM,
      role: normalizedRole,
    });

    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateAccount = async (
    event,
  ) => {
    event.preventDefault();

    if (createSaving) {
      return;
    }

    setCreateSaving(true);
    setCreateError("");
    setCreateSuccess("");

    try {
      const workId = rawText(
        createForm.work_id,
      );

      const username =
        normalizeUsername(
          createForm.username,
        );

      const fullName = rawText(
        createForm.full_name,
      );

      const email = normalizeEmail(
        createForm.email,
      );

      const password = createForm.password;

      const confirmPassword =
        createForm.confirmPassword;

      const requesterPassword =
        createForm.requester_password;

      if (workId.length < 3) {
        throw new Error(
          "Work ID must contain at least 3 characters.",
        );
      }

      if (!validUsername(username)) {
        throw new Error(
          "Username must be 3–50 characters and contain only letters, numbers, dots, underscores, or hyphens.",
        );
      }

      if (fullName.length < 2) {
        throw new Error(
          "Full name is required.",
        );
      }

      if (!EMAIL_PATTERN.test(email)) {
        throw new Error(
          "Enter a valid email address.",
        );
      }

      if (password.length < 6) {
        throw new Error(
          "Password must be at least 6 characters.",
        );
      }

      if (password !== confirmPassword) {
        throw new Error(
          "Passwords do not match.",
        );
      }

      if (!requesterPassword) {
        throw new Error(
          "Enter your current administrator password.",
        );
      }

      const currentStaff =
        readCurrentStaff();

      if (!currentStaff) {
        throw new Error(
          "Your administrator session could not be read. Please sign in again.",
        );
      }

      const { data, error } =
        await supabase.functions.invoke(
          "create-account",
          {
            body: {
              account_type: createRole,
              work_id: workId,
              username,
              full_name: fullName,
              email,
              password,

              department:
                rawText(
                  createForm.department,
                ) || null,

              mobile_number:
                rawText(
                  createForm.mobile_number,
                ) || null,

              requester_work_id:
                currentStaff.user_id ||
                currentStaff.id ||
                null,

              requester_username:
                currentStaff.username ||
                null,

              requester_email:
                currentStaff.email ||
                null,

              requester_password:
                requesterPassword,
            },
          },
        );

      if (error || !data?.success) {
        const message =
          await parseFunctionError(error);

        throw new Error(
          message ||
            "Unable to create the account.",
        );
      }

      await fetchAllUsers(false);

      setShowCreateModal(false);

      setCreateForm({
        ...EMPTY_CREATE_FORM,
        role: createRole,
      });

      setCreateSuccess(
        data?.message ||
          `${
            createRole === "admin"
              ? "Administrator"
              : "Staff"
          } account for ${fullName} was ${
            data?.created
              ? "created"
              : "updated"
          } successfully. No duplicate was created.`,
      );
    } catch (err) {
      console.error(
        "Create account error:",
        err,
      );

      setCreateError(
        err?.message ||
          "Unable to create the account.",
      );
    } finally {
      setCreateSaving(false);
    }
  };

  /* ===========================================================
     DETAIL FIELDS
  =========================================================== */

  const getDetailFields = (user) => {
    const fields = [];

    if (user.full_name) {
      fields.push({
        label: "Full Name",
        value: user.full_name,
        icon: User,
      });
    }

    if (user.first_name) {
      fields.push({
        label: "First Name",
        value: user.first_name,
        icon: User,
      });
    }

    if (user.middle_name) {
      fields.push({
        label: "Middle Name",
        value: user.middle_name,
        icon: User,
      });
    }

    if (user.last_name) {
      fields.push({
        label: "Last Name",
        value: user.last_name,
        icon: User,
      });
    }

    if (user.workId) {
      fields.push({
        label: "Work ID",
        value: user.workId,
        icon: Hash,
      });
    }

    if (user.username) {
      fields.push({
        label: "Username",
        value: user.username,
        icon: User,
      });
    }

    if (user.email) {
      fields.push({
        label: "Email",
        value: user.email,
        icon: Mail,
      });
    }

    if (user.custom_id) {
      fields.push({
        label: "Custom ID",
        value: user.custom_id,
        icon: Hash,
      });
    }

    if (user.id_type) {
      fields.push({
        label: "ID Type",
        value: getIdTypeLabel(
          user.id_type,
        ),
        icon: CreditCard,
      });
    }

    if (user.id_number) {
      fields.push({
        label: "ID Number",
        value: user.id_number,
        icon: CreditCard,
      });
    }

    if (user.department) {
      fields.push({
        label: "Department",
        value: user.department,
        icon: Building2,
      });
    }

    if (user.age != null) {
      fields.push({
        label: "Age",
        value: String(user.age),
        icon: User,
      });
    }

    if (user.birthdate) {
      fields.push({
        label: "Birthdate",
        value: formatDate(
          user.birthdate,
        ),
        icon: Calendar,
      });
    }

    if (user.address) {
      fields.push({
        label: "Address",
        value: user.address,
        icon: MapPin,
      });
    }

    if (user.mobile_number) {
      fields.push({
        label: "Mobile Number",
        value: user.mobile_number,
        icon: Phone,
      });
    }

    fields.push({
      label: "Role",
      value: user.displayRole,
      icon: Shield,
    });

    fields.push({
      label: "Status",
      value: prettyStatus(user.status),
      icon: UserCheck,
    });

    if (
      typeof user.is_active === "boolean"
    ) {
      fields.push({
        label: "Active",
        value: user.is_active
          ? "Yes"
          : "No",
        icon: UserCheck,
      });
    }

    if (user.databaseId) {
      fields.push({
        label: "Account Record ID",
        value: String(user.databaseId),
        icon: Hash,
      });
    }

    if (user.sourceTable) {
      fields.push({
        label: "Source Table",
        value: user.sourceTable,
        icon: Building2,
      });
    }

    if (user.created_at) {
      fields.push({
        label: "Created",
        value: formatDate(
          user.created_at,
        ),
        icon: Clock,
      });
    }

    if (user.updated_at) {
      fields.push({
        label: "Last Updated",
        value: formatDate(
          user.updated_at,
        ),
        icon: Clock,
      });
    }

    return fields;
  };

  /* ===========================================================
     LOADING
  =========================================================== */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-600" />

          <p className="mt-4 font-semibold text-gray-600">
            Loading all user accounts...
          </p>
        </div>
      </div>
    );
  }

  const detailFields = detailsUser
    ? getDetailFields(detailsUser)
    : [];

  /* ===========================================================
     MAIN PAGE
  =========================================================== */

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}

        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-slate-800 dark:text-slate-100 sm:text-3xl">
              <Users className="h-7 w-7 text-purple-600 sm:h-8 sm:w-8" />

              User Management
            </h1>

            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Manage resident, staff, and administrator
              accounts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openCreateAccountModal("staff")
              }
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Users className="h-4 w-4" />

              Add Staff
            </button>

            <button
              type="button"
              onClick={() =>
                openCreateAccountModal("admin")
              }
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              <Shield className="h-4 w-4" />

              Add Admin
            </button>

            <button
              type="button"
              onClick={() =>
                setShowReport(true)
              }
              disabled={users.length === 0}
              className="flex items-center gap-2 rounded-xl border border-purple-300 px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30"
            >
              <Download className="h-4 w-4" />

              Summary Report
            </button>

            <button
              type="button"
              onClick={() =>
                fetchAllUsers(false)
              }
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-600"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>
          </div>
        </div>

        {/* Create success */}

        {createSuccess && (
          <div
            role="status"
            className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />

            <p className="text-sm font-medium text-emerald-700">
              {createSuccess}
            </p>

            <button
              type="button"
              onClick={() =>
                setCreateSuccess("")
              }
              aria-label="Dismiss success message"
              className="ml-auto rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* General error */}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* Statistics */}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            {
              label: "Total Users",
              value: stats.total,
              className:
                "border-blue-200 bg-blue-50 text-blue-700",
              icon: Users,
            },
            {
              label: "Regular",
              value: stats.users,
              className:
                "border-emerald-200 bg-emerald-50 text-emerald-700",
              icon: User,
            },
            {
              label: "Staff",
              value: stats.staff,
              className:
                "border-blue-200 bg-blue-50 text-blue-700",
              icon: ShieldCheck,
            },
            {
              label: "Admins",
              value: stats.admins,
              className:
                "border-purple-200 bg-purple-50 text-purple-700",
              icon: Shield,
            },
            {
              label: "Pending",
              value: stats.pending,
              className:
                "border-yellow-200 bg-yellow-50 text-yellow-700",
              icon: Clock,
            },
            {
              label: "Active",
              value: stats.active,
              className:
                "border-emerald-200 bg-emerald-50 text-emerald-700",
              icon: UserCheck,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 shadow-sm ${stat.className}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-70">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-2xl font-black">
                    {stat.value}
                  </p>
                </div>

                <stat.icon className="h-7 w-7 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search and filters */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                aria-label="Search accounts"
                placeholder="Search by name, email, username, ID type, ID number, or Work ID..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">
                All Roles
              </option>

              <option value="user">
                Regular User
              </option>

              <option value="staff">
                Staff
              </option>

              <option value="admin">
                Admin
              </option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="approved">
                Active
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        {/* Users table */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                <tr>
                  {[
                    "#",
                    "Name",
                    "Work ID",
                    "Username",
                    "Email",
                    "ID Type",
                    "Role",
                    "Source",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 text-left text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center"
                    >
                      <AlertCircle className="mx-auto mb-3 h-12 w-12 text-slate-400" />

                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        No user accounts found
                        matching your criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(
                    (user, index) => {
                      const current =
                        isCurrentAccount(user);

                      return (
                        <tr
                          key={`${user.sourceTable}-${user.sourceId}`}
                          className="border-b border-slate-200 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/30"
                        >
                          <td className="px-4 py-4 font-mono text-sm text-slate-500">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                user={user}
                                size="sm"
                              />

                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {user.full_name ||
                                    "Unknown"}
                                </p>

                                <p className="text-xs text-slate-400">
                                  Record:{" "}
                                  {String(
                                    user.databaseId ||
                                      user.sourceId ||
                                      "",
                                  ).slice(0, 18)}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 font-mono text-sm text-slate-700 dark:text-slate-300">
                            {user.workId || "N/A"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">
                            <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-700 dark:text-slate-200">
                              {user.username ||
                                "N/A"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {user.email || "N/A"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {user.id_type ? (
                              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                {getIdTypeLabel(
                                  user.id_type,
                                )}
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <RoleBadge
                              role={
                                user.displayRole
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {user.sourceTable}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              user={user}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailsUser(
                                    user,
                                  )
                                }
                                className="flex items-center gap-1 rounded-lg bg-slate-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
                              >
                                <Info className="h-3 w-3" />

                                Details
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(user)
                                }
                                disabled={current}
                                title={
                                  current
                                    ? "You cannot edit the currently signed-in account here"
                                    : "Edit account"
                                }
                                className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Edit3 className="h-3 w-3" />

                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteUser(
                                    user,
                                  )
                                }
                                disabled={current}
                                title={
                                  current
                                    ? "You cannot delete the currently signed-in account"
                                    : "Delete account"
                                }
                                className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="h-3 w-3" />

                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredUsers.length} of{" "}
          {users.length} total accounts
        </div>
      </div>

      {/* Create account modal */}

      {showCreateModal && (
        <CreateAccountModal
          key={createRole}
          role={createRole}
          form={createForm}
          setForm={setCreateForm}
          saving={createSaving}
          error={createError}
          onClose={() => {
            if (!createSaving) {
              setShowCreateModal(false);
              setCreateError("");
            }
          }}
          onSubmit={handleCreateAccount}
        />
      )}

      {/* Details modal */}

      {detailsUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => setDetailsUser(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-details-title"
            className="max-h-[80vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="account-details-title"
                className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100"
              >
                <Info className="h-5 w-5 text-slate-600" />

                Account Details
              </h2>

              <button
                type="button"
                onClick={() =>
                  setDetailsUser(null)
                }
                aria-label="Close details"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <Avatar user={detailsUser} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-slate-800 dark:text-slate-100">
                  {detailsUser.full_name ||
                    detailsUser.email ||
                    "Unknown"}
                </p>

                <p className="truncate text-sm text-slate-500">
                  {detailsUser.email || "No email"}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <RoleBadge
                    role={
                      detailsUser.displayRole
                    }
                  />

                  <StatusBadge
                    user={detailsUser}
                  />

                  {detailsUser.id_type && (
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      {getIdTypeLabel(
                        detailsUser.id_type,
                      )}
                    </span>
                  )}

                  <span className="rounded-full bg-slate-200 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {detailsUser.sourceTable}
                  </span>
                </div>
              </div>
            </div>

            {/* Identity and verification photos */}

            <div className="mb-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <Camera className="h-4 w-4 text-purple-600" />

                  Identity and Verification Photos
                </p>

                {detailsUser.id_type && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {getIdTypeLabel(
                      detailsUser.id_type,
                    )}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PhotoCard
                  label="Profile Picture"
                  value={detailsUser.avatar_url}
                  alt={`${
                    detailsUser.full_name ||
                    "User"
                  } profile picture`}
                  icon={Camera}
                />

                <PhotoCard
                  label="Front Side of ID"
                  value={
                    detailsUser.id_front_image_url ||
                    detailsUser.id_photo_url ||
                    detailsUser.id_image_url
                  }
                  alt="Front side of government ID"
                  icon={CreditCard}
                  contain
                />

                <PhotoCard
                  label="Back Side of ID"
                  value={
                    detailsUser.id_back_image_url
                  }
                  alt="Back side of government ID"
                  icon={CreditCard}
                  contain
                />

                <PhotoCard
                  label="Person Holding ID"
                  value={
                    detailsUser.id_holder_image_url
                  }
                  alt="Person holding government ID"
                  icon={Camera}
                  contain
                />
              </div>
            </div>

            {/* Account fields */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {detailFields.map(
                (field, index) => (
                  <DetailField
                    key={`${field.label}-${index}`}
                    icon={field.icon}
                    label={field.label}
                    value={field.value}
                  />
                ),
              )}
            </div>

            {detailFields.length === 0 && (
              <p className="py-6 text-center text-slate-500">
                No additional details available.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const user = detailsUser;

                  setDetailsUser(null);
                  openEditModal(user);
                }}
                disabled={
                  isCurrentAccount(detailsUser)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Edit3 className="h-4 w-4" />

                Edit Account
              </button>

              <button
                type="button"
                onClick={() =>
                  setDetailsUser(null)
                }
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}

      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onClick={() => {
            if (!saving) {
              setShowEditModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-account-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="edit-account-title"
                className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100"
              >
                <Edit3 className="h-5 w-5 text-blue-600" />

                Edit User
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowEditModal(false)
                }
                disabled={saving}
                aria-label="Close edit dialog"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Editing:{" "}
                {selectedUser.full_name ||
                  selectedUser.email}
              </p>

              <p className="text-xs text-slate-500">
                Table:{" "}
                {selectedUser.sourceTable} · Role:{" "}
                {selectedUser.displayRole}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                <p>{error}</p>
              </div>
            )}

            <form
              onSubmit={handleSaveEdit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="edit-full-name"
                  className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  Full Name
                </label>

                <input
                  id="edit-full-name"
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      full_name:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>

              {isPortalAccount(selectedUser) && (
                <div>
                  <label
                    htmlFor="edit-work-id"
                    className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    Work ID
                  </label>

                  <input
                    id="edit-work-id"
                    type="text"
                    required
                    minLength={3}
                    value={editForm.work_id}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        work_id:
                          event.target.value,
                      })
                    }
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="edit-username"
                  className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  Username
                </label>

                <input
                  id="edit-username"
                  type="text"
                  required={isPortalAccount(
                    selectedUser,
                  )}
                  minLength={3}
                  maxLength={50}
                  pattern="[A-Za-z0-9._-]+"
                  value={editForm.username}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      username:
                        event.target.value,
                    })
                  }
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. jdelacruz"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                />

                {isPortalAccount(selectedUser) && (
                  <p className="mt-1 text-xs text-slate-500">
                    Use 3–50 letters, numbers,
                    dots, underscores, or hyphens.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-email"
                  className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  Email Address
                </label>

                <input
                  id="edit-email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      email:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                />
              </div>

              {supportsIdType(selectedUser) && (
                <div>
                  <label
                    htmlFor="edit-id-type"
                    className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                  >
                    Type of ID
                  </label>

                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="edit-id-type"
                      value={editForm.id_type}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          id_type:
                            event.target.value,
                        })
                      }
                      className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                    >
                      <option value="">
                        Not provided
                      </option>

                      {ID_TYPE_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              )}

              {selectedUser?.sourceTable ===
                "staff_users" && (
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <UserCheck className="h-4 w-4 text-green-600" />

                    Account Active:
                  </label>

                  <ActiveToggle
                    value={editForm.is_active}
                    disabled={saving}
                    onToggle={() =>
                      setEditForm({
                        ...editForm,
                        is_active:
                          !editForm.is_active,
                      })
                    }
                  />

                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {editForm.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  <Lock className="h-4 w-4 text-yellow-600" />

                  Change Password

                  <span className="text-xs font-normal text-slate-400">
                    (leave blank to keep current)
                  </span>
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="relative">
                    <label
                      htmlFor="edit-password"
                      className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      New Password
                    </label>

                    <input
                      id="edit-password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={editForm.password}
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          password:
                            event.target.value,
                        })
                      }
                      placeholder="Min 6 characters"
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <div className="relative">
                    <label
                      htmlFor="edit-confirm-password"
                      className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200"
                    >
                      Confirm Password
                    </label>

                    <input
                      id="edit-confirm-password"
                      type={
                        showConfirm
                          ? "text"
                          : "password"
                      }
                      value={
                        editForm.confirmPassword
                      }
                      onChange={(event) =>
                        setEditForm({
                          ...editForm,
                          confirmPassword:
                            event.target.value,
                        })
                      }
                      placeholder="Repeat password"
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-900"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirm(
                          (value) => !value,
                        )
                      }
                      aria-label="Toggle confirmation password visibility"
                      className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {editForm.password &&
                  editForm.password.length > 0 &&
                  editForm.password.length < 6 && (
                    <p className="mt-1 text-xs text-red-600">
                      Password must be at least 6
                      characters.
                    </p>
                  )}

                {editForm.password &&
                  editForm.confirmPassword &&
                  editForm.password !==
                    editForm.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">
                      Passwords do not match.
                    </p>
                  )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    (editForm.password &&
                      editForm.password !==
                        editForm.confirmPassword)
                  }
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary report */}

      {showReport && (
        <UserSummaryReportModal
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

/* =============================================================
 * CREATE ACCOUNT MODAL
 * ============================================================= */

function CreateAccountModal({
  role,
  form,
  setForm,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    showRequesterPassword,
    setShowRequesterPassword,
  ] = useState(false);

  const isAdmin = role === "admin";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "username"
          ? value.toLowerCase().replace(/\s+/g, "")
          : name === "email"
            ? value.trim().toLowerCase()
            : value,
    }));
  };

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-purple-500";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={() => {
        if (!saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-account-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-xl p-2 ${
                isAdmin
                  ? "bg-purple-100 text-purple-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {isAdmin ? (
                <Shield className="h-5 w-5" />
              ) : (
                <Users className="h-5 w-5" />
              )}
            </div>

            <div>
              <h2
                id="create-account-title"
                className="text-xl font-bold text-slate-800"
              >
                Add{" "}
                {isAdmin ? "Admin" : "Staff"}{" "}
                Account
              </h2>

              <p className="text-xs text-slate-500">
                Stored in{" "}
                {isAdmin
                  ? "admin_users"
                  : "staff_users"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close create account dialog"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-6"
        >
          <div
            className={`rounded-xl border p-4 text-sm ${
              isAdmin
                ? "border-purple-200 bg-purple-50 text-purple-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <p className="font-bold">
              {isAdmin
                ? "Administrator account"
                : "Staff account"}
            </p>

            <p className="mt-1 text-xs leading-relaxed">
              This account is stored only in{" "}
              <strong>
                {isAdmin
                  ? "admin_users"
                  : "staff_users"}
              </strong>
              . Work ID, username, and email are
              checked before creating or updating an
              account.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="create-work-id"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Work ID *
              </label>

              <input
                id="create-work-id"
                name="work_id"
                type="text"
                required
                minLength={3}
                value={form.work_id}
                onChange={handleChange}
                placeholder="e.g. MDRRMO-001"
                autoCapitalize="characters"
                spellCheck={false}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="create-username"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Username *
              </label>

              <input
                id="create-username"
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={50}
                pattern="[A-Za-z0-9._-]+"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. jdelacruz"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className={inputClass}
              />

              <p className="mt-1 text-xs text-slate-500">
                3–50 letters, numbers, dots,
                underscores, or hyphens.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="create-full-name"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Full Name *
              </label>

              <input
                id="create-full-name"
                name="full_name"
                type="text"
                required
                minLength={2}
                value={form.full_name}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="create-email"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Email Address *
              </label>

              <input
                id="create-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="name@example.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="create-department"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Department
              </label>

              <input
                id="create-department"
                name="department"
                type="text"
                value={form.department}
                onChange={handleChange}
                placeholder="Operations, Medical, etc."
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="create-mobile"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Mobile Number
              </label>

              <input
                id="create-mobile"
                name="mobile_number"
                type="tel"
                value={form.mobile_number}
                onChange={handleChange}
                placeholder="09171234567"
                autoComplete="tel"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="create-password"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                New Password *
              </label>

              <div className="relative">
                <input
                  id="create-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={6}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (value) => !value,
                    )
                  }
                  aria-label="Toggle new password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="create-confirm-password"
                className="mb-1 block text-sm font-semibold text-slate-700"
              >
                Confirm Password *
              </label>

              <div className="relative">
                <input
                  id="create-confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={6}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-11`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value,
                    )
                  }
                  aria-label="Toggle confirmation password visibility"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {form.password &&
            form.confirmPassword &&
            form.password !==
              form.confirmPassword && (
              <p className="text-xs font-semibold text-red-600">
                Passwords do not match.
              </p>
            )}

          <div className="border-t border-slate-200 pt-4">
            <label
              htmlFor="requester-password"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              Current Administrator Password *
            </label>

            <div className="relative">
              <input
                id="requester-password"
                name="requester_password"
                type={
                  showRequesterPassword
                    ? "text"
                    : "password"
                }
                required
                value={
                  form.requester_password
                }
                onChange={handleChange}
                placeholder="Enter your current password"
                autoComplete="current-password"
                className={`${inputClass} pr-11`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowRequesterPassword(
                    (value) => !value,
                  )
                }
                aria-label="Toggle current password visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showRequesterPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              This verifies that the current administrator
              is authorized to create or update another
              account.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {saving
                ? "Saving Account..."
                : `Save ${
                    isAdmin ? "Admin" : "Staff"
                  } Account`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =============================================================
 * USER ACCOUNTS SUMMARY REPORT
 * ============================================================= */

function ReportCard({
  label,
  value,
  sub,
  color,
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${color}`}
    >
      <p className="text-xs font-bold opacity-70">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

      {sub && (
        <p className="mt-1 text-xs opacity-70">
          {sub}
        </p>
      )}
    </div>
  );
}

function ReportCountTable({
  title,
  data,
  total,
  percent,
  max = 12,
}) {
  return (
    <div className="print-break-avoid">
      <h2 className="mb-3 font-bold text-slate-800">
        {title}
      </h2>

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">
          No accounts in the covered range.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 p-2 text-left font-bold text-slate-700">
                Name
              </th>

              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                Count
              </th>

              <th className="border border-slate-200 p-2 text-center font-bold text-slate-700">
                Share
              </th>
            </tr>
          </thead>

          <tbody>
            {data
              .slice(0, max)
              .map((entry) => (
                <tr
                  key={entry.name}
                  className="border-b border-slate-100"
                >
                  <td className="border border-slate-200 p-2 font-semibold text-slate-700">
                    {prettyStatus(
                      entry.name,
                    )}
                  </td>

                  <td className="border border-slate-200 p-2 text-center text-slate-600">
                    {entry.count}
                  </td>

                  <td className="border border-slate-200 p-2 text-center text-slate-600">
                    {percent(
                      entry.count,
                    )}
                    %
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {data.length > max && (
        <p className="mt-2 text-xs text-slate-500">
          …and {data.length - max} more entries.
        </p>
      )}

      {total !== undefined && (
        <p className="mt-1 text-xs text-slate-400">
          Total in coverage: {total}
        </p>
      )}
    </div>
  );
}

function UserSummaryReportModal({
  onClose,
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [rows, setRows] = useState([]);
  const [fetching, setFetching] =
    useState(true);

  const [fetchError, setFetchError] =
    useState("");

  const todayKey = useMemo(() => {
    const date = new Date();

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(
        2,
        "0",
      ),
      String(date.getDate()).padStart(
        2,
        "0",
      ),
    ].join("-");
  }, []);

  const applyPreset = (from, to) => {
    setFromDate(from);
    setToDate(to);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      setFetching(true);
      setFetchError("");

      try {
        const applyRange = (query) => {
          let next = query;

          if (fromDate) {
            next = next.gte(
              "created_at",
              `${fromDate}T00:00:00.000Z`,
            );
          }

          if (toDate) {
            next = next.lte(
              "created_at",
              `${toDate}T23:59:59.999999`,
            );
          }

          return next;
        };

        const [
          profilesRes,
          staffRes,
          adminRes,
          pendingRes,
        ] = await Promise.all([
          applyRange(
            supabase
              .from("profiles")
              .select(
                "id, role, is_active, created_at",
              ),
          ),

          applyRange(
            supabase
              .from("staff_users")
              .select(
                "id, role, department, is_active, created_at",
              ),
          ),

          applyRange(
            supabase
              .from("admin_users")
              .select(
                "id, role, created_at",
              ),
          ),

          applyRange(
            supabase
              .from("pending_registrations")
              .select(
                "id, status, role, created_at",
              ),
          ),
        ]);

        const firstError = [
          profilesRes,
          staffRes,
          adminRes,
          pendingRes,
        ].find(
          (result) => result.error,
        );

        if (firstError?.error) {
          throw firstError.error;
        }

        const normalize = (data, table) =>
          (data || []).map((row) => ({
            table,
            role: row.role,
            status:
              row.status ??
              (row.is_active === false
                ? "inactive"
                : "approved"),
            department: row.department,
            created_at: row.created_at,
          }));

        const combined = [
          ...normalize(
            profilesRes.data,
            "profiles",
          ),

          ...normalize(
            staffRes.data,
            "staff_users",
          ),

          ...normalize(
            adminRes.data,
            "admin_users",
          ),

          ...normalize(
            pendingRes.data,
            "pending_registrations",
          ),
        ];

        if (!cancelled) {
          setRows(combined);
        }
      } catch (err) {
        console.error(
          "Error fetching report data:",
          err,
        );

        if (!cancelled) {
          setFetchError(
            err?.message ||
              "Unable to load report data.",
          );
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    };

    fetchRows();

    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const stats = useMemo(() => {
    const countBy = (
      field,
      fallback = "unknown",
    ) => {
      const counts = {};

      rows.forEach((row) => {
        const key = row[field] || fallback;

        counts[key] =
          (counts[key] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, count]) => ({
          name,
          count,
        }))
        .sort(
          (a, b) => b.count - a.count,
        );
    };

    const roleData = countBy(
      "role",
      "user",
    );

    const statusData = countBy("status");

    const sourceData = countBy(
      "table",
      "other",
    );

    const departmentData = countBy(
      "department",
      "Not Specified",
    );

    const monthlyCounts = {};

    rows.forEach((row) => {
      if (!row.created_at) {
        return;
      }

      const date = new Date(
        row.created_at,
      );

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(
          2,
          "0",
        ),
      ].join("-");

      monthlyCounts[key] =
        (monthlyCounts[key] || 0) + 1;
    });

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyData = Object.entries(
      monthlyCounts,
    )
      .sort((a, b) =>
        a[0].localeCompare(b[0]),
      )
      .map(([key, count]) => {
        const year = key.slice(0, 4);

        const monthNumber = Number(
          key.slice(5, 7),
        );

        return {
          name: `${months[monthNumber - 1]} ${year.slice(2)}`,
          count,
        };
      });

    const activeCount = rows.filter(
      (row) =>
        row.status === "approved" ||
        row.status === true,
    ).length;

    const pendingCount = rows.filter(
      (row) =>
        row.status === "pending" ||
        row.status === "pending_approval",
    ).length;

    const busiestMonth =
      monthlyData.length > 0
        ? monthlyData.reduce(
            (largest, current) =>
              current.count >
              largest.count
                ? current
                : largest,
          )
        : null;

    return {
      roleData,
      statusData,
      sourceData,
      departmentData,
      monthlyData,
      activeCount,
      pendingCount,
      busiestMonth,
    };
  }, [rows]);

  const percent = (count) =>
    rows.length > 0
      ? Math.round(
          (count / rows.length) * 100,
        )
      : 0;

  const pieColors = [
    "#8b5cf6",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#6366f1",
  ];

  const generatedAt =
    new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const rangeLabel =
    fromDate || toDate
      ? `${fromDate || "Start"} → ${
          toDate || "End"
        }`
      : "All dates";

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          html,
          body,
          #root,
          .app-shell,
          .content {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }

          body {
            background: #ffffff !important;
          }

          body * {
            visibility: hidden;
          }

          .report-overlay {
            position: static !important;
            overflow: visible !important;
            padding: 0 !important;
            background: none !important;
          }

          .report-print,
          .report-print * {
            visibility: visible;
          }

          .report-print {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .report-print .print-hidden {
            display: none !important;
          }

          .report-print .print-break-avoid,
          .report-print .print-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          * {
            -webkit-print-color-adjust: exact
              !important;
            print-color-adjust: exact
              !important;
          }
        }
      `}</style>

      <div
        className="report-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          className="report-print my-8 w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
          <div className="print-hidden sticky top-0 z-10 rounded-t-2xl border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-6 pb-3 pt-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-bold leading-tight text-slate-800">
                    User Accounts Summary Report
                  </h3>

                  <p className="text-xs leading-tight text-slate-400">
                    Adjust coverage, then print
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    window.print()
                  }
                  disabled={fetching}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />

                  {fetching
                    ? "Loading..."
                    : "Print / Save PDF"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close report"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Coverage
              </span>

              <input
                type="date"
                max={todayKey}
                value={fromDate}
                onChange={(event) =>
                  setFromDate(
                    event.target.value,
                  )
                }
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />

              <span className="text-sm text-slate-400">
                →
              </span>

              <input
                type="date"
                max={todayKey}
                value={toDate}
                onChange={(event) =>
                  setToDate(
                    event.target.value,
                  )
                }
                className="rounded-xl border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />

              <div className="ml-1 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {[
                  {
                    label: "All Time",
                    from: "",
                    to: "",
                  },
                  {
                    label: "This Month",
                    from: `${todayKey.slice(
                      0,
                      8,
                    )}01`,
                    to: todayKey,
                  },
                  {
                    label: "Today",
                    from: todayKey,
                    to: todayKey,
                  },
                ].map((preset) => {
                  const active =
                    fromDate ===
                      preset.from &&
                    toDate === preset.to;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        applyPreset(
                          preset.from,
                          preset.to,
                        )
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {rows.length} account
                {rows.length === 1 ? "" : "s"}{" "}
                loaded
              </span>
            </div>
          </div>

          <div className="p-8 text-slate-800">
            <div className="print-section mb-6 border-b-2 border-slate-800 pb-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                E-MDRRMO
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-900">
                USER ACCOUNTS SUMMARY REPORT
              </h1>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Coverage: {rangeLabel}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  {rows.length} account
                  {rows.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Generated: {generatedAt}
              </p>
            </div>

            {fetchError ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Failed to load report data:{" "}
                {fetchError}
              </div>
            ) : fetching ? (
              <div className="py-16 text-center font-semibold text-slate-500">
                Loading report data...
              </div>
            ) : (
              <>
                <div className="print-break-avoid mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <ReportCard
                    label="Total Accounts"
                    value={rows.length}
                    sub="In coverage"
                    color="border-blue-200 bg-blue-50 text-blue-700"
                  />

                  <ReportCard
                    label="Active"
                    value={stats.activeCount}
                    sub={`${percent(
                      stats.activeCount,
                    )}% of total`}
                    color="border-emerald-200 bg-emerald-50 text-emerald-700"
                  />

                  <ReportCard
                    label="Pending"
                    value={stats.pendingCount}
                    sub={
                      stats.pendingCount > 0
                        ? "Awaiting approval"
                        : "None pending"
                    }
                    color="border-yellow-200 bg-yellow-50 text-yellow-700"
                  />

                  <ReportCard
                    label="Busiest Month"
                    value={
                      stats.busiestMonth
                        ? stats.busiestMonth.name
                        : "—"
                    }
                    sub={
                      stats.busiestMonth
                        ? `${stats.busiestMonth.count} registrations`
                        : "No data"
                    }
                    color="border-violet-200 bg-violet-50 text-violet-700"
                  />
                </div>

                <div className="print-section mb-8">
                  <h2 className="mb-3 font-bold text-slate-800">
                    Role Overview
                  </h2>

                  {stats.roleData.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No accounts in the covered range.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {stats.roleData.map(
                        (entry) => (
                          <ReportCard
                            key={entry.name}
                            label={prettyStatus(
                              entry.name,
                            )}
                            value={entry.count}
                            sub={`${percent(
                              entry.count,
                            )}% of total`}
                            color={
                              entry.name === "admin"
                                ? "border-purple-200 bg-purple-50 text-purple-700"
                                : entry.name === "staff"
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>

                {stats.roleData.length > 0 && (
                  <div className="print-section mb-8">
                    <h2 className="mb-3 font-bold text-slate-800">
                      Role Distribution
                    </h2>

                    <div className="h-[260px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <PieChart>
                          <Pie
                            data={stats.roleData.map(
                              (entry) => ({
                                ...entry,
                                value: entry.count,
                              }),
                            )}
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {stats.roleData.map(
                              (_, index) => (
                                <Cell
                                  key={index}
                                  fill={
                                    pieColors[
                                      index %
                                        pieColors.length
                                    ]
                                  }
                                />
                              ),
                            )}
                          </Pie>

                          <Tooltip />

                          <Legend
                            wrapperStyle={{
                              paddingTop: "10px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {stats.monthlyData.length > 0 && (
                  <div className="print-section mb-8">
                    <h2 className="mb-3 font-bold text-slate-800">
                      Registrations per Month
                    </h2>

                    <div className="h-[240px] w-full">
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >
                        <BarChart
                          data={
                            stats.monthlyData
                          }
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e0e0e0"
                          />

                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <YAxis
                            allowDecimals={
                              false
                            }
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />

                          <Tooltip
                            cursor={{
                              fill: "rgba(0,0,0,0.05)",
                            }}
                          />

                          <Bar
                            dataKey="count"
                            fill="#6366f1"
                            radius={[
                              10,
                              10,
                              0,
                              0,
                            ]}
                            barSize={40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="mb-8 space-y-8">
                  <div className="print-section">
                    <ReportCountTable
                      title="Accounts by Role"
                      data={stats.roleData}
                      total={rows.length}
                      percent={percent}
                    />
                  </div>

                  <div className="print-section">
                    <ReportCountTable
                      title="Accounts by Status"
                      data={stats.statusData}
                      total={rows.length}
                      percent={percent}
                    />
                  </div>

                  <div className="print-section">
                    <ReportCountTable
                      title="Accounts by Source Table"
                      data={stats.sourceData}
                      total={rows.length}
                      percent={percent}
                    />
                  </div>

                  <div className="print-section">
                    <ReportCountTable
                      title="Staff by Department"
                      data={
                        stats.departmentData
                      }
                      percent={percent}
                    />
                  </div>
                </div>

                <div className="print-break-avoid border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
                  <p>
                    This report is system-generated and
                    reflects data at the time of generation.
                    Account names and contact details are
                    omitted by design.
                  </p>

                  <p className="mt-1">
                    © {new Date().getFullYear()}{" "}
                    E-MDRRMO
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
