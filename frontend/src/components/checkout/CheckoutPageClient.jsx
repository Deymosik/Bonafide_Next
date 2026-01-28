'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';

import { useCart } from '@/context/CartContext';
import { useTelegram } from '@/utils/telegram';
import apiClient from '@/lib/api';

import CheckoutForm from './CheckoutForm';
import CheckoutSummary from './CheckoutSummary';

import styles from '@/app/checkout/CheckoutPage.module.css';

export default function CheckoutPageClient() {
    const { user, showAlert, BackButton } = useTelegram();
    const router = useRouter();
    const { cartItems, selectedItems, selectionInfo, deleteSelectedItems } = useCart();

    const [isAgreed, setIsAgreed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid }
    } = useForm({
        mode: 'onChange',
        defaultValues: {
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            phone: '',
            delivery_method: 'Почта России'
        }
    });

    const deliveryMethod = useWatch({ control, name: 'delivery_method' });

    // Back Button Logic
    useEffect(() => {
        if (BackButton) {
            BackButton.show();
            const handleBackClick = () => router.replace('/cart');
            BackButton.onClick(handleBackClick);
            return () => {
                BackButton.offClick(handleBackClick);
                BackButton.hide();
            };
        }
    }, [BackButton, router]);

    const isOrderSuccess = React.useRef(false);

    // Redirect if cart empty
    useEffect(() => {
        // Если заказ успешно оформлен, не редиректим (пользователь уйдет на success page)
        if (isOrderSuccess.current) return;

        if (selectedItems.size === 0) {
            router.replace('/cart');
        }
    }, [selectedItems, router]);

    const onSubmit = async (formData) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const itemsToOrder = cartItems
            .filter(item => selectedItems.has(item.product.id))
            .map(item => ({ product_id: item.product.id, quantity: item.quantity }));

        const orderData = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            patronymic: formData.patronymic || '',
            phone: formData.phone,
            delivery_method: formData.delivery_method,
            items: itemsToOrder,
            // Logic mapping based on delivery method
            city: formData.delivery_method === 'Почта России' ? formData.post_city : formData.cdek_city,
            district: formData.delivery_method === 'Почта России' ? (formData.post_district || '') : '',
            street: formData.delivery_method === 'Почта России' ? formData.post_street : '',
            house: formData.delivery_method === 'Почта России' ? formData.post_house : '',
            apartment: formData.delivery_method === 'Почта России' ? (formData.post_apartment || '') : '',
            postcode: formData.delivery_method === 'Почта России' ? formData.post_postcode : '',
            cdek_office_address: formData.delivery_method === 'СДЭК' ? formData.cdek_office_address : '',
        };

        try {
            const response = await apiClient.post('/orders/create/', orderData);

            // Устанавливаем флаг успеха, чтобы useEffect не перекинул нас в корзину при очистке
            isOrderSuccess.current = true;
            deleteSelectedItems();

            // Extract order ID from response (backend returns { success: true, order_id: 123 })
            const orderId = response.data?.order_id || '';

            // Redirect to success page
            router.replace(`/checkout/success?orderId=${orderId}`);
        } catch (error) {
            console.error("Order creation failed:", error);
            let errorMessage = 'Произошла ошибка при создании заказа.';
            if (error.response?.data) {
                // Try to extract readable error
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (typeof error.response.data === 'object') {
                    // Quick crude formatting
                    errorMessage = Object.values(error.response.data).flat().join(', ');
                }
            }
            showAlert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const itemsCount = cartItems
        .filter(item => selectedItems.has(item.product.id))
        .reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className={styles['checkout-page']}>
            <h1 className={styles['page-title']}>Оформление заказа</h1>

            <form className={styles['checkout-form']} onSubmit={handleSubmit(onSubmit)}>
                {/* Left Column: Form */}
                <CheckoutForm
                    register={register}
                    control={control}
                    errors={errors}
                    deliveryMethod={deliveryMethod}
                />

                {/* Right Column: Summary & Actions */}
                <CheckoutSummary
                    selectionInfo={selectionInfo}
                    isSubmitting={isSubmitting}
                    isValid={isValid}
                    isAgreed={isAgreed}
                    setIsAgreed={setIsAgreed}
                    itemsCount={itemsCount}
                />
            </form>
        </div>
    );
}