import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carpetas que solo funcionan en grupos
const SOLO_GRUPOS = ["economia"];

function wrapSoloGrupo(run) {
  return async (sock, msg, args, chatId, isOwner, isGroup, sender) => {
    if (!isGroup) {
      return sock.sendMessage(chatId, {
        text: "🌸 Este comando solo se puede usar en grupos 💕"
      }, { quoted: msg });
    }
    return run(sock, msg, args, chatId, isOwner, isGroup, sender);
  };
}

// Devuelve todos los .js de una carpeta de forma recursiva
function getJsFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getJsFiles(full)); // <-- entra a subcarpetas
    } else if (entry.endsWith(".js") && entry !== "index.js") {
      files.push(full);
    }
  }
  return files;
}

async function loadCommands() {
  const commands = {};
  const folders = readdirSync(__dirname).filter((f) =>
    statSync(join(__dirname, f)).isDirectory()
  );

  for (const folder of folders) {
    const esGrupo = SOLO_GRUPOS.includes(folder);
    const files = getJsFiles(join(__dirname, folder));

    for (const filePath of files) {
      try {
        const mod = await import(pathToFileURL(filePath).href);

        // Cargar exports nombrados
        for (const key of Object.keys(mod)) {
          if (key === "default" || key === "antiLinkGroups") continue;
          const cmd = mod[key];
          if (cmd?.name && cmd?.run) {
            const run = esGrupo ? wrapSoloGrupo(cmd.run) : cmd.run;
            commands[cmd.name] = run;
            cmd.aliases?.forEach((a) => { commands[a] = run; });
          }
        }

        // Cargar default
        const cmd = mod.default;
        if (cmd?.name && cmd?.run && !commands[cmd.name]) {
          const run = esGrupo ? wrapSoloGrupo(cmd.run) : cmd.run;
          commands[cmd.name] = run;
          cmd.aliases?.forEach((a) => {
            if (!commands[a]) commands[a] = run;
          });
        }
      } catch (e) {
        console.error(`Error cargando ${filePath}:`, e.message);
      }
    }
  }

  return commands;
}

export default loadCommands;
