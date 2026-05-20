const { app } = require("@azure/functions");

app.http("hardware-delete", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "hardware/delete",
    handler: async (req, context) => {

        try {

            const body = await req.json();

            if (!body.id) {
                throw new Error("Mangler id");
            }

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
            // Delete
            // ─────────────────────────────────────────────

            const delRes = await fetch(
                `${dataverseUrl}/api/data/v9.2/${entitySet}(${body.id})`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`
                    }
                }
            );

            if (!delRes.ok) {

                const txt = await delRes.text();

                throw new Error(txt);

            }

            return {
                jsonBody: {
                    ok: true
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
