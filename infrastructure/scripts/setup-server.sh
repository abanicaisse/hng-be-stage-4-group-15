#!/bin/bash

# Server setup script for Ubuntu 20.04/22.04
# This script installs all required dependencies and sets up the server

set -e

echo "🔧 Setting up server for Notification System..."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install basic tools
print_status "Installing basic tools..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    certbot \
    python3-certbot-nginx

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $SUDO_USER
    rm get-docker.sh
else
    print_status "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    print_status "Docker Compose already installed"
fi

# Install Node.js and pnpm (for local builds if needed)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pnpm pm2
else
    print_status "Node.js already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # API Gateway (optional, use nginx instead)

# Create project directory
PROJECT_DIR="/opt/notification-system"
mkdir -p $PROJECT_DIR
chown -R $SUDO_USER:$SUDO_USER $PROJECT_DIR

# Create logs directory
mkdir -p $PROJECT_DIR/logs
mkdir -p $PROJECT_DIR/backups

# Configure log rotation
cat > /etc/logrotate.d/notification-system <<EOF
$PROJECT_DIR/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $SUDO_USER $SUDO_USER
    sharedscripts
    postrotate
        docker-compose -f $PROJECT_DIR/docker-compose.prod.yml restart notification-services
    endscript
}
EOF

# Set up fail2ban for SSH
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
port = 22
maxretry = 3
bantime = 3600
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Configure system limits
cat >> /etc/security/limits.conf <<EOF
*               soft    nofile          65536
*               hard    nofile          65536
root            soft    nofile          65536
root            hard    nofile          65536
EOF

# Optimize kernel parameters for Docker
cat >> /etc/sysctl.conf <<EOF
net.ipv4.ip_forward = 1
vm.max_map_count = 262144
fs.file-max = 65536
net.core.somaxconn = 1024
EOF
sysctl -p

print_status "Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to $PROJECT_DIR"
echo "2. Configure environment variables (.env.production)"
echo "3. Run the deployment script: ./infrastructure/scripts/deploy.sh"
echo ""
echo "Don't forget to:"
echo "- Set up SSL certificates with: certbot --nginx -d your-domain.com"
echo "- Configure GitHub secrets for CI/CD"
echo "- Set up monitoring and alerting"
echo ""
