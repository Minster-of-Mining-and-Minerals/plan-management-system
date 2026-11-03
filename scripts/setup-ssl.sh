#!/usr/bin/env bash
# One-time HTTPS setup with Let's Encrypt (certbot) + automatic renewal.
#
# Usage (run as your normal user from anywhere; sudo is used only where needed):
#   ./scripts/setup-ssl.sh pms.example.gov.et admin@example.gov.et
#
# Requirements:
#   - A domain name whose DNS A record points to this server's public IP
#   - Ports 80 and 443 reachable from the internet (forwarded to this server)
#   - The stack already running: docker compose up -d
#
# What it does:
#   1. Installs certbot if missing
#   2. Serves the Let's Encrypt challenge through the running nginx (no downtime)
#   3. Obtains the certificate and registers scripts/ssl-renew-hook.sh for renewals
#   4. Enables the HTTPS server block + HTTP->HTTPS redirect for the domain
#   5. Switches the app URLs in .env to https://DOMAIN and rebuilds
#   6. Verifies automatic renewal with a dry run

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: $0 <domain> <email>"
  echo "Example: $0 pms.example.gov.et admin@example.gov.et"
  exit 1
fi
if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  echo "ERROR: '$DOMAIN' is an IP address. Let's Encrypt needs a domain name (e.g. pms.example.gov.et)."
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
WEBROOT="$PROJECT_DIR/nginx/certbot-www"
HOOK="$PROJECT_DIR/scripts/ssl-renew-hook.sh"
cd "$PROJECT_DIR"
chmod +x "$HOOK"   # certbot executes the hook directly

step() { echo; echo "==> $*"; }

# --- 1. certbot --------------------------------------------------------------
step "Checking certbot"
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y certbot
fi
certbot --version

# --- 2. DNS sanity check -------------------------------------------------------
step "Checking DNS for $DOMAIN"
RESOLVED="$(getent ahostsv4 "$DOMAIN" | awk '{print $1; exit}' || true)"
PUBLIC_IP="$(curl -s -m 10 https://ifconfig.me || true)"
if [[ -z "$RESOLVED" ]]; then
  echo "ERROR: $DOMAIN does not resolve. Ask your DNS admin to create an A record pointing to the server's public IP."
  exit 1
fi
echo "  $DOMAIN -> $RESOLVED   (this server's outbound public IP: ${PUBLIC_IP:-unknown})"
if [[ -n "$PUBLIC_IP" && "$RESOLVED" != "$PUBLIC_IP" ]]; then
  echo "  WARNING: these differ. That is fine if your network forwards $RESOLVED:80/443 to this server; otherwise validation will fail."
fi

# --- 3. Make nginx serve the challenge directory -------------------------------
step "Preparing challenge directory and nginx"
mkdir -p "$WEBROOT/.well-known/acme-challenge" nginx/ssl
docker compose up -d nginx   # recreates nginx if the certbot-www mount is new
sleep 3

TOKEN="setup-check-$RANDOM"
echo "ok" > "$WEBROOT/.well-known/acme-challenge/$TOKEN"
if ! curl -fsS -m 10 -H "Host: $DOMAIN" "http://127.0.0.1/.well-known/acme-challenge/$TOKEN" >/dev/null; then
  rm -f "$WEBROOT/.well-known/acme-challenge/$TOKEN"
  echo "ERROR: nginx is not serving /.well-known/acme-challenge/ locally."
  echo "       Check: docker compose ps nginx   and   docker compose logs --tail=30 nginx"
  exit 1
fi
echo "  nginx serves the challenge path locally: OK"
if curl -fsS -m 10 "http://$DOMAIN/.well-known/acme-challenge/$TOKEN" >/dev/null 2>&1; then
  echo "  Reachable via http://$DOMAIN: OK"
else
  echo "  WARNING: could not reach http://$DOMAIN from this server. This can be normal behind NAT;"
  echo "           Let's Encrypt will test from the internet. If certbot fails, port 80 is not forwarded."
fi
rm -f "$WEBROOT/.well-known/acme-challenge/$TOKEN"

# --- 4. Obtain the certificate ---------------------------------------------------
step "Requesting certificate from Let's Encrypt"
sudo certbot certonly \
  --webroot -w "$WEBROOT" \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --non-interactive --keep-until-expiring \
  --deploy-hook "$HOOK"

# Copy now as well (the deploy hook does not run if an existing cert was kept).
sudo RENEWED_LINEAGE="/etc/letsencrypt/live/$DOMAIN" "$HOOK"

# --- 5. Enable HTTPS server block ----------------------------------------------------
step "Enabling HTTPS in nginx"
sed "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/app-ssl.conf.example > nginx/conf.d/app-ssl.conf
docker compose exec -T nginx nginx -t
docker compose restart nginx

# --- 6. Switch app URLs to HTTPS --------------------------------------------------------
step "Updating .env to https://$DOMAIN"
[[ -f .env ]] || { echo "ERROR: .env not found in $PROJECT_DIR"; exit 1; }
cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"

set_env() {
  local key="$1" value="$2"
  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}
BASE="https://$DOMAIN"
set_env APP_URL "$BASE"
set_env AUTH_URL "$BASE"
set_env FRONTEND_URL "$BASE"
set_env BASE_URL "$BASE"
set_env BACKEND_PUBLIC_URL "$BASE"
set_env API_PUBLIC_URL "$BASE/api"
set_env APP_DOMAIN "$DOMAIN"
set_env NEXT_PUBLIC_BASE_URL "$BASE/api"
set_env NEXT_PUBLIC_FILE_URL "$BASE"
set_env NEXT_PUBLIC_SOCKET_URL "$BASE"
set_env NEXT_PUBLIC_COLLABORATION_API_URL "$BASE/api/v1"
set_env ONLYOFFICE_URL "$BASE/onlyoffice"
set_env NEXT_PUBLIC_ONLYOFFICE_URL "$BASE/onlyoffice"

step "Rebuilding (frontend URLs are baked in at build time; takes a few minutes)"
docker compose up -d --build

# --- 7. Verify auto-renewal ------------------------------------------------------------------
step "Testing automatic renewal (dry run)"
sudo certbot renew --dry-run

if systemctl list-timers --all 2>/dev/null | grep -q certbot; then
  echo "  certbot systemd timer is active (checks twice a day)."
else
  echo "  No certbot timer found; adding a daily cron job."
  echo "17 3 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew >/dev/null
fi

step "Done"
echo "  Open: https://$DOMAIN"
echo "  Certificate expires: $(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)"
echo "  Renewals run automatically and reload nginx via scripts/ssl-renew-hook.sh"
