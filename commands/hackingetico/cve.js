import axios from "axios";
import { reply } from "../../utils.js";

export default {
  name: "cve",
  aliases: ["vulnerabilidad", "vuln"],
  run: async (sock, msg, args, jid) => {
    const input = args.join(" ").trim().toUpperCase();
    if (!input) {
      return reply(sock, jid,
        "❌ *Uso:*\n" +
        "• Por ID: `.cve CVE-2021-44228`\n" +
        "• Por keyword: `.cve apache log4j`",
        msg
      );
    }

    const isCveId = /^CVE-\d{4}-\d+$/.test(input);
    await reply(sock, jid, `🔍 *Buscando CVE...*`, msg);

    try {
      let cve;

      if (isCveId) {
        // Buscar por ID exacto
        const { data } = await axios.get(
          `https://cveawg.mitre.org/api/cve/${input}`,
          { timeout: 15000 }
        );
        cve = data;
      } else {
        // Buscar por keyword en NVD
        const { data } = await axios.get(
          `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(input)}&resultsPerPage=1`,
          { timeout: 15000 }
        );
        const item = data?.vulnerabilities?.[0]?.cve;
        if (!item) throw new Error("No se encontraron CVEs para esa búsqueda.");

        // Reformatear para usar el mismo formato
        const desc = item.descriptions?.find(d => d.lang === "en")?.value || "Sin descripción.";
        const cvss = item.metrics?.cvssMetricV31?.[0]?.cvssData || item.metrics?.cvssMetricV2?.[0]?.cvssData;

        const severityEmoji = {
          CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢"
        };

        let texto =
          `🛡️ *${item.id}*\n\n` +
          `📝 *Descripción:*\n${desc.slice(0, 400)}${desc.length > 400 ? "..." : ""}\n`;

        if (cvss) {
          texto +=
            `\n📊 *CVSS Score:* ${cvss.baseScore} — ${severityEmoji[cvss.baseSeverity] || "⚪"} ${cvss.baseSeverity}` +
            `\n🔢 *Vector:* ${cvss.vectorString || "N/A"}`;
        }

        if (item.published)
          texto += `\n📅 *Publicado:* ${item.published?.slice(0, 10)}`;

        const refs = item.references?.slice(0, 3).map(r => `• ${r.url}`).join("\n");
        if (refs) texto += `\n\n🔗 *Referencias:*\n${refs}`;

        return await reply(sock, jid, texto, msg);
      }

      // Parsear respuesta de MITRE
      const containers = cve?.containers?.cna;
      const desc = containers?.descriptions?.find(d => d.lang === "en")?.value
        || containers?.descriptions?.[0]?.value
        || "Sin descripción.";

      const metrics = containers?.metrics?.[0];
      const cvss = metrics?.cvssV3_1 || metrics?.cvssV3_0 || metrics?.cvssV2_0;

      const severityEmoji = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" };

      let texto =
        `🛡️ *${input}*\n\n` +
        `📝 *Descripción:*\n${desc.slice(0, 400)}${desc.length > 400 ? "..." : ""}\n`;

      if (cvss) {
        texto +=
          `\n📊 *CVSS Score:* ${cvss.baseScore} — ${severityEmoji[cvss.baseSeverity] || "⚪"} ${cvss.baseSeverity}` +
          `\n🔢 *Vector:* ${cvss.vectorString || "N/A"}`;
      }

      const fecha = cve?.cveMetadata?.datePublished?.slice(0, 10);
      if (fecha) texto += `\n📅 *Publicado:* ${fecha}`;

      const refs = containers?.references?.slice(0, 3).map(r => `• ${r.url}`).join("\n");
      if (refs) texto += `\n\n🔗 *Referencias:*\n${refs}`;

      await reply(sock, jid, texto, msg);

    } catch (e) {
      console.error("[CVE ERROR]", e.response?.data || e.message);
      const status = e.response?.status;
      const msgErr = status === 404 ? `❌ CVE no encontrado: ${input}`
        : status === 429 ? "⏳ Límite de requests, intenta en 1 minuto."
        : `❌ ${e.message}`;
      await reply(sock, jid, msgErr, msg);
    }
  },
};

