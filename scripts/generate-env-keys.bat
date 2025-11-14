@echo off
REM scripts/generate-env-keys.bat
REM Generate security keys for production environment variables (Windows)

echo.
echo ===========================================================
echo   Generating Security Keys for Vercel Environment Variables
echo ===========================================================
echo.
echo Copy these values to Vercel Dashboard - Settings - Environment Variables
echo.

echo ADMIN_API_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.

echo CRON_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.

echo EXPORT_API_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.

echo SESSION_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
echo.

echo ===========================================================
echo Keys generated successfully!
echo.
echo Next steps:
echo 1. Copy each value above
echo 2. Go to: https://vercel.com/dashboard
echo 3. Select your project - Settings - Environment Variables
echo 4. Add each key with its generated value
echo 5. Set environment to: Production, Preview, Development
echo 6. Redeploy your app
echo ===========================================================
echo.
pause
