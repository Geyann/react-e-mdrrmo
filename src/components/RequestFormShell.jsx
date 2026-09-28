import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export const REQUEST_FORM_GRADIENT =
  "bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600";

export const FORM_INPUT_CLASS =
  "w-full min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-indigo-300 hover:bg-white focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500";

export const FORM_LABEL_CLASS =
  "text-sm font-bold text-slate-700 dark:text-slate-200";

export const REQUIRED_MARK_CLASS = "text-rose-500";

export function FormAlert({
  type = "error",
  children,
}) {
  if (!children) {
    return null;
  }

  const config = {
    error: {
      wrapper:
        "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-200",
      icon: AlertCircle,
      iconClass: "text-rose-600 dark:text-rose-400",
    },
    success: {
      wrapper:
        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    info: {
      wrapper:
        "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-200",
      icon: Info,
      iconClass: "text-blue-600 dark:text-blue-400",
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm ${config.wrapper}`}
    >
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1 break-words">
        {children}
      </div>
    </div>
  );
}

export function FormSectionHeading({
  icon: Icon,
  title,
  description,
  step,
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md shadow-blue-600/20">
        {step ? (
          <span className="text-sm font-black">
            {step}
          </span>
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 pt-0.5">
        <h2 className="font-black text-slate-800 dark:text-slate-100">
          {title}
        </h2>

        {description && (
          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function FormField({
  id,
  label,
  required = false,
  hint,
  className = "",
  children,
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200"
      >
        {label}

        {required && (
          <span className="ml-1 text-rose-500">*</span>
        )}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function RequestFormShell({
  icon: Icon,
  eyebrow = "SafeResponse request",
  title,
  description,
  account,
  formId,
  onSubmit,
  onReset,
  error = "",
  success = "",
  submitting = false,
  submitDisabled = false,
  submitLabel = "Submit Request",
  submitIcon: SubmitIcon = Send,
  showReset = true,
  resetLabel = "Clear Form",
  maxWidth = "max-w-4xl",
  footerNote,
  children,
}) {
  const initials =
    account?.initials ||
    account?.name?.charAt(0)?.toUpperCase() ||
    "U";

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 sm:py-10">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-16 -z-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-10 -z-10 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
      />

      <div className={`${maxWidth} mx-auto`}>
        {/* Gradient header */}
        <section
          className={`${REQUEST_FORM_GRADIENT} relative overflow-hidden rounded-[2rem] px-5 py-7 shadow-2xl shadow-blue-950/20 sm:px-8 sm:py-8`}
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 left-20 h-48 w-48 rounded-full bg-indigo-950/15 blur-2xl"
          />

          <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div className="flex flex-col items-center sm:flex-row sm:gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg backdrop-blur-sm">
                <Icon
                  className="h-8 w-8 text-white"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-4 sm:mt-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-100">
                  {eyebrow}
                </p>

                <h1 className="mt-1 text-2xl font-black leading-tight text-white sm:text-3xl">
                  {title}
                </h1>

                {description && (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/85">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm sm:mt-0">
              <ShieldCheck className="h-4 w-4" />
              Secure Community Service
            </div>
          </div>

          {/* Account card */}
          {account && (
            <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 font-black text-white ring-1 ring-white/20">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">
                  {account.name}
                </p>

                {account.detail && (
                  <p className="mt-0.5 truncate text-xs text-blue-50/80">
                    {account.detail}
                  </p>
                )}
              </div>

              {account.badge && (
                <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white ring-1 ring-white/15">
                  {account.badge}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Form card */}
        <section className="relative z-10 -mt-5 sm:-mt-6">
          <form
            id={formId}
            onSubmit={onSubmit}
            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
          >
            <div
              className={`h-1.5 ${REQUEST_FORM_GRADIENT}`}
              aria-hidden="true"
            />

            <div className="p-5 sm:p-8 lg:p-10">
              <FormAlert type="error">
                {error}
              </FormAlert>

              <FormAlert type="success">
                {success}
              </FormAlert>

              {children}
            </div>

            {/* Form actions */}
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/90 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6 dark:border-slate-700 dark:bg-slate-950/50">
              {showReset && onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  disabled={submitting}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
                >
                  <RotateCcw className="h-4 w-4" />
                  {resetLabel}
                </button>
              )}

              <button
                type="submit"
                disabled={submitDisabled || submitting}
                className={`${REQUEST_FORM_GRADIENT} inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-7 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-w-48`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <SubmitIcon className="h-5 w-5" />
                    {submitLabel}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {footerNote && (
          <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
            {footerNote}
          </p>
        )}
      </div>
    </div>
  );
}
