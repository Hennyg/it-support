// api/updateGroupMembers/index.js
// Tilføjer/fjerner medlemmer i en Entra ID-gruppe via Graph.
//   POST { groupId, add: [userId...], remove: [userId...] }
//   → { success, added, removed, errors: [ "tekst" ] }
// Distributions- og mail-enabled grupper kan IKKE ændres via Graph –
// de håndteres i frontend via den lokale agent (Exchange).
const { getGraphToken, jsonResponse } = require("../shared/graph");

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function graphCall(token, method, path, body) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (r.ok) return;
  const txt = await r.text();
  let msg = txt;
  try { msg = JSON.parse(txt).error?.message || txt; } catch {}
  const e = new Error(`Graph ${r.status}: ${msg}`);
  e.status = r.status;
  e.graphMessage = String(msg);
  throw e;
}

module.exports = async function (context, req) {
  const body = req.body || {};
  const groupId = String(body.groupId || "").trim();
  const add = Array.isArray(body.add) ? body.add.filter(Boolean) : [];
  const remove = Array.isArray(body.remove) ? body.remove.filter(Boolean) : [];

  if (!GUID.test(groupId)) {
    context.res = jsonResponse(400, { error: "Mangler eller ugyldigt groupId" });
    return;
  }
  const badIds = [...add, ...remove].filter(id => !GUID.test(String(id)));
  if (badIds.length) {
    context.res = jsonResponse(400, { error: `Ugyldige bruger-id'er: ${badIds.join(", ")}` });
    return;
  }

  try {
    const token = await getGraphToken();
    const errors = [];
    let added = 0, removed = 0;

    for (const userId of add) {
      try {
        await graphCall(token, "POST", `/groups/${groupId}/members/$ref`, {
          "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
        });
        added++;
      } catch (e) {
        // Allerede medlem tæller som succes
        if (e.status === 400 && /already exist/i.test(e.graphMessage || "")) { added++; continue; }
        errors.push(`Tilføj ${userId}: ${e.message}`);
      }
    }

    for (const userId of remove) {
      try {
        await graphCall(token, "DELETE", `/groups/${groupId}/members/${userId}/$ref`);
        removed++;
      } catch (e) {
        // Ikke medlem (længere) tæller som succes
        if (e.status === 404) { removed++; continue; }
        errors.push(`Fjern ${userId}: ${e.message}`);
      }
    }

    context.res = jsonResponse(200, { success: errors.length === 0, added, removed, errors });
  } catch (err) {
    context.log.error("updateGroupMembers:", err);
    context.res = jsonResponse(500, { error: err.message });
  }
};
