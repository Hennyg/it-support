// api/getTeamsBaggrunde/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

module.exports = async function (context, req) {
  const debug = { step: "start", siteId: "", driveId: "", folder: "Teams-baggrunde", error: "" };

  try {
    const siteId  = process.env.DELING_SPO_SITE_ID;
    const driveId = process.env.DELING_SPO_DRIVE_ID;
    const folder  = "Teams-baggrunde";

    debug.siteId  = siteId ? siteId.substring(0, 8) + "..." : "MANGLER";
    debug.driveId = driveId ? driveId.substring(0, 8) + "..." : "MANGLER";

    if (!siteId || !driveId) {
      context.res = jsonResponse(500, { error: "Mangler env vars", debug });
      return;
    }

    debug.step = "get_token";
    const token = await getGraphToken();

    debug.step = "graph_call";
    const path = `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(folder)}:/children?$select=id,name,size,file,@microsoft.graph.downloadUrl&$top=200`;
    debug.path = path;

    const data = await graphGet(token, path);

    debug.step = "done";
    debug.itemCount = data.value?.length ?? 0;

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const images = (data.value ?? [])
      .filter(item => {
        if (!item.file) return false;
        const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(item => ({
        id:           item.id,
        name:         item.name,
        size:         item.size,
        downloadUrl:  item["@microsoft.graph.downloadUrl"],
        thumbnailUrl: item["@microsoft.graph.downloadUrl"]
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "da"));

    context.res = jsonResponse(200, { count: images.length, images, debug });
  } catch (err) {
    debug.error = err?.message || String(err);
    context.res = jsonResponse(500, { error: err.message, debug });
  }
};
