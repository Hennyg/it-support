// api/getTeamsBaggrunde/index.js
// Henter billedfiler fra SharePoint mappen "Teams-baggrunde"
// Bruger DELING_SPO_SITE_ID og DELING_SPO_DRIVE_ID fra environment variables

const { getGraphToken, jsonResponse } = require("../shared/graph");

async function graphGet(token, path) {
  const r = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const txt = await r.text();
  let data = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch {}
  if (!r.ok) throw new Error(`Graph fejl ${r.status}: ${txt}`);
  return data;
}

module.exports = async function (context, req) {
  try {
    const siteId  = process.env.DELING_SPO_SITE_ID;
    const driveId = process.env.DELING_SPO_DRIVE_ID;
    const folder  = "Teams-baggrunde";

    if (!siteId || !driveId) {
      context.res = jsonResponse(500, { error: "Mangler DELING_SPO_SITE_ID eller DELING_SPO_DRIVE_ID" });
      return;
    }

    const token = await getGraphToken();

    // Hent indhold af mappen
    const data = await graphGet(
      token,
      `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(folder)}:/children?$select=id,name,size,file,@microsoft.graph.downloadUrl&$top=200`
    );

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

    const images = (data.value ?? [])
      .filter(item => {
        if (!item.file) return false; // kun filer, ikke mapper
        const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(item => ({
        id:          item.id,
        name:        item.name,
        size:        item.size,
        downloadUrl: item["@microsoft.graph.downloadUrl"],
        thumbnailUrl: item["@microsoft.graph.downloadUrl"] // bruges som preview
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    context.res = jsonResponse(200, { count: images.length, images });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
