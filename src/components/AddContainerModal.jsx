import { useState } from "react";
import { STATUSES } from "../data.js";
import { Field, Modal, inputClass } from "./ui.jsx";

const empty = {
  number: "",
  product: "",
  supplier: "",
  originPort: "",
  via: "",
  destinationPort: "",
  shipmentDate: "",
  vesselVoyage: "",
  blNumber: "",
  eta: "",
  status: "in_transit",
};

export default function AddContainerModal({ containers, onClose, onSave }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const number = form.number.trim().toUpperCase();
    if (!number || !form.product.trim() || !form.supplier.trim() || !form.originPort.trim() || !form.destinationPort.trim() || !form.shipmentDate) {
      setError("Container number, product, supplier, ports, and shipment date are required.");
      return;
    }
    if (containers.some((container) => container.number.toLowerCase() === number.toLowerCase())) {
      setError("That container number already exists.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, number, product: form.product.trim(), supplier: form.supplier.trim() });
    } catch (err) {
      setError(err?.message || "Could not save the container.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Add New Container" subtitle="Each container keeps its own document folder." onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Container Number"><input className={inputClass} value={form.number} onChange={(e) => set("number", e.target.value)} placeholder="TCNU1234567" /></Field>
        <Field label="Product Name"><input className={inputClass} value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="Mazafati Dates" /></Field>
        <Field label="Supplier Name"><input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
          </select>
        </Field>
        <Field label="Origin Port"><input className={inputClass} value={form.originPort} onChange={(e) => set("originPort", e.target.value)} placeholder="Bandar Abbas, Iran" /></Field>
        <Field label="Via"><input className={inputClass} value={form.via} onChange={(e) => set("via", e.target.value)} placeholder="Jebel Ali / Sohar" /></Field>
        <Field label="Destination Port"><input className={inputClass} value={form.destinationPort} onChange={(e) => set("destinationPort", e.target.value)} placeholder="Nhava Sheva, India" /></Field>
        <Field label="Shipment Date"><input type="date" className={inputClass} value={form.shipmentDate} onChange={(e) => set("shipmentDate", e.target.value)} /></Field>
        <Field label="Vessel / Voyage"><input className={inputClass} value={form.vesselVoyage} onChange={(e) => set("vesselVoyage", e.target.value)} /></Field>
        <Field label="Bill of Lading Number"><input className={inputClass} value={form.blNumber} onChange={(e) => set("blNumber", e.target.value)} /></Field>
        <Field label="Expected Arrival (ETA)"><input type="date" className={inputClass} value={form.eta} onChange={(e) => set("eta", e.target.value)} /></Field>
        {error ? <p className="sm:col-span-2 text-sm text-rose-600">{error}</p> : null}
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Add Container"}</button>
        </div>
      </form>
    </Modal>
  );
}
