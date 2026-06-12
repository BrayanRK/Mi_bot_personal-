import { loadDB, saveDB, getUser, fmt, numId, TIENDA, MASCOTAS_IDS, NEGOCIOS_IDS } from "./db.js";

// ─── Duración de items con expiración (ms) ───────────────────────────────────
const DURACION = {
  escudo: 24 * 60 * 60 * 1000,
  vip:     7 * 24 * 60 * 60 * 1000,
  seguro: 48 * 60 * 60 * 1000,
};

// ─── Usos de items con carga ──────────────────────────────────────────────────
const USOS = {
  pico:    3,
  dados:   5,
  amuleto: 5,
  elixir:  1,
};

// ─── Aliases cortos para no escribir tanto ────────────────────────────────────
const ALIASES_ITEM = {
  // cofres gacha
  "cgc":        "cofregacha_comun",
  "cgr":        "cofregacha_raro",
  "cgl":        "cofregacha_legendario",
  "cofrecomun": "cofregacha_comun",
  "cofreraro":  "cofregacha_raro",
  "cofrelegendario": "cofregacha_legendario",
  // cajas
  "cc":  "cajacomun",
  "cr":  "cajarara",
  "cl":  "cajalegendaria",
  "cm":  "cajamistica",
  // mascotas
  "per": "perro",
  "gat": "gato",
  "zor": "zorro",
  "dra": "dragon",
  "fen": "fenix",
  "uni": "unicornio",
  // negocios
  "pus": "puesto",
  "tie": "tienda",
  "emp": "empresa",
  "fab": "fabrica",
  "ban": "banco_neg",
  "cas": "casino",
};

const COFRES_GACHA_IDS = ["cofregacha_comun", "cofregacha_raro", "cofregacha_legendario"];

export default {
  name: "comprar",
  aliases: ["buy", "shop"],
  description: "Comprar items, mascotas, negocios o cofres gacha de la tienda",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
    const db   = loadDB();
    const id   = numId(sender);
    const user = getUser(db, id);

    // Resolver alias corto si aplica
    const rawId  = args[0]?.toLowerCase();
    const itemId = rawId ? (ALIASES_ITEM[rawId] ?? rawId) : null;
    const cantidad = Math.min(Math.max(parseInt(args[1]) || 1, 1), 10);

    // ── Sin argumento → mostrar tienda ───────────────────────────────────────
    if (!itemId) {
      const mascotas = TIENDA.filter(i => MASCOTAS_IDS.includes(i.id));
      const negocios = TIENDA.filter(i => NEGOCIOS_IDS.includes(i.id));
      const cofresG  = TIENDA.filter(i => COFRES_GACHA_IDS.includes(i.id));
      const cajas    = TIENDA.filter(i => i.id.startsWith("caja"));
      const items    = TIENDA.filter(i =>
        !MASCOTAS_IDS.includes(i.id) &&
        !NEGOCIOS_IDS.includes(i.id) &&
        !COFRES_GACHA_IDS.includes(i.id) &&
        !i.id.startsWith("caja")
      );

      let txt = `🛒 *Tienda* — 💵 Saldo: ${fmt(user.saldo)}\n`;
      txt += `> Uso: *.comprar <id> [cantidad]*\n\n`;

      txt += `🐾 *Mascotas*\n`;
      mascotas.forEach(i => txt += `  • \`${i.id}\` — ${i.nombre} ${fmt(i.precio)}\n`);

      txt += `\n🏢 *Negocios*\n`;
      negocios.forEach(i => txt += `  • \`${i.id}\` — ${i.nombre} ${fmt(i.precio)}\n`);

      txt += `\n🎒 *Items*\n`;
      items.forEach(i => txt += `  • \`${i.id}\` — ${i.nombre} ${fmt(i.precio)}\n`);

      txt += `\n📦 *Cajas*\n`;
      cajas.forEach(i => txt += `  • \`${i.id}\` — ${i.nombre} ${fmt(i.precio)}\n`);

      txt += `\n🎴 *Cofres Gacha*\n`;
      cofresG.forEach(i => txt += `  • \`${i.id}\` — ${i.nombre} ${fmt(i.precio)}\n`);

      txt += `\n> ⚡ *Atajos rápidos:*\n`;
      txt += `  cgc/cgr/cgl — cofres gacha\n`;
      txt += `  cc/cr/cl/cm — cajas\n`;
      txt += `  per/gat/zor/dra/fen/uni — mascotas\n`;
      txt += `  pus/tie/emp/fab/ban/cas — negocios`;

      return send(txt);
    }

    // ── Verificar que el item exista ─────────────────────────────────────────
    const item = TIENDA.find(i => i.id === itemId);
    if (!item) return send(`❌ Item *${rawId}* no existe.\nUsa *.comprar* para ver la lista.`);

    const costoTotal = item.precio * cantidad;

    if (user.saldo < costoTotal) {
      return send(
        `❌ Saldo insuficiente.\n` +
        `💵 Tienes: ${fmt(user.saldo)}\n` +
        `💰 Necesitas: ${fmt(costoTotal)}` +
        (cantidad > 1 ? ` (${cantidad}x ${fmt(item.precio)})` : "")
      );
    }

    // ── MASCOTAS ─────────────────────────────────────────────────────────────
    if (MASCOTAS_IDS.includes(itemId)) {
      if (!Array.isArray(user.mascotas)) user.mascotas = [];
      const entrada = user.mascotas.find(m => m.tipo === itemId);
      if (entrada) entrada.cantidad += cantidad;
      else user.mascotas.push({ tipo: itemId, cantidad, compradoEn: Date.now() });

      user.saldo -= costoTotal;
      saveDB(db);

      const total = user.mascotas.find(m => m.tipo === itemId)?.cantidad || cantidad;
      return send(
        `✅ *${cantidad}x ${item.nombre}* comprado!\n` +
        `💸 ${fmt(costoTotal)} — 💵 Saldo: ${fmt(user.saldo)}\n` +
        `🐾 Total: *${total}* | Cobra con *.mascota*`
      );
    }

    // ── NEGOCIOS ─────────────────────────────────────────────────────────────
    if (NEGOCIOS_IDS.includes(itemId)) {
      if (!Array.isArray(user.negocios)) user.negocios = [];
      const entrada = user.negocios.find(n => n.tipo === itemId);
      if (entrada) entrada.cantidad += cantidad;
      else user.negocios.push({ tipo: itemId, cantidad, compradoEn: Date.now() });

      user.saldo -= costoTotal;
      saveDB(db);

      const total = user.negocios.find(n => n.tipo === itemId)?.cantidad || cantidad;
      return send(
        `✅ *${cantidad}x ${item.nombre}* comprado!\n` +
        `💸 ${fmt(costoTotal)} — 💵 Saldo: ${fmt(user.saldo)}\n` +
        `🏢 Total: *${total}* | Cobra con *.negocio*`
      );
    }

    // ── INVENTARIO (cajas, cofres gacha, items) ───────────────────────────────
    user.saldo -= costoTotal;
    if (!Array.isArray(user.inventario)) user.inventario = [];

    for (let i = 0; i < cantidad; i++) {
      const entrada = { id: itemId, compradoEn: Date.now() };
      if (DURACION[itemId]) entrada.expira = Date.now() + DURACION[itemId];
      if (USOS[itemId])     entrada.usos   = USOS[itemId];
      user.inventario.push(entrada);
    }

    saveDB(db);

    let extra = "";
    if (DURACION[itemId]) {
      const horas = DURACION[itemId] / (60 * 60 * 1000);
      extra = `\n⏳ Activo por: *${horas >= 24 ? `${horas / 24} días` : `${horas}h`}*`;
    }
    if (USOS[itemId]) extra = `\n🔢 Usos: *${USOS[itemId] * cantidad}*`;

    // Mensaje especial para cofres gacha
    if (COFRES_GACHA_IDS.includes(itemId)) {
      const restantes = user.inventario.filter(i => i.id === itemId).length;
      return send(
        `✅ *${cantidad}x ${item.nombre}* comprado!\n` +
        `💸 ${fmt(costoTotal)} — 💵 Saldo: ${fmt(user.saldo)}\n` +
        `🎴 Tienes *${restantes}* en inventario\n` +
        `> Ábrelo con *.abrircofre ${itemId.replace("cofregacha_", "")}*`
      );
    }

    return send(
      `✅ *${cantidad}x ${item.nombre}* comprado!\n` +
      `💸 ${fmt(costoTotal)} — 💵 Saldo: ${fmt(user.saldo)}` +
      extra
    );
  },
};
