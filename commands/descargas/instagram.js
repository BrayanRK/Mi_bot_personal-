import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { TEMP_DIR } from "../../config.js";
import { reply } from "../../utils.js";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "instagram-reels-downloader-api.p.rapidapi.com";
const RAPIDAPI_URL  = "https://instagram-reels-downloader-api.p.rapidapi.com/download";

function extractIgUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[^\s]+/i
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

async function fetchFromApi(igUrl, retries = 2, delay = 4000) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.get(RAPIDAPI_URL, {
        params: { url: igUrl },
        headers: {
          "x-rapidapi-key":  RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          "Content-Type":    "application/json",
        },
        timeout: 30000,
      });

      if (data?.success) {
        // Parsear respuesta exitosa
        const videos = data.data?.medias?.filter(m => m.type === "video");
        const videoUrl = videos?.[0]?.url;
        if (!videoUrl) throw new Error("No encontré el link del video en la respuesta.");

        return {
          videoUrl,
          thumbnail: data.data?.thumbnail  || null,
          title:     data.data?.title       || "",
          author:    data.data?.author      || "",
          duration:  data.data?.duration    || null,
          likes:     data.data?.like_count  || 0,
          views:     data.data?.view_count  || 0,
          username:  data.data?.owner?.username || "",
        };
      }

      // success: false — solo reintentar si es error 500
      lastError = new Error(data?.message || "La API no respondió correctamente.");
      if (data?.code !== 500) break;

    } catch (e) {
      lastError = e;
      const status = e.response?.status;
      if (status && ![500, 502, 503].includes(status)) break;
    }

    if (i < retries) {
      console.log(`[IG] Reintento ${i + 1}/${retries} en ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export default {
  name: "ig",
  aliases: ["instagram", "reel", "igvideo"],
  run: async (sock, msg, args, jid) => {
    

    const igUrl = extractIgUrl(args.join(" "));

    if (!igUrl) {
      
      return reply(
        sock, jid,
        "❌ Envía un link válido de Instagram.\nEj: `.ig https://www.instagram.com/reel/ABC123/`",
        msg
      );
    }

    
    await reply(sock, jid, "⬇️ *Descargando Instagram...*", msg);
    await fs.ensureDir(TEMP_DIR);

    const output = path.join(TEMP_DIR, `ig_${Date.now()}.mp4`);

    try {
      // ── Consultar API (con reintentos en error 500) ─────────────────────
      const { videoUrl, thumbnail, title, author, duration, likes, views, username } =
        await fetchFromApi(igUrl);

      console.log("[IG] URL obtenida:", videoUrl.slice(0, 80) + "...");

      // ── Thumbnail con info ──────────────────────────────────────────────
      if (thumbnail) {
        const caption =
          (title  ? `📝 ${title.slice(0, 200)}\n\n` : "") +
          (author ? `👤 *${author}*` + (username ? ` (@${username})` : "") + "\n" : "") +
          (duration ? `⏱️ ${Math.round(duration)}s\n` : "") +
          `❤️ ${likes.toLocaleString()} | 👁️ ${views.toLocaleString()}\n` +
          `⬇️ Descargando...`;

        await sock.sendMessage(jid, {
          image: { url: thumbnail },
          caption,
        }, { quoted: msg });
      }

      // ── Descargar video ─────────────────────────────────────────────────
      const response = await axios.get(videoUrl, {
        responseType: "stream",
        timeout: 120000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer":    "https://www.instagram.com/",
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
          caption:  `✅ *Instagram listo!*\n📦 ${sizeMB}MB`,
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, {
          document: { url: output },
          mimetype: "video/mp4",
          fileName: `instagram_${Date.now()}.mp4`,
          caption:  `✅ *Instagram listo!*\n📦 ${sizeMB}MB\n📁 Enviado como documento`,
        }, { quoted: msg });
      }

      

    } catch (e) {
      console.error("[IG ERROR]", e.response?.data || e.message);

      const status = e.response?.status;
      let msgErr = `❌ ${e.message}`;

      if (status === 429)
        msgErr = "⏳ Límite de la API alcanzado, intenta en unos minutos.";
      else if (status === 403)
        msgErr = "❌ API key inválida o sin suscripción activa.";
      else if (status >= 500)
        msgErr = "⏳ El servidor de descarga está en mantenimiento, intenta en 1 minuto.";

      
      await reply(sock, jid, msgErr, msg);

    } finally {
      if (await fs.pathExists(output)) await fs.unlink(output).catch(() => {});
    }
  },
};

