#!/usr/bin/env bash
# Renders a template (task definition / policy) by substituting ONLY the listed
# ${VARS}, so literal "$" elsewhere is untouched. Fails if any variable is unset.
#   scripts/render.sh ecs/api-task-definition.json > /tmp/api-td.json
set -euo pipefail
template="$1"
vars='${AWS_ACCOUNT_ID} ${AWS_REGION} ${API_IMAGE} ${WEB_IMAGE} ${APP_URL} ${ALLOWED_EMAIL_DOMAINS} ${SUPABASE_URL} ${S3_BUCKET} ${MAIL_FROM_EMAIL}'
for v in $(grep -oE '\$\{[A-Z_]+\}' "$template" | sort -u | tr -d '${}'); do
  if [[ -z "${!v:-}" ]]; then echo "render.sh: $v is not set (needed by $template)" >&2; exit 1; fi
done
envsubst "$vars" < "$template"
