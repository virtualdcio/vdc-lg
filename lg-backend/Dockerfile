FROM php:8.4-fpm-alpine

# Устанавливаем сетевые утилиты
RUN apk add --no-cache \
    iputils \
    iputils-ping \
    mtr \
    traceroute \
    iproute2 \
    && rm -rf /var/cache/apk/*

# Оптимизация PHP
RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && echo "memory_limit = 256M" >> "$PHP_INI_DIR/php.ini" \
    && echo "max_execution_time = 300" >> "$PHP_INI_DIR/php.ini" \
    && echo "max_input_time = 300" >> "$PHP_INI_DIR/php.ini"

# Создаем пользователя для безопасности
RUN adduser -D -g '' -u 1000 lguser

# Рабочая директория
WORKDIR /var/www/html

# Копируем PHP файлы
COPY --chown=lguser:lguser api.php LookingGlass.php config.dist.php ./

USER lguser

EXPOSE 9000

CMD ["php-fpm"]