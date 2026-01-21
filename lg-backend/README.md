# Looking Glass Backend

Минимальный API backend для Looking Glass с поддержкой SSL.

## Развертывание на локации

1. Клонировать репозиторий
2. Поместить SSL сертификаты в `ssl/`:
    - `STAR.vdc.ru.crt`
    - `STAR.vdc.ru.key`
3. Настроить `.env` (скопировать из `.env.example`)
4. Запустить: `./deploy.sh`

## Структура

- `api.php` - API endpoint
- `LookingGlass.php` - бизнес-логика
- `nginx-ssl.conf` - конфигурация Nginx с SSL
- `ssl/` - SSL сертификаты

## API

`POST /api.php`

{
    "target": "8.8.8.8",
    "method": "ping"
}

### Методы

- ping, ping6
- traceroute, traceroute6
- mtr, mtr6
