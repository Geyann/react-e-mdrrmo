import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Global alert / confirm modals (replaces window.alert & confirm)
═══════════════════════════════════════════════════════════════ */

const DialogContext = createContext(null);

const VARIANT = {
  info: {
    icon: Info,
    iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
  },
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500",
  },
  error: {
    icon: AlertCircle,
    iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    btn: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    btn: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
  },
};

function detectVariant(message = "", explicit) {
  if (explicit && VARIANT[explicit]) return explicit;
  const m = String(message).toLowerCase();
  if (/(fail|error|missing|unable|denied|invalid)/.test(m)) return "error";
  if (/(success|created|approved|saved|updated|marked)/.test(m)) return "success";
  if (/(sure|confirm|cannot be undone|delete|reject|dismiss)/.test(m)) return "warning";
  return "info";
}

export function AppDialogProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const idRef = useRef(0);
  const resolvers = useRef(new Map());

  const push = useCallback((item) => {
    const id = ++idRef.current;
    setQueue((q) => [...q, { ...item, id }]);
    return new Promise((resolve) => {
      resolvers.current.set(id, resolve);
    });
  }, []);

  const close = useCallback((id, result) => {
    const resolve = resolvers.current.get(id);
    if (resolve) {
      resolve(result);
      resolvers.current.delete(id);
    }
    setQueue((q) => q.filter((d) => d.id !== id));
  }, []);

  const showAlert = useCallback(
    (message, options = {}) => {
      const text = typeof message === "string" ? message : String(message ?? "");
      return push({
        mode: "alert",
        title: options.title || "Notice",
        message: text,
        variant: detectVariant(text, options.variant),
        okLabel: options.okLabel || "OK",
      });
    },
    [push],
  );

  const showConfirm = useCallback(
    (message, options = {}) => {
      const text = typeof message === "string" ? message : String(message ?? "");
      return push({
        mode: "confirm",
        title: options.title || "Please confirm",
        message: text,
        variant: detectVariant(text, options.variant || "warning"),
        okLabel: options.okLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
      });
    },
    [push],
  );

  const value = useMemo(
    () => ({ showAlert, showConfirm }),
    [showAlert, showConfirm],
  );

  // Keep only the front of the queue visible
  const current = queue[0] || null;

  useEffect(() => {
    if (!current) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        close(current.id, current.mode === "confirm" ? false : undefined);
      }
      if (e.key === "Enter" && current.mode === "alert") {
        close(current.id, undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, close]);

  return (
    <DialogContext.Provider value={value}>
      {children}

      {current && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="presentation"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Dismiss dialog"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() =>
              close(current.id, current.mode === "confirm" ? false : undefined)
            }
          />

          {/* Panel */}
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`app-dialog-title-${current.id}`}
            aria-describedby={`app-dialog-desc-${current.id}`}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              {(() => {
                const v = VARIANT[current.variant] || VARIANT.info;
                const Icon = v.icon;
                return (
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.iconWrap}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                );
              })()}

              <div className="min-w-0 flex-1">
                <h2
                  id={`app-dialog-title-${current.id}`}
                  className="text-base font-black text-slate-900 dark:text-white"
                >
                  {current.title}
                </h2>
                <p
                  id={`app-dialog-desc-${current.id}`}
                  className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300"
                >
                  {current.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  close(current.id, current.mode === "confirm" ? false : undefined)
                }
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end">
              {current.mode === "confirm" && (
                <button
                  type="button"
                  onClick={() => close(current.id, false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {current.cancelLabel}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() =>
                  close(current.id, current.mode === "confirm" ? true : undefined)
                }
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  (VARIANT[current.variant] || VARIANT.info).btn
                }`}
              >
                {current.okLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    // Safe fallback when provider is missing (avoids white-screen)
    return {
      showAlert: async (message) => {
        // eslint-disable-next-line no-alert
        window.alert(String(message ?? ""));
      },
      showConfirm: async (message) =>
        // eslint-disable-next-line no-alert
        window.confirm(String(message ?? "")),
    };
  }
  return ctx;
}

export default AppDialogProvider;