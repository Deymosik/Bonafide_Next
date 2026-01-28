'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTelegram } from '@/utils/telegram';
import apiClient from '@/lib/api';
import styles from './OrderSuccessPage.module.css';

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
                if (!order) {
                    setError(`Ошибка ${status || 'Network'}: ${detail}`);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    const formatPrice = (val) => Number(val).toLocaleString('ru-RU');

    if (loading) {
        return (
            <div className={styles['success-container']}>
                <div className={styles['receipt-card']} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div style={{ color: 'var(--app-hint-color)' }}>Загрузка чека...</div>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles['success-container']}>
                <div className={styles['receipt-card']}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>😕</div>
                    <h1 style={{ textAlign: 'center', fontSize: '20px', fontWeight: '700' }}>Ошибка</h1>
                    <p style={{ textAlign: 'center', color: 'var(--app-hint-color)', margin: '12px 0' }}>
                        {error || 'Заказ не найден'}
                    </p>
                    <div className={styles['actions-block']}>
                        <Link href="/" className={styles['primary-button']}>На главную</Link>
                    </div>
                </div>
            </div>
        );
    }

    // Calculations
    const totalItems = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
    const subtotal = order.items?.reduce((acc, item) => acc + (parseFloat(item.price_at_purchase) * item.quantity), 0) || 0;
    const deliveryCost = parseFloat(order.delivery_price || 0);
    const discountAmount = parseFloat(order.discount_amount || 0);
    // If API returns discount as separate field, or if we calculate diff between regular_price sum and final

    // Date formatting
    const orderDate = new Date(order.created_at || Date.now());
    const dateStr = orderDate.toLocaleDateString('ru-RU');
    const timeStr = orderDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={styles['success-container']}>

            {/* RECEIPT CARD */}
            <div className={styles['receipt-card']}>

                {/* Header */}
                <header className={styles['receipt-header']}>
                    <div className={styles['brand-name']}>
                        {shopSettings?.site_name || 'BONA FIDE'}
                    </div>
                    <div className={styles['success-icon-wrapper']}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="currentColor" fillOpacity="0.1" />
                            <path d="M7.75 12.75L10.25 15.25L16.25 8.75" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className={styles['order-title']}>Заказ оплачен</h1>
                    <div className={styles['order-meta']}>
                        #{order.id} &bull; {dateStr} {timeStr}
                    </div>
                </header>

                <div className={styles['dashed-divider']} />

                {/* Items */}
                <div className={styles['items-list']}>
                    {order.items?.map((item, idx) => (
                        <div key={item.id || idx} className={styles['item-row']}>
                            <div className={styles['item-name-col']}>
                                <span className={styles['item-name']}>
                                    {item.product?.name || 'Товар удален'}
                                </span>
                                <div className={styles['item-details']}>
                                    {item.quantity} шт x {formatPrice(item.price_at_purchase)} ₽
                                </div>
                            </div>
                            <div className={styles['item-price']}>
                                {formatPrice(item.price_at_purchase * item.quantity)} ₽
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles['dashed-divider']} />

                {/* Summary */}
                <div className={styles['summary-block']}>
                    <div className={styles['summary-row']}>
                        <span>Подытог</span>
                        <span>{formatPrice(subtotal)} ₽</span>
                    </div>

                    {deliveryCost > 0 ? (
                        <div className={styles['summary-row']}>
                            <span>Доставка</span>
                            <span>{formatPrice(deliveryCost)} ₽</span>
                        </div>
                    ) : (
                        <div className={styles['summary-row']}>
                            <span>Доставка</span>
                            <span>Бесплатно</span>
                        </div>
                    )}

                    {discountAmount > 0 && (
                        <div className={`${styles['summary-row']} ${styles['discount']}`}>
                            <span>Скидка</span>
                            <span>-{formatPrice(discountAmount)} ₽</span>
                        </div>
                    )}

                    <div className={styles['total-row']}>
                        <span className={styles['total-label']}>ИТОГО</span>
                        <span className={styles['total-value']}>
                            {formatPrice(order.final_total)} ₽
                        </span>
                    </div>
                </div>

                <div className={styles['dashed-divider']} />

                {/* Delivery Info */}
                <div className={styles['delivery-info']}>
                    <div style={{ marginBottom: '8px' }}>
                        <span className={styles['info-label']}>Покупатель:</span>
                        {order.full_name}, {order.phone}
                    </div>
                    <div>
                        <span className={styles['info-label']}>Адрес доставки:</span>
                        {order.delivery_method === 'pickup'
                            ? 'Самовывоз из магазина'
                            : (order.shipping_address || 'Адрес не указан')}
                    </div>
                </div>

                {/* Deco Barcode */}
                <div className={styles['barcode-sim']} />

            </div>

            {/* Actions */}
            <div className={styles['actions-block']}>
                <Link href="/" className={styles['primary-button']}>
                    Продолжить покупки
                </Link>
            </div>

        </div>
    );
};

export default OrderSuccessPage;
