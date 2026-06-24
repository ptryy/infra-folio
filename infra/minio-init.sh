#!/usr/bin/env bash
set -euo pipefail

MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET="infra-folio-media"

echo "Waiting for MinIO at ${MINIO_ENDPOINT}..."
until curl -sf "${MINIO_ENDPOINT}/minio/health/live" > /dev/null 2>&1; do
  sleep 2
done
echo "MinIO is ready."

mc alias set "${MINIO_ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_USER}" "${MINIO_PASS}" --quiet

if ! mc ls "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1; then
  mc mb "${MINIO_ALIAS}/${BUCKET}"
  echo "Created bucket: ${BUCKET}"
else
  echo "Bucket already exists: ${BUCKET}"
fi

mc anonymous set download "${MINIO_ALIAS}/${BUCKET}"
echo "Set anonymous download policy on: ${BUCKET}"
