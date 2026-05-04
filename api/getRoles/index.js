
// api/getRoles/index.js
// Gruppe-ID'er læses fra environment variables i SWA Configuration.
// Sæt PORTAL_ADMIN_ID og PORTAL_IT_SUPPORT_ID i Application settings.
function buildRoleGroupMappings() {
  const mappings = {};
  if (process.env.PORTAL_ADMIN_ID)      mappings.portal_admin      = process.env.PORTAL_ADMIN_ID;
  if (process.env.PORTAL_IT_SUPPORT_ID) mappings.portal_it_support = process.env.PORTAL_IT_SUPPORT_ID;
  return mappings;
}

function json(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body
  };
}

function asString(v) {
  return String(v ?? "").trim();
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function parsePrincipal(req) {
  const headers = req?.headers || {};
  const principalB64 =
    headers["x-ms-client-principal"] ||
    headers["X-MS-CLIENT-PRINCIPAL"];

  if (!principalB64) return null;

  try {
    return JSON.parse(Buffer.from(principalB64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function getAccessToken() {
  const tenantId = requireEnv("TENANT_ID");
  const clientId = requireEnv("CLIENT_ID");
  const clientSecret = requireEnv("CLIENT_SECRET");

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;

  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const txt = await r.text();
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch {}

  if (!r.ok || !data.access_token) {
    throw new Error(`Kunne ikke hente Graph token: ${txt}`);
  }

  return data.access_token;
}

async function graph(token, method, path, body) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const txt = await r.text();
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch {}

  if (!r.ok) {
    throw new Error(`Graph fejl ${r.status}: ${txt}`);
  }

  return data;
}

async function findUserByEmail(token, email) {
  const safeEmail = email.replace(/'/g, "''");
  const filter = `mail eq '${safeEmail}' or userPrincipalName eq '${safeEmail}'`;

  const userRes = await graph(
    token,
    "GET",
    `/users?$filter=${encodeURIComponent(filter)}&$select=id,mail,userPrincipalName,displayName`
  );

  return Array.isArray(userRes?.value) ? userRes.value[0] || null : null;
}

async function getRolesFromGroups(token, userId) {
  const roleGroupMappings = buildRoleGroupMappings();
  const groupIds = Object.values(roleGroupMappings);

  const membership = await graph(
    token,
    "POST",
    `/users/${encodeURIComponent(userId)}/checkMemberGroups`,
    { groupIds }
  );

  const matchedGroups = Array.isArray(membership?.value) ? membership.value : [];

  return Object.entries(roleGroupMappings)
    .filter(([, groupId]) => matchedGroups.includes(groupId))
    .map(([roleName]) => roleName);
}

module.exports = async function (context, req) {
  const debug = {
    step: "start",
    hasPrincipal: false,
    email: "",
    swaRoles: [],
    graphRoles: [],
    error: ""
  };

  try {
    const cp = parsePrincipal(req);
    debug.hasPrincipal = !!cp;

    if (!cp) {
      return json(context, 200, {
        roles: [],
        debug: { ...debug, error: "Ingen x-ms-client-principal header fundet." }
      });
    }

    const email = asString(cp.userDetails).toLowerCase();
    const swaRoles = Array.isArray(cp.userRoles) ? cp.userRoles : [];

    debug.email = email;
    debug.swaRoles = swaRoles;
    debug.step = "principal_ok";

    // Start med SWA userRoles som fallback
    let roles = [...swaRoles];

    if (!email) {
      return json(context, 200, { roles: unique(roles), debug });
    }

    debug.step = "get_token";
    const token = await getAccessToken();

    debug.step = "find_user";
    const user = await findUserByEmail(token, email);

    if (!user?.id) {
      return json(context, 200, {
        roles: unique(roles),
        debug: { ...debug, error: `Bruger ikke fundet i Graph for ${email}` }
      });
    }

    debug.step = "check_groups";
    const graphRoles = await getRolesFromGroups(token, user.id);
    debug.graphRoles = graphRoles;

    roles = unique([...roles, ...graphRoles]);
    debug.step = "done";

    return json(context, 200, { roles, debug });
  } catch (e) {
    debug.error = e?.message || String(e);

    // Returnér ALDRIG 500 til frontend
    return json(context, 200, {
      roles: unique(debug.swaRoles || []),
      debug
    });
  }
};
