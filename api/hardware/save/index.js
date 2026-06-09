// api/hardware/save/index.js
const { jsonResponse } = require("../../shared/graph");

module.exports = async function (context, req) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

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

    const payload = {
      cr767_lch_hvad:    body.lch_hvad    || null,
      cr767_lch_hvem:    body.lch_hvem    || null,
      cr767_lch_hvorfor: body.lch_hvorfor || null,
      cr767_lch_aktiv:   !!body.lch_aktiv
    };
    if (body.lch_when)  payload.cr767_lch_when  = body.lch_when;
    if (body.lch_retur) payload.cr767_lch_retur = body.lch_retur;

    if (body.id) {
      // Update
      const patchRes = await fetch(
        `${dataverseUrl}/api/data/v9.2/${entitySet}(${body.id})`,
        { method: "PATCH", headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!patchRes.ok) throw new Error(await patchRes.text());
      context.res = jsonResponse(200, { ok: true, id: body.id });
    } else {
      // Create
      const createRes = await fetch(
        `${dataverseUrl}/api/data/v9.2/${entitySet}`,
        { method: "POST", headers: { Authorization: `Bearer ${tokenData.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!createRes.ok) throw new Error(await createRes.text());
      const entityId = createRes.headers.get("OData-EntityId")?.match(/\((.*?)\)/)?.[1];
      context.res = jsonResponse(201, { ok: true, id: entityId });
    }
  } catch (err) {
    context.res = jsonResponse(500, { ok: false, error: err.message });
  }
};
