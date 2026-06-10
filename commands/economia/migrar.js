// Script de migración one-shot
// Ejecutar UNA VEZ: node migrar_json.js
// Fusiona entradas LID duplicadas con el número real en economia.json

import fs from "fs";
import path from "path";

const DB_PATH = path.resolve("./data/economia.json");
const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

// IDs que son claramente LIDs (>12 dígitos) y no números de teléfono reales
// Los números de teléfono reales tienen máx 15 dígitos pero típicamente 10-13
// Los LIDs de WhatsApp tienen 15 dígitos y son muy distintos a los teléfonos
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

// Mapeo manual conocido de LID → número real (del JSON actual)
// nombre igual = misma persona
const lidKeys = Object.keys(db.usuarios).filter(esLid);
const realKeys = Object.keys(db.usuarios).filter(k => !esLid(k));

console.log(`LIDs encontrados: ${lidKeys.join(", ")}`);
console.log(`Usuarios reales: ${realKeys.length}`);

let fusionados = 0;
let eliminados = 0;

for (const lid of lidKeys) {
  const lidUser = db.usuarios[lid];
  
  // Buscar por nombre igual entre usuarios reales
  const match = realKeys.find(rk => {
    const ru = db.usuarios[rk];
    return ru.nombre && lidUser.nombre && ru.nombre === lidUser.nombre;
  });

  if (match) {
    console.log(`✅ Fusionando LID ${lid} (${lidUser.nombre}) → ${match}`);
    mergeUsers(db.usuarios[match], lidUser);
    delete db.usuarios[lid];
    fusionados++;
  } else {
    // LID sin match por nombre — verificar si tiene datos útiles
    const tieneData = (lidUser.saldo || 0) > 0 || (lidUser.banco || 0) > 0 ||
      (lidUser.mascotas?.length || 0) > 0 || (lidUser.negocios?.length || 0) > 0;
    
    if (!tieneData) {
      console.log(`🗑️  Eliminando LID vacío ${lid} (${lidUser.nombre || "sin nombre"})`);
      delete db.usuarios[lid];
      eliminados++;
    } else {
      console.log(`⚠️  LID ${lid} (${lidUser.nombre}) tiene datos pero sin match — manteniendo`);
    }
  }
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`\n✅ Migración completa: ${fusionados} fusionados, ${eliminados} eliminados.`);