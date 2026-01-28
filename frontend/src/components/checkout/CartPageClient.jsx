'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useCart } from '@/context/CartContext';
import { useTelegram } from '@/utils/telegram';
import { useSettings } from '@/context/SettingsContext';

import FreeShippingProgressBar from '@/components/ui/FreeShippingProgressBar';
import LottieAnimation from '@/components/ui/LottieAnimation';

import CheckIcon from '@/assets/check-icon.svg';
import TrashIcon from '@/assets/clear-cart-icon.svg';
import defaultCartAnimation from '@/assets/lottie/empty-cart.json';

import styles from '@/app/cart/CartPage.module.css';

// Components
import CartItem from '@/components/checkout/CartItem';
import OrderSummary from '@/components/checkout/OrderSummary';

// Local Checkbox for "Select All"
const CustomCheckbox = ({ checked, onChange, label }) => (
    <div className={styles['select-all-container']} onClick={onChange}>
        <div className={`${styles['custom-checkbox']} ${checked ? styles['checked'] : ''}`}>
            <CheckIcon />
        </div>
        {label && <span>{label}</span>}
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

    // Empty State
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
        <div className={styles['cart-page']}>
            {/* Page Title for Desktop - could be hidden on mobile if desired */}
            <h1 className={styles['page-title']}>Корзина <span className={styles['item-count']}>{cartItems.length}</span></h1>

            <div className={styles['cart-layout']}>
                {/* Left Column: List */}
                <div className={styles['cart-list-column']}>

                    {/* Actions Header */}
                    <div className={styles['cart-actions-header']}>
                        <CustomCheckbox
                            checked={selectedItems.size === cartItems.length}
                            onChange={toggleSelectAll}
                            label="Выбрать все"
                        />
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

                    <div className={styles['cart-items-list']}>
                        {cartItems.map(item => (
                            <CartItem
                                key={item.product.id}
                                item={item}
                                isSelected={selectedItems.has(item.product.id)}
                                onToggleSelection={toggleItemSelection}
                                onUpdateQuantity={updateQuantity}
                            />
                        ))}
                    </div>
                </div>

                {/* Right Column: Summary */}
                <div className={styles['cart-summary-column']}>
                    <OrderSummary
                        selectionInfo={selectionInfo}
                        onCheckout={() => router.push('/checkout')}
                        isCheckoutDisabled={selectedItems.size === 0}
                    />
                </div>
            </div>
        </div>
    );
}