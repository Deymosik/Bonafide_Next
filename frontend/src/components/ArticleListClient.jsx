'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api';
import ArticleCard from './ArticleCard'; // Убедитесь, что этот компонент существует и адаптирован
import styles from '../app/articles/ArticleListPage.module.css'; // Путь к стилям

const ArticleListClient = ({ initialArticles, initialCategories, initialNextPage }) => {
    const [articles, setArticles] = useState(initialArticles);
    const [nextPage, setNextPage] = useState(initialNextPage);
    const [loadingMore, setLoadingMore] = useState(false);

    // Хуки Next.js для работы с URL
    const router = useRouter();
    const searchParams = useSearchParams();

    const activeCategory = searchParams.get('category') || 'all';
    const activeSort = searchParams.get('sort') || 'new';

    // Обновляем состояние при смене пропсов (фильтров)
    useEffect(() => {
        setArticles(initialArticles);
        setNextPage(initialNextPage);
    }, [initialArticles, initialNextPage]);

    // Бесконечный скролл
    const observer = useRef();
    const loadMoreArticles = useCallback(async () => {
        if (!nextPage || loadingMore) return;

        setLoadingMore(true);
        try {
            // Важно: apiClient.get(nextPage) может не сработать, если nextPage — полный URL.
            // Лучше передавать относительный путь или использовать axios baseURL корректно.
            // Обычно API возвращает полный URL, поэтому:
            const response = await apiClient.get(nextPage);

            // В зависимости от структуры ответа (вложен ли он в .articles)
            const newArticles = response.data.articles ? response.data.articles.results : response.data.results;
            const newNext = response.data.articles ? response.data.articles.next : response.data.next;

            setArticles(prev => [...prev, ...newArticles]);
            setNextPage(newNext);
        } catch (error) {
            console.error("Ошибка при подгрузке статей:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [nextPage, loadingMore]);

    const lastArticleElementRef = useCallback(node => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                loadMoreArticles();
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, nextPage, loadMoreArticles]);

    // Обработчики кликов (обновляют URL)
    const updateParams = (key, value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all' || value === 'new') { // Значения по умолчанию можно удалять для чистоты URL
            params.delete(key);
            if (value !== 'all' && value !== 'new') params.set(key, value); // логика чуть сложнее, упростим:
        }

        // Просто перезаписываем
        if (value === 'all' && key === 'category') params.delete('category');
        else params.set(key, value);

        router.replace(`/articles?${params.toString()}`, { scroll: false });
    };

    return (
        <div className={styles['article-list-page']}>
            <div className={`${styles['blog-nav']} sticky-top-safe`}>
                <div className={styles['categories-scroll-container']}>
                    <div className={styles['categories-scroll-inner']}>
                        <button
                            className={`${styles['category-chip']} ${activeCategory === 'all' ? styles['active'] : ''}`}
                            onClick={() => updateParams('category', 'all')}
                        >
                            Все
                        </button>
                        {initialCategories.map(cat => (
                            <button
                                key={cat.slug}
                                className={`${styles['category-chip']} ${activeCategory === cat.slug ? styles['active'] : ''}`}
                                onClick={() => updateParams('category', cat.slug)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles['sort-tabs']}>
                    <button
                        className={`${styles['sort-tab']} ${activeSort === 'new' ? styles['active'] : ''}`}
                        onClick={() => updateParams('sort', 'new')}
                    >
                        Новые
                    </button>
                    <button
                        className={`${styles['sort-tab']} ${activeSort === 'popular' ? styles['active'] : ''}`}
                        onClick={() => updateParams('sort', 'popular')}
                    >
                        Популярные
                    </button>
                </div>
            </div>

            <div className={styles['articles-grid']}>
                {articles.length > 0 ? (
                    articles.map((article, index) => (
                        <div ref={articles.length === index + 1 ? lastArticleElementRef : null} key={article.slug}>
                            <ArticleCard article={article} />
                        </div>
                    ))
                ) : (
                    <p className={styles['not-found-message']}>Статьи не найдены.</p>
                )}
                {loadingMore && <p style={{textAlign: 'center', color: '#888'}}>Загружаем ещё...</p>}
            </div>
        </div>
    );
};

export default ArticleListClient;