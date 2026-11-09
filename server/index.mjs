import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { contentType, suiteDir, suiteIndexHtml, suiteMiddleware } from "./suite.mjs";
import {
  canWrite,
  changeOwnPassword,
  createContainer,
  createDocument,
  createRecord,
  createUser,
  deleteContainer,
  deleteDocument,
  deleteLocal,
  deleteRecord,
  deleteSamples,
  deleteUser,
  documentFile,
  init,
  listUsers,
  loadLocal,
  loadRecords,
  loadState,
  login,
  logout,
  saveLocal,
  updateDocument,
  updateRecord,
  updateUser,
  userForToken,
} from "./store.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || (dev ? 5173 : 8080));
const host = process.env.HOST || (dev ? "127.0.0.1" : "0.0.0.0");
const loginHtml = fs.readFileSync(path.join(root, "server", "public", "login.html"));
const attempts = new Map();

function cookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function sessionCookie(token, req) {
  const secure = req.headers["x-forwarded-proto"] === "https";
  const maxAge = token ? 14 * 24 * 60 * 60 : 0;
  return `hadi_session=${encodeURIComponent(token || "")}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function sendJson(res, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
    ...extra,
  });
  res.end(payload);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

function readBuffer(req, limit, message) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error(message);
        error.status = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBuffer(req, 200_000, "Request is too large.");
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    const error = new Error("Request was not valid.");
    error.status = 400;
    throw error;
  }
}

function clientIp(req) {
  return req.socket.remoteAddress || "local";
}

function tooManyAttempts(ip) {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || now > row.reset) return false;
  return row.count >= 8;
}

function recordFailure(ip) {
  const now = Date.now();
  const row = attempts.get(ip);
  if (!row || now > row.reset) {
    attempts.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
    return;
  }
  row.count += 1;
}

function safeNext(value) {
  const next = String(value || "/");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function currentUser(req) {
  return userForToken(cookies(req).hadi_session);
}

function requireUser(user) {
  if (!user) {
    const error = new Error("Sign in required.");
    error.status = 401;
    throw error;
  }
}

function requireWriter(user) {
  requireUser(user);
  if (!canWrite(user)) {
    const error = new Error("You have read-only access.");
    error.status = 403;
    throw error;
  }
}

function requireAdmin(user) {
  requireUser(user);
  if (user.role !== "admin") {
    const error = new Error("Only an admin can manage users.");
    error.status = 403;
    throw error;
  }
}

async function handleApi(req, res, url, pathname) {
  const user = await currentUser(req);

  if (req.method === "GET" && pathname === "/login") {
    if (user) {
      redirect(res, safeNext(url.searchParams.get("next")));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(loginHtml);
    return;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    const ip = clientIp(req);
    if (tooManyAttempts(ip)) {
      sendJson(res, 429, { error: "Too many sign-in attempts. Wait a few minutes and try again." });
      return;
    }
    const body = await readJson(req);
    try {
      const result = await login(body.username, body.password);
      sendJson(res, 200, { user: result.user }, { "Set-Cookie": sessionCookie(result.token, req) });
    } catch (error) {
      if (error.status === 401) recordFailure(ip);
      throw error;
    }
    return;
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    await logout(cookies(req).hadi_session);
    sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", req) });
    return;
  }

  if (!user && (pathname.startsWith("/api/") || pathname === "/login")) {
    sendJson(res, 401, { error: "Sign in required." });
    return;
  }

  if (pathname === "/api/me" && req.method === "GET") {
    sendJson(res, 200, { user });
    return;
  }

  if (pathname === "/api/local" && req.method === "GET") {
    sendJson(res, 200, { values: await loadLocal(), canWrite: canWrite(user) });
    return;
  }

  const localMatch = pathname.match(/^\/api\/local\/([^/]+)$/);
  if (localMatch && req.method === "PUT") {
    requireWriter(user);
    const body = await readJson(req);
    sendJson(res, 200, await saveLocal(decodeURIComponent(localMatch[1]), body.value));
    return;
  }
  if (localMatch && req.method === "DELETE") {
    requireWriter(user);
    sendJson(res, 200, await deleteLocal(decodeURIComponent(localMatch[1])));
    return;
  }

  if (pathname.startsWith("/api/invoices")) {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    const state = await loadState();
    sendJson(res, 200, { ...state, user });
    return;
  }

  if (pathname === "/api/records" && req.method === "GET") {
    sendJson(res, 200, await loadRecords());
    return;
  }

  const recordKind = pathname.match(/^\/api\/records\/([a-z]+)$/);
  if (recordKind && req.method === "POST") {
    requireWriter(user);
    sendJson(res, 201, await createRecord(recordKind[1], await readJson(req), user));
    return;
  }

  const recordMatch = pathname.match(/^\/api\/records\/([a-z]+)\/([^/]+)$/);
  if (recordMatch && req.method === "PUT") {
    requireWriter(user);
    sendJson(res, 200, await updateRecord(recordMatch[1], decodeURIComponent(recordMatch[2]), await readJson(req), user));
    return;
  }
  if (recordMatch && req.method === "DELETE") {
    requireWriter(user);
    sendJson(res, 200, await deleteRecord(recordMatch[1], decodeURIComponent(recordMatch[2])));
    return;
  }

  if (pathname === "/api/containers" && req.method === "POST") {
    requireWriter(user);
    sendJson(res, 201, await createContainer(await readJson(req)));
    return;
  }

  const containerMatch = pathname.match(/^\/api\/containers\/([^/]+)$/);
  if (containerMatch && req.method === "DELETE") {
    requireWriter(user);
    sendJson(res, 200, await deleteContainer(decodeURIComponent(containerMatch[1])));
    return;
  }

  if (pathname === "/api/documents" && req.method === "POST") {
    requireWriter(user);
    const bytes = await readBuffer(req, 10 * 1024 * 1024, "Each file must be 10 MB or smaller.");
    const document = await createDocument(user, {
      containerId: url.searchParams.get("containerId"),
      categoryId: url.searchParams.get("categoryId"),
      name: url.searchParams.get("name"),
      fileName: url.searchParams.get("fileName"),
      mimeType: String(req.headers["content-type"] || "").split(";")[0],
    }, bytes);
    sendJson(res, 201, document);
    return;
  }

  const fileMatch = pathname.match(/^\/api\/documents\/([^/]+)\/file$/);
  if (fileMatch && req.method === "GET") {
    const found = await documentFile(decodeURIComponent(fileMatch[1]));
    const stat = fs.statSync(found.file);
    res.writeHead(200, {
      "Content-Type": found.document.mimeType,
      "Content-Length": stat.size,
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${found.document.fileName.replace(/"/g, "")}"`,
    });
    fs.createReadStream(found.file).pipe(res);
    return;
  }

  const documentMatch = pathname.match(/^\/api\/documents\/([^/]+)$/);
  if (documentMatch && req.method === "PATCH") {
    requireWriter(user);
    sendJson(res, 200, await updateDocument(decodeURIComponent(documentMatch[1]), await readJson(req)));
    return;
  }
  if (documentMatch && req.method === "DELETE") {
    requireWriter(user);
    sendJson(res, 200, await deleteDocument(decodeURIComponent(documentMatch[1])));
    return;
  }

  if (pathname === "/api/samples" && req.method === "DELETE") {
    requireWriter(user);
    sendJson(res, 200, await deleteSamples());
    return;
  }

  if (pathname === "/api/users" && req.method === "GET") {
    requireAdmin(user);
    sendJson(res, 200, { users: await listUsers() });
    return;
  }
  if (pathname === "/api/users" && req.method === "POST") {
    requireAdmin(user);
    sendJson(res, 201, await createUser(await readJson(req)));
    return;
  }

  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === "PATCH") {
    requireAdmin(user);
    sendJson(res, 200, await updateUser(decodeURIComponent(userMatch[1]), await readJson(req)));
    return;
  }
  if (userMatch && req.method === "DELETE") {
    requireAdmin(user);
    sendJson(res, 200, await deleteUser(decodeURIComponent(userMatch[1]), user.id));
    return;
  }

  if (pathname === "/api/me/password" && req.method === "POST") {
    requireUser(user);
    const body = await readJson(req);
    await changeOwnPassword(user.id, body.currentPassword, body.password);
    sendJson(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", req) });
    return;
  }

  sendJson(res, 404, { error: "Not found." });
}

function safeFile(base, urlPath) {
  const folder = path.resolve(base);
  const file = path.resolve(folder, `.${urlPath}`);
  const relative = path.relative(folder, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return file;
}

function serveProduction(req, res, pathname) {
  const dist = path.join(root, "dist");
  let file = safeFile(dist, pathname);
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    file = isAppPath(pathname) ? path.join(dist, "app", "index.html") : path.join(dist, "index.html");
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Site files are missing. Run npm run build first.");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(file) });
  fs.createReadStream(file).pipe(res);
}

function isAppPath(pathname) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

function wantsAppPage(pathname) {
  if (pathname === "/app" || pathname === "/app/") return true;
  if (!pathname.startsWith("/app/")) return false;
  if (pathname.includes("/@")) return false;
  if (pathname.startsWith("/app/src/") || pathname.startsWith("/app/node_modules/")) return false;
  return !path.extname(pathname);
}

console.log("Opening storage...");
const created = await init();
const server = http.createServer();
let vite = null;
const suite = suiteMiddleware();

if (dev) {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });
}

server.on("request", (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);
  const appRequest = pathname === "/login" || pathname.startsWith("/api/");

  const finish = (error) => {
    if (res.headersSent) return;
    const status = error?.status || 500;
    if (status === 500) console.error(error);
    sendJson(res, status, { error: status === 500 ? "Something went wrong." : error.message });
  };

  if (appRequest) {
    handleApi(req, res, url, pathname).catch(finish);
    return;
  }

  if (pathname === "/logo-transparent.png") {
    const logo = path.join(dev ? suiteDir : path.join(root, "dist"), "logo-transparent.png");
    if (fs.existsSync(logo)) {
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" });
      fs.createReadStream(logo).pipe(res);
      return;
    }
  }

  currentUser(req)
    .then((user) => {
      if (!user) {
        redirect(res, `/login?next=${encodeURIComponent(pathname + url.search)}`);
        return;
      }
      if (dev) {
        if (wantsAppPage(pathname)) {
          fs.readFile(path.join(root, "index.html"), "utf8", (error, template) => {
            if (error) {
              finish(error);
              return;
            }
            vite.transformIndexHtml(pathname, template).then((html) => {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(html);
            }).catch(finish);
          });
          return;
        }
        vite.middlewares(req, res, () => {
          if (res.writableEnded || res.headersSent) return;
          if (isAppPath(pathname)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
          }
          suite(req, res, () => {
            if (res.headersSent || res.writableEnded) return;
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(suiteIndexHtml());
          });
        });
        return;
      }
      serveProduction(req, res, pathname);
    })
    .catch(finish);
});

server.listen(port, host, () => {
  const shownHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`Hadi Impex running at http://${shownHost}:${port}/`);
  if (created) {
    console.log("Created the first admin account. Change this password from the Users page.");
    console.log(`Username: ${created.username}`);
    console.log(`Password: ${created.password}`);
    console.log(`A copy is saved in data${path.sep}INITIAL-ADMIN.txt`);
  }
});
