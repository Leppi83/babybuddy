#!/usr/bin/env bash
# Run inside the container: docker exec babybuddy bash /app/scripts/diagnose_static.sh
set -euo pipefail

echo "=== 1. COMMIT HASH ==="
cat /app/.git_commit 2>/dev/null || echo "No .git_commit file"

echo ""
echo "=== 2. ENTRYPOINT ==="
cat /app/docker/entrypoint.prod.sh

echo ""
echo "=== 3. STATIC ROOT CONTENTS ==="
ls -la /app/static/babybuddy/ant/

echo ""
echo "=== 4. SOURCE STATIC (image layer) ==="
ls -la /app/babybuddy/static/babybuddy/ant/ 2>/dev/null || echo "Source dir not found"

echo ""
echo "=== 5. CHECK CSS FILES FOR KEY MARKERS ==="
echo "--- app.css: header-band-bg ---"
grep -c "header-band-bg" /app/static/babybuddy/ant/app.css || echo "0"
echo "--- app2.css: header-band-bg ---"
grep -c "header-band-bg" /app/static/babybuddy/ant/app2.css || echo "0"
echo "--- app2.css: ant-child-image (object-fit) ---"
grep -o "ant-child-image{[^}]*}" /app/static/babybuddy/ant/app2.css | head -1
echo "--- app2.css: ant-auth-shell width ---"
grep -o "ant-auth-content{[^}]*}" /app/static/babybuddy/ant/app2.css | head -1

echo ""
echo "=== 6. CHECK JS FOR KEY MARKERS ==="
echo "--- app.js: ant-shell-header-band ---"
grep -c "ant-shell-header-band" /app/static/babybuddy/ant/app.js || echo "0"
echo "--- app.js: #2a5f96 (new blue primary) ---"
grep -c "2a5f96" /app/static/babybuddy/ant/app.js || echo "0"
echo "--- app.js: #a78bfa (old purple - should be 0) ---"
grep -c "a78bfa" /app/static/babybuddy/ant/app.js || echo "0"
echo "--- page-dashboard chunk: ant-shell-header-band ---"
grep -c "ant-shell-header-band" /app/static/babybuddy/ant/chunks/page-dashboard-*.js || echo "0"

echo ""
echo "=== 7. WHITENOISE MANIFEST ==="
python -c "
import json, os
manifest_path = '/app/static/staticfiles.json'
if os.path.exists(manifest_path):
    with open(manifest_path) as f:
        m = json.load(f)
    paths = m.get('paths', {})
    for key in ['babybuddy/ant/app.js', 'babybuddy/ant/app.css', 'babybuddy/ant/app2.css']:
        print(f'{key} -> {paths.get(key, \"NOT FOUND\")}')
    print(f'Total entries: {len(paths)}')
else:
    print('No manifest file found')
" 2>&1

echo ""
echo "=== 8. WHAT URL DOES THE TEMPLATE RESOLVE TO? ==="
python -c "
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'babybuddy.settings.base')
import django
django.setup()
from django.templatetags.static import static
print('app.js  ->', static('babybuddy/ant/app.js'))
print('app.css ->', static('babybuddy/ant/app.css'))
print('app2.css ->', static('babybuddy/ant/app2.css'))
" 2>&1

echo ""
echo "=== 9. BUILD_HASH ENV ==="
echo "BUILD_HASH=${BUILD_HASH:-not set}"

echo ""
echo "=== DONE ==="
