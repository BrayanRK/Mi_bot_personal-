// commands/economia/gacha/gachaHelpers.js
// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS compartidos del sistema gacha
// ─────────────────────────────────────────────────────────────────────────────
import { PERSONAJES } from "./gachaData.js";

/** Elige rareza según tabla de probabilidades */
export function elegirRareza(probs) {
  const r = Math.random();
  if (r < probs.SSR) return "SSR";
  if (r < probs.SSR + probs.SR) return "SR";
  return "R";
}

/** Sortea un personaje al azar del pool de esa rareza */
export function sortearPersonaje(rareza) {
  const pool = PERSONAJES.filter(p => p.rarity === rareza);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Agrega o incrementa un personaje en la colección del usuario */
export function agregarAColeccion(user, personaje) {
  if (!Array.isArray(user.gacha)) user.gacha = [];
  const existe = user.gacha.find(p => p.nombre === personaje.nombre);
  if (existe) {
    existe.cantidad = (existe.cantidad || 1) + 1;
  } else {
    user.gacha.push({ nombre: personaje.nombre, rarity: personaje.rarity, cantidad: 1 });
  }
}

/** Ordena la colección: SSR > SR > R, luego alfabético */
export function ordenarColeccion(col) {
  const orden = { SSR: 0, SR: 1, R: 2 };
  return [...col].sort((a, b) => {
    if (orden[a.rarity] !== orden[b.rarity]) return orden[a.rarity] - orden[b.rarity];
    return a.nombre.localeCompare(b.nombre);
  });
}

/** Busca la data completa (con imagen) de un personaje por nombre */
export function getPersonajeData(nombre) {
  return PERSONAJES.find(p => p.nombre === nombre);
}

/** Envía imagen + caption, con fallback a solo texto si la imagen falla */
export async function sendCardImage(sock, msg, chatId, imageUrl, caption) {
  try {
    await sock.sendMessage(chatId, { image: { url: imageUrl }, caption }, { quoted: msg });
  } catch {
    await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
  }
}
