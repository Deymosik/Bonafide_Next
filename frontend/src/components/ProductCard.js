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
const ProductCard = ({ product, priority = false }) => {
    if (!product) return null;

    const imageUrl = product.main_image_thumbnail_url;
    const price = Number(product.price);
    const regularPrice = Number(product.regular_price);
    const hasDiscount = regularPrice > price;

    const formatPrice = (value) =>
        new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 0,
        }).format(value);

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
                <h3 className={styles['product-name']}>{product.name}</h3>

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