#!/usr/bin/env bash
# Certbot deploy hook: runs (as root) after a certificate is issued or renewed.
# Copies the new certificate into nginx/ssl/ and reloads nginx with no downtime.
#
# Certbot sets RENEWED_LINEAGE (e.g. /etc/letsencrypt/live/pms.example.gov.et).
# Registered automatically by scripts/setup-ssl.sh via --deploy-hook.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
LINEAGE="${RENEWED_LINEAGE:?RENEWED_LINEAGE is not set (this script is meant to be run by certbot)}"

# cp onto existing files keeps the same inode, so the bind-mounted
# nginx container sees the new contents immediately.
cp -L "$LINEAGE/fullchain.pem" "$PROJECT_DIR/nginx/ssl/fullchain.pem"
cp -L "$LINEAGE/privkey.pem" "$PROJECT_DIR/nginx/ssl/privkey.pem"
chmod 644 "$PROJECT_DIR/nginx/ssl/fullchain.pem"
chmod 600 "$PROJECT_DIR/nginx/ssl/privkey.pem"

cd "$PROJECT_DIR"
if docker compose ps --status running --services 2>/dev/null | grep -qx nginx; then
  docker compose exec -T nginx nginx -t
  docker compose exec -T nginx nginx -s reload
  echo "[ssl-renew-hook] Certificate updated and container nginx reloaded."
else
  echo "[ssl-renew-hook] Certificate copied; container nginx is not running, so no reload was needed."
fi

if systemctl is-active --quiet nginx 2>/dev/null; then
  nginx -t && systemctl reload nginx
  echo "[ssl-renew-hook] System-level Nginx reloaded."
fi
