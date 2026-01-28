'use client';

import React from 'react';
import Link from 'next/link';
import styles from './CheckoutSummary.module.css';

const CheckoutSummary = ({
    selectionInfo,
    isSubmitting,
    isValid,
    isAgreed,
    setIsAgreed,
    itemsCount
}) => {

    const formatPrice = (val) => new Intl.NumberFormat('ru-RU').format(val || 0);
    const total = selectionInfo?.final_total || 0;
    const count = itemsCount || selectionInfo?.total_items || 0;

    return (
        <div className={styles['summary-card']}>
            <h2 className={styles['summary-title']}>Ваш заказ</h2>

            <div className={styles['summary-rows']}>
                <div className={styles['row']}>
                    <span>Товары ({count})</span>
                    <span>{formatPrice(total)} ₽</span>
                </div>
                <div className={`${styles['row']} ${styles['total']}`}>
                    <span className={styles['total-label']}>Итого к оплате</span>
                    <span className={styles['total-value-large']}>{formatPrice(total)} ₽</span>
                </div>
            </div>

            <div className={styles['agreement-container']}>
                <input
                    type="checkbox"
                    id="agreement-checkbox"
                    className={styles['agreement-checkbox']}
                    checked={isAgreed}
                    onChange={(e) => setIsAgreed(e.target.checked)}
                />
                <label htmlFor="agreement-checkbox" className={styles['agreement-label']}>
                    Я согласен с условиями <Link href="/legal/offer" className={styles['agreement-link']}>Оферты</Link> и <Link href="/legal/privacy" className={styles['agreement-link']}>Политикой конфиденциальности</Link>
                </label>
            </div>

            <button
                type="submit"
                className={styles['submit-btn']}
                disabled={!isValid || !isAgreed || isSubmitting}
            >
                {isSubmitting ? 'Оформление...' : 'Оформить заказ'}
            </button>
        </div>
    );
};

export default CheckoutSummary;
