// файл: src/components/ProductGallery.js
// Язык: JavaScript

"use client"; // 1. Обязательно: Используются хуки и Swiper

import React, { useState } from 'react';
// 2. Импортируем Image для оптимизации
import Image from 'next/image';

// Импорты Swiper и Lightbox остаются прежними
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// 3. Импортируем стили как объект
import styles from './ProductGallery.module.css';

// Используем деструктуризацию для значения по умолчанию
const ProductGallery = ({ images, productName = 'Товар' }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const lightboxSlides = images.map(img => ({ src: img.image_url }));

    return (
        <>
            <Swiper
                modules={[Pagination, A11y]}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{ clickable: true }}
                // 4. Применяем класс через CSS Modules
                className={styles['product-swiper']}
            >
                {images.map((image, index) => (
                    <SwiperSlide key={index} onClick={() => openLightbox(index)}>
                        {/*
                           5. Оптимизация изображения:
                           - Оборачиваем Image в div с position: relative (хотя SwiperSlide обычно сам так ведет себя,
                             явная обертка надежнее для 'fill').
                           - Используем 'contain', чтобы фото товара влезало полностью.
                        */}
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <Image
                                src={image.thumbnail_url}
                                alt={`${productName} - вид ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                style={{ objectFit: 'contain' }}
                                // Первый слайд грузим сразу (для SEO и скорости), остальные - лениво
                                priority={index === 0}
                            />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={lightboxSlides}
                index={currentIndex}
            />
        </>
    );
};

export default ProductGallery;