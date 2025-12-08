// frontend/src/utils/useCountdown.js
'use client'; // Хуки работают только на клиенте

import { useEffect, useState } from 'react';

const useCountdown = (targetDate) => {
    const countDownDate = targetDate ? new Date(targetDate).getTime() : null;

    // 1. ИЗМЕНЕНИЕ: Инициализируем нулем.
    // Мы НЕ вычисляем дату сразу в useState, потому что время на сервере
    // и время на клиенте будет отличаться на миллисекунды, что вызовет ошибку гидратации.
    const [countDown, setCountDown] = useState(0);

    useEffect(() => {
        if (!countDownDate) {
            setCountDown(0);
            return;
        }

        // 2. ИЗМЕНЕНИЕ: Сразу вычисляем актуальное значение при монтировании на клиенте
        // Это позволяет избежать задержки в 1 секунду перед появлением цифр
        const now = new Date().getTime();
        setCountDown(countDownDate - now);

        const interval = setInterval(() => {
            setCountDown(countDownDate - new Date().getTime());
        }, 1000);

        return () => clearInterval(interval);
    }, [countDownDate]);

    return getReturnValues(countDown);
};

const getReturnValues = (countDown) => {
    // Если countDown равен 0 (инициализация) или меньше 0 (время вышло)
    if (countDown <= 0) {
        return [0, 0, 0, 0];
    }

    const days = Math.floor(countDown / (1000 * 60 * 60 * 24));
    const hours = Math.floor((countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((countDown % (1000 * 60)) / 1000);

    return [days, hours, minutes, seconds];
};

export { useCountdown };