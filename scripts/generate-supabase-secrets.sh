#!/bin/sh
#
# Writes fresh secrets and API keys for docker-compose.self-hosted.yml into .env.
#
# Usage: sh scripts/generate-supabase-secrets.sh
#
# Requires openssl (on Windows: run it in Git Bash).
# The JWT signing follows utils/generate-keys.sh of the official Supabase
# Docker setup (Apache-2.0), which is derived from Inder Singh's setup.sh
# (Apache-2.0): https://github.com/singh-inder/supabase-automated-self-host

set -e

env_file=".env"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required but not found." >&2
  exit 1
fi

if [ ! -f "$env_file" ]; then
  echo "Error: $env_file not found. Run: cp .env.self-hosted.example .env" >&2
  exit 1
fi

if grep -q '^POSTGRES_PASSWORD=' "$env_file" && ! grep -q '^POSTGRES_PASSWORD=change-me$' "$env_file"; then
  echo "Error: $env_file already contains secrets. Changing them breaks an existing database." >&2
  echo "Remove the secret lines first if you really want new ones." >&2
  exit 1
fi

base64_url_encode() {
  openssl enc -base64 -A | tr '+/' '-_' | tr -d '='
}

sign_jwt() {
  header_b64=$(printf %s '{"alg":"HS256","typ":"JWT"}' | base64_url_encode)
  payload_b64=$(printf %s "$1" | base64_url_encode)
  signature=$(printf %s "$header_b64.$payload_b64" | openssl dgst -binary -sha256 -hmac "$jwt_secret" | base64_url_encode)
  printf '%s' "$header_b64.$payload_b64.$signature"
}

jwt_secret=$(openssl rand -base64 30)
iat=$(date +%s)
exp=$((iat + 5 * 365 * 24 * 3600))

anon_key=$(sign_jwt "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")
service_role_key=$(sign_jwt "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")

sed -i.bak \
  -e "s|^POSTGRES_PASSWORD=.*$|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" \
  -e "s|^JWT_SECRET=.*$|JWT_SECRET=${jwt_secret}|" \
  -e "s|^ANON_KEY=.*$|ANON_KEY=${anon_key}|" \
  -e "s|^SERVICE_ROLE_KEY=.*$|SERVICE_ROLE_KEY=${service_role_key}|" \
  -e "s|^SECRET_KEY_BASE=.*$|SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -d '\n')|" \
  -e "s|^REALTIME_DB_ENC_KEY=.*$|REALTIME_DB_ENC_KEY=$(openssl rand -hex 8)|" \
  "$env_file"
rm -f "$env_file.bak"

echo "Secrets written to $env_file. The keys are valid for five years."
