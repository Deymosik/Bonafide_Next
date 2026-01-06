'use client';

import { Toaster } from 'react-hot-toast';

/**
 * Провайдер для Toast-уведомлений.
 * Оборачиваем им приложение в layout.js
 */
export const ToastProvider = () => {
    return (
        <Toaster
            position="bottom-center"
            reverseOrder={false}
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#333',
                    color: '#fff',
                },
                success: {
                    style: {
                        background: '#22c55e',
                    },
                },
                error: {
                    duration: 5000,
                    style: {
                        background: '#ef4444',
                    },
                },
            }}
        />
    );
};
