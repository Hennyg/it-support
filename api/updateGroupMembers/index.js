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
    context.res = jsonResponse(200, {
      message: "Ingen ændringer",
      added: 0,
      removed: 0,
      errors: []
    });
    return;
  }

  const token = await getGraphToken();

  const errors = [];
  let added = 0;
  let removed = 0;

  for (const userId of add) {
    try {
      await graphPost(
        token,
        `/groups/${encodeURIComponent(groupId)}/members/$ref`,
        {
          "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
        }
      );

      added++;
    } catch (err) {
      errors.push(`Tilføj fejl for ${userId}: ${err.message}`);
    }
  }

  for (const userId of remove) {
    try {
      await graphDelete(
        token,
        `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`
      );

      removed++;
    } catch (err) {
      errors.push(`Fjern fejl for ${userId}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    context.res = jsonResponse(207, {
      message: "Delvist gennemført",
      requestedAdd: add.length,
      requestedRemove: remove.length,
      added,
      removed,
      errors
    });
    return;
  }

  context.res = jsonResponse(200, {
    message: "OK",
    requestedAdd: add.length,
    requestedRemove: remove.length,
    added,
    removed,
    errors: []
  });
};
