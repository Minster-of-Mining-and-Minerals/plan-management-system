# TLS certificates for HTTPS

This directory holds the certificate used by `nginx/conf.d/app-ssl.conf`:

- `fullchain.pem`: certificate and intermediate chain
- `privkey.pem`: private key

Both files are git-ignored and must never be committed.

## Automated setup (Let's Encrypt + auto-renewal)

Requirements:

- a domain name with a DNS A record pointing to the server's public IP
- ports 80 and 443 forwarded from that public IP to the server
- the stack running (`docker compose up -d`)

Run once on the server, as your normal user:

```bash
bash scripts/setup-ssl.sh pms.example.gov.et admin@example.gov.et
```

The script obtains the certificate through the running nginx (webroot challenge, no downtime),
enables HTTPS with an HTTP-to-HTTPS redirect for the domain, switches the URLs in `.env` to
`https://`, rebuilds, and tests renewal.

Renewal is automatic: certbot's systemd timer runs `certbot renew` twice a day, and
`scripts/ssl-renew-hook.sh` copies renewed certificates here and reloads nginx.

Check renewal status at any time:

```bash
sudo certbot certificates
sudo certbot renew --dry-run
systemctl list-timers | grep certbot
```

## Manual certificates

To use certificates from another authority, place `fullchain.pem` and `privkey.pem` here, then:

```bash
sed "s/YOUR_DOMAIN/pms.example.gov.et/g" nginx/conf.d/app-ssl.conf.example > nginx/conf.d/app-ssl.conf
docker compose restart nginx
```
