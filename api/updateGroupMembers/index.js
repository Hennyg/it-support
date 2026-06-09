// api/updateGroupMembers/index.js
const { getGraphToken, getExoToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

// Henter gruppeinfo fra Graph — bruges til at afgøre gruppetypen
async function getGroupInfo(token, groupId) {
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}?$select=mail,mailEnabled,groupTypes,securityEnabled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return await r.json();
}

// EXO REST — tilføj medlem til distribution list / mail-enabled security group
async function exoAddMember(exoToken, groupEmail, userEmail) {
  const r = await fetch(
    `https://outlook.office365.com/adminapi/beta/${encodeURIComponent(process.env.TENANT_ID)}/JoinPrivateDistributionList`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exoToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        groupSmtpAddress: groupEmail,
        userSmtpAddresses: [userEmail]
      })
    }
  );
  if (r.status === 200 || r.status === 204) return;
  const txt = await r.text();
  throw new Error(`EXO tilføj fejl ${r.status}: ${txt}`);
}

// EXO REST — fjern medlem fra distribution list / mail-enabled security group
async function exoRemoveMember(exoToken, groupEmail, userEmail) {
  const r = await fetch(
    `https://outlook.office365.com/adminapi/beta/${encodeURIComponent(process.env.TENANT_ID)}/LeavePrivateDistributionList`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${exoToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        groupSmtpAddress: groupEmail,
        userSmtpAddresses: [userEmail]
      })
    }
  );
  if (r.status === 200 || r.status === 204) return;
  const txt = await r.text();
  throw new Error(`EXO fjern fejl ${r.status}: ${txt}`);
}

// Slår brugerens primære SMTP-adresse op via Graph
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

    const groupInfo = await getGroupInfo(token, groupId);

    // Mail-enabled security group eller distribution list
    const isMailGroup =
      groupInfo.mailEnabled === true &&
      !(groupInfo.groupTypes ?? []).includes("Unified");

    if (isMailGroup) {
      // Brug Exchange Online REST API
      const groupEmail = groupInfo.mail;
      if (!groupEmail) {
        context.res = jsonResponse(400, { error: "Gruppen har ingen e-mailadresse — kan ikke opdatere via EXO." });
        return;
      }

      const exoToken = await getExoToken();

      // Tilføj medlemmer
      for (const userId of add) {
        try {
          const userEmail = await getUserEmail(token, userId);
          await exoAddMember(exoToken, groupEmail, userEmail);
          added++;
        } catch (err) {
          errors.push(`Tilføj fejl for ${userId}: ${err.message}`);
        }
      }

      // Fjern medlemmer
      for (const userId of remove) {
        try {
          const userEmail = await getUserEmail(token, userId);
          await exoRemoveMember(exoToken, groupEmail, userEmail);
          removed++;
        } catch (err) {
          errors.push(`Fjern fejl for ${userId}: ${err.message}`);
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
