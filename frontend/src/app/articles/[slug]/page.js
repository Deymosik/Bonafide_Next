// src/app/articles/[slug]/page.js
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

    const title = article.meta_title
        ? article.meta_title
        : `${article.title} | ${siteName}`;

    const seoVars = {
        site_name: siteName,
        article_title: article.title,
    };

    const description = article.meta_description || replaceSeoVariables(settings?.seo_description_blog, seoVars);

    return {
        title: title,
        description: description,
        // 1. Каноническая ссылка
        alternates: {
            canonical: `/articles/${article.slug}`,
        },
        openGraph: {
            title: title,
            description: description,
            images: [article.cover_image_url || ''],
            type: 'article',
            publishedTime: article.published_at,
            authors: article.author ? [`${article.author.first_name} ${article.author.last_name}`] : [],
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

    // 2. Формируем Rich Snippet для статьи
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.meta_title || article.title,
        image: article.cover_image_url ? [article.cover_image_url] : [],
        datePublished: article.published_at,
        dateModified: article.published_at,
        author: {
            '@type': 'Person',
            name: article.author ? `${article.author.first_name} ${article.author.last_name}` : 'BonaFide55',
        },
        publisher: {
            '@type': 'Organization',
            name: 'BonaFide55',
            logo: {
                '@type': 'ImageObject',
                url: 'https://bf55.ru/icon.png' // Ссылка на логотип
            }
        }
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