const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const config = require('./config');

const app = express();

// Настройка CORS для всех запросов
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

// Базовый маршрут для проверки работоспособности
app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
});

// Создаем HTTP сервер
const server = app.listen(config.port, () => {
    console.log(`Сервер запущен на порту ${config.port}`);
});

// Создаем WebSocket сервер с настройками
const wss = new WebSocket.Server({
    server,
    verifyClient: (info) => {
        console.log('Попытка подключения от:', info.origin);
        return true;
    }
});

// Класс для управления загрузкой
class DownloadManager {
    constructor(url, ws) {
        this.url = url;
        this.ws = ws;
        this.chunks = [];
        this.activeThreads = 0;
        this.totalSize = 0;
        this.downloadedSize = 0;
        this.isImage = url.match(/\.(jpg|jpeg|png|gif)$/i) || url.includes('~orig');
        this.lastProgressUpdate = 0;
    }

    async start() {
        try {
            // Получаем размер файла
            const response = await fetch(this.url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки файла: ${response.status} ${response.statusText}`);
            }

            this.totalSize = parseInt(response.headers.get('content-length') || '0');
            console.log('Общий размер файла:', this.totalSize);

            if (this.totalSize === 0) {
                // Если размер неизвестен, загружаем файл целиком
                const fullResponse = await fetch(this.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });

                if (!fullResponse.ok) {
                    throw new Error(`Ошибка загрузки файла: ${fullResponse.status} ${fullResponse.statusText}`);
                }

                const buffer = await fullResponse.buffer();
                this.ws.send(JSON.stringify({
                    type: 'downloadComplete',
                    content: buffer.toString('base64'),
                    url: this.url,
                    isImage: this.isImage
                }));
                return;
            }

            // Разбиваем файл на чанки
            const chunkSize = config.download.chunkSize;
            const chunks = Math.ceil(this.totalSize / chunkSize);

            // Запускаем загрузку чанков
            for (let i = 0; i < Math.min(chunks, config.download.maxThreads); i++) {
                this.downloadChunk(i * chunkSize, (i + 1) * chunkSize - 1);
            }
        } catch (error) {
            console.error('Ошибка при загрузке:', error);
            this.ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }

    async downloadChunk(start, end) {
        if (start >= this.totalSize) return;
        end = Math.min(end, this.totalSize - 1);

        this.activeThreads++;
        this.sendProgress();

        try {
            const response = await fetch(this.url, {
                headers: {
                    'Range': `bytes=${start}-${end}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error(`Ошибка загрузки чанка: ${response.status} ${response.statusText}`);
            }

            // Получаем данные как поток
            const chunks = [];
            let receivedLength = 0;

            response.body.on('data', (chunk) => {
                chunks.push(chunk);
                receivedLength += chunk.length;
                this.downloadedSize += chunk.length;

                // Отправляем обновление прогресса после каждого полученного чанка данных
                if (Date.now() - this.lastProgressUpdate >= config.download.progressUpdateInterval) {
                    this.sendProgress();
                    this.lastProgressUpdate = Date.now();
                }
            });

            await new Promise((resolve, reject) => {
                response.body.on('end', () => {
                    // Собираем все чанки в один буфер
                    const buffer = Buffer.concat(chunks);
                    this.chunks.push({
                        start: start,
                        buffer: buffer
                    });
                    resolve();
                });

                response.body.on('error', reject);
            });

            this.activeThreads--;
            this.sendProgress();

            // Если все загружено, собираем файл
            if (this.downloadedSize >= this.totalSize) {
                this.completeDownload();
            } else if (this.activeThreads < config.download.maxThreads) {
                // Запускаем следующий чанк
                const nextStart = Math.max(...this.chunks.map(c => c.start)) + config.download.chunkSize;
                this.downloadChunk(nextStart, nextStart + config.download.chunkSize - 1);
            }
        } catch (error) {
            console.error('Ошибка при загрузке чанка:', error);
            this.activeThreads--;
            this.sendProgress();
            this.ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    }

    sendProgress() {
        this.ws.send(JSON.stringify({
            type: 'downloadProgress',
            progress: {
                totalSize: this.totalSize,
                downloadedSize: this.downloadedSize,
                activeThreads: this.activeThreads,
                percent: Math.round((this.downloadedSize / this.totalSize) * 100)
            }
        }));
    }

    completeDownload() {
        // Сортируем чанки по начальной позиции
        this.chunks.sort((a, b) => a.start - b.start);

        // Собираем содержимое
        const buffer = Buffer.concat(this.chunks.map(chunk => chunk.buffer));
        let content;

        if (this.isImage) {
            content = buffer.toString('base64');
        } else {
            content = buffer.toString('utf-8');
        }

        this.ws.send(JSON.stringify({
            type: 'downloadComplete',
            content: content,
            url: this.url,
            isImage: this.isImage
        }));
    }
}

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
    console.log('Новое WebSocket соединение');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'search':
                    const urls = config.keywords[data.keyword.toLowerCase()] || [];
                    ws.send(JSON.stringify({
                        type: 'urlList',
                        urls: urls
                    }));
                    break;

                case 'startDownload':
                    const downloadManager = new DownloadManager(data.url, ws);
                    await downloadManager.start();
                    break;
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
});