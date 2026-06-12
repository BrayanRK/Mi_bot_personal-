// commands/economia/mercadogacha.js
import { loadDB, saveDB, getUser, fmt, numId } from "./db.js";

const COLOR_RARITY = { SSR: "🌟", SR: "✨", R: "🔹" };
const EMOJI_RARITY = { SSR: "⭐⭐⭐", SR: "⭐⭐", R: "⭐" };

// Precio mínimo por rareza
const PRECIO_MIN = { SSR: 10000, SR: 2000, R: 500 };

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function ordenarColeccion(col) {
  const orden = { SSR: 0, SR: 1, R: 2 };
  return [...col].sort((a, b) => {
    if (orden[a.rarity] !== orden[b.rarity]) return orden[a.rarity] - orden[b.rarity];
    return a.nombre.localeCompare(b.nombre);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUBCOMANDOS
// ─────────────────────────────────────────────────────────────────────────────

/** .mercadogacha  —  ver listado del mercado */
async function cmdListar(sock, msg, chatId, db, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const mercado = db.mercadoGacha || [];
  if (mercado.length === 0) {
    return send([
      `🏪 *MERCADO GACHA*`,
      ``,
      `📭 El mercado está vacío.`,
      ``,
      `Vende un personaje con:`,
      `*.mercadogacha vender <número> <precio>*`,
    ].join("\n"));
  }

  const pagSize = 15;
  const pag     = Math.max(1, parseInt(args[1]) || 1);
  const pages   = Math.ceil(mercado.length / pagSize);
  const slice   = mercado.slice((pag - 1) * pagSize, pag * pagSize);

  const lineas = [
    `🏪 *MERCADO GACHA*`,
    `📋 ${mercado.length} oferta(s)  •  Página ${pag}/${pages}`,
    ``,
  ];

  slice.forEach((oferta, i) => {
    const num = (pag - 1) * pagSize + i + 1;
    lineas.push(
      `${String(num).padStart(2, " ")}. ${COLOR_RARITY[oferta.rarity]} *${oferta.nombre}* [${oferta.rarity}]`
    );
    lineas.push(`    💰 ${fmt(oferta.precio)}  •  🧑 ${oferta.vendedorNombre}`);
  });

  lineas.push(``, `> *.mercadogacha comprar <número>* para comprar`);
  if (pages > 1) lineas.push(`> *.mercadogacha ${pag + 1}* para siguiente página`);

  return send(lineas.join("\n"));
}

/** .mercadogacha vender <número de colección> <precio>  */
async function cmdVender(sock, msg, chatId, user, id, db, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const numStr   = args[1];
  const precioStr = args[2];

  if (!numStr || !precioStr) {
    return send([
      `❌ Uso: *.mercadogacha vender <número> <precio>*`,
      ``,
      `Primero mira tu colección con *.gacha coleccion*`,
      `El número es la posición del personaje en esa lista.`,
    ].join("\n"));
  }

  // Validar número
  const numIdx = parseInt(numStr);
  if (isNaN(numIdx) || numIdx < 1) {
    return send(`❌ Número inválido. Usa *.gacha coleccion* para ver los números.`);
  }

  // Validar precio
  const precio = parseInt(precioStr.replace(/[^0-9]/g, ""));
  if (isNaN(precio) || precio <= 0) {
    return send(`❌ Precio inválido. Escribe solo el número, ej: *5000*`);
  }

  // Colección ordenada igual que en .gacha coleccion
  const col = Array.isArray(user.gacha) ? ordenarColeccion(user.gacha) : [];
  if (col.length === 0) {
    return send(`📭 No tienes personajes. Usa *.gacha* para conseguirlos.`);
  }

  const personaje = col[numIdx - 1];
  if (!personaje) {
    return send(`❌ No existe el número *${numIdx}*. Tienes *${col.length}* personajes.`);
  }

  // Precio mínimo
  const minPrecio = PRECIO_MIN[personaje.rarity] || 500;
  if (precio < minPrecio) {
    return send(`❌ Precio mínimo para *${personaje.rarity}* es *${fmt(minPrecio)}*.`);
  }

  // Quitar 1 carta de la colección
  const enColeccion = user.gacha.find(p => p.nombre === personaje.nombre);
  if (!enColeccion || (enColeccion.cantidad || 1) < 1) {
    return send(`❌ No tienes ese personaje.`);
  }

  enColeccion.cantidad = (enColeccion.cantidad || 1) - 1;
  if (enColeccion.cantidad <= 0) {
    user.gacha = user.gacha.filter(p => p.nombre !== personaje.nombre);
  }

  // Agregar al mercado
  if (!Array.isArray(db.mercadoGacha)) db.mercadoGacha = [];
  db.mercadoGacha.push({
    id:              Date.now().toString(),
    nombre:          personaje.nombre,
    rarity:          personaje.rarity,
    precio,
    vendedorId:      id,
    vendedorNombre:  user.nombre || `+${id}`,
    puestoEn:        Date.now(),
  });

  saveDB(db);

  return send([
    `✅ *Personaje puesto en venta*`,
    ``,
    `${COLOR_RARITY[personaje.rarity]} *${personaje.nombre}* [${personaje.rarity}]`,
    `💰 Precio: *${fmt(precio)}*`,
    ``,
    `Ver mercado: *.mercadogacha*`,
  ].join("\n"));
}

/** .mercadogacha comprar <número del mercado>  */
async function cmdComprar(sock, msg, chatId, user, id, db, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const numStr = args[1];
  if (!numStr) {
    return send(`❌ Uso: *.mercadogacha comprar <número>*\n\nVe el mercado con *.mercadogacha*`);
  }

  const numIdx = parseInt(numStr);
  if (isNaN(numIdx) || numIdx < 1) {
    return send(`❌ Número inválido.`);
  }

  if (!Array.isArray(db.mercadoGacha) || db.mercadoGacha.length === 0) {
    return send(`📭 El mercado está vacío.`);
  }

  const oferta = db.mercadoGacha[numIdx - 1];
  if (!oferta) {
    return send(`❌ No existe la oferta *${numIdx}*. El mercado tiene *${db.mercadoGacha.length}* oferta(s).`);
  }

  // No puedes comprarte a ti mismo
  if (oferta.vendedorId === id) {
    return send(`❌ No puedes comprar tu propia oferta.\nUsa *.mercadogacha cancelar ${numIdx}* para retirarla.`);
  }

  // Verificar saldo
  if (user.saldo < oferta.precio) {
    return send([
      `❌ Saldo insuficiente.`,
      `💵 Tienes: *${fmt(user.saldo)}*`,
      `💰 Necesitas: *${fmt(oferta.precio)}*`,
    ].join("\n"));
  }

  // Transferencia
  user.saldo -= oferta.precio;

  // Pagar al vendedor
  const vendedor = getUser(db, oferta.vendedorId);
  vendedor.saldo += oferta.precio;

  // Dar personaje al comprador
  if (!Array.isArray(user.gacha)) user.gacha = [];
  const existe = user.gacha.find(p => p.nombre === oferta.nombre);
  if (existe) {
    existe.cantidad = (existe.cantidad || 1) + 1;
  } else {
    user.gacha.push({ nombre: oferta.nombre, rarity: oferta.rarity, cantidad: 1 });
  }

  // Quitar del mercado
  db.mercadoGacha.splice(numIdx - 1, 1);

  saveDB(db);

  return send([
    `✅ *¡Compra exitosa!*`,
    ``,
    `${COLOR_RARITY[oferta.rarity]} *${oferta.nombre}* [${oferta.rarity}]`,
    `💸 Pagaste: *${fmt(oferta.precio)}*`,
    `💵 Saldo restante: *${fmt(user.saldo)}*`,
    ``,
    `> El vendedor *${oferta.vendedorNombre}* recibió el pago.`,
  ].join("\n"));
}

/** .mercadogacha cancelar <número del mercado>  — retira tu propia oferta */
async function cmdCancelar(sock, msg, chatId, user, id, db, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const numStr = args[1];
  if (!numStr) return send(`❌ Uso: *.mercadogacha cancelar <número>*`);

  const numIdx = parseInt(numStr);
  if (isNaN(numIdx) || numIdx < 1) return send(`❌ Número inválido.`);

  if (!Array.isArray(db.mercadoGacha) || db.mercadoGacha.length === 0) {
    return send(`📭 El mercado está vacío.`);
  }

  const oferta = db.mercadoGacha[numIdx - 1];
  if (!oferta) return send(`❌ No existe la oferta *${numIdx}*.`);

  if (oferta.vendedorId !== id) {
    return send(`❌ Esa oferta no es tuya.`);
  }

  // Devolver personaje
  if (!Array.isArray(user.gacha)) user.gacha = [];
  const existe = user.gacha.find(p => p.nombre === oferta.nombre);
  if (existe) {
    existe.cantidad = (existe.cantidad || 1) + 1;
  } else {
    user.gacha.push({ nombre: oferta.nombre, rarity: oferta.rarity, cantidad: 1 });
  }

  db.mercadoGacha.splice(numIdx - 1, 1);
  saveDB(db);

  return send([
    `✅ Oferta cancelada.`,
    ``,
    `${COLOR_RARITY[oferta.rarity]} *${oferta.nombre}* devuelto a tu colección.`,
  ].join("\n"));
}

/** .mercadogacha mis  — tus ofertas activas */
async function cmdMis(sock, msg, chatId, id, db) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const mercado = db.mercadoGacha || [];
  const mias    = mercado
    .map((o, i) => ({ ...o, posicion: i + 1 }))
    .filter(o => o.vendedorId === id);

  if (mias.length === 0) {
    return send(`📭 No tienes ofertas activas.\n\nVende con *.mercadogacha vender <número> <precio>*`);
  }

  const lineas = [`📋 *TUS OFERTAS EN EL MERCADO*`, ``];
  mias.forEach(o => {
    lineas.push(`#${o.posicion} ${COLOR_RARITY[o.rarity]} *${o.nombre}* [${o.rarity}] — 💰 ${fmt(o.precio)}`);
  });
  lineas.push(``, `> *.mercadogacha cancelar <número>* para retirar`);

  return send(lineas.join("\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default {
  name: "mercadogacha",
  aliases: ["mgacha", "mg"],
  description: "Mercado de personajes gacha",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    // Migración segura
    if (!Array.isArray(user.gacha))      user.gacha      = [];
    if (!Array.isArray(db.mercadoGacha)) db.mercadoGacha = [];

    const sub = args[0]?.toLowerCase();

    if (!sub || !isNaN(parseInt(sub))) {
      // .mercadogacha  o  .mercadogacha 2  (página)
      return cmdListar(sock, msg, chatId, db, args);
    }

    if (sub === "vender"  || sub === "sell")    return cmdVender(sock, msg, chatId, user, id, db, args);
    if (sub === "comprar" || sub === "buy")      return cmdComprar(sock, msg, chatId, user, id, db, args);
    if (sub === "cancelar"|| sub === "cancel")   return cmdCancelar(sock, msg, chatId, user, id, db, args);
    if (sub === "mis"     || sub === "mios")     return cmdMis(sock, msg, chatId, id, db);

    // Ayuda
    return sock.sendMessage(chatId, {
      text: [
        `🏪 *MERCADO GACHA*`,
        ``,
        `• *.mercadogacha*                     — Ver ofertas`,
        `• *.mercadogacha 2*                   — Página 2, 3...`,
        `• *.mercadogacha vender <nº> <precio>* — Vender un personaje`,
        `• *.mercadogacha comprar <nº>*         — Comprar una oferta`,
        `• *.mercadogacha cancelar <nº>*        — Retirar tu oferta`,
        `• *.mercadogacha mis*                  — Ver tus ofertas`,
        ``,
        `> El nº de vender viene de *.gacha coleccion*`,
        `> El nº de comprar viene de *.mercadogacha*`,
      ].join("\n")
    }, { quoted: msg });
  },
};