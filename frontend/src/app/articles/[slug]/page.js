// src/app/articles/[slug]/page.js
export const dynamic = 'force-dynamic';
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import ArticlePageClient from '@/components/ArticlePageClient';
import { fetchServerData, getShopSettings, replaceSeoVariables } from '@/lib/serverUtils';

export async function generateMetadata(props) {
    const params = await props.params;

    const [article, settings] = await Promise.all([
        fetchServerData(`/articles/${params.slug}/`),
        getShopSettings()
    ]);

    if (!article) return { title: 'Статья не найдена' };

    const siteName = settings?.site_name || 'BonaFide55';

    const title = `${article.title} | ${siteName}`;

    const seoVars = {
        site_name: siteName,
        article_title: article.title,
    };

    const description = article.meta_description || replaceSeoVariables(settings?.seo_description_blog, seoVars);

    // Prepare SEO variables
    const ogImage = article.og_image_url || article.cover_image_url || '';
    const canonicalUrl = article.canonical_url || `/articles/${article.slug}`;
    return {
        title: title,
        description: description,
        // Каноническая ссылка
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title: title,
            description: description,
            images: [ogImage],
            type: 'article',
            publishedTime: article.published_at,
            authors: article.author?.full_name ? [article.author.full_name] : [],
        }
    };
}

export default async function ArticlePage(props) {
    const params = await props.params;
    const article = await fetchServerData(`/articles/${params.slug}/`);

    if (!article) {
        notFound();
    }

    if (article.content_type === 'EXTERNAL' && article.external_url) {
        redirect(article.external_url);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

    // Получаем настройки для Schema.org
    const settings = await getShopSettings();
    const siteName = settings?.site_name || 'Shop';

    // 2. Формируем Rich Snippet для статьи (с Графом и Хлебными крошками)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BlogPosting',
                headline: article.title,
                image: article.cover_image_url ? [article.cover_image_url] : [],
                datePublished: article.published_at,
                dateModified: article.published_at,
                author: {
                    '@type': 'Person',
                    name: article.author?.full_name || siteName,
                },
                publisher: {
                    '@type': 'Organization',
                    name: siteName,
                    logo: settings?.logo_url ? {
                        '@type': 'ImageObject',
                        url: settings.logo_url,
                    } : undefined,
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
                        name: 'Блог',
                        item: `${siteUrl}/articles`,
                    },
                    {
                        '@type': 'ListItem',
                        position: 3,
                        name: article.title,
                        item: `${siteUrl}/articles/${article.slug}`,
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
            <ArticlePageClient article={article} />
        </>
    );
}