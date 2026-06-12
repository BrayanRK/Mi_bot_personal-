import fs from "fs";
import path from "path";

export default {
  name: "termux",
  aliases: ["apktermux", "termuxapk"],

  async run(sock, msg, args, chatId) {

    try {

      const res = await fetch(
        "https://api.github.com/repos/termux/termux-app/releases/latest"
      );

      if (!res.ok) {
        throw new Error("No se pudo obtener la última versión.");
      }

      const data = await res.json();

      const apk = data.assets.find(a =>
        a.name.endsWith(".apk")
      );

      if (!apk) {
        throw new Error("No se encontró ningún APK.");
      }

      await sock.sendMessage(chatId, {
        text:
`💻 *TERMUX OFICIAL*

📦 Versión: ${data.tag_name}

⬇️ Descarga:
${apk.browser_download_url}

📄 Archivo:
${apk.name}

🏠 Repositorio:
https://github.com/termux/termux-app`
      }, { quoted: msg });

    } catch (e) {

      await sock.sendMessage(chatId, {
        text:
`❌ Error al obtener Termux

${e.message}`
      }, { quoted: msg });

    }
  }
};