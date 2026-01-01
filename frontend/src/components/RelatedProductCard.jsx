// src/components/RelatedProductCard.js
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './RelatedProductCard.module.css';

const RelatedProductCard = ({ product }) => {
    const imageUrl = product.main_image_thumbnail_url;
    const price = parseFloat(product.price);

    // Форматтер цен
    const formattedPrice = new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(price);

    return (
        <Link href={`/products/${product.slug}`} className={styles['related-card']}>
            <div className={styles['related-card-image-wrapper']}>
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={product.name}
                        fill
                        sizes="140px"
                        style={{ objectFit: 'cover' }}
                        className={styles['related-card-image']}
                    />
                ) : (
                    <div className={styles['related-card-image-placeholder']}></div>
                )}
            </div>

            <div className={styles['related-card-info']}>
                <p className={styles['related-card-name']}>{product.name}</p>
                <p className={styles['related-card-price']}>
                    {formattedPrice}
                </p>
            </div>
        </Link>
    );
};

export default RelatedProductCard;