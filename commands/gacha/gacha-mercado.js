import fs from "fs";
import path from "path";
import { normalizeJid } from "../../utilidades/permisos.js";

const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");
const mercadoPath = path.join(process.cwd(), "data", "mercado.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

export default {
  name: "mercado",
  aliases: ["market", "ventas", "gachashop"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const mercadoGlobal = leerJSON(mercadoPath, []);
      const inventariosGlobales = leerJSON(inventariosPath, {});

      if (!args[0]) {
        if (!mercadoGlobal.length) {
          return sock.sendMessage(jid, { 
            text: "╭━━━〔 🏪 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑴𝑨𝑹𝑲𝑬𝑻 〕━━━⬣\n┃ 🛒 El mercado está vacío actualmente.\n┃ 📝 Usa *.mercado sell [Nombre]* para vender.\n╰━━━━━━━━━━━━━━━━━━━━⬣" 
          });
        }

        let texto = "╭━━━〔 🏪 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑴𝑨𝑹𝑲𝑬𝑻 〕━━━⬣\n";
        texto += "┃ 🛒 Cartas en venta disponibles:\n┃ ──────────────────────\n";

        const rarityEmojis = { "SSR": "🌟", "SR": "⭐", "R": "✨" };

        mercadoGlobal.forEach((item, index) => {
          const emoji = rarityEmojis[item.carta.rarity] || "🃏";
          texto += `┃ *#${index + 1}* » ${emoji} *${item.carta.name}* [${item.carta.rarity}]\n`;
          texto += `┃ 👤 Vendedor: @${item.vendedor}\n`;
          texto += `┃ 💰 ID de compra: \`${item.idVenta}\`\n`;
          texto += "┃ ──────────────────────\n";
        });

        texto += "┃ 🛒 Para comprar usa: *.mercado buy [ID]*\n╰━━━━━━━━━━━━━━━━━━━━⬣";
        return sock.sendMessage(jid, { text: texto, mentions: mercadoGlobal.map(i => `${i.vendedor}@s.whatsapp.net`) });
      }

      const accion = args[0].toLowerCase();

      if (accion === "sell" || accion === "vender") {
        const nombrePersonaje = args.slice(1).join(" ");
        if (!nombrePersonaje) {
          return sock.sendMessage(jid, { text: "❌ Especifica el nombre del personaje. Ejemplo: *.mercado sell Naruto*" });
        }

        const miInventario = inventariosGlobales[usuarioId] || [];
        const indexCarta = miInventario.findIndex(c => c.name.toLowerCase() === nombrePersonaje.toLowerCase());

        if (indexCarta === -1) {
          return sock.sendMessage(jid, { text: `❌ No tienes a *${nombrePersonaje}* en tu inventario.` });
        }

        const [cartaParaVender] = miInventario.splice(indexCarta, 1);

        const idVenta = Math.random().toString(36).substring(2, 7).toUpperCase();

        mercadoGlobal.push({
          idVenta,
          vendedor: usuarioId,
          carta: cartaParaVender
        });

        inventariosGlobales[usuarioId] = miInventario;

        guardarJSON(inventariosPath, inventariosGlobales);
        guardarJSON(mercadoPath, mercadoGlobal);

        return sock.sendMessage(jid, { 
          text: `✅ Puest@ en venta: *${cartaParaVender.name}* [${cartaParaVender.rarity}].\n📦 Guardado en el mercado con el ID: \`${idVenta}\`` 
        });
      }

      if (accion === "buy" || accion === "comprar") {
        const idVentaBuscar = args[1]?.toUpperCase();
        if (!idVentaBuscar) {
          return sock.sendMessage(jid, { text: "❌ Especifica el ID de la venta. Ejemplo: *.mercado buy X7R2B*" });
        }

        const indexVenta = mercadoGlobal.findIndex(v => v.idVenta === idVentaBuscar);

        if (indexVenta === -1) {
          return sock.sendMessage(jid, { text: "❌ Ese ID de venta no existe en el mercado o ya fue comprado." });
        }

        const datosVenta = mercadoGlobal[indexVenta];

        if (datosVenta.vendedor === usuarioId) {
          return sock.sendMessage(jid, { text: "❌ No puedes comprar tu propia carta en el mercado." });
        }

        mercadoGlobal.splice(indexVenta, 1);

        if (!inventariosGlobales[usuarioId]) {
          inventariosGlobales[usuarioId] = [];
        }
        inventariosGlobales[usuarioId].push(datosVenta.carta);

        guardarJSON(inventariosPath, inventariosGlobales);
        guardarJSON(mercadoPath, mercadoGlobal);

        return sock.sendMessage(jid, { 
          text: `🎉 ¡Compra exitosa! Has adquirido a *${datosVenta.carta.name}* [${datosVenta.carta.rarity}] del mercado.`,
          mentions: [senderReal]
        });
      }

      return sock.sendMessage(jid, { text: "❌ Subcomando inválido. Usa *.mercado sell [Nombre]* o *.mercado buy [ID]*" });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error en el sistema del mercado." });
    }
  }
};