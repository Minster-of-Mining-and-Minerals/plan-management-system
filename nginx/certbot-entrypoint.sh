#!/bin/sh
# Certbot entrypoint

DOMAIN="${CERTBOT_DOMAIN}"
EMAIL="${CERTBOT_EMAIL}"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

# Validate required env var
if [ -z "$EMAIL" ]; then
    echo "[certbot] ERROR: CERTBOT_EMAIL environment variable is not set."
    echo "[certbot] Using default: admin@${DOMAIN}"
    EMAIL="admin@${DOMAIN}"
fi

# First-time certificate issuance
if [ ! -f "$CERT_PATH" ]; then
    echo "[certbot] ================================================"
    echo "[certbot] No certificate found for ${DOMAIN}."
    echo "[certbot] Obtaining initial SSL certificate..."
    echo "[certbot] ================================================"

    # Wait for nginx to be available on port 80
    echo "[certbot] Waiting for Nginx to be ready on port 80..."
    until wget -q -O /dev/null "http://nginx/health" 2>/dev/null; do
        echo "[certbot] Nginx not ready yet. Retrying in 3 seconds..."
        sleep 3
    done
    echo "[certbot] Nginx is ready!"

    if certbot certonly \
        --webroot \
        -w /var/www/certbot \
        -d "${DOMAIN}" \
        --email "${EMAIL}" \
        --agree-tos \
        --no-eff-email \
        --non-interactive; then

        echo "[certbot] ================================================"
        echo "[certbot] SSL certificate issued successfully!"
        echo "[certbot] Nginx will now switch to HTTPS automatically."
        echo "[certbot] ================================================"
    else
        echo "[certbot] ================================================"
        echo "[certbot] ERROR: SSL certificate issuance failed!"
        echo "[certbot] Please ensure port 80 is open on your firewall and your domain points to this server's IP."
        echo "[certbot] Nginx will remain in HTTP-only mode."
        echo "[certbot] ================================================"
    fi
fi

# Auto-renewal loop (every 12 hours)
echo "[certbot] Starting auto-renewal loop (checks every 12 hours)..."
trap exit TERM
while :; do
    certbot renew || echo "[certbot] Renewal attempt failed. Will retry in 12 hours."
    sleep 12h &
    wait ${!}
done
