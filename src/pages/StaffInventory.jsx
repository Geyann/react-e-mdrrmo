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
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
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

const getReportMetadata = (report) => {
  if (
    report?.content &&
    typeof report.content === "object" &&
    !Array.isArray(report.content)
  ) {
    return report.content.meta || {};
  }

  return {};
};

export default function StaffInventory() {
  const navigate = useNavigate();

  const [staffProfile, setStaffProfile] =
    useState(null);
  const [authUuid, setAuthUuid] = useState(null);
  const [authorized, setAuthorized] = useState(false);

  const [activeTab, setActiveTab] = useState("tools");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tools, setTools] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [reports, setReports] = useState([]);

  const loadSequence = useRef(0);

  /* ── Resolve current staff account ──────────────────────────── */

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentStaff");

      if (!raw) {
        navigate("/admin", { replace: true });
        return;
      }

      const profile = JSON.parse(raw);
      const role = String(profile.role || "").toLowerCase();

      if (role !== "staff" && role !== "admin") {
        navigate("/login", { replace: true });
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

      setStaffProfile(profile);
      setAuthorized(true);
    } catch {
      localStorage.removeItem("currentStaff");
      navigate("/admin", { replace: true });
    }
  }, [navigate]);

  /* ── Optional Supabase Auth UUID ─────────────────────────────── */

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
        // Manual staff sessions have no Auth UUID.
      }
    };

    resolveAuthUser();

    return () => {
      active = false;
    };
  }, []);

  /* ── Load shared inventory and reports ──────────────────────── */

  const loadData = useCallback(
    async (loadingState = false) => {
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

        if (reportsResult.error) {
          failed.push("inventory reports");
        } else {
          setReports(reportsResult.data || []);
        }

        if (failed.length > 0) {
          setError(
            `Some data could not be loaded: ${failed.join(
              ", ",
            )}. Check your Supabase policies.`,
          );
        }
      } catch (err) {
        console.error(
          "Error loading staff inventory:",
          err,
        );

        if (sequence === loadSequence.current) {
          setError(
            err?.message ||
              "Failed to load staff inventory.",
          );
        }
      } finally {
        if (sequence === loadSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!authorized) return;

    loadData(true);
  }, [authorized, loadData]);

  /* ── Realtime synchronization ───────────────────────────────── */

  useEffect(() => {
    if (!authorized) return undefined;

    const channel = supabase
      .channel("staff-inventory-live")
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
          table: "inventory_reports",
        },
        () => loadData(false),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorized, loadData]);

  const ownedReports = useMemo(() => {
    if (!staffProfile) return [];

    return reports.filter((report) => {
      const meta = getReportMetadata(report);

      if (
        meta.generated_by_staff_id !==
          undefined &&
        meta.generated_by_staff_id !== null
      ) {
        return (
          String(meta.generated_by_staff_id) ===
          String(staffProfile.id)
        );
      }

      if (
        meta.generated_by_work_id !== undefined &&
        meta.generated_by_work_id !== null
      ) {
        return (
          String(meta.generated_by_work_id) ===
          String(staffProfile.user_id)
        );
      }

      if (
        authUuid &&
        report.generated_by === authUuid
      ) {
        return true;
      }

      /*
       * Backward-compatible ownership check for reports generated
       * before metadata was stored.
       */
      return (
        report.generated_by_name ===
        staffProfile.full_name
      );
    });
  }, [authUuid, reports, staffProfile]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const tabs = [
    {
      id: "tools",
      label: "Tools & Equipment",
      icon: Wrench,
      count: tools.length,
    },
    {
      id: "supplies",
      label: "Medical Supplies",
      icon: Package,
      count: supplies.length,
    },
    {
      id: "reports",
      label: "My Reports",
      icon: ClipboardCheck,
      count: ownedReports.length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white shadow-xl">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8" />

              <div>
                <h1 className="text-2xl font-black">
                  Staff Supply Inventory
                </h1>
                <p className="text-sm text-indigo-100">
                  Shared stock management and inventory
                  reporting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <p className="font-bold">
                  {staffProfile?.full_name}
                </p>
                <p className="text-xs text-indigo-200">
                  {String(
                    staffProfile?.role || "staff",
                  ).toUpperCase()}
                  {staffProfile?.department
                    ? ` · ${staffProfile.department}`
                    : ""}
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

        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
          You are managing the same shared inventory records used
          by administrators. Changes are synchronized automatically,
          and your reports appear in the administrator review panel.
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        <main className="mt-6">
          {loading ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-600" />
                <p className="mt-3 font-semibold text-slate-500">
                  Loading shared inventory...
                </p>
              </div>
            </div>
          ) : activeTab === "tools" ? (
            <InventoryManager
              key="staff-tools"
              tableName="tools_inventory"
              title="Tools & Equipment"
              description="Update the shared tools and equipment stock."
              icon={Wrench}
              items={tools}
              setItems={setTools}
              categories={TOOL_CATEGORIES}
              onDataChanged={() => loadData(false)}
            />
          ) : activeTab === "supplies" ? (
            <InventoryManager
              key="staff-supplies"
              tableName="medical_supplies"
              title="Medical Supplies"
              description="Update the shared medical supply inventory."
              icon={Package}
              items={supplies}
              setItems={setSupplies}
              categories={SUPPLY_CATEGORIES}
              onDataChanged={() => loadData(false)}
            />
          ) : (
            <StaffReportsPanel
              reports={ownedReports}
              setReports={setReports}
              staffProfile={staffProfile}
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
   STAFF REPORTS
   ══════════════════════════════════════════════════════════════════ */

function StaffReportsPanel({
  reports,
  setReports,
  staffProfile,
  authUuid,
  onDataChanged,
}) {
  const [reportType, setReportType] =
    useState("inventory_summary");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewReport, setPreviewReport] =
    useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [tools, setTools] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [inventoryLoading, setInventoryLoading] =
    useState(true);

  const loadInventorySnapshot = useCallback(async () => {
    setInventoryLoading(true);

    try {
      const [toolsResult, suppliesResult] =
        await Promise.all([
          supabase
            .from("tools_inventory")
            .select(
              "name, category, quantity, min_quantity, unit, location, notes",
            )
            .order("name"),

          supabase
            .from("medical_supplies")
            .select(
              "name, category, quantity, min_quantity, unit, location, notes",
            )
            .order("name"),
        ]);

      if (toolsResult.error) {
        throw toolsResult.error;
      }

      if (suppliesResult.error) {
        throw suppliesResult.error;
      }

      setTools(toolsResult.data || []);
      setSupplies(suppliesResult.data || []);
      setError("");
    } catch (err) {
      setError(
        err?.message ||
          "Failed to load the inventory snapshot.",
      );
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventorySnapshot();
  }, [loadInventorySnapshot]);

  const lowStockTools = useMemo(
    () =>
      tools.filter(
        (item) =>
          Number(item.quantity) <=
          Number(item.min_quantity),
      ),
    [tools],
  );

  const lowStockSupplies = useMemo(
    () =>
      supplies.filter(
        (item) =>
          Number(item.quantity) <=
          Number(item.min_quantity),
      ),
    [supplies],
  );

  const filteredReports = useMemo(() => {
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
          report.admin_notes,
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

  const toReportItem = (item) => ({
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    min_quantity: item.min_quantity,
    unit: item.unit,
    location: item.location,
    notes: item.notes,
    status:
      Number(item.quantity) <=
      Number(item.min_quantity)
        ? "Low Stock"
        : "Sufficient",
  });

  const generateReport = async () => {
    if (generating) return;

    if (inventoryLoading) {
      setError(
        "Wait for the current inventory to finish loading.",
      );
      return;
    }

    if (
      reportType === "low_stock" &&
      lowStockTools.length === 0 &&
      lowStockSupplies.length === 0
    ) {
      setError(
        "There are no low-stock items to report.",
      );
      return;
    }

    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const isLowStock =
        reportType === "low_stock";

      const toolRows = isLowStock
        ? lowStockTools
        : tools;

      const supplyRows = isLowStock
        ? lowStockSupplies
        : supplies;

      const reportContent = {
        /*
         * Because manual staff sessions may not have a Supabase
         * Auth UUID, staff linkage is also stored in the JSON report
         * metadata without sending a Work ID into a UUID column.
         */
        meta: {
          schema_version: 1,
          generated_by_staff_id:
            staffProfile?.id ?? null,
          generated_by_work_id:
            staffProfile?.user_id ?? null,
          generated_at: new Date().toISOString(),
        },

        tools: toolRows.map(toReportItem),
        supplies: supplyRows.map(toReportItem),

        summary: {
          total_tools: tools.length,
          total_supplies: supplies.length,
          low_stock_items:
            lowStockTools.length +
            lowStockSupplies.length,
        },
      };

      const title =
        reportType === "low_stock"
          ? "Low Stock Alert Report"
          : "Inventory Summary Report";

      const payload = {
        title,
        report_type: reportType,
        content: reportContent,

        /*
         * generated_by is UUID. Only write it when a real Supabase
         * Auth UUID is available.
         */
        generated_by: authUuid || null,
        generated_by_name:
          staffProfile?.full_name || "Staff Member",

        status: "pending_approval",
      };

      const { data, error: insertError } =
        await supabase
          .from("inventory_reports")
          .insert([payload])
          .select("*")
          .single();

      if (insertError) {
        throw insertError;
      }

      setReports((previous) => [
        data,
        ...previous,
      ]);

      setPreviewReport(data);

      setSuccess(
        "Inventory report submitted for administrator approval.",
      );

      window.dispatchEvent(
        new Event("mdrrmo:notif-refresh"),
      );

      onDataChanged?.();
    } catch (err) {
      console.error(
        "Error generating inventory report:",
        err,
      );

      setError(
        err?.message ||
          "Failed to generate the inventory report.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const openAndPrint = (report) => {
    setPreviewReport(report);

    window.setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
          My Inventory Reports
        </h2>
        <p className="text-sm text-slate-500">
          Generate a snapshot of the current shared inventory and
          send it to administrators for approval.
        </p>
      </div>

      {success && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Tools",
            value: tools.length,
            className:
              "border-indigo-200 bg-indigo-50 text-indigo-700",
            icon: Wrench,
          },
          {
            label: "Supplies",
            value: supplies.length,
            className:
              "border-pink-200 bg-pink-50 text-pink-700",
            icon: Package,
          },
          {
            label: "Low Stock",
            value:
              lowStockTools.length +
              lowStockSupplies.length,
            className:
              "border-red-200 bg-red-50 text-red-700",
            icon: AlertCircle,
          },
          {
            label: "My Reports",
            value: reports.length,
            className:
              "border-blue-200 bg-blue-50 text-blue-700",
            icon: FileText,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border p-4 ${stat.className}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold opacity-70">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {inventoryLoading
                    ? "—"
                    : stat.value}
                </p>
              </div>

              <stat.icon className="h-7 w-7 opacity-70" />
            </div>
          </div>
        ))}
      </div>

      {/* Report generator */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-slate-800">
              Generate New Report
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              The report stores a snapshot. Later inventory changes
              will not alter an already-generated report.
            </p>

            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Report Type
            </label>

            <select
              value={reportType}
              onChange={(event) =>
                setReportType(event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-sm"
            >
              <option value="inventory_summary">
                Inventory Summary
              </option>
              <option value="low_stock">
                Low Stock Alert
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={generateReport}
            disabled={
              generating || inventoryLoading
            }
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}

            {generating
              ? "Generating..."
              : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Report list */}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search your reports..."
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
          <option value="all">All Statuses</option>
          <option value="pending_approval">
            Pending Approval
          </option>
          <option value="approved">
            Approved
          </option>
          <option value="rejected">
            Rejected
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
                  Date
                </th>
                <th className="p-4 font-medium">
                  Status
                </th>
                <th className="p-4 font-medium">
                  Reviewer
                </th>
                <th className="p-4 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-slate-400"
                  >
                    You have not generated any reports yet.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
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

                      {report.admin_notes && (
                        <p className="mt-1 max-w-sm text-xs text-slate-500">
                          Note: {report.admin_notes}
                        </p>
                      )}
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

                    <td className="p-4 text-slate-500">
                      {report.reviewed_by_name ||
                        "Awaiting review"}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewReport(report)
                          }
                          className="flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openAndPrint(report)
                          }
                          className="flex items-center gap-1 font-bold text-slate-600 hover:underline"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
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
