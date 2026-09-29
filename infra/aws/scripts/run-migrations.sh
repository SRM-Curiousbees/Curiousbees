#!/usr/bin/env bash
# Runs `prisma migrate deploy` + the production seed as a one-off Fargate task
# using the given API task definition, waits for it, prints its logs and exits
# non-zero if it failed. Never runs destructive commands (no reset / db push).
#
# Required env: ECS_CLUSTER, TASK_DEFINITION_ARN, ECS_SUBNETS (comma list), ECS_API_SECURITY_GROUP, AWS_REGION
# Optional env: BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME (only used on an empty user directory)
set -euo pipefail
: "${ECS_CLUSTER:?}" "${TASK_DEFINITION_ARN:?}" "${ECS_SUBNETS:?}" "${ECS_API_SECURITY_GROUP:?}" "${AWS_REGION:?}"

subnets=$(printf '"%s",' ${ECS_SUBNETS//,/ }); subnets="[${subnets%,}]"
overrides=$(cat <<JSON
{"containerOverrides":[{"name":"api",
  "command":["sh","-c","node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/scripts/seed-production.js"],
  "environment":[{"name":"BOOTSTRAP_ADMIN_EMAIL","value":"${BOOTSTRAP_ADMIN_EMAIL:-}"},{"name":"BOOTSTRAP_ADMIN_NAME","value":"${BOOTSTRAP_ADMIN_NAME:-}"}]}]}
JSON
)

task_arn=$(aws ecs run-task --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --launch-type FARGATE \
  --task-definition "$TASK_DEFINITION_ARN" --started-by "github-actions-migrate" \
  --network-configuration "awsvpcConfiguration={subnets=$subnets,securityGroups=[\"$ECS_API_SECURITY_GROUP\"],assignPublicIp=ENABLED}" \
  --overrides "$overrides" --query 'tasks[0].taskArn' --output text)
echo "Migration task: $task_arn"

aws ecs wait tasks-stopped --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --tasks "$task_arn"

task_id="${task_arn##*/}"
aws logs get-log-events --region "$AWS_REGION" --log-group-name /ecs/curiousbees-api \
  --log-stream-name "api/api/$task_id" --query 'events[].message' --output text 2>/dev/null | tr '\t' '\n' || true

exit_code=$(aws ecs describe-tasks --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --tasks "$task_arn" \
  --query 'tasks[0].containers[0].exitCode' --output text)
reason=$(aws ecs describe-tasks --region "$AWS_REGION" --cluster "$ECS_CLUSTER" --tasks "$task_arn" \
  --query 'tasks[0].stoppedReason' --output text)
echo "Migration exit code: $exit_code ($reason)"
[[ "$exit_code" == "0" ]]
