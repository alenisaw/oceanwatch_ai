#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run this script with sudo: sudo bash setup_server.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "[1/5] Updating Ubuntu packages..."
apt-get update
apt-get upgrade -y

echo "[2/5] Installing Docker Engine and Docker Compose plugin..."
apt-get install -y ca-certificates curl gnupg lsb-release ufw openssh-server
install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi
chmod a+r /etc/apt/keyrings/docker.gpg
. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod -aG docker "${SUDO_USER}"
fi

echo "[3/5] Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[4/5] Hardening SSH..."
install -m 0755 -d /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/99-oceanwatch-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
EOF

sshd -t
systemctl restart ssh || systemctl restart sshd

echo "[5/5] Done."
echo "Important: password SSH login is now disabled. Keep an active SSH session open"
echo "until you confirm that key-based login works."
echo "If your user was added to the docker group, log out and back in before running docker without sudo."
