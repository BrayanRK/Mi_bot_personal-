import axios from "axios";
import { reply } from "../../utils.js";

const VT_KEY = process.env.VIRUSTOTAL_API_KEY;
const VT_BASE = "https://www.virustotal.com/api/v3";

function getType(input) {
  if (/^https?:\/\//i.test(input)) return "url";
  if (/^[a-f0-9]{32,64}$/i.test(input)) return "file";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(input)) return "ip";
  return "domain";
}

async function scanUrl(url) {
  // Primero subir la URL para análisis
  const form = new URLSearchParams();
  form.append("url", url);
  const { data } = await axios.post(`${VT_BASE}/urls`, form, {
    headers: { "x-apikey": VT_KEY, "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15000,
  });
  const id = data.data?.id;
  if (!id) throw new Error("No se pudo enviar la URL.");

  // Esperar un momento y obtener resultado
  await new Promise(r => setTimeout(r, 3000));
  const urlId = Buffer.from(url).toString("base64").replace(/=/g, "");
  const res = await axios.get(`${VT_BASE}/urls/${urlId}`, {
    headers: { "x-apikey": VT_KEY },
    timeout: 15000,
  });
  return res.data?.data?.attributes;
}

async function getAnalysis(type, target) {
  let endpoint;
  if (type === "ip")     endpoint = `${VT_BASE}/ip_addresses/${target}`;
  if (type === "domain") endpoint = `${VT_BASE}/domains/${target}`;
  if (type === "file")   endpoint = `${VT_BASE}/files/${target}`;

  const { data } = await axios.get(endpoint, {
    headers: { "x-apikey": VT_KEY },
    timeout: 15000,
  });
  return data?.data?.attributes;
}

export default {
  name: "virustotal",
  aliases: ["vt", "scanurl", "scanip"],
  run: async (sock, msg, args, jid) => {
    const input = args[0]?.trim();
    if (!input) {
      return reply(sock, jid,
        "❌ *Uso:*\n" +
        "• URL: `.vt https://ejemplo.com`\n" +
        "• IP: `.vt 8.8.8.8`\n" +
        "• Dominio: `.vt ejemplo.com`\n" +
        "• Hash: `.vt abc123...`",
        msg
      );
    }

    const type = getType(input);
    await reply(sock, jid, `🔍 *Analizando ${type} en VirusTotal...*`, msg);

    try {
      let attrs;
      if (type === "url") {
        attrs = await scanUrl(input);
      } else {
        attrs = await getAnalysis(type, input);
      }

      if (!attrs) throw new Error("No se obtuvieron resultados.");

      const stats = attrs.last_analysis_stats || {};
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      const malicious  = stats.malicious  || 0;
      const suspicious = stats.suspicious || 0;
      const clean      = stats.undetected || 0;

      const verdict = malicious > 0
        ? "🔴 *MALICIOSO*"
        : suspicious > 0
        ? "🟡 *SOSPECHOSO*"
        : "🟢 *LIMPIO*";

      let texto =
        `🛡️ *VirusTotal — ${type.toUpperCase()}*\n` +
        `🔎 Target: ${input.slice(0, 60)}\n\n` +
        `${verdict}\n\n` +
        `🔴 Malicioso: ${malicious}/${total}\n` +
        `🟡 Sospechoso: ${suspicious}/${total}\n` +
        `🟢 Limpio: ${clean}/${total}\n`;

      if (attrs.reputation !== undefined)
        texto += `\n⭐ Reputación: ${attrs.reputation}`;
      if (attrs.country)
        texto += `\n🌍 País: ${attrs.country}`;
      if (attrs.as_owner)
        texto += `\n🏢 AS Owner: ${attrs.as_owner}`;
      if (attrs.last_analysis_date)
        texto += `\n📅 Último análisis: ${new Date(attrs.last_analysis_date * 1000).toLocaleDateString()}`;

      // Motores que detectaron como malicioso
      const detected = Object.entries(attrs.last_analysis_results || {})
        .filter(([, v]) => v.category === "malicious")
        .map(([engine]) => engine)
        .slice(0, 10);

      if (detected.length)
        texto += `\n\n🚨 *Detectado por:*\n${detected.map(e => `• ${e}`).join("\n")}`;

      await react(malicious > 0 ? "🔴" : suspicious > 0 ? "🟡" : "✅");
      await reply(sock, jid, texto, msg);

    } catch (e) {
      console.error("[VT ERROR]", e.response?.data || e.message);
      const status = e.response?.status;
      const msgErr = status === 401 ? "❌ API key de VirusTotal inválida."
        : status === 404 ? "❌ No encontrado en VirusTotal."
        : status === 429 ? "⏳ Límite de requests alcanzado."
        : `❌ ${e.message}`;
      await reply(sock, jid, msgErr, msg);
    }
  },
};

