import { useEffect } from "react";

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        style={{ overscrollBehavior: "contain" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const controlClass = "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500";
export const inputClass = `w-full ${controlClass}`;

const TONES = {
  slate: "bg-slate-50 text-slate-600 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

export function Pill({ tone = "slate", children }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONES[tone] || TONES.slate}`}>{children}</span>;
}

export function PageHeader({ page, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {title}
          {page ? <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Page {page}</span> : null}
        </h1>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
      </div>
      {children ? <div className="no-print flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, tone = "slate" }) {
  const accent = { slate: "text-slate-900", blue: "text-blue-700", green: "text-emerald-700", red: "text-rose-700", amber: "text-amber-700" }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl ${accent}`}>{value}</div>
      {hint ? <div className="mt-1 truncate text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="no-print inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${value === item.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {item.label}
          {item.count != null ? <span className={`ml-1.5 ${value === item.id ? "text-blue-100" : "text-slate-400"}`}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export const primaryButton = "rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:text-sm";
export const secondaryButton = "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:text-sm";
export const rowButton = "rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50";
export const rowDangerButton = "rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50";

export function ErrorNote({ children }) {
  if (!children) return null;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{children}</div>;
}

export function StatusPill({ status }) {
  const styles = {
    in_transit: "bg-blue-50 text-blue-700 border-blue-200",
    documents_pending: "bg-orange-50 text-orange-700 border-orange-200",
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels = {
    in_transit: "In Transit",
    documents_pending: "Documents Pending",
    pending: "Pending",
    completed: "Completed",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${styles[status] || styles.pending}`}>
      {labels[status] || "Pending"}
    </span>
  );
}
