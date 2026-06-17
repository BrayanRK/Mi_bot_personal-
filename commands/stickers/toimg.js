import { downloadMediaMessage } from "fsociety-Baileys";
import { stickerAPng } from "./stickerUtils.js";

console.log("✅ TOIMG CARGADO");

export default {
  name: "toimg",
  aliases: ["img"],

  run: async (sock, msg, args, jid) => {
    console.log("🔥 TOIMG EJECUTANDO");

    const { reply } = await import("../../utils.js");

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.stickerMessage) {
        return reply(sock, jid, "❌ Responde a un sticker con *.toimg*", msg);
      }

      await reply(sock, jid, "⏳ Convirtiendo sticker...", msg);

      const mediaMsg = { message: quoted, key: msg.key };
      const buffer = await downloadMediaMessage(mediaMsg, "buffer", {});

      console.log("📥 Sticker descargado");

      const pngBuffer = await stickerAPng(buffer);

      console.log("✅ PNG creado");

      await sock.sendMessage(jid, {
        image: pngBuffer,
        caption: "✨ Sticker convertido correctamente"
      }, { quoted: msg });

      console.log("✅ Imagen enviada");

    } catch (e) {
      console.error("❌ ERROR TOIMG:", e);
      await reply(sock, jid, `❌ Error al convertir el sticker: ${e.message}`, msg);
    }
  }
};
