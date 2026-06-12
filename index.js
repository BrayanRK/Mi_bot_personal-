import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from "fsociety-Baileys";
import fs from "fs-extra";
import readline from "readline";
import { CONFIG, TEMP_DIR } from "./config.js";
import loadCommands from "./commands/loader.js";
import { reply, grupoPermitido, react } from "./utils.js";
import { getSender, isOwner as checkIsOwner } from "./commands/utilidades/permisos.js";
import { checkAntiLink } from "./commands/admin/antilink.js";
import { checkAutoForward } from "./commands/eventos/AutoForward.js";
import { setupWelcomeEvent } from "./commands/eventos/Welcome.js";
import { setupAutoPromote } from "./commands/eventos/autoPromote.js";
import { checkAntispam } from "./commands/admin/antispam.js";
import { sesiones } from "./sessions.js";
import "dotenv/config";
import { iniciarCronBuenasNoches } from "./commands/ia/buenasnoches.js";
import { setupGoodbyeEvent } from "./commands/eventos/goodbye.js";
import iaCmd from "./commands/ia/ia.js";
import { estado } from "./commands/owner/mantenimiento.js";
import { getSesionJuego } from "./commands/juegos/numjuego.js";
import { loadDB, saveDB, getUser, saveNombre, numId } from "./commands/economia/db.js";
import { logMensaje, logComando, logConectado } from "./logger.js";
// ─── Constantes ───────────────────────────────────────────────────────────────
const MSG_STORE_LIMIT      = 1000;
const SESSION_FILE         = "./session_phone.json";
const MAX_RETRIES          = 5;
const BASE_RECONNECT_DELAY = 3000;

// ─── Logger completamente silencioso ─────────────────────────────────────────
function crearLoggerSilencioso() {
  const noop = () => {};
  const logger = {
    level: "silent",
    trace: noop, debug: noop, info: noop,
    warn:  noop, error: noop, fatal: noop,
  };
  logger.child = () => logger;
  return logger;
}

// ─── Estado global ────────────────────────────────────────────────────────────
let sock               = null;
let reconnectTimer     = null;
let sessionRetries     = 0;
let eventosRegistrados = false;
let commands           = {};

const mensajesProcesados = new Set();

// ─── Cache de metadata de grupos (evita rate-overlimit de WhatsApp) ──────────
const GROUP_META_TTL = 5 * 60 * 1000; // 5 minutos
const groupMetaCache = new Map();

async function getGroupMetadataCached(jid) {
  const cached = groupMetaCache.get(jid);
  if (cached && Date.now() - cached.time < GROUP_META_TTL) {
    return cached.data;
  }
  try {
    const data = await sock.groupMetadata(jid);
    groupMetaCache.set(jid, { data, time: Date.now() });
    return data;
  } catch (e) {
    // Si falla y hay cache vencido, usar el viejo como fallback
    if (cached) return cached.data;
    throw e;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
await fs.ensureDir(TEMP_DIR);
commands = await loadCommands();
console.log(`✅ ${Object.keys(commands).length} comandos cargados:`, Object.keys(commands).join(", "));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function askQuestion(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

async function getPhoneNumber() {
  if (await fs.pathExists(SESSION_FILE)) {
    try {
      const data = JSON.parse(await fs.readFile(SESSION_FILE, "utf8"));
      if (data.phone) return data.phone;
    } catch {}
  }

  console.log("\n╔════════════════════════════════════════╗");
  console.log("   🤖  BOT — Configuración inicial         ");
  console.log("╚════════════════════════════════════════╝\n");
  console.log("  Solo necesitas hacer esto UNA VEZ.\n");

  let number = "";
  while (!number || !/^\d{10,15}$/.test(number)) {
    number = await askQuestion("  📱 Tu número (con código de país, sin +):\n  Ej: 573XXXXXXXXX → ");
    if (!/^\d{10,15}$/.test(number)) console.log("  ❌ Número inválido, intenta de nuevo.\n");
  }

  await fs.writeFile(SESSION_FILE, JSON.stringify({ phone: number }, null, 2));
  console.log(`\n  ✅ Número guardado: ${number}\n`);
  return number;
}

async function clearSession() {
  try {
    if (await fs.pathExists(CONFIG.sessionDir)) {
      await fs.remove(CONFIG.sessionDir);
      console.log("🗑️  Sesión borrada.");
    }
    await fs.ensureDir(CONFIG.sessionDir);
  } catch (e) {
    console.error("No se pudo borrar la sesión:", e.message);
  }
}

function destroySock() {
  if (!sock) return;
  try { sock.ev.removeAllListeners(); } catch {}
  try { sock.ws?.terminate();          } catch {}
  try { sock.end(undefined);           } catch {}
  sock = null;
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, sessionRetries - 1), 30_000);
  console.log(`⏳ Reconectando en ${(delay / 1000).toFixed(1)}s... (intento ${sessionRetries}/${MAX_RETRIES})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startBot();
  }, delay);
}

// ─── Detección de tipo y body del mensaje ─────────────────────────────────────
function getMsgInfo(msg) {
  const m = msg.message;
  if (!m) return { tipo: "vacío", detalle: "", body: "" };

  const body =
    m.conversation                    ||
    m.extendedTextMessage?.text       ||
    m.imageMessage?.caption           ||
    m.videoMessage?.caption           ||
    "";

  if (m.documentMessage)     return { tipo: "📄 DOCUMENTO",  detalle: m.documentMessage.fileName || "sin_nombre",            body };
  if (m.conversation)        return { tipo: "texto",          detalle: m.conversation.slice(0, 80),                           body };
  if (m.extendedTextMessage) return { tipo: "textoExtendido", detalle: m.extendedTextMessage.text.slice(0, 80),               body };
  if (m.imageMessage)        return { tipo: "imagen",         detalle: m.imageMessage.caption?.slice(0, 80) || "sin caption", body };
  if (m.videoMessage)        return { tipo: "video",          detalle: m.videoMessage.caption?.slice(0, 80) || "sin caption", body };
  if (m.audioMessage)        return { tipo: "audio",          detalle: "audio",                                               body };
  if (m.stickerMessage)      return { tipo: "sticker",        detalle: "sticker",                                             body };
  if (m.protocolMessage)     return { tipo: "protocol",       detalle: "mensaje sistema",                                     body };

  return { tipo: "desconocido", detalle: "", body };
}

// ─── Bot ──────────────────────────────────────────────────────────────────────
async function startBot() {
  destroySock();

  const PHONE_NUMBER = await getPhoneNumber();
  await fs.ensureDir(CONFIG.sessionDir);

  let state, saveCreds;
  try {
    ({ state, saveCreds } = await useMultiFileAuthState(CONFIG.sessionDir));
  } catch (e) {
    console.error("❌ Sesión corrupta:", e.message);
    if (sessionRetries < MAX_RETRIES) {
      sessionRetries++;
      await clearSession();
      scheduleReconnect();
    } else {
      console.error("❌ No se pudo reparar la sesión. Borra la carpeta manualmente.");
    }
    return;
  }

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    browser: Browsers.ubuntu("Chrome"),
    logger: crearLoggerSilencioso(),
    auth: state,
    printQRInTerminal: false,
    getMessage: async (key) => {
      return sock?.msgStore?.get(key.id)?.message ?? { conversation: "" };
    },
    connectTimeoutMs:    60_000,
    keepAliveIntervalMs: 25_000,
    retryRequestDelayMs: 2000,
  });

  sock.msgStore = new Map();
  sock.ev.on("creds.update", saveCreds);

  const credsPath  = `${CONFIG.sessionDir}/creds.json`;
  const yaHayCreds = await fs.pathExists(credsPath);

  if (!state.creds.registered && !yaHayCreds) {
    console.log(`\n⏳ Solicitando código para: ${PHONE_NUMBER}`);
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      console.log("\n╔══════════════════════════════════════╗");
      console.log(`   🔑 CÓDIGO DE VINCULACIÓN: ${code}   `);
      console.log("╚══════════════════════════════════════╝");
      console.log("\n  WhatsApp > Dispositivos vinculados");
      console.log("  > Vincular con número de teléfono\n");
    } catch (e) {
      console.error("❌ Error al pedir código:", e.message);
      console.log("⚠️  Reinicia el bot e intenta de nuevo.");
    }
  } else if (!state.creds.registered && yaHayCreds) {
    console.log("🔄 Sesión en disco encontrada, reconectando sin pedir código...");
  }

  // Registrar eventos de grupo UNA SOLA VEZ
  if (!eventosRegistrados) {
    eventosRegistrados = true;
    setupAutoPromote(sock);
    setupWelcomeEvent(sock);
    setupGoodbyeEvent(sock);
    iniciarCronBuenasNoches(sock);
  }

  // Limpiar cache de grupos al reconectar (puede estar desactualizado)
  groupMetaCache.clear();

  // ── Conexión ──────────────────────────────────────────────────────────────
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) console.log("⚠️  Se generó QR inesperado. Usa el código de vinculación.");

    if (connection === "open") {
      sessionRetries = 0;
      reconnectTimer = null;
      logConectado(CONFIG.botName);
      return;
    }

    if (connection === "close") {
      const err        = lastDisconnect?.error;
      const statusCode = err?.output?.statusCode;

      console.log(`❌ Conexión cerrada. Código: ${statusCode ?? "desconocido"}`);
      if (err?.message) console.log(`   Motivo: ${err.message}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("🗑️  Sesión cerrada por WhatsApp. Borrando y reiniciando...");
        await clearSession();
        sessionRetries     = 0;
        eventosRegistrados = false;
        scheduleReconnect();
        return;
      }

      if (statusCode === DisconnectReason.connectionReplaced) {
        console.log("⚠️  Bot abierto en otro dispositivo/instancia. Cerrando.");
        destroySock();
        process.exit(0);
        return;
      }

      if (statusCode === 405) {
        console.error("🚫 Cuenta restringida por WhatsApp (405). No se reconecta.");
        destroySock();
        return;
      }

      if (sessionRetries < MAX_RETRIES) {
        sessionRetries++;
        scheduleReconnect();
      } else {
        console.error(`❌ ${MAX_RETRIES} intentos fallidos. Reinicia el bot manualmente.`);
        destroySock();
      }
    }
  });

  // ── Mensajes ───────────────────────────────────────────────────────────────
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      const stanzaId = msg?.key?.id;
      if (!stanzaId) continue;
      if (mensajesProcesados.has(stanzaId)) continue;

      try {
        if (!msg?.message) continue;

        mensajesProcesados.add(stanzaId);
        setTimeout(() => mensajesProcesados.delete(stanzaId), 120_000);

        let jid = msg.key.remoteJid;
        if (!jid) continue;

        if (jid === "status@broadcast") continue;

        // Resolver LID → JID real
        if (jid.endsWith("@lid")) {
          if (msg.key?.senderPn) {
            jid = msg.key.senderPn.includes("@")
              ? msg.key.senderPn
              : `${msg.key.senderPn}@s.whatsapp.net`;
          } else {
            const senderNum = (getSender(msg) || "").split("@")[0];
            if (senderNum) jid = `${senderNum}@s.whatsapp.net`;
          }
        }

        let sender = getSender(msg);
        const isGroup = jid.endsWith("@g.us");

        // Resolver sender @lid → número real (usa cache)
        if (sender?.endsWith("@lid")) {
          if (msg.key?.participantPn) {
            sender = msg.key.participantPn.includes("@")
              ? msg.key.participantPn
              : `${msg.key.participantPn.replace(/\D/g, "")}@s.whatsapp.net`;
          } else if (isGroup) {
            try {
              const meta  = await getGroupMetadataCached(jid);
              const found = meta.participants.find(p => p.id === sender);
              if (found?.jid) {
                sender = found.jid.includes("@") ? found.jid : `${found.jid}@s.whatsapp.net`;
              } else if (found?.phoneNumber) {
                sender = `${found.phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
              } else if (found?.id && !found.id.endsWith("@lid")) {
                sender = found.id;
              }
            } catch (e) {
              console.log("[LID] error groupMetadata:", e.message);
            }
          }
        }

        const isOwner = checkIsOwner(sender);

        const tempBody =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text || "";

        // Ignorar mensajes propios que no sean comandos
        if (msg.key.fromMe && !tempBody.startsWith(CONFIG.prefix)) continue;

        const { tipo, detalle, body } = getMsgInfo(msg);

        let groupName = null;
        if (isGroup) {
          try { groupName = (await getGroupMetadataCached(jid)).subject; } catch {}
        }
        logMensaje({ sender, jid, pushName: msg.pushName, tipo, detalle, isGroup, groupName });

        if (!body && !msg.message?.documentMessage) continue;

        // msgStore
        sock.msgStore.set(stanzaId, msg);
        if (sock.msgStore.size > MSG_STORE_LIMIT) {
          sock.msgStore.delete(sock.msgStore.keys().next().value);
        }

        await checkAutoForward(sock, msg);
        if (await checkAntiLink(sock, msg, jid, sender, body)) continue;
        if (await checkAntispam(sock, msg, jid, sender)) continue;
        if (isGroup && !isOwner && !await grupoPermitido(jid)) continue;

        // Mantenimiento
        if (estado.mantenimiento && !isOwner) {
          await reply(sock, jid,
            `🔧 *El bot está en mantenimiento*\n\n⚠️ No disponible por el momento.\nIntenta más tarde.`,
            msg
          );
          continue;
        }
           // ─── IA por mención en grupos ──────────────────────────────────────
        if (isGroup && body && !body.startsWith(CONFIG.prefix)) {
          const menciones = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
          const botNum    = sock.user?.id?.split(":")[0];

          let activarIA = false;

          try {
            const metadata      = await getGroupMetadataCached(jid);
            const botParticipant = metadata.participants.find(p => {
              const pid = p.id.split("@")[0].split(":")[0];
              const ppn = (p.phoneNumber || "").replace(/\D/g, "");
              return pid === botNum || ppn === botNum;
            });
            const botLid = botParticipant?.id || "";

            activarIA = botLid
              ? menciones.some(m => m === botLid || m.includes(botNum))
              : menciones.some(m => m.includes(botNum));

          } catch (e) {
            activarIA = menciones.some(m => m.includes(botNum));
            console.error("[IA GRUPO ERROR]", e.message);
          }

          if (activarIA) {
            const textoLimpio = body.replace(/@\d+/g, "").trim();
            if (textoLimpio) {
              await iaCmd.run(sock, msg, textoLimpio.split(" "), jid, false, false);
              continue;
            }
          }
        }    
        // // ─── IA por mención o respuesta al bot en grupos ───────────────────
        // if (isGroup && body && !body.startsWith(CONFIG.prefix)) {
        //   const menciones         = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        //   const contextInfo       = msg.message?.extendedTextMessage?.contextInfo;
        //   const participantQuoted = contextInfo?.participant || "";
        //   const botNum            = sock.user?.id?.split(":")[0];

        //   let activarIA = false;

        //   try {
        //     const metadata = await getGroupMetadataCached(jid);
        //     const botParticipant = metadata.participants.find(p => {
        //       const pid = p.id.split("@")[0].split(":")[0];
        //       const ppn = (p.phoneNumber || "").replace(/\D/g, "");
        //       return pid === botNum || ppn === botNum;
        //     });
        //     const botLid = botParticipant?.id || "";

        //     const esMencionado = botLid
        //       ? menciones.some(m => m === botLid || m.includes(botNum))
        //       : menciones.some(m => m.includes(botNum));

        //     const esRespuesta = participantQuoted &&
        //       (participantQuoted.includes(botNum) || participantQuoted === botLid);

        //     activarIA = esMencionado || esRespuesta;
        //   } catch (e) {
        //     const esMencionado = menciones.some(m => m.includes(botNum));
        //     const esRespuesta  = participantQuoted.includes(botNum);
        //     activarIA = esMencionado || esRespuesta;
        //     console.error("[IA GRUPO ERROR]", e.message);
        //   }

        //   if (activarIA) {
        //     const textoLimpio = body.replace(/@\d+/g, "").trim();
        //     if (textoLimpio) {
        //       await iaCmd.run(sock, msg, textoLimpio.split(" "), jid, false, false);
        //       continue;
        //     }
        //   }
        // }

        // ─── Mensajes sin prefix (sesiones activas de juegos) ─────────────
        if (!body.startsWith(CONFIG.prefix)) {
          const bodyTrim    = body.trim();
          const sesionJuego = getSesionJuego(jid, sender);

          if (sesionJuego && commands["numjuego"]) {
            await commands["numjuego"](sock, msg, [bodyTrim], jid, isOwner, isGroup, sender);
          }

          // IMPORTANTE: siempre continuar — no procesar como comando
          continue;
        }

        // ─── Comandos con prefix ───────────────────────────────────────────
        const [rawCmd, ...args] = body.slice(CONFIG.prefix.length).trim().split(/\s+/);
        if (!rawCmd) continue;

        const cmd = rawCmd.toLowerCase();
        if (!commands[cmd]) continue;

        logComando(cmd, args);

        try {
          // Guardar nombre en economía (usa cache de grupo)
          try {
            const _ecoDb     = loadDB();
            const _rawSender = msg?.key?.participant || msg?.key?.remoteJid || sender || "";
            let   _ecoId;

            if (_rawSender.endsWith("@lid")) {
              if (isGroup) {
                try {
                  const meta  = await getGroupMetadataCached(jid);
                  const found = meta.participants.find(p => p.id === _rawSender);
                  if (found?.phoneNumber) {
                    _ecoId = found.phoneNumber.replace(/\D/g, "");
                  } else if (found?.id && !found.id.endsWith("@lid")) {
                    _ecoId = numId(found.id);
                  }
                } catch {}
              }
              if (!_ecoId) _ecoId = numId(sender);
            } else {
              _ecoId = numId(_rawSender);
            }

            getUser(_ecoDb, _ecoId);
            saveNombre(_ecoDb, _ecoId, msg?.pushName);
            saveDB(_ecoDb);
          } catch {}

          await commands[cmd](sock, msg, args, jid, isOwner, isGroup, sender);

        } catch (e) {
          console.error(`❌ Error en comando "${cmd}":`, e);
          if (sock) {
            try { await react(sock, msg, "❌"); } catch {}
            try { await reply(sock, jid, `❌ Error en el comando: ${e.message}`, msg); } catch {}
          }
        }

      } catch (e) {
        console.error("❌ Error procesando mensaje:", e.message);
      }
    }
  });
}

// ─── Errores globales ─────────────────────────────────────────────────────────
process.on("uncaughtException",  (err)    => console.error("💥 uncaughtException:",  err.message));
process.on("unhandledRejection", (reason) => console.error("💥 unhandledRejection:", reason?.message ?? reason));
process.on("SIGINT",  () => { console.log("\n👋 Cerrando bot..."); destroySock(); process.exit(0); });
process.on("SIGTERM", () => { console.log("\n👋 SIGTERM recibido."); destroySock(); process.exit(0); });

export default startBot;