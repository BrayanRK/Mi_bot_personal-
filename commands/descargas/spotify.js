import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { TEMP_DIR } from "../../config.js";
import { reply } from "../../utils.js";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "spotify-downloader9.p.rapidapi.com";
const RAPIDAPI_URL  = "https://spotify-downloader9.p.rapidapi.com/downloadSong";

function extractSpotifyUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?track\/[a-zA-Z0-9]+[^\s]*/i
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

async function fetchFromApi(spotifyUrl, retries = 2, delay = 4000) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.get(RAPIDAPI_URL, {
        params: { songId: spotifyUrl },
        headers: {
          "x-rapidapi-key":  RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
          "Content-Type":    "application/json",
        },
        timeout: 30000,
      });

      if (data?.success && data?.data?.downloadLink) {
        return {
          downloadLink: data.data.downloadLink,
          title:  data.data.title  || "Canción",
          artist: data.data.artist || "",
          album:  data.data.album  || "",
          cover:  data.data.cover  || null,
        };
      }

      lastError = new Error(data?.message || "La API no devolvió link de descarga.");
      break;

    } catch (e) {
      lastError = e;
      const status = e.response?.status;
      if (status && ![500, 502, 503].includes(status)) break;
    }

    if (i < retries) {
      console.log(`[SPOTIFY] Reintento ${i + 1}/${retries} en ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export default {
  name: "spotify",
  aliases: ["spty", "spoti", "cancion"],
  run: async (sock, msg, args, jid) => {
    const react = async (emoji) => {
      try {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: emoji, key: msg.key },
        });
      } catch {}
    };

    const spotifyUrl = extractSpotifyUrl(args.join(" "));

    if (!spotifyUrl) {
      await react("❌");
      return reply(
        sock, jid,
        "❌ Envía un link válido de Spotify.\nEj: `.spotify https://open.spotify.com/track/ABC123`",
        msg
      );
    }

    await react("⏳");
    await reply(sock, jid, "🎵 *Descargando Spotify...*", msg);
    await fs.ensureDir(TEMP_DIR);

    const output = path.join(TEMP_DIR, `spotify_${Date.now()}.mp3`);

    try {
      // ── Consultar API ───────────────────────────────────────────────────
      const { downloadLink, title, artist, album, cover } = await fetchFromApi(spotifyUrl);

      console.log(`[SPOTIFY] Descargando: ${artist} - ${title}`);

      // ── Portada con info ────────────────────────────────────────────────
      if (cover) {
        await sock.sendMessage(jid, {
          image: { url: cover },
          caption:
            `🎵 *${title}*\n` +
            `👤 ${artist}\n` +
            `💿 ${album}\n` +
            `⬇️ Descargando...`,
        }, { quoted: msg });
      }

      // ── Descargar MP3 ───────────────────────────────────────────────────
      const response = await axios.get(downloadLink, {
        responseType: "stream",
        timeout: 120000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      await pipeline(response.data, fs.createWriteStream(output));

      const stats = await fs.stat(output);
      if (!stats.size || stats.size < 10_000)
        throw new Error("Audio corrupto o muy pequeño.");

      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

      // ── Enviar audio ────────────────────────────────────────────────────
      await sock.sendMessage(jid, {
        audio: { url: output },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: msg });

      await react("✅");
      await reply(sock, jid, `✅ *${title}* — ${artist}\n📦 ${sizeMB}MB`, msg);

    } catch (e) {
      console.error("[SPOTIFY ERROR]", e.response?.data || e.message);

      const status = e.response?.status;
      let msgErr = `❌ ${e.message}`;

      if (status === 429)
        msgErr = "⏳ Límite de la API alcanzado, intenta en unos minutos.";
      else if (status === 403)
        msgErr = "❌ API key inválida o sin suscripción activa.";
      else if (status >= 500)
        msgErr = "⏳ El servidor de descarga falló, intenta de nuevo.";

      await react("❌");
      await reply(sock, jid, msgErr, msg);

    } finally {
      if (await fs.pathExists(output)) await fs.unlink(output).catch(() => {});
    }
  },
};