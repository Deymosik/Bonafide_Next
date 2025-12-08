// файл: src/components/AccordionItem.js
"use client";

import React, { useState } from 'react';
import styles from './AccordionItem.module.css';

const AccordionItem = ({ title, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);

    return (
        <div className={styles['accordion-item-wrapper']}>
            <button
                className={styles['accordion-header']}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <span>{title}</span>
                <svg
                    className={`${styles['accordion-arrow']} ${isOpen ? styles['open'] : ''}`}
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </button>

            {/* Используем класс .open для управления видимостью через CSS */}
            <div className={`${styles['accordion-answer-panel']} ${isOpen ? styles['open'] : ''}`}>
                <div className={styles['accordion-content-inner']}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AccordionItem;