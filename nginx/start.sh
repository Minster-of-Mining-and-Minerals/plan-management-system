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

    # Start nginx in the background temporarily
    nginx -g "daemon off;" &
    NGINX_PID=$!

    echo "[nginx] Waiting for Certbot to issue SSL certificate..."
    while [ ! -f "$CERT" ]; do
        # Check if Nginx crashed
        if ! kill -0 "$NGINX_PID" 2>/dev/null; then
            echo "[nginx] ERROR: Nginx crashed while waiting for certbot! Exiting."
            exit 1
        fi
        sleep 5
    done

    echo "[nginx] Certificate obtained! Switching to HTTPS mode..."
    sleep 2  # allow certbot to finish writing all cert files
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-https.conf > /etc/nginx/conf.d/default.conf
    nginx -s reload
    echo "[nginx] Now running in HTTPS mode."
    
    # Wait for the background Nginx process indefinitely
    wait "$NGINX_PID"
else
    echo "[nginx] SSL certificate found. Starting in HTTPS mode..."
    envsubst '${DOMAIN}' < /etc/nginx/templates/nginx-https.conf > /etc/nginx/conf.d/default.conf
    
    # Start the auto-reload loop in the background
    (
        while true; do
            sleep 6h
            echo "[nginx] Reloading to pick up any renewed SSL certificates..."
            nginx -s reload || true
        done
    ) &

    # Run Nginx in the foreground
    exec nginx -g "daemon off;"
fi
