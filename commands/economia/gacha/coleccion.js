// commands/economia/gacha/coleccion.js
// Comando: .coleccion [página]  — muestra tu colección paginada
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, getUser, numId } from "../db.js";
import { COLOR_RARITY } from "./gachaData.js";
import { ordenarColeccion } from "./gachaHelpers.js";

export default {
  name: "coleccion",
  aliases: ["col", "lista", "micol"],
  description: "Ver tu colección gacha paginada",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    if (!Array.isArray(user.gacha) || user.gacha.length === 0) {
      return send(`📭 No tienes personajes aún.\n\nUsa *.gacha* cada 5 min o abre cofres con *.abrircofre <tipo>*`);
    }

    const pagSize = 20;
    const pag     = Math.max(1, parseInt(args[0]) || 1);
    const col     = ordenarColeccion(user.gacha);
    const total   = col.length;
    const pages   = Math.ceil(total / pagSize);
    const slice   = col.slice((pag - 1) * pagSize, pag * pagSize);

    const totalSSR   = col.filter(p => p.rarity === "SSR").length;
    const totalSR    = col.filter(p => p.rarity === "SR").length;
    const totalR     = col.filter(p => p.rarity === "R").length;
    const totalCartas = col.reduce((s, p) => s + (p.cantidad || 1), 0);

    const lineas = [
      `📚 *TU COLECCIÓN GACHA*`,
      `🃏 ${totalCartas} cartas  •  🌟 ${totalSSR} SSR  •  ✨ ${totalSR} SR  •  🔹 ${totalR} R`,
      `📄 Página ${pag}/${pages}`,
      ``,
    ];

    slice.forEach((p, i) => {
      const num   = (pag - 1) * pagSize + i + 1;
      const emoji = COLOR_RARITY[p.rarity];
      const cnt   = p.cantidad > 1 ? ` x${p.cantidad}` : "";
      lineas.push(`${String(num).padStart(3, " ")}. ${emoji} *${p.nombre}*${cnt}  [${p.rarity}]`);
    });

    if (pages > 1) lineas.push(`\n> Página siguiente: *.coleccion ${pag + 1}*`);
    lineas.push(`\n> 💡 *.vercard <número>* para ver la imagen`);

    return send(lineas.join("\n"));
  },
};
