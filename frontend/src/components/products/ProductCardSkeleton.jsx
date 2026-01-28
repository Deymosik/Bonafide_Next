// файл: src/components/ProductCardSkeleton.js
// Язык: JavaScript

import React from 'react';
// 1. Импортируем стили как объект
import styles from './ProductCardSkeleton.module.css';

const ProductCardSkeleton = () => {
    return (
        // 2. Заменяем строки на обращение к свойствам объекта styles
        <div className={styles['skeleton-product-card']}>

            <div className={styles['skeleton-image-container']}>
                {/*
                   3. Когда нужно несколько классов сразу, используем шаблонную строку.
                   Здесь объединяем общий класс элемента скелетона и специфичный класс панели.
                */}
                <div className={`${styles['skeleton-item']} ${styles['skeleton-panel-on-image']}`}></div>
            </div>

            <div className={styles['skeleton-info']}>
                <div className={`${styles['skeleton-item']} ${styles['skeleton-title']}`}></div>
                <div className={`${styles['skeleton-item']} ${styles['skeleton-price']}`}></div>
            </div>

        </div>
    );
};

export default ProductCardSkeleton;