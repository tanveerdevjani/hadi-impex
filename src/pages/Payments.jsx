import { useMemo, useState } from "react";
import { controlClass, Field, Modal, PageHeader, Pill, StatCard, Tabs, inputClass, primaryButton, rowButton, rowDangerButton, secondaryButton } from "../components/ui.jsx";
import { CURRENCIES, PAYMENT_CATEGORIES, PAYMENT_METHODS, downloadCsv, labelOf, money, paymentsFor, purchaseTotals, recordUsd, todayIso, toman, unitsPerUsd, usd } from "../lib/business.js";
import { formatDate } from "../lib/format.js";
import { useStore } from "../store.jsx";

function blank(direction, rates) {
  return { date: todayIso(), direction, category: direction === "in" ? "buyer_receipt" : "supplier_payment", party: "", reference: "", currency: "USD", amount: "", unitsPerUsd: unitsPerUsd("USD", rates), method: "bank_transfer", notes: "" };
}

function PaymentForm({ payment, direction, onClose }) {
  const { saveRecord, rates, invoices, records, containers } = useStore();
  const [form, setForm] = useState(() => (payment ? { ...payment } : blank(direction, rates)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const categories = PAYMENT_CATEGORIES.filter((c) => c.direction === form.direction || c.direction === "both");
  const references = [
    ...invoices.map((pi) => ({ value: pi.number, party: pi.buyer, label: `PI · ${pi.buyer}`, direction: "in" })),
    ...records.purchases.map((p) => ({ value: p.number, party: p.supplier, label: `PO · ${p.supplier}`, direction: "out" })),
    ...containers.map((c) => ({ value: c.number, party: "", label: `Container · ${c.product}`, direction: "out" })),
  ].filter((ref) => ref.value);
  const parties = [...new Set([...invoices.map((pi) => pi.buyer), ...records.purchases.map((p) => p.supplier), ...records.payments.map((p) => p.party)].filter(Boolean))].sort();
  const usdValue = (Number(form.amount) || 0) / (Number(form.unitsPerUsd) || 1);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDirection(next) {
    setForm((current) => ({ ...current, direction: next, category: next === "in" ? "buyer_receipt" : "supplier_payment" }));
  }

  function setCurrency(currency) {
    setForm((current) => ({ ...current, currency, unitsPerUsd: unitsPerUsd(currency, rates) }));
  }

  function setReference(value) {
    const match = references.find((ref) => ref.value.toLowerCase() === value.trim().toLowerCase());
    setForm((current) => ({ ...current, reference: value, party: current.party || match?.party || "", currency: match?.value.startsWith("PO-") && !current.amount ? "TOMAN" : current.currency, unitsPerUsd: match?.value.startsWith("PO-") && !current.amount ? rates.usdToToman : current.unitsPerUsd }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await saveRecord("payments", form);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={payment ? `Edit ${payment.number}` : form.direction === "in" ? "Record money received" : "Record money paid"} subtitle="Use the PI or PO number as reference so balances update automatically." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {[["in", "Money in", "From a buyer"], ["out", "Money out", "To a supplier or service"]].map(([id, title, text]) => (
            <button key={id} type="button" onClick={() => setDirection(id)} className={`rounded-xl border p-3 text-left ${form.direction === id ? (id === "in" ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50") : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <div className={`text-sm font-bold ${id === "in" ? "text-emerald-700" : "text-rose-700"}`}>{title}</div>
              <div className="text-xs text-slate-500">{text}</div>
            </button>
          ))}
        </div>
        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Date"><input type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></Field>
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={(event) => set("category", event.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Method">
            <select className={inputClass} value={form.method} onChange={(event) => set("method", event.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Reference (PI, PO, or container no.)">
            <input list="pay-refs" className={inputClass} value={form.reference} onChange={(event) => setReference(event.target.value)} />
            <datalist id="pay-refs">{references.filter((ref) => ref.direction === form.direction).map((ref) => <option key={ref.value} value={ref.value}>{ref.label}</option>)}</datalist>
          </Field>
          <Field label={form.direction === "in" ? "Received from" : "Paid to"}>
            <input required list="pay-parties" className={inputClass} value={form.party} onChange={(event) => set("party", event.target.value)} />
            <datalist id="pay-parties">{parties.map((name) => <option key={name} value={name} />)}</datalist>
          </Field>
          <Field label="Currency">
            <select className={inputClass} value={form.currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c === "TOMAN" ? "Toman" : c}</option>)}
            </select>
          </Field>
          <Field label="Amount"><input type="number" required min="0" step="any" className={inputClass} value={form.amount} onChange={(event) => set("amount", event.target.value)} /></Field>
          {form.currency !== "USD" ? (
            <Field label={`${form.currency === "TOMAN" ? "Toman" : form.currency} per 1 USD`}><input type="number" min="0" step="any" className={inputClass} value={form.unitsPerUsd} onChange={(event) => set("unitsPerUsd", event.target.value)} /></Field>
          ) : <div />}
          <div className="flex flex-col justify-center rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600">
            <span>USD equivalent</span>
            <b className="text-base text-blue-700">{usd(usdValue)}</b>
          </div>
        </section>
        <Field label="Notes"><textarea rows="2" className={inputClass} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></Field>
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryButton} disabled={saving}>{saving ? "Saving..." : payment ? "Save changes" : "Save entry"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Balance({ value }) {
  return value > 0.5 ? <span className="font-mono font-bold text-amber-700">{usd(value)}</span> : <Pill tone="green">Settled</Pill>;
}

export default function Payments() {
  const { records, invoices, canWrite, deleteRecord } = useStore();
  const payments = records.payments;
  const [tab, setTab] = useState("ledger");
  const [direction, setDirection] = useState("all");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);

  const receivables = useMemo(() => invoices.filter((pi) => pi.status !== "CANCELLED").map((pi) => {
    const received = paymentsFor(payments, pi.number, "in").reduce((sum, row) => sum + recordUsd(row), 0);
    return { ...pi, received, balance: Math.max(0, pi.valueUsd - received) };
  }), [invoices, payments]);

  const payables = useMemo(() => records.purchases.filter((p) => p.status !== "cancelled").map((p) => ({ ...p, totals: purchaseTotals(p, payments) })), [records.purchases, payments]);

  const totalIn = payments.filter((p) => p.direction === "in").reduce((sum, p) => sum + recordUsd(p), 0);
  const totalOut = payments.filter((p) => p.direction === "out").reduce((sum, p) => sum + recordUsd(p), 0);
  const owedToUs = receivables.filter((pi) => pi.status !== "DRAFT").reduce((sum, pi) => sum + pi.balance, 0);
  const weOwe = payables.reduce((sum, p) => sum + p.totals.balanceUsd, 0);

  const ledger = payments.filter((p) => {
    if (direction !== "all" && p.direction !== direction) return false;
    if (category && p.category !== category) return false;
    if (month && !String(p.date).startsWith(month)) return false;
    const needle = query.trim().toLowerCase();
    return !needle || [p.number, p.party, p.reference, p.notes].join(" ").toLowerCase().includes(needle);
  });
  const ledgerIn = ledger.filter((p) => p.direction === "in").reduce((sum, p) => sum + recordUsd(p), 0);
  const ledgerOut = ledger.filter((p) => p.direction === "out").reduce((sum, p) => sum + recordUsd(p), 0);

  async function remove(p) {
    if (!window.confirm(`Delete entry ${p.number} (${money(p.amount, p.currency)})?`)) return;
    try {
      await deleteRecord("payments", p.id);
    } catch (err) {
      window.alert(err.message);
    }
  }

  function exportCsv() {
    downloadCsv(`Payments_${todayIso()}.csv`, ["Entry no.", "Date", "In / Out", "Category", "Party", "Reference", "Currency", "Amount", "Rate per USD", "USD", "Method", "Notes"],
      ledger.map((p) => [p.number, p.date, p.direction === "in" ? "In" : "Out", labelOf(PAYMENT_CATEGORIES, p.category), p.party, p.reference, p.currency, p.amount, p.unitsPerUsd, recordUsd(p).toFixed(2), labelOf(PAYMENT_METHODS, p.method), p.notes]));
  }

  return (
    <div className="space-y-6">
      <PageHeader page="5" title="Payment Accounts" subtitle="Money received from buyers and paid to suppliers, freight, and port services">
        <button type="button" className={secondaryButton} onClick={exportCsv}>Export CSV</button>
        {canWrite ? <button type="button" className={secondaryButton} onClick={() => setEditing({ direction: "out" })}>− Money out</button> : null}
        {canWrite ? <button type="button" className={primaryButton} onClick={() => setEditing({ direction: "in" })}>+ Money in</button> : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Received" value={usd(totalIn, 0)} hint="All money in, in USD" tone="green" />
        <StatCard label="Paid out" value={usd(totalOut, 0)} hint="Suppliers, freight, and services" tone="red" />
        <StatCard label="Buyers still owe" value={usd(owedToUs, 0)} hint="Issued PIs from page 1" tone="amber" />
        <StatCard label="We owe suppliers" value={usd(weOwe, 0)} hint="Open orders from page 4" />
      </div>

      <Tabs value={tab} onChange={setTab} items={[{ id: "ledger", label: "Ledger", count: payments.length }, { id: "receivables", label: "Buyer receivables", count: receivables.length }, { id: "payables", label: "Supplier payables", count: payables.length }]} />

      {tab === "ledger" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <input className={`${controlClass} min-w-[200px] flex-1 bg-slate-50`} placeholder="Search party, reference, notes..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className={controlClass} value={direction} onChange={(event) => setDirection(event.target.value)}>
              <option value="all">In and out</option>
              <option value="in">Money in</option>
              <option value="out">Money out</option>
            </select>
            <select className={controlClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {PAYMENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <input type="month" className={controlClass} value={month} onChange={(event) => setMonth(event.target.value)} />
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600" onClick={() => { setQuery(""); setDirection("all"); setCategory(""); setMonth(""); }}>Clear</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>{["Date & entry", "Party", "Category", "Reference", "Amount", "USD", "Method", ""].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map((p) => (
                    <tr key={p.id} className="align-top hover:bg-slate-50">
                      <td className="px-3 py-3"><div className="font-semibold">{formatDate(p.date)}</div><div className="font-mono text-xs text-slate-400">{p.number}</div></td>
                      <td className="px-3 py-3"><div className="font-semibold text-slate-800">{p.party}</div>{p.notes ? <div className="max-w-[220px] truncate text-xs text-slate-500">{p.notes}</div> : null}</td>
                      <td className="px-3 py-3"><Pill tone={p.direction === "in" ? "green" : "red"}>{p.direction === "in" ? "In" : "Out"}</Pill><div className="mt-1 text-xs text-slate-500">{labelOf(PAYMENT_CATEGORIES, p.category)}</div></td>
                      <td className="px-3 py-3 font-mono text-xs">{p.reference || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{money(p.amount, p.currency)}{p.currency !== "USD" ? <div className="text-slate-400">@ {Number(p.unitsPerUsd).toLocaleString("en-US")}</div> : null}</td>
                      <td className={`px-3 py-3 font-mono font-bold ${p.direction === "in" ? "text-emerald-700" : "text-rose-600"}`}>{p.direction === "in" ? "+" : "−"}{usd(recordUsd(p))}</td>
                      <td className="px-3 py-3 text-xs text-slate-600">{labelOf(PAYMENT_METHODS, p.method)}</td>
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
                  {!ledger.length ? <tr><td colSpan="8" className="px-3 py-12 text-center text-sm text-slate-500">{payments.length ? "No entries match this filter." : "No payments recorded yet."}</td></tr> : null}
                </tbody>
                {ledger.length ? (
                  <tfoot className="bg-slate-50 text-sm">
                    <tr>
                      <td colSpan="5" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">{ledger.length} entries · in {usd(ledgerIn, 0)} · out {usd(ledgerOut, 0)}</td>
                      <td className={`px-3 py-3 font-mono font-black ${ledgerIn - ledgerOut >= 0 ? "text-emerald-700" : "text-rose-600"}`}>{usd(ledgerIn - ledgerOut)}</td>
                      <td colSpan="2" className="px-3 py-3 text-xs text-slate-500">Net</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === "receivables" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">Proforma invoices from page 1. Money in with the PI number as reference counts as received.</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>{["PI no. & date", "Buyer", "Payment terms", "PI value", "Received", "Balance"].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivables.map((pi) => (
                  <tr key={pi.id} className="align-top">
                    <td className="px-3 py-3"><div className="font-mono font-bold">{pi.number}</div><div className="text-xs text-slate-400">{formatDate(pi.date)} · {pi.status === "DRAFT" ? "Draft" : pi.status.charAt(0) + pi.status.slice(1).toLowerCase()}</div></td>
                    <td className="px-3 py-3"><div className="font-semibold text-slate-800">{pi.buyer}</div><div className="text-xs text-slate-500">{pi.destination}</div></td>
                    <td className="px-3 py-3 text-xs text-slate-600">{pi.terms.length ? pi.terms.map((t) => <div key={t}>{t}</div>) : "—"}</td>
                    <td className="px-3 py-3 font-mono">{usd(pi.valueUsd)}</td>
                    <td className="px-3 py-3 font-mono text-emerald-700">{usd(pi.received)}</td>
                    <td className="px-3 py-3"><Balance value={pi.balance} /></td>
                  </tr>
                ))}
                {!receivables.length ? <tr><td colSpan="6" className="px-3 py-10 text-center text-sm text-slate-500">No proforma invoices on page 1 yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "payables" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">Purchase orders from page 4. Money out with the PO number as reference counts as paid.</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>{["PO no. & date", "Supplier", "Order value", "Paid", "Balance"].map((h) => <th key={h} className="px-3 py-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payables.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="px-3 py-3"><div className="font-mono font-bold">{p.number}</div><div className="text-xs text-slate-400">{formatDate(p.date)}</div></td>
                    <td className="px-3 py-3"><div className="font-semibold text-slate-800">{p.supplier}</div><div className="text-xs text-slate-500">{p.product}</div></td>
                    <td className="px-3 py-3"><div className="font-mono text-xs">{toman(p.totals.toman)}</div><div className="font-mono text-xs text-slate-500">{usd(p.totals.usd)}</div></td>
                    <td className="px-3 py-3 font-mono text-xs text-emerald-700">{toman(p.totals.paidToman)}</td>
                    <td className="px-3 py-3"><Balance value={p.totals.balanceUsd} />{p.totals.balanceUsd > 0.5 ? <div className="font-mono text-[11px] text-slate-500">{toman(p.totals.balanceToman)}</div> : null}</td>
                  </tr>
                ))}
                {!payables.length ? <tr><td colSpan="5" className="px-3 py-10 text-center text-sm text-slate-500">No purchase orders on page 4 yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {editing ? <PaymentForm payment={editing.id ? editing : null} direction={editing.direction || "in"} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
