// src/app/cart/CartPageClient.js
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { useCart, MAX_QUANTITY } from '@/context/CartContext';
import { useTelegram } from '@/utils/telegram';
import { useSettings } from '@/context/SettingsContext';

import FreeShippingProgressBar from '@/components/FreeShippingProgressBar';
import LottieAnimation from '@/components/LottieAnimation';

import CheckIcon from '@/assets/check-icon.svg';
import TrashIcon from '@/assets/clear-cart-icon.svg';
import defaultCartAnimation from '@/assets/lottie/empty-cart.json';

import styles from '@/app/cart/CartPage.module.css';

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

export default function CartPageClient() {
    const tg = useTelegram();
    const router = useRouter();
    const settings = useSettings();

    const {
        cartItems,
        updateQuantity,
        selectedItems,
        toggleItemSelection,
        toggleSelectAll,
        deleteSelectedItems,
        selectionInfo
    } = useCart();

    const formatPrice = (val) => new Intl.NumberFormat('ru-RU').format(val);

    useEffect(() => {
        if (tg.BackButton) {
            tg.BackButton.show();
            tg.BackButton.onClick(() => router.back());
            return () => {
                tg.BackButton.offClick(() => router.back());
                tg.BackButton.hide();
            };
        }
    }, [router, tg]);

    // Анимация пустой корзины
    if (cartItems.length === 0) {
        return (
            <div className={`${styles['cart-page']} ${styles['empty']}`}>
                    <LottieAnimation
                        src={settings?.cart_lottie_url}
                        animationData={defaultCartAnimation}
                        style={{ width: 200, height: 200, marginBottom: 24 }}
                    />
                <h2 className={styles['empty-cart-title']}>Ваша корзина пуста</h2>
                <p className={styles['empty-cart-subtitle']}>
                    Похоже, вы еще ничего не добавили.
                </p>
                <button
                    className={styles['empty-cart-button']}
                    onClick={() => router.push('/')}
                >
                    Перейти в каталог
                </button>
            </div>
        );
    }

    return (
        /*
           ИСПРАВЛЕНИЕ:
           Убрали класс `sticky-top-safe` отсюда.
           Теперь страница скроллится нормально, ошибка уйдет.
        */
        <div className={styles['cart-page']}>

            {/*
               Если вы хотите, чтобы хедер с кнопкой "Выбрать все" прилипал к верху,
               добавьте sticky-top-safe СЮДА:
            */}
            <div className={`${styles['cart-actions-header']} sticky-top-safe`}>
                <div className={styles['select-all-container']} onClick={toggleSelectAll}>
                    <div
                        className={`${styles['custom-checkbox']} ${selectedItems.size === cartItems.length ? styles['checked'] : ''}`}
                        style={{position: 'static', margin: 0}}
                    >
                        <CheckIcon />
                    </div>
                    <span>Выбрать все</span>
                </div>
                <div className={styles['action-buttons']}>
                    {selectedItems.size > 0 && (
                        <button onClick={deleteSelectedItems} title="Удалить выбранное">
                            <TrashIcon />
                        </button>
                    )}
                </div>
            </div>

            <FreeShippingProgressBar
                currentAmount={parseFloat(selectionInfo.subtotal || 0)}
                threshold={parseFloat(settings?.free_shipping_threshold || 0)}
            />

            <div className={styles['cart-items']}>
                {cartItems.map(item => (
                    <div key={item.product.id} className={styles['cart-item']}>
                        <div className={styles['cart-item-main']}>
                            <div className={styles['cart-item-image-container']}>
                                <CustomCheckbox
                                    checked={selectedItems.has(item.product.id)}
                                    onChange={() => toggleItemSelection(item.product.id)}
                                />
                                <Image
                                    src={item.product.main_image_thumbnail_url}
                                    alt={item.product.name}
                                    width={90}
                                    height={90}
                                    className={styles['cart-item-img']}
                                    style={{ objectFit: 'cover', borderRadius: '12px' }}
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

                        <div className={styles['cart-item-controls']}>
                            <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>−</button>
                            <span>{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                disabled={item.quantity >= MAX_QUANTITY}
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles['sticky-footer']}>
                {selectionInfo.upsell_hint && (
                    <div className={styles['upsell-hint']}>
                        ✨ {selectionInfo.upsell_hint}
                    </div>
                )}

                <div className={styles['order-summary']}>
                    <div className={styles['summary-row']}>
                        <span>Товары</span>
                        <span>{formatPrice(selectionInfo.subtotal)} ₽</span>
                    </div>
                    {parseFloat(selectionInfo.discount_amount) > 0 && (
                        <div className={`${styles['summary-row']} ${styles['discount']}`}>
                            <span>Скидка ({selectionInfo.applied_rule || 'Акция'})</span>
                            <span>- {formatPrice(selectionInfo.discount_amount)} ₽</span>
                        </div>
                    )}
                    <div className={`${styles['summary-row']} ${styles['final-total']}`}>
                        <span>Итого</span>
                        <span>{formatPrice(selectionInfo.final_total)} ₽</span>
                    </div>
                </div>

                <button
                    className={styles['checkout-btn']}
                    onClick={() => router.push('/checkout')}
                    disabled={selectedItems.size === 0}
                >
                    {selectedItems.size > 0 ? `К оформлению` : 'Выберите товары'}
                </button>
            </div>
        </div>
    );
}