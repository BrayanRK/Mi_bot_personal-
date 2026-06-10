import { reply } from "../../utils.js";
import { loadDB, saveDB } from "./db.js";

function mergeUsers(dest, src) {
  dest.saldo       = (dest.saldo  || 0) + (src.saldo  || 0);
  dest.banco       = (dest.banco  || 0) + (src.banco  || 0);
  dest.nombre      = dest.nombre || src.nombre;
  dest.lastDaily   = Math.max(dest.lastDaily   || 0, src.lastDaily   || 0);
  dest.lastTrabajo = Math.max(dest.lastTrabajo || 0, src.lastTrabajo || 0);
  dest.lastRobo    = Math.max(dest.lastRobo    || 0, src.lastRobo    || 0);
  dest.lastPesca   = Math.max(dest.lastPesca   || 0, src.lastPesca   || 0);
  dest.lastMina    = Math.max(dest.lastMina    || 0, src.lastMina    || 0);
  dest.lastCofre   = Math.max(dest.lastCofre   || 0, src.lastCofre   || 0);
  dest.lastNegocio = Math.max(dest.lastNegocio || 0, src.lastNegocio || 0);
  dest.lastMascota = Math.max(dest.lastMascota || 0, src.lastMascota || 0);
  dest.lastAtraco  = Math.max(dest.lastAtraco  || 0, src.lastAtraco  || 0);

  if (src.inversion && !dest.inversion) dest.inversion = src.inversion;

  if (Array.isArray(src.inventario)) {
    if (!Array.isArray(dest.inventario)) dest.inventario = [];
    dest.inventario.push(...src.inventario);
  }

  if (Array.isArray(src.mascotas)) {
    if (!Array.isArray(dest.mascotas)) dest.mascotas = [];
    for (const m of src.mascotas) {
      const ex = dest.mascotas.find(x => x.tipo === m.tipo);
      if (ex) ex.cantidad += m.cantidad;
      else dest.mascotas.push({ ...m });
    }
  }

  if (Array.isArray(src.negocios)) {
    if (!Array.isArray(dest.negocios)) dest.negocios = [];
    for (const n of src.negocios) {
      const ex = dest.negocios.find(x => x.tipo === n.tipo);
      if (ex) ex.cantidad += n.cantidad;
      else dest.negocios.push({ ...n });
    }
  }

  if (src.estadisticas && dest.estadisticas) {
    for (const k of Object.keys(src.estadisticas)) {
      dest.estadisticas[k] = (dest.estadisticas[k] || 0) + (src.estadisticas[k] || 0);
    }
  }
}

export default {
  name: "fusionar",

  async run(sock, msg, args, jid, isOwner) {
    if (!isOwner) return reply(sock, jid, "❌ Solo el dueño puede usar este comando.", msg);

    // .fusionar <idOrigen> <idDestino>
    // idOrigen: el LID o ID que se va a borrar
    // idDestino: el número real donde se fusiona

    if (args.length < 2) {
      return reply(sock, jid,
        `❌ Uso correcto:\n\n*.fusionar <idOrigen> <idDestino>*\n\nEjemplo:\n.fusionar 226697601396863 573223090406\n\nEl origen se fusiona en el destino y se borra.`,
        msg
      );
    }

    const origen  = args[0].replace(/\D/g, "");
    const destino = args[1].replace(/\D/g, "");

    if (!origen || !destino) return reply(sock, jid, "❌ IDs inválidos.", msg);
    if (origen === destino)  return reply(sock, jid, "❌ El origen y destino son iguales.", msg);

    const db = loadDB();

    if (!db.usuarios[origen]) return reply(sock, jid, `❌ No existe ningún usuario con ID *${origen}*.`, msg);

    const srcUser  = db.usuarios[origen];
    const destExiste = !!db.usuarios[destino];

    if (!destExiste) {
      // Si el destino no existe, simplemente renombrar la clave
      db.usuarios[destino] = srcUser;
    } else {
      mergeUsers(db.usuarios[destino], srcUser);
    }

    delete db.usuarios[origen];
    saveDB(db);

    const u = db.usuarios[destino];
    return reply(sock, jid,
      [
        `✅ *Fusión completada*`,
        ``,
        `📤 Origen: \`${origen}\` (${srcUser.nombre || "sin nombre"})`,
        `📥 Destino: \`${destino}\` ${destExiste ? "(fusionado)" : "(renombrado)"}`,
        ``,
        `💰 Saldo: $${u.saldo?.toLocaleString() || 0}`,
        `🏦 Banco: $${u.banco?.toLocaleString() || 0}`,
        `🐾 Mascotas: ${u.mascotas?.reduce((a, m) => a + m.cantidad, 0) || 0}`,
        `🏢 Negocios: ${u.negocios?.reduce((a, n) => a + n.cantidad, 0) || 0}`,
      ].join("\n"),
      msg
    );
  }
};