import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../createClient";
import {
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  ClipboardCheck,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import InventoryManager from "../components/InventoryManager";
import InventoryReportPreview from "../components/InventoryReportPreview";

const TOOL_CATEGORIES = [
  "Stretcher",
  "Wheelchair",
  "Splint",
  "Backboard",
  "Cervical Collar",
  "Oxygen Equipment",
  "Rescue Tool",
  "Communication",
  "Other",
];

const SUPPLY_CATEGORIES = [
  "Bandage",
  "Medication",
  "IV Fluid",
  "Glove",
  "Mask",
  "Disinfectant",
  "Syringe",
  "Other",
];

const formatDateTime = (value) => {
  if (!value) return "—";

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

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const reportStatusClass = (status) => {
  const map = {
    pending_approval:
      "bg-yellow-100 text-yellow-700 border-yellow-200",
    approved:
      "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected:
      "bg-red-100 text-red-700 border-red-200",
  };

  return (
    map[status] ||
    "bg-slate-100 text-slate-700 border-slate-200"
  );
};

const prettyReportStatus = (status) => {
  const value = String(status || "pending_approval")
    .replace(/_/g, " ")
    .trim();

  return value
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
};

const makeAmbulanceForm = () => ({
  unit_number: "",
  plate_number: "",
  model: "",
  year: String(new Date().getFullYear()),
  status: "available",
  mileage: "0",
  last_maintenance: "",
  next_maintenance: "",
  notes: "",
  assigned_driver: "",
  driver_contact: "",
});

export default function AdminInventory() {
  const navigate = useNavigate();

  const [adminProfile, setAdminProfile] = useState(null);
  const [authUuid, setAuthUuid] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState("tools");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tools, setTools] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [reports, setReports] = useState([]);

  const loadSequence = useRef(0);

  /* ── Resolve current administrator ──────────────────────────── */

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentStaff");

      if (!raw) {
        navigate("/admin", { replace: true });
        return;
      }

      const profile = JSON.parse(raw);
      const role = String(profile.role || "").toLowerCase();

      if (role !== "admin") {
        navigate("/staff/dashboard", {
          replace: true,
        });
        return;
      }

      if (profile.is_active === false) {
        localStorage.removeItem("currentStaff");
        navigate("/admin", { replace: true });
        return;
      }

      if (!profile.id || !profile.user_id) {
        navigate("/admin", { replace: true });
        return;
      }

      setAdminProfile(profile);
      setAuthorized(true);
    } catch {
      localStorage.removeItem("currentStaff");
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  /* ── Resolve a real Supabase Auth UUID when available ────────── */

  useEffect(() => {
    let active = true;

    const resolveAuthUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (
          active &&
          !error &&
          data?.user?.id
        ) {
          setAuthUuid(data.user.id);
        }
      } catch {
        // Manual admin sessions have no Supabase Auth UUID.
      }
    };

    resolveAuthUser();

    return () => {
      active = false;
    };
  }, []);

  /* ── Load all administration data ───────────────────────────── */

  const loadData = useCallback(async (loadingState = false) => {
    const sequence = ++loadSequence.current;

    if (loadingState) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [
        toolsResult,
        suppliesResult,
        ambulancesResult,
        usageResult,
        reportsResult,
      ] = await Promise.all([
        supabase
          .from("tools_inventory")
          .select("*")
          .order("name", { ascending: true }),

        supabase
          .from("medical_supplies")
          .select("*")
          .order("name", { ascending: true }),

        supabase
          .from("ambulances")
          .select("*")
          .order("unit_number", { ascending: true }),

        supabase
          .from("ambulance_usage")
          .select("*, ambulances(*)")
          .order("created_at", { ascending: false }),

        supabase
          .from("inventory_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (sequence !== loadSequence.current) return;

      const failed = [];

      if (toolsResult.error) {
        failed.push("tools inventory");
      } else {
        setTools(toolsResult.data || []);
      }

      if (suppliesResult.error) {
        failed.push("medical supplies");
      } else {
        setSupplies(suppliesResult.data || []);
      }

      if (ambulancesResult.error) {
        failed.push("ambulances");
      } else {
        setAmbulances(ambulancesResult.data || []);
      }

      if (usageResult.error) {
        failed.push("ambulance usage");
      } else {
        setUsageLogs(usageResult.data || []);
      }

      if (reportsResult.error) {
        failed.push("inventory reports");
      } else {
        setReports(reportsResult.data || []);
      }

      if (failed.length > 0) {
        setError(
          `Some inventory sections could not be loaded: ${failed.join(
            ", ",
          )}. Check your Supabase policies.`,
        );
      }
    } catch (err) {
      console.error("Error loading admin inventory:", err);

      if (sequence === loadSequence.current) {
        setError(
          err?.message ||
            "Failed to load administration inventory.",
        );
      }
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;

    loadData(true);
  }, [authorized, loadData]);

  /* ── Realtime synchronization ───────────────────────────────── */

  useEffect(() => {
    if (!authorized) return undefined;

    const channel = supabase
      .channel("admin-inventory-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tools_inventory",
        },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medical_supplies",
        },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambulances",
        },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ambulance_usage",
        },
        () => loadData(false),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_reports",
        },
        () => loadData(false),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, loadData]);

  const lowStockItems = useMemo(
    () =>
      [...tools, ...supplies].filter(
        (item) =>
          Number(item.quantity) <=
          Number(item.min_quantity),
      ),
    [tools, supplies],
  );

  const pendingReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.status === "pending_approval",
      ),
    [reports],
  );

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
      </div>
    );
  }

  const tabs = [
    {
      id: "tools",
      label: "Shared Tools",
      icon: Wrench,
      count: tools.length,
    },
    {
      id: "supplies",
      label: "Shared Supplies",
      icon: Package,
      count: supplies.length,
    },
    {
      id: "ambulances",
      label: "Ambulances",
      icon: Ambulance,
      count: ambulances.length,
    },
    {
      id: "usage",
      label: "Usage Log",
      icon: Clock3,
      count: usageLogs.length,
    },
    {
      id: "reports",
      label: "Staff Reports",
      icon: ClipboardCheck,
      count: pendingReports.length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-xl">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate("/admin/dashboard")
                }
                aria-label="Back to dashboard"
                className="rounded-xl p-2 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <ShieldCheck className="h-8 w-8" />

              <div>
                <h1 className="text-2xl font-black">
                  Inventory Administration
                </h1>
                <p className="text-sm text-indigo-100">
                  Shared stock, ambulance fleet, usage, and staff
                  report approvals
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-bold">
                  {adminProfile?.full_name}
                </p>
                <p className="text-xs text-indigo-200">
                  Administrator
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadData(false)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 font-bold transition hover:bg-white/25 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-700"
                    : "text-indigo-100 hover:bg-white/10"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}

                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      activeTab === tab.id
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-white/15"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Shared Items",
              value: tools.length + supplies.length,
              className:
                "border-blue-200 bg-blue-50 text-blue-700",
              icon: Package,
            },
            {
              label: "Low Stock",
              value: lowStockItems.length,
              className:
                "border-red-200 bg-red-50 text-red-700",
              icon: AlertTriangle,
            },
            {
              label: "Ambulances",
              value: ambulances.length,
              className:
                "border-indigo-200 bg-indigo-50 text-indigo-700",
              icon: Ambulance,
            },
            {
              label: "Pending Reports",
              value: pendingReports.length,
              className:
                "border-yellow-200 bg-yellow-50 text-yellow-700",
              icon: FileText,
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

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <main className="mt-6">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
                <p className="mt-3 font-semibold text-slate-500">
                  Loading inventory...
                </p>
              </div>
            </div>
          ) : activeTab === "tools" ? (
            <InventoryManager
              key="admin-tools"
              tableName="tools_inventory"
              title="Shared Tools & Equipment"
              description="These are the same records used by Staff Inventory."
              icon={Wrench}
              items={tools}
              setItems={setTools}
              categories={TOOL_CATEGORIES}
              onDataChanged={() => loadData(false)}
            />
          ) : activeTab === "supplies" ? (
            <InventoryManager
              key="admin-supplies"
              tableName="medical_supplies"
              title="Shared Medical Supplies"
              description="Stock changes are synchronized with the staff inventory page."
              icon={Package}
              items={supplies}
              setItems={setSupplies}
              categories={SUPPLY_CATEGORIES}
              onDataChanged={() => loadData(false)}
            />
          ) : activeTab === "ambulances" ? (
            <AmbulancesPanel
              ambulances={ambulances}
              setAmbulances={setAmbulances}
              usageLogs={usageLogs}
              onDataChanged={() => loadData(false)}
            />
          ) : activeTab === "usage" ? (
            <UsagePanel
              usageLogs={usageLogs}
              setUsageLogs={setUsageLogs}
              ambulances={ambulances}
              adminProfile={adminProfile}
              authUuid={authUuid}
              onDataChanged={() => loadData(false)}
            />
          ) : (
            <StaffReportsPanel
              reports={reports}
              setReports={setReports}
              adminProfile={adminProfile}
              authUuid={authUuid}
              onDataChanged={() => loadData(false)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AMBULANCES
   ══════════════════════════════════════════════════════════════════ */

function AmbulancesPanel({
  ambulances,
  setAmbulances,
  usageLogs,
  onDataChanged,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState(null);
  const [form, setForm] = useState(makeAmbulanceForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const usageCounts = useMemo(() => {
    const counts = {};

    usageLogs.forEach((log) => {
      if (log.ambulance_id === null) return;

      const key = String(log.ambulance_id);
      counts[key] = (counts[key] || 0) + 1;
    });

    return counts;
  }, [usageLogs]);

  const openCreate = () => {
    setEditingAmbulance(null);
    setForm(makeAmbulanceForm());
    setError("");
    setShowModal(true);
  };

  const openEdit = (ambulance) => {
    setEditingAmbulance(ambulance);
    setForm({
      unit_number: ambulance.unit_number || "",
      plate_number: ambulance.plate_number || "",
      model: ambulance.model || "",
      year: String(ambulance.year || ""),
      status: ambulance.status || "available",
      mileage: String(ambulance.mileage ?? 0),
      last_maintenance:
        ambulance.last_maintenance
          ? String(
              ambulance.last_maintenance,
            ).slice(0, 10)
          : "",
      next_maintenance:
        ambulance.next_maintenance
          ? String(
              ambulance.next_maintenance,
            ).slice(0, 10)
          : "",
      notes: ambulance.notes || "",
      assigned_driver:
        ambulance.assigned_driver || "",
      driver_contact:
        ambulance.driver_contact || "",
    });
    setError("");
    setShowModal(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    const payload = {
      unit_number: form.unit_number.trim(),
      plate_number: form.plate_number.trim(),
      model: form.model.trim() || null,
      year: form.year ? Number(form.year) : null,
      status: form.status,
      mileage: Number(form.mileage || 0),
      last_maintenance:
        form.last_maintenance || null,
      next_maintenance:
        form.next_maintenance || null,
      notes: form.notes.trim() || null,
      assigned_driver:
        form.assigned_driver.trim() || null,
      driver_contact:
        form.driver_contact.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const result = editingAmbulance
        ? await supabase
            .from("ambulances")
            .update(payload)
            .eq("id", editingAmbulance.id)
            .select("*")
            .single()
        : await supabase
            .from("ambulances")
            .insert([payload])
            .select("*")
            .single();

      if (result.error) {
        throw result.error;
      }

      setAmbulances((previous) =>
        editingAmbulance
          ? previous.map((item) =>
              item.id === result.data.id
                ? result.data
                : item,
            )
          : [result.data, ...previous],
      );

      setShowModal(false);
      setEditingAmbulance(null);
      onDataChanged?.();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to save the ambulance.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ambulance) => {
    const usageCount =
      usageCounts[String(ambulance.id)] || 0;

    if (usageCount > 0) {
      setError(
        `${ambulance.unit_number} cannot be deleted because it has ${usageCount} usage record(s). Set it to out_of_service instead.`,
      );
      return;
    }

    if (
      !window.confirm(
        `Delete ambulance ${ambulance.unit_number}?`,
      )
    ) {
      return;
    }

    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("ambulances")
        .delete()
        .eq("id", ambulance.id);

      if (deleteError) {
        throw deleteError;
      }

      setAmbulances((previous) =>
        previous.filter(
          (item) => item.id !== ambulance.id,
        ),
      );

      onDataChanged?.();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to delete the ambulance.",
      );
    }
  };

  const statusClass = (status) => {
    const map = {
      available:
        "bg-emerald-100 text-emerald-700",
      in_service:
        "bg-blue-100 text-blue-700",
      maintenance:
        "bg-amber-100 text-amber-700",
      out_of_service:
        "bg-red-100 text-red-700",
    };

    return (
      map[status] ||
      "bg-slate-100 text-slate-700"
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Ambulance Fleet
          </h2>
          <p className="text-sm text-slate-500">
            Manage fleet status, maintenance, and drivers.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Ambulance
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {ambulances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <Ambulance className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-500">
            No ambulances registered.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ambulances.map((ambulance) => (
            <article
              key={ambulance.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className={`h-2 ${
                  ambulance.status === "available"
                    ? "bg-emerald-500"
                    : ambulance.status === "in_service"
                      ? "bg-blue-500"
                      : ambulance.status === "maintenance"
                        ? "bg-amber-500"
                        : "bg-red-500"
                }`}
              />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      {ambulance.unit_number}
                    </h3>
                    <p className="font-mono text-sm text-slate-500">
                      {ambulance.plate_number}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(
                      ambulance.status,
                    )}`}
                  >
                    {String(
                      ambulance.status || "available",
                    )
                      .replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {ambulance.model && (
                    <p>
                      <strong>Model:</strong>{" "}
                      {ambulance.model} ({ambulance.year})
                    </p>
                  )}

                  <p>
                    <strong>Mileage:</strong>{" "}
                    {Number(
                      ambulance.mileage || 0,
                    ).toLocaleString()} km
                  </p>

                  {ambulance.next_maintenance && (
                    <p className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-amber-500" />
                      Next maintenance:{" "}
                      {formatDate(
                        ambulance.next_maintenance,
                      )}
                    </p>
                  )}

                  <p>
                    <strong>Driver:</strong>{" "}
                    {ambulance.assigned_driver ||
                      "Not assigned"}
                  </p>

                  {ambulance.driver_contact && (
                    <p>
                      <strong>Contact:</strong>{" "}
                      {ambulance.driver_contact}
                    </p>
                  )}

                  <p className="text-xs text-slate-400">
                    Usage records:{" "}
                    {usageCounts[
                      String(ambulance.id)
                    ] || 0}
                  </p>
                </div>

                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(ambulance)
                    }
                    className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(ambulance)
                    }
                    className="ml-auto flex items-center gap-1 text-sm font-bold text-red-600 hover:underline"
                  >
                    <XCircle className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() =>
            !saving && setShowModal(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-800">
                {editingAmbulance
                  ? "Edit Ambulance"
                  : "Add Ambulance"}
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Unit Number *
                  </label>
                  <input
                    required
                    value={form.unit_number}
                    onChange={handleChange}
                    name="unit_number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Plate Number *
                  </label>
                  <input
                    required
                    value={form.plate_number}
                    onChange={handleChange}
                    name="plate_number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Model
                  </label>
                  <input
                    value={form.model}
                    onChange={handleChange}
                    name="model"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Year
                  </label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={handleChange}
                    name="year"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={handleChange}
                    name="status"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="available">
                      Available
                    </option>
                    <option value="in_service">
                      In Service
                    </option>
                    <option value="maintenance">
                      Maintenance
                    </option>
                    <option value="out_of_service">
                      Out of Service
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Mileage
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.mileage}
                    onChange={handleChange}
                    name="mileage"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Last Maintenance
                  </label>
                  <input
                    type="date"
                    value={form.last_maintenance}
                    onChange={handleChange}
                    name="last_maintenance"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Next Maintenance
                  </label>
                  <input
                    type="date"
                    value={form.next_maintenance}
                    onChange={handleChange}
                    name="next_maintenance"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Driver Name
                  </label>
                  <input
                    value={form.assigned_driver}
                    onChange={handleChange}
                    name="assigned_driver"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Driver Contact
                  </label>
                  <input
                    value={form.driver_contact}
                    onChange={handleChange}
                    name="driver_contact"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={handleChange}
                  name="notes"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : editingAmbulance
                      ? "Update"
                      : "Add Ambulance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AMBULANCE USAGE
   ══════════════════════════════════════════════════════════════════ */

function UsagePanel({
  usageLogs,
  setUsageLogs,
  ambulances,
  adminProfile,
  authUuid,
  onDataChanged,
}) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    ambulance_id: "",
    purpose: "",
    destination: "",
    departure_time: "",
    return_time: "",
    notes: "",
    status: "completed",
  });

  const availableAmbulances = ambulances.filter(
    (ambulance) => ambulance.status === "available",
  );

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return usageLogs.filter((log) => {
      if (!query) return true;

      return [
        log.ambulances?.unit_number,
        log.ambulances?.plate_number,
        log.purpose,
        log.destination,
        log.staff_name,
        log.status,
      ]
        .filter(Boolean)
        .map((value) =>
          String(value).toLowerCase(),
        )
        .join(" ")
        .includes(query);
    });
  }, [usageLogs, searchTerm]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!form.ambulance_id) {
      setError("Select an ambulance.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ambulance_id: form.ambulance_id,
        purpose: form.purpose.trim(),
        destination:
          form.destination.trim() || null,
        departure_time:
          form.departure_time || null,
        return_time: form.return_time || null,
        staff_id: authUuid || null,
        staff_name:
          adminProfile?.full_name || "Administrator",
        notes: form.notes.trim() || null,
        status: form.status,
      };

      const { data, error: insertError } =
        await supabase
          .from("ambulance_usage")
          .insert([payload])
          .select("*, ambulances(*)")
          .single();

      if (insertError) {
        throw insertError;
      }

      const nextAmbulanceStatus =
        form.status === "in_progress"
          ? "in_service"
          : "available";

      const { error: fleetError } = await supabase
        .from("ambulances")
        .update({
          status: nextAmbulanceStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", form.ambulance_id);

      setUsageLogs((previous) => [
        data,
        ...previous,
      ]);

      setForm({
        ambulance_id: "",
        purpose: "",
        destination: "",
        departure_time: "",
        return_time: "",
        notes: "",
        status: "completed",
      });

      setShowModal(false);

      if (fleetError) {
        setError(
          `Usage was saved, but the ambulance status could not be updated: ${fleetError.message}`,
        );
      }

      onDataChanged?.();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to save the usage log.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Ambulance Usage Log
          </h2>
          <p className="text-sm text-slate-500">
            Record dispatch and return activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setShowModal(true);
          }}
          disabled={availableAmbulances.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Log Usage
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="Search usage..."
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">
                  Ambulance
                </th>
                <th className="p-4 font-medium">
                  Purpose
                </th>
                <th className="p-4 font-medium">
                  Destination
                </th>
                <th className="p-4 font-medium">
                  Staff
                </th>
                <th className="p-4 font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-slate-400"
                  >
                    No ambulance usage records found.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-slate-100"
                  >
                    <td className="p-4 text-slate-500">
                      {formatDateTime(
                        entry.created_at,
                      )}
                    </td>
                    <td className="p-4 font-bold">
                      {entry.ambulances?.unit_number ||
                        "—"}
                      <p className="font-mono text-xs font-normal text-slate-400">
                        {entry.ambulances?.plate_number ||
                          ""}
                      </p>
                    </td>
                    <td className="p-4">
                      {entry.purpose || "—"}
                    </td>
                    <td className="p-4">
                      {entry.destination || "—"}
                    </td>
                    <td className="p-4">
                      {entry.staff_name || "—"}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {String(
                          entry.status ||
                            "completed",
                        ).replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() =>
            !saving && setShowModal(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-800">
                Log Ambulance Usage
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowModal(false)
                }
                disabled={saving}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Ambulance *
                </label>

                <select
                  required
                  value={form.ambulance_id}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      ambulance_id:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">
                    Select ambulance...
                  </option>

                  {availableAmbulances.map(
                    (ambulance) => (
                      <option
                        key={ambulance.id}
                        value={ambulance.id}
                      >
                        {ambulance.unit_number} —{" "}
                        {ambulance.plate_number}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Purpose *
                </label>
                <input
                  required
                  value={form.purpose}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      purpose: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Destination
                </label>
                <input
                  value={form.destination}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      destination:
                        event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Departure *
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={form.departure_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        departure_time:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Return
                  </label>
                  <input
                    type="datetime-local"
                    value={form.return_time}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        return_time:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      status: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="in_progress">
                    In Progress
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Usage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STAFF REPORT REVIEW
   ══════════════════════════════════════════════════════════════════ */

function StaffReportsPanel({
  reports,
  setReports,
  adminProfile,
  authUuid,
  onDataChanged,
}) {
  const [statusFilter, setStatusFilter] =
    useState("pending_approval");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewReport, setPreviewReport] =
    useState(null);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        statusFilter === "all" ||
        report.status === statusFilter;

      const matchesSearch =
        !query ||
        [
          report.title,
          report.report_type,
          report.generated_by_name,
        ]
          .filter(Boolean)
          .map((value) =>
            String(value).toLowerCase(),
          )
          .join(" ")
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [reports, searchTerm, statusFilter]);

  const updateStatus = async (
    report,
    status,
    adminNotes = null,
  ) => {
    if (savingId !== null) return;

    const action =
      status === "approved"
        ? "approve"
        : "reject";

    if (
      !window.confirm(
        `Are you sure you want to ${action} report "${report.title}"?`,
      )
    ) {
      return;
    }

    setSavingId(report.id);
    setError("");

    try {
      const { data, error: updateError } =
        await supabase
          .from("inventory_reports")
          .update({
            status,
            admin_notes: adminNotes,
            reviewed_by: authUuid || null,
            reviewed_by_name:
              adminProfile?.full_name ||
              "Administrator",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", report.id)
          .select("*")
          .single();

      if (updateError) {
        throw updateError;
      }

      setReports((previous) =>
        previous.map((item) =>
          item.id === data.id ? data : item,
        ),
      );

      window.dispatchEvent(
        new Event("mdrrmo:notif-refresh"),
      );

      onDataChanged?.();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to update the report.",
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          Staff Inventory Reports
        </h2>
        <p className="text-sm text-slate-500">
          Review the inventory snapshots generated by staff.
          Approval confirms the report but does not change stock.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Pending",
            value: reports.filter(
              (report) =>
                report.status ===
                "pending_approval",
            ).length,
            className:
              "border-yellow-200 bg-yellow-50 text-yellow-700",
          },
          {
            label: "Approved",
            value: reports.filter(
              (report) =>
                report.status === "approved",
            ).length,
            className:
              "border-emerald-200 bg-emerald-50 text-emerald-700",
          },
          {
            label: "Rejected",
            value: reports.filter(
              (report) =>
                report.status === "rejected",
            ).length,
            className:
              "border-red-200 bg-red-50 text-red-700",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-4 ${stat.className}`}
          >
            <p className="text-xs font-bold opacity-70">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-black">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search report or staff name..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          <option value="pending_approval">
            Pending Approval
          </option>
          <option value="approved">
            Approved
          </option>
          <option value="rejected">
            Rejected
          </option>
          <option value="all">
            All Reports
          </option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="p-4 font-medium">
                  Report
                </th>
                <th className="p-4 font-medium">
                  Submitted By
                </th>
                <th className="p-4 font-medium">
                  Date
                </th>
                <th className="p-4 font-medium">
                  Status
                </th>
                <th className="p-4 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-slate-400"
                  >
                    No reports found.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="border-t border-slate-100"
                  >
                    <td className="p-4">
                      <p className="font-bold text-slate-800">
                        {report.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {String(
                          report.report_type ||
                            "",
                        ).replace(/_/g, " ")}
                      </p>
                    </td>

                    <td className="p-4">
                      {report.generated_by_name ||
                        "Staff member"}
                    </td>

                    <td className="p-4 text-slate-500">
                      {formatDateTime(
                        report.created_at,
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-bold ${reportStatusClass(
                          report.status,
                        )}`}
                      >
                        {prettyReportStatus(
                          report.status,
                        )}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReport(report)
                          }
                          className="flex items-center gap-1 text-indigo-600 hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        {report.status ===
                          "pending_approval" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateStatus(
                                  report,
                                  "approved",
                                )
                              }
                              disabled={
                                savingId ===
                                report.id
                              }
                              className="flex items-center gap-1 font-bold text-emerald-600 hover:underline disabled:opacity-50"
                            >
                              {savingId ===
                              report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Approve
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const reason =
                                  window.prompt(
                                    "Reason for rejecting this report (optional):",
                                  );

                                if (reason === null) {
                                  return;
                                }

                                updateStatus(
                                  report,
                                  "rejected",
                                  reason || null,
                                );
                              }}
                              disabled={
                                savingId ===
                                report.id
                              }
                              className="flex items-center gap-1 font-bold text-red-600 hover:underline disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {previewReport && (
        <InventoryReportPreview
          report={previewReport}
          onClose={() => setPreviewReport(null)}
        />
      )}
    </section>
  );
}
