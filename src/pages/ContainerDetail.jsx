import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import MergeModal from "../components/MergeModal.jsx";
import PreviewModal from "../components/PreviewModal.jsx";
import UploadModal from "../components/UploadModal.jsx";
import { CATEGORIES, categoryLabel, categoryState } from "../data.js";
import { downloadBlob, fileKind, formatDate, formatSize } from "../lib/format.js";
import { useStore } from "../store.jsx";
import { Field, Modal, StatusPill, inputClass } from "../components/ui.jsx";

export default function ContainerDetail() {
  const { id } = useParams();
  const { containers, documents, addDocument, updateDocument, deleteDocument, loadBlob, canWrite, user } = useStore();
  const container = containers.find((item) => item.id === id);
  const docs = documents.filter((doc) => doc.containerId === id);
  const [selected, setSelected] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const filled = CATEGORIES.filter((category) => docs.some((doc) => doc.categoryId === category.id)).length;
  const selectedDocs = useMemo(() => docs.filter((doc) => selected.includes(doc.id)), [docs, selected]);

  if (!container) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-bold">Container not found</h1>
        <Link to="/containers" className="mt-3 inline-block text-sm font-semibold text-blue-700">Back to containers</Link>
      </div>
    );
  }

  function toggle(docId) {
    setSelected((current) => current.includes(docId) ? current.filter((item) => item !== docId) : [...current, docId]);
  }

  async function upload(doc) {
    const exists = docs.some((item) => item.categoryId === doc.categoryId);
    await addDocument({ ...doc, status: exists ? "revised" : "uploaded" });
  }

  async function saveRename() {
    const name = renameValue.trim();
    if (!name || !renaming) return;
    await updateDocument({ ...renaming, name, status: "revised" });
    setRenaming(null);
  }

  const facts = [
    ["Product", container.product],
    ["Supplier", container.supplier],
    ["Origin Port", container.originPort],
    ["Via", container.via || "—"],
    ["Destination Port", container.destinationPort],
    ["Shipment Date", formatDate(container.shipmentDate)],
    ["Vessel / Voyage", container.vesselVoyage || "—"],
    ["BL No.", container.blNumber || "—"],
    ["ETA", formatDate(container.eta)],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/containers" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-500 hover:text-slate-800" aria-label="Back">←</Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Container No. <span className="font-mono">{container.number}</span></h1>
              <StatusPill status={container.status} />
            </div>
            <p className="text-sm text-slate-500">Documents in this folder stay linked to this container.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite ? <button type="button" onClick={() => setUploading(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">+ Upload Document</button> : null}
          <button type="button" disabled={!selectedDocs.length} onClick={() => setMerging(true)} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-40">Merge Selected PDF</button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3"><input type="checkbox" checked={docs.length > 0 && selected.length === docs.length} onChange={() => setSelected(selected.length === docs.length ? [] : docs.map((doc) => doc.id))} aria-label="Select all documents" /></th>
                  {["#", "Document Name", "File Name", "File Type", "Size", "Upload Date", "Uploaded By", "Action"].map((heading) => <th key={heading} className="px-3 py-3 font-bold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc, index) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(doc.id)} onChange={() => toggle(doc.id)} aria-label={`Select ${doc.name}`} /></td>
                    <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{doc.name}</td>
                    <td className="px-3 py-3 text-slate-500">{doc.fileName}</td>
                    <td className="px-3 py-3">{fileKind(doc.mimeType)}</td>
                    <td className="px-3 py-3">{formatSize(doc.size || doc.blob?.size)}</td>
                    <td className="px-3 py-3">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-3 py-3">{doc.uploadedBy}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 text-slate-500">
                        <button type="button" title="Preview" aria-label="Preview" className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => setPreview(doc)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button type="button" title="Download" aria-label="Download" className="rounded-md p-1.5 hover:bg-slate-100" onClick={async () => downloadBlob(await loadBlob(doc), doc.fileName || doc.name)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M5 21h14"/></svg>
                        </button>
                        {canWrite ? (
                          <button type="button" title="Rename" aria-label="Rename" className="rounded-md p-1.5 hover:bg-slate-100" onClick={() => { setRenaming(doc); setRenameValue(doc.name); }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </button>
                        ) : null}
                        {canWrite ? (
                          <button type="button" title="Delete" aria-label="Delete" className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50" onClick={() => { if (window.confirm(`Delete ${doc.name}?`)) { deleteDocument(doc.id); setSelected((current) => current.filter((item) => item !== doc.id)); } }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!docs.length ? <tr><td colSpan="9" className="px-3 py-8 text-center text-sm text-slate-500">No documents yet. Upload the first file for this container.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Document Checklist</h2>
            <span className="text-xs font-semibold text-slate-500">{filled} of {CATEGORIES.length} uploaded</span>
          </div>
          <ul className="space-y-2">
            {CATEGORIES.map((category) => {
              const state = categoryState(docs, category.id);
              const tone = state === "pending" ? "text-slate-400" : state === "revised" ? "text-amber-600" : "text-emerald-600";
              const mark = state === "pending" ? "○" : state === "revised" ? "↻" : "✓";
              const caption = state === "pending" ? "Pending" : state === "revised" ? "Revised" : "Uploaded";
              return (
                <li key={category.id} className="flex items-start justify-between gap-2 text-sm">
                  <span className={`flex items-start gap-2 ${tone}`}><span className="mt-0.5">{mark}</span><span className="text-slate-700">{category.label}</span></span>
                  <span className={`shrink-0 text-[11px] font-semibold ${tone}`}>{caption}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">A missing document stays pending until the supplier or agent sends it. That is not an error.</p>
        </aside>
      </div>

      {uploading ? <UploadModal container={container} uploadedBy={user?.displayName || "Staff"} onClose={() => setUploading(false)} onUpload={upload} /> : null}
      {merging ? <MergeModal container={container} documents={selectedDocs} onClose={() => setMerging(false)} onRemove={(docId) => setSelected((current) => current.filter((item) => item !== docId))} /> : null}
      {preview ? <PreviewModal doc={preview} onClose={() => setPreview(null)} /> : null}
      {renaming ? (
        <Modal title="Rename document" onClose={() => setRenaming(null)}>
          <Field label={categoryLabel(renaming.categoryId)}>
            <input className={inputClass} value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={() => setRenaming(null)}>Cancel</button>
            <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={saveRename}>Save</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
