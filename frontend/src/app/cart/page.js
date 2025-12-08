// src/app/cart/page.js
import React from 'react';
import CartPageClient from '@/components/CartPageClient';
// Импортируем утилиты для получения настроек с бэкенда
import { getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

/**
 * Генерируем SEO-теги на основе настроек из Django.
 * Это позволяет менять заголовок вкладки "на лету" без пересборки фронтенда.
 */
export async function generateMetadata() {
    // 1. Получаем настройки магазина
    const settings = await getShopSettings();

    // 2. Подготавливаем переменные для шаблона (например, {{site_name}})
    const seoVars = {
        site_name: settings?.site_name || 'BonaFide55'
    };

    // 3. Формируем тексты. Если в админке пусто, используем запасной вариант.
    const title = replaceSeoVariables(settings?.seo_title_cart, seoVars) || 'Корзина';
    const description = replaceSeoVariables(settings?.seo_description_cart, seoVars) || 'Ваша корзина покупок.';

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

export default function CartPage() {
    return <CartPageClient />;
}