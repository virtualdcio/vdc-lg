<?php
declare(strict_types=1);

namespace Hybula;

class LookingGlass
{
    public const IPV4 = 'ipv4';
    public const IPV6 = 'ipv6';

    private const MTR_COUNT = 10;

    // Флаг для определения режима вывода
    private static $plainTextMode = true;

    /**
     * Устанавливает режим вывода в plain text (без HTML)
     */
    public static function setPlainTextMode(bool $enabled): void
    {
        self::$plainTextMode = $enabled;
    }

    /**
     * Executes a ping command.
     */
    public static function ping(string $host, int $count = 4): bool
    {
        return self::procExecute(['ping', '-4', '-c', $count, '-w15'], $host);
    }

    /**
     * Executes a ping6 command.
     */
    public static function ping6(string $host, int $count = 4): bool
    {
        return self::procExecute(['ping', '-6', '-c', $count, '-w15'], $host);
    }

    /**
     * Executes a mtr command.
     */
    public static function mtr(string $host): bool
    {
        return self::procExecute(['mtr', '--raw', '-n', '-4', '-c', self::MTR_COUNT], $host);
    }

    /**
     * Executes a mtr6 command.
     */
    public static function mtr6(string $host): bool
    {
        return self::procExecute(['mtr', '--raw', '-n', '-6', '-c', self::MTR_COUNT], $host);
    }

    /**
     * Executes a traceroute command.
     */
    public static function traceroute(string $host, int $failCount = 4): bool
    {
        return self::procExecute(['traceroute', '-4', '-w2'], $host, $failCount);
    }

    /**
     * Executes a traceroute6 command.
     */
    public static function traceroute6(string $host, int $failCount = 4): bool
    {
        return self::procExecute(['traceroute', '-6', '-w2'], $host, $failCount);
    }

    /**
     * Executes a command and opens pipe for input/output.
     */
    private static function procExecute(array $cmd, string $host, int $failCount = 2): bool
    {
        // define output pipes
        $spec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        // sanitize + remove single quotes
        $cmd[] = str_replace('\'', '', filter_var($host, FILTER_SANITIZE_URL));

        // execute command
        $process = proc_open($cmd, $spec, $pipes, null);

        // check pipe exists
        if (!is_resource($process)) {
            return false;
        }

        // check for mtr/traceroute
        if ($cmd[0] == 'mtr' || $cmd[0] == 'mtr6') {
            $type = 'mtr';
            $parser = new Parser();
        } elseif ($cmd[0] == 'traceroute' || $cmd[0] == 'traceroute6') {
            $type = 'traceroute';
        } else {
            $type = '';
        }

        $fail = 0;
        $match = 0;
        $traceCount = 0;
        $lastFail = 'start';

        // iterate stdout
        while (($str = fgets($pipes[1], 4096)) != null) {
            // В plain text режиме просто выводим строку
            $str = rtrim($str);

            // Для MTR используем парсер
            if ($type === 'mtr') {
                $parser->update($str);
            }
            // Для traceroute форматируем вывод
            elseif ($type === 'traceroute') {
                if ($match < 10 && preg_match('/^[0-9] /', $str, $string)) {
                    $str = preg_replace('/^[0-9] /', '  ' . $string[0], $str);
                    $match++;
                }

                // check for consecutive failed hops
                if (strpos($str, '* * *') !== false) {
                    $fail++;
                    if ($lastFail !== 'start'
                        && ($traceCount - 1) === $lastFail
                        && $fail >= $failCount
                    ) {
                        echo $str . PHP_EOL . '-- Traceroute timed out --' . PHP_EOL;
                        break;
                    }
                    $lastFail = $traceCount;
                }
                $traceCount++;
            }

            // Выводим строку
            if ($type !== 'mtr') {
                echo $str . PHP_EOL;
            }

            // Очищаем буфер
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
        }

        // Для MTR выводим результат парсера
        if ($type === 'mtr') {
            echo $parser->__toString() . PHP_EOL;
        }

        // iterate stderr
        while (($err = fgets($pipes[2], 4096)) != null) {
            // check for IPv6 hostname passed to IPv4 command, and vice versa
            if (strpos($err, 'Name or service not known') !== false || strpos($err, 'unknown host') !== false) {
                echo 'Unauthorized request';
                break;
            }
        }

        // Закрываем процесс
        foreach ($pipes as $pipe) {
            fclose($pipe);
        }
        proc_close($process);

        return true;
    }
}

class Hop
{
    public $idx;
    public $asn = '';
    public $avg = 0.0;
    public $loss = 0;
    public $stdev = 0.0;
    public $sent = 0;
    public $recieved = 0;
    public $last = 0.0;
    public $best = 0.0;
    public $worst = 0.0;
    public $ips = [];
    public $hosts = [];
    public $timings = [];
}

class RawHop
{
    public $dataType;
    public $idx;
    public $value;
}

class Parser
{
    protected $hopsCollection = [];
    private $hopCount = 0;
    private $outputWidth = 38;

    public function __construct()
    {
        putenv('RES_OPTIONS=retrans:1 retry:1 timeout:1 attempts:1');
    }

    public function __toString(): string
    {
        $str = '';
        foreach ($this->hopsCollection as $index => $hop) {
            $host = $hop->hosts[0] ?? $hop->ips[0] ?? '???';

            if (strlen($host) > $this->outputWidth) {
                $this->outputWidth = strlen($host);
            }

            $hop->recieved = count($hop->timings);
            if (count($hop->timings)) {
                $hop->last = $hop->timings[count($hop->timings) - 1];
                $hop->best = $hop->timings[0];
                $hop->worst = $hop->timings[0];
                $hop->avg = array_sum($hop->timings) / count($hop->timings);
            }

            if (count($hop->timings) > 1) {
                $hop->stdev = $this->stDev($hop->timings);
            }

            foreach ($hop->timings as $time) {
                if ($hop->best > $time) {
                    $hop->best = $time;
                }

                if ($hop->worst < $time) {
                    $hop->worst = $time;
                }
            }

            $hop->loss = $hop->sent ? (100 * ($hop->sent - $hop->recieved)) / $hop->sent : 100;

            $str = sprintf(
                "%s%2d.|-- %s%3d.0%%   %3d  %5.1f %5.1f %5.1f %5.1f %5.1f\n",
                $str,
                $index,
                str_pad($host, $this->outputWidth + 3, ' ', STR_PAD_RIGHT),
                $hop->loss,
                $hop->sent,
                $hop->last,
                $hop->avg,
                $hop->best,
                $hop->worst,
                $hop->stdev
            );
        }

        return sprintf("       Host%sLoss%%   Snt   Last   Avg  Best  Wrst StDev\n%s",
            str_pad('', $this->outputWidth + 7, ' ', STR_PAD_RIGHT), $str);
    }

    private function stDev(array $array): float
    {
        $sdSquare = function ($x, $mean) {
            return pow($x - $mean, 2);
        };

        return sqrt(array_sum(array_map($sdSquare, $array,
                array_fill(0, count($array), (array_sum($array) / count($array))))) / (count($array) - 1));
    }

    public function update($rawMtrInput)
    {
        $things = explode(' ', $rawMtrInput);

        if (count($things) !== 3 && (count($things) !== 4 && $things[0] === 'p')) {
            return;
        }

        $rawHop = new RawHop();
        $rawHop->dataType = $things[0];
        $rawHop->idx = (int)$things[1];
        $rawHop->value = $things[2];

        if ($this->hopCount < $rawHop->idx + 1) {
            $this->hopCount = $rawHop->idx + 1;
        }

        if (!isset($this->hopsCollection[$rawHop->idx])) {
            $this->hopsCollection[$rawHop->idx] = new Hop();
        }

        $hop = $this->hopsCollection[$rawHop->idx];
        $hop->idx = $rawHop->idx;
        switch ($rawHop->dataType) {
            case 'h':
                $hop->ips[] = $rawHop->value;
                $hop->hosts[] = gethostbyaddr($rawHop->value) ?: null;
                break;
            case 'p':
                $hop->sent++;
                $hop->timings[] = (float)$rawHop->value / 1000;
                break;
        }

        $this->hopsCollection[$rawHop->idx] = $hop;
        $this->filterLastDupeHop();
    }

    private function filterLastDupeHop()
    {
        $finalIdx = 0;
        $previousIp = '';

        foreach ($this->hopsCollection as $key => $hop) {
            if (count($hop->ips) && $hop->ips[0] !== $previousIp) {
                $previousIp = $hop->ips[0];
                $finalIdx = $key + 1;
            }
        }

        unset($this->hopsCollection[$finalIdx]);

        usort($this->hopsCollection, function ($a, $b) {
            return $a->idx - $b->idx;
        });
    }
}