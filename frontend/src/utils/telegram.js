// frontend/src/utils/telegram.js

const isBrowser = typeof window !== 'undefined';
// Пытаемся получить объект Telegram только если мы в браузере
const tg = isBrowser ? window.Telegram?.WebApp : null;

export const useTelegram = () => {

    // 1. Инициализация при первом вызове
    if (tg) {
        // Сообщаем, что приложение готово (если еще не сообщали)
        if (!tg.isReady) {
            tg.ready();
            try {
                tg.expand(); // Разворачиваем на весь экран
            } catch (e) {
                console.error("TG Init Error:", e);
            }
        }
    }

    // --- БЕЗОПАСНЫЕ ОБЕРТКИ (РАБОТАЮТ ВЕЗДЕ) ---

    // 2. Закрытие приложения
    const onClose = () => {
        if (tg && tg.close) {
            tg.close();
        } else {
            console.log('TG: close() called (browser mode)');
            // В браузере перекидываем на главную или закрываем вкладку
            if (isBrowser) window.location.href = '/';
        }
    };

    // 3. Показ/Скрытие Главной кнопки (MainButton)
    const onToggleButton = () => {
        if (tg && tg.MainButton) {
            if (tg.MainButton.isVisible) {
                tg.MainButton.hide();
            } else {
                tg.MainButton.show();
            }
        } else {
            console.log('TG: MainButton toggled (browser mode)');
        }
    };

    // 4. Показ алертов (ИСПРАВЛЕНИЕ ВАШЕЙ ОШИБКИ)
    const showAlert = (message) => {
        if (tg && tg.showAlert) {
            tg.showAlert(message);
        } else {
            // Фолбэк для обычного браузера
            alert(message);
        }
    };

    // 5. Открытие внешних ссылок
    const openLink = (url) => {
        if (tg && tg.openLink) {
            tg.openLink(url);
        } else {
            if (isBrowser) window.open(url, '_blank');
        }
    };

    // 6. Открытие ссылок внутри Telegram (t.me/...)
    const openTelegramLink = (url) => {
        if (tg && tg.openTelegramLink) {
            tg.openTelegramLink(url);
        } else {
            if (isBrowser) window.open(url, '_blank');
        }
    };

    // 7. Вибрация (Haptic Feedback)
    const hapticFeedback = {
        impactOccurred: (style) => {
            if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
            else console.log(`TG Haptic: impact ${style}`);
        },
        notificationOccurred: (type) => {
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type);
            else console.log(`TG Haptic: notification ${type}`);
        },
        selectionChanged: () => {
            if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        }
    };

    // 8. Данные пользователя (Mock для разработки)
    const user = tg?.initDataUnsafe?.user || {
        id: 123456789,
        first_name: 'Dev',
        last_name: 'User',
        username: 'dev_user'
    };

    const queryId = tg?.initDataUnsafe?.query_id;

    // 9. Кнопка "Назад"
    const BackButton = tg?.BackButton || {
        show: () => console.log('TG: BackButton show'),
        hide: () => console.log('TG: BackButton hide'),
        onClick: () => {},
        offClick: () => {},
        isVisible: false
    };

    // 10. Главная кнопка
    const MainButton = tg?.MainButton || {
        show: () => console.log('TG: MainButton show'),
        hide: () => console.log('TG: MainButton hide'),
        setText: (text) => console.log(`TG: MainButton text: ${text}`),
        onClick: () => {},
        offClick: () => {},
        showProgress: () => {},
        hideProgress: () => {},
        isActive: true,
        isVisible: false
    };

    return {
        // Возвращаем безопасные методы
        onClose,
        onToggleButton,
        showAlert,
        openLink,
        openTelegramLink,
        // Объекты
        tg, // Сам объект (для редких случаев)
        user,
        queryId,
        BackButton,
        MainButton,
        HapticFeedback: hapticFeedback,
    };
};