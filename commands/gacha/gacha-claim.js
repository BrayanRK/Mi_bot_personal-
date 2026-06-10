import fs from "fs";
import path from "path";
import { normalizeJid } from "../../utilidades/permisos.js";

const personajesPath = path.join(process.cwd(), "src", "datos", "personajes.json");
const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

export default {
  name: "gacha",
  aliases: ["claim", "rw", "tirar"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const listaPersonajes = leerJSON(personajesPath, []);

      if (!listaPersonajes.length) {
        return sock.sendMessage(jid, { text: "❌ La base de datos de personajes está vacía." });
      }

      const carta = listaPersonajes[Math.floor(Math.random() * listaPersonajes.length)];

      const inventariosGlobales = leerJSON(inventariosPath, {});
      
      if (!inventariosGlobales[usuarioId]) {
        inventariosGlobales[usuarioId] = [];
      }

      const nuevaCarta = {
        name: carta.name,
        rarity: carta.rarity,
        attack: carta.attack || Math.floor(Math.random() * 101) + 50,
        defense: carta.defense || Math.floor(Math.random() * 101) + 50,
        health: carta.health || Math.floor(Math.random() * 151) + 100,
        image: carta.image,
        fecha: new Date().toISOString()
      };

      inventariosGlobales[usuarioId].push(nuevaCarta);
      guardarJSON(inventariosPath, inventariosGlobales);

      const rarityEmojis = { "SSR": "🌟", "SR": "⭐", "R": "✨" };
      const emojiRarity = rarityEmojis[nuevaCarta.rarity] || "🃏";

      let texto = `╭━━━〔 🎲 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑮𝑨𝑪𝑯𝑨 〕━━━⬣\n`;
      texto += `┃ 👤 *¡Carta Reclamada!*\n`;
      texto += `┃ 👥 *Usuario:* @${usuarioId}\n`;
      texto += `┃ ──────────────────────\n`;
      texto += `┃ 🃏 *Personaje:* ${nuevaCarta.name}\n`;
      texto += `┃ ${emojiRarity} *Rareza:* [${nuevaCarta.rarity}]\n`;
      texto += `┃ ──────────────────────\n`;
      texto += `┃ ⚔️ *Ataque:* ${nuevaCarta.attack}\n`;
      texto += `┃ 🛡️ *Defensa:* ${nuevaCarta.defense}\n`;
      texto += `┃ ❤️ *Vida:* ${nuevaCarta.health}\n`;
      texto += `╰━━━━━━━━━━━━━━━━━━━━⬣`;

      if (nuevaCarta.image && (nuevaCarta.image.startsWith("http://") || nuevaCarta.image.startsWith("https://"))) {
        return await sock.sendMessage(jid, {
          image: { url: nuevaCarta.image },
          caption: texto,
          mentions: [senderReal]
        });
      } else {
        return await sock.sendMessage(jid, { text: texto, mentions: [senderReal] });
      }

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al reclamar tu gacha." });
    }
  }
};