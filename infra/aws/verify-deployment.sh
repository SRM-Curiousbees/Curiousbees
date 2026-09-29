#!/usr/bin/env bash
# Post-deploy verification against the real AWS environment. Read-only.
#   APP_URL=https://srmcuriousbees.in S3_BUCKET=<bucket> AWS_PROFILE=curiousbees ./infra/aws/verify-deployment.sh
set -uo pipefail
: "${APP_URL:?APP_URL is required}" "${S3_BUCKET:?S3_BUCKET is required}"
REGION="${AWS_REGION:-ap-south-1}"
fail=0
check() { # name expected actual
  if [[ "$3" == "$2" ]]; then echo "PASS  $1 ($3)"; else echo "FAIL  $1: expected $2, got $3"; fail=1; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "== Edge / application =="
check "GET /api/health/live"         200 "$(code "$APP_URL/api/health/live")"
check "GET /api/health (database)"   200 "$(code "$APP_URL/api/health")"
check "GET /healthz (web)"           200 "$(code "$APP_URL/healthz")"
check "GET / (landing)"              200 "$(code "$APP_URL/")"
check "GET /api/docs disabled"       404 "$(code "$APP_URL/api/docs")"
check "GET /api/system requires auth" 401 "$(code "$APP_URL/api/system")"
check "HTTP redirects to HTTPS"      301 "$(code "${APP_URL/https:/http:}/")"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$APP_URL/feed")
check "Unauthenticated /feed -> canonical login" "$APP_URL/login?redirectTo=%2Ffeed" "$loc"
acao=$(curl -s -D - -o /dev/null -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: GET" "$APP_URL/api/auth/me" | grep -ci '^access-control-allow-origin' || true)
check "CORS refuses foreign origins" 0 "$acao"

echo "== S3 bucket =="
pab=$(aws s3api get-public-access-block --bucket "$S3_BUCKET" --query 'PublicAccessBlockConfiguration.[BlockPublicAcls,IgnorePublicAcls,BlockPublicPolicy,RestrictPublicBuckets]' --output text 2>/dev/null | tr -s '\t ' ' ')
check "Block Public Access (all four)" "True True True True" "$pab"
enc=$(aws s3api get-bucket-encryption --bucket "$S3_BUCKET" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null)
check "Default encryption" "AES256" "$enc"
own=$(aws s3api get-bucket-ownership-controls --bucket "$S3_BUCKET" --query 'OwnershipControls.Rules[0].ObjectOwnership' --output text 2>/dev/null)
check "ACLs disabled (BucketOwnerEnforced)" "BucketOwnerEnforced" "$own"
check "Anonymous object read denied" 403 "$(code "https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/workspaces/probe.pdf")"
check "Anonymous bucket listing denied" 403 "$(code "https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/")"

echo "== Database exposure =="
pub=$(aws rds describe-db-instances --db-instance-identifier curiousbees-prod --query 'DBInstances[0].[PubliclyAccessible,StorageEncrypted,DeletionProtection]' --output text 2>/dev/null | tr -s '\t ' ' ')
check "RDS private, encrypted, deletion-protected" "False True True" "$pub"

exit $fail
