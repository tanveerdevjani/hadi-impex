// Signs in, opens every page in headless Edge, and checks the records API.
// Run with the app already running: npm run dev, then npm test.
import { spawn } from "child_process";
import fs from "fs";
import { setTimeout as delay } from "timers/promises";
import { suiteIndexHtml, suitePageBundle } from "../server/suite.mjs";

const base = process.env.BASE_URL || "http://127.0.0.1:5173";
const shots = process.env.SHOTS_DIR || "";
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures.push(label);
};

const js = suitePageBundle();
new Function(js);
const html = suiteIndexHtml();
check(!js.includes('sublabel:"Work in Progress"') && !html.includes("Work in Progress"), "pages 3–5 no longer say Work in Progress");
check(html.includes("/api/local") && html.includes("/suite-shell.js"), "page data sync and shell are wired in");

let password = process.env.ADMIN_PASSWORD || "";
if (!password && fs.existsSync("data/INITIAL-ADMIN.txt")) {
  const line = fs.readFileSync("data/INITIAL-ADMIN.txt", "utf8").split("\n").find((item) => item.startsWith("password:"));
  password = line ? line.slice(9).trim() : "";
}
const login = await fetch(`${base}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password }) });
if (!login.ok) throw new Error(`Sign-in failed (${login.status}). Set ADMIN_PASSWORD.`);
const token = decodeURIComponent(login.headers.getSetCookie()[0].split(";")[0].split("=")[1]);
const authed = (path, options = {}) => fetch(`${base}${path}`, { ...options, headers: { cookie: `hadi_session=${token}`, "Content-Type": "application/json", ...options.headers } });

check((await fetch(`${base}/api/records`)).status === 401, "records API refuses signed-out requests");
const created = await authed("/api/records/quotations", { method: "POST", body: JSON.stringify({ date: "2026-11-01", buyer: "Smoke Test Buyer", product: "Dates", quantityKg: 1000, priceUsdPerKg: 1.5, status: "nonsense" }) }).then((r) => r.json());
check(/^QT-2026-\d{3}$/.test(created.number) && created.status === "draft", "quotation is numbered and bad status falls back to draft");
const updated = await authed(`/api/records/quotations/${created.id}`, { method: "PUT", body: JSON.stringify({ ...created, status: "sent" }) }).then((r) => r.json());
check(updated.status === "sent" && updated.number === created.number, "quotation update keeps its number");
check((await authed("/api/records/payments", { method: "POST", body: JSON.stringify({ date: "2026-11-01", party: "X", direction: "in", amount: 0 }) })).status === 400, "payment with zero amount is refused");
check((await authed(`/api/records/quotations/${created.id}`, { method: "DELETE" })).ok, "quotation delete works");
check((await authed("/api/records/unknown", { method: "POST", body: "{}" })).status === 404, "unknown record type is refused");

const edgePaths = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"];
const edge = edgePaths.find((file) => fs.existsSync(file));
if (!edge) throw new Error("Microsoft Edge was not found for the browser check.");
const port = 9231;
const browser = spawn(edge, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}\\hadi-check-${Date.now()}`, "about:blank"], { stdio: "ignore" });
let ws;
try {
  let page;
  for (let i = 0; i < 40 && !page; i += 1) {
    await delay(500);
    try {
      page = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())).find((item) => item.type === "page");
    } catch {}
  }
  if (!page) throw new Error("Edge did not start");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve); ws.addEventListener("error", reject); });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
    if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") errors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  const run = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, label, tries = 40) => {
    for (let i = 0; i < tries; i += 1) {
      if (await run(expression).catch(() => false)) return true;
      await delay(300);
    }
    return false;
  };
  const shot = async (name) => {
    if (!shots) return;
    fs.mkdirSync(shots, { recursive: true });
    const image = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(`${shots}/${name}`, Buffer.from(image.data, "base64"));
  };
  const frameText = `(document.querySelector("#hc-panel iframe")?.contentDocument?.body?.innerText || "")`;
  const menu = (index) => `document.querySelectorAll("aside > div.flex-1 > button")[${index}]`;
  // Page 1 renders its invoice list from saved data, so React reports a text mismatch (#425),
  // then re-renders the page itself (#418, #423). That recovery is expected and invisible.
  const realErrors = () => errors.filter((text) => !/Minified React error #(418|423|425)/.test(text));

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await send("Page.navigate", { url: `${base}/login` });
  await waitFor(`!!document.querySelector(".logo img")?.complete`, "login page");
  const logo = await run(`(() => { const img = document.querySelector(".logo img"); const r = img.getBoundingClientRect(); return { ratio: r.width / r.height, natural: img.naturalWidth / img.naturalHeight }; })()`);
  check(Math.abs(logo.ratio - logo.natural) < 0.05, "login logo keeps its proportions");
  await shot("login.png");

  await send("Network.enable");
  await send("Network.setCookie", { name: "hadi_session", value: token, domain: "127.0.0.1", path: "/", httpOnly: true });
  await send("Page.navigate", { url: `${base}/` });
  check(await waitFor(`!!document.getElementById("hc-tab") && !!document.getElementById("hc-users-tab") && !!document.getElementById("hadi-account")`, "menu"), "menu shows Containers, User management, and the account area");
  const header = await run(`(() => { const h = document.querySelector("header"); return { install: !!h.querySelector('[title^="Install"]'), reset: [...h.querySelectorAll("button")].some(b => b.innerText.trim() === "Reset") }; })()`);
  check(!header.install && !header.reset, "header has no Install or Reset button");
  check(!(await run(`document.body.innerText.includes("Reset Samples")`)), "page 1 has no Reset Samples");
  await shot("page-1.png");

  const expected = [
    ["Invoice PDF Generator", null, "Invoice PDF Generator"],
    ["Costing Calculations", null, "Costing Calculations"],
    ["Quotation", "New quotation", "Quotations"],
    ["Purchase Management", "New purchase order", "Purchase Management"],
    ["Payment Accounts", "Money in", "Payment Accounts"],
  ];
  for (let index = 0; index < expected.length; index += 1) {
    const [label, frameMarker, title] = expected[index];
    const before = realErrors().length;
    await run(`${menu(index)}.click(), true`);
    const ok = frameMarker
      ? await waitFor(`document.body.classList.contains("hc-on") && ${frameText}.includes(${JSON.stringify(frameMarker)}) && ${frameText}.includes(${JSON.stringify(title)})`, label, 100)
      : await waitFor(`!document.body.classList.contains("hc-on") && (document.querySelector("main")?.innerText || "").includes(${JSON.stringify(title)})`, label);
    await delay(400);
    const highlighted = await run(`${menu(index)}.className.includes("border-l-4")`);
    const newErrors = realErrors().slice(before);
    check(ok && highlighted && !newErrors.length, `page ${index + 1} ${label} opens${newErrors.length ? ` (errors: ${newErrors.join(" | ").slice(0, 200)})` : ""}`);
    await shot(`page-${index + 1}.png`);
  }

  await run(`${menu(4)}.click(), true`);
  await waitFor(`${frameText}.includes("Money in")`, "page 5");
  await run(`document.querySelector("#hc-panel iframe").contentDocument.querySelectorAll("button")[0] && [...document.querySelector("#hc-panel iframe").contentDocument.querySelectorAll("button")].find(b => b.innerText.includes("Buyer receivables")).click(), true`);
  check(await waitFor(`${frameText}.includes("PI-MAZ-060826")`, "receivables"), "page 5 lists page 1 invoices as buyer receivables");
  await shot("page-5-receivables.png");

  await run(`${menu(2)}.click(), true`);
  await waitFor(`${frameText}.includes("QT-2026-001")`, "quotes");
  await run(`[...document.querySelector("#hc-panel iframe").contentDocument.querySelectorAll("a")].find(a => a.innerText === "View").click(), true`);
  check(await waitFor(`${frameText}.includes("Print / Save PDF") && ${frameText}.includes("Authorised signatory")`, "quote view"), "page 3 opens a printable quotation");
  await shot("page-3-quote.png");

  await run(`document.getElementById("hadi-open-users").click(), true`);
  check(await waitFor(`${frameText}.includes("Create user")`, "users"), "User management opens from the header");
  await run(`document.getElementById("hc-tab").click(), true`);
  check(await waitFor(`${frameText}.includes("Add container")`, "containers"), "page 6 Containers opens");
  await shot("page-6.png");
  await run(`[...document.querySelector("#hc-panel iframe").contentDocument.querySelectorAll("a")].find(a => a.innerText === "View").click(), true`);
  check(await waitFor(`${frameText}.includes("Phytosanitary")`, "container detail"), "container detail opens");

  await run(`location.hash = "quotations", true`);
  check(await waitFor(`${frameText}.includes("New quotation") && ${menu(2)}.className.includes("border-l-4")`, "hash change"), "changing the link to #quotations switches to page 3");

  await send("Page.navigate", { url: "about:blank" });
  await delay(500);
  await send("Page.navigate", { url: `${base}/#payments` });
  check(await waitFor(`${frameText}.includes("Money in") && ${menu(4)}.className.includes("border-l-4")`, "deep link", 80), "opening a #payments link loads page 5 directly");
  await shot("deep-link.png");

  const leftover = realErrors();
  check(!leftover.length, `no browser errors${leftover.length ? `: ${leftover.join(" | ").slice(0, 400)}` : ""}`);
} finally {
  if (ws) ws.close();
  browser.kill();
}

console.log(failures.length ? `\n${failures.length} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures.length ? 1 : 0;
