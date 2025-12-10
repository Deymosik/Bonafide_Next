// src/app/page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import HomePageClient from '@/components/HomePageClient';
// Импортируем наши новые серверные утилиты
import { fetchServerData, getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

/**
 * 1. Генерация мета-тегов (SEO) на сервере
 * Теперь заголовок страницы берется из админки Django
 */
export async function generateMetadata() {
    const settings = await getShopSettings();
    const seoVars = { site_name: settings?.site_name || 'BonaFide55' };

    // Подставляем переменные в шаблоны (например, {{site_name}})
    const title = replaceSeoVariables(settings?.seo_title_home, seoVars) || 'Главная';
    const description = replaceSeoVariables(settings?.seo_description_home, seoVars) || 'Лучшие товары и аксессуары.';

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
            type: 'website',
            // Можно добавить картинку магазина, если она есть в настройках
            images: settings?.images?.[0]?.image_url ? [settings.images[0].image_url] : [],
        },
    };
}

/**
 * 2. Основной компонент страницы
 */
export default async function HomePage(props) {
    // В Next.js 15 доступ к searchParams асинхронный
    const searchParams = await props.searchParams;

    // Формируем URL для запроса товаров с фильтрами
    const productParams = new URLSearchParams();
    if (searchParams?.category) productParams.append('category', searchParams.category);
    if (searchParams?.ordering) productParams.append('ordering', searchParams.ordering);
    if (searchParams?.search) productParams.append('search', searchParams.search);

    // Запускаем все запросы параллельно для максимальной скорости загрузки
    const [banners, categories, dealProduct, productsData] = await Promise.all([
        fetchServerData('/banners/'),
        fetchServerData('/categories/'),
        fetchServerData('/deal-of-the-day/'),
        fetchServerData(`/products/?${productParams.toString()}`),
    ]);

    return (
        <main>
            <HomePageClient
                banners={banners || []}
                categories={categories || []}
                dealProduct={dealProduct}
                // Проверяем наличие данных, чтобы не сломать рендер
                initialProducts={productsData?.results || []}
                initialNextPage={productsData?.next}
                currentSearchParams={searchParams}
            />
        </main>
    );
}