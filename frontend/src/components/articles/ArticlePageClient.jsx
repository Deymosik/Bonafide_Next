// src/components/ArticlePageClient.jsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
// 1. Импортируем useRouter
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify';
import { useTheme } from 'next-themes';

import apiClient from '@/lib/api';
import { useSettings } from '@/context/SettingsContext';
// 2. Импортируем хук Telegram
import { useTelegram } from '@/utils/telegram';
import RelatedProductCard from '@/components/products/RelatedProductCard';

import SunIcon from '@/assets/sun-icon.svg';
import MoonIcon from '@/assets/moon-icon.svg';
import EyeIcon from '@/assets/eye-icon.svg';

import styles from '@/app/articles/[slug]/ArticlePage.module.css';

const ArticlePageClient = ({ article }) => {
    const settings = useSettings();
    const { theme, setTheme, resolvedTheme } = useTheme();
    // 3. Инициализируем роутер и кнопку
    const router = useRouter();
    const { BackButton } = useTelegram();

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 4. ДОБАВЛЕНО: Логика кнопки "Назад" в Telegram
    useEffect(() => {
        if (BackButton) {
            BackButton.show();
            const handleBack = () => router.back();
            BackButton.onClick(handleBack);

            // Очистка при размонтировании компонента (уходе со страницы)
            return () => {
                BackButton.offClick(handleBack);
                BackButton.hide();
            };
        }
    }, [BackButton, router]);

    // Логика счетчика просмотров
    useEffect(() => {
        if (article) {
            const VIEW_COOLDOWN_MS = 10 * 60 * 1000;
            const now = Date.now();
            try {
                const timestamps = JSON.parse(localStorage.getItem('articleViewTimestamps')) || {};
                const lastViewTimestamp = timestamps[article.slug];
                if (!lastViewTimestamp || (now - lastViewTimestamp > VIEW_COOLDOWN_MS)) {
                    apiClient.post(`/articles/${article.slug}/increment-view/`)
                        .catch(err => console.error("Не удалось увеличить счетчик", err));
                    timestamps[article.slug] = now;
                    localStorage.setItem('articleViewTimestamps', JSON.stringify(timestamps));
                }
            } catch (e) {
                console.error("Storage error:", e);
            }
        }
    }, [article]);

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    };

    const publicationDate = new Date(article.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const fontStyle = {
        fontFamily: settings?.article_font_family || 'Exo 2, sans-serif'
    };

    return (
        <article className={styles['article-page']} style={fontStyle}>

            <nav className={styles['breadcrumbs']}>
                <Link href="/">Главная</Link>
                <span className={styles['breadcrumb-separator']}>/</span>
                <Link href="/articles">Блог</Link>
                {article.category && (
                    <>
                        <span className={styles['breadcrumb-separator']}>/</span>
                        <Link href={`/articles?category=${article.category.slug}`} className={styles['breadcrumb-active']}>
                            {article.category.name}
                        </Link>
                    </>
                )}
            </nav>

            <header className={styles['article-header']}>
                <h1 className={styles['article-title']}>{article.title}</h1>

                <div className={styles['article-meta-row']}>
                    <div className={styles['author-block']}>
                        <div className={styles['author-info']}>
                            <span className={styles['author-name']}>
                                {article.author ? `${article.author.first_name} ${article.author.last_name}` : settings?.site_name || process.env.NEXT_PUBLIC_SITE_NAME || 'Shop'}
                            </span>
                            <div className={styles['meta-details']}>
                                <span>{publicationDate}</span>
                                <span className={styles['dot-separator']}>•</span>
                                {article.reading_time > 0 && (
                                    <>
                                        <span>{article.reading_time} мин чтения</span>
                                        <span className={styles['dot-separator']}>•</span>
                                    </>
                                )}
                                <span className={styles['views-count']}>
                                    <EyeIcon className={styles['eye-icon']} />
                                    {article.views_count}
                                </span>
                            </div>
                        </div>
                    </div>

                    {mounted && (
                        <button
                            onClick={toggleTheme}
                            className={styles['theme-toggle-btn']}
                            title={resolvedTheme === 'light' ? "Включить темную тему" : "Включить светлую тему"}
                        >
                            {resolvedTheme === 'light' ? <MoonIcon /> : <SunIcon />}
                        </button>
                    )}
                </div>
            </header>

            {article.cover_image_url && (
                <div className={styles['article-cover-container']}>
                    <Image
                        src={article.cover_image_url}
                        alt={article.title}
                        fill
                        priority
                        className={styles['article-cover-image']}
                        sizes="(max-width: 768px) 100vw, 1000px"
                    />
                </div>
            )}

            <div className={styles['content-wrapper']}>
                <div
                    className={styles['article-content']}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
                />
            </div>

            {article.related_products && article.related_products.length > 0 && (
                <div className={styles['related-products-section']}>
                    <div className={styles['content-wrapper']}>
                        <h2 className={styles['section-title']}>Упомянуто в статье</h2>
                        <div className={styles['related-products-grid']}>
                            {article.related_products.map(product => (
                                <div key={product.id} className={styles['product-card-wrapper']}>
                                    <RelatedProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

export default ArticlePageClient;