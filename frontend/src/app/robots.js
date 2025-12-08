// frontend/src/app/robots.js

const BASE_URL = 'https://bf55.ru'; // ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ ДОМЕН

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/checkout/', '/cart/', '/admin/'], // Запрещаем индексировать технические страницы
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}