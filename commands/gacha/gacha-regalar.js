import fs from "fs";
import path from "path";
import { normalizeJid } from "../../utilidades/permisos.js";

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
  aliases: ["dar", "trade", "transferir"],
  run: async (sock, msg, args, jid, isOwner, isGroup, sender) => {
    try {
      const senderReal = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
      const usuarioId = normalizeJid(senderReal).split("@")[0];

      let mencionadoJid = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      
      if (!mencionadoJid && msg?.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        mencionadoJid = msg.message.extendedTextMessage.contextInfo.participant || "";
      }

      if (!mencionadoJid) {
        return sock.sendMessage(jid, { text: "❌ Debes mencionar o responder al mensaje de alguien para regalarle una carta. Ejemplo: *.regalar @user Naruto*" });
      }

      const destinoId = normalizeJid(mencionadoJid).split("@")[0];

      if (usuarioId === destinoId) {
        return sock.sendMessage(jid, { text: "❌ No puedes regalarte una carta a ti mismo." });
      }

      const nombrePersonaje = args.filter(arg => !arg.includes("@")).join(" ");

      if (!nombrePersonaje) {
        return sock.sendMessage(jid, { text: "❌ Especifica el nombre de la carta que quieres regalar. Ejemplo: *.regalar @user Naruto*" });
      }

      const inventariosGlobales = leerJSON(inventariosPath, {});
      const miInventario = inventariosGlobales[usuarioId] || [];

      const indexCarta = miInventario.findIndex(c => c.name.toLowerCase() === nombrePersonaje.toLowerCase());

      if (indexCarta === -1) {
        return sock.sendMessage(jid, { text: `❌ No tienes a *${nombrePersonaje}* en tu inventario.` });
      }

      const [cartaRegalada] = miInventario.splice(indexCarta, 1);

      if (!inventariosGlobales[destinoId]) {
        inventariosGlobales[destinoId] = [];
      }

      inventariosGlobales[destinoId].push(cartaRegalada);
      inventariosGlobales[usuarioId] = miInventario;

      guardarJSON(inventariosPath, inventariosGlobales);

      return sock.sendMessage(jid, {
        text: `🎁 ¡Regalo enviado!\n\n👤 @${usuarioId} le ha regalado a @${destinoId} la carta:\n🃏 *${cartaRegalada.name}* [${cartaRegalada.rarity}]`,
        mentions: [senderReal, mencionadoJid]
      });

    } catch (e) {
      console.error(e);
      return sock.sendMessage(jid, { text: "❌ Ocurrió un error al intentar regalar la carta." });
    }
  }
};