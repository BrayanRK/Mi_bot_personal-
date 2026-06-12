// commands/economia/gacha/gacha.js
// Comando: .gacha  — claim gratuito cada 5 min
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, saveDB, getUser, numId } from "../db.js";
import { COOLDOWN_GACHA, PROB_LIBRE, EMOJI_RARITY, COLOR_RARITY } from "./gachaData.js";
import {
  elegirRareza,
  sortearPersonaje,
  agregarAColeccion,
  sendCardImage,
} from "./gachaHelpers.js";

export default {
  name: "gacha",
  aliases: ["invoca", "invocar"],
  description: "Claim gacha gratis cada 5 minutos",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    if (!Array.isArray(user.gacha))   user.gacha    = [];
    if (user.lastGacha === undefined) user.lastGacha = 0;

    // Sin subcomando → claim
    if (!args[0]) {
      const ahora = Date.now();
      const diff  = ahora - (user.lastGacha || 0);

      if (diff < COOLDOWN_GACHA) {
        const resta = COOLDOWN_GACHA - diff;
        const m = Math.floor(resta / 60000);
        const s = Math.floor((resta % 60000) / 1000);
        return send(`⏳ Ya reclamaste tu gacha.\n\nVuelve en *${m}m ${s}s*`);
      }

      const rareza    = elegirRareza(PROB_LIBRE);
      const personaje = sortearPersonaje(rareza);

      agregarAColeccion(user, personaje);
      user.lastGacha = ahora;
      saveDB(db);

      const total = user.gacha.find(p => p.nombre === personaje.nombre)?.cantidad || 1;
      const esDup = total > 1;

      const caption = [
        `${COLOR_RARITY[rareza]} *¡GACHA CLAIM!* ${COLOR_RARITY[rareza]}`,
        ``,
        `${EMOJI_RARITY[rareza]} *${personaje.nombre}*`,
        `🏷️ Rareza: *${rareza}*`,
        esDup ? `📦 Duplicado #${total} (ya lo tenías)` : `🆕 ¡Personaje nuevo!`,
        ``,
        `📚 Colección: *${user.gacha.length}* personajes distintos`,
        ``,
        `⏰ Próximo claim en *5 minutos*`,
      ].join("\n");

      return sendCardImage(sock, msg, chatId, personaje.image, caption);
    }

    // Ayuda
    return send([
      `🌸 *SISTEMA GACHA*`,
      ``,
      `• *.gacha*               — Claim gratis cada 5 min`,
      `• *.coleccion*           — Ver tu colección`,
      `• *.vercard <número>*    — Ver imagen de un personaje`,
      `• *.abrircofre <tipo>*   — Abrir cofre (comun/raro/legendario)`,
      `• *.gachaperfil*         — Resumen de tu colección`,
      `• *.gachatop*            — Ranking de coleccionistas`,
      ``,
      `🛒 Compra cofres: *.comprar cofregacha_comun*`,
    ].join("\n"));
  },
};
