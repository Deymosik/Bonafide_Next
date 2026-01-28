'use client';

import React from 'react';
import { Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import styles from './CheckoutForm.module.css';

import PostRusIcon from '@/assets/post-rus-icon.svg';
import SdekIcon from '@/assets/sdek-icon.svg';

const CheckoutForm = ({ register, control, errors, deliveryMethod }) => {
    return (
        <div className={styles['form-container']}>

            {/* 1. Contact Info */}
            <div className={styles['form-section']}>
                <h3 className={styles['section-header']}>Контактные данные</h3>

                <div className={`${styles['form-grid']} ${styles['cols-2']}`}>
                    <div className={styles['form-field']}>
                        <input
                            placeholder="Имя"
                            {...register('firstName', { required: 'Имя обязательно' })}
                            className={`${styles['form-input']} ${errors.firstName ? styles['invalid'] : ''}`}
                            maxLength={50}
                        />
                        {errors.firstName && <span className={styles['error-message']}>{errors.firstName.message}</span>}
                    </div>

                    <div className={styles['form-field']}>
                        <input
                            placeholder="Отчество"
                            {...register('patronymic')}
                            className={styles['form-input']}
                            maxLength={50}
                        />
                    </div>
                </div>

                <div className={`${styles['form-grid']} ${styles['cols-2']}`} style={{ marginTop: '16px' }}>
                    <div className={styles['form-field']}>
                        <input
                            placeholder="Фамилия"
                            {...register('lastName', { required: 'Фамилия обязательна' })}
                            className={`${styles['form-input']} ${errors.lastName ? styles['invalid'] : ''}`}
                            maxLength={50}
                        />
                        {errors.lastName && <span className={styles['error-message']}>{errors.lastName.message}</span>}
                    </div>

                    <div className={styles['form-field']}>
                        <Controller
                            name="phone"
                            control={control}
                            rules={{
                                required: 'Телефон обязателен',
                                minLength: { value: 18, message: 'Неполный номер' }
                            }}
                            render={({ field }) => (
                                <IMaskInput
                                    {...field}
                                    placeholder="+7 (___) ___-__-__"
                                    mask="+{7} (000) 000-00-00"
                                    className={`${styles['form-input']} ${errors.phone ? styles['invalid'] : ''}`}
                                    onAccept={(value) => field.onChange(value)}
                                />
                            )}
                        />
                        {errors.phone && <span className={styles['error-message']}>{errors.phone.message}</span>}
                    </div>
                </div>
            </div>

            {/* 2. Delivery Method */}
            <div className={styles['form-section']}>
                <h3 className={styles['section-header']}>Способ доставки</h3>

                <div className={styles['shipping-options']}>
                    <label className={`${styles['shipping-card']} ${deliveryMethod === 'Почта России' ? styles['active'] : ''}`}>
                        <input
                            type="radio"
                            value="Почта России"
                            {...register('delivery_method')}
                        />
                        <div className={styles['icon-wrapper']}><PostRusIcon /></div>
                        <span className={styles['shipping-label']}>Почта России</span>
                    </label>

                    <label className={`${styles['shipping-card']} ${deliveryMethod === 'СДЭК' ? styles['active'] : ''}`}>
                        <input
                            type="radio"
                            value="СДЭК"
                            {...register('delivery_method')}
                        />
                        <div className={styles['icon-wrapper']}><SdekIcon /></div>
                        <span className={styles['shipping-label']}>СДЭК</span>
                    </label>
                </div>
            </div>

            {/* 3. Address Details */}
            <div className={styles['form-section']}>
                <h3 className={styles['section-header']}>Адрес получения</h3>

                {deliveryMethod === 'Почта России' && (
                    <div className={styles['address-group']}>
                        <p className={styles['delivery-hint']}>
                            Заполните адрес доставки (включая индекс) для отправки Почтой.
                        </p>

                        <div className={`${styles['form-grid']} ${styles['cols-2']}`}>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Населенный пункт"
                                    {...register('post_city', { required: 'Город обязателен' })}
                                    className={`${styles['form-input']} ${errors.post_city ? styles['invalid'] : ''}`}
                                />
                                {errors.post_city && <span className={styles['error-message']}>{errors.post_city.message}</span>}
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Индекс (6 цифр)"
                                    {...register('post_postcode', {
                                        required: 'Индекс обязателен',
                                        pattern: { value: /^\d{6}$/, message: 'Индекс - 6 цифр' }
                                    })}
                                    className={`${styles['form-input']} ${errors.post_postcode ? styles['invalid'] : ''}`}
                                    maxLength={6}
                                />
                                {errors.post_postcode && <span className={styles['error-message']}>{errors.post_postcode.message}</span>}
                            </div>
                        </div>

                        <div className={styles['form-field']}>
                            <input
                                placeholder="Улица, Район"
                                {...register('post_street', { required: 'Улица обязательна' })}
                                className={`${styles['form-input']} ${errors.post_street ? styles['invalid'] : ''}`}
                            />
                            {errors.post_street && <span className={styles['error-message']}>{errors.post_street.message}</span>}
                        </div>

                        <div className={`${styles['form-grid']} ${styles['cols-2']}`}>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Дом"
                                    {...register('post_house', { required: 'Дом обязателен' })}
                                    className={`${styles['form-input']} ${errors.post_house ? styles['invalid'] : ''}`}
                                />
                                {errors.post_house && <span className={styles['error-message']}>{errors.post_house.message}</span>}
                            </div>
                            <div className={styles['form-field']}>
                                <input
                                    placeholder="Кв. / Офис"
                                    {...register('post_apartment')}
                                    className={styles['form-input']}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {deliveryMethod === 'СДЭК' && (
                    <div className={styles['address-group']}>
                        <p className={styles['delivery-hint']}>
                            Укажите город и адрес удобного Пункта Выдачи Заказов (ПВЗ).
                        </p>
                        <div className={styles['form-field']}>
                            <input
                                placeholder="Город"
                                {...register('cdek_city', { required: 'Город обязателен' })}
                                className={`${styles['form-input']} ${errors.cdek_city ? styles['invalid'] : ''}`}
                            />
                            {errors.cdek_city && <span className={styles['error-message']}>{errors.cdek_city.message}</span>}
                        </div>
                        <div className={styles['form-field']}>
                            <input
                                placeholder="Адрес ПВЗ (ул. Ленина, д. 1)"
                                {...register('cdek_office_address', { required: 'Адрес ПВЗ обязателен' })}
                                className={`${styles['form-input']} ${errors.cdek_office_address ? styles['invalid'] : ''}`}
                            />
                            {errors.cdek_office_address && <span className={styles['error-message']}>{errors.cdek_office_address.message}</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CheckoutForm;
