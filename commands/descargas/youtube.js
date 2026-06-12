import fs from "fs";
import path from "path";
import axios from "axios";
import yts from "yt-search";
import { pipeline } from "stream/promises";
import { spawn } from "child_process";
import { reply } from "../../utils.js";
import { TEMP_DIR } from "../../config.js";

const DV_API_URL = process.env.DV_API_URL;
const DV_API_KEY = process.env.DV_API_KEY;
const RYZE_API   = "https://ryzecodes.xyz/api/scrapers/36/run";
const RYZE_KEY   = "ryzk0cdn";

const VIDEO_QUALITY             = "720p";
const REQUEST_TIMEOUT           = 120000;
const MAX_VIDEO_BYTES           = 1500 * 1024 * 1024;
const VIDEO_AS_DOCUMENT_THRESHOLD = 70 * 1024 * 1024;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeFileName(name) {
  return String(name || "video").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "video";
}

function normalizeMp4Name(name) {
  const clean = safeFileName(String(name || "video").replace(/\.mp4$/i, ""));
  return `${clean || "video"}.mp4`;
}

function deleteFileSafe(fp) {
  try { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
}

function extractYouTubeUrl(text) {
  const m = String(text || "").match(/https?:\/\/(?:www\.)?(?:youtube\.com|music\.youtube\.com|youtu\.be)\/[^\s]+/i);
  return m ? m[0].trim() : "";
}

function getVideoId(text) {
  const m = String(text || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

function isHttpUrl(v) { return /^https?:\/\//i.test(String(v || "")); }

async function readStreamToText(stream) {
  return new Promise((res, rej) => {
    let d = "";
    stream.on("data", (c) => (d += c.toString()));
    stream.on("end", () => res(d));
    stream.on("error", rej);
  });
}

async function normalizeForWhatsApp(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-i", inputPath,
      "-vf", "scale=640:trunc(ow/a/2)*2",
      "-c:v", "libx264", "-b:v", "800k", "-preset", "fast",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", "-loglevel", "error", outputPath,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    ff.on("error", reject);
    ff.on("close", (code) => code === 0 ? resolve(true) : reject(new Error("ffmpeg error")));
  });
}

// ─── Búsqueda de info ─────────────────────────────────────────────────────────
async function searchYouTubeInfo(query, videoId) {
  try {
    if (videoId) {
      const info = await yts({ videoId });
      if (info?.videoId) return { url: `https://youtu.be/${info.videoId}`, title: info.title, thumbnail: info.thumbnail || info.image, author: info.author?.name, duration: info.timestamp };
    }
    const search = await yts(query);
    const v = search.videos?.[0];
    if (v) return { url: v.url || `https://youtu.be/${v.videoId}`, title: v.title, thumbnail: v.thumbnail || v.image, author: v.author?.name, duration: v.timestamp };
  } catch {}

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
          title: v.title?.runs?.[0]?.text || "video",
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
async function getVideoDV(videoUrl) {
  if (!DV_API_URL) throw new Error("DV_API_URL no configurada");
  const res = await axios.get(`${DV_API_URL}/ytmp4`, {
    params: { url: videoUrl, quality: VIDEO_QUALITY, apikey: DV_API_KEY },
    timeout: 60000, validateStatus: () => true,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json", "x-api-key": DV_API_KEY },
  });
  const d = res.data;
  if (res.status >= 400 || d?.ok === false) throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
  const dlUrl = d?.download_url_full || d?.stream_url_full || d?.download_url || d?.stream_url || d?.url || "";
  if (!dlUrl) throw new Error("DV API no devolvió link");
  return dlUrl.startsWith("/") ? `${DV_API_URL}${dlUrl}` : dlUrl;
}

// ─── API 2: Ryze ──────────────────────────────────────────────────────────────
async function getVideoRyze(videoUrl) {
  const res = await axios.post(RYZE_API, {
    input: { url: videoUrl, format: "480p", attempts: 6, interval_ms: 1100 }
  }, {
    headers: { "Content-Type": "application/json", "X-API-Key": RYZE_KEY },
    timeout: 120000,
  });
  const result = res.data?.result;
  if (!res.data?.success || !result?.success) throw new Error(res.data?.error || result?.error || "Ryze sin resultado");
  const videoUrl2 = result.file_url || result.download_urls?.[0] || null;
  if (!videoUrl2) throw new Error("Ryze no devolvió link");
  return videoUrl2;
}

// ─── Descarga con fallback ────────────────────────────────────────────────────
async function downloadVideoWithFallback(videoUrl, outputPath) {
  const apis = [
    { name: "DV API", fn: () => getVideoDV(videoUrl)   },
    { name: "Ryze",   fn: () => getVideoRyze(videoUrl) },
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`[VIDEO] Intentando con ${api.name}...`);
      const dlUrl = await api.fn();

      const response = await axios.get(dlUrl, {
        responseType: "stream", timeout: REQUEST_TIMEOUT,
        headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*", ...(DV_API_KEY ? { "x-api-key": DV_API_KEY } : {}) },
        validateStatus: () => true, maxRedirects: 10,
      });

      if (response.status >= 400) {
        const errText = await readStreamToText(response.data).catch(() => "");
        throw new Error(errText || `HTTP ${response.status}`);
      }

      let downloaded = 0;
      response.data.on("data", (chunk) => {
        downloaded += chunk.length;
        if (downloaded > MAX_VIDEO_BYTES) response.data.destroy(new Error("Video demasiado grande"));
      });

      await pipeline(response.data, fs.createWriteStream(outputPath));

      if (!fs.existsSync(outputPath)) throw new Error("No se guardó el archivo");
      const size = fs.statSync(outputPath).size;
      if (!size || size < 150000) { deleteFileSafe(outputPath); throw new Error("Video inválido"); }
      if (size > MAX_VIDEO_BYTES)  { deleteFileSafe(outputPath); throw new Error("Video demasiado grande"); }

      console.log(`[VIDEO] ✅ Descargado con ${api.name}`);
      return { size, api: api.name };

    } catch (e) {
      console.error(`[VIDEO] ❌ ${api.name} falló:`, e.message);
      deleteFileSafe(outputPath);
      lastError = e;
    }
  }

  throw new Error(`Todas las APIs fallaron. Último error: ${lastError?.message}`);
}

// ─── Comando ──────────────────────────────────────────────────────────────────
export default {
  name: "ytmp4",
  aliases: ["video", "yt", "ytmp4b", "videob", "ytb", "ytmp4c", "videoc", "ytc"],

  run: async (sock, msg, args, jid) => {
    const input = args.join(" ").trim();
    if (!input) return reply(sock, jid, "❌ *Uso:* .video <título o link de YouTube>", msg);

    const videoId = getVideoId(input);
    const query   = videoId ? `https://youtu.be/${videoId}` : input;

    const rawFile   = path.join(TEMP_DIR, `video_raw_${Date.now()}.mp4`);
    const finalFile = path.join(TEMP_DIR, `video_final_${Date.now()}.mp4`);

    try {
      // 1. Buscar info
      let videoUrl  = extractYouTubeUrl(input) || (isHttpUrl(input) ? input : "");
      let title     = "video";
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
      const caption = `🎬 *${title}*\n👤 ${author}\n⏱️ ${duration}\n🎚️ Calidad: ${VIDEO_QUALITY}\n\n⏳ Descargando...`;
      if (thumbnail) {
        await sock.sendMessage(jid, { image: { url: thumbnail }, caption }, { quoted: msg });
      } else {
        await reply(sock, jid, caption, msg);
      }

      // 3. Descargar con fallback
      const { size } = await downloadVideoWithFallback(videoUrl, rawFile);
      const finalName = normalizeMp4Name(safeFileName(title));

      // 4. Enviar como documento si es muy grande
      if (size > VIDEO_AS_DOCUMENT_THRESHOLD) {
        await sock.sendMessage(jid, {
          document: { url: rawFile },
          mimetype: "video/mp4",
          fileName: finalName,
          caption: `🎬 ${title}\n🎚️ ${VIDEO_QUALITY}\n📦 Archivo grande — enviado como documento`,
        }, { quoted: msg });
        return;
      }

      // 5. Intentar enviar como video
      try {
        await sock.sendMessage(jid, {
          video: { url: rawFile },
          mimetype: "video/mp4",
          fileName: finalName,
          caption: `🎬 ${title}\n🎚️ ${VIDEO_QUALITY}`,
        }, { quoted: msg });
      } catch {
        // Fallback: normalizar con ffmpeg
        try {
          await normalizeForWhatsApp(rawFile, finalFile);
          const filePath = fs.existsSync(finalFile) ? finalFile : rawFile;
          const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : size;

          if (fileSize > VIDEO_AS_DOCUMENT_THRESHOLD) {
            await sock.sendMessage(jid, {
              document: { url: filePath }, mimetype: "video/mp4",
              fileName: finalName, caption: `🎬 ${title}\n📦 Documento`,
            }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, {
              video: { url: filePath }, mimetype: "video/mp4",
              fileName: finalName, caption: `🎬 ${title}\n🎚️ ${VIDEO_QUALITY}`,
            }, { quoted: msg });
          }
        } catch {
          await sock.sendMessage(jid, {
            document: { url: rawFile }, mimetype: "video/mp4",
            fileName: finalName, caption: `🎬 ${title}`,
          }, { quoted: msg });
        }
      }

    } catch (e) {
      console.error("[VIDEO ERROR]", e.message);
      const raw = e.message.toLowerCase();
      let msg2 = `❌ ${e.message}`;
      if (raw.includes("502") || raw.includes("503") || raw.includes("bad gateway")) {
        msg2 = "⚠️ Los servidores de descarga están saturados.\n🔁 Intenta más tarde.";
      } else if (raw.includes("404")) {
        msg2 = "❌ No se pudo descargar ese video.\n💡 Intenta con otro link o búsqueda.";
      }
      await reply(sock, jid, msg2, msg);
    } finally {
      deleteFileSafe(rawFile);
      deleteFileSafe(finalFile);
    }
  },
};