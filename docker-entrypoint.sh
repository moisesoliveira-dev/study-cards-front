#!/bin/sh
set -e

PORT="${PORT:-80}"
API_URL="${API_URL:-${VITE_API_URL:-/api}}"

# Remove trailing slash for consistency
API_URL="${API_URL%/}"

export PORT
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  API_URL: "${API_URL}",
};
EOF

exec nginx -g 'daemon off;'
