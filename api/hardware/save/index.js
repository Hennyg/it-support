const { app } = require("@azure/functions");

app.http("hardware-save", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "hardware/save",
    handler: async (req, context) => {

        try {

            const body = await req.json();

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
            // Payload
            // ─────────────────────────────────────────────

            const payload = {

                cr767_lch_hvad: body.lch_hvad || null,
                cr767_lch_hvem: body.lch_hvem || null,
                cr767_lch_hvorfor: body.lch_hvorfor || null,

                cr767_lch_aktiv: !!body.lch_aktiv

            };

            if (body.lch_when) {
                payload.cr767_lch_when = body.lch_when;
            }

            if (body.lch_retur) {
                payload.cr767_lch_retur = body.lch_retur;
            }

            // ─────────────────────────────────────────────
            // Update
            // ─────────────────────────────────────────────

            if (body.id) {

                const patchRes = await fetch(
                    `${dataverseUrl}/api/data/v9.2/${entitySet}(${body.id})`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization: `Bearer ${tokenData.access_token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                if (!patchRes.ok) {

                    const txt = await patchRes.text();

                    throw new Error(txt);

                }

                return {
                    jsonBody: {
                        ok: true,
                        id: body.id
                    }
                };

            }

            // ─────────────────────────────────────────────
            // Create
            // ─────────────────────────────────────────────

            const createRes = await fetch(
                `${dataverseUrl}/api/data/v9.2/${entitySet}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            const entityId =
                createRes.headers
                    .get("OData-EntityId")
                    ?.match(/\((.*?)\)/)?.[1];

            if (!createRes.ok) {

                const txt = await createRes.text();

                throw new Error(txt);

            }

            return {
                jsonBody: {
                    ok: true,
                    id: entityId
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
