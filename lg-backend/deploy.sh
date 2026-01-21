#!/bin/bash
set -e

echo "🚀 Deploying Looking Glass Backend with SSL..."

# Проверяем .env
if [ ! -f ".env" ]; then
    echo "⚠️  Copying .env.example to .env"
    cp .env.example .env
    echo "✏️  Please edit .env file and set your configuration"
    exit 1
fi

source .env

# Проверяем SSL сертификаты
echo "🔐 Checking SSL certificates..."
if [ ! -f "ssl/STAR.vdc.ru.crt" ] || [ ! -f "ssl/STAR.vdc.ru.key" ]; then
    echo "❌ SSL certificates not found!"
    echo "Please place your SSL certificates in ssl/ directory:"
    echo "  ssl/STAR.vdc.ru.crt"
    echo "  ssl/STAR.vdc.ru.key"
    exit 1
fi

# Права доступа к ключу
KEY_PERMISSIONS=$(stat -c "%a" ssl/STAR.vdc.ru.key 2>/dev/null || echo "000")
if [ "$KEY_PERMISSIONS" != "600" ] && [ "$KEY_PERMISSIONS" != "400" ]; then
    echo "⚠️  Fixing SSL key permissions (current: $KEY_PERMISSIONS)"
    chmod 600 ssl/STAR.vdc.ru.key
fi

# Создаем config.php с ПРАВИЛЬНЫМ JSON
echo "📝 Generating config.php..."
cat > config.php << EOF
<?php
// Auto-generated config
define('LG_LOCATION', '${LOCATION:-RU}');
define('LG_IPV4', '${IPV4:-127.0.0.1}');
define('LG_IPV6', '${IPV6:-::1}');

// ПРАВИЛЬНЫЙ JSON формат
\$methodsJson = '${METHODS:-["ping","traceroute","mtr"]}';
\$methods = json_decode(\$methodsJson, true);
define('LG_METHODS', is_array(\$methods) ? \$methods : ['ping','traceroute','mtr']);

define('LG_ALLOWED_ORIGIN', '${ALLOWED_ORIGIN:-https://vdc.ru}');
EOF

echo "✅ Config generated with proper JSON format"

mkdir -p acme-challenge

# Запускаем Docker
echo "🐳 Starting Docker containers..."
docker-compose down
docker-compose up -d --build

sleep 5

# Проверка SSL
if command -v openssl &> /dev/null; then
    echo "📄 SSL Certificate Info:"
    openssl x509 -in ssl/STAR.vdc.ru.crt -text -noout | grep -E "Subject:|Not Before|Not After|DNS:" | head -4
fi

echo "✅ Deployment complete!"
echo ""
echo "🔒 HTTPS endpoints:"
echo "   API: https://lg-${LOCATION:-ru}.vdc.ru/api.php"
echo "   Health: https://lg-${LOCATION:-ru}.vdc.ru/health"
echo ""
echo "📊 Quick test:"
echo "   curl -X POST https://lg-${LOCATION:-ru}.vdc.ru/api.php \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"target\":\"8.8.8.8\",\"method\":\"ping\"}'"