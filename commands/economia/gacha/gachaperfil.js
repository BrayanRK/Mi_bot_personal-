// commands/economia/gacha/gachaperfil.js
// Comando: .gachaperfil  — resumen de tu colección gacha
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, getUser, numId } from "../db.js";
import { PERSONAJES, COOLDOWN_GACHA, COLOR_RARITY } from "./gachaData.js";

export default {
  name: "gachaperfil",
  aliases: ["gachastats", "gachainfo", "miperfil"],
  description: "Ver resumen de tu colección gacha",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    const col            = Array.isArray(user.gacha) ? user.gacha : [];
    const totalDistintos = col.length;
    const totalPersonajes = PERSONAJES.length;
    const totalCartas    = col.reduce((s, p) => s + (p.cantidad || 1), 0);
    const totalSSR       = col.filter(p => p.rarity === "SSR").length;
    const totalSR        = col.filter(p => p.rarity === "SR").length;
    const totalR         = col.filter(p => p.rarity === "R").length;

    const ssrPool = PERSONAJES.filter(p => p.rarity === "SSR").length;
    const srPool  = PERSONAJES.filter(p => p.rarity === "SR").length;
    const rPool   = PERSONAJES.filter(p => p.rarity === "R").length;

    const pct = totalPersonajes > 0
      ? ((totalDistintos / totalPersonajes) * 100).toFixed(1)
      : "0.0";

    const top5 = [...col]
      .sort((a, b) => (b.cantidad || 1) - (a.cantidad || 1))
      .slice(0, 5);

    const resta = COOLDOWN_GACHA - (Date.now() - (user.lastGacha || 0));
    const cooldownTxt = resta > 0
      ? `${Math.floor(resta / 60000)}m ${Math.floor((resta % 60000) / 1000)}s`
      : "¡Listo!";

    const lineas = [
      `╭━━━━━━━━━━━━━━━━━━━━╮`,
      `┃  🌸 *PERFIL GACHA*  🌸  ┃`,
      `╰━━━━━━━━━━━━━━━━━━━━╯`,
      ``,
      `╭─ 📚 *COLECCIÓN*`,
      `│ 🃏 Cartas totales: *${totalCartas}*`,
      `│ 🆔 Distintos: *${totalDistintos}/${totalPersonajes}* (${pct}%)`,
      `│ 🌟 SSR: *${totalSSR}/${ssrPool}*`,
      `│ ✨ SR:  *${totalSR}/${srPool}*`,
      `│ 🔹 R:   *${totalR}/${rPool}*`,
      `╰──────────────────`,
      ``,
      `╭─ ⏰ *GACHA LIBRE*`,
      `│ Próximo claim: *${cooldownTxt}*`,
      `╰──────────────────`,
    ];

    if (top5.length > 0) {
      lineas.push(``, `╭─ 🏆 *MÁS REPETIDOS*`);
      top5.forEach((p, i) => {
        lineas.push(`│ ${i + 1}. ${COLOR_RARITY[p.rarity]} *${p.nombre}* x${p.cantidad || 1}`);
      });
      lineas.push(`╰──────────────────`);
    }

    lineas.push(``, `> 💡 *.coleccion* para ver todo`);
    lineas.push(`> 💡 *.vercard <número>* para ver la imagen`);

    return send(lineas.join("\n"));
  },
};
