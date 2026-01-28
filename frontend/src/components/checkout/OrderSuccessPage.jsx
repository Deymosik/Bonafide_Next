'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LottieAnimation from '@/components/ui/LottieAnimation';
import { useTelegram } from '@/utils/telegram';
import apiClient from '@/lib/api';
import styles from './OrderSuccessPage.module.css';
import defaultSuccessAnimation from '@/assets/lottie/boomstick.json';

const OrderSuccessPage = () => {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { BackButton, MainButton } = useTelegram();
    const [order, setOrder] = useState(null);
    const [shopSettings, setShopSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hide Telegram buttons
    useEffect(() => {
        if (BackButton) BackButton.hide();
        if (MainButton) MainButton.hide();
    }, [BackButton, MainButton]);

    // Fetch data
    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Parallel fetch for speed
                const [orderRes, settingsRes] = await Promise.all([
                    apiClient.get(`/orders/${orderId}/`),
                    apiClient.get('/settings/')
                ]);

                setOrder(orderRes.data);
                setShopSettings(settingsRes.data);
            } catch (err) {
                console.error("Failed to fetch data:", err);
                const status = err.response?.status;
                const detail = err.response?.data?.error || err.message;

                // If we failed to get the order, that's a critical error for this page
                // If settings failed, we can fallback to defaults
                if (!order) {
                    setError(`Ошибка ${status || 'Network'}: ${detail}`);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    // Use dynamic URL from settings if available, otherwise fallback to local asset
    const successAnimationUrl = shopSettings?.order_success_lottie_url || defaultSuccessAnimation;

    if (loading) {
        return (
            <div className={styles['success-container']}>
                <div className={styles['lottie-wrapper']} style={{ opacity: 0.5 }}>
                    {/* Placeholder for loading state */}
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '50%',
                        margin: '0 auto',
                        animation: 'pulse 1.5s infinite'
                    }} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles['success-container']}>
                <div className={styles['success-card']}>
                    {/* Error Icon */}
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
                    <h1 className={styles['success-title']}>Что-то пошло не так</h1>
                    <p className={styles['success-message']}>{error}</p>
                    <div className={styles['actions-block']}>
                        <Link href="/" className={styles['primary-button']}>
                            На главную
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['success-container']}>
            <div className={styles['success-card']}>
                <div className={styles['lottie-wrapper']}>
                    <LottieAnimation
                        src={successAnimationUrl}
                        style={{ width: '100%', height: '100%' }}
                        loop={true}
                    />
                </div>

                <h1 className={styles['success-title']}>Заказ оформлен!</h1>

                {order && (
                    <div className={styles['order-badge']}>
                        Заказ #{order.id}
                    </div>
                )}

                <p className={styles['success-message']}>
                    Мы уже начали собирать ваш заказ. Менеджер свяжется с вами в ближайшее время.
                </p>

                {order && (
                    <div className={styles['order-details-block']}>
                        {/* Receipt Rows */}
                        <div className={styles['detail-row']}>
                            <span className={styles['detail-label']}>Товары</span>
                            <span className={styles['detail-value']}>{order.items?.length || 0} шт.</span>
                        </div>
                        <div className={styles['detail-row']}>
                            <span className={styles['detail-label']}>Доставка</span>
                            <span className={styles['detail-value']}>{order.delivery_method}</span>
                        </div>

                        {/* Final Total */}
                        <div className={styles['total-row']}>
                            <span className={styles['total-label']}>Итого</span>
                            <span className={styles['total-value']}>
                                {Number(order.final_total).toLocaleString('ru-RU')} ₽
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles['actions-block']}>
                <Link href="/" className={styles['primary-button']}>
                    Продолжить покупки
                </Link>
            </div>
        </div>
    );
};

export default OrderSuccessPage;
