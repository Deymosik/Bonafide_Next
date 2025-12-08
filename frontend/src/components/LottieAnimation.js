// src/components/LottieAnimation.js
'use client';

import React from 'react';
// 1. Импортируем dynamic из Next.js
import dynamic from 'next/dynamic';

// 2. Динамически импортируем Player из библиотеки.
// Опция { ssr: false } отключает попытку рендера на сервере.
const Player = dynamic(
    () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
    { ssr: false }
);

const LottieAnimation = ({ src, animationData, style, loop = true, autoplay = true }) => {
    // Если ничего не передали, возвращаем null, чтобы не было ошибок
    if (!src && !animationData) {
        return null;
    }

    return (
        <Player
            autoplay={autoplay}
            loop={loop}
            // Библиотека принимает либо src (URL), либо src (JSON объект)
            // Но лучше разделить для ясности, хотя Player обрабатывает src универсально
            src={src || animationData}
            style={style || { height: '300px', width: '300px' }}
        />
    );
};

export default LottieAnimation;