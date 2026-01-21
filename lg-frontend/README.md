# VDC Looking Glass Widget

Минималистичный виджет для встраивания Looking Glass на ваш сайт.

## Структура файлов
lg-frontend/
├── lg-widget.js # Основной JavaScript файл
├── lg-widget.css # Стили виджета
├── lg-widget.html # Пример интеграции
└── README.md # Эта документация


## Быстрый старт

### 1. Подключение на сайт

<!-- Подключение стилей -->
<link rel="stylesheet" href="path/to/lg-widget.css">

<!-- Контейнер для виджета -->
<div id="lg-container"></div>

<!-- Подключение скрипта -->
<script src="path/to/lg-widget.js"></script>

<!-- Инициализация -->
<script>
    const widget = new LookingGlassWidget({
        container: '#lg-container',
        locations: {
            'RU': {
                name: 'Москва',
                apiUrl: 'https://lg-ru.vdc.ru/api.php',
                ipv4: '95.167.235.235',
                ipv6: '2a02:17d0:1b1::235'
            },
            'LV': {
                name: 'Рига',
                apiUrl: 'https://lg-lv.vdc.ru/api.php',
                ipv4: '87.246.148.227',
                ipv6: '2a02:17d0:1b2::227'
            }
        },
        defaultLocation: 'RU'
    });
</script>

### Конфигурация

const config = {
// Контейнер для виджета (CSS селектор или DOM элемент)
container: '#lg-widget',

    // Локации с их API endpoints
    locations: {
        'LOCATION_CODE': {
            name: 'Название локации',
            apiUrl: 'https://api-endpoint.url',
            ipv4: 'IPv4 адрес',
            ipv6: 'IPv6 адрес' // опционально
        }
    },
    
    // Локация по умолчанию
    defaultLocation: 'LOCATION_CODE',
    
    // Тема (light/dark)
    theme: 'light',
    
    // Автоопределение IP пользователя
    autoDetectIP: true
};

### API виджета - Публичные методы

// Переключение локации
widget.setLocation('RU');

// Установка цели для диагностики
widget.setTarget('8.8.8.8');

// Установка метода диагностики
widget.setMethod('ping');

// Получение текущей локации
const location = widget.getCurrentLocation();

// Очистка результатов
widget.clearResults();

// Отмена выполнения команды
widget.cancelExecution();

### Кастомизация стилей

/* Пример кастомизации */
.custom-lg-widget .lg-widget {
border: 2px solid #3498db;
border-radius: 12px;
}

.custom-lg-widget .lg-execute-btn {
background: #e74c3c;
}

.custom-lg-widget .lg-location-tab.active {
background: #2ecc71;
}

### Поддерживаемые методы диагностики

- ping - Ping (IPv4)
- ping6 - Ping (IPv6)
- traceroute - Traceroute (IPv4)
- traceroute6 - Traceroute (IPv6)
- mtr - MTR (IPv4)
- mtr6 - MTR (IPv6)

### Требования

Современный браузер с поддержкой:
- ES6+ (async/await, classes)
- Fetch API
- Clipboard API
- CSS Grid/Flexbox

### Браузерная поддержка

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Лицензия

MIT

## **Краткая инструкция по тестированию:**

### Шаг 1: Развернуть backend (одну локацию для теста)

# На тестовом сервере:
git clone <ваш-backend-репозиторий>
cd lg-backend
# Скопировать SSL сертификаты в ssl/
cp .env.example .env
# Отредактировать .env (указать тестовые данные)
./deploy.sh

### Шаг 2: Проверить API

curl -X POST https://test-lg.vdc.ru/api.php \
-H "Content-Type: application/json" \
-d '{"target":"8.8.8.8","method":"ping"}'

### Шаг 3: Протестировать виджет локально

1 - Скачать фронтенд файлы
2 - Открыть lg-widget.html в браузере
3 - В lg-widget.js обновить apiUrl на ваш тестовый endpoint
4 - Протестировать функционал

### Шаг 4: Интегрировать на тестовый сайт

1 - Скопировать lg-widget.js и lg-widget.css на сайт
2 - Добавить HTML-контейнер
3 - Инициализировать виджет с правильными настройками


