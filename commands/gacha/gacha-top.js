import fs from "fs";
import path from "path";

const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

export default {
  name: "gachatop",
  aliases: ["topgacha", "rankinggacha", "gachaleader"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const inventariosGlobales = leerJSON(inventariosPath, {});
      const usuarios = Object.keys(inventariosGlobales);

      if (!usuarios.length) {
        return sock.sendMessage(jid, { text: "📊 Aún no hay registros de usuarios en el sistema Gacha." });
      }

      const listaTop = usuarios.map((id) => {
        return {
          id: id,
          totalCartas: inventariosGlobales[id]?.length || 0
        };
      });

      listaTop.sort((a, b) => b.totalCartas - a.totalCartas);

      const top10 = listaTop.slice(0, 10);

      let texto = "╭━━━〔 🏆 𝑻𝑶𝑷 𝑪𝑶𝑳𝑬𝑪𝑪𝑰𝑶𝑵𝑰𝑺𝑻𝑨𝑺 🏆 〕━━━⬣\n";
      texto += "┃ 🥇 Los mejores jugadores del Gacha:\n┃ ──────────────────────\n";

      const medallas = ["🥇", "🥈", "🥉", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅", "🏅"];
      const mencionesJid = [];

      top10.forEach((user, index) => {
        const emoji = medallas[index] || "🏅";
        const jidUsuario = `${user.id}@s.whatsapp.net`;
        mencionesJid.push(jidUsuario);
        
        texto += `┃ ${emoji} *#${index + 1}* » @${user.id}\n┃ 📦 Cartas: *${user.totalCartas}*\n┃ ──────────────────────\n`;
      });

      texto += "┃ 🎲 ¡Tira con *.gacha* para subir en el ranking!\n╰━━━━━━━━━━━━━━━━━━━━⬣";

      return await sock.sendMessage(jid, {
        text: texto,
        mentions: mencionesJid
      });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al cargar el top del gacha." });
    }
  }
};