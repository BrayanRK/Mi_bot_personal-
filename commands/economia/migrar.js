import { reply } from "../../utils.js";
import { loadDB, saveDB } from "./db.js";

function esLid(id) {
  return /^\d{13,}$/.test(id);
}

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
  name: "migrardb",

  async run(sock, msg, args, jid, isOwner) {
    if (!isOwner) return reply(sock, jid, "❌ Solo el dueño puede usar este comando.", msg);

    const db = loadDB();
    const lidKeys  = Object.keys(db.usuarios).filter(esLid);
    const realKeys = Object.keys(db.usuarios).filter(k => !esLid(k));

    if (lidKeys.length === 0) {
      return reply(sock, jid, "✅ No hay entradas LID que migrar.", msg);
    }

    let fusionados = 0;
    let eliminados = 0;
    const sinMatch = [];
    const log = [];

    for (const lid of lidKeys) {
      const lidUser = db.usuarios[lid];

      const match = realKeys.find(rk => {
        const ru = db.usuarios[rk];
        return ru.nombre && lidUser.nombre && ru.nombre === lidUser.nombre;
      });

      if (match) {
        mergeUsers(db.usuarios[match], lidUser);
        delete db.usuarios[lid];
        fusionados++;
        log.push(`✅ ${lidUser.nombre || lid} fusionado`);
      } else {
        const tieneData =
          (lidUser.saldo || 0) > 0 || (lidUser.banco || 0) > 0 ||
          (lidUser.mascotas?.length || 0) > 0 || (lidUser.negocios?.length || 0) > 0;

        if (!tieneData) {
          delete db.usuarios[lid];
          eliminados++;
          log.push(`🗑️ ${lidUser.nombre || lid} eliminado (vacío)`);
        } else {
          sinMatch.push(`⚠️ ${lid} (${lidUser.nombre || "sin nombre"}) tiene datos pero sin match`);
        }
      }
    }

    saveDB(db);

    const lines = [
      "🔄 *Migración completada*",
      "",
      ...log,
      ...(sinMatch.length ? ["", ...sinMatch] : []),
      "",
      `✅ Fusionados: *${fusionados}*`,
      `🗑️ Eliminados: *${eliminados}*`,
      ...(sinMatch.length ? [`⚠️ Sin match: *${sinMatch.length}*`] : []),
    ];

    return reply(sock, jid, lines.join("\n"), msg);
  }
};
