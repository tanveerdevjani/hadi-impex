import fs from "fs";
import path from "path";
import { randomBytes, randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { CATEGORIES, SEED_CONTAINERS, SEED_DOCUMENTS, STATUSES } from "../src/data.js";
import { hashPassword, starterPassword, verifyPassword } from "./passwords.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, "data");
const dbFile = path.join(dataDir, "db.json");
const uploadsDir = path.join(dataDir, "uploads");
const passwordNote = path.join(dataDir, "INITIAL-ADMIN.txt");
const MAX_USERS = 10;
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;

let queue = Promise.resolve();

const LOCAL_KEY = /^hadi_impex_[A-Za-z0-9_]{1,60}$/;
const MAX_LOCAL_BYTES = 5 * 1024 * 1024;

const RECORD_KINDS = {
  quotations: {
    prefix: "QT",
    required: ["date", "buyer", "product"],
    text: ["date", "validUntil", "buyer", "buyerContact", "buyerEmail", "destination", "incoterm", "product", "grade", "packing", "paymentTerms", "notes", "status"],
    numbers: ["quantityKg", "cartons", "priceUsdPerKg", "costUsdPerKg"],
    choices: { status: ["draft", "sent", "accepted", "rejected", "expired"] },
  },
  purchases: {
    prefix: "PO",
    required: ["date", "supplier", "product"],
    text: ["date", "supplier", "supplierContact", "product", "grade", "packing", "containerId", "expectedDate", "notes", "status"],
    numbers: ["quantityKg", "cartons", "rateTomanPerKg", "usdToToman"],
    choices: { status: ["ordered", "packing", "loaded", "received", "cancelled"] },
  },
  payments: {
    prefix: "TX",
    required: ["date", "party", "direction"],
    text: ["date", "direction", "category", "party", "reference", "currency", "method", "notes"],
    numbers: ["amount", "unitsPerUsd"],
    choices: {
      direction: ["in", "out"],
      currency: ["USD", "AED", "INR", "TOMAN"],
      category: ["buyer_receipt", "supplier_payment", "freight", "customs_port", "cold_storage", "transport", "other"],
      method: ["bank_transfer", "cash", "cheque", "exchange_house", "other"],
    },
  },
};

const SEED_RECORDS = {
  quotations: [
    { number: "QT-2026-001", date: "2026-10-12", validUntil: "2026-10-26", buyer: "ARMAAN TRADERS", buyerContact: "Mr. Armaan Bhojani", buyerEmail: "purchase@armaantraders.com", destination: "Nhava Sheva Port, Mumbai, India", incoterm: "CIF Nhava Sheva", product: "Fresh Mazafati Dates", grade: "Grade A / Premium", packing: "12 x small boxes per mother carton", quantityKg: 25840, cartons: 3800, priceUsdPerKg: 1.55, costUsdPerKg: 1.17, paymentTerms: "30% advance, 30% against draft BL, 40% against surrender BL", notes: "", status: "accepted" },
    { number: "QT-2026-002", date: "2026-10-20", validUntil: "2026-11-05", buyer: "GLOBAL FOOD IMPORTS PVT LTD", buyerContact: "Mr. Rajesh Mehta", buyerEmail: "imports@globalfood.in", destination: "Nhava Sheva Port, Mumbai, India", incoterm: "CIF Nhava Sheva", product: "Fresh Mazafati Dates", grade: "Grade B", packing: "5 kg cartons", quantityKg: 24000, cartons: 4800, priceUsdPerKg: 1.42, costUsdPerKg: 1.12, paymentTerms: "30% advance, 70% against draft BL", notes: "Price valid for one 40 ft reefer.", status: "sent" },
    { number: "QT-2026-003", date: "2026-10-28", validUntil: "2026-11-11", buyer: "AL BARAKAH DATES PACKAGING LLC", buyerContact: "", buyerEmail: "", destination: "Jebel Ali Port, Dubai, UAE", incoterm: "FOB Bandar Abbas", product: "Kalute Dates", grade: "Grade A", packing: "10 kg cartons", quantityKg: 22000, cartons: 2200, priceUsdPerKg: 1.38, costUsdPerKg: 1.05, paymentTerms: "30% advance, 70% against telex release", notes: "", status: "draft" },
  ],
  purchases: [
    { number: "PO-2026-001", date: "2026-10-01", supplier: "ABC Trading Co.", supplierContact: "Bandar Abbas", product: "Mazafati Dates", grade: "Grade A", packing: "12 x small boxes per mother carton", containerId: "c-tcnu", expectedDate: "2026-10-08", quantityKg: 25840, cartons: 3800, rateTomanPerKg: 155000, usdToToman: 212000, notes: "", status: "loaded" },
    { number: "PO-2026-002", date: "2026-09-25", supplier: "Urmia Fresh", supplierContact: "Urmia", product: "Red Apples", grade: "Export", packing: "18 kg cartons", containerId: "c-msku", expectedDate: "2026-10-03", quantityKg: 24000, cartons: 1330, rateTomanPerKg: 62000, usdToToman: 212000, notes: "", status: "received" },
    { number: "PO-2026-003", date: "2026-10-26", supplier: "Iran Fruits Ltd.", supplierContact: "Tehran", product: "Cherries", grade: "Premium", packing: "5 kg cartons", containerId: "", expectedDate: "2026-11-10", quantityKg: 18000, cartons: 3600, rateTomanPerKg: 240000, usdToToman: 212000, notes: "Awaiting packing slot.", status: "ordered" },
  ],
  payments: [
    { number: "TX-2026-001", date: "2026-08-16", direction: "in", category: "buyer_receipt", party: "ARMAAN TRADERS", reference: "PI-MAZ-060826", currency: "USD", amount: 11938.08, unitsPerUsd: 1, method: "bank_transfer", notes: "30% advance" },
    { number: "TX-2026-002", date: "2026-10-02", direction: "out", category: "supplier_payment", party: "ABC Trading Co.", reference: "PO-2026-001", currency: "TOMAN", amount: 2000000000, unitsPerUsd: 212000, method: "exchange_house", notes: "First instalment" },
    { number: "TX-2026-003", date: "2026-10-09", direction: "out", category: "freight", party: "SERRANO Shipping", reference: "TCNU1234567", currency: "USD", amount: 9600, unitsPerUsd: 1, method: "bank_transfer", notes: "Sea freight Bandar Abbas to Nhava Sheva" },
    { number: "TX-2026-004", date: "2026-10-04", direction: "out", category: "supplier_payment", party: "Urmia Fresh", reference: "PO-2026-002", currency: "TOMAN", amount: 1488000000, unitsPerUsd: 212000, method: "exchange_house", notes: "Paid in full" },
  ],
};

function emptyDb() {
  return { users: [], sessions: [], containers: [], documents: [], local: {}, records: {}, seeded: false, seededRecords: false };
}

function load() {
  if (!fs.existsSync(dbFile)) return emptyDb();
  const parsed = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  return { ...emptyDb(), ...parsed };
}

function save(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${dbFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.copyFileSync(tmp, dbFile);
  fs.rmSync(tmp, { force: true });
}

function mutate(fn) {
  const run = queue.then(async () => {
    const db = load();
    const result = await fn(db);
    save(db);
    return result;
  });
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}

function read(fn) {
  return queue.then(() => fn(load()));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function assertId(id) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(id || ""))) fail(404, "That record was not found.");
}

function uploadPath(id) {
  assertId(id);
  const root = path.resolve(uploadsDir);
  const file = path.resolve(root, id);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) fail(404, "That record was not found.");
  return file;
}

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function cleanFileName(name) {
  const base = path.basename(String(name || "document")).replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 180);
  return base || "document";
}

function removeFile(id) {
  fs.rmSync(uploadPath(id), { force: true });
}

export function canWrite(user) {
  return user?.role === "admin" || user?.role === "write";
}

export async function init() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  let created = null;
  await mutate(async (db) => {
    db.sessions = db.sessions.filter((session) => session.expiresAt > Date.now());
    if (!db.users.length) {
      const password = process.env.ADMIN_PASSWORD || starterPassword();
      db.users.push({
        id: randomUUID(),
        username: process.env.ADMIN_USERNAME || "admin",
        displayName: "Admin",
        passwordHash: hashPassword(password),
        role: "admin",
        createdAt: new Date().toISOString(),
      });
      fs.writeFileSync(passwordNote, `username: ${process.env.ADMIN_USERNAME || "admin"}\npassword: ${password}\nChange this from the Users page after you sign in.\n`);
      created = { username: process.env.ADMIN_USERNAME || "admin", password };
    }
    if (!db.seeded) {
      const { makePlaceholderPdf } = await import("../src/lib/pdf.js");
      db.containers = SEED_CONTAINERS.map((container) => ({ ...container, sample: true }));
      const documents = [];
      for (const record of SEED_DOCUMENTS) {
        const container = SEED_CONTAINERS.find((item) => item.id === record.containerId);
        const blob = await makePlaceholderPdf(record.name, `${container.number} · ${container.supplier}`);
        const bytes = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(uploadPath(record.id), bytes);
        documents.push({ ...record, size: bytes.length, sample: true });
      }
      db.documents = documents;
      db.seeded = true;
    }
    if (!db.seededRecords) {
      const stamp = new Date().toISOString();
      db.records = {};
      for (const [kind, rows] of Object.entries(SEED_RECORDS)) {
        db.records[kind] = rows.map((row) => ({ ...row, id: randomUUID(), sample: true, createdAt: stamp, createdBy: "Sample", updatedAt: stamp, updatedBy: "Sample" }));
      }
      db.seededRecords = true;
    }
  });
  return created;
}

export function userForToken(token) {
  if (!token) return null;
  return read((db) => {
    const session = db.sessions.find((item) => item.token === token && item.expiresAt > Date.now());
    if (!session) return null;
    const user = db.users.find((item) => item.id === session.userId);
    return user ? publicUser(user) : null;
  });
}

export function login(username, password) {
  return mutate((db) => {
    db.sessions = db.sessions.filter((session) => session.expiresAt > Date.now());
    const user = db.users.find((item) => item.username.toLowerCase() === String(username || "").trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) fail(401, "Username or password is incorrect.");
    const token = randomBytes(32).toString("hex");
    db.sessions.push({ token, userId: user.id, expiresAt: Date.now() + SESSION_MS });
    return { token, user: publicUser(user) };
  });
}

export function logout(token) {
  return mutate((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== token);
  });
}

export function loadState() {
  return read((db) => {
    const containers = [...db.containers].sort((a, b) => String(b.shipmentDate).localeCompare(String(a.shipmentDate)));
    const documents = [...db.documents].sort((a, b) => String(a.uploadedAt).localeCompare(String(b.uploadedAt)) || a.name.localeCompare(b.name));
    return { containers, documents };
  });
}

export function createContainer(input) {
  const number = String(input.number || "").trim().toUpperCase();
  const product = String(input.product || "").trim();
  const supplier = String(input.supplier || "").trim();
  const originPort = String(input.originPort || "").trim();
  const destinationPort = String(input.destinationPort || "").trim();
  const shipmentDate = String(input.shipmentDate || "").trim();
  if (!number || !product || !supplier || !originPort || !destinationPort || !shipmentDate) {
    fail(400, "Container number, product, supplier, ports, and shipment date are required.");
  }
  const status = STATUSES.some((item) => item.id === input.status) ? input.status : "in_transit";
  return mutate((db) => {
    if (db.containers.some((item) => item.number.toLowerCase() === number.toLowerCase())) {
      fail(400, "That container number already exists.");
    }
    const container = {
      id: randomUUID(),
      number,
      product,
      supplier,
      originPort,
      via: String(input.via || "").trim(),
      destinationPort,
      shipmentDate,
      vesselVoyage: String(input.vesselVoyage || "").trim(),
      blNumber: String(input.blNumber || "").trim(),
      eta: String(input.eta || "").trim(),
      status,
      sample: false,
    };
    db.containers.push(container);
    return container;
  });
}

export function deleteContainer(id) {
  assertId(id);
  return mutate((db) => {
    const container = db.containers.find((item) => item.id === id);
    if (!container) fail(404, "That container was not found.");
    const docs = db.documents.filter((item) => item.containerId === id);
    db.containers = db.containers.filter((item) => item.id !== id);
    db.documents = db.documents.filter((item) => item.containerId !== id);
    docs.forEach((doc) => removeFile(doc.id));
    return { ok: true };
  });
}

export function deleteSamples() {
  return mutate((db) => {
    const sampleIds = new Set(db.containers.filter((item) => item.sample).map((item) => item.id));
    const docs = db.documents.filter((item) => sampleIds.has(item.containerId) || item.sample);
    db.containers = db.containers.filter((item) => !item.sample);
    db.documents = db.documents.filter((item) => !sampleIds.has(item.containerId) && !item.sample);
    docs.forEach((doc) => removeFile(doc.id));
    return { removed: sampleIds.size };
  });
}

function fileKind(bytes, claimed) {
  const pdf = bytes.subarray(0, 5).toString("utf8").startsWith("%PDF");
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (claimed === "application/pdf" && pdf) return claimed;
  if (claimed === "image/png" && png) return claimed;
  if (claimed === "image/jpeg" && jpg) return claimed;
  return "";
}

export function createDocument(user, meta, bytes) {
  const containerId = String(meta.containerId || "");
  const categoryId = String(meta.categoryId || "");
  const name = String(meta.name || "").trim().slice(0, 120);
  const mimeType = fileKind(bytes, String(meta.mimeType || ""));
  assertId(containerId);
  if (!CATEGORIES.some((item) => item.id === categoryId)) fail(400, "Choose a document category.");
  if (!name) fail(400, "Enter a document name.");
  if (!bytes.length) fail(400, "The file is empty.");
  if (!mimeType) fail(400, "Upload a PDF, JPG, or PNG file.");
  const id = randomUUID();
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(uploadPath(id), bytes);
  return mutate((db) => {
    if (!db.containers.some((item) => item.id === containerId)) {
      removeFile(id);
      fail(404, "That container was not found.");
    }
    const exists = db.documents.some((item) => item.containerId === containerId && item.categoryId === categoryId);
    const document = {
      id,
      containerId,
      categoryId,
      name,
      fileName: cleanFileName(meta.fileName),
      mimeType,
      size: bytes.length,
      uploadedAt: today(),
      uploadedBy: user.displayName,
      status: exists ? "revised" : "uploaded",
      sample: false,
    };
    db.documents.push(document);
    return document;
  }).catch((error) => {
    removeFile(id);
    throw error;
  });
}

export function updateDocument(id, input) {
  assertId(id);
  const name = String(input.name || "").trim().slice(0, 120);
  if (!name) fail(400, "Enter a document name.");
  return mutate((db) => {
    const document = db.documents.find((item) => item.id === id);
    if (!document) fail(404, "That document was not found.");
    document.name = name;
    document.status = "revised";
    return document;
  });
}

export function deleteDocument(id) {
  assertId(id);
  return mutate((db) => {
    const document = db.documents.find((item) => item.id === id);
    if (!document) fail(404, "That document was not found.");
    db.documents = db.documents.filter((item) => item.id !== id);
    removeFile(id);
    return { ok: true };
  });
}

export function documentFile(id) {
  return read((db) => {
    const document = db.documents.find((item) => item.id === id);
    if (!document) fail(404, "That document was not found.");
    const file = uploadPath(id);
    if (!fs.existsSync(file)) fail(404, "The file is missing from storage.");
    return { document, file };
  });
}

export function loadLocal() {
  return read((db) => ({ ...(db.local || {}) }));
}

export function saveLocal(key, value) {
  if (!LOCAL_KEY.test(String(key || ""))) fail(400, "That setting cannot be saved.");
  if (typeof value !== "string") fail(400, "That setting cannot be saved.");
  if (Buffer.byteLength(value) > MAX_LOCAL_BYTES) fail(413, "That record is too large to save.");
  return mutate((db) => {
    db.local = db.local || {};
    db.local[key] = value;
    return { ok: true };
  });
}

export function deleteLocal(key) {
  if (!LOCAL_KEY.test(String(key || ""))) fail(400, "That setting cannot be removed.");
  return mutate((db) => {
    db.local = db.local || {};
    delete db.local[key];
    return { ok: true };
  });
}

function recordSpec(kind) {
  const spec = RECORD_KINDS[kind];
  if (!spec) fail(404, "That section was not found.");
  return spec;
}

function cleanRecord(spec, input) {
  const out = {};
  for (const key of spec.text) {
    const value = String(input[key] ?? "").trim().slice(0, key === "notes" || key === "paymentTerms" ? 1000 : 200);
    const choices = spec.choices[key];
    out[key] = choices && !choices.includes(value) ? choices[0] : value;
  }
  for (const key of spec.numbers) {
    const value = Number(input[key]);
    out[key] = Number.isFinite(value) && value >= 0 ? Math.round(value * 10000) / 10000 : 0;
  }
  for (const key of spec.required) {
    if (!out[key]) fail(400, "Fill in the date, name, and product or party before saving.");
  }
  if (spec.numbers.includes("amount") && !(out.amount > 0)) fail(400, "Enter an amount greater than zero.");
  if (spec.numbers.includes("unitsPerUsd")) {
    if (out.currency === "USD") out.unitsPerUsd = 1;
    if (!(out.unitsPerUsd > 0)) fail(400, "Enter the exchange rate for this currency.");
  }
  return out;
}

function nextNumber(rows, prefix, date) {
  const year = String(date || today()).slice(0, 4);
  const start = `${prefix}-${year}-`;
  const used = rows.map((row) => String(row.number || "")).filter((number) => number.startsWith(start)).map((number) => Number(number.slice(start.length)) || 0);
  return `${start}${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

export function loadRecords() {
  return read((db) => {
    const out = {};
    for (const kind of Object.keys(RECORD_KINDS)) {
      out[kind] = [...(db.records?.[kind] || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.number).localeCompare(String(a.number)));
    }
    return out;
  });
}

export function createRecord(kind, input, user) {
  const spec = recordSpec(kind);
  const fields = cleanRecord(spec, input);
  return mutate((db) => {
    db.records = db.records || {};
    const rows = (db.records[kind] = db.records[kind] || []);
    if (rows.length >= 20000) fail(400, "This section is full.");
    const stamp = new Date().toISOString();
    const record = { id: randomUUID(), number: nextNumber(rows, spec.prefix, fields.date), ...fields, sample: false, createdAt: stamp, createdBy: user.displayName, updatedAt: stamp, updatedBy: user.displayName };
    rows.push(record);
    return record;
  });
}

export function updateRecord(kind, id, input, user) {
  const spec = recordSpec(kind);
  assertId(id);
  const fields = cleanRecord(spec, input);
  return mutate((db) => {
    const record = (db.records?.[kind] || []).find((row) => row.id === id);
    if (!record) fail(404, "That record was not found.");
    Object.assign(record, fields, { updatedAt: new Date().toISOString(), updatedBy: user.displayName });
    return record;
  });
}

export function deleteRecord(kind, id) {
  recordSpec(kind);
  assertId(id);
  return mutate((db) => {
    const rows = db.records?.[kind] || [];
    if (!rows.some((row) => row.id === id)) fail(404, "That record was not found.");
    db.records[kind] = rows.filter((row) => row.id !== id);
    return { ok: true };
  });
}

export function listUsers() {
  return read((db) => db.users.map(publicUser).sort((a, b) => a.username.localeCompare(b.username)));
}

export function createUser(input) {
  const username = String(input.username || "").trim();
  const displayName = String(input.displayName || "").trim().slice(0, 60);
  const password = String(input.password || "");
  const role = input.role === "write" ? "write" : input.role === "read" ? "read" : "";
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) fail(400, "Username must be 3–32 letters, numbers, dots, dashes, or underscores.");
  if (!displayName) fail(400, "Enter the person's name.");
  if (password.length < 8) fail(400, "Password must be at least 8 characters.");
  if (!role) fail(400, "Choose Read or Write access.");
  return mutate((db) => {
    if (db.users.length >= MAX_USERS) fail(400, "This site allows 10 user accounts.");
    if (db.users.some((item) => item.username.toLowerCase() === username.toLowerCase())) fail(400, "That username is already used.");
    const user = {
      id: randomUUID(),
      username,
      displayName,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return publicUser(user);
  });
}

export function updateUser(id, input) {
  assertId(id);
  return mutate((db) => {
    const user = db.users.find((item) => item.id === id);
    if (!user) fail(404, "That user was not found.");
    if (input.displayName != null) {
      const displayName = String(input.displayName).trim().slice(0, 60);
      if (!displayName) fail(400, "Enter the person's name.");
      user.displayName = displayName;
    }
    if (input.role != null && user.role !== "admin") {
      if (input.role !== "read" && input.role !== "write") fail(400, "Choose Read or Write access.");
      user.role = input.role;
    }
    if (input.password) {
      if (String(input.password).length < 8) fail(400, "Password must be at least 8 characters.");
      user.passwordHash = hashPassword(String(input.password));
      db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    }
    return publicUser(user);
  });
}

export function deleteUser(id, actorId) {
  assertId(id);
  return mutate((db) => {
    const user = db.users.find((item) => item.id === id);
    if (!user) fail(404, "That user was not found.");
    if (user.role === "admin" || user.id === actorId) fail(400, "The admin account cannot be deleted.");
    db.users = db.users.filter((item) => item.id !== id);
    db.sessions = db.sessions.filter((session) => session.userId !== id);
    return { ok: true };
  });
}

export function changeOwnPassword(id, currentPassword, password) {
  if (String(password || "").length < 8) fail(400, "Password must be at least 8 characters.");
  return mutate((db) => {
    const user = db.users.find((item) => item.id === id);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) fail(400, "Current password is incorrect.");
    user.passwordHash = hashPassword(String(password));
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    fs.rmSync(passwordNote, { force: true });
    return { ok: true };
  });
}

export async function setAdminPassword(password) {
  if (String(password || "").length < 8) fail(400, "Password must be at least 8 characters.");
  await mutate((db) => {
    const admin = db.users.find((item) => item.role === "admin");
    if (!admin) fail(404, "No admin account exists. Start the app once first.");
    admin.passwordHash = hashPassword(String(password));
    db.sessions = db.sessions.filter((session) => session.userId !== admin.id);
  });
  fs.rmSync(passwordNote, { force: true });
}
