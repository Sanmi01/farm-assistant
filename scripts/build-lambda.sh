#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
BUILD_DIR="$BACKEND_DIR/.lambda-build"
OUTPUT_ZIP="$BACKEND_DIR/lambda-deployment.zip"

echo "==> Cleaning previous build..."
rm -rf "$BUILD_DIR"
rm -f "$OUTPUT_ZIP"
mkdir -p "$BUILD_DIR"

echo "==> Installing dependencies in Lambda-compatible container..."
echo "    (this takes 2-5 minutes on first run; pip output follows)"
echo

MSYS_NO_PATHCONV=1 docker run --rm \
    --entrypoint /bin/bash \
    -v "$BACKEND_DIR:/var/task" \
    -w /var/task \
    public.ecr.aws/lambda/python:3.12 \
    -c "pip install -r requirements.txt --target /var/task/.lambda-build --no-cache-dir --progress-bar off -v" 2>&1

echo
echo "==> Copying application code..."
cp -r "$BACKEND_DIR/app" "$BUILD_DIR/app"
cp "$BACKEND_DIR/lambda_handler.py" "$BUILD_DIR/lambda_handler.py"

echo "==> Creating deployment zip..."
cd "$BUILD_DIR"

python -c "
import os
import zipfile

out = '../lambda-deployment.zip'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d != '__pycache__']
        for f in files:
            full = os.path.join(root, f)
            arcname = os.path.relpath(full, '.')
            zf.write(full, arcname)
print(f'Wrote {out}')
"

cd "$PROJECT_ROOT"

echo "==> Cleaning build directory..."
rm -rf "$BUILD_DIR"

ls -lh "$OUTPUT_ZIP"
echo "==> Done."