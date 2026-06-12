// commands/economia/gacha/gachatop.js
// Comando: .gachatop  — ranking de coleccionistas del grupo
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB } from "../db.js";

export default {
  name: "gachatop",
  aliases: ["gacharank", "gacharanking", "topgacha"],
  description: "Ranking de coleccionistas gacha del grupo",

  async run(sock, msg, args, chatId) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();

    const usuarios = Object.entries(db.usuarios || {});
    if (usuarios.length === 0) return send("📭 Nadie tiene personajes aún.");

    const ranking = usuarios
      .map(([id, u]) => ({
        id,
        nombre:    u.nombre || `+${id}`,
        distintos: Array.isArray(u.gacha) ? u.gacha.length : 0,
        cartas:    Array.isArray(u.gacha) ? u.gacha.reduce((s, p) => s + (p.cantidad || 1), 0) : 0,
        ssr:       Array.isArray(u.gacha) ? u.gacha.filter(p => p.rarity === "SSR").length : 0,
      }))
      .filter(u => u.distintos > 0)
      .sort((a, b) => b.distintos - a.distintos || b.ssr - a.ssr)
      .slice(0, 10);

    if (ranking.length === 0) return send("📭 Nadie tiene personajes aún.");

    const medallas = ["🥇", "🥈", "🥉"];
    const lineas   = [`🏆 *TOP COLECCIONISTAS GACHA*`, ``];

    ranking.forEach((u, i) => {
      const med = medallas[i] || `${i + 1}.`;
      lineas.push(`${med} *${u.nombre}*`);
      lineas.push(`   🆔 ${u.distintos} distintos  •  🃏 ${u.cartas} cartas  •  🌟 ${u.ssr} SSR`);
    });

    return send(lineas.join("\n"));
  },
};
