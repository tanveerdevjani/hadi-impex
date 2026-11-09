import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const suiteDir = path.join(root, "suite");
export const shellFile = path.join(root, "server", "public", "suite-shell.js");
export const PAGE_BUNDLE = "/_next/static/chunks/app/page-7b9b5e87fd2bb8fa.js";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

export function contentType(file) {
  return TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function hide(snippet) {
  return [snippet, `!1&&${snippet}`];
}

const MODULE_SUBTITLES = [
  ["Quotation", "Quotation", "Buyer Quotes & Price Offers"],
  ["Purchase Management", "Purchases", "Supplier Orders & Balances"],
  ["Payment Accounts", "Accounts", "Receipts, Payments & Ledger"],
];

const PENDING_BADGE = "bg-slate-100 text-slate-500 border border-slate-200";
const LIVE_BADGE = "bg-blue-50 text-blue-700 border border-blue-200";

const BUNDLE_EDITS = [
  ['n&&(0,a.jsxs)("button",{onClick:n,title:"Reset data to defaults"', '!1&&(0,a.jsxs)("button",{onClick:n,title:"Reset data to defaults"'],
  ['r&&(0,a.jsxs)("button",{onClick:r,title:"Install Web App on Phone / Desktop"', '!1&&(0,a.jsxs)("button",{onClick:r,title:"Install Web App on Phone / Desktop"'],
  ['!g&&(0,a.jsxs)("div",{className:"no-print bg-blue-50/60 border border-blue-200 rounded-xl p-3', '!1&&(0,a.jsxs)("div",{className:"no-print bg-blue-50/60 border border-blue-200 rounded-xl p-3'],
  hide('(0,a.jsxs)("button",{onClick:d,className:"px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm",title:"Reset to factory sample invoices"'),
  hide('(0,a.jsxs)("button",{onClick:j,className:"px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95",title:"Reset parameters to Hadi Impex defaults"'),
  hide('(0,a.jsxs)("button",{onClick:()=>c(!0),className:"px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95",title:"Install App on Phone / Desktop"'),
  hide('(0,a.jsx)("button",{onClick:l,className:"text-xs text-blue-600 hover:underline font-semibold",children:"Reset Defaults"})'),
  hide('(0,a.jsxs)("button",{onClick:()=>{let e={usdToAed:o||eb.usdToAed'),
  ...MODULE_SUBTITLES.map(([label, short, subtitle]) => [
    `label:"${label}",shortLabel:"${short}",sublabel:"Work in Progress"`,
    `label:"${label}",shortLabel:"${short}",sublabel:"${subtitle}"`,
  ]),
  ...["3", "4", "5"].map((badge) => [`badge:"${badge}",badgeColor:"${PENDING_BADGE}"`, `badge:"${badge}",badgeColor:"${LIVE_BADGE}"`]),
  ['Click "Create New PI" or reset sample records.', 'Click "Create New PI" to add one.'],
  ["Hadi Impex \\xa9 2024", "Hadi Impex \\xa9 2026"],
];

export function suitePageBundle() {
  let text = fs.readFileSync(path.join(suiteDir, PAGE_BUNDLE), "utf8");
  for (const [from, to] of BUNDLE_EDITS) {
    if (!text.includes(from)) {
      console.warn(`Page bundle edit not applied: ${from.slice(0, 60)}`);
      continue;
    }
    text = text.split(from).join(to);
  }
  return text;
}

const serverSync = `<script>(function(){var P="hadi_impex_";var store=window.localStorage;var proto=Storage.prototype;var setItem=proto.setItem;var removeItem=proto.removeItem;var xhr=new XMLHttpRequest();try{xhr.open("GET","/api/local",false);xhr.send(null)}catch(e){return}if(xhr.status===401){location.replace("/login?next="+encodeURIComponent(location.pathname+location.search+location.hash));return}if(xhr.status!==200)return;var data={};try{data=JSON.parse(xhr.responseText)}catch(e){return}var values=data.values||{};var canWrite=!!data.canWrite;var queue=Promise.resolve();function send(method,key,value){if(!canWrite)return;queue=queue.then(function(){return fetch("/api/local/"+encodeURIComponent(key),{method:method,credentials:"same-origin",headers:{"Content-Type":"application/json"},body:method==="PUT"?JSON.stringify({value:value}):undefined}).catch(function(){})})}var stale=[];for(var i=0;i<store.length;i++){var key=store.key(i);if(key&&key.indexOf(P)===0&&!Object.prototype.hasOwnProperty.call(values,key))stale.push(key)}stale.forEach(function(key){if(canWrite)send("PUT",key,store.getItem(key));else removeItem.call(store,key)});Object.keys(values).forEach(function(key){setItem.call(store,key,values[key])});proto.setItem=function(key,value){setItem.call(this,key,value);if(this===store&&String(key).indexOf(P)===0)send("PUT",String(key),String(value))};proto.removeItem=function(key){removeItem.call(this,key);if(this===store&&String(key).indexOf(P)===0)send("DELETE",String(key))}})();</script>`;

export function suiteIndexHtml() {
  let html = fs.readFileSync(path.join(suiteDir, "index.html"), "utf8")
    .replace(/<!--\s*This site is hosted on Netlify[\s\S]*?-->/, "")
    .replace(/<button title="Reset data to defaults"[\s\S]*?<\/button>/, "")
    .replace(/<button title="Install Web App on Phone \/ Desktop"[\s\S]*?<\/button>/, "")
    .replace(/<button class="[^"]*" title="Reset to factory sample invoices">[\s\S]*?<\/button>/, "")
    .replace("Hadi Impex © 2024", "Hadi Impex © 2026")
    .replace(/<head>/i, `<head>${serverSync}`)
    .replace(/<title>[^<]*<\/title>/i, "<title>Hadi Impex — Business Suite</title>")
    .replace(/<script async src="\/\.netlify\/scripts\/hud[^>]*><\/script>/, '<script src="/suite-shell.js" defer></script>');
  for (const [, , subtitle] of MODULE_SUBTITLES) html = html.replace(">Work in Progress<", `>${subtitle.replace("&", "&amp;")}<`);
  for (const badge of ["3", "4", "5"]) html = html.replace(`${PENDING_BADGE}">${badge}<`, `${LIVE_BADGE}">${badge}<`);
  return html;
}

export function suiteMiddleware() {
  return (req, res, next) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/suite-shell.js") {
      res.setHeader("Content-Type", TYPES[".js"]);
      res.setHeader("Cache-Control", "no-cache");
      return fs.createReadStream(shellFile).pipe(res);
    }
    if (urlPath === PAGE_BUNDLE) {
      res.setHeader("Content-Type", TYPES[".js"]);
      res.setHeader("Cache-Control", "no-cache");
      return res.end(suitePageBundle());
    }
    if (urlPath === "/app" || urlPath.startsWith("/app/")) return next();
    if (urlPath === "/" || urlPath === "/index.html") {
      res.setHeader("Content-Type", TYPES[".html"]);
      return res.end(suiteIndexHtml());
    }
    const file = path.join(suiteDir, path.normalize(urlPath).replace(/^([\\/])+/, ""));
    if (!file.startsWith(suiteDir)) return next();
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
    res.setHeader("Content-Type", contentType(file));
    fs.createReadStream(file).pipe(res);
  };
}
