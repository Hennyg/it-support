// api/getGroupMembers/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  const groupId = req.query?.id;

  if (!groupId) {
    context.res = jsonResponse(400, { error: "Mangler ?id= parameter" });
    return;
  }

  try {
    const token = await getGraphToken();

    const data = await graphGet(
      token,
      `/groups/${encodeURIComponent(groupId)}/members?$select=id,displayName,mail,userPrincipalName&$top=999`
    );

    const members = (data.value ?? [])
      .filter(m => m["@odata.type"] === "#microsoft.graph.user")
      .map(u => ({
        id:          u.id,
        displayName: u.displayName,
        mail:        u.mail ?? u.userPrincipalName
      }))
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { members });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
