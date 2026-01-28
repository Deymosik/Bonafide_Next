// файл: src/components/ImageSlider.js
// Язык: JavaScript

"use client"; // 1. Обязательно: компонент интерактивный

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // 2. Импортируем компонент Image для оптимизации
import styles from './ImageSlider.module.css'; // 3. Импортируем стили как объект

const ImageSlider = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [images]);

    const goToPrevious = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    // Проверка на случай, если массив картинок пуст
    if (!images || images.length === 0) {
        // Применяем класс через объект styles
        return <div className={`${styles['slider-container']} ${styles['empty-slider']}`}></div>;
    }

    return (
        <div className={styles['slider-container']}>
            {/* Стрелки для навигации */}
            <div
                className={`${styles.arrow} ${styles['left-arrow']}`}
                onClick={goToPrevious}
            >
                ❮
            </div>
            <div
                className={`${styles.arrow} ${styles['right-arrow']}`}
                onClick={goToNext}
            >
                ❯
            </div>

            {/*
               4. ЗАМЕНА: Вместо div с backgroundImage используем контейнер + Next Image.
               Это значительно ускоряет загрузку (LCP) и улучшает SEO.
            */}
            <div className={styles.slide}>
                <Image
                    src={images[currentIndex]}
                    alt={`Slide ${currentIndex + 1}`}
                    fill // Растягивает картинку на весь родительский блок .slide
                    style={{ objectFit: 'cover' }} // Аналог background-size: cover
                    sizes="(max-width: 768px) 100vw, 800px" // Подсказка браузеру для выбора размера
                    priority={currentIndex === 0} // Первая картинка грузится сразу (без lazy load)
                />
            </div>

            <div className={styles['dots-container']}>
                {images.map((_, slideIndex) => (
                    <div
                        key={slideIndex}
                        className={`${styles.dot} ${currentIndex === slideIndex ? styles.active : ''}`}
                        onClick={() => setCurrentIndex(slideIndex)}
                    >
                        ●
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ImageSlider;