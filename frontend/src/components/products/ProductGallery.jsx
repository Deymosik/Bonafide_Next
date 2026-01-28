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
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <Image
                                src={image.thumbnail_url}
                                alt={`${productName} - вид ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                style={{ objectFit: 'contain' }}
                                priority={index === 0}
                            />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* --- Desktop Grid Layout --- */}
            <div className={styles['gallery-desktop-grid']}>
                {/* Main Large Image */}
                {images.length > 0 && (
                    <div className={styles['gallery-main-image']} onClick={() => openLightbox(0)}>
                        <Image
                            src={images[0].thumbnail_url}
                            alt={`${productName} - Main`}
                            fill
                            sizes="(min-width: 1024px) 700px, 100vw"
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </div>
                )}

                {/* Thumbnails Grid (starting from index 1 if you want separate, but usually best to show all or extra) */}
                {/* Let's show secondary images in a grid below */}
                {images.length > 1 && (
                    <div className={styles['gallery-thumbnails-grid']}>
                        {images.slice(1).map((image, index) => (
                            <div key={index + 1} className={styles['gallery-thumbnail']} onClick={() => openLightbox(index + 1)}>
                                <Image
                                    src={image.thumbnail_url}
                                    alt={`${productName} - ${index + 2}`}
                                    fill
                                    sizes="300px"
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

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