// api/createUser/index.js
const { getGraphToken, jsonResponse } = require("../shared/graph");

async function graphPost(token, path, body) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const txt = await r.text();
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch {}
  if (!r.ok) throw new Error(`Graph fejl ${r.status}: ${data.error?.message ?? txt}`);
  return data;
}

module.exports = async function (context, req) {
  const body = req.body;
  if (!body?.upn || !body?.displayName || !body?.password) {
    context.res = jsonResponse(400, { error: "Mangler påkrævede felter (upn, displayName, password)" });
    return;
  }

  try {
    const token = await getGraphToken();

    // Opret bruger
    const userPayload = {
      accountEnabled:    true,
      displayName:       body.displayName,
      givenName:         body.firstName || "",
      surname:           body.lastName  || "",
      userPrincipalName: body.upn,
      mailNickname:      body.mailNickname || body.upn.split("@")[0],
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: body.password
      },
      usageLocation: "DK"
    };

    // Valgfrie felter
    if (body.jobTitle)      userPayload.jobTitle      = body.jobTitle;
    if (body.department)    userPayload.department    = body.department;
    if (body.companyName)   userPayload.companyName   = body.companyName;
    if (body.phone)         userPayload.businessPhones = [body.phone];
    if (body.streetAddress) userPayload.streetAddress = body.streetAddress;
    if (body.city)          userPayload.city          = body.city;
    if (body.postalCode)    userPayload.postalCode    = body.postalCode;
    if (body.country)       userPayload.country       = body.country;

    const newUser = await graphPost(token, "/users", userPayload);
    const userId  = newUser.id;

    // Nærmeste leder (manager) – fejl stopper ikke oprettelsen
    let managerError = null;
    if (body.managerId) {
      try {
        if (!/^[0-9a-f-]{36}$/i.test(body.managerId)) throw new Error("Ugyldigt leder-id");
        const r = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/manager/$ref`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ "@odata.id": `https://graph.microsoft.com/v1.0/users/${body.managerId}` })
        });
        if (!r.ok) {
          const txt = await r.text();
          let msg = txt;
          try { msg = JSON.parse(txt).error?.message || txt; } catch {}
          throw new Error(`Graph fejl ${r.status}: ${msg}`);
        }
      } catch (err) {
        managerError = err.message;
      }
    }

    // Tilføj til grupper
    const groupIds    = body.groupIds ?? [];
    const groupErrors = [];

    await Promise.all(groupIds.map(async groupId => {
      try {
        await graphPost(token, `/groups/${groupId}/members/$ref`, {
          "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
        });
      } catch (err) {
        groupErrors.push({ groupId, error: err.message });
      }
    }));

    context.res = jsonResponse(201, {
      success:     true,
      userId,
      upn:         body.upn,
      displayName: body.displayName,
      groupsAdded: groupIds.length - groupErrors.length,
      groupErrors,
      managerError
    });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
