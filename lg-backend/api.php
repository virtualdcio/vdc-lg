<?php
declare(strict_types=1);

require_once 'LookingGlass.php';
require_once 'config.php';

use Hybula\LookingGlass;

// Устанавливаем режим plain text для API
LookingGlass::setPlainTextMode(true);

// Безопасность
header('Content-Type: text/plain');
header('X-Accel-Buffering: no');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// CORS
if (LG_ALLOWED_ORIGIN !== '*') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, explode(',', LG_ALLOWED_ORIGIN), true)) {
        header("Access-Control-Allow-Origin: $origin");
    }
} else {
    header('Access-Control-Allow-Origin: *');
}

// OPTIONS запрос
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}

// Только POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Method Not Allowed";
    exit;
}

// Получаем JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo "Invalid JSON";
    exit;
}

$target = $input['target'] ?? '';
$method = $input['method'] ?? '';

// Валидация
if (empty($target) || empty($method)) {
    http_response_code(400);
    echo "Target and method are required";
    exit;
}

if (!in_array($method, LG_METHODS, true)) {
    http_response_code(400);
    echo "Method not allowed";
    exit;
}

// Валидация IP/хоста
$targetHost = $target;

// Создаем упрощенные функции валидации для API (без ограничений на приватные адреса)
function isValidIpv4ForApi(string $ip): bool {
    return (bool)filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
}

function isValidIpv6ForApi(string $ip): bool {
    return (bool)filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6);
}

if (in_array($method, ['ping', 'mtr', 'traceroute'])) {
    // Для IPv4 используем упрощенную валидацию (без FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)
    if (!isValidIpv4ForApi($target) &&
        !$targetHost = LookingGlass::isValidHost($target, LookingGlass::IPV4)) {
        http_response_code(400);
        echo "Invalid IPv4 target";
        exit;
    }
    // Если target - валидный IPv4, используем его как есть
    if (isValidIpv4ForApi($target)) {
        $targetHost = $target;
    }
}

if (in_array($method, ['ping6', 'mtr6', 'traceroute6'])) {
    // Для IPv6 используем упрощенную валидацию (без FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)
    if (!isValidIpv6ForApi($target) &&
        !$targetHost = LookingGlass::isValidHost($target, LookingGlass::IPV6)) {
        http_response_code(400);
        echo "Invalid IPv6 target";
        exit;
    }
    // Если target - валидный IPv6, используем его как есть
    if (isValidIpv6ForApi($target)) {
        $targetHost = $target;
    }
}

// Выполняем команду с перехватом вывода
set_time_limit(120);

// Включаем буферизацию вывода
ob_start();

try {
    switch ($method) {
        case LookingGlass::METHOD_PING:
            LookingGlass::ping($targetHost);
            break;
        case LookingGlass::METHOD_PING6:
            LookingGlass::ping6($targetHost);
            break;
        case LookingGlass::METHOD_MTR:
            LookingGlass::mtr($targetHost);
            break;
        case LookingGlass::METHOD_MTR6:
            LookingGlass::mtr6($targetHost);
            break;
        case LookingGlass::METHOD_TRACEROUTE:
            LookingGlass::traceroute($targetHost);
            break;
        case LookingGlass::METHOD_TRACEROUTE6:
            LookingGlass::traceroute6($targetHost);
            break;
        default:
            http_response_code(400);
            echo "Unknown method";
            exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}

// Получаем вывод из буфера
$output = ob_get_clean();

// Дополнительная очистка вывода (на всякий случай)
if ($output) {
    // Убираем HTML теги (если что-то осталось)
    $output = strip_tags($output);
    // Заменяем оставшиеся HTML-сущности
    $output = html_entity_decode($output, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    // Убираем лишние пробелы в начале/конце строк
    $lines = explode("\n", $output);
    $lines = array_map('trim', $lines);
    $output = implode("\n", $lines);
}

// Отправляем очищенный вывод
echo $output;