<?php
// Serve the built SPA without exposing index.xhtml in the URL
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.xhtml');
