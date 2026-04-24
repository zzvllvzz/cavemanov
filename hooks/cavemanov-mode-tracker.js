#!/usr/bin/env node
// cavemanov — UserPromptSubmit hook to track which cavemanov mode is active.
// Inspects user input for Russian/English triggers and /cavemanov commands,
// writes mode to flag file, emits per-turn reinforcement.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, safeWriteFlag, readFlag } = require('./cavemanov-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemanov-active');

// Russian word stem matching via substring — simpler and safer than Cyrillic regex.
// We lowercase the prompt and check known stems.
function hasAny(text, patterns) {
  return patterns.some(p => text.includes(p));
}

// Stems instead of full words to tolerate case endings (пещерный/пещерного/пещерным).
const ACTIVATE_PATTERNS = [
  // Russian natural-language activation
  'включи пещер', 'включить пещер',
  'активируй пещер', 'активировать пещер',
  'запусти пещер', 'запустить пещер',
  'говори как пещер', 'говорить как пещер',
  'пещерный режим', 'пещерного режима', 'пещерный реж',
  'меньше токенов', 'будь краток', 'будь кратким', 'краткий режим',
  'экономь токены', 'экономия токенов',
  // English fallback
  'activate cavemanov', 'enable cavemanov', 'turn on cavemanov',
  'cavemanov mode', 'cavemanov on', 'start cavemanov'
];

const DEACTIVATE_PATTERNS = [
  // Russian
  'стоп пещер', 'выключи пещер', 'выключить пещер',
  'отключи пещер', 'отключить пещер', 'останови пещер',
  'обычный режим', 'нормальный режим', 'обычный реж',
  // English fallback
  'stop cavemanov', 'disable cavemanov', 'turn off cavemanov',
  'deactivate cavemanov', 'normal mode'
];

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Natural-language activation — but only if no deactivation pattern present.
    if (hasAny(prompt, ACTIVATE_PATTERNS) && !hasAny(prompt, DEACTIVATE_PATTERNS)) {
      const mode = getDefaultMode();
      if (mode !== 'off') {
        safeWriteFlag(flagPath, mode);
      }
    }

    // Slash-command activation
    if (prompt.startsWith('/cavemanov')) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0];
      const arg = parts[1] || '';

      let mode = null;

      if (cmd === '/cavemanov-commit') {
        mode = 'commit';
      } else if (cmd === '/cavemanov-review') {
        mode = 'review';
      } else if (cmd === '/cavemanov-compress' || cmd === '/cavemanov:cavemanov-compress') {
        mode = 'compress';
      } else if (cmd === '/cavemanov' || cmd === '/cavemanov:cavemanov') {
        if (arg === 'lite') mode = 'lite';
        else if (arg === 'ultra') mode = 'ultra';
        else if (arg === 'full') mode = 'full';
        else if (arg === 'off') mode = 'off';
        else mode = getDefaultMode();
      }

      if (mode && mode !== 'off') {
        safeWriteFlag(flagPath, mode);
      } else if (mode === 'off') {
        try { fs.unlinkSync(flagPath); } catch (e) {}
      }
    }

    // Deactivation — natural language
    if (hasAny(prompt, DEACTIVATE_PATTERNS)) {
      try { fs.unlinkSync(flagPath); } catch (e) {}
    }

    // Per-turn reinforcement: emit a short reminder when cavemanov is active.
    // The SessionStart hook injects the full ruleset once, but models lose it
    // when other plugins inject competing style instructions every turn.
    // Skip independent modes — they have their own skill behavior.
    const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);
    const activeMode = readFlag(flagPath);
    if (activeMode && !INDEPENDENT_MODES.has(activeMode)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: "CAVEMANOV MODE ACTIVE (" + activeMode + "). " +
            "Убирать воду/вежливость/хеджирование. " +
            "Русские приёмы: pro-drop (думаю, не 'я думаю'); тире вместо связки (X — Y); " +
            "краткие формы (сломан, не сломанный); ИМПЕРАТИВ для команд (оберни, не 'нужно обернуть'); " +
            "инструментальный падеж (командой, не 'с помощью команды'). " +
            "Фрагменты ок. Код/коммиты/безопасность — нормально."
        }
      }));
    }
  } catch (e) {
    // Silent fail
  }
});
