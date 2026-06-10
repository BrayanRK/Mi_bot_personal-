import fs from "fs";
import path from "path";
import { normalizeJid } from "../utilidades/permisos.js";

const inventariosPath = path.join(process.cwd(), "data", "inventarios.json");

function leerJSON(ruta, defecto = {}) {
  if (!fs.existsSync(ruta)) return defecto;
  return JSON.parse(fs.readFileSync(ruta, "utf-8"));
}

function guardarJSON(ruta, datos) {
  fs.writeFileSync(ruta, JSON.stringify(datos, null, 2), "utf-8");
}

export default {
  name: "regalar",
  aliases: ["give", "donar", "transferir"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      if (!isGroup) {
        return sock.sendMessage(jid, { text: "❌ Este comando solo se puede usar dentro de grupos." });
      }

      const menciones = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const citado = msg?.message?.extendedTextMessage?.contextInfo?.participant || "";
      
      let receptorJid = menciones[0] || citado || "";
      
      if (!receptorJid) {
        return sock.sendMessage(jid, { 
          text: "❌ Debes mencionar a alguien (`@tag`) o responder a su mensaje para regalarle una carta." 
        });
      }

      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];
      const receptorId = normalizeJid(receptorJid).split("@")[0];

      if (usuarioId === receptorId) {
        return sock.sendMessage(jid, { text: "❌ No puedes regalarte una carta a ti mismo." });
      }

      const nombreCarta = args.filter(arg => !arg.includes("@")).join(" ")?.trim();
      
      if (!nombreCarta) {
        return sock.sendMessage(jid, { 
          text: "❌ Especifica el nombre de la carta que deseas regalar.\nUso: *.regalar @tag [Nombre de la carta]*" 
        });
      }

      const inventariosGlobales = leerJSON(inventariosPath, {});
      const miInventario = inventariosGlobales[usuarioId] || [];

      const indexCarta = miInventario.findIndex(p => p.name.toLowerCase() === nombreCarta.toLowerCase());

      if (indexCarta === -1) {
        return sock.sendMessage(jid, { text: `❌ No tienes a *${nombreCarta}* en tu inventario.` });
      }

      const [cartaRegalada] = miInventario.splice(indexCarta, 1);

      if (!inventariosGlobales[receptorId]) {
        inventariosGlobales[receptorId] = [];
      }

      inventariosGlobales[receptorId].push({
        name: cartaRegalada.name,
        rarity: cartaRegalada.rarity,
        attack: cartaRegalada.attack,
        defense: cartaRegalada.defense,
        health: cartaRegalada.health,
        image: cartaRegalada.image,
        fecha: new Date().toISOString()
      });

      inventariosGlobales[usuarioId] = miInventario;

      guardarJSON(inventariosPath, inventariosGlobales);

      return sock.sendMessage(jid, {
        text: `🎁 ¡@${usuarioId} le ha regalado la carta *${cartaRegalada.name}* (${cartaRegalada.rarity}) a @${receptorId}! 🎉`,
        mentions: [senderReal, receptorJid]
      });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al intentar regalar la carta." });
    }
  }
};