// src/app/page.js
// export const dynamic = 'force-dynamic'; // Убираем, чтобы заработал ISR
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

    // Запускаем все запросы параллельно. 
    // Включаем ISR: обновляем кеш каждые 60 секунд.
    const revalidateOptions = { next: { revalidate: 60 } };

    const [banners, categories, dealProduct, productsData, settings] = await Promise.all([
        fetchServerData('/banners/', revalidateOptions),
        fetchServerData('/categories/', revalidateOptions),
        fetchServerData('/deal-of-the-day/', revalidateOptions),
        // Поиск/фильтрация обычно требуют актуальных данных, но если мы хотим ISR для главной без параметров:
        // Если есть searchParams, ISR может не сработать так, как ожидается, или создаст много статики.
        // Для главной страницы без параметров - это будет статика. С параметрами - динамика (Next.js сам разрулит).
        fetchServerData(`/products/?${productParams.toString()}`, revalidateOptions),
        getShopSettings(),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const siteName = settings?.site_name || 'Shop';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': `${siteUrl}/#organization`,
                name: siteName,
                url: siteUrl,
                logo: settings?.logo_url ? {
                    '@type': 'ImageObject',
                    url: settings.logo_url,
                } : undefined,
                // Используем sameAs для соцсетей/Telegram вместо contactPoint
                sameAs: settings?.telegram_channel_url ? [settings.telegram_channel_url] : undefined,
            },
            {
                '@type': 'WebSite',
                '@id': `${siteUrl}/#website`,
                url: siteUrl,
                name: siteName,
                publisher: {
                    '@id': `${siteUrl}/#organization`,
                },
                potentialAction: {
                    '@type': 'SearchAction',
                    target: `${siteUrl}/?search={search_term_string}`,
                    'query-input': 'required name=search_term_string',
                },
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
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
        </>
    );
}