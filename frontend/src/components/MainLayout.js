// файл: src/components/MainLayout.js
"use client"; // Обязательно, так как используем usePathname

import React from 'react';
import { usePathname } from 'next/navigation';
import TabBar from './TabBar';
// Используем CSS модули для стилизации обертки
import styles from './MainLayout.module.css';

const MainLayout = ({ children }) => {
    const pathname = usePathname();

    // Список маршрутов, где нижнее меню НЕ нужно
    // ВАЖНО: '/products/' соответствует пути товара (app/products/[id])
    const hideTabBarOnRoutes = ['/products/', '/checkout', '/cart', '/login'];

    // Проверяем, начинается ли текущий путь с одного из исключений
    // Добавляем проверку pathname, так как при первом рендере он может быть null
    const showTabBar = pathname && !hideTabBarOnRoutes.some(route => pathname.startsWith(route));

    return (
        <div className={styles['app-layout-container']}>
            <main
                className={`${styles['layout-content']} ${showTabBar ? styles['with-tab-bar'] : ''}`}
            >
                {children}
            </main>

            {/* Рендерим TabBar только если нужно */}
            {showTabBar && <TabBar />}
        </div>
    );
};

export default MainLayout;