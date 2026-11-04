#!/bin/bash
# SMM Panel 1-Click Automated Setup for Ubuntu / Debian Linux VPS
set -e

echo "========================================================="
echo "🚀 SMM PANEL DEPLOYMENT SCRIPT"
echo "========================================================="

# 1. Update system
echo "📦 Updating OS packages..."
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y curl git ufw postgresql postgresql-contrib nginx build-essential

# 2. Install Node.js 20 LTS
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"

# 3. Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER smmuser WITH PASSWORD 'StrongSmmPass2026!';" || true
sudo -u postgres psql -c "CREATE DATABASE smmdb OWNER smmuser;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE smmdb TO smmuser;" || true

# 4. Generate .env file if not exists
if [ ! -f .env ]; then
    echo "⚙️ Creating .env configuration file..."
    cat << 'EOF' > .env
NODE_ENV=production
PORT=3000
SQL_HOST=localhost
SQL_PORT=5432
SQL_USER=smmuser
SQL_PASSWORD=StrongSmmPass2026!
SQL_DB_NAME=smmdb
JWT_SECRET=smm_secure_panel_jwt_secret_2026_x!
WHATSAPP_NUMBER=8795005604
EOF
fi

# 5. Install NPM Dependencies & Build
echo "📦 Installing project dependencies..."
npm install

echo "⚡ Building Fullstack Application..."
npm run build

# 6. PM2 Setup
echo "🚀 Configuring PM2 Daemon..."
sudo npm install -g pm2
pm2 stop smm-panel || true
pm2 delete smm-panel || true
pm2 start dist/server.cjs --name "smm-panel"
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME || true

# 7. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx Web Server..."
sudo tee /etc/nginx/sites-available/smm-panel > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_CONF

sudo ln -sf /etc/nginx/sites-available/smm-panel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 8. Firewall setup
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true
sudo ufw allow 22/tcp || true

echo "========================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "Your Website is Live at: http://$(curl -s ifconfig.me || echo 'localhost')"
echo "To view live logs: pm2 logs smm-panel"
echo "To restart server: pm2 restart smm-panel"
echo "========================================================="
