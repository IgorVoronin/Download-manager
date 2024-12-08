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
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/2nd-ed/get-started/README.md',
            'https://raw.githubusercontent.com/getify/You-Dont-Know-JS/2nd-ed/scope-closures/README.md'
        ],
        'python': [
            'https://raw.githubusercontent.com/python/cpython/main/README.rst',
            'https://raw.githubusercontent.com/python/peps/master/pep-0001.txt'
        ],
        'linux': [
            'https://raw.githubusercontent.com/torvalds/linux/master/README',
            'https://raw.githubusercontent.com/torvalds/linux/master/CREDITS'
        ],
        'image': [
            'https://upload.wikimedia.org/wikipedia/commons/d/d6/Hubble_ultra_deep_field.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/e/e3/Magnificent_CME_Erupts_on_the_Sun_-_August_31.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/b/bf/GOES-16_First_Light_from_Lunar_Transit.gif'
        ]
    }
};