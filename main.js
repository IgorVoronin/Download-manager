// Конфигурация WebSocket
console.log('Скрипт main.js загружен');
const WS_URL = 'wss://download-manager.onrender.com';
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Инициализация WebSocket соединения
function initWebSocket() {
    console.log('Начало инициализации WebSocket');
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Превышено максимальное количество попыток подключения');
        alert('Не удалось подключиться к серверу. Пожалуйста, обновите страницу.');
        return;
    }

    console.log('Попытка подключения к:', WS_URL);
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WebSocket соединение установлено');
        reconnectAttempts = 0;
        document.getElementById('searchBtn').disabled = false;
    };

    ws.onmessage = (event) => {
        console.log('Получено сообщение:', event.data);
        try {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        } catch (error) {
            console.error('Ошибка при обработке сообщения:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        document.getElementById('searchBtn').disabled = true;
    };

    ws.onclose = (event) => {
        console.log('WebSocket соединение закрыто. Код:', event.code, 'Причина:', event.reason);
        document.getElementById('searchBtn').disabled = true;
        reconnectAttempts++;
        setTimeout(initWebSocket, 5000);
    };
}

// Обработка сообщений от сервера
function handleServerMessage(data) {
    console.log('Обработка сообщения типа:', data.type);
    switch (data.type) {
        case 'urlList':
            console.log('Получен список URL:', data.urls);
            displayUrlList(data.urls);
            break;
        case 'downloadProgress':
            console.log('Прогресс загрузки:', data.progress);
            updateDownloadProgress(data.progress);
            break;
        case 'downloadComplete':
            console.log('Загрузка завершена для URL:', data.url);
            handleDownloadComplete(data.content, data.url);
            break;
        default:
            console.log('Получено неизвестное сообщение:', data);
    }
}

// Отображение списка URL
function displayUrlList(urls) {
    console.log('Отображение списка URL:', urls);
    const urlListCard = document.getElementById('urlListCard');
    const urlList = document.getElementById('urlList');
    urlList.innerHTML = '';

    urls.forEach(url => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = url;
        item.onclick = (e) => {
            e.preventDefault();
            console.log('Выбран URL для загрузки:', url);
            startDownload(url);
        };
        urlList.appendChild(item);
    });

    urlListCard.style.display = 'block';
}

// Функция для выполнения поиска
function performSearch() {
    const keyword = document.getElementById('keywordInput').value.trim();
    if (keyword) {
        console.log('Отправка запроса поиска для:', keyword);
        ws.send(JSON.stringify({
            type: 'search',
            keyword: keyword
        }));
    }
}

// Начало загрузки
function startDownload(url) {
    console.log('Начало загрузки:', url);
    const progressBlock = document.getElementById('downloadProgress');
    progressBlock.style.display = 'block';

    // Сбрасываем прогресс
    document.querySelector('.progress-bar').style.width = '0%';
    document.querySelector('.progress-bar').setAttribute('aria-valuenow', 0);
    document.getElementById('fileSize').textContent = '0';
    document.getElementById('activeThreads').textContent = '0';
    document.getElementById('progressPercent').textContent = '0';

    // Удаляем предыдущие сообщения об успешной загрузке
    const successMessages = progressBlock.querySelectorAll('.alert');
    successMessages.forEach(msg => msg.remove());

    ws.send(JSON.stringify({
        type: 'startDownload',
        url: url
    }));
}

// Обновление прогресса загрузки
function updateDownloadProgress(progress) {
    console.log('Обновление прогресса:', progress);
    document.querySelector('.progress-bar').style.width = `${progress.percent}%`;
    document.querySelector('.progress-bar').setAttribute('aria-valuenow', progress.percent);
    document.getElementById('fileSize').textContent = (progress.totalSize / (1024 * 1024)).toFixed(2);
    document.getElementById('activeThreads').textContent = progress.activeThreads;
    document.getElementById('progressPercent').textContent = progress.percent;
}

// Обработка завершения загрузки
function handleDownloadComplete(content, url) {
    console.log('Загрузка завершена для:', url);
    // Сохранение в LocalStorage
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    downloads[url] = content;
    localStorage.setItem('downloads', JSON.stringify(downloads));

    // Обновляем список и показываем уведомление
    updateSavedContentList();

    // Добавляем сообщение об успешной загрузке в блок прогресса
    document.querySelector('.download-info').innerHTML += `
        <div class="alert alert-success mt-3">
            Загрузка завершена успешно!
            <button type="button" class="btn btn-primary btn-sm ms-3" onclick="hideProgress()">Закрыть</button>
        </div>
    `;
}

// Функция скрытия прогресса
function hideProgress() {
    document.getElementById('downloadProgress').style.display = 'none';
}

// Обновление списка сохраненного контента
function updateSavedContentList() {
    console.log('Обновление списка сохраненного контента');
    const savedContent = document.getElementById('savedContent');
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');

    savedContent.innerHTML = '';
    Object.keys(downloads).forEach(url => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'list-group-item list-group-item-action';
        item.textContent = url;
        item.onclick = (e) => {
            e.preventDefault();
            showSavedContent(url);
        };
        savedContent.appendChild(item);
    });
}

// Показ сохраненного контента
function showSavedContent(url) {
    console.log('Показ сохраненного контента для URL:', url);
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    const content = downloads[url];

    // Получаем модальное окно
    const contentModal = new bootstrap.Modal(document.getElementById('contentModal'));

    // Устанавливаем заголовок
    document.querySelector('.modal-title').textContent = 'Просмотр: ' + url;

    // Устанавливаем контент
    document.getElementById('modalContent').textContent = content;

    // Показываем модальное окно
    contentModal.show();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена, инициализация...');
    initWebSocket();
    updateSavedContentList();

    // Обработчик поиска по кнопке
    document.getElementById('searchBtn').onclick = performSearch;

    // Обработчик клавиши Enter в поле ввода
    document.getElementById('keywordInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Предотвращаем стандартное действие
            performSearch();
        }
    });
});