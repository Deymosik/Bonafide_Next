// src/app/checkout/page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import CheckoutPageClient from '@/components/CheckoutPageClient';
import { getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

export async function generateMetadata() {
    const settings = await getShopSettings();
    const seoVars = { site_name: settings?.site_name || 'BonaFide55' };

    const title = replaceSeoVariables(settings?.seo_title_checkout, seoVars) || 'Оформление заказа';
    const description = replaceSeoVariables(settings?.seo_description_checkout, seoVars) || 'Безопасное оформление заказа.';

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

export default function CheckoutPage() {
    return <CheckoutPageClient />;
}