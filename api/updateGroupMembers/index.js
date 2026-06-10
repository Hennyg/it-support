// api/updateGroupMembers/index.js
const { getGraphToken, graphPost, graphDelete, jsonResponse } = require("../shared/graph");

const AGENT = "http://localhost:5199";

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

async function runPs(script) {
  const res = await fetch(`${AGENT}/api/run-ps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script })
  });
  if (!res.ok) throw new Error(`Agent svarede ${res.status}`);
  return await res.json();
}

async function updateViaAgent(groupEmail, addEmails, removeEmails) {
  const appId     = process.env.CLIENT_ID;
  const tenantId  = process.env.TENANT_ID;
  const thumbprint = process.env.EXO_CERT_THUMBPRINT;

  // Byg add/remove arrays som PS-strenge
  const addPs    = addEmails.map(e => `"${e}"`).join(",");
  const removePs = removeEmails.map(e => `"${e}"`).join(",");

  const script = `
$ErrorActionPreference = 'Stop'
try {
  Connect-ExchangeOnline -AppId "${appId}" -CertificateThumbprint "${thumbprint}" -Organization "${tenantId}" -ShowBanner:$false
  $added = 0; $removed = 0; $errors = @()

  foreach ($email in @(${addPs.length > 0 ? addPs : ''})) {
    try {
      Add-DistributionGroupMember -Identity "${groupEmail}" -Member $email -BypassSecurityGroupManagerCheck -ErrorAction Stop
      $added++
    } catch {
      $errors += "Tilfoej fejl for $($email): $($_.Exception.Message)"
    }
  }

  foreach ($email in @(${removePs.length > 0 ? removePs : ''})) {
    try {
      Remove-DistributionGroupMember -Identity "${groupEmail}" -Member $email -BypassSecurityGroupManagerCheck -Confirm:$false -ErrorAction Stop
      $removed++
    } catch {
      $errors += "Fjern fejl for $($email): $($_.Exception.Message)"
    }
  }

  Disconnect-ExchangeOnline -Confirm:$false
  Write-Output "RESULT:added=$added,removed=$removed,errors=$($errors -join '|')"
} catch {
  Write-Output "FATAL:$($_.Exception.Message)"
}
`.trim();

  const data = await runPs(script);
  const output = (data.output || "").trim();

  if (output.includes("FATAL:")) {
    throw new Error(output.replace("FATAL:", ""));
  }

  const resultLine = output.split("\n").find(l => l.startsWith("RESULT:"));
  if (!resultLine) throw new Error("Intet resultat fra agent: " + output);

  const parts  = resultLine.replace("RESULT:", "").split(",");
  const added  = parseInt(parts.find(p => p.startsWith("added="))?.split("=")[1] || "0");
  const removed = parseInt(parts.find(p => p.startsWith("removed="))?.split("=")[1] || "0");
  const errStr = parts.find(p => p.startsWith("errors="))?.split("=").slice(1).join("=") || "";
  const errors = errStr ? errStr.split("|").filter(Boolean) : [];

  return { added, removed, errors };
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

      const addEmails = [], removeEmails = [];
      for (const userId of add) {
        try { addEmails.push(await getUserEmail(token, userId)); }
        catch (err) { errors.push(`Email-opslag fejl for ${userId}: ${err.message}`); }
      }
      for (const userId of remove) {
        try { removeEmails.push(await getUserEmail(token, userId)); }
        catch (err) { errors.push(`Email-opslag fejl for ${userId}: ${err.message}`); }
      }

      try {
        const result = await updateViaAgent(groupEmail, addEmails, removeEmails);
        added   = result.added;
        removed = result.removed;
        errors.push(...result.errors);
      } catch (err) {
        errors.push(`Agent fejl: ${err.message}`);
      }

    } else {
      for (const userId of add) {
        try {
          await graphPost(token, `/groups/${encodeURIComponent(groupId)}/members/$ref`, {
            "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
          });
          added++;
        } catch (err) { errors.push(`Tilføj fejl for ${userId}: ${err.message}`); }
      }
      for (const userId of remove) {
        try {
          await graphDelete(token, `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}/$ref`);
          removed++;
        } catch (err) { errors.push(`Fjern fejl for ${userId}: ${err.message}`); }
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
