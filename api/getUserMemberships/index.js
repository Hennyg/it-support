// api/getUserMemberships/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

function classifyGroup(g) {
  const groupTypes = Array.isArray(g.groupTypes) ? g.groupTypes : [];
  const provisioning = Array.isArray(g.resourceProvisioningOptions) ? g.resourceProvisioningOptions : [];

  const isUnified = groupTypes.includes("Unified");
  const isTeam = provisioning.includes("Team");

  if (isTeam) {
    return {
      type: "Teams",
      icon: "💬",
      typeSort: 10
    };
  }

  if (isUnified) {
    return {
      type: "Microsoft 365-gruppe",
      icon: "🧩",
      typeSort: 20
    };
  }

  if (g.mailEnabled === true && g.securityEnabled === false) {
    return {
      type: "Distributionsgruppe",
      icon: "📧",
      typeSort: 30
    };
  }

  if (g.mailEnabled === true && g.securityEnabled === true) {
    return {
      type: "Mail-enabled security",
      icon: "🔐",
      typeSort: 40
    };
  }

  if (g.mailEnabled === false && g.securityEnabled === true) {
    return {
      type: "Sikkerhedsgruppe",
      icon: "🛡️",
      typeSort: 50
    };
  }

  return {
    type: "Gruppe",
    icon: "👥",
    typeSort: 99
  };
}

module.exports = async function (context, req) {
  const userId = req.query?.id;

  if (!userId) {
    context.res = jsonResponse(400, { error: "Mangler ?id= parameter" });
    return;
  }

  try {
    const token = await getGraphToken();

    const data = await graphGet(
      token,
      `/users/${encodeURIComponent(userId)}/memberOf?$select=id,displayName,mail,groupTypes,mailEnabled,securityEnabled,resourceProvisioningOptions&$top=999`
    );

    const groups = (data.value ?? [])
      .filter(g => g["@odata.type"] === "#microsoft.graph.group")
      .map(g => {
        const info = classifyGroup(g);

        return {
          id: g.id,
          displayName: g.displayName,
          mail: g.mail,
          groupTypes: g.groupTypes ?? [],
          mailEnabled: g.mailEnabled === true,
          securityEnabled: g.securityEnabled === true,
          resourceProvisioningOptions: g.resourceProvisioningOptions ?? [],
          type: info.type,
          icon: info.icon,
          typeSort: info.typeSort
        };
      })
      .sort((a, b) =>
        (a.typeSort - b.typeSort) ||
        a.displayName?.localeCompare(b.displayName, "da")
      );

    context.res = jsonResponse(200, { count: groups.length, groups });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
