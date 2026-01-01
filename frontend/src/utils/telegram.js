// frontend/src/utils/telegram.js
import { useEffect, useState } from 'react';

export const useTelegram = () => {
    const [isReady, setIsReady] = useState(false);

    // Безопасно получаем объект только на клиенте
    const tg = typeof window !== 'undefined' && window.Telegram?.WebApp
        ? window.Telegram.WebApp
        : null;

    useEffect(() => {
        if (tg) {
            tg.ready();
            // Пытаемся развернуть, но не блокируем, если не выйдет
            try { tg.expand(); } catch (e) { }
            setIsReady(true);
        }
    }, [tg]);

    // --- МЕТОДЫ ---

    const onClose = () => {
        tg?.close();
    };

    const onToggleButton = () => {
        if (tg?.MainButton.isVisible) {
            tg.MainButton.hide();
        } else {
            tg.MainButton.show();
        }
    };

    const showAlert = (message) => {
        if (tg?.showAlert) {
            try {
                tg.showAlert(message);
            } catch (e) {
                // Fallback если метод не поддерживается в данной версии Telegram
                console.warn('Telegram showAlert not supported, using native alert:', e);
                alert(message);
            }
        } else {
            // Фолбэк для браузера
            alert(message);
        }
    };

    const openTelegramLink = (url) => {
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    const openLink = (url) => {
        if (tg?.openLink) {
            tg.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    // --- ВОЗВРАЩАЕМ ОБЪЕКТЫ ---

    return {
        onClose,
        onToggleButton,
        showAlert,
        openTelegramLink,
        openLink,

        tg,

        // ВАЖНО: Возвращаем данные только если они РЕАЛЬНО есть.
        // Никаких моков (заглушек) для User и кнопок,
        // чтобы логика "if (user)" или "if (BackButton)" работала честно.
        user: tg?.initDataUnsafe?.user,
        queryId: tg?.initDataUnsafe?.query_id,

        // Эти объекты будут undefined в браузере, и это ХОРОШО.
        // React-компоненты поймут, что мы не в Telegram.
        BackButton: tg?.BackButton,
        MainButton: tg?.MainButton,
        HapticFeedback: tg?.HapticFeedback,

        isReady // Флаг, что SDK загрузился
    };
};