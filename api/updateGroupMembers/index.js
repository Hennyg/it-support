// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

// Inline EXO token — undgår afhængighed af cachet version af shared/graph.js
async function getExoToken() {
  const tenantId     = process.env.TENANT_ID;
  const clientId     = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) throw new Error("Mangler TENANT_ID, CLIENT_ID eller CLIENT_SECRET");

  const body = new URLSearchParams();
  body.set("client_id",     clientId);
  body.set("client_secret", clientSecret);
  body.set("scope",         "https://outlook.office365.com/.default");
  body.set("grant_type",    "client_credentials");

  const r = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }
  );
  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error(`EXO token fejl: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function getGroupInfo(token, groupId) {
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}?$select=mail,mailEnabled,groupTypes,securityEnabled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return await r.json();
}

async function getUserEmail(token, userId) {
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}?$select=mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await r.json();
  const email = data.mail || data.userPrincipalName;
  if (!email) throw new Error(`Kunne ikke finde e-mail for bruger ${userId}`);
  return email;
}

async function exoAddMember(exoToken, tenantId, groupEmail, userEmail) {
  const r = await fetch(
    `https://outlook.office365.com/adminapi/beta/${encodeURIComponent(tenantId)}/JoinPrivateDistributionList`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${exoToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ groupSmtpAddress: groupEmail, userSmtpAddresses: [userEmail] })
    }
  );
  if (r.status === 200 || r.status === 204) return;
  const txt = await r.text();
  throw new Error(`EXO tilføj fejl ${r.status}: ${txt}`);
}

async function exoRemoveMember(exoToken, tenantId, groupEmail, userEmail) {
  const r = await fetch(
    `https://outlook.office365.com/adminapi/beta/${encodeURIComponent(tenantId)}/LeavePrivateDistributionList`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${exoToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ groupSmtpAddress: groupEmail, userSmtpAddresses: [userEmail] })
    }
  );
  if (r.status === 200 || r.status === 204) return;
  const txt = await r.text();
  throw new Error(`EXO fjern fejl ${r.status}: ${txt}`);
}

module.exports = async function (context, req) {
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    context.res = jsonResponse(400, { error: "Ugyldig JSON" });
    return;
  }

  const { groupId, add = [], remove = [] } = body ?? {};

  if (!groupId) { context.res = jsonResponse(400, { error: "Mangler groupId" }); return; }
  if (add.length === 0 && remove.length === 0) { context.res = jsonResponse(200, { message: "Ingen ændringer" }); return; }

  try {
    const token = await getGraphToken();
    const errors = [];
    let added = 0, removed = 0;

    const groupInfo = await getGroupInfo(token, groupId);
    const isMailGroup = groupInfo.mailEnabled === true && !(groupInfo.groupTypes ?? []).includes("Unified");

    if (isMailGroup) {
      const groupEmail = groupInfo.mail;
      if (!groupEmail) {
        context.res = jsonResponse(400, { error: "Gruppen har ingen e-mailadresse — kan ikke opdatere via EXO." });
        return;
      }

      const tenantId = process.env.TENANT_ID;
      const exoToken = await getExoToken();

      for (const userId of add) {
        try {
          const userEmail = await getUserEmail(token, userId);
          await exoAddMember(exoToken, tenantId, groupEmail, userEmail);
          added++;
        } catch (err) {
          errors.push(`Tilføj fejl for ${userId}: ${err.message}`);
        }
      }

      for (const userId of remove) {
        try {
          const userEmail = await getUserEmail(token, userId);
          await exoRemoveMember(exoToken, tenantId, groupEmail, userEmail);
          removed++;
        } catch (err) {
          errors.push(`Fjern fejl for ${userId}: ${err.message}`);
        }
      }

    } else {
      // Almindelige security groups og M365 groups
      for (const userId of add) {
        try {
          await graphPost(token, `/groups/${encodeURIComponent(groupId)}/members/$ref`, {
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
          });
          added++;
        } catch (err) {
          errors.push(`Tilføj fejl for ${userId}: ${err.message}`);
        }
      }

      for (const userId of remove) {
        try {
          await graphDelete(token, `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`);
          removed++;
        } catch (err) {
          errors.push(`Fjern fejl for ${userId}: ${err.message}`);
        }
      }
    }

    if (errors.length > 0) {
      context.res = jsonResponse(207, {
        message: "Delvist gennemført",
        requestedAdd: add.length, requestedRemove: remove.length,
        added, removed, errors
      });
    } else {
      context.res = jsonResponse(200, { message: "OK", added, removed });
    }

  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
