import { reply } from "../../utils.js";

export default {
  name: "b64",
  aliases: ["base64", "encode", "decode"],
  description: "Codifica o decodifica base64",

  run: async (sock, msg, args, jid) => {
    const modo  = args[0]?.toLowerCase();
    const texto = args.slice(1).join(" ").trim();

    if (!modo || !texto || !["encode", "decode", "e", "d"].includes(modo)) {
      
      return reply(sock, jid,
        "❌ Uso:\n" +
        "`.b64 encode <texto>` — codificar\n" +
        "`.b64 decode <texto>` — decodificar",
        msg
      );
    }

    try {
      let resultado;
      if (modo === "encode" || modo === "e") {
        resultado = Buffer.from(texto).toString("base64");
      } else {
        resultado = Buffer.from(texto, "base64").toString("utf-8");
      }

      const accion = (modo === "encode" || modo === "e") ? "🔒 Codificado" : "🔓 Decodificado";

      
      return reply(sock, jid,
        `*${accion}:*\n━━━━━━━━━━━━━━━━━━━━\n${resultado}`,
        msg
      );
    } catch (e) {
      
      return reply(sock, jid, "❌ Texto base64 inválido.", msg);
    }
  },
};

