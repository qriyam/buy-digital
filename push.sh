#!/usr/bin/env bash
# Run once from the project folder:  bash push.sh
set -e
[ -d .git ] || git init -b main
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/qriyam/buy-digital.git
git add -A
git commit -m "Add BuyDigital storefront and organise backend functions" || true
git pull --rebase origin main || true
git push -u origin main
