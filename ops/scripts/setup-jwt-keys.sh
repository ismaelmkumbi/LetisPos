#!/bin/bash
# Generate RSA key pair for JWT signing if none exists.
# Must be run as root or a user with write access to /etc/letispos/jwt.
set -euo pipefail

KEY_DIR="${KEY_DIR:-/etc/letispos/jwt}"
PRIVATE_KEY="$KEY_DIR/private.pem"
PUBLIC_KEY="$KEY_DIR/public.pem"

if [[ -f "$PRIVATE_KEY" && -f "$PUBLIC_KEY" ]]; then
    echo "JWT keys already exist at $KEY_DIR"
    exit 0
fi

echo "Generating RSA-2048 JWT key pair..."
mkdir -p "$KEY_DIR"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
    -out "$PRIVATE_KEY" 2>/dev/null

openssl rsa -pubout -in "$PRIVATE_KEY" -out "$PUBLIC_KEY" 2>/dev/null

chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"

# If a service user is configured, give it read access
if [[ -n "${SERVICE_USER:-}" ]]; then
    chown "$SERVICE_USER:$SERVICE_USER" "$PRIVATE_KEY" "$PUBLIC_KEY"
fi

echo "Keys generated:"
echo "  private: $PRIVATE_KEY"
echo "  public:  $PUBLIC_KEY"
echo ""
echo "Ensure these env vars are set in the auth service unit:"
echo "  JWT_PRIVATE_KEY_PATH=$PRIVATE_KEY"
echo "  JWT_PUBLIC_KEY_PATH=$PUBLIC_KEY"
echo "  JWT_ALLOW_EPHEMERAL_KEYS=false"
