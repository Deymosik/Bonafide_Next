/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    // Читаем URL бэкенда из переменных окружения, или фолбэк на локалхост
    env: {
        DJANGO_API_URL: process.env.DJANGO_API_URL || 'http://127.0.0.1:8000',
    },

    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: '127.0.0.1',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/media/**',
            },
            // Добавьте это для работы внутри Docker (если контейнер называется backend)
            {
                protocol: 'http',
                hostname: 'backend',
                port: '8000',
                pathname: '/media/**',
            },
        ],
        minimumCacheTTL: 60,
    },

    webpack(config) {
        const fileLoaderRule = config.module.rules.find((rule) =>
            rule.test?.test?.('.svg'),
        );

        config.module.rules.push(
            {
                ...fileLoaderRule,
                test: /\.svg$/i,
                resourceQuery: /url/,
            },
            {
                test: /\.svg$/i,
                issuer: fileLoaderRule.issuer,
                resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
                use: ['@svgr/webpack'],
            }
        );

        fileLoaderRule.exclude = /\.svg$/i;

        return config;
    },

    // НАСТРОЙКА ПРОКСИ
    async rewrites() {
        // Берем адрес из переменной окружения
        const API_URL = process.env.DJANGO_API_URL || 'http://127.0.0.1:8000';
        console.log('🚀 Proxying /api requests to:', API_URL);

        return [
            {
                source: '/api/:path*',
                destination: `${API_URL}/api/:path*`, // Проксируем на бэкенд
            },
            {
                source: '/media/:path*',
                destination: `${API_URL}/media/:path*`, // Проксируем медиафайлы
            },
        ];
    },
};

module.exports = nextConfig;