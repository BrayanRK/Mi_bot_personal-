import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "geoip",
  aliases: ["ipinfo", "iplookup", "ipdatos"],
  run: async (sock, msg, args, jid) => {
    const react = async (e) => {
      try { await sock.sendMessage(msg.key.remoteJid, { react: { text: e, key: msg.key } }); } catch {}
    };

    let target = args[0]?.trim();
    if (!target) {
      
      return reply(sock, jid, "❌ Uso: `.geoip 8.8.8.8` o `.geoip ejemplo.com`", msg);
    }

    // Si es dominio, resolver IP primero
    const isDomain = /^[a-zA-Z]/.test(target) && !target.includes(":");
    

    try {
      let ip = target;
      if (isDomain) {
        const dns = await axios.get(`https://dns.google/resolve?name=${target}&type=A`, { timeout: 8000 });
        ip = dns.data?.Answer?.[0]?.data;
        if (!ip) throw new Error(`No se pudo resolver la IP de ${target}`);
      }

      const { data } = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,proxy,hosting,query`, {
        timeout: 10000,
      });

      if (data.status !== "success") throw new Error(data.message || "IP no encontrada.");

      const flag = data.countryCode
        ? String.fromCodePoint(...[...data.countryCode.toUpperCase()].map(c => 0x1F1E0 + c.charCodeAt(0) - 65))
        : "🌍";

      const texto =
        `🌐 *GeoIP: ${ip}*\n` +
        (isDomain ? `🔗 Dominio: ${target}\n` : "") +
        `\n${flag} *País:* ${data.country} (${data.countryCode})` +
        `\n🏙️ *Ciudad:* ${data.city}, ${data.regionName}` +
        `\n📮 *CP:* ${data.zip || "N/A"}` +
        `\n🕐 *Timezone:* ${data.timezone}` +
        `\n📍 *Coords:* ${data.lat}, ${data.lon}` +
        `\n🏢 *ISP:* ${data.isp}` +
        `\n🏭 *Org:* ${data.org}` +
        `\n🔢 *AS:* ${data.as}` +
        `\n🔒 *Proxy/VPN:* ${data.proxy ? "✅ Sí" : "❌ No"}` +
        `\n🖥️ *Hosting:* ${data.hosting ? "✅ Sí" : "❌ No"}`;

      
      await reply(sock, jid, texto, msg);

    } catch (e) {
      
      await reply(sock, jid, `❌ ${e.message}`, msg);
    }
  },
};
