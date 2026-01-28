// src/components/ShareButton.jsx
'use client';

import React, { useState } from 'react';
import ShareModal from './ShareModal';

const ShareButton = ({ title, text, url, className }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleShare = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const shareData = {
            title: title || 'Посмотрите этот товар',
            text: text,
            url: url || window.location.href,
        };

        if (isMobile && navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <button
                className={className}
                onClick={handleShare}
                aria-label="Поделиться"
                type="button"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
            </button>

            <ShareModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                url={url || (typeof window !== 'undefined' ? window.location.href : '')}
                title={title}
            />
        </>
    );
};

export default ShareButton;
