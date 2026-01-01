// файл: src/components/ArticleCard.js
// Язык: JavaScript

import React from 'react';
// 1. ИЗМЕНЕНИЕ: Импортируем Link и Image из Next.js
import Link from 'next/link';
import Image from 'next/image';

// 2. ИЗМЕНЕНИЕ: Импортируем стили как объект `styles`
import styles from './ArticleCard.module.css';

// Этот компонент не использует хуки, поэтому он может быть Серверным Компонентом.
// Директиву "use client" добавлять НЕ НУЖНО.
const ArticleCard = ({ article }) => {
    // Логика форматирования даты остается без изменений, она работает и на сервере.
    const publicationDate = new Date(article.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        // 3. ИЗМЕНЕНИЕ: Используем Link из Next.js с атрибутом `href`
        <Link href={`/articles/${article.slug}`} className={styles['article-card-link']}>
            <div className={styles['article-card']}>
                <div className={styles['article-card-image-wrapper']}>
                    {article.cover_image_url ? (
                        // 4. 🔥 ГЛАВНОЕ УЛУЧШЕНИЕ: Используем компонент <Image> для SEO и производительности
                        <Image
                            src={article.cover_image_url}
                            alt={article.title}
                            fill // Заполняет родительский контейнер (div-wrapper)
                            style={{ objectFit: 'cover' }} // Аналог CSS object-fit: cover
                            sizes="(max-width: 768px) 100vw, 50vw" // Помогает Next.js выбрать правильный размер картинки
                            className={styles['article-card-image']}
                        />
                    ) : (
                        <div className={styles['article-card-image-placeholder']} />
                    )}
                    {article.is_featured && (
                        <div className={styles['article-card-featured-badge']} title="Закрепленная статья">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={styles['featured-icon']}>
                                <path d="M18 3v2h-2V7.17c0 .53-.21 1.04-.59 1.42L11.83 12.17a2.01 2.01 0 0 1-2.83 0L5.41 8.59A2 2 0 0 1 4.83 7.17V5H2.83V3h15.17zM12 14c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1s1-.45 1-1v-6c0-.55-.45-1-1-1z" opacity=".2" />
                                <path fillRule="evenodd" d="M14.242 2.293a1 1 0 0 1 .707 1.707L13 5.914V19a1 1 0 0 1-2 0V5.914L9.05 4a1 1 0 0 1 .707-1.707l4.485.001zM12 7l1.293-1.293-2.586 0L12 7z" clipRule="evenodd" display="none" />
                                {/* Modern Pin Icon */}
                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className={styles['article-card-info']}>
                    {article.category && <p className={styles['article-card-category']}>{article.category.name}</p>}
                    <h3 className={styles['article-card-title']}>{article.title}</h3>
                    <p className={styles['article-card-date']}>{publicationDate}</p>
                </div>
            </div>
        </Link>
    );
};

export default ArticleCard;