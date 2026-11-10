// api/getSignatureInfo/index.js
// Henter den indloggede brugers navn, mail og telefon fra Entra ID til Outlook signaturen
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

function getPrincipal(req) {
  const header = req.headers["x-ms-client-principal"];
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

module.exports = async function (context, req) {
  const principal = getPrincipal(req);
  const upn = principal?.userDetails;

  if (!upn) {
    context.res = jsonResponse(401, { error: "Ikke logget ind" });
    return;
  }

  try {
    const token = await getGraphToken();
    const u = await graphGet(
      token,
      `/users/${encodeURIComponent(upn)}?$select=givenName,surname,displayName,mail,userPrincipalName,mobilePhone,businessPhones,department,jobTitle`
    );

    context.res = jsonResponse(200, {
      givenName:         u.givenName || "",
      surname:           u.surname || "",
      displayName:       u.displayName || "",
      mail:              u.mail || "",
      userPrincipalName: u.userPrincipalName || "",
      mobilePhone:       u.mobilePhone || "",
      businessPhone:     (u.businessPhones || [])[0] || "",
      department:        u.department || "",
      jobTitle:          u.jobTitle || ""
    });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
