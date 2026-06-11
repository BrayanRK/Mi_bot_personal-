import tls from "tls";
import { reply } from "../../utils.js";

export default {
  name: "ssl",
  aliases: ["cert", "certificado"],
  run: async (sock, msg, args, jid) => {
    const react = async (e) => {
      try { await sock.sendMessage(msg.key.remoteJid, { react: { text: e, key: msg.key } }); } catch {}
    };

    let domain = args[0]?.trim().replace(/https?:\/\//i, "").replace(/\/.*/,"").replace(/:.*/, "");
    if (!domain) {
      
      return reply(sock, jid, "❌ Uso: `.ssl ejemplo.com`", msg);
    }

    

    try {
      const cert = await new Promise((resolve, reject) => {
        const socket = tls.connect(443, domain, { servername: domain, rejectUnauthorized: false }, () => {
          resolve(socket.getPeerCertificate(true));
          socket.destroy();
        });
        socket.on("error", reject);
        socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("Timeout")); });
      });

      if (!cert || !cert.subject) throw new Error("No se pudo obtener el certificado.");

      const now       = new Date();
      const validTo   = new Date(cert.valid_to);
      const validFrom = new Date(cert.valid_from);
      const diasRestantes = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
      const expirado  = diasRestantes < 0;
      const proximoExp = diasRestantes <= 30 && !expirado;

      const texto =
        `🔒 *SSL de* ${domain}\n\n` +
        `📋 *Subject:* ${cert.subject?.CN || "N/A"}\n` +
        `🏢 *Emisor:* ${cert.issuer?.O || cert.issuer?.CN || "N/A"}\n` +
        `📅 *Válido desde:* ${validFrom.toLocaleDateString()}\n` +
        `📅 *Válido hasta:* ${validTo.toLocaleDateString()}\n` +
        `⏳ *Días restantes:* ${expirado ? "❌ EXPIRADO" : proximoExp ? `⚠️ ${diasRestantes} (próximo a expirar)` : `✅ ${diasRestantes}`}\n` +
        `🔑 *Algoritmo:* ${cert.sigalg || "N/A"}\n` +
        `🔢 *Serial:* ${cert.serialNumber || "N/A"}\n` +
        (cert.subjectaltname ? `🌐 *SANs:* ${cert.subjectaltname.replace(/DNS:/g, "").slice(0, 200)}` : "");

      
      await reply(sock, jid, texto, msg);

    } catch (e) {
      
      await reply(sock, jid, `❌ ${e.message}`, msg);
    }
  },
};
