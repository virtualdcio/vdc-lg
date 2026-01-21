/**
 * VDC Looking Glass Widget
 * Минималистичный виджет для диагностики сети
 * Версия 1.1 с прогресс-индикатором для MTR
 */

class LookingGlassWidget {
    // Конструктор с настройками по умолчанию
    constructor(options = {}) {
        this.config = {
            container: options.container || document.body,
            locations: options.locations || this.getDefaultLocations(),
            defaultLocation: options.defaultLocation || 'RU',
            theme: options.theme || 'light',
            autoDetectIP: options.autoDetectIP !== false
        };

        this.currentLocation = this.config.defaultLocation;
        this.userIP = null;
        this.isExecuting = false;
        this.abortController = null;
        this.mtrProgressInterval = null;
        this.currentProgress = 0;

        // DOM элементы
        this.elements = {};

        this.init();
    }

    // Локации по умолчанию
    getDefaultLocations() {
        return {
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
        };
    }

    // Инициализация виджета
    async init() {
        this.createDOM();

        if (this.config.autoDetectIP) {
            await this.detectUserIP();
        }

        this.setupEventListeners();
        this.updateLocationInfo();
    }

    // Создание DOM структуры
    createDOM() {
        const widgetHTML = `
            <div class="lg-widget lg-theme-${this.config.theme}">
                <!-- Заголовок -->
                <div class="lg-header">
                    <h3 class="lg-title">Диагностика сети</h3>
                </div>
                
                <!-- Выбор локации -->
                <div class="lg-location-selector">
                    <div class="lg-location-tabs">
                        ${this.generateLocationTabs()}
                    </div>
                </div>
                
                <!-- Сетевая информация -->
                <div class="lg-network-info">
                    <div class="lg-network-row">
                        ${this.generateNetworkFields()}
                    </div>
                </div>
                
                <!-- Форма диагностики -->
                <div class="lg-form-container">
                    <form class="lg-form">
                        <div class="lg-form-row">
                            ${this.generateFormFields()}
                        </div>
                    </form>
                </div>
                
                <!-- Прогресс-индикатор (скрыт по умолчанию) -->
                <div class="lg-progress-container" style="display: none;">
                    <div class="lg-progress-header">
                        <span class="lg-progress-title">Выполнение MTR</span>
                        <span class="lg-progress-percentage">0%</span>
                    </div>
                    <div class="lg-progress-bar">
                        <div class="lg-progress-fill"></div>
                    </div>
                    <div class="lg-progress-steps">
                        <div class="lg-progress-step active">Старт</div>
                        <div class="lg-progress-step">Сбор хопов</div>
                        <div class="lg-progress-step">Отправка пакетов</div>
                        <div class="lg-progress-step">Анализ</div>
                        <div class="lg-progress-step">Завершение</div>
                    </div>
                </div>
                
                <!-- Статус MTR -->
                <div class="lg-mtr-status" style="display: none;">
                    <span class="lg-mtr-status-icon">🔄</span>
                    <span class="lg-mtr-status-text">Инициализация MTR...</span>
                    <div class="lg-progress-compact">
                        <div class="lg-progress-spinner"></div>
                        <span>0%</span>
                    </div>
                </div>
                
                <!-- Результаты -->
                <div class="lg-results-container">
                    <div class="lg-results-header">
                        <h4>Результаты</h4>
                        <button type="button" class="lg-clear-btn">Очистить</button>
                    </div>
                    <pre class="lg-results-output"></pre>
                </div>
                
                <!-- Статус -->
                <div class="lg-status"></div>
            </div>
        `;

        // Добавляем HTML в контейнер
        const container = typeof this.config.container === 'string'
            ? document.querySelector(this.config.container)
            : this.config.container;

        container.innerHTML = widgetHTML;
        this.cacheElements();
    }

    // Генерация вкладок локаций
    generateLocationTabs() {
        return Object.entries(this.config.locations)
            .map(([code, loc]) => `
                <button type="button" 
                        class="lg-location-tab ${code === this.currentLocation ? 'active' : ''}" 
                        data-location="${code}">
                    ${loc.name}
                </button>
            `).join('');
    }

    // Генерация полей сети
    generateNetworkFields() {
        return `
            <div class="lg-network-field">
                <label>Сервер IPv4</label>
                <div class="lg-input-group">
                    <input type="text" class="lg-ipv4" readonly>
                    <button type="button" class="lg-copy-btn" data-copy="ipv4">Копировать</button>
                </div>
            </div>
            <div class="lg-network-field">
                <label>Сервер IPv6</label>
                <div class="lg-input-group">
                    <input type="text" class="lg-ipv6" readonly>
                    <button type="button" class="lg-copy-btn" data-copy="ipv6">Копировать</button>
                </div>
            </div>
            <div class="lg-network-field">
                <label>Ваш IP</label>
                <div class="lg-input-group">
                    <input type="text" class="lg-user-ip" readonly>
                </div>
            </div>
        `;
    }

    // Генерация полей формы
    generateFormFields() {
        return `
            <div class="lg-form-group">
                <input type="text" 
                       class="lg-target-input" 
                       placeholder="Введите IP или домен" 
                       required>
            </div>
            <div class="lg-form-group">
                <select class="lg-method-select">
                    <option value="ping">Ping (IPv4)</option>
                    <option value="ping6">Ping (IPv6)</option>
                    <option value="traceroute">Traceroute (IPv4)</option>
                    <option value="traceroute6">Traceroute (IPv6)</option>
                    <option value="mtr">MTR (IPv4)</option>
                    <option value="mtr6">MTR (IPv6)</option>
                </select>
            </div>
            <div class="lg-form-group">
                <button type="submit" class="lg-execute-btn">Выполнить</button>
                <button type="button" class="lg-cancel-btn" style="display: none;">Отмена</button>
            </div>
        `;
    }

    // Кэширование DOM элементов
    cacheElements() {
        this.elements = {
            widget: document.querySelector('.lg-widget'),
            locationTabs: document.querySelectorAll('.lg-location-tab'),
            ipv4Input: document.querySelector('.lg-ipv4'),
            ipv6Input: document.querySelector('.lg-ipv6'),
            userIpInput: document.querySelector('.lg-user-ip'),
            targetInput: document.querySelector('.lg-target-input'),
            methodSelect: document.querySelector('.lg-method-select'),
            executeBtn: document.querySelector('.lg-execute-btn'),
            cancelBtn: document.querySelector('.lg-cancel-btn'),
            clearBtn: document.querySelector('.lg-clear-btn'),
            resultsOutput: document.querySelector('.lg-results-output'),
            statusDiv: document.querySelector('.lg-status'),
            form: document.querySelector('.lg-form'),
            copyButtons: document.querySelectorAll('.lg-copy-btn'),
            progressContainer: document.querySelector('.lg-progress-container'),
            progressFill: document.querySelector('.lg-progress-fill'),
            progressPercentage: document.querySelector('.lg-progress-percentage'),
            progressSteps: document.querySelectorAll('.lg-progress-step'),
            mtrStatus: document.querySelector('.lg-mtr-status'),
            mtrStatusText: document.querySelector('.lg-mtr-status-text'),
            mtrProgressCompact: document.querySelector('.lg-progress-compact span')
        };
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Переключение локаций
        this.elements.locationTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchLocation(e.target.dataset.location);
            });
        });

        // Копирование IP
        this.elements.copyButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.copyToClipboard(e.target.dataset.copy);
            });
        });

        // Форма
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.executeCommand();
        });

        // Отмена выполнения
        this.elements.cancelBtn.addEventListener('click', () => {
            this.cancelExecution();
        });

        // Очистка результатов
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearResults();
        });

        // Изменение метода диагностики
        this.elements.methodSelect.addEventListener('change', () => {
            this.hideProgressIndicator();
        });
    }

    // Определение IP пользователя
    async detectUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.userIP = data.ip;
            this.elements.userIpInput.value = this.userIP;
        } catch (error) {
            console.warn('Не удалось определить IP пользователя:', error);
            this.elements.userIpInput.value = 'Не определен';
        }
    }

    // Переключение локации
    switchLocation(locationCode) {
        if (!this.config.locations[locationCode]) {
            this.showStatus('Неизвестная локация', 'error');
            return;
        }

        // Обновляем активную вкладку
        this.elements.locationTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.location === locationCode);
        });

        this.currentLocation = locationCode;
        this.updateLocationInfo();
        this.clearResults();
        this.hideProgressIndicator();
    }

    // Обновление информации о локации
    updateLocationInfo() {
        const location = this.config.locations[this.currentLocation];

        if (location) {
            this.elements.ipv4Input.value = location.ipv4 || '';
            this.elements.ipv6Input.value = location.ipv6 || '';
        }
    }

    // Копирование в буфер обмена
    copyToClipboard(type) {
        let text = '';

        switch(type) {
            case 'ipv4':
                text = this.elements.ipv4Input.value;
                break;
            case 'ipv6':
                text = this.elements.ipv6Input.value;
                break;
        }

        if (!text) return;

        navigator.clipboard.writeText(text)
            .then(() => this.showStatus('Скопировано в буфер обмена', 'success'))
            .catch(() => this.showStatus('Ошибка копирования', 'error'));
    }

    // Выполнение команды
    async executeCommand() {
        if (this.isExecuting) return;

        const target = this.elements.targetInput.value.trim();
        const method = this.elements.methodSelect.value;
        const location = this.config.locations[this.currentLocation];

        // Валидация
        if (!target) {
            this.showStatus('Введите IP или домен', 'error');
            return;
        }

        if (!location?.apiUrl) {
            this.showStatus('Локация не настроена', 'error');
            return;
        }

        // Начинаем выполнение
        this.startExecution();

        // Особый обработчик для MTR
        if (this.isMTRCommand(method)) {
            this.showMTRProgressIndicator();
            this.appendOutput(`🚀 Запуск MTR к ${target}...\n`);
            this.appendOutput(`⏳ Выполняется отправка 10 пакетов на каждый хоп...\n`);
            this.appendOutput(`📊 Ожидаемое время выполнения: 10-15 секунд\n\n`);
        }

        try {
            await this.fetchAndStreamResults(location.apiUrl, target, method);

            if (this.isMTRCommand(method)) {
                this.showStatus('MTR успешно выполнен', 'success');
                this.appendOutput(`\n✅ MTR завершен успешно!\n`);
            } else {
                this.showStatus('Готово', 'success');
            }
        } catch (error) {
            this.handleExecutionError(error);
        } finally {
            this.finishExecution();
        }
    }

    // Проверка, является ли команда MTR
    isMTRCommand(method) {
        return method === 'mtr' || method === 'mtr6';
    }

    // Показать прогресс-индикатор для MTR
    showMTRProgressIndicator() {
        this.currentProgress = 0;

        // Показываем контейнер прогресса
        this.elements.progressContainer.style.display = 'block';
        this.elements.mtrStatus.style.display = 'flex';

        // Запускаем анимацию прогресса
        this.mtrProgressInterval = setInterval(() => {
            if (this.currentProgress < 90) {
                this.currentProgress += Math.random() * 5 + 1; // Увеличиваем случайно
                if (this.currentProgress > 90) this.currentProgress = 90;
                this.updateProgressBar();

                // Обновляем текст статуса на разных этапах
                if (this.currentProgress < 25) {
                    this.elements.mtrStatusText.textContent = 'Определение маршрута...';
                } else if (this.currentProgress < 50) {
                    this.elements.mtrStatusText.textContent = 'Сбор информации о хопах...';
                } else if (this.currentProgress < 75) {
                    this.elements.mtrStatusText.textContent = 'Отправка пакетов...';
                } else {
                    this.elements.mtrStatusText.textContent = 'Анализ результатов...';
                }
            }
        }, 300);
    }

    // Обновить прогресс-бар
    updateProgressBar() {
        this.currentProgress = Math.min(100, Math.max(0, this.currentProgress));

        // Обновляем ширину заполнения
        this.elements.progressFill.style.width = `${this.currentProgress}%`;

        // Обновляем процент
        this.elements.progressPercentage.textContent = `${Math.round(this.currentProgress)}%`;
        this.elements.mtrProgressCompact.textContent = `${Math.round(this.currentProgress)}%`;

        // Обновляем активные шаги
        const stepIndex = Math.floor(this.currentProgress / 20);
        this.elements.progressSteps.forEach((step, index) => {
            step.classList.toggle('active', index <= stepIndex);
        });
    }

    // Скрыть прогресс-индикатор
    hideProgressIndicator() {
        this.elements.progressContainer.style.display = 'none';
        this.elements.mtrStatus.style.display = 'none';

        if (this.mtrProgressInterval) {
            clearInterval(this.mtrProgressInterval);
            this.mtrProgressInterval = null;
        }
    }

    // Начало выполнения
    startExecution() {
        this.isExecuting = true;
        this.elements.executeBtn.disabled = true;
        this.elements.cancelBtn.style.display = 'inline-block';
        this.elements.statusDiv.textContent = 'Выполняется...';
        this.elements.statusDiv.classList.add('lg-status-animated');
        this.abortController = new AbortController();
        this.clearResults();
    }

    // Завершение выполнения
    finishExecution() {
        this.isExecuting = false;
        this.elements.executeBtn.disabled = false;
        this.elements.cancelBtn.style.display = 'none';
        this.elements.statusDiv.classList.remove('lg-status-animated');
        this.abortController = null;

        // Завершаем прогресс-бар для MTR
        if (this.isMTRCommand(this.elements.methodSelect.value)) {
            this.currentProgress = 100;
            this.updateProgressBar();

            // Скрываем прогресс через 2 секунды
            setTimeout(() => {
                this.hideProgressIndicator();
            }, 2000);
        } else {
            this.hideProgressIndicator();
        }
    }

    // Получение и потоковая обработка результатов
    async fetchAndStreamResults(apiUrl, target, method) {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, method }),
            signal: this.abortController.signal
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            this.appendOutput(decoder.decode(value));
        }
    }

    // Обработка ошибок выполнения
    handleExecutionError(error) {
        if (error.name === 'AbortError') {
            this.showStatus('Отменено', 'info');
            this.appendOutput('\n--- Отменено пользователем ---\n');
        } else {
            this.showStatus(`Ошибка: ${error.message}`, 'error');
            this.appendOutput(`\n--- Ошибка: ${error.message} ---\n`);
        }

        // Сбрасываем прогресс при ошибке
        if (this.isMTRCommand(this.elements.methodSelect.value)) {
            this.currentProgress = 0;
            this.updateProgressBar();
        }
    }

    // Отмена выполнения
    cancelExecution() {
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
        }

        // Сбрасываем прогресс
        if (this.isMTRCommand(this.elements.methodSelect.value)) {
            this.currentProgress = 0;
            this.updateProgressBar();
            this.elements.mtrStatusText.textContent = 'Отменено пользователем';
        }
    }

    // Добавление вывода
    appendOutput(text) {
        this.elements.resultsOutput.textContent += text;
        // Автопрокрутка
        this.elements.resultsOutput.scrollTop = this.elements.resultsOutput.scrollHeight;
    }

    // Очистка результатов
    clearResults() {
        this.elements.resultsOutput.textContent = '';
    }

    // Показать статус
    showStatus(message, type = 'info') {
        this.elements.statusDiv.textContent = message;
        this.elements.statusDiv.className = `lg-status lg-status-${type}`;

        // Автоматически скрываем через 3 секунды (кроме ошибок)
        if (type !== 'error') {
            setTimeout(() => {
                this.elements.statusDiv.textContent = '';
                this.elements.statusDiv.className = 'lg-status';
            }, 3000);
        }
    }

    // Публичные методы API
    setLocation(locationCode) {
        this.switchLocation(locationCode);
    }

    getCurrentLocation() {
        return this.currentLocation;
    }

    setTarget(target) {
        this.elements.targetInput.value = target;
    }

    setMethod(method) {
        this.elements.methodSelect.value = method;
        this.hideProgressIndicator();
    }
}

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.LookingGlassWidget = LookingGlassWidget;
}