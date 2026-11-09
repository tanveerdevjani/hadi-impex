import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { controlClass, Field, Modal, PageHeader, Pill, StatCard, Tabs, inputClass, primaryButton, rowButton, rowDangerButton, secondaryButton } from "../components/ui.jsx";
import { PURCHASE_STATUSES, addDaysIso, downloadCsv, labelOf, number, purchaseTotals, todayIso, toman, toneOf, usd } from "../lib/business.js";
import { formatDate } from "../lib/format.js";
import { useStore } from "../store.jsx";

function blank(rates) {
  const date = todayIso();
  return { date, supplier: "", supplierContact: "", product: "", grade: "", packing: "", containerId: "", expectedDate: addDaysIso(date, 10), quantityKg: "", cartons: "", rateTomanPerKg: "", usdToToman: rates.usdToToman, notes: "", status: "ordered" };
}

function PurchaseForm({ purchase, onClose }) {
  const { saveRecord, rates, containers, records } = useStore();
  const [form, setForm] = useState(() => (purchase ? { ...blank(rates), ...purchase } : blank(rates)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const total = purchaseTotals(form, []);
  const suppliers = [...new Set([...containers.map((c) => c.supplier), ...records.purchases.map((p) => p.supplier)].filter(Boolean))].sort();

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function pickContainer(id) {
    const container = containers.find((c) => c.id === id);
    setForm((current) => ({
      ...current,
      containerId: id,
      supplier: current.supplier || container?.supplier || "",
      product: current.product || container?.product || "",
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await saveRecord("purchases", form);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={purchase ? `Edit ${purchase.number}` : "New purchase order"} subtitle="Goods bought from a supplier. Payments are recorded on Payment Accounts with this PO number." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Order date"><input type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></Field>
          <Field label="Expected loading"><input type="date" className={inputClass} value={form.expectedDate} onChange={(event) => set("expectedDate", event.target.value)} /></Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value)}>
              {PURCHASE_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-3">Supplier & container</h3>
          <Field label="Supplier">
            <input required list="po-suppliers" className={inputClass} value={form.supplier} onChange={(event) => set("supplier", event.target.value)} />
            <datalist id="po-suppliers">{suppliers.map((name) => <option key={name} value={name} />)}</datalist>
          </Field>
          <Field label="Supplier contact / city"><input className={inputClass} value={form.supplierContact} onChange={(event) => set("supplierContact", event.target.value)} /></Field>
          <Field label="Container (page 6)">
            <select className={inputClass} value={form.containerId} onChange={(event) => pickContainer(event.target.value)}>
              <option value="">Not assigned yet</option>
              {containers.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.product}</option>)}
            </select>
          </Field>
        </section>
        <section className="grid gap-3 sm:grid-cols-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-3">Goods & rate</h3>
          <Field label="Product"><input required className={inputClass} value={form.product} onChange={(event) => set("product", event.target.value)} /></Field>
          <Field label="Grade"><input className={inputClass} value={form.grade} onChange={(event) => set("grade", event.target.value)} /></Field>
          <Field label="Packing"><input className={inputClass} value={form.packing} onChange={(event) => set("packing", event.target.value)} /></Field>
          <Field label="Quantity (KG)"><input type="number" min="0" step="any" className={inputClass} value={form.quantityKg} onChange={(event) => set("quantityKg", event.target.value)} /></Field>
          <Field label="Cartons"><input type="number" min="0" step="1" className={inputClass} value={form.cartons} onChange={(event) => set("cartons", event.target.value)} /></Field>
          <Field label="Rate (Toman / KG)"><input type="number" min="0" step="any" className={inputClass} value={form.rateTomanPerKg} onChange={(event) => set("rateTomanPerKg", event.target.value)} /></Field>
          <Field label="USD to Toman rate"><input type="number" min="0" step="any" className={inputClass} value={form.usdToToman} onChange={(event) => set("usdToToman", event.target.value)} /></Field>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600 sm:col-span-2">
            <div className="flex justify-between"><span>Order value</span><b className="text-slate-900">{toman(total.toman)}</b></div>
            <div className="mt-1 flex justify-between"><span>In USD</span><b className="text-blue-700">{usd(total.usd)}</b></div>
            <div className="mt-1 flex justify-between"><span>Per KG in USD</span><span>{usd(total.usd / (Number(form.quantityKg) || 1), 3)}</span></div>
          </div>
        </section>
        <Field label="Notes"><textarea rows="2" className={inputClass} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></Field>
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryButton} disabled={saving}>{saving ? "Saving..." : purchase ? "Save changes" : "Create order"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Progress({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Purchases() {
  const { records, containers, canWrite, deleteRecord } = useStore();
  const purchases = records.purchases;
  const payments = records.payments;
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => purchases.map((p) => ({ ...p, totals: purchaseTotals(p, payments), container: containers.find((c) => c.id === p.containerId) })), [purchases, payments, containers]);

  const live = rows.filter((p) => p.status !== "cancelled");
  const stats = {
    open: live.filter((p) => p.status !== "received").length,
    valueToman: live.reduce((sum, p) => sum + p.totals.toman, 0),
    valueUsd: live.reduce((sum, p) => sum + p.totals.usd, 0),
    paidUsd: live.reduce((sum, p) => sum + p.totals.paidUsd, 0),
    balanceUsd: live.reduce((sum, p) => sum + p.totals.balanceUsd, 0),
    balanceToman: live.reduce((sum, p) => sum + p.totals.balanceToman, 0),
  };

  const suppliers = useMemo(() => {
    const map = new Map();
    for (const p of live) {
      const row = map.get(p.supplier) || { supplier: p.supplier, orders: 0, toman: 0, paidToman: 0, balanceUsd: 0 };
      row.orders += 1;
      row.toman += p.totals.toman;
      row.paidToman += p.totals.paidToman;
      row.balanceUsd += p.totals.balanceUsd;
      map.set(p.supplier, row);
    }
    return [...map.values()].sort((a, b) => b.balanceUsd - a.balanceUsd);
  }, [live]);

  const visible = rows.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    const needle = query.trim().toLowerCase();
    return !needle || [p.number, p.supplier, p.product, p.container?.number, p.grade].join(" ").toLowerCase().includes(needle);
  });

  async function remove(p) {
    if (!window.confirm(`Delete purchase order ${p.number} from ${p.supplier}?`)) return;
    try {
      await deleteRecord("purchases", p.id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  function exportCsv() {
    downloadCsv(`Purchases_${todayIso()}.csv`, ["PO no.", "Date", "Supplier", "Product", "Grade", "Quantity KG", "Rate Toman/KG", "Total Toman", "USD to Toman", "Total USD", "Paid USD", "Balance USD", "Container", "Status"],
      visible.map((p) => [p.number, p.date, p.supplier, p.product, p.grade, p.quantityKg, p.rateTomanPerKg, Math.round(p.totals.toman), p.usdToToman, p.totals.usd.toFixed(2), p.totals.paidUsd.toFixed(2), p.totals.balanceUsd.toFixed(2), p.container?.number || "", labelOf(PURCHASE_STATUSES, p.status)]));
  }

  return (
    <div className="space-y-6">
      <PageHeader page="4" title="Purchase Management" subtitle="Supplier orders in Toman, linked to containers, with paid amount and balance due">
        <button type="button" className={secondaryButton} onClick={exportCsv}>Export CSV</button>
        {canWrite ? <button type="button" className={primaryButton} onClick={() => setEditing({})}>+ New purchase order</button> : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open orders" value={stats.open} hint="Not yet received" tone="blue" />
        <StatCard label="Committed value" value={usd(stats.valueUsd, 0)} hint={toman(stats.valueToman)} />
        <StatCard label="Paid to suppliers" value={usd(stats.paidUsd, 0)} hint="From Payment Accounts" tone="green" />
        <StatCard label="Balance due" value={usd(stats.balanceUsd, 0)} hint={toman(stats.balanceToman)} tone={stats.balanceUsd > 0 ? "amber" : "slate"} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={setStatus} items={[{ id: "all", label: "All", count: purchases.length }, ...PURCHASE_STATUSES.map((s) => ({ id: s.id, label: s.label, count: purchases.filter((p) => p.status === s.id).length }))]} />
        <input className={`${controlClass} min-w-[220px] flex-1`} placeholder="Search PO no., supplier, product, container..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>{["PO no. & date", "Supplier", "Product & quantity", "Rate / KG", "Order value", "Paid / balance", "Container", "Status", ""].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((p) => (
                <tr key={p.id} className="align-top hover:bg-slate-50">
                  <td className="px-3 py-3"><div className="whitespace-nowrap font-mono font-bold text-slate-900">{p.number}</div><div className="text-xs text-slate-400">{formatDate(p.date)}</div></td>
                  <td className="px-3 py-3"><div className="font-semibold text-slate-800">{p.supplier}</div><div className="text-xs text-slate-500">{p.supplierContact || "—"}</div></td>
                  <td className="px-3 py-3"><div>{p.product}{p.grade ? <span className="text-slate-400"> · {p.grade}</span> : null}</div><div className="text-xs text-slate-500">{number(p.quantityKg)} KG{p.cartons ? ` · ${number(p.cartons)} ctns` : ""}</div></td>
                  <td className="px-3 py-3 font-mono text-xs">{number(p.rateTomanPerKg)} T</td>
                  <td className="px-3 py-3"><div className="font-mono font-bold text-slate-900">{toman(p.totals.toman)}</div><div className="font-mono text-xs text-blue-700">{usd(p.totals.usd)}</div></td>
                  <td className="px-3 py-3">
                    <div className="text-xs"><span className="font-semibold text-emerald-700">{usd(p.totals.paidUsd, 0)}</span> paid</div>
                    <div className={`text-xs ${p.totals.balanceUsd > 0.5 ? "font-semibold text-amber-700" : "text-slate-400"}`}>{p.totals.balanceUsd > 0.5 ? `${usd(p.totals.balanceUsd, 0)} due` : "Settled"}</div>
                    <Progress paid={p.totals.paidToman} total={p.totals.toman} />
                  </td>
                  <td className="px-3 py-3">{p.container ? <Link to={`/containers/${p.container.id}`} className="font-mono text-xs font-bold text-blue-700 hover:underline">{p.container.number}</Link> : <span className="text-xs text-slate-400">Not assigned</span>}</td>
                  <td className="px-3 py-3"><Pill tone={toneOf(PURCHASE_STATUSES, p.status)}>{labelOf(PURCHASE_STATUSES, p.status)}</Pill></td>
                  <td className="px-3 py-3">
                    {canWrite ? (
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className={rowButton} onClick={() => setEditing(p)}>Edit</button>
                        <button type="button" className={rowDangerButton} onClick={() => remove(p)}>Delete</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!visible.length ? <tr><td colSpan="9" className="px-3 py-12 text-center text-sm text-slate-500">{purchases.length ? "No orders match this filter." : "No purchase orders yet. Create one with + New purchase order."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Supplier balances</h2>
          <p className="text-xs text-slate-500">Open and received orders, excluding cancelled ones</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>{["Supplier", "Orders", "Ordered", "Paid", "Balance due"].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <tr key={s.supplier}>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{s.supplier}</td>
                <td className="px-4 py-2.5">{s.orders}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{toman(s.toman)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-emerald-700">{toman(s.paidToman)}</td>
                <td className={`px-4 py-2.5 font-mono text-xs font-bold ${s.balanceUsd > 0.5 ? "text-amber-700" : "text-slate-400"}`}>{s.balanceUsd > 0.5 ? usd(s.balanceUsd, 0) : "Settled"}</td>
              </tr>
            ))}
            {!suppliers.length ? <tr><td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">No supplier orders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? <PurchaseForm purchase={editing.id ? editing : null} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
