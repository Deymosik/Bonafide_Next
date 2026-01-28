// frontend/src/lib/serverUtils.js

// Определяем правильный URL
const getServerApiUrl = () => {
    // 1. Приоритет: Специальная переменная для Docker (чтобы обойти локальные конфиги)
    if (process.env.DOCKER_INTERNAL_URL) {
        return process.env.DOCKER_INTERNAL_URL;
    }
    // 2. Стандартная переменная
    if (process.env.DJANGO_API_URL) {
        return process.env.DJANGO_API_URL;
    }
    // 3. Fallback
    return 'http://127.0.0.1:8000';
};
const API_BASE = getServerApiUrl();
// Убираем лишний слэш если он есть, и добавляем /api
const SERVER_API_URL = `${API_BASE.replace(/\/$/, '')}/api`;

/**
 * Универсальная функция для получения данных с API на сервере
 */
export async function fetchServerData(endpoint, options = {}) {
    // Если настройки кеширования не переданы явно, то по умолчанию отключаем кеш (no-store)
    // Но если передали revalidate (ISR), то 'no-store' ставить нельзя, иначе будет ошибка.
    const fetchOptions = { ...options };
    if (!fetchOptions.cache && !fetchOptions.next) {
        fetchOptions.cache = 'no-store';
    }

    // ВАЖНО: Подменяем Host заголовок, чтобы Django генерировал ссылки как для localhost:8000,
    // а не для backend:8000 (который не доступен из браузера).
    fetchOptions.headers = {
        ...fetchOptions.headers,
        'Host': 'localhost:8000',
    };

    try {
        const res = await fetch(`${SERVER_API_URL}${endpoint}`, fetchOptions);

        if (!res.ok) {
            if (res.status === 404) return null;
            console.error(`Fetch error ${endpoint}: ${res.status}`);
            return null;
        }
        // Читаем ответ как текст, чтобы "на лету" подменить внутренние домены Docker на localhost
        const text = await res.text();
        const safeText = text.replace(/http:\/\/backend:8000/g, 'http://localhost:8000');

        try {
            return JSON.parse(safeText);
        } catch (e) {
            console.error(`JSON Parse error ${endpoint}`, e);
            return null;
        }
    } catch (error) {
        console.error(`Network error ${endpoint} (${SERVER_API_URL}):`, error.message);
        return null;
    }
}

/**
 * Функция для замены переменных в SEO шаблонах
 * Пример: "Купить {{product_name}}" -> "Купить iPhone 15"
 */
export function replaceSeoVariables(template, variables) {
    if (!template) return '';

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        // Заменяем все вхождения {{key}} на value
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
}

/**
 * Получение глобальных настроек магазина
 * По умолчанию кешируем на 1 час (3600 сек), так как настройки меняются редко.
 */
export async function getShopSettings(options = { next: { revalidate: 3600 } }) {
    return fetchServerData('/settings/', options);
}