// src/components/ProductCard.js
import React from 'react';
import Image from 'next/image';
import styles from './ProductCard.module.css';

// ВАЖНО: Этот компонент чисто презентационный.
// Ссылка формируется в родительском компоненте (например, HomePageClient или RelatedProductCard).
// Но если бы мы делали ссылку здесь, она была бы такой:
// href={`/products/${product.slug}`}

// Оставляем код как есть, так как в вашем HomePageClient ссылка делается вокруг карточки.
// Убедитесь, что в HomePageClient.jsx вы заменили:
// <Link href={`/products/${product.id}`} ...>
// на
// <Link href={`/products/${product.slug}`} ...>
// <Link href={`/products/${product.slug}`} ...>
const ProductCard = ({ product, priority = false, searchQuery = '' }) => {
    if (!product) return null;

    // Хелпер для превращения абсолютных локальных ссылок в относительные
    // Это решает проблему "resolved to private ip" в Next.js Image Optimization
    const getSafeImageUrl = (url) => {
        if (!url) return null;
        try {
            // Если ссылка ведет на локальный бэкенд (127.0.0.1 или localhost),
            // обрезаем домен, чтобы использовать прокси Next.js (/media/...)
            const urlObj = new URL(url);
            if (['127.0.0.1', 'localhost'].includes(urlObj.hostname)) {
                return urlObj.pathname + urlObj.search;
            }
            return url;
        } catch (e) {
            return url;
        }
    };

    const imageUrl = getSafeImageUrl(product.main_image_thumbnail_url);
    const price = Number(product.price);
    const regularPrice = Number(product.regular_price);
    const hasDiscount = regularPrice > price;

    const formatPrice = (value) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 0,
        }).format(value);

    // Функция подсветки текста
    const highlightText = (text, highlight) => {
        if (!highlight || !highlight.trim()) {
            return text;
        }
        // Экранируем спецсимволы, чтобы не сломать регулярку
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) =>
            regex.test(part) ? (
                <span key={index} className={styles.highlight}>
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    return (
        <div className={styles['product-card']}>
            <div className={styles['product-image-container']}>
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className={styles['product-image']}
                        // 2. Передаем этот проп в Image
                        priority={priority}
                    />
                ) : (
                    <div className={styles['product-image-placeholder']} />
                )}

                {/* --- STOCK OVERLAY --- */}
                {['OUT_OF_STOCK', 'DISCONTINUED'].includes(product.availability_status) && (
                    <div className={styles['stock-overlay']}>
                        <span className={styles['stock-label']}>
                            {product.availability_status === 'OUT_OF_STOCK' ? 'Нет в наличии' : 'Снят с производства'}
                        </span>
                    </div>
                )}

                {product.availability_status === 'PRE_ORDER' && (
                    <div className={styles['pre-order-badge']}>
                        Предзаказ
                    </div>
                )}

                {/* Остальной код без изменений... */}
                {product.info_panels && product.info_panels.length > 0 && (
                    <div className={styles['info-panels']}>
                        {product.info_panels.map((panel) => (
                            <span
                                key={panel.name}
                                className={styles['info-panel']}
                                style={{
                                    backgroundColor: panel.color || '#000',
                                    color: panel.text_color || '#fff'
                                }}
                            >
                                {panel.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles['product-info']}>
                <h3 className={styles['product-name']}>
                    {highlightText(product.name, searchQuery)}
                </h3>

                <div className={styles['price-container']}>
                    {hasDiscount ? (
                        <>
                            <span className={styles['price-current']}>
                                {formatPrice(price)}
                            </span>
                            <span className={styles['price-old']}>
                                {formatPrice(regularPrice)}
                            </span>
                        </>
                    ) : (
                        <span className={styles['price-regular']}>
                            {formatPrice(price)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCard;