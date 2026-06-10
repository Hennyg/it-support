// api/hardwareList/index.js
const { jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  try {
    const tenantId     = process.env.TENANT_ID;
const clientId     = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const dataverseUrl = process.env.DATAVERSE_URL;
    const entitySet    = "cr767_lch_hardwareudlaans";

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: `${dataverseUrl}/.default`, grant_type: "client_credentials" })
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Token fejl: " + JSON.stringify(tokenData));

    const dvRes = await fetch(
      `${dataverseUrl}/api/data/v9.2/${entitySet}?$orderby=createdon desc`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" } }
    );
    const dvData = await dvRes.json();
    if (!dvRes.ok) throw new Error(JSON.stringify(dvData));

    const items = (dvData.value || []).map(r => ({
      id:          r.cr767_lch_hardwareudlaanid,
      lch_hvad:    r.cr767_lch_hvad,
      lch_hvem:    r.cr767_lch_hvem,
      lch_hvorfor: r.cr767_lch_hvorfor,
      lch_when:    r.cr767_lch_when,
      lch_retur:   r.cr767_lch_retur,
      lch_aktiv:   r.cr767_lch_aktiv,
      createdon:   r.createdon
    }));

    context.res = jsonResponse(200, { ok: true, items });
  } catch (err) {
    context.res = jsonResponse(500, { ok: false, error: err.message });
  }

  const dataverseUrl = process.env.DV_URL;
console.log("DV_URL:", dataverseUrl);
console.log("CLIENT_ID:", process.env.AZURE_CLIENT_ID ? "sat" : "MANGLER");
console.log("CLIENT_SECRET:", process.env.AZURE_CLIENT_SECRET ? "sat" : "MANGLER");
console.log("TENANT_ID:", process.env.TENANT_ID ? "sat" : "MANGLER");

const tokenRes = await fetch(...);
const tokenData = await tokenRes.json();
console.log("Token response:", JSON.stringify(tokenData));
};
