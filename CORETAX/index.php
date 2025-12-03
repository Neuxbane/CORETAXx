<?php

// Security headers (since .htaccess doesn't work with Nginx)
header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Permissions-Policy: allow geolocation for self (works for localhost and production)
header('Permissions-Policy: geolocation=(self), camera=(self), microphone=(self)');

// Serve the XHTML app
readfile(__DIR__ . '/index.xhtml');
