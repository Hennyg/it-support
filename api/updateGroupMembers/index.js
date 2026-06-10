// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

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

async function callAutomationWebhook(groupEmail, addEmails, removeEmails) {
  const webhookUrl = process.env.EXO_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("EXO_WEBHOOK_URL er ikke konfigureret");

  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      groupEmail,
      addUsers:    addEmails,
      removeUsers: removeEmails
    })
  });

  if (!r.ok) throw new Error(`Webhook fejl ${r.status}: ${await r.text()}`);

  // Azure Automation webhook returnerer 202 og kører asynkront
  // Vi returnerer OK — jobbet kører i baggrunden
  return true;
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
        context.res = jsonResponse(400, { error: "Gruppen har ingen e-mailadresse." });
        return;
      }

      // Slå alle bruger-emails op parallelt
      const addEmails    = [];
      const removeEmails = [];

      for (const userId of add) {
        try {
          addEmails.push(await getUserEmail(token, userId));
        } catch (err) {
          errors.push(`Email-opslag fejl for ${userId}: ${err.message}`);
        }
      }

      for (const userId of remove) {
        try {
          removeEmails.push(await getUserEmail(token, userId));
        } catch (err) {
          errors.push(`Email-opslag fejl for ${userId}: ${err.message}`);
        }
      }

      if (addEmails.length > 0 || removeEmails.length > 0) {
        try {
          await callAutomationWebhook(groupEmail, addEmails, removeEmails);
          added   = addEmails.length;
          removed = removeEmails.length;
        } catch (err) {
          errors.push(`Webhook fejl: ${err.message}`);
        }
      }

    } else {
      // Almindelige security groups og M365 groups — brug Graph v1.0
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
