import fs from "fs";
import path from "path";
import { normalizeJid } from "../../utilidades/permisos.js";

const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

export default {
  name: "inventario",
  aliases: ["miinventario", "inv", "box"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const inventariosGlobales = leerJSON(inventariosPath, {});
      const miInventario = inventariosGlobales[usuarioId] || [];

      if (!miInventario.length) {
        return sock.sendMessage(jid, {
          text: "╭━━━〔 🎒 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑾𝑨𝑳𝑳𝑬𝑻 〕━━━⬣\n┃ ❌ Tu inventario está vacío.\n┃ 🎲 Usa *.gacha* para conseguir cartas.\n╰━━━━━━━━━━━━━━━━━━━━⬣",
          mentions: [senderReal]
        });
      }

      const conteoCartas = {};
      for (let char of miInventario) {
        if (!conteoCartas[char.name]) {
          conteoCartas[char.name] = {
            name: char.name,
            rarity: char.rarity,
            count: 0
          };
        }
        conteoCartas[char.name].count += 1;
      }

      const listaAgrupada = Object.values(conteoCartas);
      const rarityEmojis = { "SSR": "🌟", "SR": "⭐", "R": "✨" };

      let texto = "╭━━━〔 🎒 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑩𝑶𝑿 〕━━━⬣\n";
      texto += `┃ 👤 Inventario de: @${usuarioId}\n`;
      texto += `┃ 📦 Total de cartas poseídas: ${miInventario.length}\n`;
      texto += "┃ ──────────────────────\n";

      for (let char of listaAgrupada) {
        const emoji = rarityEmojis[char.rarity] || "🃏";
        texto += `┃ ${emoji} » ${char.name}`;
        if (char.count > 1) {
          texto += ` *(x${char.count})*`;
        }
        texto += "\n";
      }

      texto += "┃ ──────────────────────\n";
      texto += "┃ ⚔️ ¡Usa tus cartas para competir!\n";
      texto += "╰━━━━━━━━━━━━━━━━━━━━⬣";

      return await sock.sendMessage(jid, { text: texto, mentions: [senderReal] });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al abrir tu inventario." });
    }
  }
};