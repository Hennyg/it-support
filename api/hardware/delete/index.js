// api/hardware/delete/index.js
const { jsonResponse } = require("../../shared/graph");

module.exports = async function (context, req) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body.id) throw new Error("Mangler id");

    const tenantId     = process.env.TENANT_ID;
    const clientId     = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
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
    if (!tokenData.access_token) throw new Error("Kunne ikke hente token");

    const delRes = await fetch(
      `${dataverseUrl}/api/data/v9.2/${entitySet}(${body.id})`,
      { method: "DELETE", headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    if (!delRes.ok) throw new Error(await delRes.text());

    context.res = jsonResponse(200, { ok: true });
  } catch (err) {
    context.res = jsonResponse(500, { ok: false, error: err.message });
  }
};
