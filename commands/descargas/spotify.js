import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { TEMP_DIR } from "../../config.js";
import { reply } from "../../utils.js";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "spotify-downloader9.p.rapidapi.com";
const RAPIDAPI_URL  = "https://spotify-downloader9.p.rapidapi.com/downloadSong";
const SEARCH_URL    = `${process.env.DV_API_URL}/search/spotify`;

const SPOTIFY_REGEX = /https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i;

function isSpotifyUrl(text) {
  return SPOTIFY_REGEX.test(text);
}

// ── Buscar canción en delirius ─────────────────────────────────────────────
async function searchTrack(query) {
  const { data } = await axios.get(SEARCH_URL, {
    params: { q: query, limit: 5 },
    timeout: 15000,
  });

  if (!data?.status || !data?.data?.length)
    throw new Error("No encontré resultados para esa búsqueda.");

  // Devolver el primer resultado (más relevante)
  return data.data[0];
}

// ── Descargar por URL de Spotify (RapidAPI) ────────────────────────────────
async function downloadTrack(spotifyUrl, retries = 2, delay = 5000) {
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

      // Si está en background (timeout: true), reintentar
      if (data?.timeout) {
        lastError = new Error("La canción se está procesando, intenta en 1 minuto.");
      } else {
        lastError = new Error(data?.message || "No se pudo obtener el link de descarga.");
        break;
      }

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
  aliases: ["spty", "spoti", "cancion", "song"],
  run: async (sock, msg, args, jid) => {
    const react = async (emoji) => {
      try {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: emoji, key: msg.key },
        });
      } catch {}
    };

    const input = args.join(" ").trim();

    if (!input) {
      await react("❌");
      return reply(
        sock, jid,
        "❌ *Uso:*\n" +
        "• Por nombre: `.spotify milo j no hago trap`\n" +
        "• Por link: `.spotify https://open.spotify.com/track/ABC123`",
        msg
      );
    }

    await react("⏳");
    await fs.ensureDir(TEMP_DIR);
    const output = path.join(TEMP_DIR, `spotify_${Date.now()}.mp3`);

    try {
      let spotifyUrl = null;
      let trackInfo  = null;

      // ── Modo 1: link directo ──────────────────────────────────────────
      if (isSpotifyUrl(input)) {
        await reply(sock, jid, "🎵 *Descargando Spotify...*", msg);
        spotifyUrl = input.match(SPOTIFY_REGEX)[0];

      // ── Modo 2: búsqueda por nombre ───────────────────────────────────
      } else {
        await reply(sock, jid, `🔍 *Buscando:* ${input}...`, msg);
        trackInfo = await searchTrack(input);
        spotifyUrl = trackInfo.url;

        console.log(`[SPOTIFY] Encontrado: ${trackInfo.artist} - ${trackInfo.title} → ${spotifyUrl}`);
      }

      // ── Descargar ─────────────────────────────────────────────────────
      const { downloadLink, title, artist, album, cover } = await downloadTrack(spotifyUrl);

      // ── Portada con info ──────────────────────────────────────────────
      const coverUrl = cover || trackInfo?.image || null;
      if (coverUrl) {
        await sock.sendMessage(jid, {
          image: { url: coverUrl },
          caption:
            `🎵 *${title}*\n` +
            `👤 ${artist}\n` +
            `💿 ${album}\n` +
            `⬇️ Descargando...`,
        }, { quoted: msg });
      }

      // ── Descargar MP3 ─────────────────────────────────────────────────
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

      // ── Enviar audio ──────────────────────────────────────────────────
      await sock.sendMessage(jid, {
        audio: { url: output },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: msg });

      await react("✅");
      await reply(sock, jid, `✅ *${title}*\n👤 ${artist}\n📦 ${sizeMB}MB`, msg);

    } catch (e) {
      console.error("[SPOTIFY ERROR]", e.response?.data || e.message);

      const status = e.response?.status;
      let msgErr = `❌ ${e.message}`;

      if (status === 429)
        msgErr = "⏳ Límite de la API alcanzado, intenta en unos minutos.";
      else if (status === 403)
        msgErr = "❌ API key inválida o sin suscripción activa.";
      else if (e.message.includes("procesando"))
        msgErr = "⏳ La canción se está procesando, espera 1 minuto e intenta de nuevo.";

      await react("❌");
      await reply(sock, jid, msgErr, msg);

    } finally {
      if (await fs.pathExists(output)) await fs.unlink(output).catch(() => {});
    }
  },
};