// src/app/layout.js
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Импортируем наш новый провайдер
import { ThemeProvider } from "@/context/ThemeProvider";
import { SettingsProvider } from "@/context/SettingsContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ToastProvider } from "@/providers/ToastProvider";
import TabBar from "@/components/TabBar";

const inter = Inter({
    subsets: ["latin", "cyrillic"],
    display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Shop';

export const metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME },
    description: "Интернет-магазин",
    manifest: '/manifest.json',
    icons: {
        icon: '/icon.png?v=5',      // Добавили версию для сброса кеша
        shortcut: '/icon.png?v=5',
        apple: '/icon.png?v=5',     // Для iPhone
    },
    openGraph: {
        type: 'website',
        locale: 'ru_RU',
        siteName: SITE_NAME,
    }
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    // Цвета статус-бара браузера теперь подхватятся автоматически через CSS
};

export default function RootLayout({ children }) {
    return (
        /*
           ВАЖНО: suppressHydrationWarning нужен, потому что next-themes
           меняет атрибуты html на клиенте сразу после загрузки.
        */
        <html lang="ru" suppressHydrationWarning>
            <head>
                <Script
                    src="https://telegram.org/js/telegram-web-app.js"
                    strategy="beforeInteractive"
                />
            </head>
            <body className={inter.className}>
                {/*
                    attribute="data-theme": библиотека будет ставить <html data-theme="dark">
                    defaultTheme="system": берет настройку ОС
                    enableSystem: включает авто-определение
                */}
                <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
                    <SettingsProvider>
                        <NotificationProvider>
                            <ToastProvider />
                            <CartProvider>
                                <div className="app-layout-container">
                                    <main className="layout-content">
                                        {children}
                                    </main>
                                    <TabBar />
                                </div>
                            </CartProvider>
                        </NotificationProvider>
                    </SettingsProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}