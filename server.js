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

        // Получаем данные как поток
        const chunks = [];
        let receivedLength = 0;

        response.body.on('data', (chunk) => {
            chunks.push(chunk);
            receivedLength += chunk.length;
            this.downloadedSize += chunk.length;

            // Отправляем обновление прогресса только если прошло достаточно времени
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