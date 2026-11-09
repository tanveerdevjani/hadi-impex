import { useState } from "react";
import { Field, Modal, inputClass, primaryButton, secondaryButton } from "./ui.jsx";
import { INCOTERMS, QUOTE_STATUSES, addDaysIso, number, quoteTotals, todayIso, usd } from "../lib/business.js";
import { useStore } from "../store.jsx";

function blank() {
  const date = todayIso();
  return {
    date,
    validUntil: addDaysIso(date, 14),
    buyer: "",
    buyerContact: "",
    buyerEmail: "",
    destination: "",
    incoterm: INCOTERMS[0],
    product: "",
    grade: "",
    packing: "",
    quantityKg: "",
    cartons: "",
    priceUsdPerKg: "",
    costUsdPerKg: "",
    paymentTerms: "30% advance, 70% against draft BL",
    notes: "",
    status: "draft",
  };
}

export default function QuotationForm({ quote, onClose, onSaved }) {
  const { saveRecord, invoices, rates } = useStore();
  const [form, setForm] = useState(() => (quote ? { ...blank(), ...quote } : blank()));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const totals = quoteTotals(form);
  const buyers = [...new Set(invoices.map((pi) => pi.buyer).filter(Boolean))];

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const saved = await saveRecord("quotations", form);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={quote ? `Edit ${quote.number}` : "New quotation"} subtitle="Price offer to a buyer. Totals and margin update as you type." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <Field label="Quote date"><input type="date" required className={inputClass} value={form.date} onChange={(event) => set("date", event.target.value)} /></Field>
          <Field label="Valid until"><input type="date" className={inputClass} value={form.validUntil} onChange={(event) => set("validUntil", event.target.value)} /></Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value)}>
              {QUOTE_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">Buyer</h3>
          <Field label="Buyer / company">
            <input required list="quote-buyers" className={inputClass} value={form.buyer} onChange={(event) => set("buyer", event.target.value)} />
            <datalist id="quote-buyers">{buyers.map((name) => <option key={name} value={name} />)}</datalist>
          </Field>
          <Field label="Contact person"><input className={inputClass} value={form.buyerContact} onChange={(event) => set("buyerContact", event.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inputClass} value={form.buyerEmail} onChange={(event) => set("buyerEmail", event.target.value)} /></Field>
          <Field label="Destination port"><input className={inputClass} value={form.destination} onChange={(event) => set("destination", event.target.value)} placeholder="Nhava Sheva Port, Mumbai, India" /></Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-3">Goods & price</h3>
          <Field label="Product"><input required className={inputClass} value={form.product} onChange={(event) => set("product", event.target.value)} placeholder="Fresh Mazafati Dates" /></Field>
          <Field label="Grade"><input className={inputClass} value={form.grade} onChange={(event) => set("grade", event.target.value)} /></Field>
          <Field label="Packing"><input className={inputClass} value={form.packing} onChange={(event) => set("packing", event.target.value)} placeholder="5 kg cartons" /></Field>
          <Field label="Quantity (KG)"><input type="number" min="0" step="any" className={inputClass} value={form.quantityKg} onChange={(event) => set("quantityKg", event.target.value)} /></Field>
          <Field label="Cartons"><input type="number" min="0" step="1" className={inputClass} value={form.cartons} onChange={(event) => set("cartons", event.target.value)} /></Field>
          <Field label="Incoterm">
            <select className={inputClass} value={form.incoterm} onChange={(event) => set("incoterm", event.target.value)}>
              {[...new Set([...INCOTERMS, form.incoterm])].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Price offered (USD / KG)"><input type="number" min="0" step="any" className={inputClass} value={form.priceUsdPerKg} onChange={(event) => set("priceUsdPerKg", event.target.value)} /></Field>
          <Field label="Our landed cost (USD / KG)"><input type="number" min="0" step="any" className={inputClass} value={form.costUsdPerKg} onChange={(event) => set("costUsdPerKg", event.target.value)} placeholder="From Costing Calculations" /></Field>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-slate-600">
            <div className="flex justify-between"><span>Quote total</span><b className="text-slate-900">{usd(totals.total)}</b></div>
            <div className="mt-1 flex justify-between"><span>In AED</span><span>AED {number(totals.total * rates.usdToAed, 0)}</span></div>
            <div className="mt-1 flex justify-between"><span>Margin</span><b className={totals.margin < 0 ? "text-rose-600" : "text-emerald-700"}>{totals.marginPct == null ? "Enter cost" : `${usd(totals.margin, 0)} · ${totals.marginPct.toFixed(1)}%`}</b></div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Payment terms"><textarea rows="2" className={inputClass} value={form.paymentTerms} onChange={(event) => set("paymentTerms", event.target.value)} /></Field>
          <Field label="Notes for the buyer"><textarea rows="2" className={inputClass} value={form.notes} onChange={(event) => set("notes", event.target.value)} /></Field>
        </section>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-sm text-rose-700">{error}</div> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondaryButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={primaryButton} disabled={saving}>{saving ? "Saving..." : quote ? "Save changes" : "Create quotation"}</button>
        </div>
      </form>
    </Modal>
  );
}
