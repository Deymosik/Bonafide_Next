// frontend/src/lib/serverUtils.js

// URL для серверных запросов (внутри Docker сети или локально)
const SERVER_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Универсальная функция для получения данных с API на сервере
 */
export async function fetchServerData(endpoint) {
    try {
        const res = await fetch(`${SERVER_API_URL}${endpoint}`, {
            cache: 'no-store', // Всегда свежие данные
            // next: { revalidate: 60 } // Можно включить кэширование на 60 сек, если нужно снизить нагрузку
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            console.error(`Fetch error ${endpoint}: ${res.status}`);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error(`Network error ${endpoint}:`, error);
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
 */
export async function getShopSettings() {
    return fetchServerData('/settings/');
}