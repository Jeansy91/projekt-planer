# Build the React app and pick the Supabase CLI binary that yarn.lock pins
FROM node:26-alpine AS build
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
# Node 25+ does not bundle Corepack; use the checked-in Yarn release.
RUN node "$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)" install --immutable
COPY . .
RUN node "$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)" build \
    && cp node_modules/@supabase/cli-linux-*-musl/bin/supabase /usr/local/bin/supabase \
    && /usr/local/bin/supabase --version

# Serve with NGINX, run migrations and deploy Edge Functions on startup
FROM nginx:stable-alpine
RUN apk add --no-cache postgresql-client curl
COPY --from=build /usr/local/bin/supabase /usr/local/bin/supabase
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY supabase/migrations /migrations/
COPY supabase/functions /supabase-functions/
COPY --chmod=755 docker/entrypoint.sh /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
