import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "robots",
  aliases: ["robotstxt"],
  run: async (sock, msg, args, jid) => {
    const react = async (e) => {
      try { await sock.sendMessage(msg.key.remoteJid, { react: { text: e, key: msg.key } }); } catch {}
    };

    let url = args[0]?.trim();
    if (!url) {
      
      return reply(sock, jid, "❌ Uso: `.robots https://ejemplo.com`", msg);
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    const base = new URL(url).origin;
    

    try {
      const { data } = await axios.get(`${base}/robots.txt`, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
        responseType: "text",
      });

      if (!data?.trim()) throw new Error("robots.txt vacío.");

      // Extraer paths interesantes
      const lines = data.split("\n").map(l => l.trim()).filter(Boolean);
      const disallowed = lines.filter(l => l.toLowerCase().startsWith("disallow")).slice(0, 30);
      const allowed    = lines.filter(l => l.toLowerCase().startsWith("allow")).slice(0, 10);
      const sitemaps   = lines.filter(l => l.toLowerCase().startsWith("sitemap"));

      let texto = `🤖 *robots.txt de* ${base}\n\n`;
      if (sitemaps.length) texto += `🗺️ *Sitemaps:*\n${sitemaps.join("\n")}\n\n`;
      if (disallowed.length) texto += `🚫 *Disallow (${disallowed.length}):*\n${disallowed.join("\n")}\n\n`;
      if (allowed.length)    texto += `✅ *Allow:*\n${allowed.join("\n")}\n\n`;

      texto += `📄 *Raw (primeras 20 líneas):*\n\`\`\`${lines.slice(0, 20).join("\n")}\`\`\``;

      
      await reply(sock, jid, texto, msg);

    } catch (e) {
      
      const msg404 = e.response?.status === 404
        ? "Este sitio no tiene robots.txt."
        : `❌ ${e.message}`;
      await reply(sock, jid, `❌ ${msg404}`, msg);
    }
  },
};
