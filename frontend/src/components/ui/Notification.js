// файл: src/components/Notification.js
// Язык: JavaScript

import React from 'react';
// 1. Импортируем стили как объект styles
import styles from './Notification.module.css';

const Notification = ({ message, type, isVisible }) => {
    // Если не видно, ничего не рендерим (для производительности)
    if (!isVisible) return null;

    // 2. Формируем классы через объект styles.
    // styles['notification-container'] - основной класс
    // styles[type] - динамический класс (например, styles.success или styles.error)
    // styles.show - класс для анимации появления (если isVisible true)

    // Примечание: isVisible здесь всегда true из-за проверки выше,
    // но класс show нужен для CSS-анимации (transition).

    const containerClasses = `
        ${styles['notification-container']} 
        ${styles[type] || ''} 
        ${isVisible ? styles.show : ''}
    `;

    return (
        <div className={containerClasses}>
            <p>{message}</p>
        </div>
    );
};

export default Notification;