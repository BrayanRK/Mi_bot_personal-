import axios from "axios";
import { reply } from "../../utils.js";

// Firmas simples para detectar tecnologías por headers y contenido
const SIGNATURES = {
  "WordPress":    { html: /wp-content|wp-includes/i },
  "Joomla":       { html: /joomla/i },
  "Drupal":       { html: /drupal/i, header: { "x-generator": /drupal/i } },
  "Shopify":      { html: /shopify/i, header: { "x-shopid": /./i } },
  "Wix":          { html: /wix\.com/i },
  "Next.js":      { header: { "x-powered-by": /next\.js/i }, html: /__NEXT_DATA__/i },
  "Nuxt.js":      { html: /__nuxt/i },
  "React":        { html: /react\.development|react\.production|__reactFiber/i },
  "Vue.js":       { html: /vue\.js|__vue__/i },
  "Angular":      { html: /ng-version|angular/i },
  "jQuery":       { html: /jquery/i },
  "Bootstrap":    { html: /bootstrap\.css|bootstrap\.min/i },
  "Tailwind":     { html: /tailwind/i },
  "Laravel":      { header: { "x-powered-by": /PHP/i }, html: /laravel/i },
  "Django":       { header: { "x-frame-options": /SAMEORIGIN/i }, html: /csrfmiddlewaretoken/i },
  "Ruby on Rails":{ header: { "x-powered-by": /Phusion/i }, html: /rails/i },
  "Express.js":   { header: { "x-powered-by": /express/i } },
  "Nginx":        { header: { server: /nginx/i } },
  "Apache":       { header: { server: /apache/i } },
  "Cloudflare":   { header: { server: /cloudflare/i, "cf-ray": /./i } },
  "PHP":          { header: { "x-powered-by": /PHP/i } },
  "ASP.NET":      { header: { "x-powered-by": /ASP\.NET/i, "x-aspnet-version": /./i } },
  "Google Analytics": { html: /google-analytics\.com|gtag\(/i },
  "Google Tag Manager": { html: /googletagmanager\.com/i },
  "Font Awesome": { html: /font-awesome|fontawesome/i },
  "Stripe":       { html: /stripe\.com\/v3/i },
  "reCAPTCHA":    { html: /recaptcha/i },
};

export default {
  name: "tecnologias",
  aliases: ["tech", "wappalyzer", "stack"],
  run: async (sock, msg, args, jid) => {
    let url = args[0]?.trim();
    if (!url) {
      return reply(sock, jid, "❌ Uso: `.tech https://ejemplo.com`", msg);
    }
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    try {
      const { data: html, headers } = await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        maxRedirects: 5,
        validateStatus: () => true,
      });

      const detected = [];

      for (const [tech, sigs] of Object.entries(SIGNATURES)) {
        let found = false;
        if (sigs.html && sigs.html.test(html)) found = true;
        if (!found && sigs.header) {
          for (const [hKey, hPattern] of Object.entries(sigs.header)) {
            if (headers[hKey] && hPattern.test(headers[hKey])) { found = true; break; }
          }
        }
        if (found) detected.push(tech);
      }

      // Info adicional de headers
      const server  = headers["server"] || "N/A";
      const powered = headers["x-powered-by"] || "N/A";
      const cms     = detected.filter(t => ["WordPress","Joomla","Drupal","Shopify","Wix"].includes(t));
      const frameworks = detected.filter(t => ["Next.js","Nuxt.js","React","Vue.js","Angular","Laravel","Django","Express.js"].includes(t));
      const infra   = detected.filter(t => ["Nginx","Apache","Cloudflare","PHP","ASP.NET"].includes(t));
      const otros   = detected.filter(t => !cms.includes(t) && !frameworks.includes(t) && !infra.includes(t));

      let texto = `🔬 *Tecnologías de* ${url}\n\n`;
      texto += `🖥️ *Servidor:* ${server}\n`;
      texto += `⚙️ *Powered by:* ${powered}\n`;

      if (cms.length)        texto += `\n🏗️ *CMS:* ${cms.join(", ")}`;
      if (frameworks.length) texto += `\n⚡ *Frameworks:* ${frameworks.join(", ")}`;
      if (infra.length)      texto += `\n🏢 *Infraestructura:* ${infra.join(", ")}`;
      if (otros.length)      texto += `\n🧩 *Otros:* ${otros.join(", ")}`;

      if (!detected.length)
        texto += `\n⚠️ No se detectaron tecnologías conocidas.`;
      else
        texto += `\n\n📊 *Total detectadas:* ${detected.length}`;

      await reply(sock, jid, texto, msg);

    } catch (e) {
      await reply(sock, jid, `❌ No se pudo analizar el sitio: ${e.message}`, msg);
    }
  },
};

