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
            handleDownloadComplete(data.content, data.url, data.isImage);
            break;
        case 'error':
            console.error('Получена ошибка:', data.message);
            document.querySelector('.download-info').innerHTML += `
                <div class="alert alert-danger mt-3">
                    ${data.message}
                    <button type="button" class="btn btn-primary btn-sm ms-3" onclick="hideProgress()">Закрыть</button>
                </div>
            `;
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

    if (!urls || urls.length === 0) {
        urlList.innerHTML = '<div class="alert alert-info">По данному ключевому слову ничего не найдено</div>';
        urlListCard.style.display = 'block';
        return;
    }

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

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Байт';
    const k = 1024;
    const sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Начало загрузки
function startDownload(url) {
    console.log('Начало загрузки:', url);

    // Проверяем, не скачан ли уже файл
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    if (downloads[url]) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-warning alert-dismissible fade show';
        alertDiv.innerHTML = `
            Этот файл уже загружен! 
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.card'));

        // Автоматически скрываем предупреждение через 3 секунды
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);

        return;
    }

    const progressBlock = document.getElementById('downloadProgress');
    progressBlock.style.display = 'block';

    // Сбрасываем прогресс
    document.querySelector('.progress-bar').style.width = '0%';
    document.querySelector('.progress-bar').setAttribute('aria-valuenow', 0);
    document.getElementById('fileSize').textContent = '0 Байт';
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
    const percent = Math.min(Math.round((progress.downloadedSize / progress.totalSize) * 100), 100);

    // Обновление статус бара
    document.querySelector('.progress-bar').style.width = `${percent}%`;
    document.querySelector('.progress-bar').setAttribute('aria-valuenow', percent);

    // Обновление текстовой информации
    document.getElementById('fileSize').textContent = formatFileSize(progress.totalSize);
    document.getElementById('activeThreads').textContent = progress.activeThreads;
    document.getElementById('progressPercent').textContent = percent;
}

// Функция для очистки старых загрузок
function cleanupOldDownloads() {
    try {
        const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
        const entries = Object.entries(downloads);

        if (entries.length > 5) { // Оставляем только 5 последних загрузок
            // Сортируем по времени загрузки
            entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

            // Создаем новый объект с последними 5 загрузками
            const newDownloads = Object.fromEntries(entries.slice(0, 5));
            localStorage.setItem('downloads', JSON.stringify(newDownloads));

            console.log('Очищены старые загрузки, оставлены последние 5');
        }
    } catch (error) {
        console.error('Ошибка при очистке старых загрузок:', error);
    }
}

// Обработка завершения загрузки
function handleDownloadComplete(content, url, isImage) {
    console.log('Загрузка завершена для:', url);

    try {
        // Пытаемся сохранить новую загрузку
        const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
        downloads[url] = {
            content: content,
            isImage: isImage,
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('downloads', JSON.stringify(downloads));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.log('Превышена квота хранилища, очищаем старые загрузки');
                cleanupOldDownloads();
                // Пробуем сохранить снова
                localStorage.setItem('downloads', JSON.stringify(downloads));
            } else {
                throw e;
            }
        }

        // Обновляем список и показываем уведомление
        updateSavedContentList();

        // Добавляем сообщение об успешной загрузке в блок прогресса
        document.querySelector('.download-info').innerHTML += `
            <div class="alert alert-success mt-3">
                Загрузка завершена успешно!
                <button type="button" class="btn btn-primary btn-sm ms-3" onclick="hideProgress()">Закрыть</button>
            </div>
        `;
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
        document.querySelector('.download-info').innerHTML += `
            <div class="alert alert-danger mt-3">
                Ошибка при сохранении: ${error.message}
                <button type="button" class="btn btn-primary btn-sm ms-3" onclick="hideProgress()">Закрыть</button>
            </div>
        `;
    }
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
    if (Object.keys(downloads).length === 0) {
        savedContent.innerHTML = '<div class="alert alert-info">Нет сохраненного контента</div>';
        return;
    }

    // Получаем массив URL и сортируем его в обратном порядке по времени
    const urls = Object.entries(downloads)
        .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        .map(entry => entry[0]);

    urls.forEach(url => {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex justify-content-between align-items-center';

        const link = document.createElement('a');
        link.href = '#';
        link.className = 'flex-grow-1 text-decoration-none';
        link.textContent = url;
        link.onclick = (e) => {
            e.preventDefault();
            showSavedContent(url);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm ms-2';
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Удалить';
        deleteBtn.onclick = () => deleteSavedContent(url);

        item.appendChild(link);
        item.appendChild(deleteBtn);
        savedContent.appendChild(item);
    });
}

// Удаление сохраненного контента
function deleteSavedContent(url) {
    if (confirm('Вы уверены, что хотите удалить этот контент?')) {
        const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
        delete downloads[url];
        localStorage.setItem('downloads', JSON.stringify(downloads));
        updateSavedContentList();
    }
}

// Показ сохраненного контента
function showSavedContent(url) {
    console.log('Показ сохраненного контента для URL:', url);
    const downloads = JSON.parse(localStorage.getItem('downloads') || '{}');
    const item = downloads[url];

    if (!item || !item.content) {
        alert('Ошибка: контент не найден');
        return;
    }

    // Получаем модальное окно
    const contentModal = new bootstrap.Modal(document.getElementById('contentModal'));

    // Устанавливаем заголовок
    document.querySelector('.modal-title').textContent = 'Просмотр: ' + url;

    const modalContent = document.getElementById('modalContent');
    if (item.isImage) {
        // Определяем тип изображения из URL
        let imageType = 'jpeg'; // по умолчанию
        if (url.toLowerCase().endsWith('.png')) {
            imageType = 'png';
        } else if (url.toLowerCase().endsWith('.gif')) {
            imageType = 'gif';
        }

        // Создаем элемент изображения
        modalContent.innerHTML = `
            <img src="data:image/${imageType};base64,${item.content}" 
                 class="img-fluid" 
                 alt="Загруженное изображение"
                 style="max-width: 100%; height: auto;">
        `;
    } else {
        // Для текстового контента
        modalContent.innerHTML = '';
        modalContent.textContent = item.content;
    }

    // Показываем модальное окно
    contentModal.show();
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