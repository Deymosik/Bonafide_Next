'use client';

import React, { useState } from 'react';
import AccordionItem from './AccordionItem';
import InfoCarousel from './InfoCarousel';
import { useSettings } from '@/context/SettingsContext';
import styles from '../app/faq/FaqPage.module.css';

const FaqPageClient = ({ faqItems }) => {
    const settings = useSettings();
    const [activeTab, setActiveTab] = useState('about');

    const tabs = [
        { id: 'about', title: 'О нас' },
        { id: 'delivery', title: 'Доставка' },
        { id: 'warranty', title: 'Гарантия' },
    ];

    const SectionContent = ({ content }) => {
        if (!content) return <p className={styles['info-section-placeholder']}>Информация скоро появится.</p>;
        return <div className={styles['info-section-content']} dangerouslySetInnerHTML={{ __html: content }} />;
    };

    return (
        <div className={styles['faq-page']}>
            {/*
               ИСПРАВЛЕНИЕ:
               Выносим контент из sticky-блока.
               Липким остается только блок с кнопками (навигация).
            */}
            <div
                className={`${styles['info-tabs-nav']} sticky-top-safe`}
                style={{backgroundColor: 'var(--app-bg-color)', zIndex: 10}}
            >
                <div className={styles['segmented-control']}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles['segment-button']} ${activeTab === tab.id ? styles['active'] : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Контент теперь идет отдельно и может растягиваться бесконечно вниз */}
            <div className={styles['content-container']}>
                {activeTab === 'about' && (
                    <div className={`${styles['content-tab']} ${styles['active']}`} key="about">
                        {settings.images && <InfoCarousel images={settings.images}/>}
                        <SectionContent content={settings.about_us_section}/>
                    </div>
                )}
                {activeTab === 'delivery' && (
                    <div className={`${styles['content-tab']} ${styles['active']}`} key="delivery">
                        <SectionContent content={settings.delivery_section}/>
                    </div>
                )}
                {activeTab === 'warranty' && (
                    <div className={`${styles['content-tab']} ${styles['active']}`} key="warranty">
                        <SectionContent content={settings.warranty_section}/>
                    </div>
                )}
            </div>

            {/* БЛОК С FAQ */}
            <div className={styles['faq-accordion-section']}>
                <h2 className={styles['info-section-title']}>Частые вопросы</h2>
                {faqItems.length > 0 ? (
                    <div className={styles['faq-list']}>
                        {faqItems.map(item => (
                            <AccordionItem key={item.id} title={item.question}>
                                <div dangerouslySetInnerHTML={{__html: item.answer}}/>
                            </AccordionItem>
                        ))}
                    </div>
                ) : (
                    <p className={styles['info-section-placeholder']}>Пока здесь нет частых вопросов.</p>
                )}
            </div>

            {/* Блок с контактами */}
            <div className={styles['contacts-section']}>
                <h2 className={styles['info-section-title']}>Остались вопросы?</h2>
                <div className={styles['contacts-content']}>
                    <p>Свяжитесь с нашим менеджером в Telegram для быстрой консультации.</p>
                    <a
                        href={`https://t.me/${settings.manager_username}`}
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