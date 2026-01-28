'use client';

import React, { useState } from 'react';
import AccordionItem from '@/components/ui/AccordionItem';
import InfoCarousel from '@/components/ui/InfoCarousel';
import { useSettings } from '@/context/SettingsContext';
import styles from '@/app/faq/FaqPage.module.css';

const SECTIONS = [
    { id: 'faq', title: 'Вопросы', subtitle: 'Частые вопросы покупателей' },
    { id: 'about', title: 'О магазине', subtitle: 'Кто мы и наши ценности' },
    { id: 'delivery', title: 'Доставка', subtitle: 'Условия и сроки отправки' },
    { id: 'warranty', title: 'Гарантия', subtitle: 'Обязательства и возвраты' },
];

const FaqPageClient = ({ faqItems }) => {
    const settings = useSettings();
    const [activeSection, setActiveSection] = useState('faq');

    const activeSectionInfo = SECTIONS.find(s => s.id === activeSection);

    const renderContent = () => {
        switch (activeSection) {
            case 'faq':
                return (
                    <div className={styles['faq-list']}>
                        {faqItems && faqItems.length > 0 ? (
                            faqItems.map(item => (
                                <AccordionItem key={item.id} title={item.question}>
                                    <div dangerouslySetInnerHTML={{ __html: item.answer }} />
                                </AccordionItem>
                            ))
                        ) : (
                            <div className={styles['info-section-ph']}>
                                Вопросов пока нет.
                            </div>
                        )}
                    </div>
                );
            case 'about':
                return (
                    <div>
                        {settings.images && <InfoCarousel images={settings.images} />}
                        <div
                            className={styles['info-section-content']}
                            dangerouslySetInnerHTML={{ __html: settings.about_us_section || '<p>Информация обновляется.</p>' }}
                        />
                    </div>
                );
            case 'delivery':
                return (
                    <div
                        className={styles['info-section-content']}
                        dangerouslySetInnerHTML={{ __html: settings.delivery_section || '<p>Информация о доставке обновляется.</p>' }}
                    />
                );
            case 'warranty':
                return (
                    <div
                        className={styles['info-section-content']}
                        dangerouslySetInnerHTML={{ __html: settings.warranty_section || '<p>Информация о гарантии обновляется.</p>' }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles['faq-page']}>

            {/* UNIFIED STICKY NAVIGATION */}
            <div className={styles['sticky-nav-container']}>
                <nav className={styles['nav-scroll-wrapper']}>
                    {SECTIONS.map(section => (
                        <button
                            key={section.id}
                            className={`${styles['nav-tab']} ${activeSection === section.id ? styles['active'] : ''}`}
                            onClick={() => {
                                setActiveSection(section.id);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            {section.title}
                        </button>
                    ))}
                </nav>
            </div>

            <div className={styles['page-container']}>
                <header className={styles['content-header']}>
                    <h1 className={styles['content-title']}>{activeSectionInfo?.title}</h1>
                    <p className={styles['content-subtitle']}>{activeSectionInfo?.subtitle}</p>
                </header>

                <main className={styles['content-area']}>
                    {renderContent()}
                </main>

                {/* GLOBAL CONTACT BLOCK */}
                <div className={styles['bottom-contact-block']}>
                    <h3 className={styles['contact-block-title']}>Остались вопросы?</h3>
                    <p className={styles['contact-block-text']}>
                        Если вы не нашли ответ на свой вопрос, наш менеджер с радостью вам поможет.
                    </p>
                    <a
                        href={`https://t.me/${settings.manager_username || 'manager'}`}
                        className={styles['contact-button']}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Написать менеджеру
                    </a>
                </div>
            </div>
        </div>
    );
};

export default FaqPageClient;