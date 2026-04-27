#!/usr/bin/env node
// cavemanov — UserPromptSubmit hook to track which cavemanov mode+lang is active.
// Inspects user input for Russian/Kazakh/English triggers and /cavemanov commands,
// writes mode to flag file, emits per-turn reinforcement.

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getDefaultMode,
  getDefaultLang,
  safeWriteFlag,
  readFlag,
  serializeFlag,
  VALID_LANGS,
  VALID_MODES,
} = require('./cavemanov-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemanov-active');

function hasAny(text, patterns) {
  return patterns.some(p => text.includes(p));
}

// Activation patterns by language.
// Kazakh patterns are draft — VERIFY with native speaker.
const ACTIVATE_PATTERNS_RU = [
  'включи пещер', 'включить пещер',
  'активируй пещер', 'активировать пещер',
  'запусти пещер', 'запустить пещер',
  'говори как пещер', 'говорить как пещер',
  'пещерный режим', 'пещерного режима', 'пещерный реж',
  'меньше токенов', 'будь краток', 'будь кратким', 'краткий режим',
  'экономь токены', 'экономия токенов',
];

const ACTIVATE_PATTERNS_KK = [
  // [VERIFY: native speaker]
  'пещерный режим қазақша', 'қазақша пещерный',
  'қазақша қысқарт', 'қазақша қысқа',
  'көп таңбалама', 'таңба үнемде',
  'токен үнемде', 'токенді азайт',
  'қысқа сөйле', 'қысқа жауап бер',
];

const ACTIVATE_PATTERNS_EN = [
  'activate cavemanov', 'enable cavemanov', 'turn on cavemanov',
  'cavemanov mode', 'cavemanov on', 'start cavemanov',
];

const DEACTIVATE_PATTERNS = [
  // Russian
  'стоп пещер', 'выключи пещер', 'выключить пещер',
  'отключи пещер', 'отключить пещер', 'останови пещер',
  'обычный режим', 'нормальный режим', 'обычный реж',
  // Kazakh [VERIFY]
  'қалыпты режим', 'қалыпты реж',
  'пещерный өшір', 'пещерныйді өшір',
  // English
  'stop cavemanov', 'disable cavemanov', 'turn off cavemanov',
  'deactivate cavemanov', 'normal mode',
];

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim().toLowerCase();

    const currentFlag = readFlag(flagPath);
    let lang = currentFlag ? currentFlag.lang : getDefaultLang();
    let mode = currentFlag ? currentFlag.mode : null;

    // Natural-language activation — but only if no deactivation pattern present.
    if (!hasAny(prompt, DEACTIVATE_PATTERNS)) {
      if (hasAny(prompt, ACTIVATE_PATTERNS_KK)) {
        lang = 'kk';
        mode = mode || getDefaultMode();
      } else if (hasAny(prompt, ACTIVATE_PATTERNS_RU) ||
                 hasAny(prompt, ACTIVATE_PATTERNS_EN)) {
        if (!currentFlag) lang = getDefaultLang();
        mode = mode || getDefaultMode();
      }

      if (mode && mode !== 'off') {
        safeWriteFlag(flagPath, serializeFlag(lang, mode));
      }
    }

    // Slash-command activation
    if (prompt.startsWith('/cavemanov')) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0];

      let nextMode = null;
      let nextLang = lang;

      if (cmd === '/cavemanov-commit' || cmd === '/cavemanov:cavemanov-commit') {
        nextMode = 'commit';
      } else if (cmd === '/cavemanov-review' || cmd === '/cavemanov:cavemanov-review') {
        nextMode = 'review';
      } else if (cmd === '/cavemanov-compress' || cmd === '/cavemanov:cavemanov-compress') {
        nextMode = 'compress';
      } else if (cmd === '/cavemanov-kk' || cmd === '/cavemanov:cavemanov-kk') {
        nextLang = 'kk';
        const arg = (parts[1] || '').toLowerCase();
        nextMode = parseModeArg(arg) || getDefaultMode();
      } else if (cmd === '/cavemanov' || cmd === '/cavemanov:cavemanov') {
        // Accept "<lang>", "<mode>", "<lang> <mode>", "<mode> <lang>", or none.
        const arg1 = (parts[1] || '').toLowerCase();
        const arg2 = (parts[2] || '').toLowerCase();

        const argLang = (a) => VALID_LANGS.includes(a) ? a : null;
        const argMode = (a) => parseModeArg(a);

        const l1 = argLang(arg1), m1 = argMode(arg1);
        const l2 = argLang(arg2), m2 = argMode(arg2);

        const parsedLang = l1 || l2 || null;
        const parsedMode = m1 || m2 || null;

        if (parsedLang) nextLang = parsedLang;

        if (parsedMode) {
          nextMode = parsedMode;
        } else if (parsedLang) {
          // Language-only switch — keep current mode, or default if none.
          nextMode = mode || getDefaultMode();
        } else if (!arg1) {
          // Bare /cavemanov — activate with default mode.
          nextMode = getDefaultMode();
        }
      }

      if (nextMode === 'off') {
        try { fs.unlinkSync(flagPath); } catch (e) {}
      } else if (nextMode) {
        safeWriteFlag(flagPath, serializeFlag(nextLang, nextMode));
        lang = nextLang;
        mode = nextMode;
      }
    }

    // Deactivation — natural language
    if (hasAny(prompt, DEACTIVATE_PATTERNS)) {
      try { fs.unlinkSync(flagPath); } catch (e) {}
    }

    // Per-turn reinforcement: emit a short reminder when cavemanov is active.
    const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);
    const active = readFlag(flagPath);
    if (active && !INDEPENDENT_MODES.has(active.mode)) {
      const reminder = active.lang === 'kk'
        ? buildKkReminder(active.mode)
        : buildRuReminder(active.mode);

      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: reminder
        }
      }));
    }
  } catch (e) {
    // Silent fail
  }
});

function parseModeArg(arg) {
  if (!arg) return null;
  if (arg === 'off') return 'off';
  if (VALID_MODES.includes(arg)) return arg;
  return null;
}

function buildRuReminder(mode) {
  return "CAVEMANOV MODE ACTIVE (RU, " + mode + "). " +
    "Убирать воду/вежливость/хеджирование. " +
    "Русские приёмы: pro-drop (думаю, не 'я думаю'); тире вместо связки (X — Y); " +
    "краткие формы (сломан, не сломанный); ИМПЕРАТИВ для команд (оберни, не 'нужно обернуть'); " +
    "инструментальный падеж (командой, не 'с помощью команды'). " +
    "Фрагменты ок. Код/коммиты/безопасность — нормально.";
}

function buildKkReminder(mode) {
  return "CAVEMANOV MODE ACTIVE (KK, " + mode + "). " +
    "Суды/сыпайылықты/гедждеуді алып таста. " +
    "Тек қазаққа тән: агглютинация (жалғаулар тізбегі — үйлеріңіздегілер); " +
    "тәуелдік жалғауы (кітабым, не 'менің кітабым'); " +
    "көсемше -ып/-іп әрекеттер тізбегі (оқып, парс жасап, кэшке салдым); " +
    "ырықсыз етіс бір жалғаумен (жасалды, табылды); " +
    "құрама етістіктер (жаза алу, оқып шығу); " +
    "көмектес септігі (командамен, git-пен). " +
    "Орыспен ортақ: pro-drop, сызықша, бұйрық, 'деп' түсіру. " +
    "Фрагменттер ОК. Код/коммит/қауіпсіздік — қалыпты.";
}
