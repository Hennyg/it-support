// api/getTeamsBaggrunde/index.js
const { getGraphToken, graphGet, jsonResponse } = require("../shared/graph");

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

    // Hent filer i mappen
    const data = await graphGet(
      token,
      `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${encodeURIComponent(folder)}:/children?$select=id,name,size,file,@microsoft.graph.downloadUrl&$top=200`
    );

    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];

    const items = (data.value ?? []).filter(item => {
      if (!item.file) return false;
      const ext = item.name.substring(item.name.lastIndexOf(".")).toLowerCase();
      return imageExtensions.includes(ext);
    });

    // Hent thumbnails for hvert billede parallelt
    const images = await Promise.all(items.map(async item => {
      let thumbnailUrl = item["@microsoft.graph.downloadUrl"];
      try {
        const thumbData = await graphGet(
          token,
          `/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${item.id}/thumbnails/0/medium`
        );
        if (thumbData?.url) thumbnailUrl = thumbData.url;
      } catch {}

      return {
        id:          item.id,
        name:        item.name,
        size:        item.size,
        downloadUrl: item["@microsoft.graph.downloadUrl"],
        thumbnailUrl
      };
    }));

    images.sort((a, b) => a.name.localeCompare(b.name, "da"));

    context.res = jsonResponse(200, { count: images.length, images });
  } catch (err) {
    context.res = jsonResponse(500, { error: err.message });
  }
};
