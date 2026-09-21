#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Установите Node.js версии 22.13 или новее в WSL/Ubuntu, затем повторите запуск.'
  exit 1
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<13)){console.error("Нужен Node.js 22.13 или новее");process.exit(1)}'
if [ ! -d node_modules ]; then
  npx --yes pnpm@11.25.0 install --frozen-lockfile
fi
echo 'Откройте http://localhost:5173 после запуска. Остановка: Ctrl+C.'
npm run dev
