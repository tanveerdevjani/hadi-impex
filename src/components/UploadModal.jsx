import { useState } from "react";
import { CATEGORIES } from "../data.js";
import { MAX_FILE_BYTES, acceptFile } from "../lib/format.js";
import { Field, Modal, inputClass } from "./ui.jsx";

export default function UploadModal({ container, uploadedBy, onClose, onUpload }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function addFiles(fileList) {
    const next = [];
    const problems = [];
    for (const file of fileList) {
      const mimeType = acceptFile(file);
      if (!mimeType) {
        problems.push(`${file.name} is not a PDF, JPG, or PNG.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name} is larger than 10 MB.`);
        continue;
      }
      const baseName = file.name.replace(/\.[^.]+$/, "");
      next.push({ key: crypto.randomUUID(), file, mimeType, categoryId: "", name: baseName });
    }
    if (next.length) setRows((current) => [...current, ...next]);
    setError(problems[0] || "");
  }

  async function submit(event) {
    event.preventDefault();
    if (!rows.length) {
      setError("Choose at least one file.");
      return;
    }
    if (rows.some((row) => !row.categoryId)) {
      setError("Select a document category for each file.");
      return;
    }
    setSaving(true);
    try {
      for (const row of rows) {
        await onUpload({
          id: crypto.randomUUID(),
          containerId: container.id,
          categoryId: row.categoryId,
          name: row.name.trim() || row.file.name,
          fileName: row.file.name,
          mimeType: row.mimeType,
          blob: row.file,
          size: row.file.size,
          uploadedAt: new Date().toISOString().slice(0, 10),
          uploadedBy,
          status: "uploaded",
        });
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Upload failed.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Upload Document" subtitle={container.number} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
        >
          <span className="text-sm font-semibold text-slate-700">Choose files</span>
          <span className="mt-1 text-xs text-slate-500">PDF, JPG, or PNG. Maximum 10 MB each.</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {rows.map((row) => (
          <div key={row.key} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
            <div className="sm:col-span-2 truncate text-xs font-semibold text-slate-500">{row.file.name}</div>
            <Field label="Document category">
              <select className={inputClass} value={row.categoryId} onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, categoryId: event.target.value } : item))}>
                <option value="">Select document type</option>
                {CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </Field>
            <Field label="Document name">
              <input className={inputClass} value={row.name} onChange={(event) => setRows((current) => current.map((item) => item.key === row.key ? { ...item, name: event.target.value } : item))} />
            </Field>
            <button type="button" className="text-left text-xs font-semibold text-rose-600" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}>Remove</button>
          </div>
        ))}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "Uploading..." : "Upload"}</button>
        </div>
      </form>
    </Modal>
  );
}
