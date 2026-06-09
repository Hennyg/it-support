const { app } = require("@azure/functions");

app.http("hardware-list", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "hardware/list",
    handler: async (req, context) => {

        try {// api/hardware/list/index.js
const { jsonResponse } = require("../../shared/graph");

module.exports = async function (context, req) {
  try {
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
};
            const tenantId     = process.env.TENANT_ID;
            const clientId     = process.env.CLIENT_ID;
            const clientSecret = process.env.CLIENT_SECRET;
            const dataverseUrl = process.env.DATAVERSE_URL;

            const entitySet = "cr767_lch_hardwareudlaans";

            // ─────────────────────────────────────────────
            // Token
            // ─────────────────────────────────────────────

            const tokenRes = await fetch(
                `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        scope: `${dataverseUrl}/.default`,
                        grant_type: "client_credentials"
                    })
                }
            );

            const tokenData = await tokenRes.json();

            if (!tokenData.access_token) {
                throw new Error("Kunne ikke hente token");
            }

            // ─────────────────────────────────────────────
            // Dataverse
            // ─────────────────────────────────────────────

            const dvRes = await fetch(
                `${dataverseUrl}/api/data/v9.2/${entitySet}?$orderby=createdon desc`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                        Accept: "application/json"
                    }
                }
            );

            const dvData = await dvRes.json();

            if (!dvRes.ok) {
                throw new Error(JSON.stringify(dvData));
            }

            const items = (dvData.value || []).map(r => ({

                id: r.cr767_lch_hardwareudlaanid,

                lch_hvad: r.cr767_lch_hvad,
                lch_hvem: r.cr767_lch_hvem,
                lch_hvorfor: r.cr767_lch_hvorfor,

                lch_when: r.cr767_lch_when,
                lch_retur: r.cr767_lch_retur,

                lch_aktiv: r.cr767_lch_aktiv,

                createdon: r.createdon

            }));

            return {
                jsonBody: {
                    ok: true,
                    items
                }
            };

        }
        catch (err) {

            context.error(err);

            return {
                status: 500,
                jsonBody: {
                    ok: false,
                    error: err.message
                }
            };

        }

    }
});
