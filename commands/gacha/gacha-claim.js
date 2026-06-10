import fs from "fs";
import path from "path";
import { normalizeJid } from "../utilidades/permisos.js";

const personajesPath = path.join(process.cwd(), "src", "datos", "personajes.json");
const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = []) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

export default {
  name: "claim",
  aliases: ["gacha", "roll", "drop"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      if (!fs.existsSync(personajesPath)) {
        return sock.sendMessage(jid, { text: "❌ Error: personajes.json no encontrado." });
      }

      const personajes = leerJSON(personajesPath);
      if (!personajes.length) {
        return sock.sendMessage(jid, { text: "❌ No hay personajes en la base de datos." });
      }

      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const carta = personajes[Math.floor(Math.random() * personajes.length)];

      const inventariosGlobales = leerJSON(inventariosPath, {});
      if (!inventariosGlobales[usuarioId]) {
        inventariosGlobales[usuarioId] = [];
      }

      inventariosGlobales[usuarioId].push({
        name: carta.name,
        rarity: carta.rarity,
        attack: carta.attack,
        defense: carta.defense,
        health: carta.health,
        image: carta.image,
        fecha: new Date().toISOString()
      });
      
      guardarJSON(inventariosPath, inventariosGlobales);

      const yaLoTiene = inventariosGlobales[usuarioId].filter(p => p.name.toLowerCase() === carta.name.toLowerCase()).length > 1;

      const rarityEmojis = { "SSR": "🌟 [SSR]", "SR": "⭐ [SR]", "R": "✨ [R]" };
      const rangoRarity = rarityEmojis[carta.rarity] || `🃏 [${carta.rarity}]`;

      const texto = [
        "╭━━━〔 🎲 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑮𝑨𝑪𝑯𝑨 🎲 〕━━━⬣",
        `┃ 👤 ¡@${usuarioId} ha invocado una carta!`,
        "┃ ──────────────────────",
        `┃ 🎉 *¡OBTENIDO!*`,
        `┃ 👤 *Nombre:* ${carta.name}`,
        `┃ 💎 *Rareza:* ${rangoRarity}`,
        "┃ ──────────────────────",
        "┃ ⚔️ *ESTADÍSTICAS:*",
        `┃ 💥 *Ataque:* ${carta.attack} | 🛡️ *Defensa:* ${carta.defense}`,
        `┃ ❤️ *Vida:* ${carta.health}`,
        "┃ ──────────────────────",
        yaLoTiene ? "┃ 🎯 *Estado:* Ya tenías esta carta (Repetida acumulada)." : "┃ ✅ *¡Nueva carta añadida a tu colección!*",
        "╰━━━━━━━━━━━━━━━━━━━━⬣"
      ].join("\n");

      if (carta.image) {
        return await sock.sendMessage(jid, {
          image: { url: carta.image },
          caption: texto,
          mentions: [senderReal]
        });
      } else {
        return await sock.sendMessage(jid, { text: texto, mentions: [senderReal] });
      }

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Error en el reclamo de gacha." });
    }
  }
};