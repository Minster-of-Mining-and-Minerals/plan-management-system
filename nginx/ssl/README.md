# TLS certificates for NovaCure Platform (HTTPS)

Place certificate files in this directory:

| File | Description |
|------|-------------|
| `fullchain.pem` | Certificate + intermediate chain |
| `privkey.pem` | Private key |

## Enable HTTPS

1. Copy the example SSL server block:
   ```bash
   cp ../conf.d/app-ssl.conf.example ../conf.d/app-ssl.conf
   ```
2. Edit `app-ssl.conf` and set your `server_name` (production domain).
3. Restart nginx:
   ```bash
   docker compose restart nginx
   ```

## Obtain certificates (Let's Encrypt example)

```bash
certbot certonly --standalone -d novacure.example.com
cp /etc/letsencrypt/live/novacure.example.com/fullchain.pem .
cp /etc/letsencrypt/live/novacure.example.com/privkey.pem .
```

Update frontend/API env for HTTPS:

- `NEXT_PUBLIC_BASE_URL=https://novacure.example.com/api`
- `NEXT_PUBLIC_FILE_URL=https://novacure.example.com`
- `NEXT_PUBLIC_FRONTEND_URL=https://novacure.example.com`
- `FRONTEND_URL=https://novacure.example.com`
