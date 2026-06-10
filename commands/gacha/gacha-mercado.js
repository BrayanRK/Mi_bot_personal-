import fs from "fs";
import path from "path";
import { normalizeJid } from "../utilidades/permisos.js";

const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");
const mercadoPath = path.join(process.cwd(), "src", "datos", "mercado.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

export default {
  name: "mercado",
  aliases: ["market", "tienda", "vender"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      const accion = args[0]?.toLowerCase();

      if (!accion || !["ver", "vender", "comprar"].includes(accion)) {
        return sock.sendMessage(jid, {
          text: "╭━━━〔 🏪 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑴𝑬𝑹𝑪𝑨𝑫𝑶 〕━━━⬣\n┃ Uso del comando:\n┃ 🔹 *.mercado ver* → Lista las cartas en venta.\n┃ 🔹 *.mercado vender [Nombre]* → Publica una carta.\n┃ 🔹 *.mercado comprar [ID]* → Compra una carta por ID.\n╰━━━━━━━━━━━━━━━━━━━━⬣"
        });
      }

      const mercado = leerJSON(mercadoPath, []);
      const inventariosGlobales = leerJSON(inventariosPath, {});

      if (accion === "ver") {
        if (!mercado.length) {
          return sock.sendMessage(jid, { text: "🏪 El mercado global está vacío en este momento." });
        }

        let texto = "╭━━━〔 🏪 𝑴𝑰𝑻𝑺𝑼𝑴𝑰 𝑴𝑬𝑹𝑪𝑨𝑫𝑶 〕━━━⬣\n";
        texto += "┃ 🛒 Cartas disponibles para compra:\n┃ ──────────────────────\n";
        
        for (let item of mercado) {
          texto += `┃ 🆔 ID: *${item.idMarket}*\n┃ 🃏 Carta: *${item.name}* (${item.rarity})\n┃ 👤 Vendedor: @${item.vendedor}\n┃ ──────────────────────\n`;
        }
        texto += "╰━━━━━━━━━━━━━━━━━━━━⬣";

        return sock.sendMessage(jid, { text: texto, mentions: [senderReal] });
      }

      if (accion === "vender") {
        const nombreCarta = args.slice(1).join(" ")?.trim();
        if (!nombreCarta) {
          return sock.sendMessage(jid, { text: "❌ Especifica el nombre de la carta que quieres vender." });
        }

        const miInventario = inventariosGlobales[usuarioId] || [];
        const indexCarta = miInventario.findIndex(p => p.name.toLowerCase() === nombreCarta.toLowerCase());

        if (indexCarta === -1) {
          return sock.sendMessage(jid, { text: `❌ No tienes a *${nombreCarta}* en tu inventario.` });
        }

        const [cartaParaVender] = miInventario.splice(indexCarta, 1);
        
        const idUnico = String(Date.now()).slice(-6);

        mercado.push({
          idMarket: idUnico,
          vendedor: usuarioId,
          vendedorJid: senderReal,
          ...cartaParaVender
        });

        inventariosGlobales[usuarioId] = miInventario;

        guardarJSON(inventariosPath, inventariosGlobales);
        guardarJSON(mercadoPath, mercado);

        return sock.sendMessage(jid, {
          text: `✅ Publicaste a *${cartaParaVender.name}* en el mercado con el ID: *${idUnico}*. Se removió de tu inventario.`
        });
      }

      if (accion === "comprar") {
        const idBuscar = args[1]?.trim();
        if (!idBuscar) {
          return sock.sendMessage(jid, { text: "❌ Especifica el ID de la carta que quieres comprar." });
        }

        const indexMercado = mercado.findIndex(item => item.idMarket === idBuscar);
        if (indexMercado === -1) {
          return sock.sendMessage(jid, { text: "❌ Ese ID no existe en el mercado o ya fue comprado." });
        }

        const itemMercado = mercado[indexMercado];

        if (itemMercado.vendedor === usuarioId) {
          return sock.sendMessage(jid, { text: "❌ No puedes comprar tu propia carta en venta." });
        }

        mercado.splice(indexMercado, 1);

        if (!inventariosGlobales[usuarioId]) {
          inventariosGlobales[usuarioId] = [];
        }

        inventariosGlobales[usuarioId].push({
          name: itemMercado.name,
          rarity: itemMercado.rarity,
          attack: itemMercado.attack,
          defense: itemMercado.defense,
          health: itemMercado.health,
          image: itemMercado.image,
          fecha: new Date().toISOString()
        });

        guardarJSON(mercadoPath, mercado);
        guardarJSON(inventariosPath, inventariosGlobales);

        return sock.sendMessage(jid, {
          text: `🎉 ¡Felicidades! Compraste con éxito a *${itemMercado.name}*. Ha sido añadida a tu inventario.`,
          mentions: [senderReal]
        });
      }

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error en el mercado." });
    }
  }
};