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