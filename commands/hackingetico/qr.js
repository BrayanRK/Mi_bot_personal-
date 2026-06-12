import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "qr",
  aliases: ["qrcode", "generarqr"],
  run: async (sock, msg, args, jid) => {
    const texto = args.join(" ").trim();
    if (!texto) {
      return reply(sock, jid,
        "❌ *Uso:* `.qr <texto o URL>`\n" +
        "Ej: `.qr https://google.com`\n" +
        "Ej: `.qr Hola mundo`",
        msg
      );
    }

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(texto)}&color=000000&bgcolor=ffffff&margin=20`;

      await sock.sendMessage(jid, {
        image: { url: qrUrl },
        caption: `📱 *QR generado*\n📝 Contenido: ${texto.slice(0, 100)}${texto.length > 100 ? "..." : ""}`,
      }, { quoted: msg });

      } catch (e) {
      await reply(sock, jid, `❌ No se pudo generar el QR: ${e.message}`, msg);
    }
  },
};

