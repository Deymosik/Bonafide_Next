'use client';

import React from 'react';
import styles from './OrderSummary.module.css';

const OrderSummary = ({ selectionInfo, onCheckout, isCheckoutDisabled }) => {

    const formatPrice = (val) => new Intl.NumberFormat('ru-RU').format(val || 0);

    return (
        <div className={styles['summary-card']}>
            {selectionInfo.upsell_hint && (
                <div className={styles['upsell-hint']}>
                    ✨ {selectionInfo.upsell_hint}
                </div>
            )}

            <div className={styles['order-summary-content']}>
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
                onClick={onCheckout}
                disabled={isCheckoutDisabled}
            >
                {isCheckoutDisabled ? 'Выберите товары' : 'К оформлению'}
            </button>
        </div>
    );
};

export default OrderSummary;
