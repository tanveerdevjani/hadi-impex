import { useEffect, useState } from "react";
import { categoryLabel } from "../data.js";
import { fileKind, formatSize } from "../lib/format.js";
import { useStore } from "../store.jsx";
import { Modal } from "./ui.jsx";

export default function PreviewModal({ doc, onClose }) {
  const { loadBlob } = useStore();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (!doc) return undefined;
    let active = true;
    let next = "";
    setFailed("");
    (async () => {
      try {
        const blob = doc.blob || await loadBlob(doc);
        if (!active) return;
        next = URL.createObjectURL(blob);
        setUrl(next);
      } catch (err) {
        if (active) setFailed(err?.message || "Could not open the file.");
      }
    })();
    return () => {
      active = false;
      if (next) URL.revokeObjectURL(next);
    };
  }, [doc, loadBlob]);

  if (!doc) return null;
  const image = doc.mimeType.startsWith("image/");

  return (
    <Modal title={doc.name} subtitle={`${categoryLabel(doc.categoryId)} · ${fileKind(doc.mimeType)} · ${formatSize(doc.size)}`} onClose={onClose} wide>
      {failed ? <p className="text-sm text-rose-600">{failed}</p> : null}
      {!url && !failed ? <p className="text-sm text-slate-500">Opening file...</p> : null}
      {url && image ? <img src={url} alt={doc.name} className="mx-auto max-h-[70vh] rounded-lg" /> : null}
      {url && !image ? <iframe title={doc.name} src={url} className="h-[70vh] w-full rounded-lg border border-slate-200" /> : null}
    </Modal>
  );
}
