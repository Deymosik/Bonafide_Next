// файл: src/components/InfoCarousel.js
// Язык: JavaScript

import React from 'react';
// 1. ИЗМЕНЕНИЕ: Импортируем компонент Image для оптимизации
import Image from 'next/image';
// 2. ИЗМЕНЕНИЕ: Импортируем стили как объект styles
import styles from './InfoCarousel.module.css';

const InfoCarousel = ({ images }) => {
    // Эта проверка остается без изменений
    if (!images || images.length === 0) { return null; }

    return (
        // 3. ИЗМЕНЕНИЕ: Применяем класс контейнера через объект styles
        <div className={styles['info-carousel-container']}>
            {images.map((img, index) => (
                <div key={index} className={styles['info-carousel-slide']}>
                    {/*
                        4. ВАЖНОЕ ИЗМЕНЕНИЕ: Заменяем <img> на <Image />.
                        - src: используем thumbnail_url, как и было.
                        - fill: картинка растянется на весь родительский блок .info-carousel-slide.
                        - sizes: подсказываем браузеру ширину картинки (на мобильных слайд занимает около 80% ширины).
                        - style: objectFit: 'cover' заменяет CSS свойство.
                    */}
                    <Image
                        src={img.thumbnail_url}
                        alt={img.caption || `Shop image ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 80vw, 400px"
                        style={{ objectFit: 'cover' }}
                    />

                    {img.caption && (
                        <p className={styles['info-carousel-caption']}>{img.caption}</p>
                    )}
                </div>
            ))}
        </div>
    );
};

export default InfoCarousel;