// файл: src/components/PromoCarouselSkeleton.js
// Язык: JavaScript

import React from 'react';
// 1. ИЗМЕНЕНИЕ: Импортируем стили как объект styles
import styles from './PromoCarouselSkeleton.module.css';

// Количество плашек-скелетонов
const SKELETON_COUNT = 4;

const PromoCarouselSkeleton = () => {
    return (
        // 2. ИЗМЕНЕНИЕ: Обращаемся к классам через объект styles
        <div className={styles['promo-carousel-skeleton-container']}>
            {/* Создаем массив из N элементов и рендерим по нему скелетоны */}
            {[...Array(SKELETON_COUNT)].map((_, index) => (
                <div
                    key={index}
                    className={styles['promo-card-skeleton']}
                ></div>
            ))}
        </div>
    );
};

export default PromoCarouselSkeleton;