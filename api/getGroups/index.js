// api/getGroups/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    const filter = encodeURIComponent(
      "mailEnabled eq true and securityEnabled eq true and startsWith(displayName,'portal_')"
    );

    const data = await graphGet(
      token,
      `/groups?$filter=${filter}&$select=id,displayName,mail,description,createdDateTime&$top=100`
    );

    const groups = (data.value ?? [])
      .map(g => ({
        id:              g.id,
        displayName:     g.displayName,
        mail:            g.mail,
        description:     g.description,
        createdDateTime: g.createdDateTime
      }))
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { groups });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
