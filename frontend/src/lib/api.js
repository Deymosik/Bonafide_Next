// frontend/src/lib/api.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Функция получения/создания ID сессии (работает только в браузере)
const getSessionId = () => {
    if (typeof window === 'undefined') return null; // На сервере нет localStorage

    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = uuidv4(); // Генерируем новый UUID
        localStorage.setItem('session_id', sessionId); // Сохраняем навсегда
    }
    return sessionId;
};

// Функция для динамического выбора URL в зависимости от среды (Docker vs Браузер)
const getBaseUrl = () => {
    // 1. Если код выполняется НА СЕРВЕРЕ (SSR внутри Docker)
    if (typeof window === 'undefined') {
        // Используем переменную окружения (которую мы прокинули в docker-compose)
        // Приоритет: DOCKER_INTERNAL_URL (чтобы обойти .env.local) -> DJANGO_API_URL -> фолбэк
        const serverUrl = process.env.DOCKER_INTERNAL_URL || process.env.DJANGO_API_URL || 'http://backend:8000';
        return `${serverUrl}/api`;
    }

    // 2. Если код выполняется В БРАУЗЕРЕ (Client Side)
    // Используем относительный путь. Nginx сам перенаправит /api на бэкенд.
    const clientUrl = process.env.NEXT_PUBLIC_API_URL || '';
    // Если URL задан (например http://localhost:8000), добавляем /api, если его там нет
    if (clientUrl && !clientUrl.endsWith('/api')) {
        return `${clientUrl}/api`;
    }
    return clientUrl || '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // Проверка, что код выполняется в браузере
    if (typeof window !== 'undefined') {
        // 1. Если есть Telegram InitData - добавляем её (приоритетная авторизация)
        if (window.Telegram?.WebApp?.initData) {
            config.headers.Authorization = `tma ${window.Telegram.WebApp.initData}`;
        }
    } else {
        // НА СЕРВЕРЕ (SSR)
        // Подменяем Host, чтобы Django возвращал правильные URL картинок (localhost:8000)
        config.headers['Host'] = 'localhost:8000';
    }

    // 2. Добавляем Session ID (для обычных браузеров или как фолбэк)
    const sessionId = getSessionId();
    if (sessionId) {
        config.headers['X-Session-ID'] = sessionId;
    }
    return config;
});

export default api;