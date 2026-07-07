# TLS certificates for HTTPS (app-ssl.conf)
#
# Required files in this directory:
#   fullchain.pem  — certificate + intermediate chain
#   privkey.pem    — private key
#
# After placing certificates:
#   cp ../conf.d/app-ssl.conf.example ../conf.d/app-ssl.conf
#   # Edit server_name in app-ssl.conf to match APP_DOMAIN in .env
#   docker compose restart nginx
#
# Obtain certificates (example with certbot on the host):
#   certbot certonly --standalone -d plans.example.gov.et
#   cp /etc/letsencrypt/live/plans.example.gov.et/fullchain.pem .
#   cp /etc/letsencrypt/live/plans.example.gov.et/privkey.pem .
