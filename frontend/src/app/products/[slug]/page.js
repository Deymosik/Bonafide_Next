import React from 'react';
import { notFound } from 'next/navigation';
import ProductPageClient from '@/components/ProductPageClient';

// --- НАСТРОЙКИ КЕШИРОВАНИЯ (ISR) ---
export const revalidate = 3600;
export const dynamicParams = true;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (SERVER-SIDE ONLY) ---

const getBaseUrl = () => {
    return process.env.INTERNAL_API_URL || 'http://backend:8000/api';
};

// --- ИЗМЕНЕНИЕ 1: Функция теперь принимает SLUG, а не ID ---
async function getProduct(slug) {
    try {
        // Запрос к API теперь идет по URL /products/<slug>/
        // (убедитесь, что в backend/shop/urls.py стоит <slug:slug>)
        const res = await fetch(`${getBaseUrl()}/products/${slug}/`, {
            next: { revalidate: 3600 }
        });

        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error('Failed to fetch product');
        }

        return res.json();
    } catch (error) {
        console.error(`Error fetching product ${slug}:`, error);
        return null;
    }
}

async function getSettings() {
    try {
        const res = await fetch(`${getBaseUrl()}/settings/`, {
            next: { revalidate: 3600 }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
    }
}

// 3. GENERATE STATIC PARAMS (SSG)
export async function generateStaticParams() {
    try {
        const res = await fetch(`${getBaseUrl()}/products/?page_size=100`);
        const data = await res.json();

        const products = data.results || data;

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
        '{{site_name}}': settings?.site_name || 'BonaFide55',
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
            siteName: settings?.site_name || 'BonaFide55',
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
    const siteName = settings?.site_name || 'Shop';

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
                    availability: product.is_active
                        ? 'https://schema.org/InStock'
                        : 'https://schema.org/OutOfStock',
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