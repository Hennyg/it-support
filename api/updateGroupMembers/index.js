// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

// Hent Exchange Online token (kræver Exchange.ManageAsApp permission)
async function getExchangeToken() {
  const tenantId     = process.env.TENANT_ID;
  const clientId     = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     clientId,
        client_secret: clientSecret,
        scope:         "https://outlook.office365.com/.default"
      })
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error("Exchange token fejl: " + (data.error_description || data.error));
  return data.access_token;
}

// Tilføj via Exchange Online REST API
async function exchangeAddMember(exToken, groupEmail, memberEmail) {
  const res = await fetch(
    `https://outlook.office365.com/adminapi/beta/${process.env.TENANT_ID}/distributionGroup('${encodeURIComponent(groupEmail)}')/members/$ref`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "@odata.id": `https://outlook.office365.com/adminapi/beta/${process.env.TENANT_ID}/user('${encodeURIComponent(memberEmail)}')`
      })
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Exchange fejl ${res.status}: ${txt}`);
  }
}

// Fjern via Exchange Online REST API
async function exchangeRemoveMember(exToken, groupEmail, memberEmail) {
  const res = await fetch(
    `https://outlook.office365.com/adminapi/beta/${process.env.TENANT_ID}/distributionGroup('${encodeURIComponent(groupEmail)}')/members/$ref?id=https://outlook.office365.com/adminapi/beta/${process.env.TENANT_ID}/user('${encodeURIComponent(memberEmail)}')`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${exToken}` }
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Exchange fejl ${res.status}: ${txt}`);
  }
}

// Hent bruger email via Graph
async function getUserEmail(token, userId) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}?$select=mail,userPrincipalName`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return data.mail || data.userPrincipalName;
}

// Hent gruppe email via Graph
async function getGroupEmail(token, groupId) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}?$select=mail,mailEnabled,groupTypes`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  return { mail: data.mail, mailEnabled: data.mailEnabled, isUnified: data.groupTypes?.includes("Unified") };
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

  if (!groupId) {
    context.res = jsonResponse(400, { error: "Mangler groupId" });
    return;
  }

  if (add.length === 0 && remove.length === 0) {
    context.res = jsonResponse(200, { message: "Ingen ændringer" });
    return;
  }

  try {
    const token = await getGraphToken();
    const errors = [];
    let added = 0, removed = 0;

    // Tjek gruppe type
    const groupInfo = await getGroupEmail(token, groupId);
    const isMailEnabled = groupInfo.mailEnabled && !groupInfo.isUnified;

    // Tilføj medlemmer
    for (const userId of add) {
      try {
        if (isMailEnabled && groupInfo.mail) {
          // Mail-enabled: brug Exchange Online
          const userEmail  = await getUserEmail(token, userId);
          const exToken    = await getExchangeToken();
          await exchangeAddMember(exToken, groupInfo.mail, userEmail);
        } else {
          // Security/M365: brug Graph
          await graphPost(token, `/groups/${encodeURIComponent(groupId)}/members/$ref`, {
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
          });
        }
        added++;
      } catch (err) {
        errors.push(`Tilføj fejl for ${userId}: ${err.message}`);
      }
    }

    // Fjern medlemmer
    for (const userId of remove) {
      try {
        if (isMailEnabled && groupInfo.mail) {
          const userEmail = await getUserEmail(token, userId);
          const exToken   = await getExchangeToken();
          await exchangeRemoveMember(exToken, groupInfo.mail, userEmail);
        } else {
          await graphDelete(token, `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`);
        }
        removed++;
      } catch (err) {
        errors.push(`Fjern fejl for ${userId}: ${err.message}`);
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
