// src/components/ShareModal.jsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import styles from './ShareModal.module.css';

const SocialIcons = {
    Telegram: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.665 3.333L3.333 10.665L9.333 13.333L18.665 6.665L11.333 14.665L18.665 20.665L20.665 3.333Z"
                fill="#2AABEE" stroke="#2AABEE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    WhatsApp: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5C21 16.7467 16.7467 21 11.5 21C9.69255 21 8.01633 20.4965 6.57745 19.617L3 21L4.383 17.4225C3.50352 15.9837 3 14.3075 3 12.5C3 7.25329 7.25329 3 12.5 3C17.7467 3 21 7.25329 21 11.5Z"
                stroke="#25D366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.5 15.5C16.1264 16.3315 15.6321 16.5542 14.5 16C13.5658 15.5428 11.6967 14.4644 10.5 12.5C9.5 10.8587 9.5 10 10.5 9C10.8035 8.69647 11 8.5 11.5 8.5C12 8.5 12 8.5 12.5 9.5C12.8753 10.2505 13 10.5 12.5 11C12.2882 11.2118 12.25 11.25 12.5 11.5C13 12 14 13 14.5 13.5C14.75 13.75 14.7882 13.7118 15 13.5C15.5 13 15.75 13.1247 16.5 13.5C16.8906 13.6953 17 14 17 14.5C17 15 16.8736 14.6685 16.5 15.5Z"
                fill="#25D366" fillOpacity="0.8" />
        </svg>
    ),
    VK: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 3H8.5C5.46243 3 3 5.46243 3 8.5V15.5C3 18.5376 5.46243 21 8.5 21H15.5C18.5376 21 21 18.5376 21 15.5V8.5C21 5.46243 18.5376 3 15.5 3Z"
                stroke="#0077FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 9H9.5C9.5 9 9.5 11 11 12C12.5 13 12.5 10 12.5 10H14C14 10 13.843 12.836 15 14H13.5C13.5 14 13.3 13 12.5 12.5C11.7 12 11.5 14 10.5 14C8 14 7.5 9 8 9Z"
                fill="#0077FF" />
        </svg>
    ),
    Copy: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    ),
    Close: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    )
};

const ShareModal = ({ isOpen, onClose, url, title }) => {
    const [mounted, setMounted] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        setMounted(true);

        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
            // Focus trap could be implemented here, but simple escape is often enough for this complexity
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Ссылка скопирована', {
                style: {
                    borderRadius: '12px',
                    background: 'var(--app-bg-color)',
                    color: 'var(--app-text-color)',
                    border: '1px solid var(--app-separator-color)',
                },
                iconTheme: {
                    primary: 'var(--positive-action)',
                    secondary: '#fff',
                },
            });
            // Optional: Close modal after copy
            // setTimeout(onClose, 500); 
        } catch (err) {
            console.error('Failed to copy', err);
            toast.error('Ошибка копирования');
        }
    };

    if (!mounted || !isOpen) return null;

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title || 'Посмотрите этот товар!');

    // Using specialized share URLs
    const telegramLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    const whatsappLink = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
    const vkLink = `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}`;

    return createPortal(
        <div className={styles['share-modal-overlay']} onClick={onClose} role="presentation">
            <div
                className={styles['share-modal-content']}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-modal-title"
                ref={modalRef}
            >
                <div className={styles['modal-header']}>
                    <h3 id="share-modal-title" className={styles['modal-title']}>Поделиться</h3>
                    <button className={styles['close-button']} onClick={onClose} aria-label="Закрыть">
                        {SocialIcons.Close}
                    </button>
                </div>

                <div className={styles['share-options-list']}>
                    {/* Telegram */}
                    <a href={telegramLink} target="_blank" rel="noopener noreferrer" className={styles['share-option-item']}>
                        <div className={styles['share-icon-wrapper']}>
                            {SocialIcons.Telegram}
                        </div>
                        Telegram
                    </a>

                    {/* WhatsApp */}
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={styles['share-option-item']}>
                        <div className={styles['share-icon-wrapper']}>
                            {SocialIcons.WhatsApp}
                        </div>
                        WhatsApp
                    </a>

                    {/* VK */}
                    <a href={vkLink} target="_blank" rel="noopener noreferrer" className={styles['share-option-item']}>
                        <div className={styles['share-icon-wrapper']}>
                            {SocialIcons.VK}
                        </div>
                        ВКонтакте
                    </a>

                    {/* Copy Link */}
                    <button className={styles['share-option-item']} onClick={handleCopy}>
                        <div className={styles['share-icon-wrapper']} style={{ color: 'var(--app-text-color)' }}>
                            {SocialIcons.Copy}
                        </div>
                        Копировать ссылку
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShareModal;
