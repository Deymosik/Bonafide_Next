// файл: src/components/FreeShippingProgressBar.js
"use client";

import React, { useState, useEffect } from 'react';
import styles from './FreeShippingProgressBar.module.css';

// ИСПРАВЛЕНИЕ: Импортируем SVG как компоненты по умолчанию
import TruckIcon from '../assets/truck-icon.svg';
import CheckIcon from '../assets/check-icon.svg';

const FreeShippingProgressBar = ({ currentAmount, threshold }) => {
    console.log("FreeShipping Debug:", { currentAmount, threshold });
    const [isGoalReached, setIsGoalReached] = useState(false);

    // Приводим к числу на всякий случай, чтобы избежать ошибок сравнения строк
    const numThreshold = parseFloat(threshold);
    const numCurrent = parseFloat(currentAmount);

    const isThresholdSet = numThreshold && numThreshold > 0;

    useEffect(() => {
        if (isThresholdSet) {
            if (numCurrent >= numThreshold) {
                setIsGoalReached(true);
            } else {
                setIsGoalReached(false);
            }
        }
    }, [numCurrent, numThreshold, isThresholdSet]);

    if (!isThresholdSet) {
        return null;
    }

    // --- РЕНДЕР СОСТОЯНИЯ "ЦЕЛЬ ДОСТИГНУТА" ---
    if (isGoalReached) {
        return (
            <div className={`${styles['shipping-progress-bar']} ${styles['success']} ${styles['animate-in']}`}>
                <div className={`${styles['shipping-icon-wrapper']} ${styles['success-icon']}`}>
                    <CheckIcon />
                </div>
                <div className={styles['shipping-text-wrapper']}>
                    <span className={styles['shipping-title']}>Бесплатная доставка!</span>
                    <span className={styles['shipping-subtitle']}>Ваш заказ будет доставлен бесплатно.</span>
                </div>
            </div>
        );
    }

    // --- РЕНДЕР СОСТОЯНИЯ "В ПРОЦЕССЕ" ---
    const remainingAmount = numThreshold - numCurrent;
    // Ограничиваем ширину 100%, чтобы полоска не вылезала
    const progressPercentage = Math.min((numCurrent / numThreshold) * 100, 100);

    return (
        <div className={`${styles['shipping-progress-bar']} ${styles['animate-in']}`}>
            <div className={styles['shipping-icon-wrapper']}>
                <TruckIcon />
            </div>
            <div className={styles['shipping-text-wrapper']}>
                <span className={styles['shipping-title']}>
                    Добавьте еще на <strong>{remainingAmount.toFixed(0)} ₽</strong>
                </span>
                <span className={styles['shipping-subtitle']}>до бесплатной доставки</span>
            </div>
            <div className={styles['progress-track']}>
                <div
                    className={styles['progress-fill']}
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export default FreeShippingProgressBar;