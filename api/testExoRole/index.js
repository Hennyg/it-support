// api/testExoRole/index.js
// Midlertidig testfunktion — slet efter brug
const { jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  const tenantId     = process.env.TENANT_ID;
  const clientId     = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  // Hent EXO token
  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id",     clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("scope",         "https://outlook.office365.com/.default");
  tokenBody.set("grant_type",    "client_credentials");

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenBody.toString() }
  );
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    context.res = jsonResponse(500, { step: "token", error: tokenData });
    return;
  }

  const exoToken = tokenData.access_token;

  // Kald Get-User på app'ens eget service principal — viser hvem EXO ser som kalder
  const r = await fetch(
    `https://outlook.office365.com/adminapi/beta/${encodeURIComponent(tenantId)}/InvokeCommand`,
    {
      method: "POST",
      headers: {
        Authorization:         `Bearer ${exoToken}`,
        "Content-Type":        "application/json",
        "Accept":              "application/json",
        "X-CmdletName":        "Get-OrganizationConfig",
        "X-ResponseFormat":    "json",
        "X-ClientApplication": "ExoManagementModule",
        "X-AnchorMailbox":     `app:${clientId}@${tenantId}`
      },
      body: JSON.stringify({
        CmdletInput: {
          CmdletName: "Get-OrganizationConfig",
          Parameters: {}
        }
      })
    }
  );

  const txt = await r.text();
  context.res = jsonResponse(r.status, { status: r.status, body: txt.substring(0, 2000) });
};
