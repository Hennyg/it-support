// api/getAllGroups/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    const data = await graphGet(
      token,
      `/groups?$select=id,displayName,mail,description,groupTypes&$top=999`
    );

    const groups = (data.value ?? [])
      .map(g => ({
        id:          g.id,
        displayName: g.displayName,
        mail:        g.mail,
        description: g.description,
        type:        g.groupTypes?.includes("Unified") ? "Microsoft 365" :
                     g.mailEnabled ? "Mail-enabled Security" : "Security"
      }))
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { count: groups.length, groups });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
