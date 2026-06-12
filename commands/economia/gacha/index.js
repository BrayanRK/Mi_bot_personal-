
// commands/economia/gacha/index.js
// ─────────────────────────────────────────────────────────────────────────────
//  Registra todos los comandos gacha de una sola vez
//
//  En tu loader de comandos:
//    import gachaCommands from "./economia/gacha/index.js";
//    gachaCommands.forEach(cmd => commands.set(cmd.name, cmd));
// ─────────────────────────────────────────────────────────────────────────────
import gacha       from "./gacha.js";
import coleccion   from "./coleccion.js";
import vercard     from "./vercard.js";
import abrircofre  from "./abrircofre.js";
import gachaperfil from "./gachaperfil.js";
import gachatop    from "./gachatop.js";

export default [gacha, coleccion, vercard, abrircofre, gachaperfil, gachatop];
