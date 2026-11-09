export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKind(mimeType) {
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/jpeg") return "JPG";
  return "PDF";
}

export function safePdfName(name, fallback) {
  const cleaned = String(name || "")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim();
  const base = cleaned || fallback || "Merged_Documents.pdf";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function acceptFile(file) {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if (file.type === "image/png" || name.endsWith(".png")) return "image/png";
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "";
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
