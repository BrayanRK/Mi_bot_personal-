import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "subdominios",
  aliases: ["subdomains", "subd"],
  run: async (sock, msg, args, jid) => {
    const domain = args[0]?.trim().replace(/https?:\/\//i, "").replace(/\/.*/,"");
    if (!domain) {
      
      return reply(sock, jid, "❌ Uso: `.subdominios ejemplo.com`", msg);
    }

    
    await reply(sock, jid, `🔍 *Buscando subdominios de* ${domain}...`, msg);

    try {
      const { data } = await axios.get(
        `https://crt.sh/?q=%25.${domain}&output=json`,
        { timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } }
      );

      if (!data?.length) throw new Error("No se encontraron subdominios.");

      // Deduplicar y limpiar
      const subs = [...new Set(
        data.map(e => e.name_value)
          .join("\n").split("\n")
          .map(s => s.trim().toLowerCase())
          .filter(s => s.endsWith(domain) && !s.includes("*"))
          .sort()
      )];

      if (!subs.length) throw new Error("No se encontraron subdominios válidos.");

      const total = subs.length;
      const lista = subs.slice(0, 50).map((s, i) => `${i + 1}. ${s}`).join("\n");
      const extra = total > 50 ? `\n... y ${total - 50} más` : "";

      
      await reply(sock, jid,
        `🌐 *Subdominios de* ${domain}\n` +
        `📊 Total encontrados: *${total}*\n\n` +
        `\`\`\`${lista}${extra}\`\`\``,
        msg
      );

    } catch (e) {
      
      await reply(sock, jid, `❌ ${e.message}`, msg);
    }
  },
};

