"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import BottomSheet from '@/components/ui/BottomSheet';
import AccordionItem from '@/components/ui/AccordionItem';
import styles from './ProductFeatures.module.css';

const ProductFeatures = ({ features }) => {
    const [selectedFeature, setSelectedFeature] = useState(null);

    if (!features || features.length === 0) return null;

    return (
        <>
            <AccordionItem title="Функционал">
                <div className={styles['features-grid']}>
                    {features.map((feature, index) => (
                        <button
                            key={index}
                            type="button"
                            className={styles['feature-item']}
                            onClick={() => setSelectedFeature(feature)}
                            title={feature.description || feature.name}
                            aria-label={`Открыть описание функции: ${feature.name}`}
                        >
                            <div className={styles['feature-icon-wrapper']}>
                                {feature.icon_url ? (
                                    <Image
                                        src={feature.icon_url}
                                        alt=""
                                        width={40}
                                        height={40}
                                        className={styles['feature-icon']}
                                    />
                                ) : (
                                    <div className={styles['feature-icon-placeholder']}>●</div>
                                )}
                            </div>
                            <div className={styles['feature-text-content']}>
                                <span className={styles['feature-name']}>{feature.name}</span>
                                {/* Optional: Add truncated description here if needed */}
                            </div>
                        </button>
                    ))}
                </div>
            </AccordionItem>

            {/* --- Feature Details Sheet --- */}
            <BottomSheet isOpen={!!selectedFeature} onClose={() => setSelectedFeature(null)}>
                {selectedFeature && (
                    <div className={styles['feature-sheet-content']}>
                        <div className={styles['feature-sheet-header']}>
                            <div className={styles['feature-sheet-icon-wrapper']}>
                                {selectedFeature.icon_url ? (
                                    <Image
                                        src={selectedFeature.icon_url}
                                        alt={selectedFeature.name}
                                        width={140}
                                        height={140}
                                        className={styles['feature-sheet-icon']}
                                        priority
                                    />
                                ) : (
                                    <div className={styles['feature-sheet-icon-placeholder']}>●</div>
                                )}
                            </div>
                            <h3 className={styles['feature-sheet-title']}>{selectedFeature.name}</h3>
                        </div>
                        <div className={styles['feature-sheet-body']}>
                            {selectedFeature.description ? (
                                <p className={styles['feature-sheet-description']}>{selectedFeature.description}</p>
                            ) : (
                                <p className={styles['feature-sheet-empty']}>Описание отсутствует</p>
                            )}
                        </div>
                        <button
                            type="button"
                            className={styles['feature-sheet-close-btn']}
                            onClick={() => setSelectedFeature(null)}
                        >
                            Понятно
                        </button>
                    </div>
                )}
            </BottomSheet>
        </>
    );
};

export default ProductFeatures;
