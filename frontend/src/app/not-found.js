"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './not-found.module.css';

export default function NotFound() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.errorCode}>404</div>
            <h2 className={styles.title}>Страница не найдена</h2>
            <p className={styles.description}>
                Мы не можем найти страницу, которую вы ищете.<br />
                Возможно, она была удалена, или ссылка неверна.
            </p>

            <div className={styles.actions}>
                <Link href="/" className={styles.buttonPrimary}>
                    На главную
                </Link>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '100%', flex: 1 }}>
                    <Link href="/#catalog" className={styles.buttonSecondary}>
                        Каталог
                    </Link>
                    <button onClick={() => router.back()} className={styles.buttonSecondary}>
                        Назад
                    </button>
                </div>
            </div>
        </div>
    );
}