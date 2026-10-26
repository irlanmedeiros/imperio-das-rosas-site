#!/usr/bin/env bash
# Publica o site no Cloudflare Workers a partir da branch `main` do GitHub.
#
#   bash scripts/deploy-cloudflare.sh
#
# Lê as variáveis de produção de .env.cloudflare (fora do git, ver .env.cloudflare.example).
# O build roda numa cópia limpa do repositório: nenhum .env local (banco de desenvolvimento,
# senha de teste) entra no Worker. As variáveis secretas vão para o Worker com `wrangler secret bulk`.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ARQ_ENV="$RAIZ/.env.cloudflare"
[ -f "$ARQ_ENV" ] || { echo "Falta $ARQ_ENV (copie de .env.cloudflare.example e preencha)."; exit 1; }
set -a; source "$ARQ_ENV"; set +a
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Cole o endereço do banco de produção (DATABASE_URL, começa com postgresql://) e aperte Enter."
  echo "Onde achar: Vercel → imperio-das-rosas → Settings → Environment Variables → DATABASE_URL."
  read -rsp "DATABASE_URL: " DATABASE_URL; echo
  case "$DATABASE_URL" in postgres://*|postgresql://*) ;; *) echo "Isso não parece um endereço de banco (postgresql://...)."; exit 1;; esac
  read -rp "Guardar no .env.cloudflare para os próximos deploys? (s/N) " GUARDAR
  if [ "$GUARDAR" = "s" ] || [ "$GUARDAR" = "S" ]; then
    DATABASE_URL="$DATABASE_URL" node -e '
      const fs = require("fs"), f = process.argv[1];
      const linha = "DATABASE_URL=" + JSON.stringify(process.env.DATABASE_URL);
      const s = fs.readFileSync(f, "utf8");
      fs.writeFileSync(f, /^DATABASE_URL=.*$/m.test(s) ? s.replace(/^DATABASE_URL=.*$/m, () => linha) : linha + "\n" + s);
    ' "$ARQ_ENV"
    echo "Guardado em .env.cloudflare (fica só neste computador, fora do git)."
  fi
fi
if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD_HASH:-}" ]; then
  echo "⚠️  ADMIN_EMAIL/ADMIN_PASSWORD_HASH em branco: o login do /admin não funciona até gravá-los (npx wrangler secret put ...)."
fi
[ -n "${AUTH_SECRET:-}" ] || AUTH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://imperiodasrosas.com}"

COPIA="$(mktemp -d)/imperio-cf"
echo "→ Cópia limpa da branch main em $COPIA"
git -C "$RAIZ" fetch -q origin main
git -C "$RAIZ" worktree add -q --detach "$COPIA" origin/main
trap 'git -C "$RAIZ" worktree remove --force "$COPIA" >/dev/null 2>&1 || true' EXIT
cd "$COPIA"

echo "→ Instalando dependências"
npm ci --silent

echo "→ Build (páginas geradas com os dados de produção)"
DATABASE_URL="$DATABASE_URL" NEXT_PUBLIC_SITE_URL="$SITE_URL" NEXT_TELEMETRY_DISABLED=1 npx opennextjs-cloudflare build

echo "→ Publicando o Worker e o cache das páginas"
npx opennextjs-cloudflare deploy

echo "→ Gravando as variáveis secretas no Worker"
node -e '
  const v = ["DATABASE_URL", "AUTH_SECRET", "ADMIN_EMAIL", "ADMIN_PASSWORD_HASH"].filter((k) => process.env[k]);
  process.stdout.write(JSON.stringify(Object.fromEntries(v.map((k) => [k, process.env[k]]))));
' | DATABASE_URL="$DATABASE_URL" AUTH_SECRET="$AUTH_SECRET" ADMIN_EMAIL="${ADMIN_EMAIL:-}" ADMIN_PASSWORD_HASH="${ADMIN_PASSWORD_HASH:-}" npx wrangler secret bulk

echo "✅ Publicado. Endereço do Worker: veja a linha 'workers.dev' acima."
