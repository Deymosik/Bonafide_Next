// frontend/src/lib/api.js
import axios from 'axios';

// Функция для динамического выбора URL в зависимости от среды (Docker vs Браузер)
const getBaseUrl = () => {
    // 1. Если код выполняется НА СЕРВЕРЕ (SSR внутри Docker)
    if (typeof window === 'undefined') {
        // Обращаемся к контейнеру по его имени в сети Docker
        // 'backend' - это имя сервиса из docker-compose.yml
        return 'http://backend:8000/api';
    }

    // 2. Если код выполняется В БРАУЗЕРЕ (Client Side)
    // Используем относительный путь. Nginx сам перенаправит /api на бэкенд.
    // Если переменная задана (для локальной разработки), используем её, иначе '/api'
    return process.env.NEXT_PUBLIC_API_URL || '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // Проверка, что код выполняется в браузере, чтобы не сломать SSR
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
        config.headers.Authorization = `tma ${window.Telegram.WebApp.initData}`;
    }
    return config;
});

export default api;