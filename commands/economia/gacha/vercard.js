// commands/economia/gacha/vercard.js
// Comando: .vercard <número>  — muestra la imagen de un personaje de tu colección
// ─────────────────────────────────────────────────────────────────────────────
import { loadDB, getUser, numId } from "../db.js";
import { COLOR_RARITY } from "./gachaData.js";
import { ordenarColeccion, getPersonajeData, sendCardImage } from "./gachaHelpers.js";

export default {
  name: "vercard",
  aliases: ["ver", "viewcard"],
  description: "Ver la imagen de un personaje de tu colección",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    const numIdx = parseInt(args[0]);
    if (isNaN(numIdx) || numIdx < 1) {
      return send(`❌ Uso: *.vercard <número>*\n\nMira los números con *.coleccion*`);
    }

    const col  = Array.isArray(user.gacha) ? ordenarColeccion(user.gacha) : [];
    const item = col[numIdx - 1];
    if (!item) {
      return send(`❌ No existe el número *${numIdx}*. Tienes *${col.length}* personajes.`);
    }

    const data = getPersonajeData(item.nombre);
    if (!data) return send(`❌ No se encontró la imagen de *${item.nombre}*.`);

    const caption = [
      `${COLOR_RARITY[item.rarity]} *${item.nombre}*`,
      `🏷️ Rareza: *${item.rarity}*`,
      `📦 Cantidad: *${item.cantidad || 1}*`,
    ].join("\n");

    return sendCardImage(sock, msg, chatId, data.image, caption);
  },
};
