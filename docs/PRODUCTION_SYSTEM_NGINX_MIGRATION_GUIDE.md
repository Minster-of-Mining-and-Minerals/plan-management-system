# System-Level Nginx Reverse Proxy Architecture & Multi-Application Deployment Guide

## 1. Overview & Architecture

The production server (`mom-ecs`, IP `197.156.110.155`) has been migrated from direct container port binding on ports 80/443 to a **System-Level Nginx** reverse proxy architecture.

System-level Nginx is now the central entry point for all incoming HTTP (port 80) and HTTPS (port 443) traffic. It terminates TLS, handles ACME challenge validations for Let's Encrypt certificates, applies security headers, and routes traffic by requested domain name to the respective private Docker container endpoints.

```text
Public Internet
       |
       v
========================================================================
System-Level Nginx (Host ports 80 & 443)
- TLS Termination (Let's Encrypt: /etc/letsencrypt/live/<domain>/)
- HTTP to HTTPS 301 Redirect
- ACME HTTP-01 Webroot (/var/www/certbot)
- Host Headers & WebSocket Upgrade (Connection & Upgrade mapping)
========================================================================
       |                                          |
       | Domain: prms.mom.gov.et                  | Future Domain: mims.mom.gov.et
       v (proxy_pass http://127.0.0.1:8080)       v (proxy_pass http://127.0.0.1:8081)
----------------------------------------   ----------------------------------------
Plan Management System (Stack)             Second Application (Stack)
- App-Level Nginx (127.0.0.1:8080)         - App-Level Nginx (127.0.0.1:8081)
- Frontend (Next.js: 3000)                 - Frontend (Next.js/React)
- Backend API (Express: 4000)              - Backend API
- Socket.IO (5000)                         - Database (Isolated)
- OnlyOffice DocumentServer (80)           - Internal Docker Network
- PostgreSQL (Isolated, port 5432)
- Network: plan-management-system_app-network
----------------------------------------   ----------------------------------------
```

---

## 2. Plan Management System Configuration

### 2.1 Host Port Allocation
| Service | Container Internal Port | Host Port Mapping | Accessibility |
| :--- | :--- | :--- | :--- |
| **System Nginx (Public)** | 80, 443 | `0.0.0.0:80`, `0.0.0.0:443` | Public Internet |
| **Plan Management Nginx** | 80 | `127.0.0.1:8080:80` | Localhost Only (System Nginx) |
| **Frontend** | 3000 | *None* | Internal Docker Network |
| **Backend API** | 4000 | *None* | Internal Docker Network |
| **Backend Socket.IO** | 5000 | *None* | Internal Docker Network |
| **PostgreSQL** | 5432 | *None* | Internal Docker Network |
| **OnlyOffice** | 80, 443 | *None* | Internal Docker Network |

### 2.2 Docker Compose (`docker-compose.yml`)
The `nginx` service in `docker-compose.yml` binds strictly to the loopback interface on port 8080:
```yaml
  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:${NGINX_HTTP_PORT:-8080}:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/snippets:/etc/nginx/snippets:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/certbot-www:/var/www/certbot:ro
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
      onlyoffice:
        condition: service_healthy
    networks:
      - app-network
```

### 2.3 Environment Configuration (`.env`)
The environment configuration has been updated to reflect the private loopback HTTP port:
```env
NGINX_HTTP_PORT=8080
# NGINX_HTTPS_PORT=443 (Commented out: HTTPS terminated at system-level Nginx)

# Public URLs (Unchanged)
APP_URL=https://prms.mom.gov.et
AUTH_URL=https://prms.mom.gov.et
FRONTEND_URL=https://prms.mom.gov.et
BASE_URL=https://prms.mom.gov.et
API_PUBLIC_URL=https://prms.mom.gov.et/api
BACKEND_PUBLIC_URL=https://prms.mom.gov.et
APP_DOMAIN=prms.mom.gov.et
ONLYOFFICE_URL=https://prms.mom.gov.et/onlyoffice
NEXT_PUBLIC_BASE_URL=https://prms.mom.gov.et/api
NEXT_PUBLIC_FILE_URL=https://prms.mom.gov.et
NEXT_PUBLIC_SOCKET_URL=https://prms.mom.gov.et
NEXT_PUBLIC_SOCKET_PORT=5000
NEXT_PUBLIC_COLLABORATION_API_URL=https://prms.mom.gov.et/api/v1
NEXT_PUBLIC_ONLYOFFICE_URL=https://prms.mom.gov.et/onlyoffice
```

### 2.4 Application-Level Nginx Tweaks
In `nginx/snippets/proxy.conf`, upstream `X-Forwarded-Proto` support was added so the container preserves `https` forwarded by system Nginx:
```nginx
map $http_x_forwarded_proto $proxy_x_forwarded_proto {
    default $http_x_forwarded_proto;
    ''      $scheme;
}
```
And in `nginx/snippets/proxy-headers.conf`:
```nginx
proxy_set_header X-Forwarded-Proto $proxy_x_forwarded_proto;
```
Inside the container, `nginx/conf.d/app-ssl.conf` was archived (`app-ssl.conf.migrated`) so container Nginx serves on port 80 without executing an internal redirect loop back to https.

---

## 3. System-Level Nginx Configuration

### 3.1 WebSocket Upgrade Map (`/etc/nginx/conf.d/websocket.conf`)
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

### 3.2 Virtual Host (`/etc/nginx/sites-available/prms.mom.gov.et`)
Symlinked to `/etc/nginx/sites-enabled/prms.mom.gov.et`:
```nginx
# =============================================================================
# System-Level Reverse Proxy for Plan Management System
# Domain: prms.mom.gov.et -> Private Docker Nginx (127.0.0.1:8080)
# =============================================================================

# HTTP -> Redirect all traffic to HTTPS (preserving ACME challenge)
server {
    listen 80;
    listen [::]:80;
    server_name prms.mom.gov.et;

    # Let's Encrypt HTTP-01 challenge
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Virtual Host
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prms.mom.gov.et;

    # TLS Certificates from Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/prms.mom.gov.et/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prms.mom.gov.et/privkey.pem;

    # Modern TLS Security Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Request body limit for document and file uploads (matches 100M app limit)
    client_max_body_size 100m;

    # Reverse Proxy to Docker Application Nginx (127.0.0.1:8080)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # WebSocket / Socket.IO upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # Forwarded identity headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;

        # Timeouts for OnlyOffice and long-running collaboration requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        send_timeout 3600s;

        # Buffering settings aligned with application defaults
        proxy_buffering on;
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;
    }
}
```

---

## 4. SSL Certificates & Automated Renewal

### 4.1 Certificate Storage
- **Certificate Path**: `/etc/letsencrypt/live/prms.mom.gov.et/fullchain.pem`
- **Private Key Path**: `/etc/letsencrypt/live/prms.mom.gov.et/privkey.pem`
- **ACME Webroot**: `/var/www/certbot`

### 4.2 Automated Renewal (`/etc/letsencrypt/renewal/prms.mom.gov.et.conf`)
Certbot renewal is handled directly on the host with zero downtime:
```ini
# renew_before_expiry = 30 days
version = 2.9.0
archive_dir = /etc/letsencrypt/archive/prms.mom.gov.et
cert = /etc/letsencrypt/live/prms.mom.gov.et/cert.pem
privkey = /etc/letsencrypt/live/prms.mom.gov.et/privkey.pem
chain = /etc/letsencrypt/live/prms.mom.gov.et/chain.pem
fullchain = /etc/letsencrypt/live/prms.mom.gov.et/fullchain.pem

[renewalparams]
account = ea118de5dda743fc78a90903a4af24d0
renew_hook = systemctl reload nginx
authenticator = webroot
webroot_path = /var/www/certbot,
server = https://acme-v02.api.letsencrypt.org/directory
key_type = ecdsa
[[webroot_map]]
prms.mom.gov.et = /var/www/certbot
```
The Certbot systemd timer (`certbot.timer`) runs automatically twice daily. Renewals test cleanly with:
```bash
sudo certbot renew --dry-run
```

---

## 5. Adding Future Independent Applications

The server is fully prepared for hosting multiple independent applications. Each application operates within its own Docker Compose stack, has its own domain, and maps its application-level Nginx to a distinct loopback port (e.g. `127.0.0.1:8081`, `127.0.0.1:8082`).

### Step-by-Step Procedure to Add a Second Application

#### Step 1: Assign a Loopback Port in Second Application's Docker Compose
In the new project's `docker-compose.yml`, bind its application Nginx to an unused loopback port (for example, `8081`):
```yaml
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:80"
```
Start or recreate the second application:
```bash
cd /home/mom_admin/Mining-Inspection-Management-System
docker compose up -d
```

#### Step 2: Obtain SSL Certificate for the Second Domain
Obtain a certificate using Certbot with the shared ACME webroot (`/var/www/certbot`):
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d second-app.mom.gov.et
```

#### Step 3: Create a System-Level Nginx Virtual Host
Create `/etc/nginx/sites-available/second-app.mom.gov.et`:
```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name second-app.mom.gov.et;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS reverse proxy to second application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name second-app.mom.gov.et;

    ssl_certificate /etc/letsencrypt/live/second-app.mom.gov.et/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/second-app.mom.gov.et/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 100m;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port 443;
    }
}
```

#### Step 4: Enable and Reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/second-app.mom.gov.et /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
The second application is now securely available online through the system-level Nginx without disturbing the Plan Management System.

---

## 6. Verification & Health Check Commands

To verify application and server health at any time:

```bash
# Check system Nginx service status
sudo systemctl status nginx

# Validate system Nginx syntax
sudo nginx -t

# Check listening ports
sudo ss -tulpn | grep -E ':80 |:443 |:8080 |:8081 '

# Test Plan Management System public HTTPS endpoint
curl -I https://prms.mom.gov.et

# Test Backend API authentication endpoint
curl -I https://prms.mom.gov.et/api/auth/me

# Test OnlyOffice Document Server health
curl -i https://prms.mom.gov.et/onlyoffice/healthcheck

# Test Swagger UI documentation
curl -I https://prms.mom.gov.et/api-docs/

# Test Socket.IO polling handshake
curl -i "https://prms.mom.gov.et/socket.io/?EIO=4&transport=polling"

# Check Docker containers status
cd /home/mom_admin/plan-management-system
docker compose ps

# Check Certbot renewal dry-run
sudo certbot renew --dry-run
```

---

## 7. Rollback Procedure

If a rollback to container-level ports is ever required:

1. **Stop System-Level Nginx**:
   ```bash
   sudo systemctl stop nginx
   sudo systemctl disable nginx
   ```
2. **Restore Application Configuration**:
   ```bash
   cd /home/mom_admin/plan-management-system
   # Restore NGINX_HTTP_PORT=80 and NGINX_HTTPS_PORT=443 in .env
   sed -i 's/^NGINX_HTTP_PORT=.*/NGINX_HTTP_PORT=80/' .env
   sed -i 's/^# NGINX_HTTPS_PORT=.*/NGINX_HTTPS_PORT=443/' .env
   
   # Restore app-ssl.conf
   mv nginx/conf.d/app-ssl.conf.migrated nginx/conf.d/app-ssl.conf 2>/dev/null || true
   ```
3. **Recreate Plan Management System Nginx**:
   ```bash
   docker compose up -d --no-deps --force-recreate nginx
   ```
4. **Verify Container Port Bindings**:
   ```bash
   docker compose ps
   # Container will be mapped to 0.0.0.0:80 and 0.0.0.0:443 directly.
   ```
