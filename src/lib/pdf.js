import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function makePlaceholderPdf(title, subtitle) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: rgb(0.043, 0.145, 0.271) });
  page.drawText("HADI IMPEX", { x: 48, y: 798, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Shipping document", { x: 48, y: 778, size: 10, font, color: rgb(0.8, 0.88, 0.96) });
  page.drawText(title, { x: 48, y: 680, size: 20, font: bold, color: rgb(0.06, 0.09, 0.16) });
  page.drawText(subtitle, { x: 48, y: 650, size: 12, font, color: rgb(0.28, 0.35, 0.45) });
  page.drawText("Sample file for review. Upload the original to replace it.", {
    x: 48,
    y: 610,
    size: 11,
    font,
    color: rgb(0.35, 0.4, 0.48),
  });
  const bytes = await pdf.save();
  return new Blob([bytes], { type: "application/pdf" });
}

export async function mergeDocuments(docs) {
  const out = await PDFDocument.create();
  for (const doc of docs) {
    const bytes = await doc.blob.arrayBuffer();
    if (doc.mimeType === "application/pdf") {
      const src = await PDFDocument.load(bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((page) => out.addPage(page));
      continue;
    }
    if (doc.mimeType !== "image/png" && doc.mimeType !== "image/jpeg") {
      throw new Error(`${doc.name} is not a PDF or image.`);
    }
    const image =
      doc.mimeType === "image/png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    const page = out.addPage([595.28, 841.89]);
    const margin = 36;
    const maxWidth = page.getWidth() - margin * 2;
    const maxHeight = page.getHeight() - margin * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (page.getWidth() - width) / 2,
      y: (page.getHeight() - height) / 2,
      width,
      height,
    });
  }
  if (out.getPageCount() === 0) throw new Error("Select at least one document.");
  const bytes = await out.save();
  return new Blob([bytes], { type: "application/pdf" });
}
