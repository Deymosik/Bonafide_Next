'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CheckIcon from '@/assets/check-icon.svg';
import ShareButton from '@/components/ui/ShareButton';
import styles from './CartItem.module.css';
import { MAX_QUANTITY } from '@/context/CartContext';

// Standalone Checkbox Component
const CustomCheckbox = ({ checked, onChange }) => (
    <div
        className={`${styles['custom-checkbox']} ${checked ? styles['checked'] : ''}`}
        onClick={(e) => {
            e.stopPropagation();
            onChange && onChange();
        }}
    >
        <CheckIcon />
    </div>
);

const CartItem = ({ item, isSelected, onToggleSelection, onUpdateQuantity }) => {
    const router = useRouter();

    const formatPrice = (val) => new Intl.NumberFormat('ru-RU').format(val);

    const handleNavigate = () => {
        router.push(`/products/${item.product.slug}`);
    };

    return (
        <div className={styles['cart-item']}>
            <div className={styles['cart-item-content-wrapper']} onClick={handleNavigate}>
                {/* Checkbox separate layout for desktop */}
                <div className={styles['checkbox-wrapper']}>
                    <CustomCheckbox
                        checked={isSelected}
                        onChange={() => onToggleSelection(item.product.id)}
                    />
                </div>

                <div className={styles['cart-item-image-container']}>
                    <Image
                        src={item.product.main_image_thumbnail_url}
                        alt={item.product.name}
                        width={100}
                        height={100}
                        className={styles['cart-item-img']}
                        style={{ objectFit: 'cover' }}
                    />
                </div>

                <div className={styles['cart-item-info']}>
                    <div className={styles['cart-item-name']}>{item.product.name}</div>
                    <div className={styles['cart-item-price-container']}>
                        {item.discounted_price ? (
                            <>
                                <span className={styles['new-price']}>
                                    {formatPrice(item.discounted_price)} ₽
                                </span>
                                <span className={styles['old-price']}>
                                    {formatPrice(item.original_price)} ₽
                                </span>
                            </>
                        ) : (
                            <span className={styles['normal-price']}>
                                {formatPrice(item.original_price)} ₽
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Row: Share + Quantity */}
            <div className={styles['cart-actions-row']}>
                <ShareButton
                    title={item.product.name}
                    text={`Посмотрите этот товар: ${item.product.name}`}
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/products/${item.product.slug}`}
                    className={styles['share-button-cart']}
                />

                <div className={styles['cart-item-controls']}>
                    <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        aria-label="Уменьшить"
                    >
                        −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= MAX_QUANTITY}
                        aria-label="Увеличить"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartItem;
