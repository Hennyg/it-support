// api/getUsers/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

async function betaGet(token, path) {
  const results = [];
  let url = `https://graph.microsoft.com/beta${path}`;
  while (url) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (!r.ok) throw new Error(`Graph beta fejl ${r.status}: ${JSON.stringify(data)}`);
    if (Array.isArray(data.value)) results.push(...data.value);
    else return data;
    url = data["@odata.nextLink"] ?? null;
  }
  return { value: results };
}

module.exports = async function (context, req) {
  try {
    const token = await getGraphToken();
    const filter = encodeURIComponent("userType eq 'Member'");

    // Hent brugere og mødelokaler parallelt — places kan fejle uden at crashe hele kaldet
    const [usersData, roomsData] = await Promise.allSettled([
      graphGet(token, `/users?$filter=${filter}&$select=id,displayName,mail,userPrincipalName,assignedLicenses&$top=999`),
      betaGet(token, `/places/microsoft.graph.room?$select=emailAddress&$top=999`)
    ]);

    const usersValue = usersData.status === "fulfilled" ? (usersData.value?.value ?? []) : [];
    const roomEmails = new Set(
      roomsData.status === "fulfilled"
        ? (roomsData.value?.value ?? []).map(r => r.emailAddress?.toLowerCase()).filter(Boolean)
        : []
    );

    const users = usersValue
      .filter(u => u.displayName)
      .map(u => {
        const mail = (u.mail ?? u.userPrincipalName ?? "").toLowerCase();
        const hasLicense = Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0;
        let mailboxType = "user";
        if (roomEmails.has(mail))  mailboxType = "room";
        else if (!hasLicense)      mailboxType = "shared";
        return {
          id:          u.id,
          displayName: u.displayName,
          mail:        u.mail ?? u.userPrincipalName,
          mailboxType
        };
      })
      .sort((a, b) => a.displayName?.localeCompare(b.displayName, "da"));

    context.res = jsonResponse(200, { count: users.length, users });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
