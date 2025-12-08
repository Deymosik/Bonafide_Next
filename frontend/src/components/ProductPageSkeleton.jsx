// файл: src/components/ProductPageSkeleton.js
// Язык: JavaScript

import React from 'react';
// 1. Импортируем стили как объект
import styles from './ProductPageSkeleton.module.css';

const ProductPageSkeleton = () => {
    return (
        // 2. Заменяем строковые классы на обращение к свойствам объекта styles
        <div className={styles['skeleton-product-page']}>
            {/* Скелетон для слайдера */}
            <div className={`${styles['skeleton-item']} ${styles['skeleton-slider']}`}></div>

            <div className={styles['skeleton-product-details']}>
                {/*
                   3. Объединение нескольких классов.
                   Было: className="skeleton-item skeleton-line skeleton-h1"
                   Стало: используем шаблонную строку для объединения свойств объекта styles.
                */}
                <div className={`${styles['skeleton-item']} ${styles['skeleton-line']} ${styles['skeleton-h1']}`}></div>

                {/* Скелетон для палитры цветов */}
                <div className={styles['skeleton-swatches']}>
                    <div className={`${styles['skeleton-item']} ${styles['skeleton-swatch']}`}></div>
                    <div className={`${styles['skeleton-item']} ${styles['skeleton-swatch']}`}></div>
                    <div className={`${styles['skeleton-item']} ${styles['skeleton-swatch']}`}></div>
                </div>

                {/* Скелетон для цены */}
                <div className={`${styles['skeleton-item']} ${styles['skeleton-line']} ${styles['skeleton-price-main']}`}></div>

                {/* Скелетон для нескольких строк описания */}
                <div className={`${styles['skeleton-item']} ${styles['skeleton-line']}`}></div>
                {/* Inline-стили оставляем как есть, они работают нормально */}
                <div className={`${styles['skeleton-item']} ${styles['skeleton-line']}`} style={{ width: '90%' }}></div>
                <div className={`${styles['skeleton-item']} ${styles['skeleton-line']}`} style={{ width: '70%' }}></div>
            </div>
        </div>
    );
};

export default ProductPageSkeleton;