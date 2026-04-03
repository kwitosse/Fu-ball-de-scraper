#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "Building frontend..."
cd frontend
npm run build
cd ..

echo ""
echo "=== Build artifact sizes ==="
du -sh frontend/dist/
du -sh frontend/dist/assets/ 2>/dev/null || true

echo ""
echo "=== Largest JS chunks ==="
find frontend/dist/assets -name "*.js" -exec du -h {} \; 2>/dev/null | sort -rh | head -5

echo ""
TOTAL_KB=$(du -sk frontend/dist/ | cut -f1)
LIMIT_KB=2048
if [ "$TOTAL_KB" -gt "$LIMIT_KB" ]; then
  echo "WARNING: Build size ${TOTAL_KB}KB exceeds ${LIMIT_KB}KB budget"
  exit 1
else
  echo "Build size ${TOTAL_KB}KB is within ${LIMIT_KB}KB budget ✓"
fi
