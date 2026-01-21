<?php
define('LG_LOCATION', getenv('LOCATION') ?: 'RU');
define('LG_IPV4', getenv('IPV4') ?: '127.0.0.1');
define('LG_IPV6', getenv('IPV6') ?: '::1');
define('LG_METHODS', json_decode(getenv('METHODS') ?: '["ping","traceroute","mtr"]', true));
define('LG_ALLOWED_ORIGIN', getenv('ALLOWED_ORIGIN') ?: 'https://vdc.ru');