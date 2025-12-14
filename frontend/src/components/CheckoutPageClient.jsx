// src/app/checkout/page.js
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { IMaskInput } from 'react-imask';

import { useCart } from '@/context/CartContext';
import { useTelegram } from '@/utils/telegram';
import { useSettings } from '@/context/SettingsContext';
import apiClient from '@/lib/api';

// SVG как компоненты
import PostRusIcon from '@/assets/post-rus-icon.svg';
import SdekIcon from '@/assets/sdek-icon.svg';

// Импорт стилей
import styles from '../app/checkout/CheckoutPage.module.css';

export default function CheckoutPage() {
    const {
        user,
        showAlert,
        openTelegramLink,
        BackButton,
        onClose
    } = useTelegram();

    const settings = useSettings();
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
            // ИЗМЕНЕНИЕ: Используем || вместо ?? для корректной обработки null/undefined
            firstName: user?.first_name || '',
            lastName: user?.last_name || '',
            delivery_method: 'Почта России'
        }
    });

    const deliveryMethod = useWatch({ control, name: 'delivery_method' });

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

    useEffect(() => {
        if (selectedItems.size === 0) {
            router.replace('/cart');
        }
    }, [selectedItems, router]);


    const generateTelegramMessage = (formData) => {
        const itemsToOrder = cartItems.filter(item => selectedItems.has(item.product.id));

        const orderDetails = itemsToOrder.map(item =>
            `- ${item.product.name} (x${item.quantity})`
        ).join('\n');

        const formatPrice = (p) => new Intl.NumberFormat('ru-RU').format(p);

        const summary = `
💰 Сумма: ${formatPrice(selectionInfo.subtotal)} ₽
🎁 Скидка: ${parseFloat(selectionInfo.discount_amount) > 0 ? formatPrice(selectionInfo.discount_amount) + ' ₽' : '0 ₽'}
💎 **ИТОГО: ${formatPrice(selectionInfo.final_total)} ₽**
        `.trim();

        let deliveryInfo = '';
        if (formData.delivery_method === 'Почта России') {
            const addressParts = [
                formData.post_postcode,
                formData.post_city,
                formData.post_street,
                `д. ${formData.post_house}`,
                formData.post_apartment ? `кв. ${formData.post_apartment}` : null
            ].filter(Boolean).join(', ');

            deliveryInfo = `📦 **Почта России**\n📍 Адрес: ${addressParts}`;
        } else {
            deliveryInfo = `📦 **СДЭК**\n🏙 Город: ${formData.cdek_city}\n📍 ПВЗ: ${formData.cdek_office_address}`;
        }

        // ИЗМЕНЕНИЕ: Добавляем пометку, откуда пришел заказ
        const sourceLabel = user ? 'Telegram' : 'Web Сайт';

        return `
🆕 **НОВЫЙ ЗАКАЗ (${sourceLabel})**

👤 **Клиент:** ${formData.lastName} ${formData.firstName} ${formData.patronymic || ''}
📞 **Телефон:** ${formData.phone}

${deliveryInfo}

🛒 **Товары:**
${orderDetails}

${summary}
        `.trim();
    };

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
            city: formData.delivery_method === 'Почта России' ? formData.post_city : formData.cdek_city,
            district: formData.delivery_method === 'Почта России' ? (formData.post_district || '') : '',
            street: formData.delivery_method === 'Почта России' ? formData.post_street : '',
            house: formData.delivery_method === 'Почта России' ? formData.post_house : '',
            apartment: formData.delivery_method === 'Почта России' ? (formData.post_apartment || '') : '',
            postcode: formData.delivery_method === 'Почта России' ? formData.post_postcode : '',
            cdek_office_address: formData.delivery_method === 'СДЭК' ? formData.cdek_office_address : '',
        };

        try {
            await apiClient.post('/orders/create/', orderData);

            // ИЗМЕНЕНИЕ: Открываем Telegram только если пользователь пришел оттуда
            if (user) {
                const message = generateTelegramMessage(formData);
                const managerUsername = settings?.manager_username || 'username';
                const telegramLink = `https://t.me/${managerUsername}?text=${encodeURIComponent(message)}`;

                openTelegramLink(telegramLink);
                // Закрываем приложение (только в Telegram)
                setTimeout(() => {
                    onClose();
                }, 500);
            } else {
                // Если это веб-пользователь, просто показываем уведомление
                // В будущем здесь можно сделать редирект на страницу "Спасибо за заказ"
                showAlert("Заказ успешно оформлен! Наш менеджер свяжется с вами.");

                // Очищаем корзину и перенаправляем на главную через паузу
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            }

            deleteSelectedItems();

        } catch (error) {
            console.error("Order creation failed:", error);
            let errorMessage = 'Произошла ошибка при создании заказа.';
            if (error.response?.data) {
                errorMessage += '\n' + JSON.stringify(error.response.data, null, 2);
            }
            showAlert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles['checkout-page']}>
            <form className={styles['checkout-form']} onSubmit={handleSubmit(onSubmit)}>

                {/* СЕКЦИЯ 1: КОНТАКТЫ */}
                <div className={styles['form-section']}>
                    <h2 className={styles['form-section-header']}>Контактная информация</h2>

                    <div className={styles['form-field']}>
                        <input
                            id="lastName"
                            placeholder="Фамилия"
                            {...register('lastName', { required: 'Фамилия обязательна' })}
                            className={`${styles['form-input']} ${errors.lastName ? styles['invalid'] : ''}`}
                            maxLength={50}
                        />
                        {errors.lastName && <p className={styles['error-message']}>{errors.lastName.message}</p>}
                    </div>

                    <div className={styles['form-grid']}>
                        <div className={styles['form-field']}>
                            <input
                                id="firstName"
                                placeholder="Имя"
                                {...register('firstName', { required: 'Имя обязательно' })}
                                className={`${styles['form-input']} ${errors.firstName ? styles['invalid'] : ''}`}
                                maxLength={50}
                            />
                            {errors.firstName && <p className={styles['error-message']}>{errors.firstName.message}</p>}
                        </div>
                        <div className={styles['form-field']}>
                            <input
                                id="patronymic"
                                placeholder="Отчество"
                                {...register('patronymic')}
                                className={styles['form-input']}
                                maxLength={50}
                            />
                        </div>
                    </div>

                    <div className={styles['form-field']}>
                        <Controller
                            name="phone"
                            control={control}
                            rules={{
                                required: 'Номер телефона обязателен',
                                minLength: { value: 18, message: 'Введите номер полностью' }
                            }}
                            render={({ field }) => (
                                <IMaskInput
                                    {...field}
                                    id="phone"
                                    placeholder="+7 (___) ___-__-__"
                                    mask="+{7} (000) 000-00-00"
                                    className={`${styles['form-input']} ${errors.phone ? styles['invalid'] : ''}`}
                                    onAccept={(value) => field.onChange(value)}
                                />
                            )}
                        />
                        {errors.phone && <p className={styles['error-message']}>{errors.phone.message}</p>}
                    </div>
                </div>

                {/* СЕКЦИЯ 2: СПОСОБ ДОСТАВКИ */}
                <div className={styles['form-section']}>
                    <h2 className={styles['form-section-header']}>Способ доставки</h2>
                    <div className={styles['shipping-options']}>
                        <label className={`${styles['shipping-option-label']} ${deliveryMethod === 'Почта России' ? styles['active'] : ''}`}>
                            <input
                                type="radio"
                                value="Почта России"
                                {...register('delivery_method')}
                                className={styles['radio-input']}
                            />
                            <div className={styles['icon-wrapper']}><PostRusIcon /></div>
                            <span>Почта России</span>
                        </label>
                        <label className={`${styles['shipping-option-label']} ${deliveryMethod === 'СДЭК' ? styles['active'] : ''}`}>
                            <input
                                type="radio"
                                value="СДЭК"
                                {...register('delivery_method')}
                                className={styles['radio-input']}
                            />
                            <div className={styles['icon-wrapper']}><SdekIcon /></div>
                            <span>СДЭК</span>
                        </label>
                    </div>
                </div>

                {/* СЕКЦИЯ 3: АДРЕС */}
                <div className={styles['form-section']}>
                    <h2 className={styles['form-section-header']}>Адрес доставки</h2>

                    {deliveryMethod === 'Почта России' && (
                        <div className={styles['address-fields-container']}>
                            <p className={styles['delivery-instructions']}>
                                Укажите полный адрес для доставки Почтой России.
                            </p>

                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Район (область/край)"
                                    {...register('post_district')}
                                    className={styles['form-input']}
                                    maxLength={100}
                                />
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Населенный пункт"
                                    {...register('post_city', { required: 'Укажите населенный пункт' })}
                                    className={`${styles['form-input']} ${errors.post_city ? styles['invalid'] : ''}`}
                                    maxLength={100}
                                />
                                {errors.post_city && <p className={styles['error-message']}>{errors.post_city.message}</p>}
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Улица"
                                    {...register('post_street', { required: 'Укажите улицу' })}
                                    className={`${styles['form-input']} ${errors.post_street ? styles['invalid'] : ''}`}
                                    maxLength={150}
                                />
                                {errors.post_street && <p className={styles['error-message']}>{errors.post_street.message}</p>}
                            </div>
                            <div className={styles['form-grid']}>
                                <div className={styles['form-field']}>
                                    <input
                                        placeholder="Дом"
                                        {...register('post_house', { required: 'Дом' })}
                                        className={`${styles['form-input']} ${errors.post_house ? styles['invalid'] : ''}`}
                                        maxLength={10}
                                    />
                                    {errors.post_house && <p className={styles['error-message']}>{errors.post_house.message}</p>}
                                </div>
                                <div className={styles['form-field']}>
                                    <input
                                        placeholder="Кв./Офис"
                                        {...register('post_apartment')}
                                        className={styles['form-input']}
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    type="tel"
                                    placeholder="Почтовый индекс (6 цифр)"
                                    {...register('post_postcode', {
                                        required: 'Укажите индекс',
                                        pattern: { value: /^\d{6}$/, message: 'Индекс должен состоять из 6 цифр' }
                                    })}
                                    className={`${styles['form-input']} ${errors.post_postcode ? styles['invalid'] : ''}`}
                                    maxLength={6}
                                />
                                {errors.post_postcode && <p className={styles['error-message']}>{errors.post_postcode.message}</p>}
                            </div>
                        </div>
                    )}

                    {deliveryMethod === 'СДЭК' && (
                        <div className={styles['address-fields-container']}>
                            <p className={styles['delivery-instructions']}>
                                Укажите город и адрес удобного пункта выдачи (ПВЗ).
                            </p>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Город"
                                    {...register('cdek_city', { required: 'Укажите город' })}
                                    className={`${styles['form-input']} ${errors.cdek_city ? styles['invalid'] : ''}`}
                                    maxLength={100}
                                />
                                {errors.cdek_city && <p className={styles['error-message']}>{errors.cdek_city.message}</p>}
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Адрес ПВЗ (ул. Ленина, д. 1)"
                                    {...register('cdek_office_address', { required: 'Укажите адрес ПВЗ' })}
                                    className={`${styles['form-input']} ${errors.cdek_office_address ? styles['invalid'] : ''}`}
                                    maxLength={255}
                                />
                                {errors.cdek_office_address && <p className={styles['error-message']}>{errors.cdek_office_address.message}</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* ФУТЕР */}
                <div className={styles['form-footer']}>
                    <div className={styles['order-summary']}>
                        <div className={`${styles['summary-row']} ${styles['final-total']}`}>
                            <span>Итого к оплате</span>
                            <span>{new Intl.NumberFormat('ru-RU').format(selectionInfo.final_total)} ₽</span>
                        </div>
                    </div>

                    <div className={styles['agreement-checkbox-container']}>
                        <input
                            type="checkbox"
                            id="agreement"
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                        />
                        <label htmlFor="agreement">
                            Я согласен с условиями <Link href="/legal/offer" className={styles['agreement-link']}>Оферты</Link> и <Link href="/legal/privacy" className={styles['agreement-link']}>Политикой конфиденциальности</Link>
                        </label>
                    </div>

                    <button
                        className={styles['checkout-btn']}
                        type="submit"
                        disabled={!isValid || !isAgreed || isSubmitting}
                    >
                        {isSubmitting ? 'Оформление...' : 'Подтвердить заказ'}
                    </button>
                </div>
            </form>
        </div>
    );
};