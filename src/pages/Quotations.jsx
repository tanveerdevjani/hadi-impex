import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import QuotationForm from "../components/QuotationForm.jsx";
import { controlClass, PageHeader, Pill, StatCard, Tabs, primaryButton, rowButton, rowDangerButton, secondaryButton } from "../components/ui.jsx";
import { QUOTE_STATUSES, downloadCsv, labelOf, number, quoteTotals, todayIso, toneOf, usd } from "../lib/business.js";
import { formatDate } from "../lib/format.js";
import { useStore } from "../store.jsx";

export default function Quotations() {
  const { records, canWrite, deleteRecord } = useStore();
  const quotes = records.quotations;
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const today = todayIso();

  const stats = useMemo(() => {
    const open = quotes.filter((q) => q.status === "draft" || q.status === "sent");
    const accepted = quotes.filter((q) => q.status === "accepted");
    const decided = quotes.filter((q) => ["accepted", "rejected", "expired"].includes(q.status));
    const priced = quotes.filter((q) => q.status !== "rejected" && Number(q.costUsdPerKg) > 0 && Number(q.priceUsdPerKg) > 0);
    const revenue = priced.reduce((sum, q) => sum + quoteTotals(q).total, 0);
    const margin = priced.reduce((sum, q) => sum + quoteTotals(q).margin, 0);
    return {
      openCount: open.length,
      openValue: open.reduce((sum, q) => sum + quoteTotals(q).total, 0),
      acceptedValue: accepted.reduce((sum, q) => sum + quoteTotals(q).total, 0),
      acceptedCount: accepted.length,
      winRate: decided.length ? Math.round((accepted.length / decided.length) * 100) : null,
      marginPct: revenue ? (margin / revenue) * 100 : null,
    };
  }, [quotes]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quotes.filter((q) => {
      if (status !== "all" && q.status !== status) return false;
      if (!needle) return true;
      return [q.number, q.buyer, q.product, q.destination, q.grade].join(" ").toLowerCase().includes(needle);
    });
  }, [quotes, status, query]);

  async function remove(quote) {
    if (!window.confirm(`Delete quotation ${quote.number} for ${quote.buyer}?`)) return;
    try {
      await deleteRecord("quotations", quote.id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  function exportCsv() {
    downloadCsv(`Quotations_${today}.csv`, ["Quote no.", "Date", "Valid until", "Buyer", "Destination", "Incoterm", "Product", "Grade", "Quantity KG", "Price USD/KG", "Total USD", "Cost USD/KG", "Margin %", "Status"],
      rows.map((q) => {
        const t = quoteTotals(q);
        return [q.number, q.date, q.validUntil, q.buyer, q.destination, q.incoterm, q.product, q.grade, q.quantityKg, q.priceUsdPerKg, t.total.toFixed(2), q.costUsdPerKg, t.marginPct == null ? "" : t.marginPct.toFixed(1), labelOf(QUOTE_STATUSES, q.status)];
      }));
  }

  return (
    <div className="space-y-6">
      <PageHeader page="3" title="Quotations" subtitle="Price offers to buyers, with margin check against landed cost and a printable quote">
        <button type="button" className={secondaryButton} onClick={exportCsv}>Export CSV</button>
        {canWrite ? <button type="button" className={primaryButton} onClick={() => setEditing({})}>+ New quotation</button> : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open quotes" value={stats.openCount} hint={`${usd(stats.openValue, 0)} awaiting reply`} tone="blue" />
        <StatCard label="Accepted value" value={usd(stats.acceptedValue, 0)} hint={`${stats.acceptedCount} accepted`} tone="green" />
        <StatCard label="Win rate" value={stats.winRate == null ? "—" : `${stats.winRate}%`} hint="Accepted out of decided quotes" />
        <StatCard label="Average margin" value={stats.marginPct == null ? "—" : `${stats.marginPct.toFixed(1)}%`} hint="Price vs landed cost" tone={stats.marginPct != null && stats.marginPct < 0 ? "red" : "slate"} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          onChange={setStatus}
          items={[{ id: "all", label: "All", count: quotes.length }, ...QUOTE_STATUSES.map((s) => ({ id: s.id, label: s.label, count: quotes.filter((q) => q.status === s.id).length }))]}
        />
        <input className={`${controlClass} min-w-[220px] flex-1`} placeholder="Search quote no., buyer, product, port..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>{["Quote no. & date", "Buyer & destination", "Product & quantity", "Price / KG", "Total", "Margin", "Valid until", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((q) => {
                const t = quoteTotals(q);
                const lapsed = q.validUntil && q.validUntil < today && (q.status === "draft" || q.status === "sent");
                return (
                  <tr key={q.id} className="align-top hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <Link to={`/quotations/${q.id}`} className="whitespace-nowrap font-mono text-sm font-bold text-slate-900 hover:text-blue-700">{q.number}</Link>
                      <div className="text-xs text-slate-400">{formatDate(q.date)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-slate-800">{q.buyer}</div>
                      <div className="text-xs text-slate-500">{q.destination || "—"} · {q.incoterm}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-slate-800">{q.product}{q.grade ? <span className="text-slate-400"> · {q.grade}</span> : null}</div>
                      <div className="text-xs text-slate-500">{number(q.quantityKg)} KG{q.cartons ? ` · ${number(q.cartons)} ctns` : ""}</div>
                    </td>
                    <td className="px-3 py-3 font-mono">{usd(q.priceUsdPerKg, 3)}</td>
                    <td className="px-3 py-3 font-mono font-bold text-blue-700">{usd(t.total)}</td>
                    <td className={`px-3 py-3 font-semibold ${t.marginPct == null ? "text-slate-400" : t.margin < 0 ? "text-rose-600" : "text-emerald-700"}`}>{t.marginPct == null ? "—" : `${t.marginPct.toFixed(1)}%`}</td>
                    <td className={`px-3 py-3 text-xs ${lapsed ? "font-bold text-rose-600" : "text-slate-600"}`}>{formatDate(q.validUntil)}{lapsed ? <div>Lapsed</div> : null}</td>
                    <td className="px-3 py-3"><Pill tone={toneOf(QUOTE_STATUSES, q.status)}>{labelOf(QUOTE_STATUSES, q.status)}</Pill></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link to={`/quotations/${q.id}`} className={rowButton}>View</Link>
                        {canWrite ? <button type="button" className={rowButton} onClick={() => setEditing(q)}>Edit</button> : null}
                        {canWrite ? <button type="button" className={rowDangerButton} onClick={() => remove(q)}>Delete</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan="9" className="px-3 py-12 text-center text-sm text-slate-500">{quotes.length ? "No quotations match this filter." : "No quotations yet. Create the first one with + New quotation."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? <QuotationForm quote={editing.id ? editing : null} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
