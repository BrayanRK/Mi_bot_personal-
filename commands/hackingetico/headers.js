import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "headers",
  aliases: ["httpheaders", "head"],
  run: async (sock, msg, args, jid) => {
    const react = async (e) => {
      try { await sock.sendMessage(msg.key.remoteJid, { react: { text: e, key: msg.key } }); } catch {}
    };

    let url = args[0]?.trim();
    if (!url) {
      
      return reply(sock, jid, "❌ Uso: `.headers https://ejemplo.com`", msg);
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    

    try {
      const { headers, status } = await axios.head(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" },
        validateStatus: () => true,
        maxRedirects: 5,
      });

      const interesting = [
        "server", "x-powered-by", "content-type", "x-frame-options",
        "strict-transport-security", "content-security-policy",
        "x-content-type-options", "x-xss-protection",
        "access-control-allow-origin", "cache-control", "set-cookie"
      ];

      let texto = `🌐 *Headers de* ${url}\n📡 Status: *${status}*\n\n`;

      // Primero los interesantes
      const found = [];
      for (const key of interesting) {
        if (headers[key]) found.push(`🔹 *${key}*\n${headers[key]}`);
      }

      // Luego el resto
      const resto = Object.entries(headers)
        .filter(([k]) => !interesting.includes(k))
        .map(([k, v]) => `▫️ *${k}*: ${v}`);

      texto += found.join("\n\n");
      if (resto.length) texto += "\n\n*Otros:*\n" + resto.join("\n");

      
      await reply(sock, jid, texto, msg);

    } catch (e) {
      
      await reply(sock, jid, `❌ No se pudo conectar: ${e.message}`, msg);
    }
  },
};
