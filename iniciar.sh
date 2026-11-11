#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

mode="${1:---dev}"
if [[ $# -gt 1 || ( "$mode" != "--dev" && "$mode" != "--producao" ) ]]; then
  printf 'Uso: ./iniciar.sh [--dev|--producao]\n' >&2
  exit 1
fi

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf 'Instale Node.js e npm antes de iniciar. Consulte o README.md.\n' >&2
  exit 1
fi

node --input-type=module -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (!(major === 22 && minor >= 18 || major === 24 && minor >= 11 || major >= 26)) {
  console.error("Node.js incompativel. Use ^22.18.0, ^24.11.0 ou >=26.0.0.");
  process.exit(1);
}
for (const [name, fallback] of [["PORT", 3000], ["WEB_PORT", 5173]]) {
  const port = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`${name} deve ser uma porta valida.`);
    process.exit(1);
  }
}
if (Number(process.env.PORT ?? 3000) === Number(process.env.WEB_PORT ?? 5173)) {
  console.error("PORT e WEB_PORT devem ser diferentes.");
  process.exit(1);
}
'

if [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
  for required in powershell.exe docker; do
    command -v "$required" >/dev/null || {
      printf 'No WSL, este iniciador requer %s e Docker Desktop com integracao WSL.\n' "$required" >&2
      exit 1
    }
  done
  docker compose version >/dev/null
  docker info >/dev/null
  CATCH_LAN_IP="$(powershell.exe -NoProfile -NonInteractive -Command '
    $ErrorActionPreference = "Stop"
    $wifi = Get-NetIPConfiguration | Where-Object {
      $_.NetAdapter.Status -eq "Up" -and
      $_.NetAdapter.InterfaceDescription -match "Wi-Fi|Wireless|802\.11" -and
      $_.IPv4Address -and $_.IPv4DefaultGateway
    } | Select-Object -First 1
    if (-not $wifi) { throw "Nenhuma interface Wi-Fi ativa com IPv4 e gateway encontrada." }
    $wifi.IPv4Address.IPAddress
  ' | tr -d '\r\n')"
  export CATCH_LAN_IP
  node --input-type=module -e '
    import { isIPv4 } from "node:net";
    if (!isIPv4(process.env.CATCH_LAN_IP ?? "")) {
      console.error("Nao foi possivel detectar o IPv4 Wi-Fi do Windows.");
      process.exit(1);
    }
  '
  if [[ "$mode" == "--producao" ]]; then
    export CATCH_MODE=production CATCH_PUBLIC_PORT="${PORT:-3000}"
  else
    export CATCH_MODE=dev CATCH_PUBLIC_PORT="${WEB_PORT:-5173}"
  fi
  printf '\nPainel e QR codes na rede: http://%s:%s/\n' "$CATCH_LAN_IP" "$CATCH_PUBLIC_PORT"
  docker compose up --build --wait
  printf 'Para encerrar o servidor: docker compose stop\n'
  if [[ "$mode" == "--producao" ]]; then
    exec docker compose logs --follow
  fi
  printf 'Atualizacao automatica ativa; Ctrl+C encerra somente o monitoramento.\n'
  exec docker compose watch
fi

if [[ ! -d node_modules ]]; then
  npm ci
elif ! npm ls --all >/dev/null; then
  printf 'Dependencias ausentes ou inconsistentes; restaurando pelo lockfile.\n'
  npm ci
fi

if [[ "$mode" == "--producao" ]]; then
  npm run build
fi

node --input-type=module - "$mode" <<'JS'
import { networkInterfaces } from "node:os";
const port = process.argv[2] === "--producao"
  ? process.env.PORT ?? 3000
  : process.env.WEB_PORT ?? 5173;
const addresses = [...new Set(Object.values(networkInterfaces()).flatMap(entries =>
  (entries ?? []).filter(entry => entry.family === "IPv4" && !entry.internal).map(entry => entry.address)))];
if (!addresses.length) {
  console.error("Nenhum endereco IPv4 de rede encontrado. Conecte o notebook a rede antes de iniciar.");
  process.exit(1);
}
console.log("\nPainel do notebook e QR codes (abra pelo IP da rede compartilhada):");
for (const address of addresses) console.log(`http://${address}:${port}/`);
JS

if [[ "$mode" == "--producao" ]]; then
  printf 'Modo producao. Para encerrar, pressione Ctrl+C.\n\n'
  exec npm start
fi

printf 'Modo desenvolvimento: a interface atualiza automaticamente ao salvar.\n'
printf 'Alteracoes no servidor reiniciam a partida em memoria.\n'
printf 'Mantenha este terminal aberto. Para encerrar, pressione Ctrl+C.\n\n'
exec npm run dev
