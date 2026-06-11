import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { TEMP_DIR } from "../../config.js";
import { reply } from "../../utils.js";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "facebook17.p.rapidapi.com";
const RAPIDAPI_URL  = "https://facebook17.p.rapidapi.com/api/facebook/links";

function extractFbUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/(?:www\.)?(?:facebook\.com|fb\.watch)\/[^\s]+/i
  );
  if (!match) return null;
  try {
    const url = new URL(match[0].trim());
    url.search = "";
    return url.toString();
  } catch {
    return match[0].trim();
  }
}

async function fetchFromApi(fbUrl) {
  const { data } = await axios.post(
    RAPIDAPI_URL,
    { url: fbUrl },
    {
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-key":  RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
      timeout: 30000,
    }
  );

  // La respuesta es un array; tomamos el primer elemento
  const item = Array.isArray(data) ? data[0] : data;
  if (!item) throw new Error("La API no devolvió resultados.");

  // Preferir HD, si no SD
  const hdUrl = item.urls?.find(u => u.subName === "HD")?.url;
  const sdUrl = item.urls?.find(u => u.subName === "SD")?.url;
  const videoUrl = hdUrl || sdUrl;

  if (!videoUrl) throw new Error("No encontré el link del video en la respuesta.");

  return {
    videoUrl,
    quality:   hdUrl ? "HD" : "SD",
    title:     item.meta?.title     || "Facebook Video",
    duration:  item.meta?.duration  || null,
    thumbnail: item.pictureUrl      || null,
  };
}

export default {
  name: "fb",
  aliases: ["facebook", "fbmp4"],
  run: async (sock, msg, args, jid) => {
    

    const fbUrl = extractFbUrl(args.join(" "));

    if (!fbUrl) {
      
      return reply(
        sock, jid,
        "❌ Envía un link válido de Facebook.\nEj: `.fb https://fb.watch/abc`",
        msg
      );
    }

    
    await reply(sock, jid, "⬇️ *Descargando Facebook...*", msg);
    await fs.ensureDir(TEMP_DIR);

    const output = path.join(TEMP_DIR, `fb_${Date.now()}.mp4`);

    try {
      // ── Consultar API ───────────────────────────────────────────────────
      const { videoUrl, quality, title, duration, thumbnail } = await fetchFromApi(fbUrl);

      console.log(`[FB] URL obtenida (${quality}):`, videoUrl.slice(0, 80) + "...");

      // ── Thumbnail ───────────────────────────────────────────────────────
      if (thumbnail) {
        await sock.sendMessage(jid, {
          image: { url: thumbnail },
          caption:
            `🎬 *${title}*\n` +
            (duration ? `⏱️ ${duration}\n` : "") +
            `📺 Calidad: ${quality}\n⬇️ Descargando...`,
        }, { quoted: msg });
      }

      // ── Descargar video ─────────────────────────────────────────────────
      const response = await axios.get(videoUrl, {
        responseType: "stream",
        timeout: 120000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer":    "https://www.facebook.com/",
        },
      });

      await pipeline(response.data, fs.createWriteStream(output));

      const stats = await fs.stat(output);
      if (!stats.size || stats.size < 50_000)
        throw new Error("Video corrupto o muy pequeño.");

      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

      // ── Enviar video ────────────────────────────────────────────────────
      try {
        await sock.sendMessage(jid, {
          video:    { url: output },
          mimetype: "video/mp4",
          caption:  `✅ *Facebook listo!*\n📺 ${quality} | 📦 ${sizeMB}MB`,
        }, { quoted: msg });
      } catch {
        // Si falla como video, enviar como documento
        await sock.sendMessage(jid, {
          document: { url: output },
          mimetype: "video/mp4",
          fileName: `facebook_${Date.now()}.mp4`,
          caption:  `✅ *Facebook listo!*\n📺 ${quality} | 📦 ${sizeMB}MB\n📁 Enviado como documento`,
        }, { quoted: msg });
      }

      

    } catch (e) {
      console.error("[FB ERROR]", e.response?.data || e.message);

      const status = e.response?.status;
      let msgErr = `❌ ${e.message}`;

      if (status === 429)
        msgErr = "⏳ Límite de la API alcanzado, intenta en unos minutos.";
      else if (status === 403)
        msgErr = "❌ API key inválida o sin suscripción activa.";
      else if (status >= 500)
        msgErr = "⏳ El servidor de descarga falló, intenta de nuevo.";

      
      await reply(sock, jid, msgErr, msg);

    } finally {
      if (await fs.pathExists(output)) await fs.unlink(output).catch(() => {});
    }
  },
};

