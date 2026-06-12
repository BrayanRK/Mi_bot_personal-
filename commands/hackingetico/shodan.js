import axios from "axios";
import { reply } from "../../utils.js";

const SHODAN_KEY = process.env.SHODAN_API_KEY;

export default {
  name: "shodan",
  aliases: ["shodanip", "shodanscan"],
  run: async (sock, msg, args, jid) => {
    const input = args[0]?.trim();
    if (!input) {
      return reply(sock, jid,
        "❌ *Uso:*\n" +
        "• IP: `.shodan 8.8.8.8`\n" +
        "• Dominio: `.shodan ejemplo.com`",
        msg
      );
    }

    await reply(sock, jid, `🔍 *Consultando Shodan...*`, msg);

    try {
      let ip = input;

      // Si es dominio, resolver IP
      if (/^[a-zA-Z]/.test(input)) {
        const dns = await axios.get(`https://dns.google/resolve?name=${input}&type=A`, { timeout: 8000 });
        ip = dns.data?.Answer?.[0]?.data;
        if (!ip) throw new Error(`No se pudo resolver la IP de ${input}`);
      }

      const { data } = await axios.get(
        `https://api.shodan.io/shodan/host/${ip}?key=${SHODAN_KEY}`,
        { timeout: 15000 }
      );

      const puertos = data.ports?.join(", ") || "N/A";
      const vulns   = data.vulns ? Object.keys(data.vulns) : [];
      const tags    = data.tags?.join(", ") || "ninguno";

      const flag = data.country_code
        ? String.fromCodePoint(...[...data.country_code.toUpperCase()].map(c => 0x1F1E0 + c.charCodeAt(0) - 65))
        : "🌍";

      let texto =
        `🔭 *Shodan — ${ip}*\n` +
        (input !== ip ? `🔗 Dominio: ${input}\n` : "") +
        `\n${flag} *País:* ${data.country_name || "N/A"}` +
        `\n🏙️ *Ciudad:* ${data.city || "N/A"}` +
        `\n🏢 *Org:* ${data.org || "N/A"}` +
        `\n🌐 *ISP:* ${data.isp || "N/A"}` +
        `\n🖥️ *OS:* ${data.os || "Desconocido"}` +
        `\n🔓 *Puertos abiertos:* ${puertos}` +
        `\n🏷️ *Tags:* ${tags}` +
        `\n📅 *Última actualización:* ${data.last_update?.slice(0, 10) || "N/A"}`;

      if (vulns.length) {
        texto += `\n\n⚠️ *Vulnerabilidades (${vulns.length}):*\n${vulns.slice(0, 10).map(v => `• ${v}`).join("\n")}`;
        if (vulns.length > 10) texto += `\n... y ${vulns.length - 10} más`;
      } else {
        texto += `\n\n✅ *Sin vulnerabilidades conocidas*`;
      }

      // Servicios/banners
      if (data.data?.length) {
        const servicios = data.data.slice(0, 5).map(s =>
          `• Puerto ${s.port} (${s.transport || "tcp"}): ${s.product || s._shodan?.module || "?"}`
        );
        texto += `\n\n🔌 *Servicios detectados:*\n${servicios.join("\n")}`;
      }

      await react(vulns.length > 0 ? "🔴" : "✅");
      await reply(sock, jid, texto, msg);

    } catch (e) {
      console.error("[SHODAN ERROR]", e.response?.data || e.message);
      const status = e.response?.status;
      const msgErr = status === 401 ? "❌ API key de Shodan inválida."
        : status === 404 ? "❌ IP no encontrada en Shodan."
        : status === 429 ? "⏳ Límite de requests alcanzado."
        : `❌ ${e.message}`;
      await reply(sock, jid, msgErr, msg);
    }
  },
};

