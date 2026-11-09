function topWindow() {
  try {
    return window.top.location.origin === location.origin ? window.top : window;
  } catch {
    return window;
  }
}

function toLogin() {
  const target = topWindow();
  const next = encodeURIComponent(`${target.location.pathname}${target.location.search}${target.location.hash}`);
  target.location.assign(`/login?next=${next}`);
}

export async function api(path, options = {}) {
  const body = options.body;
  const isJson = body && typeof body === "object" && !(body instanceof Blob);
  const response = await fetch(path, {
    method: options.method || "GET",
    credentials: "same-origin",
    headers: {
      ...(isJson ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: isJson ? JSON.stringify(body) : body,
  });
  if (response.status === 401) {
    toLogin();
    throw new Error("Sign in required.");
  }
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}

export async function apiBlob(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (response.status === 401) {
    toLogin();
    throw new Error("Sign in required.");
  }
  if (!response.ok) throw new Error("Could not open the file.");
  return response.blob();
}

export async function logout() {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  topWindow().location.assign("/login");
}
