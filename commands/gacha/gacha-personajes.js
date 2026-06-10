import fs from "fs";
import path from "path";
import { normalizeJid } from "../../utilidades/permisos.js";

const personajesPath = path.join(process.cwd(), "src", "datos", "personajes.json");
const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

export default {
  name: "personajes",
  aliases: ["album", "cartas", "gachas"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const listaPersonajes = leerJSON(personajesPath, []);
      const inventariosGlobales = leerJSON(inventariosPath, {});
      const miInventario = inventariosGlobales[usuarioId] || [];

      if (!listaPersonajes.length) {
        return sock.sendMessage(jid, { text: "❌ La base de datos global de personajes está vacía." });
      }

      const nombresObtenidos = new Set(miInventario.map(c => c.name.toLowerCase()));

      let texto = "╭━━━〔 📖 𝑨𝑳𝑩𝑼𝑴 𝑮𝑨𝑪𝑯𝑨 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 〕━━━⬣\n";
      texto += `┃ 📊 Progreso de Colección: *${nombresObtenidos.size}/${listaPersonajes.length}*\n`;
      texto += "┃ ──────────────────────\n";

      const rarityEmojis = { "SSR": "🌟", "SR": "⭐", "R": "✨" };

      listaPersonajes.forEach((char, index) => {
        const yaLoTiene = nombresObtenidos.has(char.name.toLowerCase());
        const estadoCheck = yaLoTiene ? "✅" : "🔒";
        const emojiRarity = rarityEmojis[char.rarity] || "🃏";

        texto += `┃ ${estadoCheck} *#${index + 1}* » ${emojiRarity} *${char.name}* [${char.rarity}]\n`;
      });

      texto += "┃ ──────────────────────\n";
      texto += "┃ 🎲 ¡Sigue usando *.gacha* para completarlo!\n╰━━━━━━━━━━━━━━━━━━━━⬣";

      return await sock.sendMessage(jid, { text: texto, mentions: [senderReal] });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al cargar el álbum de personajes." });
    }
  }
};