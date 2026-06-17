import { downloadMediaMessage } from "fsociety-Baileys";
import { crearStickerImagen, crearStickerVideo } from "./stickerUtils.js";

const PACK   = "𝒱𝒶𝓁ℯ𝓃𝓉𝒾𝓃𝒶 ℬℴ𝓉❤️";
const AUTHOR = "Draven 🏴‍☠️";

export default {
  name: "s",
  aliases: ["sticker", "stiker"],

  run: async (sock, msg, args, jid) => {
    const { reply } = await import("../../utils.js");

    const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImage  = quoted?.imageMessage || msg.message?.imageMessage;
    const isVideo  = quoted?.videoMessage || msg.message?.videoMessage;

    if (!isImage && !isVideo) {
      return reply(sock, jid, "❌ Responde a una imagen o video corto con *.s* para crear un sticker.", msg);
    }

    try {
      console.log("[STICKER DEBUG] 1. Iniciando...");
      await reply(sock, jid, "⏳ Creando sticker...", msg);

      const mediaMsg = (msg.message?.imageMessage || msg.message?.videoMessage)
        ? msg
        : { message: quoted, key: msg.key };

      console.log("[STICKER DEBUG] 2. Descargando media...");
      const buffer = await downloadMediaMessage(
        mediaMsg, "buffer", {},
        { reuploadRequest: sock.updateMediaMessage }
      );
      console.log("[STICKER DEBUG] 3. Media descargada, tamaño:", buffer.length);

      console.log("[STICKER DEBUG] 4. Creando sticker, isVideo:", !!isVideo);
      const stickerBuffer = isVideo
        ? await crearStickerVideo(buffer, { pack: PACK, author: AUTHOR, categories: ["🤩", "🎉"] })
        : await crearStickerImagen(buffer, { pack: PACK, author: AUTHOR, categories: ["🤩", "🎉"] });

      console.log("[STICKER DEBUG] 5. Sticker creado, tamaño:", stickerBuffer.length);

      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
      console.log("[STICKER DEBUG] 6. Sticker enviado!");

    } catch (e) {
      console.error("[STICKER DEBUG] ERROR:", e);
      await reply(sock, jid, `❌ Error al procesar el sticker: ${e.message}`, msg);
    }
  }
};
