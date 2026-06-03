// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

async function graphBetaPost(token, path, body) {
  const r = await fetch(`https://graph.microsoft.com/beta${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (r.status === 204 || r.status === 200) return {};
  const txt = await r.text();
  let data = {};
  try { data = JSON.parse(txt); } catch {}
  if (!r.ok) throw new Error(`Graph beta fejl ${r.status}: ${txt}`);
  return data;
}

async function graphBetaDelete(token, path) {
  const r = await fetch(`https://graph.microsoft.com/beta${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (r.status === 204 || r.status === 200) return;
  const txt = await r.text();
  throw new Error(`Graph beta fejl ${r.status}: ${txt}`);
}

async function getGroupInfo(token, groupId) {
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}?$select=mail,mailEnabled,groupTypes,securityEnabled`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return await r.json();
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
    const isMailEnabled = groupInfo.mailEnabled && !groupInfo.groupTypes?.includes("Unified");

    // Tilføj medlemmer
    for (const userId of add) {
      try {
        if (isMailEnabled) {
          // Mail-enabled security / distribution: brug Graph beta
          await graphBetaPost(token, `/groups/${encodeURIComponent(groupId)}/members/$ref`, {
            "@odata.id": `https://graph.microsoft.com/beta/directoryObjects/${userId}`
          });
        } else {
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
        if (isMailEnabled) {
          await graphBetaDelete(token, `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`);
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
