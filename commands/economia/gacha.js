// commands/economia/gacha.js
import { loadDB, saveDB, getUser, fmt, numId } from "./db.js";

// ─────────────────────────────────────────────────────────────────────────────
//  PERSONAJES (con imagen)
// ─────────────────────────────────────────────────────────────────────────────
const PERSONAJES = [
  { nombre: "Sakura Haruno",        rarity: "SR",  image: "https://files.catbox.moe/uhdhug.jpg" },
  { nombre: "Monkey D. Luffy",      rarity: "SSR", image: "https://files.catbox.moe/vnpmpc.jpg" },
  { nombre: "Naruto Uzumaki",       rarity: "SSR", image: "https://files.catbox.moe/97jxxj.jpg" },
  { nombre: "Sasuke Uchiha",        rarity: "SSR", image: "https://files.catbox.moe/kmex7w.jpg" },
  { nombre: "Kakashi Hatake",       rarity: "SR",  image: "https://files.catbox.moe/m0d9kj.jpg" },
  { nombre: "Itachi Uchiha",        rarity: "SSR", image: "https://files.catbox.moe/j13ew6.jpg" },
  { nombre: "Sai",                  rarity: "R",   image: "https://files.catbox.moe/rkv6ry.jpg" },
  { nombre: "Gaara",                rarity: "SR",  image: "https://files.catbox.moe/y5jlve.jpg" },
  { nombre: "Rock Lee",             rarity: "SR",  image: "https://files.catbox.moe/h8epf6.jpg" },
  { nombre: "Hinata Hyuga",         rarity: "SR",  image: "https://files.catbox.moe/1y9l8h.jpg" },
  { nombre: "Minato Namikaze",      rarity: "SSR", image: "https://files.catbox.moe/kwlnb2.jpg" },
  { nombre: "Madara Uchiha",        rarity: "SSR", image: "https://files.catbox.moe/m0bblt.jpg" },
  { nombre: "Obito Uchiha",         rarity: "SSR", image: "https://files.catbox.moe/73jrvw.jpg" },
  { nombre: "Pain (Nagato)",        rarity: "SSR", image: "https://files.catbox.moe/23ckuq.jpg" },
  { nombre: "Roronoa Zoro",         rarity: "SSR", image: "https://files.catbox.moe/18e2ni.jpg" },
  { nombre: "Nami",                 rarity: "SR",  image: "https://files.catbox.moe/pcdedo.jpg" },
  { nombre: "Sanji",                rarity: "SR",  image: "https://files.catbox.moe/025kml.jpg" },
  { nombre: "Nico Robin",           rarity: "SR",  image: "https://files.catbox.moe/ca5zk2.jpg" },
  { nombre: "Portgas D. Ace",       rarity: "SSR", image: "https://files.catbox.moe/3v02ej.jpg" },
  { nombre: "Trafalgar Law",        rarity: "SSR", image: "https://files.catbox.moe/c5arcp.jpg" },
  { nombre: "Shanks",               rarity: "SSR", image: "https://files.catbox.moe/rftjst.jpg" },
  { nombre: "Whitebeard",           rarity: "SSR", image: "https://files.catbox.moe/f75ht7.jpg" },
  { nombre: "Kaido",                rarity: "SSR", image: "https://files.catbox.moe/5ao2g2.jpg" },
  { nombre: "Elizabeth",            rarity: "SR",  image: "https://files.catbox.moe/5k78pq.jpg" },
  { nombre: "Capitan Meliodas",     rarity: "SR",  image: "https://files.catbox.moe/mwp430.jpg" },
  { nombre: "Merlin",               rarity: "SR",  image: "https://files.catbox.moe/srjvdy.jpg" },
  { nombre: "Diana +",              rarity: "SR",  image: "https://files.catbox.moe/m6956p.jpg" },
  { nombre: "Ban",                  rarity: "SR",  image: "https://files.catbox.moe/469hzw.jpg" },
  { nombre: "Escanor",              rarity: "SR",  image: "https://files.catbox.moe/moiuh3.jpg" },
  { nombre: "King",                 rarity: "SR",  image: "https://files.catbox.moe/txmu65.jpg" },
  { nombre: "Gowter",               rarity: "SR",  image: "https://files.catbox.moe/fw4tzu.jpg" },
  { nombre: "Zeldris",              rarity: "SSR", image: "https://files.catbox.moe/pv0mqp.jpg" },
  { nombre: "Estarossa",            rarity: "SSR", image: "https://files.catbox.moe/tykq74.jpg" },
  { nombre: "Gilthunder",           rarity: "R",   image: "https://files.catbox.moe/5r7yj1.jpg" },
  { nombre: "Goku Ultra",           rarity: "SSR", image: "https://files.catbox.moe/knq1kn.jpg" },
  { nombre: "Super Broly",          rarity: "SSR", image: "https://files.catbox.moe/qsjxr3.jpg" },
  { nombre: "Bills",                rarity: "SSR", image: "https://files.catbox.moe/ufs5u8.jpg" },
  { nombre: "Jiren",                rarity: "SSR", image: "https://files.catbox.moe/3b0q9b.jpg" },
  { nombre: "Begeta",               rarity: "SSR", image: "https://files.catbox.moe/4z3x45.jpg" },
  { nombre: "Goku Black",           rarity: "SSR", image: "https://files.catbox.moe/2yj3m0.jpg" },
  { nombre: "Gohan Beast",          rarity: "SSR", image: "https://files.catbox.moe/7w0fz9.jpg" },
  { nombre: "Frieza Golden",        rarity: "SSR", image: "https://files.catbox.moe/9pmv6j.jpg" },
  { nombre: "Cell Perfecto",        rarity: "SSR", image: "https://files.catbox.moe/zwjq2y.jpg" },
  { nombre: "Majin Buu",            rarity: "SSR", image: "https://files.catbox.moe/xd1jlq.jpg" },
  { nombre: "Piccolo",              rarity: "SR",  image: "https://files.catbox.moe/2oipzf.jpg" },
  { nombre: "Trunks del Futuro",    rarity: "SR",  image: "https://files.catbox.moe/9vc00a.jpg" },
  { nombre: "Whis",                 rarity: "SSR", image: "https://files.catbox.moe/f9qh0h.jpg" },
  { nombre: "Zamasu",               rarity: "SSR", image: "https://files.catbox.moe/nk4106.jpg" },
  { nombre: "Tanjiro Kamado",       rarity: "SR",  image: "https://files.catbox.moe/z0gw2u.jpg" },
  { nombre: "Nezuko Kamado",        rarity: "SR",  image: "https://files.catbox.moe/gzn3vp.jpg" },
  { nombre: "Zenitsu Agatsuma",     rarity: "SR",  image: "https://files.catbox.moe/s9uzqo.jpg" },
  { nombre: "Inosuke Hashibira",    rarity: "SR",  image: "https://files.catbox.moe/qe8ckz.jpg" },
  { nombre: "Muzan Kibutsuji",      rarity: "SSR", image: "https://files.catbox.moe/nmpixb.webp" },
  { nombre: "Rengoku",              rarity: "SSR", image: "https://files.catbox.moe/r4rm9s.jpg" },
  { nombre: "Gyutaro",              rarity: "SSR", image: "https://files.catbox.moe/1m8rb2.jpg" },
  { nombre: "Mitsuri Kanroji",      rarity: "SSR", image: "https://files.catbox.moe/ah76d8.jpg" },
  { nombre: "Tengen Uzui",          rarity: "SSR", image: "https://files.catbox.moe/0xgqbs.jpg" },
  { nombre: "Sanemi Shinazugawa",   rarity: "SSR", image: "https://files.catbox.moe/m8i9fm.jpg" },
  { nombre: "Giyu Tomioka",         rarity: "SSR", image: "https://files.catbox.moe/jgf525.jpg" },
  { nombre: "Kanao Tsuyuri",        rarity: "SR",  image: "https://files.catbox.moe/crhxp8.jpg" },
  { nombre: "Akaza",                rarity: "SSR", image: "https://files.catbox.moe/hyiogz.jpg" },
  { nombre: "Doma",                 rarity: "SSR", image: "https://files.catbox.moe/58b23y.jpg" },
  { nombre: "Kokushibo",            rarity: "SSR", image: "https://files.catbox.moe/xywu2r.jpg" },
  { nombre: "Eren Yeager",          rarity: "SSR", image: "https://files.catbox.moe/8u7jwz.jpg" },
  { nombre: "Levi Ackerman",        rarity: "SSR", image: "https://files.catbox.moe/8dk6ss.jpg" },
  { nombre: "Mikasa Ackerman",      rarity: "SR",  image: "https://files.catbox.moe/pbpkdd.jpg" },
  { nombre: "Armin Arlert",         rarity: "SR",  image: "https://files.catbox.moe/pz8r1a.jpg" },
  { nombre: "Reiner Braun",         rarity: "SR",  image: "https://files.catbox.moe/klrurx.jpg" },
  { nombre: "Bertholdt Hoover",     rarity: "SR",  image: "https://files.catbox.moe/lrx63z.jpg" },
  { nombre: "Annie Leonhart",       rarity: "SR",  image: "https://files.catbox.moe/0gnbc7.jpg" },
  { nombre: "Erwin Smith",          rarity: "SR",  image: "https://files.catbox.moe/bb8xcd.jpg" },
  { nombre: "Hange Zoe",            rarity: "SR",  image: "https://files.catbox.moe/591o0l.jpg" },
  { nombre: "Zeke Yeager",          rarity: "SSR", image: "https://files.catbox.moe/0wgp4b.jpg" },
  { nombre: "Izuku Midoriya",       rarity: "SR",  image: "https://files.catbox.moe/xm761t.jpg" },
  { nombre: "All Might",            rarity: "SSR", image: "https://files.catbox.moe/5rzb1a.jpg" },
  { nombre: "Katsuki Bakugo",       rarity: "SR",  image: "https://files.catbox.moe/j6khwr.jpg" },
  { nombre: "Shoto Todoroki",       rarity: "SR",  image: "https://files.catbox.moe/bujrs6.jpg" },
  { nombre: "Tomura Shigaraki",     rarity: "SSR", image: "https://files.catbox.moe/go28pv.jpg" },
  { nombre: "Endeavor",             rarity: "SR",  image: "https://files.catbox.moe/2vt82w.jpg" },
  { nombre: "Hawks",                rarity: "SR",  image: "https://files.catbox.moe/f1kbtd.jpg" },
  { nombre: "Toga Himiko",          rarity: "SR",  image: "https://files.catbox.moe/1u57zy.jpg" },
  { nombre: "Dabi",                 rarity: "SR",  image: "https://files.catbox.moe/csz7t9.jpg" },
  { nombre: "Overhaul",             rarity: "SSR", image: "https://files.catbox.moe/3r6kk1.jpg" },
  { nombre: "Ochaco Uraraka",       rarity: "SR",  image: "https://files.catbox.moe/tm5ytr.jpg" },
  { nombre: "Tenya Iida",           rarity: "SR",  image: "https://files.catbox.moe/nxukao.jpg" },
  { nombre: "Ichigo Kurosaki",      rarity: "SSR", image: "https://files.catbox.moe/779iig.jpg" },
  { nombre: "Rukia Kuchiki",        rarity: "SR",  image: "https://files.catbox.moe/x99uz8.jpg" },
  { nombre: "Aizen Sosuke",         rarity: "SSR", image: "https://files.catbox.moe/xxc08t.jpg" },
  { nombre: "Byakuya Kuchiki",      rarity: "SSR", image: "https://files.catbox.moe/v8l3lw.jpg" },
  { nombre: "Renji Abarai",         rarity: "SR",  image: "https://files.catbox.moe/irdods.jpg" },
  { nombre: "Toshiro Hitsugaya",    rarity: "SR",  image: "https://files.catbox.moe/r1g32g.jpg" },
  { nombre: "Yoruichi Shihoin",     rarity: "SSR", image: "https://files.catbox.moe/pmqupj.jpg" },
  { nombre: "Kisuke Urahara",       rarity: "SSR", image: "https://files.catbox.moe/xflbr7.jpg" },
  { nombre: "Grimmjow",             rarity: "SSR", image: "https://files.catbox.moe/idb8tm.jpg" },
  { nombre: "Ulquiorra Cifer",      rarity: "SSR", image: "https://files.catbox.moe/dcnfr3.jpg" },
  { nombre: "Kenpachi Zaraki",      rarity: "SSR", image: "https://files.catbox.moe/vir9m2.jpg" },
  { nombre: "Saitama",              rarity: "SSR", image: "https://files.catbox.moe/6dgp8q.jpg" },
  { nombre: "Genos",                rarity: "SR",  image: "https://files.catbox.moe/evcubo.jpg" },
  { nombre: "Garou",                rarity: "SSR", image: "https://files.catbox.moe/oewn2z.jpg" },
  { nombre: "Speed-o'-Sound Sonic", rarity: "SR",  image: "https://files.catbox.moe/653jhk.jpg" },
  { nombre: "Bang",                 rarity: "SSR", image: "https://files.catbox.moe/wxilsa.jpg" },
  { nombre: "Tatsumaki",            rarity: "SSR", image: "https://files.catbox.moe/3vjtj6.jpg" },
  { nombre: "Fubuki",               rarity: "SR",  image: "https://files.catbox.moe/e9oj80.jpg" },
  { nombre: "Gon Freecss",          rarity: "SR",  image: "https://files.catbox.moe/ib71zi.jpg" },
  { nombre: "Killua Zoldyck",       rarity: "SR",  image: "https://files.catbox.moe/pz6p2i.jpg" },
  { nombre: "Hisoka",               rarity: "SSR", image: "https://files.catbox.moe/81wl2f.jpg" },
  { nombre: "Meruem",               rarity: "SSR", image: "https://files.catbox.moe/efztjc.jpg" },
  { nombre: "Kurapika",             rarity: "SR",  image: "https://files.catbox.moe/c77ovf.jpg" },
  { nombre: "Leorio",               rarity: "R",   image: "https://files.catbox.moe/oewsch.jpg" },
  { nombre: "Chrollo Lucilfer",     rarity: "SSR", image: "https://files.catbox.moe/f7n1og.jpg" },
  { nombre: "Illumi Zoldyck",       rarity: "SSR", image: "https://files.catbox.moe/oddsvh.jpg" },
  { nombre: "Netero",               rarity: "SSR", image: "https://files.catbox.moe/3gqwnb.jpg" },
  { nombre: "Natsu Dragneel",       rarity: "SR",  image: "https://files.catbox.moe/s91ojb.jpg" },
  { nombre: "Erza Scarlet",         rarity: "SR",  image: "https://files.catbox.moe/to7886.jpg" },
  { nombre: "Zeref",                rarity: "SSR", image: "https://files.catbox.moe/pl9539.jpg" },
  { nombre: "Gray Fullbuster",      rarity: "SR",  image: "https://files.catbox.moe/woucnk.jpg" },
  { nombre: "Lucy Heartfilia",      rarity: "SR",  image: "https://files.catbox.moe/q1wana.jpg" },
  { nombre: "Gildarts Clive",       rarity: "SSR", image: "https://files.catbox.moe/u6bhej.jpg" },
  { nombre: "Mavis Vermillion",     rarity: "SSR", image: "https://files.catbox.moe/hv8oah.jpg" },
  { nombre: "Wendy Marvell",        rarity: "SR",  image: "https://files.catbox.moe/srmop9.jpg" },
  { nombre: "Laxus Dreyar",         rarity: "SSR", image: "https://files.catbox.moe/5hdpk0.jpg" },
  { nombre: "Yuji Itadori",         rarity: "SR",  image: "https://files.catbox.moe/377c9x.jpg" },
  { nombre: "Gojo Satoru",          rarity: "SSR", image: "https://files.catbox.moe/s5r0m6.jpg" },
  { nombre: "Ryomen Sukuna",        rarity: "SSR", image: "https://files.catbox.moe/t2tcos.jpg" },
  { nombre: "Megumi Fushiguro",     rarity: "SR",  image: "https://files.catbox.moe/fm7247.jpg" },
  { nombre: "Nobara Kugisaki",      rarity: "SR",  image: "https://files.catbox.moe/u1iebt.jpg" },
  { nombre: "Nanami Kento",         rarity: "SR",  image: "https://files.catbox.moe/mrksde.jpg" },
  { nombre: "Toji Fushiguro",       rarity: "SSR", image: "https://files.catbox.moe/b951vx.jpg" },
  { nombre: "Yuta Okkotsu",         rarity: "SSR", image: "https://files.catbox.moe/1ifml0.jpg" },
  { nombre: "Maki Zenin",           rarity: "SR",  image: "https://files.catbox.moe/254t85.jpg" },
  { nombre: "Aoi Todo",             rarity: "SR",  image: "https://files.catbox.moe/jvwxh4.jpg" },
  { nombre: "Ken Kaneki",           rarity: "SSR", image: "https://files.catbox.moe/5z6xyr.jpg" },
  { nombre: "Touka Kirishima",      rarity: "SR",  image: "https://files.catbox.moe/jf5xmk.jpg" },
  { nombre: "Rize Kamishiro",       rarity: "SR",  image: "https://files.catbox.moe/tfig3e.jpg" },
  { nombre: "Eto Yoshimura",        rarity: "SSR", image: "https://files.catbox.moe/shl110.jpg" },
  { nombre: "Juuzou Suzuya",        rarity: "SR",  image: "https://files.catbox.moe/849j8b.jpg" },
  { nombre: "Kishou Arima",         rarity: "SSR", image: "https://files.catbox.moe/wj4ejw.jpg" },
  { nombre: "Nishiki Nishio",       rarity: "R",   image: "https://files.catbox.moe/6o246i.jpg" },
  { nombre: "Asta",                 rarity: "SR",  image: "https://files.catbox.moe/lx51ax.jpg" },
  { nombre: "Yuno",                 rarity: "SR",  image: "https://files.catbox.moe/0d06uq.jpg" },
  { nombre: "Yami Sukehiro",        rarity: "SSR", image: "https://files.catbox.moe/298a52.jpg" },
  { nombre: "Luck Voltia",          rarity: "SR",  image: "https://files.catbox.moe/zvvnhc.jpg" },
  { nombre: "Noelle Silva",         rarity: "SR",  image: "https://files.catbox.moe/0ncajk.jpg" },
  { nombre: "Julius Novachrono",    rarity: "SSR", image: "https://files.catbox.moe/s0h26p.jpg" },
  { nombre: "Dante Zogratis",       rarity: "SSR", image: "https://files.catbox.moe/qgltlk.jpg" },
  { nombre: "Zenon Zogratis",       rarity: "SSR", image: "https://files.catbox.moe/t29o79.jpg" },
  { nombre: "Mereoleona Vermillion",rarity: "SSR", image: "https://files.catbox.moe/1r1auv.jpg" },
  { nombre: "Finral Roulacase",     rarity: "R",   image: "https://files.catbox.moe/9kydfm.jpg" },
  { nombre: "Subaru Natsuki",       rarity: "R",   image: "https://files.catbox.moe/9v4wsd.jpg" },
  { nombre: "Rem",                  rarity: "SR",  image: "https://files.catbox.moe/lhkyk3.jpeg" },
  { nombre: "Ram",                  rarity: "SR",  image: "https://files.catbox.moe/e7hxxi.jpg" },
  { nombre: "Emilia",               rarity: "SR",  image: "https://files.catbox.moe/63gape.jpg" },
  { nombre: "Beatrice",             rarity: "SSR", image: "https://files.catbox.moe/lp3h4e.jpg" },
  { nombre: "Roswaal L. Mathers",   rarity: "SSR", image: "https://files.catbox.moe/ag81b6.jpg" },
  { nombre: "Echidna",              rarity: "SSR", image: "https://files.catbox.moe/ajqlt5.jpg" },
  { nombre: "Reinhard van Astrea",  rarity: "SSR", image: "https://files.catbox.moe/xcyzcb.jpg" },
  { nombre: "Ainz Ooal Gown",       rarity: "SSR", image: "https://files.catbox.moe/oxcxkz.jpg" },
  { nombre: "Albedo",               rarity: "SSR", image: "https://files.catbox.moe/1h0scv.jpg" },
  { nombre: "Shalltear Bloodfallen",rarity: "SSR", image: "https://files.catbox.moe/ncvnsw.jpg" },
  { nombre: "Cocytus",              rarity: "SR",  image: "https://files.catbox.moe/6c9fv9.jpg" },
  { nombre: "Demiurge",             rarity: "SSR", image: "https://files.catbox.moe/tdh083.jpg" },
  { nombre: "Mare Bello Fiore",     rarity: "SR",  image: "https://files.catbox.moe/mqyb3e.jpg" },
  { nombre: "Aura Bella Fiora",     rarity: "SR",  image: "https://files.catbox.moe/573a2p.jpg" },
  { nombre: "Sebas Tian",           rarity: "SR",  image: "https://files.catbox.moe/vk74au.jpg" },
  { nombre: "Shigeo Kageyama",      rarity: "SSR", image: "https://files.catbox.moe/vwb4x4.jpg" },
  { nombre: "Reigen Arataka",       rarity: "R",   image: "https://files.catbox.moe/tybtdw.jpg" },
  { nombre: "Teru Hanazawa",        rarity: "SR",  image: "https://files.catbox.moe/9mlmmd.jpg" },
  { nombre: "Dimple",               rarity: "R",   image: "https://files.catbox.moe/ne98y5.jpg" },
  { nombre: "Ritsu Kageyama",       rarity: "SR",  image: "https://files.catbox.moe/1nnecm.jpg" },
  { nombre: "Shou Suzuki",          rarity: "SR",  image: "https://files.catbox.moe/5ga1rs.jpg" },
  { nombre: "Kirito",               rarity: "SSR", image: "https://files.catbox.moe/dg7z55.jpg" },
  { nombre: "Asuna",                rarity: "SR",  image: "https://files.catbox.moe/2h0pue.jpg" },
  { nombre: "Alice",                rarity: "SR",  image: "https://files.catbox.moe/qgo6at.jpg" },
  { nombre: "Sinon",                rarity: "SR",  image: "https://files.catbox.moe/savdtv.jpg" },
  { nombre: "Eugeo",                rarity: "SR",  image: "https://files.catbox.moe/u74bbj.jpg" },
  { nombre: "Yui",                  rarity: "R",   image: "https://files.catbox.moe/3e9gsw.jpg" },
  { nombre: "Light Yagami",         rarity: "SSR", image: "https://files.catbox.moe/jzvi6k.jpg" },
  { nombre: "L Lawliet",            rarity: "SSR", image: "https://files.catbox.moe/8o3guk.jpg" },
  { nombre: "Ryuk",                 rarity: "SR",  image: "https://files.catbox.moe/v6c6xv.jpg" },
  { nombre: "Near",                 rarity: "SR",  image: "https://files.catbox.moe/hdx1ql.jpg" },
  { nombre: "Mello",                rarity: "SR",  image: "https://files.catbox.moe/pjmity.jpg" },
  { nombre: "Rem (Shinigami)",      rarity: "SR",  image: "https://files.catbox.moe/4w8b4o.jpg" },
  { nombre: "Edward Elric",         rarity: "SR",  image: "https://files.catbox.moe/gctjg0.jpg" },
  { nombre: "Alphonse Elric",       rarity: "SR",  image: "https://files.catbox.moe/ei9m66.jpg" },
  { nombre: "Roy Mustang",          rarity: "SR",  image: "https://files.catbox.moe/3oxfna.jpg" },
  { nombre: "Father",               rarity: "SSR", image: "https://files.catbox.moe/nq6u7a.jpg" },
  { nombre: "Greed",                rarity: "SR",  image: "https://files.catbox.moe/5yn54w.jpg" },
  { nombre: "Envy",                 rarity: "SR",  image: "https://files.catbox.moe/xvfxq3.jpg" },
  { nombre: "Lust",                 rarity: "SR",  image: "https://files.catbox.moe/e357i3.jpg" },
  { nombre: "Scar",                 rarity: "SR",  image: "https://files.catbox.moe/2xpk5a.jpg" },
  { nombre: "Alex Louis Armstrong", rarity: "SR",  image: "https://files.catbox.moe/s577mi.jpg" },
  { nombre: "Thorfinn",             rarity: "SR",  image: "https://files.catbox.moe/1l6dua.jpg" },
  { nombre: "Askeladd",             rarity: "SR",  image: "https://files.catbox.moe/o3kawy.jpg" },
  { nombre: "Bjorn",                rarity: "SR",  image: "https://files.catbox.moe/03zpl1.jpg" },
  { nombre: "Floki",                rarity: "SR",  image: "https://files.catbox.moe/hbldbk.jpg" },
  { nombre: "Thors",                rarity: "SSR", image: "https://files.catbox.moe/nmqyuk.jpg" },
  { nombre: "Denji",                rarity: "SR",  image: "https://files.catbox.moe/0hd9y0.jpg" },
  { nombre: "Power",                rarity: "SR",  image: "https://files.catbox.moe/3pgxcf.jpg" },
  { nombre: "Makima",               rarity: "SSR", image: "https://files.catbox.moe/dlaoj5.jpg" },
  { nombre: "Aki Hayakawa",         rarity: "SR",  image: "https://files.catbox.moe/c4vc0r.jpg" },
  { nombre: "Kishibe",              rarity: "SSR", image: "https://files.catbox.moe/gtdwm4.jpg" },
  { nombre: "Quanxi",               rarity: "SSR", image: "https://files.catbox.moe/otieww.jpg" },
  { nombre: "Katana Man",           rarity: "SR",  image: "https://files.catbox.moe/psdqt8.jpg" },
  { nombre: "Lelouch vi Britannia", rarity: "SSR", image: "https://files.catbox.moe/gpxgj3.jpg" },
  { nombre: "Suzaku Kururugi",      rarity: "SR",  image: "https://files.catbox.moe/rfj7z4.jpg" },
  { nombre: "C.C.",                 rarity: "SR",  image: "https://files.catbox.moe/k2h14x.jpg" },
  { nombre: "Kallen Stadtfeld",     rarity: "SR",  image: "https://files.catbox.moe/g4vwt3.jpg" },
  { nombre: "Schneizel el Britannia",rarity: "SSR",image: "https://files.catbox.moe/mnme5h.jpg" },
  { nombre: "Sora",                 rarity: "SR",  image: "https://files.catbox.moe/luj03t.jpg" },
  { nombre: "Shiro",                rarity: "SR",  image: "https://files.catbox.moe/dmp780.jpg" },
  { nombre: "Jibril",               rarity: "SSR", image: "https://files.catbox.moe/pr6pis.jpg" },
  { nombre: "Stephanie Dola",       rarity: "R",   image: "https://files.catbox.moe/dj4x0x.jpg" },
  { nombre: "Rimuru Tempest",       rarity: "SSR", image: "https://files.catbox.moe/uvdfz5.jpg" },
  { nombre: "Milim Nava",           rarity: "SSR", image: "https://files.catbox.moe/gbulsi.jpg" },
  { nombre: "Benimaru",             rarity: "SR",  image: "https://files.catbox.moe/ybshiu.jpg" },
  { nombre: "Shion",                rarity: "SR",  image: "https://files.catbox.moe/ri3zbm.jpg" },
  { nombre: "Gobta",                rarity: "R",   image: "https://files.catbox.moe/4bhxpu.jpg" },
  { nombre: "Diablo",               rarity: "SSR", image: "https://files.catbox.moe/s88821.jpg" },
  { nombre: "Veldora Tempest",      rarity: "SSR", image: "https://files.catbox.moe/x6ugl8.jpg" },
  { nombre: "Guy Crimson",          rarity: "SSR", image: "https://files.catbox.moe/pm7iyf.jpg" },
  { nombre: "Tohru",                rarity: "SSR", image: "https://files.catbox.moe/h4fluv.jpg" },
  { nombre: "Lucoa",                rarity: "SSR", image: "https://files.catbox.moe/zb5r9l.jpg" },
  { nombre: "Kanna Kamui",          rarity: "SR",  image: "https://files.catbox.moe/fcjtf1.jpg" },
  { nombre: "Elma",                 rarity: "SR",  image: "https://files.catbox.moe/484pxf.jpeg" },
  { nombre: "Shinji Ikari",         rarity: "SR",  image: "https://files.catbox.moe/fyzlcz.jpg" },
  { nombre: "Rei Ayanami",          rarity: "SR",  image: "https://files.catbox.moe/sc0dng.jpg" },
  { nombre: "Asuka Langley",        rarity: "SR",  image: "https://files.catbox.moe/91zjyq.jpg" },
  { nombre: "Kaworu Nagisa",        rarity: "SSR", image: "https://files.catbox.moe/lp3h4e.jpg" },
  { nombre: "Boruto Uzumaki",       rarity: "SR",  image: "https://files.catbox.moe/nkcpkc.jpg" },
  { nombre: "Kawaki",               rarity: "SSR", image: "https://files.catbox.moe/ldcdbj.jpg" },
  { nombre: "Momoshiki Otsutsuki",  rarity: "SSR", image: "https://files.catbox.moe/6bpngi.jpg" },
  { nombre: "Maka Albarn",          rarity: "SR",  image: "https://files.catbox.moe/ypmmlg.jpg" },
  { nombre: "Soul Evans",           rarity: "SR",  image: "https://files.catbox.moe/emb9d2.jpg" },
  { nombre: "Death the Kid",        rarity: "SSR", image: "https://files.catbox.moe/ocl0r5.jpg" },
  { nombre: "Black Star",           rarity: "SR",  image: "https://files.catbox.moe/sw2iab.jpg" },
  { nombre: "Lord Death",           rarity: "SSR", image: "https://files.catbox.moe/qv2hmo.jpg" },
  { nombre: "Asura (Kishin)",       rarity: "SSR", image: "https://files.catbox.moe/mrc1sc.jpg" },
  { nombre: "Koro-sensei",          rarity: "SSR", image: "https://files.catbox.moe/ba4e1w.jpg" },
  { nombre: "Karma Akabane",        rarity: "SR",  image: "https://files.catbox.moe/dxpfe4.jpg" },
  { nombre: "Nagisa Shiota",        rarity: "SR",  image: "https://files.catbox.moe/7ohy0c.jpg" },
  { nombre: "Accelerator",          rarity: "SSR", image: "https://files.catbox.moe/dt2ymt.jpg" },
  { nombre: "Mikoto Misaka",        rarity: "SSR", image: "https://files.catbox.moe/3re8fn.jpg" },
  { nombre: "Touma Kamijou",        rarity: "SR",  image: "https://files.catbox.moe/aohk89.jpg" },
  { nombre: "Naofumi Iwatani",      rarity: "SR",  image: "https://files.catbox.moe/tib6li.jpg" },
  { nombre: "Raphtalia",            rarity: "SR",  image: "https://files.catbox.moe/ltt263.jpg" },
  { nombre: "Filo",                 rarity: "SR",  image: "https://files.catbox.moe/2c1bqn.jpg" },
  { nombre: "Malty Melromarc",      rarity: "SR",  image: "https://files.catbox.moe/uz49us.jpg" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const COOLDOWN_GACHA = 5 * 60 * 1000; // 5 minutos

const PROB_LIBRE = { SSR: 0.05, SR: 0.45, R: 0.50 };

const PROB_COFRES = {
  cofregacha_comun:      { SSR: 0.00, SR: 0.50, R: 0.50 },
  cofregacha_raro:       { SSR: 0.10, SR: 0.90, R: 0.00 },
  cofregacha_legendario: { SSR: 1.00, SR: 0.00, R: 0.00 },
};

const EMOJI_RARITY = { SSR: "⭐⭐⭐", SR: "⭐⭐", R: "⭐" };
const COLOR_RARITY = { SSR: "🌟", SR: "✨", R: "🔹" };

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function elegirRareza(probs) {
  const r = Math.random();
  if (r < probs.SSR) return "SSR";
  if (r < probs.SSR + probs.SR) return "SR";
  return "R";
}

function sortearPersonaje(rareza) {
  const pool = PERSONAJES.filter(p => p.rarity === rareza);
  return pool[Math.floor(Math.random() * pool.length)];
}

function agregarAColeccion(user, personaje) {
  if (!Array.isArray(user.gacha)) user.gacha = [];
  const existe = user.gacha.find(p => p.nombre === personaje.nombre);
  if (existe) {
    existe.cantidad = (existe.cantidad || 1) + 1;
  } else {
    user.gacha.push({ nombre: personaje.nombre, rarity: personaje.rarity, cantidad: 1 });
  }
}

function ordenarColeccion(col) {
  const orden = { SSR: 0, SR: 1, R: 2 };
  return [...col].sort((a, b) => {
    if (orden[a.rarity] !== orden[b.rarity]) return orden[a.rarity] - orden[b.rarity];
    return a.nombre.localeCompare(b.nombre);
  });
}

/** Busca la data completa (con imagen) de un personaje por nombre */
function getPersonajeData(nombre) {
  return PERSONAJES.find(p => p.nombre === nombre);
}

/** Envía imagen + caption, con fallback a solo texto si la imagen falla */
async function sendCardImage(sock, msg, chatId, imageUrl, caption) {
  try {
    await sock.sendMessage(chatId, {
      image: { url: imageUrl },
      caption
    }, { quoted: msg });
  } catch (e) {
    await sock.sendMessage(chatId, { text: caption }, { quoted: msg });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUBCOMANDOS
// ─────────────────────────────────────────────────────────────────────────────

/** .gacha  — claim gratuito cada 5 min */
async function cmdClaim(sock, msg, chatId, user, id, db) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });
  const ahora = Date.now();
  const diff  = ahora - (user.lastGacha || 0);

  if (diff < COOLDOWN_GACHA) {
    const resta = COOLDOWN_GACHA - diff;
    const m = Math.floor(resta / 60000);
    const s = Math.floor((resta % 60000) / 1000);
    return send(`⏳ Ya reclamaste tu gacha.\n\nVuelve en *${m}m ${s}s*`);
  }

  const rareza    = elegirRareza(PROB_LIBRE);
  const personaje = sortearPersonaje(rareza);

  agregarAColeccion(user, personaje);
  user.lastGacha = ahora;
  saveDB(db);

  const total = user.gacha.find(p => p.nombre === personaje.nombre)?.cantidad || 1;
  const esDup = total > 1;

  const caption = [
    `${COLOR_RARITY[rareza]} *¡GACHA CLAIM!* ${COLOR_RARITY[rareza]}`,
    ``,
    `${EMOJI_RARITY[rareza]} *${personaje.nombre}*`,
    `🏷️ Rareza: *${rareza}*`,
    esDup ? `📦 Duplicado #${total} (ya lo tenías)` : `🆕 ¡Personaje nuevo!`,
    ``,
    `📚 Colección: *${user.gacha.length}* personajes distintos`,
    ``,
    `⏰ Próximo claim en *5 minutos*`,
  ].join("\n");

  return sendCardImage(sock, msg, chatId, personaje.image, caption);
}

/** .gacha coleccion  — muestra tu colección paginada (solo texto) */
async function cmdColeccion(sock, msg, chatId, user, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  if (!Array.isArray(user.gacha) || user.gacha.length === 0) {
    return send(`📭 No tienes personajes aún.\n\nUsa *.gacha* cada 5 min o abre cofres con *.gacha abrir <cofre>*`);
  }

  const pagSize = 20;
  const pag     = Math.max(1, parseInt(args[1]) || 1);
  const col     = ordenarColeccion(user.gacha);
  const total   = col.length;
  const pages   = Math.ceil(total / pagSize);
  const slice   = col.slice((pag - 1) * pagSize, pag * pagSize);

  const totalSSR = col.filter(p => p.rarity === "SSR").length;
  const totalSR  = col.filter(p => p.rarity === "SR").length;
  const totalR   = col.filter(p => p.rarity === "R").length;
  const totalCartas = col.reduce((s, p) => s + (p.cantidad || 1), 0);

  const lineas = [
    `📚 *TU COLECCIÓN GACHA*`,
    `🃏 ${totalCartas} cartas  •  🌟 ${totalSSR} SSR  •  ✨ ${totalSR} SR  •  🔹 ${totalR} R`,
    `📄 Página ${pag}/${pages}`,
    ``,
  ];

  slice.forEach((p, i) => {
    const num    = (pag - 1) * pagSize + i + 1;
    const emoji  = COLOR_RARITY[p.rarity];
    const cnt    = p.cantidad > 1 ? ` x${p.cantidad}` : "";
    lineas.push(`${String(num).padStart(3, " ")}. ${emoji} *${p.nombre}*${cnt}  [${p.rarity}]`);
  });

  if (pages > 1) lineas.push(`\n> Página siguiente: *.gacha coleccion ${pag + 1}*`);
  lineas.push(`\n> 💡 *.gacha ver <número>* para ver la imagen`);

  return send(lineas.join("\n"));
}

/** .gacha ver <número>  — muestra la imagen de un personaje de tu colección */
async function cmdVer(sock, msg, chatId, user, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const numIdx = parseInt(args[1]);
  if (isNaN(numIdx) || numIdx < 1) {
    return send(`❌ Uso: *.gacha ver <número>*\n\nMira los números con *.gacha coleccion*`);
  }

  const col = Array.isArray(user.gacha) ? ordenarColeccion(user.gacha) : [];
  const item = col[numIdx - 1];
  if (!item) {
    return send(`❌ No existe el número *${numIdx}*. Tienes *${col.length}* personajes.`);
  }

  const data = getPersonajeData(item.nombre);
  if (!data) return send(`❌ No se encontró la imagen de *${item.nombre}*.`);

  const caption = [
    `${COLOR_RARITY[item.rarity]} *${item.nombre}*`,
    `🏷️ Rareza: *${item.rarity}*`,
    `📦 Cantidad: *${item.cantidad || 1}*`,
  ].join("\n");

  return sendCardImage(sock, msg, chatId, data.image, caption);
}

/** .gacha abrir <cofre>  — abre cofre del inventario */
async function cmdAbrir(sock, msg, chatId, user, id, db, args) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const cofres = {
    comun:      "cofregacha_comun",
    raro:       "cofregacha_raro",
    legendario: "cofregacha_legendario",
  };

  const alias = args[1]?.toLowerCase();
  const cofreId = cofres[alias] || (Object.values(cofres).includes(alias) ? alias : null);

  if (!cofreId) {
    return send([
      `🎁 *Cofres gacha disponibles*`,
      ``,
      `• *.gacha abrir comun*      — 📦 Cofre Común  (R/SR)`,
      `• *.gacha abrir raro*       — 🎁 Cofre Raro   (SR garantizado, 10% SSR)`,
      `• *.gacha abrir legendario* — 💎 Cofre Legendario (SSR garantizado)`,
      ``,
      `Compra cofres con *.comprar cofregacha_comun*`,
    ].join("\n"));
  }

  const idx = user.inventario?.findIndex(i => i.id === cofreId);
  if (idx === undefined || idx < 0) {
    const nombres = { cofregacha_comun: "Cofre Común", cofregacha_raro: "Cofre Raro", cofregacha_legendario: "Cofre Legendario" };
    return send(`❌ No tienes *${nombres[cofreId]}* en tu inventario.\nCómpralo con *.comprar ${cofreId}*`);
  }

  const probs    = PROB_COFRES[cofreId];
  const rareza   = elegirRareza(probs);
  const personaje = sortearPersonaje(rareza);

  agregarAColeccion(user, personaje);
  user.inventario.splice(idx, 1);
  saveDB(db);

  const total = user.gacha.find(p => p.nombre === personaje.nombre)?.cantidad || 1;
  const esDup = total > 1;
  const restantes = user.inventario.filter(i => i.id === cofreId).length;

  const nombresCofre = {
    cofregacha_comun:      "📦 Cofre Gacha Común",
    cofregacha_raro:       "🎁 Cofre Gacha Raro",
    cofregacha_legendario: "💎 Cofre Gacha Legendario",
  };

  const caption = [
    `${nombresCofre[cofreId]}`,
    ``,
    `${COLOR_RARITY[rareza]} *${rareza === "SSR" ? "¡SSR OBTENIDO!" : rareza === "SR" ? "SR obtenido!" : "R obtenido"}*`,
    ``,
    `${EMOJI_RARITY[rareza]} *${personaje.nombre}*`,
    `🏷️ Rareza: *${rareza}*`,
    esDup ? `📦 Duplicado #${total}` : `🆕 ¡Personaje nuevo!`,
    ``,
    `📚 Colección: *${user.gacha.length}* personajes distintos`,
    restantes > 0 ? `🎁 Te quedan *${restantes}* cofres de este tipo` : ``,
  ].filter(Boolean).join("\n");

  return sendCardImage(sock, msg, chatId, personaje.image, caption);
}

/** .gacha perfil  — resumen de colección */
async function cmdPerfil(sock, msg, chatId, user) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const col = Array.isArray(user.gacha) ? user.gacha : [];
  const totalDistintos = col.length;
  const totalPersonajes = PERSONAJES.length;
  const totalCartas  = col.reduce((s, p) => s + (p.cantidad || 1), 0);
  const totalSSR = col.filter(p => p.rarity === "SSR").length;
  const totalSR  = col.filter(p => p.rarity === "SR").length;
  const totalR   = col.filter(p => p.rarity === "R").length;

  const ssrPool = PERSONAJES.filter(p => p.rarity === "SSR").length;
  const srPool  = PERSONAJES.filter(p => p.rarity === "SR").length;
  const rPool   = PERSONAJES.filter(p => p.rarity === "R").length;

  const pct = totalPersonajes > 0
    ? ((totalDistintos / totalPersonajes) * 100).toFixed(1)
    : "0.0";

  const top5 = [...col]
    .sort((a, b) => (b.cantidad || 1) - (a.cantidad || 1))
    .slice(0, 5);

  const resta = COOLDOWN_GACHA - (Date.now() - (user.lastGacha || 0));
  const cooldownTxt = resta > 0
    ? `${Math.floor(resta / 60000)}m ${Math.floor((resta % 60000) / 1000)}s`
    : "¡Listo!";

  const lineas = [
    `╭━━━━━━━━━━━━━━━━━━━━╮`,
    `┃  🌸 *PERFIL GACHA*  🌸  ┃`,
    `╰━━━━━━━━━━━━━━━━━━━━╯`,
    ``,
    `╭─ 📚 *COLECCIÓN*`,
    `│ 🃏 Cartas totales: *${totalCartas}*`,
    `│ 🆔 Distintos: *${totalDistintos}/${totalPersonajes}* (${pct}%)`,
    `│ 🌟 SSR: *${totalSSR}/${ssrPool}*`,
    `│ ✨ SR:  *${totalSR}/${srPool}*`,
    `│ 🔹 R:   *${totalR}/${rPool}*`,
    `╰──────────────────`,
    ``,
    `╭─ ⏰ *GACHA LIBRE*`,
    `│ Próximo claim: *${cooldownTxt}*`,
    `╰──────────────────`,
  ];

  if (top5.length > 0) {
    lineas.push(``, `╭─ 🏆 *MÁS REPETIDOS*`);
    top5.forEach((p, i) => {
      lineas.push(`│ ${i + 1}. ${COLOR_RARITY[p.rarity]} *${p.nombre}* x${p.cantidad || 1}`);
    });
    lineas.push(`╰──────────────────`);
  }

  lineas.push(``, `> 💡 *.gacha coleccion* para ver todo`);
  lineas.push(`> 💡 *.gacha ver <número>* para ver la imagen`);

  return send(lineas.join("\n"));
}

/** .gacha top  — ranking de coleccionistas del grupo */
async function cmdTop(sock, msg, chatId, db) {
  const send = t => sock.sendMessage(chatId, { text: t }, { quoted: msg });

  const usuarios = Object.entries(db.usuarios || {});
  if (usuarios.length === 0) return send("📭 Nadie tiene personajes aún.");

  const ranking = usuarios
    .map(([id, u]) => ({
      id,
      nombre:   u.nombre || `+${id}`,
      distintos: Array.isArray(u.gacha) ? u.gacha.length : 0,
      cartas:    Array.isArray(u.gacha) ? u.gacha.reduce((s, p) => s + (p.cantidad || 1), 0) : 0,
      ssr:       Array.isArray(u.gacha) ? u.gacha.filter(p => p.rarity === "SSR").length : 0,
    }))
    .filter(u => u.distintos > 0)
    .sort((a, b) => b.distintos - a.distintos || b.ssr - a.ssr)
    .slice(0, 10);

  if (ranking.length === 0) return send("📭 Nadie tiene personajes aún.");

  const medallas = ["🥇", "🥈", "🥉"];
  const lineas   = [`🏆 *TOP COLECCIONISTAS GACHA*`, ``];

  ranking.forEach((u, i) => {
    const med = medallas[i] || `${i + 1}.`;
    lineas.push(`${med} *${u.nombre}*`);
    lineas.push(`   🆔 ${u.distintos} distintos  •  🃏 ${u.cartas} cartas  •  🌟 ${u.ssr} SSR`);
  });

  return send(lineas.join("\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default {
  name: "gacha",
  aliases: ["invoca", "invocar"],
  description: "Sistema gacha de personajes anime",

  async run(sock, msg, args, chatId, isOwner, isGroup, sender) {
    const db   = loadDB();
    const id   = numId(sender || msg?.key?.participant || msg?.key?.remoteJid);
    const user = getUser(db, id);

    if (!Array.isArray(user.gacha))   user.gacha    = [];
    if (user.lastGacha === undefined) user.lastGacha = 0;
    if (!Array.isArray(db.mercadoGacha)) db.mercadoGacha = [];

    const sub = args[0]?.toLowerCase();

    if (!sub)                          return cmdClaim(sock, msg, chatId, user, id, db);
    if (sub === "coleccion" || sub === "col" || sub === "lista")
                                       return cmdColeccion(sock, msg, chatId, user, args);
    if (sub === "ver" || sub === "view")
                                       return cmdVer(sock, msg, chatId, user, args);
    if (sub === "abrir" || sub === "open" || sub === "cofre")
                                       return cmdAbrir(sock, msg, chatId, user, id, db, args);
    if (sub === "perfil" || sub === "stats" || sub === "info")
                                       return cmdPerfil(sock, msg, chatId, user);
    if (sub === "top" || sub === "rank" || sub === "ranking")
                                       return cmdTop(sock, msg, chatId, db);

    return sock.sendMessage(chatId, {
      text: [
        `🌸 *SISTEMA GACHA*`,
        ``,
        `• *.gacha*               — Claim gratis cada 5 min (con imagen)`,
        `• *.gacha coleccion*     — Ver tu colección`,
        `• *.gacha coleccion 2*   — Página 2, 3...`,
        `• *.gacha ver <número>*  — Ver la imagen de un personaje`,
        `• *.gacha abrir comun*   — Abrir cofre común`,
        `• *.gacha abrir raro*    — Abrir cofre raro`,
        `• *.gacha abrir legendario* — Abrir cofre legendario`,
        `• *.gacha perfil*        — Resumen de tu colección`,
        `• *.gacha top*           — Ranking de coleccionistas`,
        ``,
        `🛒 Compra cofres: *.comprar cofregacha_comun*`,
        `💹 Mercado gacha: *.mercadogacha*`,
      ].join("\n")
    }, { quoted: msg });
  },
};