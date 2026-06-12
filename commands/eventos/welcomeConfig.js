import fs from "fs-extra";

const CONFIG_PATH = "./data/welcomeConfig.json";

async function loadConfig() {
  try {
    return await fs.readJson(CONFIG_PATH);
  } catch {
    return { enabled: [] };
  }
}

async function saveConfig(config) {
  await fs.ensureDir("./data");
  await fs.writeJson(CONFIG_PATH, config, { spaces: 2 });
}

// Por defecto: APAGADO
export async function isWelcomeEnabled(groupJid) {
  const config = await loadConfig();
  return config.enabled.includes(groupJid);
}

// Activar welcome
export async function enableWelcome(groupJid) {
  const config = await loadConfig();

  if (!config.enabled.includes(groupJid)) {
    config.enabled.push(groupJid);
    await saveConfig(config);
  }
}

// Desactivar welcome
export async function disableWelcome(groupJid) {
  const config = await loadConfig();

  config.enabled = config.enabled.filter(
    jid => jid !== groupJid
  );

  await saveConfig(config);
}