#!/usr/bin/env node
// cavemanov — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at $CLAUDE_CONFIG_DIR/.cavemanov-active (statusline reads this)
//      Format: "lang|mode"
//   2. Emits cavemanov ruleset as hidden SessionStart context (lang-specific)
//   3. Detects missing statusline config and emits setup nudge

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getDefaultMode,
  getDefaultLang,
  safeWriteFlag,
  serializeFlag,
} = require('./cavemanov-config');

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.cavemanov-active');
const settingsPath = path.join(claudeDir, 'settings.json');

const mode = getDefaultMode();
const lang = getDefaultLang();

// "off" mode — skip activation entirely
if (mode === 'off') {
  try { fs.unlinkSync(flagPath); } catch (e) {}
  process.stdout.write('OK');
  process.exit(0);
}

// 1. Write flag file (symlink-safe). Format: lang|mode.
safeWriteFlag(flagPath, serializeFlag(lang, mode));

// Independent-mode skills handle their own behavior — don't inject base rules.
const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);

if (INDEPENDENT_MODES.has(mode)) {
  process.stdout.write('CAVEMANOV MODE ACTIVE — уровень: ' + mode + '. Поведение определяется навыком /cavemanov-' + mode + '.');
  process.exit(0);
}

// 2. Read SKILL.md for active lang — single source of truth.
//    Map ru -> skills/cavemanov/SKILL.md (legacy path, also default)
//    Map kk -> skills/cavemanov-kk/SKILL.md
const skillRelPath = lang === 'kk'
  ? path.join('..', 'skills', 'cavemanov-kk', 'SKILL.md')
  : path.join('..', 'skills', 'cavemanov', 'SKILL.md');

let skillContent = '';
try {
  skillContent = fs.readFileSync(path.join(__dirname, skillRelPath), 'utf8');
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

  const langLabel = lang === 'kk' ? 'KK' : 'RU';
  output = 'CAVEMANOV MODE ACTIVE — язык: ' + langLabel + ', уровень: ' + mode + '\n\n' + filtered.join('\n');
} else {
  // Fallback when SKILL.md is not found — minimum viable ruleset.
  output = lang === 'kk' ? buildKkFallback(mode) : buildRuFallback(mode);
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
      "(напр. [CAVEMANOV:RU:FULL], [CAVEMANOV:KK:ULTRA]). Он пока не настроен. " +
      "Для включения добавь в " + path.join(claudeDir, 'settings.json') + ": " +
      statusLineSnippet + " " +
      "Проактивно предложи настройку пользователю при первом взаимодействии.";
  }
} catch (e) {
  // Silent fail
}

process.stdout.write(output);

function buildRuFallback(mode) {
  return (
    'CAVEMANOV MODE ACTIVE — язык: RU, уровень: ' + mode + '\n\n' +
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
    'Воду, вежливость, хеджирование. Техтермины точно. Код не менять. Ошибки цитировать дословно.\n\n' +
    'Паттерн: `[объект] [состояние/действие]. [причина]. [фикс].`'
  );
}

function buildKkFallback(mode) {
  return (
    'CAVEMANOV MODE ACTIVE — язык: KK, уровень: ' + mode + '\n\n' +
    'Қысқа жауап бер. Қазақ — ағылшын да, орыс та емес: түркі тілінің ӨЗ тәсілдерін қолдан.\n\n' +
    '## Тұрақтылық\n\n' +
    'ӘРБІР ЖАУАПТА БЕЛСЕНДІ. Тек "стоп пещерный" / "қалыпты режим" арқылы өшеді.\n\n' +
    'Қазіргі деңгей: **' + mode + '**. Ауыстыру: `/cavemanov-kk lite|full|ultra`.\n\n' +
    '## Тек қазақ тіліне тән тәсілдер\n\n' +
    '1. **Агглютинация** — жалғаулар тізбегі: "үйлеріңіздегілер" (1 қазақ = 5 орыс сөзі).\n' +
    '2. **Тәуелдік жалғауы** иеленуді бір жалғаумен: "кітабым" (моя книга), "кодың" (твой код). Орыс есімдігін жазба.\n' +
    '3. **Көсемше -ып/-іп** — әрекеттер тізбегі бір сөйлемде: "файлды оқып, парс жасап, кэшке салдым".\n' +
    '4. **Ырықсыз етіс** -л/-н бір жалғаумен: "жасалды" (было сделано) — пассив 1 сөзде.\n' +
    '5. **Көмектес септігі** -мен/-бен/-пен үндестікпен: "командамен", "git-пен".\n' +
    '6. **Құрама етістіктер**: "жаза алу" (мочь написать), "оқып шығу" (прочитать насквозь), "айтып бер" (расскажи мне).\n' +
    '7. **Латиница** ×2 токен үнемдейді — техникалық хак, лингвистика емес.\n\n' +
    '## Орыспен ортақ\n\n' +
    '8. Pro-drop: "ойлаймын" (мен жоқ).\n' +
    '9. Сызықша байланыстырушы орнына: "React — UI кітапханасы".\n' +
    '10. Бұйрық рай: "тексер", "орап ал".\n' +
    '11. "Деп"/"екенін" түсіру.\n\n' +
    '## Жалпы\n\n' +
    'IT-сленг араласу — норма. Қысқартулар (МДҚ, фн, конф). Сандар цифрмен.\n\n' +
    '## Алып таста\n\n' +
    'Кіріспе сөздер, сыпайылық, гедждеу. Техникалық терминдер дәл. Код өзгертпе.\n\n' +
    'Үлгі: `[нысан] [күй/әрекет]. [себеп]. [түзету].`'
  );
}
