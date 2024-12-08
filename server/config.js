module.exports = {
    // Настройки сервера
    port: process.env.PORT || 3000,

    // Настройки загрузки
    download: {
        maxThreads: 3, // Максимальное количество одновременных потоков
        speedLimitPerThread: 1024 * 1024, // Ограничение скорости на поток (1 MB/s)
        chunkSize: 1024 * 1024 // Размер чанка для загрузки (1 MB)
    },

    // Ключевые слова и соответствующие им URL
    keywords: {
        'javascript': [
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/master/scope%20%26%20closures/README.md',
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/master/this%20%26%20object%20prototypes/README.md'
        ],
        'python': [
            'https://raw.githubusercontent.com/python/cpython/main/README.rst',
            'https://raw.githubusercontent.com/python/peps/master/pep-0001.txt'
        ],
        'linux': [
            'https://raw.githubusercontent.com/torvalds/linux/master/README',
            'https://raw.githubusercontent.com/torvalds/linux/master/CREDITS'
        ]
    }
};