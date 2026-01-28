"use client";

import React, { useState, useEffect } from 'react';
import styles from './FiltersSheet.module.css';
import CheckIcon from '@/assets/check-icon.svg';

// Recursive category component
const CategoryNode = ({ category, selectedId, onSelect, level = 0 }) => {
    const isSelected = category.id === selectedId;

    return (
        <>
            <div
                className={`${styles['category-row']} ${isSelected ? styles.active : ''}`}
                style={{ marginLeft: `${level * 16}px` }}
                onClick={() => onSelect(category.id)}
            >
                <span>{category.name}</span>
                {isSelected && (
                    <span style={{ color: 'var(--app-button-color)', display: 'flex' }}>
                        <CheckIcon width={18} height={18} stroke="currentColor" strokeWidth={3} />
                    </span>
                )}
            </div>
            {category.subcategories && category.subcategories.map(sub => (
                <CategoryNode
                    key={sub.id}
                    category={sub}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    level={level + 1}
                />
            ))}
        </>
    );
};

const FiltersSheet = ({ allCategories, currentFilters, onApply, onClose }) => {
    const [localOrdering, setLocalOrdering] = useState(currentFilters.ordering);
    const [localCategory, setLocalCategory] = useState(currentFilters.category);

    useEffect(() => {
        setLocalOrdering(currentFilters.ordering);
        setLocalCategory(currentFilters.category);
    }, [currentFilters]);

    const sortOptions = [
        { key: '-created_at', label: 'Новинки' },
        { key: '-price', label: 'Сначала дорогие' },
        { key: 'price', label: 'Сначала дешевые' },
    ];

    const handleApply = () => {
        onApply({
            ordering: localOrdering,
            category: localCategory,
        });
        onClose();
    };

    const handleReset = () => {
        setLocalCategory(null);
        setLocalOrdering('-created_at');
    };

    return (
        <div className={styles['filters-sheet']}>
            {/* Header */}
            <div className={styles['filters-header']}>
                <button
                    onClick={handleReset}
                    className={`${styles['header-btn']} ${styles.reset}`}
                >
                    Сбросить
                </button>
                <h3 className={styles['header-title']}>Фильтры</h3>
                <button className={styles['close-btn']} onClick={onClose}>
                    &times;
                </button>
            </div>

            {/* Scrollable Content */}
            <div className={styles['filters-content']}>
                <div className={styles['filters-section']}>
                    <h4>Сортировка</h4>
                    <div className={styles['options-list']}>
                        {sortOptions.map(option => {
                            const isActive = localOrdering === option.key;
                            return (
                                <div
                                    key={option.key}
                                    className={`${styles['option-item']} ${isActive ? styles.active : ''}`}
                                    onClick={() => setLocalOrdering(option.key)}
                                >
                                    <span>{option.label}</span>
                                    {/* Custom Checkbox imitating CartItem */}
                                    <div className={`${styles['custom-checkbox']} ${isActive ? styles.checked : ''}`}>
                                        {/* Always render CheckIcon but CSS handles opacity */}
                                        <CheckIcon />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={styles['filters-section']}>
                    <h4>Категории</h4>
                    <div className={styles['category-tree']}>
                        <div
                            className={`${styles['category-row']} ${!localCategory ? styles.active : ''}`}
                            onClick={() => setLocalCategory(null)}
                        >
                            <span>Все категории</span>
                            {!localCategory && (
                                <span style={{ color: 'var(--app-button-color)', display: 'flex' }}>
                                    <CheckIcon width={18} height={18} stroke="currentColor" strokeWidth={3} />
                                </span>
                            )}
                        </div>
                        {allCategories.map(cat => (
                            <CategoryNode
                                key={cat.id}
                                category={cat}
                                selectedId={localCategory}
                                onSelect={setLocalCategory}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Actions */}
            <div className={styles['bottom-actions']}>
                <button onClick={handleApply} className={styles['apply-btn']}>
                    Показать товары
                </button>
            </div>
        </div>
    );
};

export default FiltersSheet;