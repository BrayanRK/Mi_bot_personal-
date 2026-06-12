import { exec } from "child_process";
import { promisify } from "util";
import { reply } from "../../utils.js";

const execAsync = promisify(exec);

export default {
  name: "traceroute",
  aliases: ["tracert", "trace"],
  run: async (sock, msg, args, jid) => {
    const target = args[0]?.trim();
    if (!target) {
      return reply(sock, jid, "❌ Uso: `.traceroute google.com`", msg);
    }

    if (/[;&|`$()<>]/.test(target)) {
      return reply(sock, jid, "❌ Caracteres no permitidos.", msg);
    }

    await reply(sock, jid, `🔍 *Trazando ruta a* ${target}*...*\n_(puede tardar hasta 30s)_`, msg);

    try {
      // -m 20 = max 20 hops, -w 2 = timeout 2s por hop, -n = no DNS reverse
      const { stdout } = await execAsync(`traceroute -m 20 -w 2 -n ${target}`, { timeout: 60000 });

      const lines = stdout.split("\n").filter(Boolean);
      const header = lines[0];
      const hops = lines.slice(1, 21);

      // Formatear hops
      const formatted = hops.map(line => {
        const match = line.match(/^\s*(\d+)\s+(.+)/);
        if (!match) return null;
        const hop = match[1].padStart(2, " ");
        const info = match[2].trim();
        const hasTimeout = info.includes("* * *");
        return `${hasTimeout ? "⭕" : "📍"} Hop ${hop}: ${info}`;
      }).filter(Boolean);

      await reply(sock, jid,
        `🛣️ *Traceroute a* ${target}\n` +
        `${header}\n\n` +
        `\`\`\`${formatted.join("\n")}\`\`\``,
        msg
      );

    } catch (e) {
      const msgErr = e.killed
        ? "⏳ Timeout en el traceroute."
        : e.message.includes("not found")
        ? "❌ `traceroute` no está instalado en el VPS."
        : `❌ ${e.message}`;
      await reply(sock, jid, msgErr, msg);
    }
  },
};

