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

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

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

    async downloadChunk(start, end) {
        if (start >= this.totalSize) return;
        end = Math.min(end, this.totalSize - 1);

        this.activeThreads++;

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

            const chunks = [];
            let receivedLength = 0;

            response.body.on('data', (chunk) => {
                chunks.push(chunk);
                receivedLength += chunk.length;
                this.downloadedSize += chunk.length;

                if (Date.now() - this.lastProgressUpdate >= config.download.progressUpdateInterval) {
                    this.sendProgress();
                    this.lastProgressUpdate = Date.now();
                }
            });

            await new Promise((resolve, reject) => {
                response.body.on('end', () => {
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

            if (this.downloadedSize >= this.totalSize) {
                this.completeDownload();
            } else if (this.activeThreads < config.download.maxThreads) {
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

}

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
    console.log('Новое WebSocket соединение');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            // Обработка сообщений...
        } catch (error) {
            console.error('Ошибка обработки сообщения:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message
            }));
        }
    });
}); 