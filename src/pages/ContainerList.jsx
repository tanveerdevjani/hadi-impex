import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddContainerModal from "../components/AddContainerModal.jsx";
import { coverage, STATUSES } from "../data.js";
import { formatDate } from "../lib/format.js";
import { useStore } from "../store.jsx";
import { StatusPill, controlClass } from "../components/ui.jsx";

export default function ContainerList() {
  const { containers, documents, addContainer, deleteContainer, canWrite } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [port, setPort] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [menuId, setMenuId] = useState("");

  const suppliers = [...new Set(containers.map((item) => item.supplier))].sort();
  const products = [...new Set(containers.map((item) => item.product))].sort();
  const ports = [...new Set(containers.flatMap((item) => [item.originPort, item.destinationPort].filter(Boolean)))].sort();

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return containers.filter((container) => {
      const haystack = [container.number, container.blNumber, container.supplier, container.originPort, container.destinationPort, container.product, container.via].join(" ").toLowerCase();
      if (needle && !haystack.includes(needle)) return false;
      if (status && container.status !== status) return false;
      if (supplier && container.supplier !== supplier) return false;
      if (product && container.product !== product) return false;
      if (port && container.originPort !== port && container.destinationPort !== port) return false;
      if (shipmentDate && container.shipmentDate !== shipmentDate) return false;
      return true;
    });
  }, [containers, query, status, supplier, product, port, shipmentDate]);

  function resetFilters() {
    setQuery("");
    setStatus("");
    setSupplier("");
    setProduct("");
    setPort("");
    setShipmentDate("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Containers
            <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Page 6</span>
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Shipping documents, checklist, and PDF merge for each container</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite ? <button type="button" onClick={() => setAdding(true)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:text-sm">+ Add container</button> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <input className={`${controlClass} min-w-[220px] flex-1 bg-slate-50`} placeholder="Search by container no., BL no., supplier, port..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={controlClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All Status</option>
          {STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select className={controlClass} value={supplier} onChange={(event) => setSupplier(event.target.value)}>
          <option value="">All Suppliers</option>
          {suppliers.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={controlClass} value={product} onChange={(event) => setProduct(event.target.value)}>
          <option value="">All Products</option>
          {products.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className={controlClass} value={port} onChange={(event) => setPort(event.target.value)}>
          <option value="">All Ports</option>
          {ports.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input type="date" className={controlClass} value={shipmentDate} onChange={(event) => setShipmentDate(event.target.value)} />
        <button type="button" onClick={resetFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600">Clear</button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {["#", "Container No.", "Product", "Supplier", "Origin Port", "Destination Port", "Shipment Date", "Documents", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-bold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((container, index) => {
                const count = coverage(documents, container.id);
                return (
                  <tr key={container.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3 font-mono text-sm font-bold text-slate-900">
                      <Link className="hover:text-blue-700" to={`/containers/${container.id}`}>{container.number}</Link>
                    </td>
                    <td className="px-3 py-3">{container.product}</td>
                    <td className="px-3 py-3">{container.supplier}</td>
                    <td className="px-3 py-3">{container.originPort}</td>
                    <td className="px-3 py-3">{container.destinationPort}</td>
                    <td className="px-3 py-3">{formatDate(container.shipmentDate)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{count.filled} / {count.total}</td>
                    <td className="px-3 py-3"><StatusPill status={container.status} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/containers/${container.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">View</Link>
                        {canWrite ? (
                          <div className="relative">
                            <button type="button" aria-label="More actions" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100" onClick={() => setMenuId(menuId === container.id ? "" : container.id)}>...</button>
                            {menuId === container.id ? (
                              <button
                                type="button"
                                className="absolute right-0 z-10 mt-1 w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-rose-600 shadow-lg"
                                onClick={async () => {
                                  if (window.confirm(`Delete container ${container.number} and its documents?`)) {
                                    try { await deleteContainer(container.id); } catch (err) { window.alert(err.message); }
                                  }
                                  setMenuId("");
                                }}
                              >
                                Delete container
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? (
                <tr><td colSpan="10" className="px-3 py-10 text-center text-sm text-slate-500">No containers match this search.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      {adding ? <AddContainerModal containers={containers} onClose={() => setAdding(false)} onSave={async (container) => { await addContainer(container); setAdding(false); }} /> : null}
    </div>
  );
}
