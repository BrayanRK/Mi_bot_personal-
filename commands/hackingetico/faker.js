import { reply } from "../../utils.js";

const firstNames = ["Alejandro","María","Carlos","Sofía","Luis","Valentina","Diego","Camila","Andrés","Daniela","Miguel","Isabella","Sebastián","Gabriela","Mateo","Natalia","Ricardo","Paula","Fernando","Laura"];
const lastNames  = ["García","Rodríguez","Martínez","López","González","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Gómez","Díaz","Reyes","Morales","Cruz","Ortiz","Vargas","Ramos","Herrera"];
const dominios   = ["gmail.com","hotmail.com","yahoo.com","outlook.com","proton.me","icloud.com"];
const paises     = [
  { nombre: "México", codigo: "+52", ciudad: "Ciudad de México", cp: "06600" },
  { nombre: "Colombia", codigo: "+57", ciudad: "Bogotá", cp: "110111" },
  { nombre: "Argentina", codigo: "+54", ciudad: "Buenos Aires", cp: "1000" },
  { nombre: "España", codigo: "+34", ciudad: "Madrid", cp: "28001" },
  { nombre: "Chile", codigo: "+56", ciudad: "Santiago", cp: "8320000" },
  { nombre: "Venezuela", codigo: "+58", ciudad: "Caracas", cp: "1010" },
];
const ocupaciones = ["Ingeniero de software","Diseñador gráfico","Médico","Abogado","Contador","Arquitecto","Periodista","Profesor","Enfermero","Psicólogo"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randNum(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toLocaleDateString("es-ES");
}

export default {
  name: "faker",
  aliases: ["identidad", "fakeuser", "persona"],
  run: async (sock, msg, args, jid) => {
    const nombre   = rand(firstNames);
    const apellido = rand(lastNames) + " " + rand(lastNames);
    const pais     = rand(paises);
    const dominio  = rand(dominios);
    const email    = `${nombre.toLowerCase()}.${apellido.split(" ")[0].toLowerCase()}${randNum(10,999)}@${dominio}`;
    const telefono = `${pais.codigo} ${randNum(100,999)}-${randNum(100,999)}-${randNum(1000,9999)}`;
    const nacimiento = randDate(new Date(1970, 0, 1), new Date(2000, 11, 31));
    const ocupacion  = rand(ocupaciones);
    const username   = `${nombre.toLowerCase()}${rand(lastNames).toLowerCase()}${randNum(10,99)}`;
    const password   = [...Array(12)].map(() => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$"[Math.floor(Math.random() * 64)]).join("");

    await reply(sock, jid,
      `🎭 *Identidad Falsa Generada*\n\n` +
      `👤 *Nombre:* ${nombre} ${apellido}\n` +
      `📅 *Nacimiento:* ${nacimiento}\n` +
      `💼 *Ocupación:* ${ocupacion}\n\n` +
      `🌍 *País:* ${pais.nombre}\n` +
      `🏙️ *Ciudad:* ${pais.ciudad}\n` +
      `📮 *CP:* ${pais.cp}\n\n` +
      `📧 *Email:* ${email}\n` +
      `📱 *Teléfono:* ${telefono}\n` +
      `👤 *Username:* ${username}\n` +
      `🔑 *Password:* ${password}\n\n` +
      `_⚠️ Solo para fines educativos_`,
      msg
    );
  },
};

