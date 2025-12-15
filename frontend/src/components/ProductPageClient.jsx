// src/components/ProductPageClient.jsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import DOMPurify from 'isomorphic-dompurify'; // 1. Импорт защиты от XSS

import { useSettings } from '@/context/SettingsContext';
import ProductGallery from './ProductGallery';
import { useTelegram } from '@/utils/telegram';
import RelatedProductCard from './RelatedProductCard';
import { useCart } from '@/context/CartContext';
import AccordionItem from './AccordionItem';

import styles from '@/app/products/[id]/ProductPage.module.css';

export default function ProductPageClient({ product }) {
    const settings = useSettings();
    const router = useRouter();
    const pathname = usePathname();

    // 2. Деструктурируем безопасные методы
    const { BackButton, HapticFeedback } = useTelegram();

    const { addToCart, cartItems, updateQuantity } = useCart();

    const [isSwitchingColor, setIsSwitchingColor] = useState(false);
    // Состояние для отображения "Скопировано"
    const [copied, setCopied] = useState(false);

    const itemInCart = cartItems.find(item => item && product && item.product.id === product.id);

    const formatPrice = (value) => new Intl.NumberFormat('ru-RU').format(value);

    // Управление кнопкой "Назад" (используем безопасную обертку)
    useEffect(() => {
        BackButton.show();
        const handleBack = () => router.back();
        BackButton.onClick(handleBack);
        return () => {
            BackButton.offClick(handleBack);
            BackButton.hide();
        };
    }, [router, BackButton]);

    const handleAddToCart = () => {
        if (!product) return;
        // Используем безопасный HapticFeedback
        HapticFeedback?.notificationOccurred('success');
        addToCart(product);
    };

    const handleQuantityChange = (newQuantity) => {
        if (!product) return;
        HapticFeedback?.impactOccurred('light');
        updateQuantity(product.id, newQuantity);
    };

    // Функция копирования артикула
    const handleCopySku = () => {
        if (product.sku) {
            navigator.clipboard.writeText(product.sku);
            setCopied(true);
            // Вибрация при успехе
            HapticFeedback?.notificationOccurred('success');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const allImagesForGallery = useMemo(() => {
        if (!product) return [];
        const imagesArray = [
            { image_url: product.main_image_url, thumbnail_url: product.main_image_thumbnail_url },
            ...(product.images || [])
        ];
        return imagesArray.filter(img => img && img.thumbnail_url);
    }, [product]);

    const allColorVariations = useMemo(() => {
        if (!product || !product.color_variations) return [];
        const fullList = [
            { id: product.id, main_image_thumbnail_url: product.main_image_thumbnail_url },
            ...product.color_variations
        ];
        return fullList.sort((a, b) => a.id - b.id);
    }, [product]);

    const handleColorSwitch = (e, newId) => {
        e.preventDefault();
        if (newId !== product.id && !isSwitchingColor) {
            setIsSwitchingColor(true);
            router.push(`/products/${newId}`);
        }
    };

    useEffect(() => {
        setIsSwitchingColor(false);
    }, [pathname]);

    const price = parseFloat(product.price);
    const regularPrice = parseFloat(product.regular_price);
    const hasDiscount = regularPrice > price;
    const discountPercent = hasDiscount ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

    return (
        <div className={`${styles['product-page']} ${isSwitchingColor ? styles['switching-color'] : ''}`}>

            <ProductGallery images={allImagesForGallery} />

            <div className={styles['product-details']}>
                <div className={styles['product-header-card']}>
                    {(product.info_panels || []).length > 0 && (
                        <div className={styles['info-panels-product']}>
                            {product.info_panels.map(panel => (
                                <span key={panel.name} className={styles['info-panel']}
                                      style={{backgroundColor: panel.color, color: panel.text_color}}>
                                    {panel.name}
                                </span>
                            ))}
                        </div>
                    )}

                    <h1 className={styles['product-title']}>{product.name}</h1>

                    {/* ВЫВОД АРТИКУЛА (Перемещен под заголовок) */}
                    {product.sku && (
                        <div className={styles['sku-container']} onClick={handleCopySku}>
                            <span className={styles['sku-label']}>Арт: </span>
                            <span className={styles['sku-value']}>{product.sku}</span>
                            {copied ? (
                                <span className={styles['sku-copied-badge']}>Скопировано</span>
                            ) : (
                                <svg className={styles['copy-icon']} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            )}
                        </div>
                    )}

                    {allColorVariations.length > 1 && (
                        <div className={styles['color-swatches-section']}>
                            <div className={styles['color-swatches-container']}>
                                {allColorVariations.map(variation => (
                                    <Link
                                        href={`/products/${variation.id}`}
                                        key={variation.id}
                                        className={`${styles['color-swatch']} ${variation.id === product.id ? styles['active'] : ''}`}
                                        onClick={(e) => handleColorSwitch(e, variation.id)}
                                        style={{ position: 'relative' }}
                                    >
                                        <Image
                                            src={variation.main_image_thumbnail_url}
                                            alt="Color"
                                            fill
                                            sizes="40px"
                                            style={{ objectFit: 'cover', borderRadius: '6px' }}
                                        />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles['price-section-main']}>
                        {hasDiscount ? (
                            <>
                                <span className={styles['price-main-current']}>{formatPrice(price)} ₽</span>
                                <span className={styles['price-main-old']}>{formatPrice(regularPrice)} ₽</span>
                                <span className={styles['discount-badge-page']}>-{discountPercent}%</span>
                            </>
                        ) : (
                            <span className={styles['price-main-regular']}>{formatPrice(price)} ₽</span>
                        )}
                    </div>
                </div>

                {product.audio_sample && (
                    <div className={`${styles['product-section']} ${styles['audio-section']}`}>
                        <h2>Запись микрофонов:</h2>
                        <audio controls className={styles['audio-player']} src={product.audio_sample} />
                    </div>
                )}

                {itemInCart && product.related_products && product.related_products.length > 0 && (
                    <div className={`${styles['product-section']} ${styles['related-section']}`}>
                        <h2>С этим товаром покупают</h2>
                        <div className={styles['related-products-container']}>
                            {product.related_products.map(related_product => (
                                <RelatedProductCard key={related_product.id} product={related_product} />
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles['product-section']}>
                    <h2>Описание</h2>
                    {/* 3. Очищаем HTML перед выводом */}
                    <div
                        className={styles['product-description-content']}
                        dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(product.description)}}
                    />
                </div>

                {product.info_cards && product.info_cards.length > 0 && (
                    <div className={styles['product-section']}>
                        <div className={styles['info-cards-container']}>
                            {product.info_cards.map((card, index) => (
                                <a key={index} href={card.link_url} target="_blank" rel="noopener noreferrer" className={styles['info-card-rectangle']}>
                                    <div style={{ width: '100px', height: '100px', position: 'relative', flexShrink: 0 }}>
                                        <Image
                                            src={card.image_url}
                                            alt={card.title}
                                            fill
                                            sizes="100px"
                                            style={{ objectFit: 'cover' }}
                                            className={styles['info-card-image-rect']}
                                        />
                                    </div>
                                    <div className={styles['info-card-text-content']}>
                                        <h4 className={styles['info-card-title-rect']}>{card.title}</h4>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles['product-section']}>
                    {product.features && product.features.length > 0 && (
                        <AccordionItem title="Функционал">
                            <ul className={`${styles['spec-list']} ${styles['simple']}`}>
                                {product.features.map((feature, index) => <li key={index}>{feature.name}</li>)}
                            </ul>
                        </AccordionItem>
                    )}
                    {product.grouped_characteristics && product.grouped_characteristics.map((category, index) => (
                        <AccordionItem title={category.name} key={index}>
                            <ul className={styles['spec-list']}>
                                {category.characteristics.map((char, charIndex) => (
                                    <li key={charIndex}>
                                        <span className={styles['spec-name']}>{char.name}</span>
                                        <span className={styles['spec-value']}>{char.value}</span>
                                    </li>
                                ))}
                            </ul>
                        </AccordionItem>
                    ))}
                </div>
            </div>

            <div className={styles['sticky-footer']}>
                {itemInCart ? (
                    <div className={styles['cart-controls-container']}>
                        <Link href="/cart" className={styles['go-to-cart-btn']}>В корзине</Link>
                        <div className={styles['quantity-stepper']}>
                            <button className={styles['quantity-btn']} onClick={() => handleQuantityChange(itemInCart.quantity - 1)}>−</button>
                            <span className={styles['quantity-display']}>{itemInCart.quantity}</span>
                            <button className={styles['quantity-btn']} onClick={() => handleQuantityChange(itemInCart.quantity + 1)}>+</button>
                        </div>
                    </div>
                ) : (
                    <button className={styles['add-to-cart-btn']} onClick={handleAddToCart}>Добавить в корзину</button>
                )}
            </div>
        </div>
    );
}