// commands/economia/gacha/personajes.js
// Comando: .personajes [página]  — muestra todos los personajes, los que tienes y los que faltan
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, getUser, numId } from "../db.js";
import { PERSONAJES, COLOR_RARITY } from "./gachaData.js";

const PAG_SIZE = 30;

export default {
  name: "personajes",
  aliases: ["chars", "characters", "pj"],
  description: "Ver todos los personajes del gacha, los que tienes y los que faltan",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    const coleccion = Array.isArray(user.gacha) ? user.gacha : [];
    const tieneMap  = new Map(coleccion.map(p => [p.nombre, p.cantidad || 1]));

    // Ordenar: SSR > SR > R, luego alfabético
    const orden = { SSR: 0, SR: 1, R: 2 };
    const todos = [...PERSONAJES].sort((a, b) => {
      if (orden[a.rarity] !== orden[b.rarity]) return orden[a.rarity] - orden[b.rarity];
      return a.nombre.localeCompare(b.nombre);
    });

    const tengo   = todos.filter(p => tieneMap.has(p.nombre));
    const faltan  = todos.filter(p => !tieneMap.has(p.nombre));

    const pag      = Math.max(1, parseInt(args[0]) || 1);
    const totalPag = Math.ceil(todos.length / PAG_SIZE);
    const slice    = todos.slice((pag - 1) * PAG_SIZE, pag * PAG_SIZE);

    // Stats globales
    const totalSSR = PERSONAJES.filter(p => p.rarity === "SSR").length;
    const totalSR  = PERSONAJES.filter(p => p.rarity === "SR").length;
    const totalR   = PERSONAJES.filter(p => p.rarity === "R").length;

    const tengaSSR = tengo.filter(p => p.rarity === "SSR").length;
    const tengaSR  = tengo.filter(p => p.rarity === "SR").length;
    const tengaR   = tengo.filter(p => p.rarity === "R").length;

    const pct = ((tengo.length / todos.length) * 100).toFixed(1);

    const lineas = [
      `╭━━━━━━━━━━━━━━━━━━━━━╮`,
      `┃   📖 *TODOS LOS PERSONAJES*   ┃`,
      `╰━━━━━━━━━━━━━━━━━━━━━╯`,
      ``,
      `📊 *Progreso:* ${tengo.length}/${todos.length} (${pct}%)`,
      `🌟 SSR: ${tengaSSR}/${totalSSR}  ✨ SR: ${tengaSR}/${totalSR}  🔹 R: ${tengaR}/${totalR}`,
      `📄 Página ${pag}/${totalPag}`,
      ``,
    ];

    // Separar en esta página los que tengo vs los que faltan
    const enEstaPagTengo  = slice.filter(p => tieneMap.has(p.nombre));
    const enEstaPagFaltan = slice.filter(p => !tieneMap.has(p.nombre));

    if (enEstaPagTengo.length > 0) {
      lineas.push(`✅ *TIENES (${enEstaPagTengo.length})*`);
      for (const p of enEstaPagTengo) {
        const cant = tieneMap.get(p.nombre);
        const dup  = cant > 1 ? ` x${cant}` : "";
        lineas.push(`  ${COLOR_RARITY[p.rarity]} *${p.nombre}*${dup}  [${p.rarity}]`);
      }
      lineas.push(``);
    }

    if (enEstaPagFaltan.length > 0) {
      lineas.push(`❌ *TE FALTAN (${enEstaPagFaltan.length})*`);
      for (const p of enEstaPagFaltan) {
        lineas.push(`  ${COLOR_RARITY[p.rarity]} ${p.nombre}  [${p.rarity}]`);
      }
    }

    if (totalPag > 1) {
      lineas.push(``);
      if (pag < totalPag) lineas.push(`> ▶️ Siguiente: *.personajes ${pag + 1}*`);
      if (pag > 1)        lineas.push(`> ◀️ Anterior:  *.personajes ${pag - 1}*`);
    }

    lineas.push(``, `> 💡 *.coleccion* para ver solo los tuyos`);

    return send(lineas.join("\n"));
  },
};
