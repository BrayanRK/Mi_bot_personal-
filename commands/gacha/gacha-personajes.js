import fs from "fs";
import path from "path";
import { normalizeJid } from "../utilidades/permisos.js";

const personajesPath = path.join(process.cwd(), "src", "datos", "personajes.json");
const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = []) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

export default {
  name: "personajes",
  aliases: ["coleccion", "album", "cartas"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      if (!fs.existsSync(personajesPath)) {
        return sock.sendMessage(jid, {
          text: "🌸 「 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑨𝑳𝑩𝑼𝑴 」 🌸\n\n❌ No hay personajes disponibles en el sistema gacha."
        });
      }

      const characters = leerJSON(personajesPath);
      if (!characters.length) {
        return sock.sendMessage(jid, { text: "❌ La lista de personajes está vacía." });
      }

      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const inventariosGlobales = leerJSON(inventariosPath, {});
      const miInventario = inventariosGlobales[usuarioId] || [];

      let obtenidos = [];
      let noObtenidos = [];

      for (let char of characters) {
        let count = miInventario.filter(item => item.name.toLowerCase() === char.name.toLowerCase()).length;
        
        if (count > 0) {
          obtenidos.push({ ...char, count });
        } else {
          noObtenidos.push(char);
        }
      }

      const total = characters.length;
      const tengo = obtenidos.length;
      const porcentaje = total > 0 ? Math.floor((tengo / total) * 100) : 0;

      let barra = "";
      const completado = Math.floor(porcentaje / 10);
      for (let i = 0; i < 10; i++) {
        barra += i < completado ? "🌸" : "⚫";
      }

      const rarityEmojis = { "SSR": "🌟", "SR": "⭐", "R": "✨" };

      let texto = "╭━━━〔 🌸 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑨𝑳𝑩𝑼𝑴 🌸 〕━━━⬣\n";
      texto += `┃ 📊 PROGRESS » ${tengo}/${total} (${porcentaje}%)\n`;
      texto += `┃ 📈 BARRA » ${barra}\n`;
      texto += "┃ ──────────────────────\n";

      texto += `┃ ✅ *OBTENIDOS* (${tengo})\n`;
      for (let char of obtenidos) {
        const emoji = rarityEmojis[char.rarity] || "🃏";
        texto += `┃ ${emoji} » ${char.name}`;
        if (char.count > 1) texto += ` *(x${char.count})*`;
        texto += "\n";
      }

      texto += "┃\n┃ ❌ *NO OBTENIDOS* (" + noObtenidos.length + ")\n";
      
      const limiteNoObtenidos = noObtenidos.slice(0, 30);
      for (let char of limiteNoObtenidos) {
        const emoji = rarityEmojis[char.rarity] || "🃏";
        texto += `┃ ${emoji} » ${char.name}\n`;
      }
      
      if (noObtenidos.length > 30) {
        texto += `┃ 🔍 ... y ${noObtenidos.length - 30} personajes más.\n`;
      }

      texto += "┃ ──────────────────────\n";
      texto += "┃ 🎲 ¡Sigue usando *.gacha* para completarlo!\n";
      texto += "╰━━━━━━━━━━━━━━━━━━━━⬣";

      return await sock.sendMessage(jid, { text: texto, mentions: [senderReal] });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al procesar tu álbum de colección." });
    }
  }
};