import fs from "fs";
import path from "path";
import axios from "axios";
import yts from "yt-search";
import { pipeline } from "stream/promises";
import { spawn } from "child_process";
import { reply } from "../../utils.js";
import { TEMP_DIR } from "../../config.js";

//me gustan los culos
const DV_API_URL    = process.env.DV_API_URL;
const DV_API_KEY    = process.env.DV_API_KEY;
const DELIRIUS_BASE = "https://api.delirius.store/download";
const RYZE_API      = "https://ryzecodes.xyz/api/scrapers/36/run";
const RYZE_KEY      = "ryzk0cdn";

const AUDIO_QUALITY   = "128k";
const REQUEST_TIMEOUT = 120000;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;

function safeFileName(name) {
  return String(name || "audio").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "audio";
}

function deleteFileSafe(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
}

function extractYouTubeUrl(text) {
  const m = String(text || "").match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i);
  return m ? m[0].trim() : "";
}

function cleanYouTubeUrl(url) {
  return url.replace(/([?&])si=[^&]*/i, (m, sep) => sep === "?" ? "?" : "").replace(/\?&/, "?").replace(/[?&]$/, "");
}

function getVideoId(text) {
  const m = String(text || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function isHttpUrl(v) { return /^https?:\/\//i.test(String(v || "")); }

function detectAudioType(fp) {
  try {
    const fd = fs.openSync(fp, "r");
    const buf = Buffer.alloc(16);
    const n = fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const s = buf.subarray(0, n);
    if (s.length >= 8 && s.subarray(4, 8).toString("ascii") === "ftyp") return { ext: "m4a", mime: "audio/mp4", isMp3: false };
    if (s.length >= 3 && s.subarray(0, 3).toString("ascii") === "ID3") return { ext: "mp3", mime: "audio/mpeg", isMp3: true };
    if (s.length >= 2 && s[0] === 0xff && (s[1] & 0xe0) === 0xe0) return { ext: "mp3", mime: "audio/mpeg", isMp3: true };
    if (s.length >= 4 && s[0] === 0x1a && s[1] === 0x45) return { ext: "webm", mime: "audio/webm", isMp3: false };
  } catch {}
  return null;
}

async function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-i", inputPath, "-vn", "-c:a", "libmp3lame",
      "-b:a", AUDIO_QUALITY, "-ar", "44100", "-ac", "2",
      "-map_metadata", "-1", "-loglevel", "error", outputPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let errText = "";
    ff.stderr.on("data", (c) => (errText += c.toString()));
    ff.on("error", (e) => reject(e?.code === "ENOENT" ? new Error("ffmpeg no instalado.") : e));
    ff.on("close", (code) => code === 0 ? resolve() : reject(new Error(errText.trim() || `ffmpeg error ${code}`)));
  });
}

// ─── Búsqueda de info del video ───────────────────────────────────────────────
async function searchYouTubeInfo(query, videoId) {
  // Intentar con yts primero
  try {
    if (videoId) {
      const info = await yts({ videoId });
      if (info?.videoId) return { url: `https://youtu.be/${info.videoId}`, title: info.title, thumbnail: info.thumbnail || info.image, author: info.author?.name, duration: info.timestamp };
    }
    const search = await yts(query);
    const v = search.videos?.[0];
    if (v) return { url: v.url || `https://youtu.be/${v.videoId}`, title: v.title, thumbnail: v.thumbnail || v.image, author: v.author?.name, duration: v.timestamp };
  } catch {}

  // Fallback: scraping directo de YouTube
  try {
    const { data: html } = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", "Accept-Language": "es-ES,es;q=0.9" },
    });
    const match = html.match(/var ytInitialData = ({.+?});<\/script>/s);
    if (match) {
      const ytData = JSON.parse(match[1]);
      const contents = ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
      for (const item of contents) {
        const v = item?.videoRenderer;
        if (!v?.videoId) continue;
        return {
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          title: v.title?.runs?.[0]?.text || "audio",
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/sddefault.jpg`,
          author: v.ownerText?.runs?.[0]?.text || "Desconocido",
          duration: v.lengthText?.simpleText || "?",
        };
      }
    }
  } catch {}

  return null;
}

// ─── API 1: DV API ────────────────────────────────────────────────────────────
async function getAudioDV(videoUrl) {
  if (!DV_API_URL) throw new Error("DV_API_URL no configurada");
  const res = await axios.get(`${DV_API_URL}/ytmp3`, {
    params: { url: videoUrl, quality: AUDIO_QUALITY, apikey: DV_API_KEY },
    timeout: 60000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", "x-api-key": DV_API_KEY },
  });
  const d = res.data;
  if (res.status >= 400 || d?.ok === false) throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
  const dlUrl = d?.download_url_full || d?.stream_url_full || d?.download_url || d?.stream_url || d?.url || "";
  if (!dlUrl) throw new Error("DV API no devolvió link");
  return dlUrl.startsWith("/") ? `${DV_API_URL}${dlUrl}` : dlUrl;
}

// ─── API 2: Delirius ──────────────────────────────────────────────────────────
async function getAudioDelirius(videoUrl) {
  const cleanUrl = cleanYouTubeUrl(videoUrl);
  const res = await axios.get(`${DELIRIUS_BASE}/ytmp3`, {
    params: { url: cleanUrl },
    timeout: 60000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  const d = res.data;
  if (res.status >= 400 || d?.status === false) throw new Error(d?.message || d?.error || `HTTP ${res.status}`);
  const dlUrl = d?.data?.url || d?.data?.download || d?.data?.audio || d?.url || d?.download || d?.audio || "";
  if (!dlUrl) throw new Error("Delirius no devolvió link");
  return dlUrl;
}

// ─── API 3: Ryze ──────────────────────────────────────────────────────────────
async function getAudioRyze(videoUrl) {
  const res = await axios.post(RYZE_API, {
    input: { url: videoUrl, format: "mp3", attempts: 6, interval_ms: 1100 }
  }, {
    headers: { "Content-Type": "application/json", "X-API-Key": RYZE_KEY },
    timeout: 120000,
  });
  const result = res.data?.result;
  if (!res.data?.success || !result?.success) throw new Error(res.data?.error || result?.error || "Ryze sin resultado");
  const audioUrl = result.file_url || result.download_urls?.[0] || null;
  if (!audioUrl) throw new Error("Ryze no devolvió link");
  return audioUrl;
}

// ─── Descarga de audio con fallback entre APIs ────────────────────────────────
async function downloadAudioWithFallback(videoUrl, outputPath) {
  const apis = [
    { name: "Delirius", fn: () => getAudioDelirius(videoUrl) },
    { name: "DV API",   fn: () => getAudioDV(videoUrl)       },
    { name: "Ryze",     fn: () => getAudioRyze(videoUrl)     },
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`[PLAY] Intentando con ${api.name}...`);
      const dlUrl = await api.fn();

      const response = await axios.get(dlUrl, {
        responseType: "stream", timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*" },
        validateStatus: () => true, maxRedirects: 10,
      });

      if (response.status >= 400) throw new Error(`HTTP ${response.status}`);

      let downloaded = 0;
      response.data.on("data", (chunk) => {
        downloaded += chunk.length;
        if (downloaded > MAX_AUDIO_BYTES) response.data.destroy(new Error("Audio demasiado grande"));
      });

      await pipeline(response.data, fs.createWriteStream(outputPath));

      if (!fs.existsSync(outputPath)) throw new Error("No se guardó el archivo");
      const size = fs.statSync(outputPath).size;
      if (!size || size < 10000) { deleteFileSafe(outputPath); throw new Error("Audio inválido"); }

      console.log(`[PLAY] ✅ Descargado con ${api.name}`);
      return { size, api: api.name };

    } catch (e) {
      console.error(`[PLAY] ❌ ${api.name} falló:`, e.message);
      deleteFileSafe(outputPath);
      lastError = e;
    }
  }

  throw new Error(`Todas las APIs fallaron. Último error: ${lastError?.message}`);
}

// ─── Comando ──────────────────────────────────────────────────────────────────
export default {
  name: "ytmp3",
  aliases: ["play", "mp3", "song", "ytmp3b", "playb", "mp3b", "songb", "ytmp3c", "playc", "mp3c", "songc"],

  run: async (sock, msg, args, jid) => {
    const input = args.join(" ").trim();
    if (!input) return reply(sock, jid, "❌ *Uso:* .play <canción o link de YouTube>", msg);

    const videoId  = getVideoId(input);
    const query    = videoId ? `https://youtu.be/${videoId}` : input;
    const isUrl    = isHttpUrl(input);

    const sourceFile = path.join(TEMP_DIR, `play_src_${Date.now()}.bin`);
    const mp3File    = path.join(TEMP_DIR, `play_mp3_${Date.now()}.mp3`);

    try {
      // 1. Buscar info del video
      let videoUrl  = extractYouTubeUrl(input) || (isUrl ? input : "");
      let title     = "audio";
      let thumbnail = null;
      let author    = "Desconocido";
      let duration  = "?";

      const info = await searchYouTubeInfo(query, videoId);
      if (info) {
        videoUrl  = info.url || videoUrl;
        title     = info.title || title;
        thumbnail = info.thumbnail || null;
        author    = info.author || author;
        duration  = info.duration || duration;
      }

      if (!videoUrl) return reply(sock, jid, "❌ No se encontró el video.", msg);

      // 2. Mostrar info mientras descarga
      const caption = `🎵 *${title}*\n👤 ${author}\n⏱️ ${duration}\n\n⏳ Descargando audio...`;
      if (thumbnail) {
        await sock.sendMessage(jid, { image: { url: thumbnail }, caption }, { quoted: msg });
      } else {
        await reply(sock, jid, caption, msg);
      }

      // 3. Descargar con fallback
      const { size } = await downloadAudioWithFallback(videoUrl, sourceFile);

      // 4. Convertir si no es MP3
      let fileToSend = sourceFile;
      const sniffed  = detectAudioType(sourceFile);

      if (sniffed && !sniffed.isMp3) {
        try {
          await convertToMp3(sourceFile, mp3File);
          fileToSend = mp3File;
        } catch (e) {
          console.error("[PLAY CONV ERROR]", e.message);
          // Si falla conversión, enviar como documento
          await sock.sendMessage(jid, {
            document: { url: sourceFile },
            mimetype: sniffed.mime || "audio/mpeg",
            fileName: `${safeFileName(title)}.${sniffed.ext || "mp3"}`,
            caption: `🎵 ${title}`,
          }, { quoted: msg });
          return;
        }
      }

      // 5. Enviar como audio
      try {
        await sock.sendMessage(jid, {
          audio: { url: fileToSend },
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${safeFileName(title)}.mp3`,
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, {
          document: { url: fileToSend },
          mimetype: "audio/mpeg",
          fileName: `${safeFileName(title)}.mp3`,
          caption: `🎵 ${title}`,
        }, { quoted: msg });
      }

    } catch (e) {
      console.error("[PLAY ERROR]", e.message);
      const raw = e.message.toLowerCase();
      let msg2 = `❌ ${e.message}`;
      if (raw.includes("502") || raw.includes("503") || raw.includes("bad gateway")) {
        msg2 = "⚠️ Los servidores de descarga están saturados.\n🔁 Intenta más tarde.";
      } else if (raw.includes("404")) {
        msg2 = "❌ No se pudo descargar ese video.\n💡 Intenta con otro link o búsqueda.";
      }
      await reply(sock, jid, msg2, msg);
    } finally {
      deleteFileSafe(sourceFile);
      deleteFileSafe(mp3File);
    }
  },
};