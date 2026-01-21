/**
 * VDC Looking Glass Widget
 * Минималистичный виджет для диагностики сети
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
            copyButtons: document.querySelectorAll('.lg-copy-btn')
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

        try {
            await this.fetchAndStreamResults(location.apiUrl, target, method);
            this.showStatus('Готово', 'success');
        } catch (error) {
            this.handleExecutionError(error);
        } finally {
            this.finishExecution();
        }
    }

    // Начало выполнения
    startExecution() {
        this.isExecuting = true;
        this.elements.executeBtn.disabled = true;
        this.elements.cancelBtn.style.display = 'inline-block';
        this.elements.statusDiv.textContent = 'Выполняется...';
        this.abortController = new AbortController();
        this.clearResults();
    }

    // Завершение выполнения
    finishExecution() {
        this.isExecuting = false;
        this.elements.executeBtn.disabled = false;
        this.elements.cancelBtn.style.display = 'none';
        this.abortController = null;
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
    }

    // Отмена выполнения
    cancelExecution() {
        if (this.abortController && !this.abortController.signal.aborted) {
            this.abortController.abort();
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
    }
}

// Экспорт для глобального использования
if (typeof window !== 'undefined') {
    window.LookingGlassWidget = LookingGlassWidget;
}