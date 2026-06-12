import fs from "fs";
import path from "path";

export default {
  name: "termux",
  aliases: ["apktermux"],

  async run(sock, msg, args, chatId) {

    try {

      const url =
        "https://github.com/termux/termux-app/releases/latest/download/termux-app_v0.119.0+github-debug_universal.apk";

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("No se pudo descargar el APK");
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      const filePath = path.join(process.cwd(), "termux.apk");

      fs.writeFileSync(filePath, buffer);

      await sock.sendMessage(chatId, {
        document: fs.readFileSync(filePath),
        fileName: "Termux.apk",
        mimetype: "application/vnd.android.package-archive",
        caption:
`💻 *Termux Oficial*

✅ Descargado desde GitHub oficial.
🚀 Ideal para bots de WhatsApp.`
      }, { quoted: msg });

      fs.unlinkSync(filePath);

    } catch (e) {

      await sock.sendMessage(chatId, {
        text: `❌ Error:\n${e.message}`
      }, { quoted: msg });

    }
  }
};