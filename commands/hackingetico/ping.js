import { exec } from "child_process";
import { promisify } from "util";
import { reply } from "../../utils.js";

const execAsync = promisify(exec);

export default {
  name: "ping2",
  aliases: ["pingh", "hostping"],
  run: async (sock, msg, args, jid) => {
    const target = args[0]?.trim();
    if (!target) {
      return reply(sock, jid, "❌ Uso: `.pingh 8.8.8.8` o `.pingh google.com`", msg);
    }

    // Validar que no sea algo malicioso
    if (/[;&|`$()<>]/.test(target)) {
      return reply(sock, jid, "❌ Caracteres no permitidos.", msg);
    }

    try {
      const { stdout } = await execAsync(`ping -c 4 -W 3 ${target}`, { timeout: 20000 });

      // Parsear resultado
      const lines = stdout.split("\n");
      const stats = lines.find(l => l.includes("packets transmitted"));
      const rtt   = lines.find(l => l.includes("rtt") || l.includes("round-trip"));

      // Extraer paquetes
      const pktMatch = stats?.match(/(\d+) packets transmitted, (\d+) received/);
      const sent     = pktMatch?.[1] || "?";
      const received = pktMatch?.[2] || "?";
      const loss     = stats?.match(/(\d+(?:\.\d+)?)% packet loss/)?.[1] || "?";

      // Extraer tiempos
      const rttMatch = rtt?.match(/[\d.]+\/[\d.]+\/[\d.]+\/[\d.]+/);
      const [min, avg, max] = rttMatch ? rttMatch[0].split("/") : ["?", "?", "?"];

      const lossNum = parseFloat(loss);
      const emoji = lossNum === 0 ? "🟢" : lossNum < 50 ? "🟡" : "🔴";

      await reply(sock, jid,
        `📡 *Ping a* ${target}\n\n` +
        `${emoji} *Paquetes:* ${received}/${sent} recibidos\n` +
        `📉 *Pérdida:* ${loss}%\n` +
        `⚡ *RTT mín:* ${min} ms\n` +
        `⚡ *RTT avg:* ${avg} ms\n` +
        `⚡ *RTT máx:* ${max} ms`,
        msg
      );

    } catch (e) {
      const msgErr = e.killed ? "⏳ Timeout al hacer ping." : `❌ Host inalcanzable o no existe.`;
      await reply(sock, jid, msgErr, msg);
    }
  },
};

