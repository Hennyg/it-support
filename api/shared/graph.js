// api/shared/graph.js
// Delt hjælpefunktioner til Microsoft Graph API og Exchange Online

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Mangler environment variable: ${name}`);
  return v;
}

async function getGraphToken() {
  const tenantId     = requireEnv("TENANT_ID");
  const clientId     = requireEnv("CLIENT_ID");
  const clientSecret = requireEnv("CLIENT_SECRET");

  const body = new URLSearchParams();
  body.set("client_id",     clientId);
  body.set("client_secret", clientSecret);
  body.set("scope",         "https://graph.microsoft.com/.default");
  body.set("grant_type",    "client_credentials");

  const r = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }
  );

  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error(`Token fejl: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Exchange Online token — kræver Exchange.ManageAsApp permission
async function getExoToken() {
  const tenantId     = requireEnv("TENANT_ID");
  const clientId     = requireEnv("CLIENT_ID");
  const clientSecret = requireEnv("CLIENT_SECRET");

  const body = new URLSearchParams();
  body.set("client_id",     clientId);
  body.set("client_secret", clientSecret);
  body.set("scope",         "https://outlook.office365.com/.default");
  body.set("grant_type",    "client_credentials");

  const r = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }
  );

  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error(`EXO token fejl: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function graphGet(token, path) {
  const results = [];
  let url = `https://graph.microsoft.com/v1.0${path}`;

  // Håndtér paginering automatisk
  while (url) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`Graph fejl ${r.status}: ${JSON.stringify(data)}`);

    if (Array.isArray(data.value)) {
      results.push(...data.value);
    } else {
      return data;
    }

    url = data["@odata.nextLink"] ?? null;
  }

  return { value: results };
}

async function graphPost(token, path, body) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (r.status === 204) return {};
  const data = await r.json();
  if (!r.ok) throw new Error(`Graph fejl ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function graphDelete(token, path) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok && r.status !== 204) {
    const data = await r.json().catch(() => ({}));
    throw new Error(`Graph fejl ${r.status}: ${JSON.stringify(data)}`);
  }
  return {};
}

function jsonResponse(status, body) {
  return {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}

async function graphPatch(token, url, body) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0${url}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Graph PATCH ${res.status}: ${txt}`);
  }

  return true;
}

module.exports = {
  getGraphToken,
  getExoToken,
  graphGet,
  graphPost,
  graphDelete,
  graphPatch,
  jsonResponse
};
