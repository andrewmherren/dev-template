#!/usr/bin/env bash
# Project PreToolUse hook (Bash/PowerShell): blocks shell commands that could print
# secrets in ways specific to this project (Docker, Terraform, GitHub CLI on Windows).
# Generic cases (.env files, SSH/AWS keys, bare env dumps, echo $SECRET) are handled by
# the user-level hook ~/.claude/hooks/block-secrets.js; Read-tool access to secret files
# is also denied via permissions.deny in .claude/settings.json.
# Exit 2 = block the command and show the reason to Claude.

input=$(cat)

block() {
  echo "Blocked by project secret policy: $1. See .claude/rules/security.md." >&2
  exit 2
}

match() { printf '%s' "$input" | grep -Eiq -- "$1"; }

# Start of a command: beginning of the command string, or after ; & | or a newline.
# Used for tool names so prose (e.g. a commit message mentioning them) doesn't trigger.
S='("command":"|[;&|]|\\n)[[:space:]]*'
# Within one command: no quote, backslash (JSON-escaped newline), or separator.
W='[^"\;&|]*'

# Env dumps inside containers (container env holds ANTHROPIC_API_KEY etc.)
match '(exec|run)[^"]*[[:space:]](env|printenv)([[:space:]]*"|[[:space:]]*[;&|])' && block "dumps container environment variables"
match "${S}docker${W}[[:space:]]inspect" && block "docker inspect shows container env vars"
if match "${S}docker${W}compose${W}[[:space:]]config" && ! match 'no-interpolate'; then
  block "docker compose config interpolates secrets (use --no-interpolate)"
fi

# Terraform secrets: tfvars/tfstate files and output values
match '\.(tfvars|tfstate)([^A-Za-z0-9_]|$)' && block "references a Terraform vars/state file (may contain secrets)"
match "${S}terraform${W}[[:space:]](output|show)" && block "terraform output/show can print sensitive values"

# GitHub CLI tokens (Windows config path) and token-printing commands
match 'GitHub CLI[/\\]+hosts\.yml' && block "references GitHub CLI tokens"
match 'gh[[:space:]]+auth[[:space:]]+(token|status[^"]*--show-token)' && block "prints a GitHub token"
match 'aws[[:space:]]+configure[[:space:]]+(get|export-credentials)' && block "prints AWS credentials"

exit 0
