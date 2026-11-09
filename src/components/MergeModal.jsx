import { useMemo, useState } from "react";
import { downloadBlob, fileKind, formatSize, safePdfName } from "../lib/format.js";
import { mergeDocuments } from "../lib/pdf.js";
import { useStore } from "../store.jsx";
import { Modal } from "./ui.jsx";

export default function MergeModal({ container, documents, onClose, onRemove }) {
  const { loadBlob } = useStore();
  const [order, setOrder] = useState(documents.map((doc) => doc.id));
  const [fileName, setFileName] = useState(`${container.number}_Customer_Documents.pdf`);
  const [previewUrl, setPreviewUrl] = useState("");
  const [merged, setMerged] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState("");

  const ordered = useMemo(
    () => order.map((id) => documents.find((doc) => doc.id === id)).filter(Boolean),
    [order, documents]
  );
  const outputName = safePdfName(fileName, `${container.number}_Customer_Documents.pdf`);

  function rememberPreview(blob) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setMerged(blob);
  }

  async function withFiles() {
    const ready = [];
    for (const doc of ordered) ready.push({ ...doc, blob: doc.blob || await loadBlob(doc) });
    return ready;
  }

  async function buildPdf() {
    setBusy(true);
    setError("");
    try {
      const blob = await mergeDocuments(await withFiles());
      rememberPreview(blob);
      return blob;
    } catch (err) {
      setError(err?.message || "These files could not be merged. PDF and JPG/PNG files are supported.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function move(fromId, toId) {
    if (!fromId || fromId === toId) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== fromId);
      next.splice(next.indexOf(toId), 0, fromId);
      return next;
    });
    setDone(false);
  }

  async function downloadEach() {
    const ready = await withFiles();
    for (const doc of ready) {
      downloadBlob(doc.blob, doc.fileName || `${doc.name}.pdf`);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  async function share() {
    if (!merged) return;
    const file = new File([merged], outputName, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: outputName });
      return;
    }
    downloadBlob(merged, outputName);
  }

  return (
    <Modal title={done ? "Merged PDF Download" : "Select & Merge Documents"} subtitle="Original documents stay in this container folder." onClose={onClose} wide>
      {done ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-bold text-emerald-800">PDF merged successfully</div>
            <p className="mt-1 text-sm text-emerald-700">{ordered.length} documents were combined into one file. The originals are unchanged.</p>
            <p className="mt-3 text-xs font-semibold text-slate-500">File name</p>
            <p className="font-mono text-sm text-slate-900">{outputName}</p>
          </div>
          {previewUrl ? <iframe title="Merged PDF preview" src={previewUrl} className="h-80 w-full rounded-xl border border-slate-200" /> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setDone(false)}>Back</button>
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={share}>Share</button>
            <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white" onClick={() => downloadBlob(merged, outputName)}>Download PDF</button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">{ordered.length} document{ordered.length === 1 ? "" : "s"} selected <span className="font-normal text-slate-400">(drag to reorder)</span></p>
          <div className="space-y-2">
            {ordered.map((doc, index) => (
              <div key={doc.id} draggable onDragStart={() => setDragId(doc.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => move(dragId, doc.id)} className="flex cursor-move items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="w-5 text-xs font-bold text-slate-400">{index + 1}</span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">{fileKind(doc.mimeType)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{doc.name} <span className="font-normal text-slate-400">({formatSize(doc.size || doc.blob?.size)})</span></span>
                <button type="button" className="px-1 text-slate-400 hover:text-rose-600" aria-label={`Remove ${doc.name}`} onClick={() => { setOrder((current) => current.filter((id) => id !== doc.id)); onRemove(doc.id); }}>×</button>
              </div>
            ))}
          </div>
          <label className="block text-xs font-semibold text-slate-600">
            Output file name
            <input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={fileName} onChange={(event) => setFileName(event.target.value)} />
          </label>
          {previewUrl && !done ? <iframe title="Merge preview" src={previewUrl} className="h-64 w-full rounded-xl border border-slate-200" /> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={downloadEach}>Download selected</button>
            <button type="button" disabled={busy || !ordered.length} className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50" onClick={buildPdf}>{busy ? "Preparing..." : "Preview merge"}</button>
            <button type="button" disabled={busy || !ordered.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" onClick={async () => { const blob = await buildPdf(); if (blob) setDone(true); }}>Merge into Single PDF</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
