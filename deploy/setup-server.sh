#!/usr/bin/env bash
# Preparação de um servidor Ubuntu 22.04/24.04 novo (ex.: Oracle Cloud Always Free) para o End Zone Analytics.
# Uso (no servidor, como usuário com sudo):  bash deploy/setup-server.sh
set -euo pipefail

echo "==> Atualizando o sistema"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades

echo "==> Atualizações de segurança automáticas"
sudo dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Docker (repositório oficial)"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

echo "==> Firewall: só SSH, HTTP e HTTPS"
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw --force enable

# As imagens Ubuntu da Oracle trazem regras iptables próprias que bloqueiam 80/443 mesmo com o ufw liberado.
if [ -f /etc/iptables/rules.v4 ] && ! grep -q "dport 443" /etc/iptables/rules.v4; then
  echo "==> Liberando 80/443 nas regras iptables da Oracle"
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
  sudo netfilter-persistent save || sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
fi

echo "==> SSH: somente chave (sem senha, sem root)"
sudo sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload ssh || sudo systemctl reload sshd

echo "==> Swap de 2 GB (necessário em máquinas com 1 GB de RAM)"
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo
echo "Pronto. Saia e entre de novo no SSH (para o grupo docker valer) e siga o passo 6 do guia."
