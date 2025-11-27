#!/usr/bin/env bash
# Simple tests for OTP endpoints (adjust host/path to your server)
HOST="http://localhost"
BASE="${HOST}/CORETAX/api/otp.php"

EMAIL="test+otp@localhost"

echo "Sending OTP to ${EMAIL}..."
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"'${EMAIL}'"}' "${BASE}?action=send" | jq -r '.'

echo "Wait a second for OTP to be logged in data/mail_logs or to be delivered by mail";
sleep 1

echo "Attempting to verify with '000000' (should fail)"
curl -s -X POST -H 'Content-Type: application/json' -d '{"email":"'${EMAIL}'","code":"000000"}' "${BASE}?action=verify" | jq -r '.'

echo "You can find the real OTP in CORETAX/data/mail_logs/* or check mail delivery"

exit 0
