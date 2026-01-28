import React from 'react';
import { notFound } from 'next/navigation';
import ProductPageClient from '@/components/pages/ProductPageClient';

// --- НАСТРОЙКИ КЕШИРОВАНИЯ (ISR) ---
// --- НАСТРОЙКИ КЕШИРОВАНИЯ (ISR) ---
// export const revalidate = 0; // Disable cache for debugging
export const revalidate = 3600; // 1 час (оптимально для SEO и производительности)
export const dynamicParams = true;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (SERVER-SIDE ONLY) ---

import { fetchServerData } from '@/lib/serverUtils';

// --- ИЗМЕНЕНИЕ 1: Функция теперь принимает SLUG, а не ID ---
async function getProduct(slug) {
    // Используем централизованную утилиту, которая знает про Docker и 404
    const data = await fetchServerData(`/products/${slug}/`, {
        next: { revalidate: 3600 }
    });
    return data;
}

async function getSettings() {
    return fetchServerData('/settings/', {
        next: { revalidate: 3600 }
    });
}

// 3. GENERATE STATIC PARAMS (SSG)
export async function generateStaticParams() {
    try {
        const data = await fetchServerData('/products/?page_size=100');
        const products = data?.results || data;

        if (!Array.isArray(products)) return [];

        // --- ИЗМЕНЕНИЕ 2: Возвращаем slug для генерации статических страниц ---
        // Next.js будет создавать папки /products/iphone-case, а не /products/1
        return products.map((product) => ({
            slug: product.slug,
        }));
    } catch (e) {
        console.error("SSG Error:", e);
        return [];
    }
}

// --- METADATA (SEO) ---
export async function generateMetadata({ params }) {
    // --- ИЗМЕНЕНИЕ 3: Извлекаем slug из параметров URL ---
    const { slug } = await params;

    const [product, settings] = await Promise.all([
        getProduct(slug), // Передаем slug
        getSettings()
    ]);

    if (!product) {
        return { title: 'Товар не найден' };
    }

    const seoVars = {
        '{{site_name}}': settings?.site_name || process.env.NEXT_PUBLIC_SITE_NAME || 'Shop',
        '{{product_name}}': product.name,
        '{{product_price}}': new Intl.NumberFormat('ru-RU').format(product.price),
    };

    const replaceVars = (text) => {
        if (!text) return '';
        let result = text;
        Object.entries(seoVars).forEach(([key, value]) => {
            result = result.replaceAll(key, value);
        });
        return result;
    };

    const title = replaceVars(settings?.seo_title_product || 'Купить {{product_name}} | {{site_name}}');
    const description = replaceVars(settings?.seo_description_product || '{{product_name}} по цене {{product_price}} ₽.');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bf55.ru';

    return {
        title: title,
        description: description,
        alternates: {
            // --- ИЗМЕНЕНИЕ 4: Каноническая ссылка теперь содержит slug ---
            canonical: `${siteUrl}/products/${product.slug}`,
        },
        openGraph: {
            title: title,
            description: description,
            // --- ИЗМЕНЕНИЕ 5: OG URL тоже использует slug ---
            url: `${siteUrl}/products/${product.slug}`,
            siteName: settings?.site_name || process.env.NEXT_PUBLIC_SITE_NAME || 'Shop',
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

// --- MAIN COMPONENT ---
export default async function ProductPage({ params }) {
    // --- ИЗМЕНЕНИЕ 6: Получаем slug из параметров ---
    const { slug } = await params;
    const product = await getProduct(slug);

    if (!product) {
        notFound();
    }

    // Получаем settings для использования в Schema.org
    const settings = await getSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
    const siteName = settings?.site_name || process.env.NEXT_PUBLIC_SITE_NAME || 'Shop';

    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Product',
                name: product.name,
                image: product.main_image_url ? [product.main_image_url] : [],
                description: product.description
                    ? product.description.replace(/<[^>]*>?/gm, '').slice(0, 300)
                    : product.name,
                sku: product.sku || product.id,
                offers: {
                    '@type': 'Offer',
                    url: `${siteUrl}/products/${product.slug}`,
                    priceCurrency: 'RUB',
                    price: product.price,
                    itemCondition: 'https://schema.org/NewCondition',
                    availability: (() => {
                        const map = {
                            'IN_STOCK': 'https://schema.org/InStock',
                            'OUT_OF_STOCK': 'https://schema.org/OutOfStock',
                            'PRE_ORDER': 'https://schema.org/PreOrder',
                            'DISCONTINUED': 'https://schema.org/Discontinued',
                            'ON_DEMAND': 'https://schema.org/PreOrder',
                        };
                        return map[product.availability_status] || 'https://schema.org/InStock';
                    })(),
                    seller: {
                        '@type': 'Organization',
                        name: siteName
                    }
                },
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Главная',
                        item: siteUrl,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Каталог', // Можно добавить промежуточный пункт
                        item: `${siteUrl}/#catalog`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: product.name,
                        item: `${siteUrl}/products/${product.slug}`,
                    },
                ],
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <ProductPageClient product={product} />
        </>
    );
}