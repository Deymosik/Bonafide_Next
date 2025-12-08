// frontend/src/context/NotificationContext.js
'use client'; // <-- ВАЖНО: Контекст работает только на клиенте

import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState({
        message: '',
        type: '',
        isVisible: false,
    });

    // useCallback, чтобы функция не пересоздавалась при каждом рендере
    const showNotification = useCallback((message, type = 'success') => {
        setNotification({ message, type, isVisible: true });

        // Прячем уведомление через 3 секунды
        setTimeout(() => {
            setNotification(prev => ({ ...prev, isVisible: false }));
        }, 3000);
    }, []);

    const value = { notification, showNotification };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};