// src/app/articles/page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import ArticleListClient from '@/components/ArticleListClient';
// Импортируем наши серверные утилиты
import { fetchServerData, getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

/**
 * Генерируем SEO для страницы Блога
 */
export async function generateMetadata() {
    const settings = await getShopSettings();
    const seoVars = { site_name: settings?.site_name || 'BonaFide55' };

    const title = replaceSeoVariables(settings?.seo_title_blog, seoVars) || 'Блог';
    const description = replaceSeoVariables(settings?.seo_description_blog, seoVars) || 'Полезные статьи и обзоры.';

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            type: 'website',
        },
    };
}

export default async function ArticlesPage(props) {
    // В Next.js 15 доступ к searchParams асинхронный
    const searchParams = await props.searchParams;

    // Формируем параметры запроса к API
    const apiParams = new URLSearchParams();

    // Фильтр по категории
    if (searchParams.category && searchParams.category !== 'all') {
        apiParams.append('category', searchParams.category);
    }

    // Сортировка
    if (searchParams.sort === 'popular') {
        apiParams.append('ordering', '-views_count'); // Самые просматриваемые
    } else {
        apiParams.append('ordering', '-published_at'); // Самые свежие (по умолчанию)
    }

    // Делаем запрос к API
    const data = await fetchServerData(`/articles/?${apiParams.toString()}`);

    // Безопасное извлечение данных (если API вернет null или ошибку)
    const serverData = data || {};
    const articlesList = serverData.articles?.results || [];
    const categoriesList = serverData.categories || [];
    const nextPageUrl = serverData.articles?.next || null;

    return (
        <ArticleListClient
            initialArticles={articlesList}
            initialCategories={categoriesList}
            initialNextPage={nextPageUrl}
        />
    );
}