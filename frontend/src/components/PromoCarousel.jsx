// src/components/PromoCarousel.js
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTelegram } from '../utils/telegram';
import styles from './PromoCarousel.module.css';

const PromoCarousel = ({ banners }) => {
    // ИЗМЕНЕНИЕ: Деструктурируем объект, чтобы получить доступ к самому WebApp
    const { tg } = useTelegram();

    if (!banners || banners.length === 0) {
        return null;
    }

    const handleExternalClick = (url) => {
        // Добавляем проверку, чтобы не падало в обычном браузере (где tg может быть undefined)
        if (url) {
            if (tg && tg.openLink) {
                tg.openLink(url);
            } else {
                // Фолбэк для разработки в браузере
                console.log('Telegram WebApp openLink:', url);
                window.open(url, '_blank');
            }
        }
    };

    return (
        <div className={styles['promo-carousel-container']}>
            {banners.map((banner) => {
                const isInternal = banner.link_url?.startsWith('/');
                const hasLink = !!banner.link_url;

                // Общие внутренности карточки
                const CardContent = () => (
                    <>
                        {banner.image_url && (
                            <Image
                                src={banner.image_url}
                                alt={banner.title || "Акция"}
                                fill
                                sizes="150px"
                                style={{ objectFit: 'cover' }}
                                priority
                                className={styles['promo-image']}
                            />
                        )}
                        <div className={styles['promo-card-content']}>
                            {banner.text_content && (
                                <p
                                    className={styles['promo-card-text']}
                                    style={{ color: banner.text_color }}
                                >
                                    {banner.text_content}
                                </p>
                            )}
                        </div>
                    </>
                );

                const cardClasses = `${styles['promo-card']} ${hasLink ? styles.clickable : ''}`;

                if (isInternal) {
                    return (
                        <Link key={banner.id} href={banner.link_url} className={styles['promo-card-link']}>
                            <div className={cardClasses}>
                                <CardContent />
                            </div>
                        </Link>
                    );
                }

                return (
                    <div
                        key={banner.id}
                        className={cardClasses}
                        onClick={() => hasLink ? handleExternalClick(banner.link_url) : null}
                    >
                        <CardContent />
                    </div>
                );
            })}
        </div>
    );
};

export default PromoCarousel;