"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

// ВАЖНО: Импортируем стили как объект styles
import styles from './TabBar.module.css';

// Импорт иконок
import HomeIcon from '../assets/home-icon.svg';
import ArticleIcon from '../assets/article-icon.svg';
import CartIcon from '../assets/cart-icon.svg';
import FaqIcon from '../assets/faq-icon.svg';

const TabBar = () => {
    const { totalItems } = useCart();
    const pathname = usePathname();

// Скрываем на товарах, чекауте И на детальных страницах статей
    const shouldHide =
        pathname.startsWith('/products/') ||
        pathname.startsWith('/checkout') ||
        pathname.startsWith('/articles/') ||
        pathname.startsWith('/legal/');

    if (shouldHide) {
        return null; // Не рендерим ничего
    }

    const navItems = [
        {
            href: "/",
            label: "Главная",
            icon: <HomeIcon />
        },
        {
            href: "/articles",
            label: "Статьи",
            icon: <ArticleIcon />
        },
        {
            href: "/cart",
            label: "Корзина",
            icon: <CartIcon />,
            badge: totalItems > 0 ? totalItems : null,
            // Флаг, что этому элементу нужна спец. обертка для бейджика
            isCart: true
        },
        {
            href: "/faq",
            label: "Инфо",
            icon: <FaqIcon />
        }
    ];

    return (
        <nav className={styles['tab-bar']}>
            {navItems.map((item) => {
                // Логика активности:
                // Для главной ("/") нужно точное совпадение.
                // Для остальных (например "/cart") — совпадение начала строки.
                const isActive = item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles['tab-bar-item']} ${isActive ? styles['active'] : ''}`}
                    >
                        {/* Обертка нужна только если это корзина (для позиционирования бейджа) */}
                        <div className={item.isCart ? styles['cart-icon-wrapper'] : ''}>
                            {item.icon}
                            {item.badge && (
                                <span className={styles['cart-badge']}>
                                    {item.badge}
                                </span>
                            )}
                        </div>
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};

export default TabBar;