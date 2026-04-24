#!/bin/bash
set -e

PROJECT_NAME=${1:-farm}
AWS_REGION=${DEFAULT_AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

STATE_BUCKET="${PROJECT_NAME}-terraform-state-${AWS_ACCOUNT_ID}"
LOCK_TABLE="${PROJECT_NAME}-terraform-locks"

echo "Bootstrapping shared infrastructure for project '${PROJECT_NAME}'..."
echo "  account: ${AWS_ACCOUNT_ID}"
echo "  region:  ${AWS_REGION}"
echo ""

# --- State bucket ---
if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  echo "✅ State bucket already exists: $STATE_BUCKET"
else
  echo "Creating state bucket: $STATE_BUCKET"
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$STATE_BUCKET" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi

  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "✅ State bucket created with versioning + encryption + public access blocked"
fi

# --- Lock table ---
if aws dynamodb describe-table --table-name "$LOCK_TABLE" >/dev/null 2>&1; then
  echo "✅ Lock table already exists: $LOCK_TABLE"
else
  echo "Creating lock table: $LOCK_TABLE"
  aws dynamodb create-table \
    --table-name "$LOCK_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$AWS_REGION" \
    >/dev/null

  echo "Waiting for lock table to become active..."
  aws dynamodb wait table-exists --table-name "$LOCK_TABLE" --region "$AWS_REGION"
  echo "✅ Lock table created"
fi

echo ""
echo "Shared bootstrap complete."
echo ""
echo "These resources are now ready for Terraform to use as its state backend:"
echo "  state bucket: $STATE_BUCKET"
echo "  lock table:   $LOCK_TABLE"