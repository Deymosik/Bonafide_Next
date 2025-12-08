// файл: src/components/BottomSheet.js
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './BottomSheet.module.css';

const BottomSheet = ({ isOpen, onClose, children }) => {
    // 1. Состояние, чтобы понять, загрузились ли мы в браузере
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Блокируем прокрутку основной страницы, когда открыт фильтр
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // 2. Если мы на сервере или компонент еще не смонтирован — ничего не рисуем.
    // Это предотвращает ошибку "document is not defined".
    if (!mounted) return null;

    // 3. Если окно закрыто, тоже ничего не рисуем
    if (!isOpen) return null;

    // 4. Используем createPortal, чтобы отрендерить окно ПОВЕРХ всего приложения (в body)
    return createPortal(
        <div className={styles['bottom-sheet-overlay']} onClick={onClose}>
            {/* stopPropagation, чтобы клик по самому окну не закрывал его */}
            <div
                className={styles['bottom-sheet-content']}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        document.body // Рендерим прямо в тег <body>
    );
};

export default BottomSheet;