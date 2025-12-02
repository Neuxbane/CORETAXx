#!/usr/bin/env bash
chown -R www-data:www-data ./data
find ./data -type d -exec chmod 2775 {} +; find ./data -type f -exec chmod 0664 {} +