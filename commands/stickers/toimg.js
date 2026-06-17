import { downloadMediaMessage } from "fsociety-Baileys";
import { stickerAPng } from "./stickerUtils.js";

export default {
  name: "toimg",
  aliases: ["img"],

  run: async (sock, msg, args, jid) => {
    const { reply } = await import("../../utils.js");

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.stickerMessage) {
        return reply(sock, jid, "❌ Responde a un sticker con *.toimg*", msg);
      }

      await reply(sock, jid, "⏳ Convirtiendo sticker...", msg);

      const mediaMsg = { message: quoted, key: msg.key };
      const buffer = await downloadMediaMessage(mediaMsg, "buffer", {});

      const pngBuffer = await stickerAPng(buffer);

      await sock.sendMessage(jid, {
        image: pngBuffer,
        caption: "✨ Sticker convertido correctamente"
      }, { quoted: msg });

    } catch (e) {
      console.error("❌ ERROR TOIMG:", e);
      await reply(sock, jid, `❌ Error al convertir el sticker: ${e.message}`, msg);
    }
  }
};
