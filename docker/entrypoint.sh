#!/bin/sh
set -e

# Generate runtime env config for the frontend
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV = {
  SUPABASE_PROJECT_URL: "${SUPABASE_PROJECT_URL:-}",
  SUPABASE_PUBLISHABLE_KEY: "${SUPABASE_PUBLISHABLE_KEY:-}"
};
EOF
echo "[entrypoint] Generated /env-config.js"

# Run pending Supabase migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running database migrations..."

  # Create tracking table
  psql "$DATABASE_URL" -c \
    "CREATE TABLE IF NOT EXISTS public._migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now());" \
    2>/dev/null

  # Apply each migration in order if not yet applied
  for f in /migrations/*.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    applied=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM public._migrations WHERE name = '$name'" 2>/dev/null)
    if [ "$applied" != "1" ]; then
      echo "[entrypoint] Applying: $name"
      psql "$DATABASE_URL" -f "$f"
      psql "$DATABASE_URL" -c "INSERT INTO public._migrations (name) VALUES ('$name');"
    else
      echo "[entrypoint] Already applied: $name"
    fi
  done

  echo "[entrypoint] Migrations complete."
else
  echo "[entrypoint] No DATABASE_URL set, skipping migrations."
fi

# Update Supabase site_url if PROJEKT_PLANER_URL is set
if [ -n "$PROJEKT_PLANER_URL" ] && [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_PROJECT_REF" ]; then
  echo "[entrypoint] Setting Supabase site_url to $PROJEKT_PLANER_URL..."
  curl -s -X PATCH \
    "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"site_url\": \"$PROJEKT_PLANER_URL\"}" \
    > /dev/null 2>&1 \
    && echo "[entrypoint] site_url updated." \
    || echo "[entrypoint] Warning: Failed to update site_url"
fi

# Self-hosted Supabase: copy the Edge Functions into the folder the
# edge-runtime container serves (see docker-compose.self-hosted.yml)
if [ -n "$FUNCTIONS_DIR" ]; then
  if [ -d "$FUNCTIONS_DIR" ]; then
    echo "[entrypoint] Copying Edge Functions to $FUNCTIONS_DIR..."
    cp -r /supabase-functions/. "$FUNCTIONS_DIR"/
  else
    echo "[entrypoint] Warning: FUNCTIONS_DIR $FUNCTIONS_DIR does not exist"
  fi
fi

# Deploy Edge Functions if Supabase credentials are set
if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_PROJECT_REF" ]; then
  echo "[entrypoint] Deploying Edge Functions..."
  # Set up temporary project structure for supabase CLI
  mkdir -p /tmp/supabase-deploy/supabase
  cp -r /supabase-functions /tmp/supabase-deploy/supabase/functions
  cd /tmp/supabase-deploy
  supabase init 2>/dev/null || true

  # Push SMTP secrets to Edge Functions if provided
  secrets_args=""
  [ -n "$SMTP_HOSTNAME" ] && secrets_args="$secrets_args SMTP_HOSTNAME=$SMTP_HOSTNAME"
  [ -n "$SMTP_PORT" ] && secrets_args="$secrets_args SMTP_PORT=$SMTP_PORT"
  [ -n "$SMTP_USERNAME" ] && secrets_args="$secrets_args SMTP_USERNAME=$SMTP_USERNAME"
  [ -n "$SMTP_PASSWORD" ] && secrets_args="$secrets_args SMTP_PASSWORD=$SMTP_PASSWORD"
  [ -n "$SMTP_FROM" ] && secrets_args="$secrets_args SMTP_FROM=$SMTP_FROM"
  [ -n "$PROJEKT_PLANER_URL" ] && secrets_args="$secrets_args PROJEKT_PLANER_URL=$PROJEKT_PLANER_URL"
  if [ -n "$secrets_args" ]; then
    echo "[entrypoint] Setting Edge Function secrets..."
    supabase secrets set $secrets_args --project-ref "$SUPABASE_PROJECT_REF" 2>&1 || echo "[entrypoint] Warning: Failed to set secrets"
  fi

  for dir in /supabase-functions/*/; do
    [ -d "$dir" ] || continue
    fn_name=$(basename "$dir")
    [ "$fn_name" = "_shared" ] && continue
    echo "[entrypoint] Deploying function: $fn_name"
    supabase functions deploy "$fn_name" \
      --no-verify-jwt \
      --project-ref "$SUPABASE_PROJECT_REF" \
      2>&1 || echo "[entrypoint] Warning: Failed to deploy $fn_name"
  done
  cd /
  echo "[entrypoint] Edge Functions deployment complete."
else
  echo "[entrypoint] No SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF set, skipping Edge Functions."
fi

exec nginx -g "daemon off;"
