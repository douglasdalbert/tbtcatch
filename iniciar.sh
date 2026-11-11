#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf 'Instale Node.js e npm antes de iniciar. Consulte o README.md.\n' >&2
  exit 1
fi

node --input-type=module -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (!(major === 22 && minor >= 18 || major === 24 && minor >= 11 || major >= 26)) {
  console.error("Node.js incompatível. Use ^22.18.0, ^24.11.0 ou >=26.0.0.");
  process.exit(1);
}
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT deve ser uma porta válida.");
  process.exit(1);
}
'

if [[ ! -d node_modules ]]; then
  npm ci
elif ! npm ls --all >/dev/null; then
  printf 'Dependencias ausentes ou inconsistentes; restaurando pelo lockfile.\n'
  npm ci
fi

npm run build
printf '\nPainel do notebook e QR codes: http://localhost:%s/host\n' "${PORT:-3000}"
printf 'Mantenha este terminal aberto. Para encerrar, pressione Ctrl+C.\n\n'
exec npm start
