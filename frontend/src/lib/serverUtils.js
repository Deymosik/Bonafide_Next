// frontend/src/lib/serverUtils.js

// Определяем правильный URL
const getServerApiUrl = () => {
    // 1. Если задана специальная переменная (в Dockerfile)
    if (process.env.INTERNAL_API_URL) {
        return process.env.INTERNAL_API_URL;
    }
    // 2. Если мы в продакшене (внутри Docker), но переменной нет -> идем к соседу
    if (process.env.NODE_ENV === 'production') {
        return 'http://backend:8000/api';
    }
    // 3. Иначе (локальная разработка npm run dev) -> localhost
    return 'http://127.0.0.1:8000/api';
};

const SERVER_API_URL = getServerApiUrl();

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

    try {
        const res = await fetch(`${SERVER_API_URL}${endpoint}`, fetchOptions);

        if (!res.ok) {
            if (res.status === 404) return null;
            console.error(`Fetch error ${endpoint}: ${res.status}`);
            return null;
        }
        return res.json();
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