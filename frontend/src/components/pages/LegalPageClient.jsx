// frontend/src/components/LegalPageClient.jsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DOMPurify from 'isomorphic-dompurify'; // Защита от XSS
import { useTelegram } from '@/utils/telegram';
import styles from '@/app/legal/[type]/LegalPage.module.css';

const LegalPageClient = ({ title, content }) => {
    const router = useRouter();
    const { BackButton } = useTelegram();

    // Настраиваем кнопку "Назад"
    useEffect(() => {
        BackButton.show();
        const handleBackClick = () => router.back();
        BackButton.onClick(handleBackClick);

        return () => {
            BackButton.offClick(handleBackClick);
            BackButton.hide();
        };
    }, [BackButton, router]);

    if (!content) {
        return (
            <div className={styles['legal-page']}>
                <h1 className={styles['legal-title']}>{title}</h1>
                <p>Текст документа не найден.</p>
            </div>
        );
    }

    return (
        <div className={styles['legal-page']}>
            <h1 className={styles['legal-title']}>{title}</h1>

            <div className={styles['legal-content']}>
                {/* Безопасный вывод HTML */}
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
            </div>
        </div>
    );
};

export default LegalPageClient;