export const CATEGORIES = [
  { id: "phyto", label: "Phytosanitary Certificate" },
  { id: "origin", label: "Certificate of Origin" },
  { id: "draft_bl", label: "Draft Bill of Lading" },
  { id: "release_bl", label: "Release Bill of Lading" },
  { id: "packing", label: "Packing List" },
  { id: "invoice", label: "Commercial Invoice" },
  { id: "inspection", label: "Inspection Certificate" },
  { id: "other", label: "Other Documents" },
];

export const STATUSES = [
  { id: "in_transit", label: "In Transit", pill: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "documents_pending", label: "Documents Pending", pill: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "pending", label: "Pending", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "completed", label: "Completed", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export function categoryLabel(id) {
  return CATEGORIES.find((category) => category.id === id)?.label || "Document";
}

export function statusMeta(id) {
  return STATUSES.find((status) => status.id === id) || STATUSES[2];
}

const baseDocs = ["phyto", "origin", "draft_bl", "release_bl", "packing", "invoice", "inspection", "other"];

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function docsFor(containerId, count, startDate) {
  return baseDocs.slice(0, count).map((categoryId, index) => {
    const uploadedAt = addDays(startDate, index);
    const label = categoryLabel(categoryId);
    return {
      id: `${containerId}-${categoryId}`,
      containerId,
      categoryId,
      name: label,
      fileName: `${label.replace(/\s+/g, "_")}.pdf`,
      mimeType: "application/pdf",
      uploadedAt,
      uploadedBy: "Aurali",
      status: "uploaded",
    };
  });
}

export const SEED_CONTAINERS = [
  {
    id: "c-tcnu",
    number: "TCNU1234567",
    product: "Mazafati Dates",
    supplier: "ABC Trading Co.",
    originPort: "Bandar Abbas, Iran",
    via: "Jebel Ali / Sohar",
    destinationPort: "Nhava Sheva, India",
    shipmentDate: "2026-10-10",
    vesselVoyage: "SERRANO / SER1780",
    blNumber: "",
    eta: "2026-10-25",
    status: "in_transit",
  },
  {
    id: "c-msku",
    number: "MSKU7654321",
    product: "Red Apples",
    supplier: "Urmia Fresh",
    originPort: "Bandar Abbas, Iran",
    via: "",
    destinationPort: "Nhava Sheva, India",
    shipmentDate: "2026-10-05",
    vesselVoyage: "OCEAN STAR / OS442",
    blNumber: "MSKU7654321BL",
    eta: "2026-10-22",
    status: "documents_pending",
  },
  {
    id: "c-tghu",
    number: "TGHU9876543",
    product: "Kiwi",
    supplier: "Green Farm Co.",
    originPort: "Chabahar, Iran",
    via: "",
    destinationPort: "Mumbai, India",
    shipmentDate: "2026-09-28",
    vesselVoyage: "GULF PEARL / GP19",
    blNumber: "TGHU9876543BL",
    eta: "2026-10-12",
    status: "completed",
  },
  {
    id: "c-cmuu",
    number: "CMUU5644332",
    product: "Cherries",
    supplier: "Iran Fruits Ltd.",
    originPort: "Bandar Abbas, Iran",
    via: "",
    destinationPort: "Nhava Sheva, India",
    shipmentDate: "2026-09-15",
    vesselVoyage: "CASPIAN / CS88",
    blNumber: "CMUU5644332BL",
    eta: "2026-10-02",
    status: "pending",
  },
  {
    id: "c-oolu",
    number: "OOLU1122334",
    product: "Bananas",
    supplier: "Dole Iran",
    originPort: "Bandar Abbas, Iran",
    via: "",
    destinationPort: "Nhava Sheva, India",
    shipmentDate: "2026-09-01",
    vesselVoyage: "TROPIC WIND / TW03",
    blNumber: "OOLU1122334BL",
    eta: "2026-09-18",
    status: "completed",
  },
];

export const SEED_DOCUMENTS = [
  ...docsFor("c-tcnu", 6, "2026-10-10"),
  ...docsFor("c-msku", 5, "2026-10-05"),
  ...docsFor("c-tghu", 8, "2026-09-28"),
  ...docsFor("c-cmuu", 7, "2026-09-15"),
  ...docsFor("c-oolu", 8, "2026-09-01"),
];

export function coverage(documents, containerId) {
  const mine = documents.filter((doc) => doc.containerId === containerId);
  const filled = CATEGORIES.filter((category) =>
    mine.some((doc) => doc.categoryId === category.id)
  ).length;
  return { filled, total: CATEGORIES.length, files: mine.length };
}

export function categoryState(documents, categoryId) {
  const items = documents.filter((doc) => doc.categoryId === categoryId);
  if (!items.length) return "pending";
  if (items.some((doc) => doc.status === "revised")) return "revised";
  return "uploaded";
}
