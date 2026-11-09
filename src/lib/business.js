export const DEFAULT_RATES = { usdToAed: 3.685, usdToInr: 83.5, usdToToman: 212000 };

const INVOICES_KEY = "hadi_impex_proforma_invoices";
const RATES_KEY = "hadi_impex_custom_converter_rates";

function parse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function readRates(local) {
  const saved = parse(local?.[RATES_KEY], {});
  return {
    usdToAed: Number(saved.usdToAed) || DEFAULT_RATES.usdToAed,
    usdToInr: Number(saved.usdToInr) || DEFAULT_RATES.usdToInr,
    usdToToman: Number(saved.usdToToman) || DEFAULT_RATES.usdToToman,
  };
}

export function unitsPerUsd(currency, rates) {
  if (currency === "AED") return rates.usdToAed;
  if (currency === "INR") return rates.usdToInr;
  if (currency === "TOMAN") return rates.usdToToman;
  return 1;
}

export function readInvoices(local) {
  const rows = parse(local?.[INVOICES_KEY], []);
  if (!Array.isArray(rows)) return [];
  return rows.map((pi) => {
    const items = Array.isArray(pi.lineItems) ? pi.lineItems : [];
    const tomanRate = Number(pi.usdToTomanRate) || DEFAULT_RATES.usdToToman;
    const valueUsd = items.reduce((sum, item) => {
      const kg = Number(item.weightKg) || 0;
      if (String(pi.currency).toUpperCase() === "TOMAN") return sum + (kg * (Number(item.unitPriceToman) || 0)) / tomanRate;
      return sum + kg * (Number(item.unitPriceUSD) || 0);
    }, 0);
    return {
      id: pi.id || pi.piNumber,
      number: pi.piNumber || "",
      date: pi.date || "",
      status: String(pi.status || "").toUpperCase(),
      buyer: pi.consigneeName || "",
      destination: pi.portOfDischarge || "",
      product: pi.productHeading || items[0]?.productName || "",
      valueUsd,
      terms: (Array.isArray(pi.paymentTerms) ? pi.paymentTerms : []).map((step) => `${step.percentage}% ${step.conditionLabel}`),
      sellerName: pi.sellerName || "",
      sellerAddress: pi.sellerAddress || "",
    };
  });
}

export function recordUsd(payment) {
  const rate = Number(payment.unitsPerUsd) || 1;
  return (Number(payment.amount) || 0) / rate;
}

export function paymentsFor(payments, reference, direction) {
  const key = String(reference || "").trim().toLowerCase();
  if (!key) return [];
  return payments.filter((row) => row.direction === direction && String(row.reference || "").trim().toLowerCase() === key);
}

export function purchaseTotals(purchase, payments) {
  const toman = (Number(purchase.quantityKg) || 0) * (Number(purchase.rateTomanPerKg) || 0);
  const rate = Number(purchase.usdToToman) || DEFAULT_RATES.usdToToman;
  const paid = paymentsFor(payments, purchase.number, "out");
  const paidToman = paid.reduce((sum, row) => sum + (row.currency === "TOMAN" ? Number(row.amount) || 0 : recordUsd(row) * rate), 0);
  return { toman, usd: toman / rate, paidToman, paidUsd: paidToman / rate, balanceToman: Math.max(0, toman - paidToman), balanceUsd: Math.max(0, toman - paidToman) / rate };
}

export function quoteTotals(quote) {
  const kg = Number(quote.quantityKg) || 0;
  const price = Number(quote.priceUsdPerKg) || 0;
  const cost = Number(quote.costUsdPerKg) || 0;
  const total = kg * price;
  const margin = cost ? kg * (price - cost) : 0;
  return { total, margin, marginPct: cost && price ? ((price - cost) / price) * 100 : null };
}

export function usd(value, digits = 2) {
  return `$${(Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function number(value, digits = 0) {
  return (Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function toman(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1e9) return `${(amount / 1e9).toFixed(2)} Billion Toman`;
  if (Math.abs(amount) >= 1e6) return `${(amount / 1e6).toFixed(1)} Million Toman`;
  return `${number(amount)} Toman`;
}

export function money(amount, currency) {
  if (currency === "TOMAN") return toman(amount);
  if (currency === "USD") return usd(amount);
  return `${currency} ${number(amount, 2)}`;
}

export function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const QUOTE_STATUSES = [
  { id: "draft", label: "Draft", tone: "slate" },
  { id: "sent", label: "Sent", tone: "blue" },
  { id: "accepted", label: "Accepted", tone: "green" },
  { id: "rejected", label: "Rejected", tone: "red" },
  { id: "expired", label: "Expired", tone: "amber" },
];

export const PURCHASE_STATUSES = [
  { id: "ordered", label: "Ordered", tone: "blue" },
  { id: "packing", label: "Packing", tone: "amber" },
  { id: "loaded", label: "Loaded", tone: "violet" },
  { id: "received", label: "Received", tone: "green" },
  { id: "cancelled", label: "Cancelled", tone: "red" },
];

export const PAYMENT_CATEGORIES = [
  { id: "buyer_receipt", label: "Buyer receipt", direction: "in" },
  { id: "supplier_payment", label: "Supplier payment", direction: "out" },
  { id: "freight", label: "Sea freight", direction: "out" },
  { id: "customs_port", label: "Customs & port", direction: "out" },
  { id: "cold_storage", label: "Cold storage & packing", direction: "out" },
  { id: "transport", label: "Inland transport", direction: "out" },
  { id: "other", label: "Other", direction: "both" },
];

export const PAYMENT_METHODS = [
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "exchange_house", label: "Exchange house" },
  { id: "cash", label: "Cash" },
  { id: "cheque", label: "Cheque" },
  { id: "other", label: "Other" },
];

export const CURRENCIES = ["USD", "AED", "INR", "TOMAN"];

export const INCOTERMS = ["CIF Nhava Sheva", "CFR Nhava Sheva", "FOB Bandar Abbas", "FOB Jebel Ali", "EXW Cold Storage"];

export function labelOf(list, id) {
  return list.find((item) => item.id === id)?.label || id || "—";
}

export function toneOf(list, id) {
  return list.find((item) => item.id === id)?.tone || "slate";
}

export function downloadCsv(filename, header, rows) {
  const cell = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
