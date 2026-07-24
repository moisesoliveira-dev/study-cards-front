#!/bin/sh
set -e

PORT="${PORT:-80}"
API_URL="${API_URL:-${VITE_API_URL:-/api}}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM:-http://backend:3000}"

# Remove trailing slash for consistency
API_URL="${API_URL%/}"
BACKEND_UPSTREAM="${BACKEND_UPSTREAM%/}"

export PORT BACKEND_UPSTREAM
envsubst '${PORT} ${BACKEND_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  API_URL: "${API_URL}",
};
EOF

exec nginx -g 'daemon off;'
