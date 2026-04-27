$ClaudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME ".claude" }
$Flag = Join-Path $ClaudeDir ".cavemanov-active"
if (-not (Test-Path $Flag)) { exit 0 }

# Refuse reparse points (symlinks / junctions) and oversized files. Without
# this, a local attacker could point the flag at a secret file and have the
# statusline render its bytes (including ANSI escape sequences) to the terminal.
try {
    $Item = Get-Item -LiteralPath $Flag -Force -ErrorAction Stop
    if ($Item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { exit 0 }
    if ($Item.Length -gt 64) { exit 0 }
} catch {
    exit 0
}

$Raw = ""
try {
    $RawLine = Get-Content -LiteralPath $Flag -TotalCount 1 -ErrorAction Stop
    if ($null -ne $RawLine) { $Raw = ([string]$RawLine).Trim() }
} catch {
    exit 0
}

# Strip anything outside [a-z0-9|-] — blocks terminal-escape and OSC hyperlink
# injection via the flag contents. Then whitelist-validate.
$Raw = $Raw.ToLowerInvariant()
$Raw = ($Raw -replace '[^a-z0-9\|-]', '')

$Lang = ""
$Mode = ""
if ($Raw.Contains("|")) {
    $Parts = $Raw.Split("|", 2)
    $Lang = $Parts[0]
    $Mode = $Parts[1]
} else {
    $Lang = "ru"
    $Mode = $Raw
}

$ValidLangs = @('ru','kk')
$ValidModes = @('off','lite','full','ultra','commit','review','compress')
if (-not ($ValidLangs -contains $Lang)) { exit 0 }
if (-not ($ValidModes -contains $Mode)) { exit 0 }

$Esc = [char]27
$LangSuffix = $Lang.ToUpperInvariant()
$ModeSuffix = $Mode.ToUpperInvariant()

if ($Mode -eq "full") {
    [Console]::Write("${Esc}[38;5;172m[CAVEMANOV:$LangSuffix]${Esc}[0m")
} else {
    [Console]::Write("${Esc}[38;5;172m[CAVEMANOV:$LangSuffix:$ModeSuffix]${Esc}[0m")
}
