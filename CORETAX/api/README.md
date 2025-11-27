OTP & Email endpoints for CORETAX API

Files:
- `otp.php` — POST endpoints: `?action=send` to send an OTP, and `?action=verify` to verify an OTP. Stores OTP data in `../data/otp/*.json` and logs mail attempts in `../data/mail_logs`.
- `email_utils.php` — helper for sending emails via `mail()`; logs to `data/mail_logs` if mail isn't configured.

Usage:
- Send OTP:
  curl -X POST -H 'Content-Type: application/json' \ 
    -d '{"email":"user@example.com"}' \
    'http://your-server/CORETAX/api/otp.php?action=send'

- Verify OTP:
  curl -X POST -H 'Content-Type: application/json' \ 
    -d '{"email":"user@example.com","code":"123456"}' \
    'http://your-server/CORETAX/api/otp.php?action=verify'

Configuration:
- Optionally configure `CORETAX_MAIL_FROM` environment variable to set the From header when sending mail.
- `CORETAX_OTP_EXPIRES` can be set to change the OTP expiration (seconds). Default is 600 (10m).

Note:
- For development, `mail()` may not be configured. Check `CORETAX/data/mail_logs` for messages, which will include the OTP code.
- Keep in mind that the standalone frontend uses localStorage users and not a server DB; the OTP flow marks accounts as active on the client by toggling `isActive` after successful verification.
