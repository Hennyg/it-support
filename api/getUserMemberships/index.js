const { getGraphToken, jsonResponse } = require("../shared/graph");

async function graphGetAll(token, path) {
  const results = [];
  let url = `https://graph.microsoft.com/v1.0${path}`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Graph GET ${res.status}: ${JSON.stringify(data)}`);
    }

    results.push(...(data.value ?? []));
    url = data["@odata.nextLink"] ?? null;
  }

  return results;
}

function classifyGroup(g) {
  const groupTypes = Array.isArray(g.groupTypes) ? g.groupTypes : [];
  const provisioning = Array.isArray(g.resourceProvisioningOptions) ? g.resourceProvisioningOptions : [];

  const isUnified = groupTypes.includes("Unified");
  const isTeam = provisioning.includes("Team");

  if (isTeam) return { type: "Teams", icon: "💬", typeSort: 10 };
  if (isUnified) return { type: "Microsoft 365-gruppe", icon: "🧩", typeSort: 20 };
  if (g.mailEnabled === true && g.securityEnabled === false) return { type: "Distributionsgruppe", icon: "📧", typeSort: 30 };
  if (g.mailEnabled === true && g.securityEnabled === true) return { type: "Mail-enabled security", icon: "🔐", typeSort: 40 };
  if (g.mailEnabled === false && g.securityEnabled === true) return { type: "Sikkerhedsgruppe", icon: "🛡️", typeSort: 50 };

  return { type: "Gruppe", icon: "👥", typeSort: 99 };
}

function mapGroup(g) {
  const info = classifyGroup(g);

  return {
    id: g.id,
    displayName: g.displayName,
    mail: g.mail,
    mailNickname: g.mailNickname,
    description: g.description,
    groupTypes: g.groupTypes ?? [],
    mailEnabled: g.mailEnabled === true,
    securityEnabled: g.securityEnabled === true,
    resourceProvisioningOptions: g.resourceProvisioningOptions ?? [],
    type: info.type,
    icon: info.icon,
    typeSort: info.typeSort
  };
}

module.exports = async function (context, req) {
  const userId = req.query?.id;

  if (!userId) {
    context.res = jsonResponse(400, {
      error: "Mangler ?id= parameter"
    });
    return;
  }

  try {
    const token = await getGraphToken();

    let groups;

    try {
      groups = await graphGetAll(
        token,
        `/users/${encodeURIComponent(userId)}/memberOf/microsoft.graph.group?$select=id,displayName,mail,mailNickname,description,groupTypes,mailEnabled,securityEnabled,resourceProvisioningOptions&$top=999`
      );
    } catch {
      groups = await graphGetAll(
        token,
        `/users/${encodeURIComponent(userId)}/memberOf/microsoft.graph.group?$select=id,displayName,mail,mailNickname,description,groupTypes,mailEnabled,securityEnabled&$top=999`
      );
    }

    const mapped = groups
      .filter(g => g.displayName)
      .map(mapGroup)
      .sort((a, b) =>
        (a.typeSort - b.typeSort) ||
        String(a.displayName ?? "").localeCompare(String(b.displayName ?? ""), "da")
      );

    context.res = jsonResponse(200, {
      count: mapped.length,
      groups: mapped
    });

  } catch (err) {
    context.res = jsonResponse(500, {
      error: err.message
    });
  }
};
