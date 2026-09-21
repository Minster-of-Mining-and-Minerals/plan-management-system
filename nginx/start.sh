#!/bin/sh
# Nginx startup script
set -e

# Wait a moment for certbot to potentially initialize
sleep 2

CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"

if [ ! -f "$CERT" ]; then
    echo "[nginx] No SSL certificate found for ${DOMAIN}."
    echo "[nginx] Starting in HTTP-only mode for initial certificate issuance..."
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-http.conf > /etc/nginx/conf.d/default.conf
else
    echo "[nginx] SSL certificate found. Starting in HTTPS mode..."
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-https.conf > /etc/nginx/conf.d/default.conf
fi

# Start nginx in the background
nginx -g "daemon off;" &
NGINX_PID=$!

# If HTTP-only mode: wait for cert, then switch to HTTPS
if [ ! -f "$CERT" ]; then
    echo "[nginx] Waiting for Certbot to issue SSL certificate..."
    while [ ! -f "$CERT" ]; do
        sleep 5
    done
    echo "[nginx] Certificate obtained! Switching to HTTPS mode..."
    sleep 2  # allow certbot to finish writing all cert files
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-https.conf > /etc/nginx/conf.d/default.conf
    nginx -s reload
    echo "[nginx] Now running in HTTPS mode."
fi

# Reload every 6 hours to pick up renewed certificates
while kill -0 "$NGINX_PID" 2>/dev/null; do
    sleep 6h &
    wait $!
    echo "[nginx] Reloading to pick up any renewed SSL certificates..."
    nginx -s reload
done
