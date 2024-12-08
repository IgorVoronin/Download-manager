module.exports = {
    // Настройки сервера
    port: process.env.PORT || 3000,

    // Настройки загрузки
    download: {
        maxThreads: 3,
        speedLimitPerThread: 1024 * 1024,
        chunkSize: 1024 * 1024
    },

    // Ключевые слова и соответствующие им URL
    keywords: {
        'javascript': [
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/2nd-ed/scope-closures/README.md',
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/2nd-ed/get-started/README.md'
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