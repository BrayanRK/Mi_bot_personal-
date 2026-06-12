import chalk from "chalk";

// ─── Paleta de colores ─────────────────────────────────────────────────────
const rosa    = chalk.hex("#ff6ec7");
const purpura = chalk.hex("#a18cd1");
const dorado  = chalk.hex("#ffd200");
const cielo   = chalk.hex("#66a6ff");
const verde   = chalk.hex("#7CFC00");
const gris    = chalk.gray;

// ─── Hora formateada ────────────────────────────────────────────────────────
function horaActual() {
  return new Date().toLocaleTimeString("es-CO", { hour12: false });
}

// ─── Mapeo de tipos a emoji + etiqueta bonita ─────────────────────────────
const TIPO_INFO = {
  "texto":          { emoji: "💬", label: "Texto"        },
  "textoExtendido": { emoji: "💬", label: "Texto"        },
  "imagen":         { emoji: "🖼️", label: "Imagen"       },
  "video":          { emoji: "🎬", label: "Video"        },
  "audio":          { emoji: "🎵", label: "Audio"        },
  "sticker":        { emoji: "🌟", label: "Sticker"      },
  "📄 DOCUMENTO":   { emoji: "📄", label: "Documento"    },
  "protocol":       { emoji: "📍", label: "Sistema"      },
  "vacío":          { emoji: "❔", label: "Vacío"        },
  "desconocido":    { emoji: "❓", label: "Desconocido"  },
};

/**
 * Logger principal estilo "Mitsuri" para cada mensaje entrante.
 *
 * @param {object} opts
 * @param {string} opts.sender   - JID del remitente (ej: 573223090406@s.whatsapp.net)
 * @param {string} opts.jid      - JID del chat (grupo o privado)
 * @param {string} opts.pushName - Nombre visible en WhatsApp
 * @param {string} opts.tipo     - Tipo detectado por getMsgInfo
 * @param {string} opts.detalle  - Detalle/preview del mensaje
 * @param {boolean} opts.isGroup - Si es un grupo
 * @param {string} [opts.groupName] - Nombre del grupo (si aplica)
 */
export function logMensaje({ sender, jid, pushName, tipo, detalle, isGroup, groupName }) {
  const hora    = horaActual();
  const numero  = (sender || "").split("@")[0];
  const info    = TIPO_INFO[tipo] || { emoji: "📦", label: tipo };

  const chatLabel = isGroup
    ? `${gris("Grupo:")} ${dorado(groupName || jid.split("@")[0])}`
    : `${gris("Privado")}`;

  console.log(
    `${cielo("┌─")} ${rosa("✦")} ${dorado(`+${numero}`)} ${gris("~")}${verde(pushName || "Desconocido")} ${gris(hora)}\n` +
    `${cielo("│")}  ${gris("📍")} ${purpura(chatLabel)}\n` +
    `${cielo("│")}  ${gris("🆔")} ${info.emoji} ${rosa(info.label)}\n` +
    `${cielo("└─")} ${gris("›")} ${chalk.white(detalle || "")}`
  );
  console.log("");
}

/**
 * Logger para ejecución de comandos.
 */
export function logComando(cmd, args) {
  const hora = horaActual();
  console.log(
    `${dorado("   ⚡")} ${chalk.bold.white(`.${cmd}`)} ${gris(args.join(" "))} ${gris(`(${hora})`)}`
  );
}

/**
 * Logger de errores con formato bonito.
 */
export function logError(titulo, error) {
  console.log(
    `${chalk.red("┌─")} ${chalk.red.bold("❌ ERROR")} ${gris("›")} ${chalk.red(titulo)}\n` +
    `${chalk.red("└─")} ${gris(error?.message || error)}`
  );
}

/**
 * Banner de conexión exitosa.
 */
export function logConectado(botName) {
  console.log("");
  console.log(verde(`  ✅ ${botName} conectado y listo para operar`));
  console.log("");
}