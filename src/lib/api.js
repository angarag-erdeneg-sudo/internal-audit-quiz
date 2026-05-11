const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:9999/.netlify/functions"
    : "/.netlify/functions";

async function request(path, options = {}) {
  const url = API_BASE + "/" + path;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "API JSON биш response буцаалаа. URL шалгана уу: " +
        url +
        " | Response эхлэл: " +
        text.slice(0, 80)
    );
  }

  if (!response.ok) {
    throw new Error(data.error || "Алдаа гарлаа.");
  }

  return data;
}

export function loadBootstrap() {
  return request("bootstrap");
}

export function apiRegister(payload) {
  return request("register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function apiLogin(email) {
  return request("login", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function apiSubmitAnswer(payload) {
  return request("submit-answer", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function apiAdmin(pin, payload) {
  return request("admin", {
    method: "POST",
    headers: {
      "x-admin-pin": pin
    },
    body: JSON.stringify(payload)
  });
}