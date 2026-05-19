// api/getUserMemberships/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

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
      `/users/${encodeURIComponent(userId)}/memberOf?$select=id,displayName,mail,groupTypes&$top=999`
    );

    const groups = (data.value ?? [])
      .filter(g => g["@odata.type"] === "#microsoft.graph.group")
      .map(g => ({
        id:          g.id,
        displayName: g.displayName,
        mail:        g.mail,
        type:        g.groupTypes?.includes("Unified") ? "Microsoft 365" :
                     g.mailEnabled ? "Mail-enabled Security" : "Security"
      }))
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { count: groups.length, groups });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
