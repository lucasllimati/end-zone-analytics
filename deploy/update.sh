#!/usr/bin/env bash
# Publica a versão mais recente do código (os dados ficam nos volumes e não se perdem).
# Uso no servidor:  bash deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git fetch --quiet origin
git reset --hard origin/main
docker compose up -d --build
docker image prune -f >/dev/null

echo "Aguardando a aplicação responder…"
for i in $(seq 1 60); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:8787/ready >/dev/null 2>&1; then
    echo "OK: aplicação pronta."
    exit 0
  fi
  sleep 5
done
echo "A aplicação não ficou pronta em 5 minutos. Veja: docker compose logs --tail=100 app" >&2
exit 1
