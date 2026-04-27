# cavemanov

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-blueviolet)](https://www.anthropic.com/claude-code)
[![Languages](https://img.shields.io/badge/языки-русский%20%7C%20қазақша-red)](#)
[![Token saving](https://img.shields.io/badge/токены-−65--90%25-brightgreen)](#пример)
[![Version](https://img.shields.io/badge/version-1.1.0-blue)](.claude-plugin/plugin.json)

**Теги:** `claude-code` · `claude-code-plugin` · `russian` · `русский` · `kazakh` · `қазақша` · `compression` · `сжатие` · `tokens` · `токены` · `caveman` · `пещерный` · `productivity` · `output-style` · `terse` · `multilingual`

**Ультра-сжатый режим общения на русском и казахском для Claude Code.** Говори как умный пещерный человек. Сокращай вывод на 65–80% без потери технической точности.

Поддерживаются два языка: **русский** (`/cavemanov`) и **казахский** (`/cavemanov-kk`). Каждый использует РОДНЫЕ приёмы своего языка, не кальку с английского.

Порт проекта [caveman](https://github.com/JuliusBrussee/caveman) от Julius Brussee на русский язык + казахская адаптация.

> ⚠️ **Казахская версия — draft.** Грамматика проверена в скелете, но финальные формулировки нуждаются в ревью носителем. Если ты казахоговорящий разработчик — open an issue, помоги довести до прода. См. [skills/cavemanov-kk/SKILL.md](skills/cavemanov-kk/SKILL.md).

---

## Что делает

Cavemanov — это плагин для [Claude Code](https://www.anthropic.com/claude-code), который переключает стиль ответов модели в режим «пещерного»: убирает воду, вежливость, хеджирование и вводные слова, но сохраняет весь технический смысл и точность.

Три уровня интенсивности:

- **lite** — убирает воду и хеджирование, предложения остаются полными
- **full** (по умолчанию) — инфинитивы, фрагменты, короткие синонимы
- **ultra** — сокращения (БД, auth, фн, конф), стрелки для причинности (X → Y), одно слово где хватает

Плюс три независимых режима: `commit` (краткие сообщения коммитов), `review` (однострочные комментарии ревью), `compress` (сжатие документов).

---

## Установка

Плагин — стандартный Claude Code marketplace. Поддерживает все способы установки, описанные в [официальной документации](https://docs.claude.com/en/docs/claude-code/discover-plugins).

### Вариант 1 — GitHub shorthand (рекомендуется)

В сессии Claude Code:

```
/plugin marketplace add zzvllvzz/cavemanov
/plugin install cavemanov@cavemanov
```

### Вариант 2 — Git URL (HTTPS)

```
/plugin marketplace add https://github.com/zzvllvzz/cavemanov.git
/plugin install cavemanov@cavemanov
```

### Вариант 3 — Git URL (SSH)

```
/plugin marketplace add git@github.com:zzvllvzz/cavemanov.git
/plugin install cavemanov@cavemanov
```

### Вариант 4 — закрепиться на конкретной версии

Через тег (после релиза):

```
/plugin marketplace add https://github.com/zzvllvzz/cavemanov.git#v1.0.0
/plugin install cavemanov@cavemanov
```

### Вариант 5 — из CLI (вне сессии)

```bash
claude plugin marketplace add zzvllvzz/cavemanov
claude plugin install cavemanov@cavemanov
```

С указанием [scope](https://docs.claude.com/en/docs/claude-code/settings#configuration-scopes) (`user` / `project` / `local`):

```bash
claude plugin install cavemanov@cavemanov --scope user
```

### Вариант 6 — локальный путь (разработка / форк)

```bash
git clone https://github.com/zzvllvzz/cavemanov.git
```

Внутри Claude Code:

```
/plugin marketplace add /абсолютный/путь/к/cavemanov
/plugin install cavemanov@cavemanov
```

### Вариант 7 — `--plugin-dir` (без установки, для тестирования)

```bash
claude --plugin-dir /путь/к/cavemanov
```

Загружает плагин на одну сессию без копирования в кэш. Полезно для разработки и форков.

### Вариант 8 — через `settings.json` для команды

Чтобы все участники проекта получили плагин автоматически — добавь в `.claude/settings.json` репозитория:

```json
{
  "extraKnownMarketplaces": {
    "cavemanov": {
      "source": {
        "source": "github",
        "repo": "zzvllvzz/cavemanov"
      }
    }
  },
  "enabledPlugins": {
    "cavemanov@cavemanov": true
  }
}
```

При первом доверии папке Claude Code предложит установить.

### Вариант 9 — pre-seed для контейнеров / CI

Pre-populate `CLAUDE_CODE_PLUGIN_SEED_DIR` на этапе сборки образа, чтобы плагин был доступен без сетевых запросов в рантайме. См. [официальную доку](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces#pre-populate-plugins-for-containers).

```bash
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin marketplace add zzvllvzz/cavemanov
CLAUDE_CODE_PLUGIN_CACHE_DIR=/opt/claude-seed claude plugin install cavemanov@cavemanov
# в рантайме:
export CLAUDE_CODE_PLUGIN_SEED_DIR=/opt/claude-seed
```

### После установки

```
/reload-plugins
```

Или просто перезапустить Claude Code.

### Обновление и удаление

```
/plugin marketplace update cavemanov     # обновить marketplace
/plugin update cavemanov@cavemanov       # обновить плагин
/plugin disable cavemanov@cavemanov      # выключить, не удаляя
/plugin uninstall cavemanov@cavemanov    # удалить
```

---

## Использование

### Активация

Любое из:

- Слэш-команда: `/cavemanov` (русский) или `/cavemanov-kk` (казахский)
- Фраза на русском: `включи пещерный`, `пещерный режим`, `говори как пещерный`, `меньше токенов`, `будь краток`, `экономь токены`
- Фраза на казахском: `қазақша қысқарт`, `пещерный режим қазақша`, `токен үнемде`, `қысқа сөйле`
- Фраза на английском: `activate cavemanov`, `cavemanov mode`, `turn on cavemanov`

### Переключение языка/уровня

```
/cavemanov              # русский, уровень full
/cavemanov ultra        # русский, уровень ultra
/cavemanov kk           # казахский, уровень full
/cavemanov kk ultra     # казахский, уровень ultra
/cavemanov-kk lite      # казахский, уровень lite (шорткат)
```

Аргументы команды `/cavemanov` можно указывать в любом порядке: `/cavemanov full kk` = `/cavemanov kk full`.

### Деактивация

- Русский: `стоп пещерный`, `выключи пещерный`, `обычный режим`, `нормальный режим`
- Казахский: `қалыпты режим`, `пещерный өшір`
- Английский: `stop cavemanov`, `normal mode`
- Команда: `/cavemanov off`

### Отдельные режимы

```
/cavemanov-commit     # сгенерировать краткий коммит
/cavemanov-review     # однострочный code review
```

### Дефолтный язык

Резолвится в порядке:

1. `CAVEMANOV_DEFAULT_LANG` env (`ru` / `kk`)
2. `defaultLang` в `config.json`
3. `ru` (хардкод)

Пример `~/.config/cavemanov/config.json`:

```json
{
  "defaultMode": "ultra",
  "defaultLang": "kk"
}
```

---

## Пример

**Вопрос:** «Почему React компонент перерисовывается?»

**Обычный ответ (baseline):**

> Ваш компонент перерисовывается, потому что при каждом рендере вы создаёте новую ссылку на объект, передавая инлайновый объект в пропс. React сравнивает пропсы по ссылке, поэтому новая ссылка воспринимается как изменение, и компонент рендерится заново. Чтобы это исправить, оберните создание объекта в `useMemo`, чтобы ссылка стабилизировалась между рендерами.

≈ 180 токенов в Claude-совместимом токенизаторе.

**Cavemanov full:**

> Компонент — новая ссылка объекту каждый рендер. Inline объект = новая ссылка = ререндер. Оберни в `useMemo`.

≈ 55 токенов. **Экономия ~70%.**

Что здесь работает:
- **Тире** вместо «перерисовывается, потому что создаётся»
- **Инструментальный падеж** («новая ссылка объекту» — дат. случай без предлога)
- **Pro-drop** («оберни» вместо «оберните», ты-форма, без «вы»)
- **Императив** вместо «нужно обернуть»

**Cavemanov ultra:**

> Inline obj → новая ссылка → ререндер. `useMemo`.

≈ 18 токенов. **Экономия ~90%.**

### Пример на казахском (draft, [VERIFY])

**Тот же вопрос на казахском:** «React компоненті неге қайта рендерленеді?»

**Cavemanov-kk full:**

> Компонент — әр рендерде жаңа сілтеме. Inline объект = жаңа сілтеме = қайта рендер. `useMemo`-ға орап ал.

**Cavemanov-kk ultra:**

> Inline obj → жаңа сілт → ререндер. `useMemo`.

Что использует:
- **Тире** вместо «болып табылады»
- **Көсемше -ып** для деепричастных оборотов
- **Көмектес септігі** (`-мен/-бен/-пен`) вместо «арқылы»
- **Бұйрық рай** (императив на «сен»: `орап ал`)

---

## Как работает плагин (для Claude Code)

Плагин состоит из четырёх компонентов:

| Компонент | Файл | Роль |
|-----------|------|------|
| Манифест | `.claude-plugin/plugin.json` | Регистрирует плагин и подключает хуки |
| Навык | `skills/cavemanov/SKILL.md` | Единственный источник правды — правила сжатия для модели |
| SessionStart-хук | `hooks/cavemanov-activate.js` | При старте сессии: читает SKILL.md, инжектит правила в контекст, пишет флаг-файл с активным уровнем |
| UserPromptSubmit-хук | `hooks/cavemanov-mode-tracker.js` | На каждый ход пользователя: ловит триггеры (слэш-команды или фразы), обновляет флаг-файл, добавляет короткое напоминание в контекст |

**Почему нужны оба хука:**

- SessionStart однократно вливает полный свод правил — это якорь поведения.
- UserPromptSubmit повторяет короткое напоминание каждый ход, потому что в длинных сессиях модель дрейфует обратно к многословности, особенно если другие плагины инжектят конкурирующие инструкции по стилю.

**Флаг-файл** (`$CLAUDE_CONFIG_DIR/.cavemanov-active`) хранит текущий режим между вызовами хуков. Читается также скриптом статусбара для визуальной индикации.

**Безопасность:** и запись, и чтение флага защищены от symlink-атак (отказ при обнаружении symlink в пути, атомарная запись через temp+rename, ограничение размера чтения, whitelist валидных значений). Без этого локальный атакующий мог бы подменить флаг на symlink к `~/.ssh/id_rsa`, и содержимое было бы вброшено в контекст модели.

---

## Структура файлов

```
cavemanov/
├── .claude-plugin/
│   ├── plugin.json              # манифест плагина
│   └── marketplace.json         # описание для Claude Code marketplace
├── skills/
│   ├── cavemanov/SKILL.md       # русские правила пещерного (default)
│   ├── cavemanov-kk/SKILL.md    # казахские правила (draft, нужен ревью носителя)
│   ├── cavemanov-commit/SKILL.md
│   └── cavemanov-review/SKILL.md
├── commands/
│   ├── cavemanov.toml           # /cavemanov [ru|kk] [lite|full|ultra]
│   ├── cavemanov-kk.toml        # /cavemanov-kk (шорткат для казахского)
│   ├── cavemanov-commit.toml    # /cavemanov-commit
│   └── cavemanov-review.toml    # /cavemanov-review
├── hooks/
│   ├── cavemanov-activate.js        # SessionStart
│   ├── cavemanov-mode-tracker.js    # UserPromptSubmit
│   ├── cavemanov-config.js          # resolver языка/режима + безопасные I/O
│   ├── cavemanov-statusline.sh      # бейдж [CAVEMANOV:RU] / [CAVEMANOV:KK:ULTRA]
│   ├── cavemanov-statusline.ps1     # бейдж для PowerShell
│   └── package.json
└── README.md
```

---

## Конфигурация

Режим по умолчанию резолвится в таком порядке:

1. Переменная окружения `CAVEMANOV_DEFAULT_MODE`
2. Файл конфига `defaultMode`:
   - `$XDG_CONFIG_HOME/cavemanov/config.json`
   - `~/.config/cavemanov/config.json` (macOS/Linux)
   - `%APPDATA%\cavemanov\config.json` (Windows)
3. Хардкод: `full`

Пример `config.json`:

```json
{
  "defaultMode": "ultra"
}
```

---

## Настройка статусбара

Плагин предлагает настройку автоматически при первой сессии. Ручная настройка — добавить в `~/.claude/settings.json`:

**Windows:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "powershell -ExecutionPolicy Bypass -File \"<путь-к-плагину>/hooks/cavemanov-statusline.ps1\""
  }
}
```

**macOS/Linux:**

```json
{
  "statusLine": {
    "type": "command",
    "command": "bash \"<путь-к-плагину>/hooks/cavemanov-statusline.sh\""
  }
}
```

Бейдж отображается как `[CAVEMANOV]`, `[CAVEMANOV:ULTRA]`, `[CAVEMANOV:LITE]` и т.д.

---

## Честно о токенах в русском языке

**Важная оговорка.** В публичном обсуждении этого проекта легко было бы заявить, что «русский эффективнее английского по токенам». Это неправда. Реальные исследования показывают обратное.

### Что говорят исследования

**Petrov et al. (2023), «Language Model Tokenizers Introduce Unfairness Between Languages», NeurIPS 2023** ([arXiv:2305.15425](https://arxiv.org/abs/2305.15425)):

> Авторы показали, что длина токенизации одного и того же текста в разных языках может отличаться до 15 раз. Для русского (кириллица) премия по токенам относительно английского составляет примерно **~2× за одинаковый смысловой объём** в токенизаторах семейства GPT/Claude.

**Ahia et al. (2023), «Do All Languages Cost the Same? Tokenization in the Era of Commercial Language Models», EMNLP 2023** ([arXiv:2305.13707](https://arxiv.org/abs/2305.13707)):

> Показано, что пользователи коммерческих API платят за ответы на нелатинских языках кратно больше, чем за английский. Русский отнесён к группе языков с существенной токенной премией.

Оба источника — рецензируемые публикации на топ-конференциях NLP. Можно и нужно проверить.

### Почему cavemanov тогда имеет смысл

Ответ простой: **именно поэтому сжатие на русском ценнее**, а не менее ценно.

1. **Каждый токен в русском стоит дороже → каждое сокращение экономит больше**. Если сжимаем английский ответ на 65% и русский на 65%, абсолютное число сэкономленных токенов для русского больше: стартовая точка выше.

2. **В русском больше «места» для сжатия** — и это не просто слова. Ниже конкретные лингвистические приёмы, которые работают в русском и которых НЕТ в английском caveman:

   - **Pro-drop местоимений.** Русский окончание глагола `-ю/-ешь/-ет/-ем/-ете/-ут` уже содержит лицо. `Я думаю` = `думаю` (−1 слово). В английском `I think` сократить до `think` нельзя — нарушение грамматики.

   - **Опущение связки через тире.** Русский в настоящем времени и так опускает `быть/являться`: `Он студент` (не `Он есть студент`). Тире (`это — баг`) — ещё более сжатая форма. Английское `this is a bug` не сокращается без потери.

   - **Краткие формы прилагательных.** `Код сломан` (2 слова, 10 символов) vs `код сломанный` (2 слова, 12 символов) vs английское `the code is broken` (4 слова, 18 символов).

   - **Императив короче инфинитива.** `проверь` (7 символов) < `проверить` (9) < `давайте проверим` (15). В английском `check` (5) < `to check` (8) < `let's check` (10) — разница меньше.

   - **Инструментальный падеж.** `Исправь командой` vs `исправь с помощью команды` — экономия предлога + существительного за счёт одного окончания `-ой`. В английском `fix with command` аналога нет — предлог обязателен.

   - **Отсутствие артиклей.** Главный трюк английского caveman — выкидывание `a/an/the`. В русском этого шага не существует, потому что артиклей никогда не было. Это не плюс над английским, но вид экономии уже встроен в язык.

3. **Мешанина с англицизмами — норма, а не костыль.** Русский тех-сленг и так использует `reuse`, `handshake`, `middleware`, `auth`, `request`, `response` без перевода. Cavemanov легитимизирует это как стратегию: выбирать короче из пары в каждом конкретном случае (`кэш` < `cache`, но `auth` < `аутентификация`).

### Грубая оценка

Для типичного технического ответа средней длины:

| Режим | Английский (ток.) | Русский (ток.) | Экономия в русском |
|-------|-------------------|----------------|--------------------|
| baseline | ~80 | ~180 | — |
| full | ~30 | ~65 | ~64% |
| ultra | ~15 | ~30 | ~83% |

Абсолютная стоимость ответа в `ultra` на русском (~30 токенов) ниже, чем baseline на английском (~80 токенов), несмотря на «дороговизну» кириллицы.

**Вывод:** cavemanov не делает русский дешевле английского в абсолютных цифрах. Но в относительных — экономия больше, а для пользователей, которые и так работают с Claude на русском (документация, обсуждение архитектуры, объяснения в коде), это чистый выигрыш без переключения языка.

---

## Лицензия

MIT. Основан на проекте [caveman](https://github.com/JuliusBrussee/caveman) Julius Brussee (MIT).
