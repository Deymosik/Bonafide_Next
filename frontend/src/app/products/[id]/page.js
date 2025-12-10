// src/app/products/[id]/page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import { notFound } from 'next/navigation';
import ProductPageClient from '@/components/ProductPageClient';
import { fetchServerData, getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

export async function generateMetadata(props) {
    const params = await props.params;

    const [product, settings] = await Promise.all([
        fetchServerData(`/products/${params.id}/`),
        getShopSettings()
    ]);

    if (!product) {
        return { title: 'Товар не найден' };
    }

    const seoVars = {
        site_name: settings?.site_name || 'BonaFide55',
        product_name: product.name,
        product_price: new Intl.NumberFormat('ru-RU').format(product.price),
    };

    const title = replaceSeoVariables(
        settings?.seo_title_product || 'Купить {{product_name}} | {{site_name}}',
        seoVars
    );

    const description = replaceSeoVariables(
        settings?.seo_description_product || '{{product_name}} по цене {{product_price}} ₽.',
        seoVars
    );

    return {
        title: title,
        description: description,
        // 1. Добавляем каноническую ссылку (защита от дублей)
        alternates: {
            canonical: `/products/${product.id}`,
        },
        openGraph: {
            title: title,
            description: description,
            images: [
                {
                    url: product.main_image_url || '',
                    width: 800,
                    height: 800,
                    alt: product.name,
                },
            ],
            type: 'website',
        },
    };
}

export default async function ProductPage(props) {
    const params = await props.params;
    const product = await fetchServerData(`/products/${params.id}/`);

    if (!product) {
        notFound();
    }

    // 2. Формируем Rich Snippet (Микроразметку) для товара
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.main_image_url ? [product.main_image_url] : [],
        description: product.description ? product.description.replace(/<[^>]*>?/gm, '').slice(0, 160) : product.name,
        sku: product.id,
        offers: {
            '@type': 'Offer',
            url: `https://bf55.ru/products/${product.id}`, // Лучше использовать process.env.NEXT_PUBLIC_SITE_URL
            priceCurrency: 'RUB',
            price: product.price,
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.is_active
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
        },
    };

    return (
        <>
            {/* Вставка JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ProductPageClient product={product} />
        </>
    );
}