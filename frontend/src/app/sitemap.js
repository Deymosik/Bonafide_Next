// frontend/src/app/sitemap.js
import { fetchServerData } from '@/lib/serverUtils';

// Базовый URL вашего сайта (фронтенда)
const BASE_URL = 'https://bf55.ru'; // ЗАМЕНИТЕ НА ВАШ ДОМЕН

export default async function sitemap() {
    // 1. Получаем все товары (нужно, чтобы API поддерживал пагинацию или all)
    // Для карты сайта лучше сделать отдельный легкий эндпоинт на бэке, но пока возьмем список
    const productsData = await fetchServerData('/products/?page_size=1000');
    const articlesData = await fetchServerData('/articles/?page_size=1000');

    const products = productsData?.results || [];
    const articles = articlesData?.results || [];

    // 2. Формируем URL для товаров
    const productUrls = products.map((product) => ({
        url: `${BASE_URL}/products/${product.id}`,
        lastModified: new Date(product.created_at || Date.now()), // Лучше добавить updated_at в API
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    // 3. Формируем URL для статей
    const articleUrls = articles.map((article) => ({
        url: `${BASE_URL}/articles/${article.slug}`,
        lastModified: new Date(article.published_at),
        changeFrequency: 'weekly',
        priority: 0.7,
    }));

    // 4. Статические страницы
    const routes = [
        '',
        '/cart',
        '/faq',
        '/articles',
    ].map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
    }));

    return [...routes, ...productUrls, ...articleUrls];
}