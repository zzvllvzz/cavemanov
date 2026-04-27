#!/bin/bash
# cavemanov — statusline badge script for Claude Code
# Reads the cavemanov flag file (format: lang|mode) and outputs a colored badge.
#
# Usage in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "bash /path/to/cavemanov-statusline.sh" }

FLAG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/.cavemanov-active"

# Refuse symlinks — a local attacker could point the flag at a secret file
# and have the statusline render its bytes (including ANSI escape sequences)
# to the terminal every keystroke.
[ -L "$FLAG" ] && exit 0
[ ! -f "$FLAG" ] && exit 0

# Hard-cap read at 64 bytes and strip anything outside [a-z0-9|-] — blocks
# terminal-escape injection and OSC hyperlink spoofing via flag contents.
RAW=$(head -c 64 "$FLAG" 2>/dev/null | tr -d '\n\r' | tr '[:upper:]' '[:lower:]')
RAW=$(printf '%s' "$RAW" | tr -cd 'a-z0-9|-')

# Parse "lang|mode" or fall back to legacy "mode" → ru.
if [[ "$RAW" == *"|"* ]]; then
  LANG_PART="${RAW%%|*}"
  MODE_PART="${RAW#*|}"
else
  LANG_PART="ru"
  MODE_PART="$RAW"
fi

# Whitelist validate.
case "$LANG_PART" in
  ru|kk) ;;
  *) exit 0 ;;
esac
case "$MODE_PART" in
  off|lite|full|ultra|commit|review|compress) ;;
  *) exit 0 ;;
esac

LANG_SUFFIX=$(printf '%s' "$LANG_PART" | tr '[:lower:]' '[:upper:]')
MODE_SUFFIX=$(printf '%s' "$MODE_PART" | tr '[:lower:]' '[:upper:]')

if [ "$MODE_PART" = "full" ]; then
  printf '\033[38;5;172m[CAVEMANOV:%s]\033[0m' "$LANG_SUFFIX"
else
  printf '\033[38;5;172m[CAVEMANOV:%s:%s]\033[0m' "$LANG_SUFFIX" "$MODE_SUFFIX"
fi
