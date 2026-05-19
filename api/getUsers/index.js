// api/getUsers/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();

    // Kun medlemmer (ikke gæster) — userType eq 'Member'
    const filter = encodeURIComponent("userType eq 'Member'");

    const data = await graphGet(
      token,
      `/users?$filter=${filter}&$select=id,displayName,mail,userPrincipalName&$top=999&$orderby=displayName`
    );

    const users = (data.value ?? [])
      .filter(u => u.displayName)
      .map(u => ({
        id:          u.id,
        displayName: u.displayName,
        mail:        u.mail ?? u.userPrincipalName
      }));

    context.res = jsonResponse(200, { count: users.length, users });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
