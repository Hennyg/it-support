// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

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

    // Tilføj medlemmer (maks 20 ad gangen via batch)
    for (let i = 0; i < add.length; i += 20) {
      const chunk = add.slice(i, i + 20);
      const refs = chunk.map(id => `https://graph.microsoft.com/v1.0/directoryObjects/${id}`);
      try {
        await graphPost(token, `/groups/${encodeURIComponent(groupId)}/members/$ref`, {
          "members@odata.bind": refs
        });
      } catch (err) {
        errors.push(`Tilføj fejl: ${err.message}`);
      }
    }

    // Fjern medlemmer én ad gangen
    for (const userId of remove) {
      try {
        await graphDelete(token, `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`);
      } catch (err) {
        errors.push(`Fjern fejl for ${userId}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      context.res = jsonResponse(207, {
        message: "Delvist gennemført",
        added:   add.length,
        removed: remove.length,
        errors
      });
    } else {
      context.res = jsonResponse(200, {
        message: "OK",
        added:   add.length,
        removed: remove.length
      });
    }
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
