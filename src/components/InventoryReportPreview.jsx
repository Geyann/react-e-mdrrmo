import {
  AlertTriangle,
  FileText,
  Printer,
  X,
} from "lucide-react";

const statusClasses = {
  pending_approval:
    "bg-yellow-100 text-yellow-700 border-yellow-200",
  approved:
    "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected:
    "bg-red-100 text-red-700 border-red-200",
};

const prettyStatus = (status) => {
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

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function InventoryReportPreview({
  report,
  onClose,
  onPrint,
}) {
  if (!report) return null;

  const rawContent = report.content;
  const content =
    rawContent &&
    typeof rawContent === "object" &&
    !Array.isArray(rawContent)
      ? rawContent
      : {};

  const tools = Array.isArray(content.tools)
    ? content.tools
    : [];

  const supplies = Array.isArray(content.supplies)
    ? content.supplies
    : [];

  const summary =
    content.summary &&
    typeof content.summary === "object"
      ? content.summary
      : {};

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handlePrint = () => {
    const toolsRows = tools
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.name || "—")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td class="center">${escapeHtml(item.quantity ?? "—")}</td>
        <td class="center">${escapeHtml(item.min_quantity ?? "—")}</td>
        <td>${escapeHtml(item.unit || "—")}</td>
        <td>${escapeHtml(item.location || "—")}</td>
        <td>${escapeHtml(item.expiry_date ? String(item.expiry_date).slice(0, 10) : "—")}</td>
      </tr>`,
      )
      .join("");

    const suppliesRows = supplies
      .map(
        (item) => `
      <tr>
        <td>${escapeHtml(item.name || "—")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td class="center">${escapeHtml(item.quantity ?? "—")}</td>
        <td class="center">${escapeHtml(item.min_quantity ?? "—")}</td>
        <td>${escapeHtml(item.unit || "—")}</td>
        <td>${escapeHtml(item.location || "—")}</td>
        <td>${escapeHtml(item.expiry_date ? String(item.expiry_date).slice(0, 10) : "—")}</td>
      </tr>`,
      )
      .join("");

    const toolsTable = tools.length
      ? `
      <div class="section avoid-break">
        <h2 class="section-title">Tools (${tools.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th class="center">Qty</th>
              <th class="center">Min</th><th>Unit</th><th>Location</th><th>Expiry</th>
            </tr>
          </thead>
          <tbody>${toolsRows}</tbody>
        </table>
      </div>`
      : "";

    const suppliesTable = supplies.length
      ? `
      <div class="section avoid-break">
        <h2 class="section-title">Supplies (${supplies.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Category</th><th class="center">Qty</th>
              <th class="center">Min</th><th>Unit</th><th>Location</th><th>Expiry</th>
            </tr>
          </thead>
          <tbody>${suppliesRows}</tbody>
        </table>
      </div>`
      : "";

    const summaryCards = `
      <div class="grid-4">
        <div class="card"><div class="card-label">Tools</div><div class="card-value">${summary.tools_count ?? tools.length}</div></div>
        <div class="card"><div class="card-label">Supplies</div><div class="card-value">${summary.supplies_count ?? supplies.length}</div></div>
        <div class="card"><div class="card-label">Low Stock</div><div class="card-value">${summary.low_stock_count ?? "—"}</div></div>
        <div class="card"><div class="card-label">Expired</div><div class="card-value">${summary.expired_count ?? "—"}</div></div>
      </div>`;

    const generated = formatDate(report.created_at);
    const statusLabel = prettyStatus(report.status);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title || "Inventory Report")}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0 !important; padding: 0 !important;
      background: #ffffff; color: #000000;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      font-size: 12px; line-height: 1.45;
      height: auto !important; min-height: 0 !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    h1 { margin: 0; font-size: 18px; text-align: center; color: #000; }
    h2, .section-title {
      margin: 0 0 10px; font-size: 13px; font-weight: 800; color: #000;
      border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;
    }
    .header {
      text-align: center; border-bottom: 2px solid #000;
      padding-bottom: 12px; margin-bottom: 16px;
    }
    .muted { color: #334155; font-size: 11px; }
    .grid-4 {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 8px; margin-bottom: 16px;
    }
    .card {
      border: 1px solid #cbd5e1; border-radius: 10px;
      padding: 10px 12px; background: #fff; color: #000;
    }
    .card-label { font-size: 10px; font-weight: 700; }
    .card-value { font-size: 18px; font-weight: 800; margin-top: 2px; }
    .section { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td {
      border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left;
      vertical-align: top; word-wrap: break-word;
      background: #fff; color: #000; font-size: 11px;
    }
    th { font-size: 10px; border-bottom: 2px solid #94a3b8; }
    td.center, th.center { text-align: center; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .footer {
      border-top: 1px solid #cbd5e1; padding-top: 10px;
      text-align: center; color: #334155; font-size: 10px; margin-top: 14px;
    }
    @media print {
      html, body {
        height: auto !important; min-height: 0 !important;
        overflow: visible !important; background: #ffffff !important;
        color: #000000 !important; margin: 0 !important; padding: 0 !important;
      }
      * {
        background: #ffffff !important; background-color: #ffffff !important;
        box-shadow: none !important; color: #000000 !important;
      }
      table, th, td, .card {
        background: #ffffff !important; border-color: #cbd5e1 !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="header avoid-break">
    <p class="muted" style="font-weight:700;letter-spacing:0.12em;text-transform:uppercase">E-MDRRMO</p>
    <h1>${escapeHtml(report.title || "Inventory Report")}</h1>
    <p class="muted" style="margin-top:8px">Type: ${escapeHtml(String(report.report_type || "").replace(/_/g, " "))}</p>
    <p class="muted">Status: ${escapeHtml(statusLabel)}</p>
    <p class="muted">Generated: ${escapeHtml(generated)}</p>
    <p class="muted">By: ${escapeHtml(report.generated_by_name || "Staff")}</p>
  </div>

  <div class="section avoid-break">
    <h2 class="section-title">Summary</h2>
    ${summaryCards}
  </div>

  ${toolsTable}
  ${suppliesTable}

  ${
    !tools.length && !supplies.length
      ? `<p class="muted" style="text-align:center;margin:24px 0">This report does not contain inventory details.</p>`
      : ""
  }

  <div class="footer avoid-break">
    <p>This report is system-generated and reflects the inventory snapshot taken when it was created.</p>
    <p>© ${new Date().getFullYear()} E-MDRRMO</p>
  </div>
</body>
</html>`;

    const existing = document.getElementById("inventory-report-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "inventory-report-print-frame";
    iframe.setAttribute("title", "Inventory Report Print");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const triggerPrint = () => {
      try {
        const win = iframe.contentWindow;
        void win.document.body.offsetHeight;
        win.focus();
        win.print();
      } catch (err) {
        console.error("Print failed:", err);
      }
      const cleanup = () => {
        try {
          iframe.remove();
        } catch {
          /* ignore */
        }
      };
      try {
        iframe.contentWindow.onafterprint = cleanup;
      } catch {
        /* ignore */
      }
      setTimeout(cleanup, 120000);
    };

    const schedulePrint = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(triggerPrint, 400);
        });
      });
    };

    if (iframe.contentWindow.document.readyState === "complete") {
      schedulePrint();
    } else {
      iframe.onload = schedulePrint;
    }
  };

  const renderTable = (title, rows) => {
    if (!rows.length) return null;

    return (
      <section className="mb-7 inventory-print-flow">
        <h2 className="mb-3 text-lg font-bold text-slate-800">
          {title}
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="inventory-print-table-head border border-slate-200 p-2 text-left">
                  Name
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-left">
                  Category
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-center">
                  Qty
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-center">
                  Min
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-left">
                  Unit
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-left">
                  Location
                </th>
                <th className="inventory-print-table-head border border-slate-200 p-2 text-center">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item, index) => {
                const minimum =
                  item.min_quantity ?? item.min ?? 0;

                const lowStock =
                  item.status === "Low Stock" ||
                  Number(item.quantity) <= Number(minimum);

                return (
                  <tr
                    key={`${item.name}-${index}`}
                    className={
                      lowStock
                        ? "bg-red-50"
                        : ""
                    }
                  >
                    <td className="inventory-print-row border border-slate-200 p-2 font-semibold">
                      {item.name || "—"}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2">
                      {item.category || "—"}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2 text-center">
                      {item.quantity ?? 0}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2 text-center">
                      {minimum}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2">
                      {item.unit || "—"}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2">
                      {item.location || "—"}
                    </td>
                    <td className="inventory-print-row border border-slate-200 p-2 text-center">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          lowStock
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {lowStock
                          ? "Low Stock"
                          : "Sufficient"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  return (
    <>
      <div
        className="inventory-report-overlay fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-report-title"
          className="inventory-report-print my-8 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="print-hidden sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-100 p-2">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>

              <div>
                <h3 className="font-bold text-slate-800">
                  Inventory Report Preview
                </h3>
                <p className="text-xs text-slate-400">
                  Report #{report.id}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close report preview"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-8 text-slate-800">
            <header className="mb-7 border-b-2 border-slate-800 pb-5 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                E-MDRRMO
              </p>

              <h1
                id="inventory-report-title"
                className="mt-1 text-2xl font-black text-slate-900"
              >
                MDRRMO INVENTORY REPORT
              </h1>

              <p className="mt-2 text-lg font-semibold text-indigo-700">
                {report.title || "Inventory Report"}
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    statusClasses[report.status] ||
                    "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  {prettyStatus(report.status)}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  Report #{report.id}
                </span>
              </div>

              <div className="mt-4 space-y-1 text-sm text-slate-500">
                <p>
                  Generated: {formatDate(report.created_at)}
                </p>
                <p>
                  Prepared by:{" "}
                  {report.generated_by_name || "Staff member"}
                </p>

                {report.reviewed_by_name && (
                  <p>
                    Reviewed by: {report.reviewed_by_name}
                  </p>
                )}
              </div>
            </header>

            {report.admin_notes && (
              <div
                className={`mb-6 rounded-xl border p-4 ${
                  report.status === "rejected"
                    ? "border-red-200 bg-red-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
                  <AlertTriangle className="h-4 w-4" />
                  Administrator Notes
                </p>

                <p className="mt-2 text-sm text-slate-700">
                  {report.admin_notes}
                </p>
              </div>
            )}

            {Object.keys(summary).length > 0 && (
              <section className="mb-7">
                <h2 className="mb-3 text-lg font-bold text-slate-800">
                  Summary
                </h2>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {Object.entries(summary).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"
                    >
                      <p className="text-xs font-bold uppercase text-slate-500">
                        {key.replace(/_/g, " ")}
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-800">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tools.length > 0 &&
              renderTable("Tools & Equipment", tools)}

            {supplies.length > 0 &&
              renderTable("Medical Supplies", supplies)}

            {tools.length === 0 && supplies.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-semibold text-slate-600">
                  This report does not contain inventory details.
                </p>
              </div>
            )}

            <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
              <p>
                This report is system-generated and reflects the
                inventory snapshot taken when it was created.
              </p>
              <p className="mt-1">
                © 2026 E-MDRRMO Naic
              </p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
}