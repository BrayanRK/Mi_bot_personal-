import { downloadMediaMessage } from "fsociety-Baileys";
import { crearStickerImagen, crearStickerVideo } from "./stickerUtils.js";

const PACK   = "𝒱𝒶𝓁ℯ𝓃𝓉𝒾𝓃𝒶 ℬℴ𝓉❤️";
const AUTHOR = "Draven 🏴‍☠️";

export default {
  name: "s",
  aliases: ["sticker", "stiker"],

  run: async (sock, msg, args, jid) => {
    const { reply } = await import("../../utils.js");

    // Capturamos el mensaje citado (quoted) o el mensaje directo
    const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const isImage  = quoted?.imageMessage || msg.message?.imageMessage;
    const isVideo  = quoted?.videoMessage || msg.message?.videoMessage;

    if (!isImage && !isVideo) {
      return reply(sock, jid, "❌ Responde a una imagen o video corto con *.s* para crear un sticker.", msg);
    }

    try {
      await reply(sock, jid, "⏳ Creando sticker...", msg);

      // Determinamos cuál mensaje contiene el archivo multimedia
      const mediaMsg = (msg.message?.imageMessage || msg.message?.videoMessage)
        ? msg
        : { message: quoted, key: msg.key };

      const buffer = await downloadMediaMessage(
        mediaMsg, "buffer", {},
        { reuploadRequest: sock.updateMediaMessage }
      );

      // Auto-detección: imagen → sticker estático, video → sticker animado
      const stickerBuffer = isVideo
        ? await crearStickerVideo(buffer, { pack: PACK, author: AUTHOR, categories: ["🤩", "🎉"] })
        : await crearStickerImagen(buffer, { pack: PACK, author: AUTHOR, categories: ["🤩", "🎉"] });

      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });

    } catch (e) {
      console.error("Error en Sticker:", e);
      await reply(sock, jid, `❌ Error al procesar el sticker: ${e.message}`, msg);
    }
  }
};
