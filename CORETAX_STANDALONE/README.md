
  # User Authentication System

  This is a code bundle for User Authentication System. The original project is available at https://www.figma.com/design/cNd7kf8oTqRp2askK3Zf8K/User-Authentication-System.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  OTP via Email
  -------------
  This project includes a simple OTP email verification integration for in-browser registration flows.
  Ensure the backend `CORETAX/api/otp.php` is reachable from the frontend (e.g., same domain or via proxy). Default endpoints:
  - POST `/CORETAX/api/otp.php?action=send` -- body: { email }
  - POST `/CORETAX/api/otp.php?action=verify` -- body: { email, code }

  For local development where PHP's `mail()` is not configured, the OTP is logged in `CORETAX/data/mail_logs/*`.

  