import Jimp from "jimp";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { TEMP_DIR } from "../../config.js";

const execAsync = promisify(exec);

// ─── EXIF de sticker (pack/author) sin depender de wa-sticker-formatter ──────
// Construye el bloque EXIF WebP que WhatsApp lee para mostrar pack/autor.
function buildExif(pack, author, categories = []) {
  const json = {
    "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
    "sticker-pack-name": pack || "",
    "sticker-pack-publisher": author || "",
    "emojis": categories.length ? categories : ["🤩"],
  };

  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");

  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x16, 0x00, 0x00, 0x00,
  ]);

  exifHeader.writeUIntLE(jsonBuffer.length, 14, 4);

  return Buffer.concat([exifHeader, jsonBuffer]);
}

// Inyecta el chunk EXIF dentro de un buffer WebP existente
function injectExifIntoWebp(webpBuffer, exifBuffer) {
  const EXIF_HEADER = Buffer.from("EXIF");
  const exifChunk = Buffer.concat([
    EXIF_HEADER,
    Buffer.from([
      exifBuffer.length & 0xff,
      (exifBuffer.length >> 8) & 0xff,
      (exifBuffer.length >> 16) & 0xff,
      (exifBuffer.length >> 24) & 0xff,
    ]),
    exifBuffer,
  ]);

  // Padding a múltiplo de 2 (formato RIFF lo exige)
  const padded = exifChunk.length % 2 !== 0
    ? Buffer.concat([exifChunk, Buffer.from([0x00])])
    : exifChunk;

  const fileSize = webpBuffer.readUInt32LE(4);
  const newFileSize = fileSize + padded.length;

  const out = Buffer.concat([
    webpBuffer.slice(0, 4),
    Buffer.from([
      newFileSize & 0xff,
      (newFileSize >> 8) & 0xff,
      (newFileSize >> 16) & 0xff,
      (newFileSize >> 24) & 0xff,
    ]),
    webpBuffer.slice(8),
    padded,
  ]);

  return out;
}

/**
 * Crea un sticker WebP estático a partir de un buffer de imagen.
 * Usa Jimp (puro JS, sin compilación nativa) + ffmpeg para la conversión a webp.
 */
export async function crearStickerImagen(buffer, { pack, author, categories } = {}) {
  await fs.ensureDir(TEMP_DIR);
  const base = Date.now() + "_" + crypto.randomBytes(3).toString("hex");
  const pngPath  = path.join(TEMP_DIR, `stk_${base}.png`);
  const webpPath = path.join(TEMP_DIR, `stk_${base}.webp`);

  try {
    // Redimensionar/normalizar con Jimp (sin estirar, mantiene proporción + padding)
    const image = await Jimp.read(buffer);
    image.contain(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
    await image.writeAsync(pngPath);

    // Convertir a WebP con ffmpeg
    const cmd = `ffmpeg -y -i "${pngPath}" -vcodec libwebp -lossless 0 -qscale 75 -preset picture -an -vsync 0 "${webpPath}"`;
    await execAsync(cmd);

    let webpBuffer = await fs.readFile(webpPath);

    // Inyectar metadatos pack/author
    const exif = buildExif(pack, author, categories);
    webpBuffer = injectExifIntoWebp(webpBuffer, exif);

    return webpBuffer;
  } finally {
    fs.remove(pngPath).catch(() => {});
    fs.remove(webpPath).catch(() => {});
  }
}

/**
 * Crea un sticker WebP animado a partir de un buffer de video.
 */
export async function crearStickerVideo(buffer, { pack, author, categories, maxSeconds = 6 } = {}) {
  await fs.ensureDir(TEMP_DIR);
  const base = Date.now() + "_" + crypto.randomBytes(3).toString("hex");
  const inputPath  = path.join(TEMP_DIR, `anim_${base}.mp4`);
  const outputPath = path.join(TEMP_DIR, `anim_${base}.webp`);

  try {
    await fs.writeFile(inputPath, buffer);

    const cmd = `ffmpeg -y -i "${inputPath}" -ss 0 -t ${maxSeconds} -an -vcodec libwebp -loop 0 -vsync 0 -vf "fps=8,scale=420:420:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -qscale 75 -preset picture "${outputPath}"`;
    await execAsync(cmd);

    let webpBuffer = await fs.readFile(outputPath);

    const exif = buildExif(pack, author, categories);
    webpBuffer = injectExifIntoWebp(webpBuffer, exif);

    return webpBuffer;
  } finally {
    fs.remove(inputPath).catch(() => {});
    fs.remove(outputPath).catch(() => {});
  }
}

/**
 * Convierte un sticker WebP a PNG (para .toimg). Usa ffmpeg.
 */
export async function stickerAPng(stickerBuffer) {
  await fs.ensureDir(TEMP_DIR);
  const base = Date.now() + "_" + crypto.randomBytes(3).toString("hex");
  const webpPath = path.join(TEMP_DIR, `conv_${base}.webp`);
  const pngPath  = path.join(TEMP_DIR, `conv_${base}.png`);

  try {
    await fs.writeFile(webpPath, stickerBuffer);
    await execAsync(`ffmpeg -y -i "${webpPath}" "${pngPath}"`);
    return await fs.readFile(pngPath);
  } finally {
    fs.remove(webpPath).catch(() => {});
    fs.remove(pngPath).catch(() => {});
  }
}
