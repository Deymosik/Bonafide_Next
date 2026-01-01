// frontend/src/app/sitemap.js
import { fetchServerData } from '@/lib/serverUtils';

// Базовый URL вашего сайта (из .env)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default async function sitemap() {
    // Опции кеширования: обновлять sitemap каждый час
    const cacheOptions = { next: { revalidate: 3600 } };

    // 1. Получаем все товары и статьи с кешированием
    const productsData = await fetchServerData('/products/?page_size=1000', cacheOptions);
    const articlesData = await fetchServerData('/articles/?page_size=1000', cacheOptions);

    const products = productsData?.results || [];
    // API для статей возвращает вложенную структуру: { articles: { results: [...] } }
    const articles = articlesData?.articles?.results || articlesData?.results || [];

    // 2. Формируем URL для товаров
    const productUrls = products.map((product) => ({
        url: `${BASE_URL}/products/${product.slug}`,
        lastModified: new Date(product.created_at || Date.now()),
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