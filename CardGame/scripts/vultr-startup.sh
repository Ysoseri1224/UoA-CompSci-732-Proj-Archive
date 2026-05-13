#!/bin/bash
set -e

# -- SSH ---------------------
mkdir -p /root/.ssh /home/ubuntu/.ssh
chmod 700 /root/.ssh /home/ubuntu/.ssh

echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD0WHrpnEt51KDPf4YDBaowP5USRdrk5Xmm3a63VZ24a87Tjh4FPXMO253eqaJiY0vR6CwuGbB1LhBoh4Yb7zd96Wc4+jNWHhJBrajGZNVxJpyWqDkkDO+p0mKMHboXTluDgJ0sGDWFeNm8QFepFZrZ4tn591j3HdJ+3Z5GUZdNcaBBHyQ00B7OH7kmmAf3y+2tNGvI+SRJWERry3f+0YkYHgx3ze75Me15rlD8o838uUagREjsGGMzOT8rAM+DS+y7m0I5bTqKbQJAKGpYV16CKau2ELQZtKAJPKMd2jsWdQij1UuvNyJOf34Oek3oBmJjvjMXSjk69KPQk+AZ1x3NoUzIIZwOuK9Mu6pVjlFr/U5MIEB3klVl3JPHnrKghkBbonaegRY9dSg0mloSB/cevEzxM72ZHhVGkFttQ41BgeELQ/RwFzmODjAEZ43rmZa1PbL26Ho/LNo7EEtxUYE+O9mZd7fe+Ef1nk0ups1o4HWewnB00bfNTJe6tMG93Bc= d3p4@oasis" > /root/.ssh/authorized_keys
cp /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys
chown -R ubuntu:ubuntu /home/ubuntu/.ssh

# -- System ------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y docker.io docker-compose-v2 git curl ufw

systemctl enable docker --now
usermod -aG docker ubuntu

# -- Firewall ----------------
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 5173/tcp
ufw --force enable

# -- Clone repo + Start ------
git clone -b main https://github.com/UOA-CS732-S1-2026/group-project-works-on-my-machine.git /opt/cardgame
cd /opt/cardgame/CardGame
echo "MONGO_URI=mongodb://mongo:27017/balatro_db" > .env
echo "REDIS_URL=redis://redis:6379" >> .env
echo "JWT_SECRET=vultr_$(openssl rand -hex 32)" >> .env
echo "JWT_REFRESH_SECRET=vultr_refresh_$(openssl rand -hex 32)" >> .env
echo "JWT_EXPIRES_IN=15m" >> .env
echo "CLIENT_ORIGIN=http://localhost:5173" >> .env
docker compose up -d

echo "=== DONE ==="
echo "Frontend: http://$(curl -s ifconfig.me):5173"
echo "Backend:  http://$(curl -s ifconfig.me):3000"
echo "SSH:      ssh ubuntu@$(curl -s ifconfig.me)"
