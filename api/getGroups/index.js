// api/getGroups/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    // Hent alle mail-enabled security groups der starter med portal_
    const filter = encodeURIComponent(
      "mailEnabled eq true and securityEnabled eq true and startsWith(displayName,'portal_')"
    );

    const data = await graphGet(
      token,
      `/groups?$filter=${filter}&$select=id,displayName,mail,description,createdDateTime&$orderby=displayName&$top=100`
    );

    const groups = (data.value ?? []).map(g => ({
      id:              g.id,
      displayName:     g.displayName,
      mail:            g.mail,
      description:     g.description,
      createdDateTime: g.createdDateTime
    }));

    context.res = jsonResponse(200, { groups });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
