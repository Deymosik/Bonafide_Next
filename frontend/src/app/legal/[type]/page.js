// src/app/legal/[type]/page.js
import React from 'react';
import { notFound } from 'next/navigation';
import LegalPageClient from '@/components/LegalPageClient';
import { getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

// Вспомогательная функция для получения данных
async function getLegalData(type) {
    const settings = await getShopSettings();

    if (!settings) return null;

    if (type === 'privacy') {
        return {
            title: 'Политика конфиденциальности',
            content: settings.privacy_policy,
            settings
        };
    } else if (type === 'offer') {
        return {
            title: 'Публичная оферта',
            content: settings.public_offer,
            settings
        };
    }

    return null;
}

// Генерация SEO на сервере
export async function generateMetadata(props) {
    const params = await props.params;
    const data = await getLegalData(params.type);

    if (!data) return { title: 'Документ не найден' };

    const seoVars = { site_name: data.settings?.site_name || 'BonaFide55' };
    // Используем шаблон или просто название документа
    const title = `${data.title} | ${seoVars.site_name}`;

    return {
        title: title,
        openGraph: {
            title: title,
            type: 'website',
        }
    };
}

export default async function LegalPage(props) {
    const params = await props.params;
    const data = await getLegalData(params.type);

    if (!data) {
        notFound();
    }

    return <LegalPageClient title={data.title} content={data.content} />;
}