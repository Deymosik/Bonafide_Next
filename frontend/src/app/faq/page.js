export const revalidate = 3600; // Кешируем страницу на 1 час

import React from 'react';
import FaqPageClient from '@/components/FaqPageClient';
// Импортируем наши централизованные утилиты
import { fetchServerData, getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

/**
 * Генерируем SEO для страницы FAQ
 */
export async function generateMetadata() {
    const settings = await getShopSettings();
    const seoVars = { site_name: settings?.site_name || 'BonaFide55' };

    const title = replaceSeoVariables(settings?.seo_title_faq, seoVars) || 'Информация и FAQ';
    const description = replaceSeoVariables(settings?.seo_description_faq, seoVars) || 'Ответы на частые вопросы и информация о магазине.';

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

export default async function FaqPage() {
    // Используем общую функцию запроса данных с кешированием на 1 час
    const faqItems = await fetchServerData('/faq/', { next: { revalidate: 3600 } });

    return <FaqPageClient faqItems={faqItems || []} />;
}