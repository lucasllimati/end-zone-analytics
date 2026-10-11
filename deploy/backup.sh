#!/usr/bin/env bash
# Backup do log operacional (execuções, alertas, auditoria) e da configuração.
# Os dados publicados podem ser recriados com uma carga completa, então não precisam de backup.
# Uso: bash deploy/backup.sh   (agende no crontab: 0 4 * * * bash ~/end-zone-analytics/deploy/backup.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
dest="$HOME/backups"
mkdir -p "$dest"
stamp=$(date +%Y%m%d-%H%M)
docker compose cp app:/app/ops "$dest/ops-$stamp"
tar -czf "$dest/eza-$stamp.tar.gz" -C "$dest" "ops-$stamp"
cp .env "$dest/env-$stamp" && chmod 600 "$dest/env-$stamp"
rm -rf "$dest/ops-$stamp"
# Mantém os 14 backups mais recentes.
ls -1t "$dest"/eza-*.tar.gz | tail -n +15 | xargs -r rm -f
ls -1t "$dest"/env-* | tail -n +15 | xargs -r rm -f
echo "Backup salvo em $dest/eza-$stamp.tar.gz"
