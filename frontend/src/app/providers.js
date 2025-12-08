"use client";

import { CartProvider } from './context/CartContext'; // Укажите правильный путь

export function Providers({ children }) {
    return (
        <CartProvider>
            {children}
        </CartProvider>
    );
}