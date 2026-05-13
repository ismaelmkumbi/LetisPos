# Non-Root Deploy User Setup

This creates a scoped `deploy` user that can restart LetisPOS services and deploy
code without full root access.

## 1. Create the user

```bash
useradd -m -s /bin/bash deploy
```

## 2. Passwordless sudo (scoped)

Only allows the commands the CI/CD pipeline actually needs:

```bash
cat > /etc/sudoers.d/deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /bin/systemctl restart letispos-*
deploy ALL=(root) NOPASSWD: /bin/systemctl stop letispos-*
deploy ALL=(root) NOPASSWD: /bin/systemctl start letispos-*
deploy ALL=(root) NOPASSWD: /bin/systemctl status letispos-*
deploy ALL=(root) NOPASSWD: /bin/systemctl is-active letispos-*
deploy ALL=(root) NOPASSWD: /bin/journalctl -u letispos-*
deploy ALL=(root) NOPASSWD: /bin/mkdir -p /etc/letispos/jwt
deploy ALL=(root) NOPASSWD: /bin/chown -R deploy:deploy /var/www/LetisPos
deploy ALL=(root) NOPASSWD: /bin/chmod -R u+w /var/www/LetisPos
EOF
chmod 440 /etc/sudoers.d/deploy
```

## 3. SSH key

```bash
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Add the GitHub Actions deploy key (or your admin key)
echo "ssh-ed25519 AAA...your-public-key..." > /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

## 4. JWT key directory

```bash
mkdir -p /etc/letispos/jwt
chown deploy:deploy /etc/letispos/jwt
chmod 700 /etc/letispos/jwt

# Generate keys (as deploy user)
sudo -u deploy bash /var/www/LetisPos/ops/scripts/setup-jwt-keys.sh
```

## 5. Install systemd drop-in

```bash
mkdir -p /etc/systemd/system/letispos-auth.service.d
cp /var/www/LetisPos/ops/systemd/letispos-auth.service.d/env.conf \
   /etc/systemd/system/letispos-auth.service.d/env.conf
systemctl daemon-reload
```

## 6. Verify

```bash
# As deploy user, verify you can restart services
sudo systemctl status letispos-auth
sudo systemctl restart letispos-auth

# Verify JWT keys are readable by the auth service
sudo -u deploy test -r /etc/letispos/jwt/private.pem && echo "OK"
```
