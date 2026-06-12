import fs from "fs-extra";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { TEMP_DIR } from "../../config.js";
import { reply } from "../../utils.js";

const DELIRIUS     = "https://api.delirius.store";
const DELIRIUS_KEY = process.env.DV_API_KEY;

const SPOTIFY_REGEX = /https?:\/\/(?:open\.)?spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i;

function isSpotifyUrl(text) {
  return SPOTIFY_REGEX.test(text);
}

async function searchTrack(query) {
  const { data } = await axios.get(`${DELIRIUS}/search/spotify`, {
    params: { q: query, limit: 5, apikey: DELIRIUS_KEY },
    timeout: 15000,
  });
  if (!data?.status || !data?.data?.length)
    throw new Error("No se encontraron resultados.");
  return data.data[0];
}

async function downloadTrack(spotifyUrl, retries = 2, delay = 4000) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await axios.get(`${DELIRIUS}/download/spotifydl`, {
        params: { url: spotifyUrl, apikey: DELIRIUS_KEY },
        timeout: 30000,
      });

      if (data?.status && data?.data?.download) {
        return {
          downloadLink: data.data.download,
          title:  data.data.title  || "Canción",
          artist: data.data.author || data.data.artist || "",
          cover:  data.data.image  || null,
        };
      }

      lastError = new Error(data?.message || "No se pudo obtener el link de descarga.");
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

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
      return reply(sock, jid,
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

      if (isSpotifyUrl(input)) {
        await reply(sock, jid, "🎵 *Descargando Spotify...*", msg);
        spotifyUrl = input.match(SPOTIFY_REGEX)[0];
      } else {
        await reply(sock, jid, `🔍 *Buscando:* ${input}...`, msg);
        trackInfo = await searchTrack(input);
        spotifyUrl = trackInfo.url;
        console.log(`[SPOTIFY] Encontrado: ${trackInfo.artist} - ${trackInfo.title}`);
      }

      const { downloadLink, title, artist, cover } = await downloadTrack(spotifyUrl);

      const coverUrl = cover || trackInfo?.image || null;
      if (coverUrl) {
        await sock.sendMessage(jid, {
          image: { url: coverUrl },
          caption: `🎵 *${title}*\n👤 ${artist}\n⬇️ Descargando...`,
        }, { quoted: msg });
        await sleep(1000);
      }

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

      await sleep(1000);
      await sock.sendMessage(jid, {
        audio: { url: output },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: msg });

      await sleep(1500);
      await react("✅");

    } catch (e) {
      console.error("[SPOTIFY ERROR]", e.response?.data || e.message);
      const status = e.response?.status;
      let msgErr = `❌ ${e.message}`;
      if (status === 429) msgErr = "⏳ Límite de la API alcanzado.";
      else if (status === 401 || status === 403) msgErr = "❌ API key inválida.";
      await react("❌");
      try { await reply(sock, jid, msgErr, msg); } catch {}

    } finally {
      if (await fs.pathExists(output)) await fs.unlink(output).catch(() => {});
    }
  },
};