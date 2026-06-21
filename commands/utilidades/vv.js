const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { downloadMediaMessage } = require('../../lib/Utils/messages');

const TMP_DIR = path.join(os.tmpdir(), 'mitsuri-vv');
const TMP_FILE_PREFIX = 'mitsuri-vv-';

function ensureTmpDir() {
  try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch {}
}

function deleteFileSafe(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function getContextInfo(message = {}) {
  if (message?.extendedTextMessage?.contextInfo) return message.extendedTextMessage.contextInfo;
  if (message?.imageMessage?.contextInfo) return message.imageMessage.contextInfo;
  if (message?.videoMessage?.contextInfo) return message.videoMessage.contextInfo;
  if (message?.documentMessage?.contextInfo) return message.documentMessage.contextInfo;
  if (message?.stickerMessage?.contextInfo) return message.stickerMessage.contextInfo;
  return {};
}

function getQuotedFakeMessage(m = {}) {
  const ctx = getContextInfo(m?.message || {});
  const quotedMessage = ctx?.quotedMessage;
  if (!quotedMessage || typeof quotedMessage !== 'object') return null;

  return {
    key: {
      remoteJid: m?.key?.remoteJid || '',
      id: String(ctx?.stanzaId || m?.key?.id || 'quoted').trim(),
      fromMe: false,
      participant: ctx?.participant || m?.key?.participant || '',
    },
    message: quotedMessage,
  };
}

function findMedia(message = {}) {
  if (!message) return null;
  if (message.imageMessage) return { type: 'image' };
  if (message.videoMessage) return { type: 'video' };
  if (message.audioMessage) return { type: 'audio' };
  return null;
}

async function react(client, m, emoji) {
  try { await client.sendMessage(m.key.remoteJid, { react: { text: emoji, key: m.key } }); } catch {}
}

ensureTmpDir();

module.exports = {
  command: ['vv', 'ver', 'viewonce', 'revelar'],
  description: '🌸 Recupera fotos y videos de ver una sola vez',
  categoria: 'herramientas',

  run: async (client, m, args = [], from) => {
    const jid = from || m.key.remoteJid;

    const fakeMsg = getQuotedFakeMessage(m);
    if (!fakeMsg) {
      await client.sendMessage(jid, {
        text: '🌸 MITSURI BOT 🌸\n\n❌ Responde a una foto o video de *ver una sola vez* con el comando *.vv*',
      }, { quoted: m });
      return;
    }

    const media = findMedia(fakeMsg.message);
    if (!media) {
      await client.sendMessage(jid, {
        text: '🌸 MITSURI BOT 🌸\n\n❌ No detecté imagen, video o audio válido en el mensaje respondido.\n> Responde directamente al archivo de ver una sola vez.',
      }, { quoted: m });
      return;
    }

    await react(client, m, '👀');

    let tempFile = null;
    try {
      await client.sendMessage(jid, {
        text: '🌸 MITSURI BOT 🌸\n\n👀 Recuperando archivo de ver una sola vez...',
      }, { quoted: m });

      const buffer = await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        {
          logger: undefined,
          reuploadRequest: client.updateMediaMessage,
        }
      );

      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 1000) {
        throw new Error('No pude descargar el archivo multimedia.');
      }

      if (media.type === 'image') {
        await client.sendMessage(jid, {
          image: buffer,
          caption: '🌸 MITSURI BOT 🌸\n\n✅ Imagen recuperada de ver una sola vez~ 💕',
        }, { quoted: m });
        await react(client, m, '✅');
        return;
      }

      if (media.type === 'audio') {
        ensureTmpDir();
        const ext = fakeMsg.message?.audioMessage?.mimetype?.includes('ogg') ? 'ogg' : 'mp3';
        tempFile = path.join(TMP_DIR, `${TMP_FILE_PREFIX}${Date.now()}-${randomUUID()}.${ext}`);
        fs.writeFileSync(tempFile, buffer);

        await client.sendMessage(jid, {
          audio: { url: tempFile },
          mimetype: fakeMsg.message?.audioMessage?.mimetype || 'audio/mpeg',
          ptt: Boolean(fakeMsg.message?.audioMessage?.ptt),
        }, { quoted: m });

        await client.sendMessage(jid, {
          text: '🌸 MITSURI BOT 🌸\n\n✅ Audio recuperado de ver una sola vez~ 💕',
        }, { quoted: m });

        await react(client, m, '✅');
        return;
      }

      ensureTmpDir();
      tempFile = path.join(TMP_DIR, `${TMP_FILE_PREFIX}${Date.now()}-${randomUUID()}.mp4`);
      fs.writeFileSync(tempFile, buffer);

      try {
        await client.sendMessage(jid, {
          video: { url: tempFile },
          mimetype: 'video/mp4',
          caption: '🌸 MITSURI BOT 🌸\n\n✅ Video recuperado de ver una sola vez~ 💕',
        }, { quoted: m });
      } catch {
        await client.sendMessage(jid, {
          document: { url: tempFile },
          mimetype: 'video/mp4',
          fileName: `viewonce_${Date.now()}.mp4`,
          caption: '🌸 MITSURI BOT 🌸\n\n✅ Video recuperado de ver una sola vez~ 💕\n\n📦 Enviado como documento',
        }, { quoted: m });
      }

      await react(client, m, '✅');
    } catch (error) {
      await react(client, m, '❌');
      await client.sendMessage(jid, {
        text: `🌸 MITSURI BOT 🌸\n\n💔 ${error?.message || 'No pude recuperar el archivo de ver una sola vez.'}`,
      }, { quoted: m });
    } finally {
      deleteFileSafe(tempFile);
    }
  },
};
