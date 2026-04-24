#!/usr/bin/env node
// cavemanov — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at $CLAUDE_CONFIG_DIR/.cavemanov-active (statusline reads this)
//   2. Emits cavemanov ruleset as hidden SessionStart context
//   3. Detects missing statusline config and emits setup nudge

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDefaultMode, safeWriteFlag } = require('./cavemanov-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemanov-active');
const settingsPath = path.join(claudeDir, 'settings.json');

const mode = getDefaultMode();

// "off" mode — skip activation entirely
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch (e) {}
  process.stdout.write('OK');
  process.exit(0);
}

// 1. Write flag file (symlink-safe)
safeWriteFlag(flagPath, mode);

// Independent-mode skills handle their own behavior — don't inject base rules.
const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);

if (INDEPENDENT_MODES.has(mode)) {
  process.stdout.write('CAVEMANOV MODE ACTIVE — уровень: ' + mode + '. Поведение определяется навыком /cavemanov-' + mode + '.');
  process.exit(0);
}

// 2. Read SKILL.md — single source of truth for cavemanov behavior.
let skillContent = '';
try {
  skillContent = fs.readFileSync(
    path.join(__dirname, '..', 'skills', 'cavemanov', 'SKILL.md'), 'utf8'
  );
} catch (e) { /* standalone install — use fallback below */ }

let output;

if (skillContent) {
  // Strip YAML frontmatter
  const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');

  // Filter intensity table: keep header + separator + only active level's row.
  // Filter example lines: keep only the active level's example line.
  const filtered = body.split('\n').reduce((acc, line) => {
    const tableRowMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
    if (tableRowMatch) {
      if (tableRowMatch[1] === mode) {
        acc.push(line);
      }
      return acc;
    }

    const exampleMatch = line.match(/^- (\S+?):\s/);
    if (exampleMatch) {
      if (exampleMatch[1] === mode) {
        acc.push(line);
      }
      return acc;
    }

    acc.push(line);
    return acc;
  }, []);

  output = 'CAVEMANOV MODE ACTIVE — уровень: ' + mode + '\n\n' + filtered.join('\n');
} else {
  // Fallback when SKILL.md is not found — minimum viable ruleset in Russian.
  // Focused on Russian-native compression techniques, not English caveman calques.
  output =
    'CAVEMANOV MODE ACTIVE — уровень: ' + mode + '\n\n' +
    'Отвечай терсно как умный пещерный человек. Русский — не английский: используй РОДНЫЕ приёмы сжатия.\n\n' +
    '## Постоянство\n\n' +
    'АКТИВЕН КАЖДЫЙ ОТВЕТ. Не возвращайся к обычному режиму после многих ходов. Не дрейфуй к воде. ' +
    'Выкл только: "стоп пещерный" / "обычный режим".\n\n' +
    'Текущий уровень: **' + mode + '**. Переключение: `/cavemanov lite|full|ultra`.\n\n' +
    '## Русские приёмы сжатия\n\n' +
    '1. Pro-drop местоимений: "я думаю" → "думаю". Окончание глагола уже несёт лицо.\n' +
    '2. Тире вместо связки: "это — баг", "React — UI библиотека". Не "является".\n' +
    '3. Краткие формы прилагательных: "код сломан" (не "сломанный"), "готов", "нужен", "прав".\n' +
    '4. ИМПЕРАТИВ для команд, не инфинитив: "оберни" (7) < "обернуть" (8) < "нужно обернуть" (14).\n' +
    '5. Инструментальный падеж: "исправь командой" (не "с помощью команды"), "собери webpack\'ом".\n' +
    '6. Опускать союз "что": "думаю: баг" вместо "думаю, что это баг".\n' +
    '7. Причастия вместо придаточных: "функция, вызывающая ошибку" (не "которая вызывает").\n' +
    '8. Короче из пары русский/англицизм в КОНКРЕТНОМ случае: "кэш" < "cache", но "auth" < "аутентификация".\n' +
    '9. Числа цифрами: "2-й вызов" не "второй вызов".\n\n' +
    '## Убирать\n\n' +
    'Воду: вообще-то/в принципе/собственно/просто/действительно. ' +
    'Вежливость: конечно/разумеется/рад помочь/с удовольствием. ' +
    'Хеджирование: возможно/наверное/кажется (кроме реальной неопределённости). ' +
    'Техтермины точно. Код не менять. Ошибки цитировать дословно.\n\n' +
    'Паттерн: `[объект] [состояние/действие]. [причина]. [фикс].`\n\n' +
    'Нет: "Конечно! С удовольствием помогу вам. Проблема, с которой вы столкнулись, скорее всего вызвана тем, что..."\n' +
    'Да: "Баг в auth middleware. Проверка срока токена — `<`, надо `<=`. Правка:"\n\n' +
    '## Авто-ясность\n\n' +
    'Отключать пещерный для: предупреждений о безопасности, подтверждений необратимых действий, ' +
    'многошаговых последовательностей где порядок фрагментов может быть понят неверно, ' +
    'когда пользователь просит уточнить или повторяет вопрос. Возобновлять после ясной части.\n\n' +
    '## Границы\n\n' +
    'Код/коммиты/PR: писать нормально. "стоп пещерный" / "обычный режим": возврат. ' +
    'Уровень сохраняется до смены или конца сессии.';
}

// 3. Detect missing statusline config — nudge Claude to help set it up
try {
  let hasStatusline = false;
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (settings.statusLine) {
      hasStatusline = true;
    }
  }

  if (!hasStatusline) {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'cavemanov-statusline.ps1' : 'cavemanov-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    const command = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath}"`;
    const statusLineSnippet =
      '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
    output += "\n\n" +
      "STATUSLINE SETUP NEEDED: Плагин cavemanov включает бейдж статуса показывающий активный режим " +
      "(напр. [CAVEMANOV], [CAVEMANOV:ULTRA]). Он пока не настроен. " +
      "Для включения добавь в " + path.join(claudeDir, 'settings.json') + ": " +
      statusLineSnippet + " " +
      "Проактивно предложи настройку пользователю при первом взаимодействии.";
  }
} catch (e) {
  // Silent fail
}

process.stdout.write(output);
