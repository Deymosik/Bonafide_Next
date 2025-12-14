// frontend/src/context/SettingsContext.js
'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../lib/api';

const SettingsContext = createContext(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === null) {
        // Возвращаем пустой объект, если контекст еще не инициализирован,
        // чтобы компоненты не падали при попытке доступа к свойствам (например, settings.site_name)
        return {};
    }
    return context;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        apiClient.get('/settings/')
            .then(response => {
                setSettings(response.data);
            })
            .catch(error => {
                // Устанавливаем безопасные дефолтные значения, чтобы сайт не сломался
                setSettings({
                    site_name: 'BonaFide55',
                    free_shipping_threshold: 0, // Важно для корзины
                    search_placeholder: 'Поиск...'
                });
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    // Пока настройки грузятся, мы ничего не показываем (или можно показать спиннер)
    // Это гарантирует, что при первом рендере страницы у нас уже будут данные.
    if (loading) {
        return null;
    }

    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
};