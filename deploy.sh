#!/usr/bin/env bash
set -e

echo "==> Building PulseOS..."

# Build shared types
npm run build --workspace=packages/types

# Build API
npm run build --workspace=apps/api

# Build frontend
npm run build --workspace=apps/web

# Copy nginx config (adjust paths as needed)
echo "==> Copying nginx config..."
sudo cp nginx.conf /etc/nginx/sites-available/pulseos
sudo ln -sf /etc/nginx/sites-available/pulseos /etc/nginx/sites-enabled/pulseos

# Copy static files
echo "==> Deploying frontend..."
sudo mkdir -p /var/www/pulseos
sudo cp -r apps/web/dist/* /var/www/pulseos/

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Start/restart API with PM2
echo "==> Starting API with PM2..."
mkdir -p logs
pm2 startOrRestart ecosystem.config.cjs --env production
pm2 save

echo "==> Done! Dashboard: https://your-domain.com"
