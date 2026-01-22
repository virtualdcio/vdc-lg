<?php
/**
 * API для Looking Glass Widget
 * Обработчик запросов на выполнение диагностических команд
 */

// Включаем CORS заголовки
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');

// Обработка предварительного OPTIONS запроса
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверяем метод запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Ошибка: Метод не поддерживается. Используйте POST";
    exit;
}

// Подключаем LookingGlass
require_once __DIR__ . '/LookingGlass.php';

// Устанавливаем заголовки для предотвращения кеширования
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Включаем буферизацию вывода для потоковой передачи
ob_implicit_flush(true);
ob_start();

// Устанавливаем максимальное время выполнения
set_time_limit(120);

// Парсим входные данные
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Проверяем наличие обязательных параметров
if (!isset($data['target']) || !isset($data['method'])) {
    http_response_code(400);
    echo "Ошибка: Не указаны обязательные параметры (target, method)";
    exit;
}

$target = trim($data['target']);
$method = trim($data['method']);

// Валидация цели
if (empty($target)) {
    http_response_code(400);
    echo "Ошибка: Не указана цель для диагностики";
    exit;
}

// Валидация метода
$allowedMethods = ['ping', 'ping6', 'traceroute', 'traceroute6', 'mtr', 'mtr6'];
if (!in_array($method, $allowedMethods)) {
    http_response_code(400);
    echo "Ошибка: Неподдерживаемый метод диагностики";
    exit;
}

// Устанавливаем plain text режим для LookingGlass
Hybula\LookingGlass::setPlainTextMode(true);

// Выполняем команду в зависимости от метода
try {
    switch ($method) {
        case 'ping':
            Hybula\LookingGlass::ping($target, 4);
            break;
        case 'ping6':
            Hybula\LookingGlass::ping6($target, 4);
            break;
        case 'traceroute':
            Hybula\LookingGlass::traceroute($target);
            break;
        case 'traceroute6':
            Hybula\LookingGlass::traceroute6($target);
            break;
        case 'mtr':
            Hybula\LookingGlass::mtr($target);
            break;
        case 'mtr6':
            Hybula\LookingGlass::mtr6($target);
            break;
        default:
            http_response_code(400);
            echo "Ошибка: Неподдерживаемый метод диагностики";
            exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo "Ошибка выполнения: " . $e->getMessage();
    exit;
}

// Завершаем буферизацию
ob_end_flush();
?>