#!/bin/bash

DOMAIN=${1:-lg-ru.vdc.ru}
PORT=${2:-443}

echo "🔍 SSL check for $DOMAIN:$PORT"

echo "1. Certificate chain..."
openssl s_client -connect $DOMAIN:$PORT -servername $DOMAIN -showcerts 2>/dev/null | openssl x509 -text -noout | grep -E "Subject:|Issuer:|Not Before|Not After"

echo -e "\n2. Supported protocols:"
for proto in ssl2 ssl3 tls1 tls1_1 tls1_2 tls1_3; do
    if echo | openssl s_client -connect $DOMAIN:$PORT -$proto 2>/dev/null | grep -q "CONNECTED"; then
        echo "  ✅ $proto supported"
    else
        echo "  ❌ $proto not supported"
    fi
done

echo -e "\n✅ Check completed"