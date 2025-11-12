#!/bin/bash
# Quick script to add all environment variables to Vercel
# Run: bash scripts/quick-vercel-env.sh

echo "Adding environment variables to Vercel production..."

# Read from .env.local and add each variable
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ ! "$key" =~ ^#.*$ ]] && [[ -n "$key" ]]; then
    echo "Adding $key..."
    echo "$value" | vercel env add "$key" production 2>/dev/null || echo "  (already exists or error)"
  fi
done < .env.local

echo "Done! Now redeploy with: vercel --prod"