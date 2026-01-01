// src/components/DealOfTheDay.jsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './DealOfTheDay.module.css';

// Встроенный хук таймера, чтобы не зависеть от внешних файлов
const useDealTimer = (targetDate) => {
    const calculateTimeLeft = () => {
        const difference = new Date(targetDate) - new Date();
        if (difference > 0) {
            return {
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }
        return { hours: 0, minutes: 0, seconds: 0 };
    };

    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    return timeLeft;
};

const DealOfTheDay = ({ product }) => {
    const timeLeft = useDealTimer(product?.deal_ends_at);

    if (!product || !product.deal_ends_at) {
        return null;
    }

    const regularPrice = parseFloat(product.regular_price || product.price); // Цена до скидки
    const dealPrice = parseFloat(product.deal_price); // Цена по акции
    const hasDeal = dealPrice && dealPrice < regularPrice;

    // Если скидки нет или цена акции выше обычной - не показываем компонент
    if (!hasDeal) return null;

    const discountPercent = Math.round(((regularPrice - dealPrice) / regularPrice) * 100);
    const formatPrice = (p) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(p);

    const pad = (n) => n < 10 ? `0${n}` : n;

    return (
        <Link href={`/products/${product.slug}`} className={styles['deal-container']}>
            <div className={styles['deal-image']}>
                {product.main_image_thumbnail_url && (
                    <Image
                        src={product.main_image_thumbnail_url}
                        alt={product.name}
                        fill
                        // Картинка маленькая, подсказываем браузеру
                        sizes="150px"
                        style={{ objectFit: 'cover' }}
                        // ВАЖНО: Это убирает ошибку LCP
                        priority={true}
                    />
                )}
                <div className={styles['deal-discount-badge']}>-{discountPercent}%</div>
            </div>

            <div className={styles['deal-info']}>
                <p className={styles['deal-badge']}>🔥 Товар дня</p>
                <h3 className={styles['deal-name']}>{product.name}</h3>

                <div className={styles['deal-price-wrapper']}>
                    <span className={styles['deal-new-price']}>{formatPrice(dealPrice)} ₽</span>
                    <span className={styles['deal-old-price']}>{formatPrice(regularPrice)} ₽</span>
                </div>

                <div className={styles['deal-countdown']}>
                    <div className={styles['countdown-item']}>
                        <span className={styles['countdown-value']}>{pad(timeLeft.hours)}</span>
                        <span className={styles['countdown-label']}>час</span>
                    </div>
                    <div className={styles['countdown-item']}>
                        <span className={styles['countdown-value']}>{pad(timeLeft.minutes)}</span>
                        <span className={styles['countdown-label']}>мин</span>
                    </div>
                    <div className={styles['countdown-item']}>
                        <span className={styles['countdown-value']}>{pad(timeLeft.seconds)}</span>
                        <span className={styles['countdown-label']}>сек</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default DealOfTheDay;