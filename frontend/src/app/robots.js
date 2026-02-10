// frontend/src/app/robots.js

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/checkout/', '/cart/', '/admin/', '/api/admin-secret-debug/'], // Запрещаем индексировать технические страницы
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}