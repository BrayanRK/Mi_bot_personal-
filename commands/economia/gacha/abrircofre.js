// commands/economia/gacha/abrircofre.js
// Comando: .abrircofre <comun|raro|legendario>
// Usa el inventario de la economía (cofregacha_comun / raro / legendario)
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, saveDB, getUser, numId } from "../db.js";
import { PROB_COFRES, EMOJI_RARITY, COLOR_RARITY, NOMBRE_COFRE } from "./gachaData.js";
import {
  elegirRareza,
  sortearPersonaje,
  agregarAColeccion,
  sendCardImage,
} from "./gachaHelpers.js";

// Mapa alias → id de ítem en inventario
const ALIAS_COFRE = {
  comun:      "cofregacha_comun",
  común:      "cofregacha_comun",
  raro:       "cofregacha_raro",
  legendario: "cofregacha_legendario",
  // también acepta el id directo
  cofregacha_comun:      "cofregacha_comun",
  cofregacha_raro:       "cofregacha_raro",
  cofregacha_legendario: "cofregacha_legendario",
};

export default {
  name: "abrircofre",
  aliases: ["abrir", "opencofre", "cofre"],
  description: "Abrir un cofre gacha del inventario",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    if (!Array.isArray(user.gacha))      user.gacha     = [];
    if (!Array.isArray(db.mercadoGacha)) db.mercadoGacha = [];

    const alias   = args[0]?.toLowerCase();
    const cofreId = ALIAS_COFRE[alias] ?? null;

    if (!cofreId) {
      return send([
        `🎁 *Cofres gacha disponibles*`,
        ``,
        `• *.abrircofre comun*      — 📦 Cofre Común  (R/SR)`,
        `• *.abrircofre raro*       — 🎁 Cofre Raro   (SR garantizado, 10% SSR)`,
        `• *.abrircofre legendario* — 💎 Cofre Legendario (SSR garantizado)`,
        ``,
        `Compra cofres con *.comprar cofregacha_comun*`,
      ].join("\n"));
    }

    // ── Verificar inventario (integración economía) ──────────────────────────
    const idx = user.inventario?.findIndex(i => i.id === cofreId);
    if (idx === undefined || idx < 0) {
      const nombres = {
        cofregacha_comun:      "Cofre Común",
        cofregacha_raro:       "Cofre Raro",
        cofregacha_legendario: "Cofre Legendario",
      };
      return send(`❌ No tienes *${nombres[cofreId]}* en tu inventario.\nCómpralo con *.comprar ${cofreId}*`);
    }

    // ── Sortear personaje ────────────────────────────────────────────────────
    const probs    = PROB_COFRES[cofreId];
    const rareza   = elegirRareza(probs);
    const personaje = sortearPersonaje(rareza);

    agregarAColeccion(user, personaje);
    user.inventario.splice(idx, 1); // consume el cofre del inventario
    saveDB(db);

    const total     = user.gacha.find(p => p.nombre === personaje.nombre)?.cantidad || 1;
    const esDup     = total > 1;
    const restantes = user.inventario.filter(i => i.id === cofreId).length;

    const caption = [
      `${NOMBRE_COFRE[cofreId]}`,
      ``,
      `${COLOR_RARITY[rareza]} *${rareza === "SSR" ? "¡SSR OBTENIDO!" : rareza === "SR" ? "SR obtenido!" : "R obtenido"}*`,
      ``,
      `${EMOJI_RARITY[rareza]} *${personaje.nombre}*`,
      `🏷️ Rareza: *${rareza}*`,
      esDup ? `📦 Duplicado #${total}` : `🆕 ¡Personaje nuevo!`,
      ``,
      `📚 Colección: *${user.gacha.length}* personajes distintos`,
      restantes > 0 ? `🎁 Te quedan *${restantes}* cofres de este tipo` : ``,
    ].filter(Boolean).join("\n");

    return sendCardImage(sock, msg, chatId, personaje.image, caption);
  },
};
