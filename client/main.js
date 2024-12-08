// Конфигурация WebSocket
const WS_URL = 'wss://https://download-manager.onrender.com';
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// Инициализация WebSocket соединения
function initWebSocket() {

    if (reconnectAttempts >= maxReconnectAttempts) {
        alert('Не удалось подключиться к серверу. Пожалуйста, обновите страницу.');
        return;
    }

    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WebSocket соединение установлено');
        reconnectAttempts = 0;
        document.getElementById('searchBtn').disabled = false;
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
    };

    ws.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket соединение закрыто');
        // Попытка переподключения через 5 секунд
        setTimeout(initWebSocket, 5000);
    };
}

// Обработка сообщений от сервера
function handleServerMessage(data) {
    switch (data.type) {
        case 'urlList':
            displayUrlList(data.urls);
            break;
        case 'downloadProgress':
            updateDownloadProgress(data.progress);
            break;
        case 'downloadComplete':
            handleDownloadComplete(data.content, data.url);
            break;
    }
}

// Отображение списка URL
function displayUrlList(urls) {
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
            startDownload(url);
        };
        urlList.appendChild(item);
    });

    urlListCard.style.display = 'block';
}

// Начало загрузки
function startDownload(url) {
    document.getElementById('downloadProgress').style.display = 'block';
    ws.send(JSON.stringify({
        type: 'startDownload',
        url: url
    }));
}

// Обновление прогресса загрузки
function updateDownloadProgress(progress) {
    document.querySelector('.progress-bar').style.width = `${progress.percent}%`;
    document.getElementById('fileSize').textContent = (progress.totalSize / (1024 * 1024)).toFixed(2);
    document.getElementById('activeThreads').textContent = progress.activeThreads;
    document.getElementById('progressPercent').textContent = progress.percent;
}

// Обработка завершения загрузки
function handleDownloadComplete(content, url) {
    // Сохранение в LocalStorage
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    downloads[url] = content;
    localStorage.setItem('downloads', JSON.stringify(downloads));

    updateSavedContentList();
    document.getElementById('downloadProgress').style.display = 'none';
}

// Обновление списка сохраненного контента
function updateSavedContentList() {
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
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    const content = downloads[url];
    // Здесь можно добавить логику отображения контента
    alert(content);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    updateSavedContentList();

    // Обработчик поиска по ключевому слову
    document.getElementById('searchBtn').onclick = () => {
        const keyword = document.getElementById('keywordInput').value.trim();
        if (keyword) {
            ws.send(JSON.stringify({
                type: 'search',
                keyword: keyword
            }));
        }
    };
});