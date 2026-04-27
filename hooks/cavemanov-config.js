#!/usr/bin/env node
// cavemanov — shared configuration resolver
//
// Resolution order for default mode:
//   1. CAVEMANOV_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $XDG_CONFIG_HOME/cavemanov/config.json (any platform, if set)
//      - ~/.config/cavemanov/config.json (macOS / Linux fallback)
//      - %APPDATA%\cavemanov\config.json (Windows fallback)
//   3. 'full'
//
// Resolution order for default language:
//   1. CAVEMANOV_DEFAULT_LANG environment variable
//   2. Config file defaultLang field
//   3. 'ru'
//
// Flag-file format:
//   - New: "lang|mode" (e.g. "ru|full", "kk|ultra")
//   - Legacy: "mode" alone — treated as ru|<mode> for backward compatibility

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = [
  'off', 'lite', 'full', 'ultra',
  'commit', 'review', 'compress'
];

const VALID_LANGS = ['ru', 'kk'];

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'cavemanov');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'cavemanov'
    );
  }
  return path.join(os.homedir(), '.config', 'cavemanov');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function loadConfig() {
  try {
    const configPath = getConfigPath();
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function getDefaultMode() {
  const envMode = process.env.CAVEMANOV_DEFAULT_MODE;
  if (envMode && VALID_MODES.includes(envMode.toLowerCase())) {
    return envMode.toLowerCase();
  }

  const config = loadConfig();
  if (config.defaultMode && VALID_MODES.includes(String(config.defaultMode).toLowerCase())) {
    return String(config.defaultMode).toLowerCase();
  }

  return 'full';
}

function getDefaultLang() {
  const envLang = process.env.CAVEMANOV_DEFAULT_LANG;
  if (envLang && VALID_LANGS.includes(envLang.toLowerCase())) {
    return envLang.toLowerCase();
  }

  const config = loadConfig();
  if (config.defaultLang && VALID_LANGS.includes(String(config.defaultLang).toLowerCase())) {
    return String(config.defaultLang).toLowerCase();
  }

  return 'ru';
}

// Serialize lang+mode for the flag file. Format: "lang|mode".
function serializeFlag(lang, mode) {
  return `${lang}|${mode}`;
}

// Symlink-safe flag file write.
// Refuses symlinks at the target file and at the immediate parent directory,
// uses O_NOFOLLOW where available, writes atomically via temp + rename with
// 0600 permissions. Protects against local attackers replacing the predictable
// flag path (~/.claude/.cavemanov-active) with a symlink to clobber other files.
function safeWriteFlag(flagPath, content) {
  try {
    const flagDir = path.dirname(flagPath);
    fs.mkdirSync(flagDir, { recursive: true });

    try {
      if (fs.lstatSync(flagDir).isSymbolicLink()) return;
    } catch (e) {
      return;
    }

    try {
      if (fs.lstatSync(flagPath).isSymbolicLink()) return;
    } catch (e) {
      if (e.code !== 'ENOENT') return;
    }

    const tempPath = path.join(flagDir, `.cavemanov-active.${process.pid}.${Date.now()}`);
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | O_NOFOLLOW;
    let fd;
    try {
      fd = fs.openSync(tempPath, flags, 0o600);
      fs.writeSync(fd, String(content));
      try { fs.fchmodSync(fd, 0o600); } catch (e) { /* best-effort on Windows */ }
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    fs.renameSync(tempPath, flagPath);
  } catch (e) {
    // Silent fail — flag is best-effort
  }
}

// Symlink-safe, size-capped, whitelist-validated flag file read.
// Symmetric with safeWriteFlag: refuses symlinks at the target, caps the read,
// and rejects anything that isn't a known mode. Returns null on any anomaly.
//
// Returns either:
//   - { lang, mode } object on success
//   - null on any anomaly
//
// Accepts both new format ("lang|mode") and legacy format ("mode" alone, → ru).
const MAX_FLAG_BYTES = 64;

function readFlag(flagPath) {
  try {
    let st;
    try {
      st = fs.lstatSync(flagPath);
    } catch (e) {
      return null;
    }
    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const flags = fs.constants.O_RDONLY | O_NOFOLLOW;
    let fd;
    let out;
    try {
      fd = fs.openSync(flagPath, flags);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = fs.readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      out = buf.slice(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }

    const raw = out.trim().toLowerCase();

    // New format: "lang|mode"
    if (raw.includes('|')) {
      const [lang, mode] = raw.split('|', 2);
      if (!VALID_LANGS.includes(lang)) return null;
      if (!VALID_MODES.includes(mode)) return null;
      return { lang, mode };
    }

    // Legacy format: "mode" alone — assume ru
    if (VALID_MODES.includes(raw)) {
      return { lang: 'ru', mode: raw };
    }

    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  getDefaultMode,
  getDefaultLang,
  getConfigDir,
  getConfigPath,
  VALID_MODES,
  VALID_LANGS,
  safeWriteFlag,
  readFlag,
  serializeFlag,
};
