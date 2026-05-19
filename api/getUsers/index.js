// api/getUsers/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    const filter = encodeURIComponent("userType eq 'Member'");

    const data = await graphGet(
      token,
      `/users?$filter=${filter}&$select=id,displayName,mail,userPrincipalName&$top=999`
    );

    const users = (data.value ?? [])
      .filter(u => u.displayName)
      .map(u => ({
        id:          u.id,
        displayName: u.displayName,
        mail:        u.mail ?? u.userPrincipalName
      }))
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { count: users.length, users });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
