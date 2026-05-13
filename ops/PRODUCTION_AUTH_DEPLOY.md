# Production Auth Deploy Guardrails

These settings prevent the two production failures that can make login work in
one place and fail in another: auth-service rotating JWT keys on restart, and
Flyway silently skipping a migration.

## 1. Deploy User

Do not deploy over SSH as `root`. Create a non-root user such as `deploy`, add
only the sudo permissions needed to restart LetisPOS units, and store that user
in the GitHub Actions `VPS_USER` secret.

The CI pipeline now fails early if `VPS_USER=root`.

The deploy user must be able to run these commands with passwordless sudo:

```text
systemctl restart letispos-*
systemctl is-active letispos-*
journalctl -u letispos-*
test -r /etc/letispos/jwt/private.pem
test -r /etc/letispos/jwt/public.pem
```

## 2. Stable JWT Keys

Generate one long-lived RSA keypair on the VPS:

```bash
sudo install -d -m 0750 /etc/letispos/jwt
sudo openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /etc/letispos/jwt/private.pem
sudo openssl rsa -pubout -in /etc/letispos/jwt/private.pem -out /etc/letispos/jwt/public.pem
sudo chmod 0640 /etc/letispos/jwt/private.pem /etc/letispos/jwt/public.pem
```

Configure the auth-service systemd unit or environment file:

```ini
JWT_PRIVATE_KEY_PATH=/etc/letispos/jwt/private.pem
JWT_PUBLIC_KEY_PATH=/etc/letispos/jwt/public.pem
JWT_ALLOW_EPHEMERAL_KEYS=false
FLYWAY_VALIDATE_ON_MIGRATE=true
```

For Docker Compose production deploys, set `JWT_KEYS_DIR` to the directory that
contains `private.pem` and `public.pem`.

## 3. Restart Order

After first configuring stable keys, restart auth-service and gateway:

```bash
sudo systemctl daemon-reload
sudo systemctl restart letispos-auth
sudo systemctl restart letispos-gateway
```

After stable keys are in place, restarting auth-service alone no longer rotates
the signing key, so gateway tokens do not break because of an auth restart.

## 4. Flyway Validation

Production should run with `FLYWAY_VALIDATE_ON_MIGRATE=true`. If a migration was
edited after being applied, the service must fail loudly so the bad migration
history is fixed before new code goes live.
