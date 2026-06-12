import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "../../config.js";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const COMMANDS_DIR = path.join(__dirname, "../../commands");
const ASSETS_DIR   = path.join(__dirname, "../../assets");

// ─── Metadatos de categorías (orden y presentación) ───────────────────────────
const CATEGORIAS = [
  { carpeta: "economia",     icon: "💰", label: "𝕰𝖈𝖔𝖓𝖔𝖒í𝖆"        },
  { carpeta: "juegos",       icon: "🎮", label: "𝕵𝖚𝖊𝖌𝖔𝖘"            },
  { carpeta: "ia",           icon: "🤖", label: "𝕴𝖓𝖙𝖊𝖑𝖎𝖌𝖊𝖓𝖈𝖎𝖆"     },
  { carpeta: "grupos",       icon: "👥", label: "𝕲𝖗𝖚𝖕𝖔𝖘"            },
  { carpeta: "admin",        icon: "🛡️", label: "𝕬𝖉𝖒𝖎𝖓"             },
  { carpeta: "descargas",    icon: "⬇️", label: "𝕯𝖊𝖘𝖈𝖆𝖗𝖌𝖆𝖘"         },
  { carpeta: "busqueda",     icon: "🔎", label: "𝕭ú𝖘𝖖𝖚𝖊𝖉𝖆"          },
  { carpeta: "emoji",        icon: "😀", label: "𝕰𝖒𝖔𝖏𝖎𝖘"            },
  { carpeta: "envia",        icon: "📨", label: "𝕰𝖓𝖛í𝖔𝖘"            },
  { carpeta: "eventos",      icon: "📅", label: "𝕰𝖛𝖊𝖓𝖙𝖔𝖘"           },
  { carpeta: "media",        icon: "🎵", label: "𝕸𝖊𝖉𝖎𝖆"             },
  { carpeta: "novedades",    icon: "📰", label: "𝕹𝖔𝖛𝖊𝖉𝖆𝖉𝖊𝖘"         },
  { carpeta: "nsfw",         icon: "🔞", label: "𝕹𝕾𝕱𝖂"              },
  { carpeta: "owner",        icon: "👑", label: "𝕺𝖜𝖓𝖊𝖗"             },
  { carpeta: "perfil",       icon: "👤", label: "𝕻𝖊𝖗𝖋𝖎𝖑"            },
  { carpeta: "personal",     icon: "📁", label: "𝕻𝖊𝖗𝖘𝖔𝖓𝖆𝖑"          },
  { carpeta: "stickers",     icon: "🖼️", label: "𝕾𝖙𝖎𝖈𝖐𝖊𝖗𝖘"         },
  { carpeta: "termux",       icon: "💻", label: "𝕿𝖊𝖗𝖒𝖚𝖝"            },
  { carpeta: "trabajos",     icon: "🛠️", label: "𝕿𝖗𝖆𝖇𝖆𝖏𝖔𝖘"         },
  { carpeta: "utilidades",   icon: "🔧", label: "𝖀𝖙𝖎𝖑𝖎𝖉𝖆𝖉𝖊𝖘"        },
  { carpeta: "info",         icon: "ℹ️",  label: "𝕴𝖓𝖋𝖔"             },
  { carpeta: "hackingetico", icon: "⭐", label: "𝕳𝖆𝖈𝖐𝖎𝖓𝖌 É𝖙𝖎𝖈𝖔"    },
];

// ─── Separadores estilo Mitsuri ───────────────────────────────────────────────
const TOP    = `꧁𖦹᭄🌸꧂━━━━━━━━━━━━━━━━━━━━━꧁🌸᭄𖦹꧂`;
const SEP    = `꧁⚔️᭄꧂━━━━━━━━━━━━━━━━━━━━━꧁᭄⚔️꧂`;
const BOTTOM = `꧁🌸᭄𖦹꧂━━━━━━━━━━━━━━━━━━━━━꧁𖦹᭄🌸꧂`;

// ─── Uptime ───────────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ─── Leer comandos de una carpeta (recursivo) ─────────────────────────────────
function getJsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      files.push(...getJsFiles(full));
    } else if (entry.endsWith(".js") && entry !== "index.js") {
      files.push(full);
    }
  }
  return files;
}

async function leerComandos(carpeta) {
  const dir   = path.join(COMMANDS_DIR, carpeta);
  const files = getJsFiles(dir);
  const cmds  = [];
  for (const filePath of files) {
    try {
      const mod = await import(`file://${filePath}?u=${Date.now()}`);
      const d   = mod.default;
      if (d?.name) {
        cmds.push({
          name: d.name,
          desc: d.description || d.desc || "",
        });
      }
    } catch {}
  }
  return cmds;
}

export default {
  name: "menu",
  aliases: ["m", "help", "c"],
  description: "Menú principal con todos los comandos",

  async run(sock, msg, args, jid) {
    const hora = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit", minute: "2-digit",
      day: "numeric", month: "long", year: "numeric",
    });

    const nombre  = msg.pushName || "usuario";
    const uptime  = formatUptime(process.uptime());
    const ramUsed = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(0);
    const ramTot  = (os.totalmem() / 1024 / 1024).toFixed(0);

    // Contar total de comandos (recursivo)
    let totalCmds = 0;
    for (const { carpeta } of CATEGORIAS) {
      totalCmds += getJsFiles(path.join(COMMANDS_DIR, carpeta)).length;
    }

    let txt = "";

    // ── Header ────────────────────────────────────────────────────────────────
    txt += `${TOP}\n`;
    txt += `\n`;
    txt += `  ⚔️ 𝑴𝑰𝑻𝑺𝑼𝑹𝑰 - 𝑩𝑶𝑻 🌸\n`;
    txt += `  ೃ⁀➷ _𝘓𝘢 𝘭𝘭𝘢𝘮𝘢 𝘢𝘮𝘰𝘳 𝘥𝘦𝘭 𝘢𝘣𝘪𝘴𝘮𝘰_ ❤️‍🔥\n`;
    txt += `\n`;
    txt += `${SEP}\n`;
    txt += `\n`;

    // ── Estado ────────────────────────────────────────────────────────────────
    txt += `┌─ 〘 ⚙️ 𝕰𝖘𝖙𝖆𝖉𝖔 〙 ─┐\n`;
    txt += `│: ̗̀➛ *Usuario* ꞉ ${nombre}\n`;
    txt += `│: ̗̀➛ *Prefijo* ꞉ \`${CONFIG.prefix}\`\n`;
    txt += `│: ̗̀➛ *Hora* ꞉ _${hora}_\n`;
    txt += `│: ̗̀➛ *Uptime* ꞉ \`${uptime}\`\n`;
    txt += `│: ̗̀➛ *RAM* ꞉ _${ramUsed}MB / ${ramTot}MB_\n`;
    txt += `│: ̗̀➛ *Comandos* ꞉ \`${totalCmds}\`\n`;
    txt += `└────────────────┘\n`;
    txt += `\n`;
    txt += `${SEP}\n`;

    // ── Secciones dinámicas ───────────────────────────────────────────────────
    for (const { carpeta, icon, label } of CATEGORIAS) {
      const cmds = await leerComandos(carpeta);
      if (!cmds.length) continue;

      txt += `\n`;
      txt += `${SEP}\n`;
      txt += `╭─ 〘 ${icon} ${label} 〙\n`;
      txt += `│\n`;

      for (const cmd of cmds) {
        txt += `│: ̗̀➛ \`${CONFIG.prefix}${cmd.name}\`\n`;
        if (cmd.desc) txt += `│  ╰┈➤ _${cmd.desc}_\n`;
        txt += `│\n`;
      }

      txt += `╰────────────────\n`;
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    txt += `\n`;
    txt += `${BOTTOM}\n`;
    txt += `  ⚔️ _𝘔𝘐𝘛𝘚𝘜𝘙𝘐-𝘉𝘖𝘛 — hecho con amor_ 🌸\n`;
    txt += `${BOTTOM}`;

    // ── Enviar con banner si existe ───────────────────────────────────────────
    const bannerPath = path.join(ASSETS_DIR, "menu.png");
    const tieneBanner = fs.existsSync(bannerPath);

    return sock.sendMessage(jid,
      tieneBanner
        ? { image: { url: bannerPath }, caption: txt }
        : { text: txt },
      { quoted: msg }
    );
  },
};
