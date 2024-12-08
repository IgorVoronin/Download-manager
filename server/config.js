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
            'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Hubble_ultra_deep_field_high_rez_edit1.jpg/1280px-Hubble_ultra_deep_field_high_rez_edit1.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Magnificent_CME_Erupts_on_the_Sun_-_August_31.jpg/1280px-Magnificent_CME_Erupts_on_the_Sun_-_August_31.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/GOES-16_First_Light_from_Lunar_Transit.gif/1280px-GOES-16_First_Light_from_Lunar_Transit.gif'
        ]
    }
};