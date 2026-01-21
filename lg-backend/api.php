<?php
declare(strict_types=1);

require_once 'LookingGlass.php';
require_once 'config.php';

use Hybula\LookingGlass;

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
if (in_array($method, ['ping', 'mtr', 'traceroute'])) {
    if (!LookingGlass::isValidIpv4($target) &&
        !$targetHost = LookingGlass::isValidHost($target, LookingGlass::IPV4)) {
        http_response_code(400);
        echo "Invalid IPv4 target";
        exit;
    }
}

if (in_array($method, ['ping6', 'mtr6', 'traceroute6'])) {
    if (!LookingGlass::isValidIpv6($target) &&
        !$targetHost = LookingGlass::isValidHost($target, LookingGlass::IPV6)) {
        http_response_code(400);
        echo "Invalid IPv6 target";
        exit;
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

// Очищаем вывод от HTML
if ($output) {
    // Убираем HTML теги
    $output = strip_tags($output);
    // Заменяем &nbsp; на обычные пробелы
    $output = str_replace('&nbsp;', ' ', $output);
    // Заменяем HTML-сущности
    $output = html_entity_decode($output, ENT_QUOTES, 'UTF-8');
    // Убираем множественные пробелы и переносы
    $output = preg_replace('/\s+/', ' ', $output);
    $output = trim($output);
}

// Отправляем очищенный вывод
echo $output;