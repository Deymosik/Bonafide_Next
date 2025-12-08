// файл: src/components/FiltersSheet.js
// Язык: JavaScript

"use client"; // 1. Обязательно для компонентов с хуками (useState, useEffect)

import React, { useState, useEffect } from 'react';
// 2. Импортируем стили как объект
import styles from './FiltersSheet.module.css';

// Вспомогательный рекурсивный компонент
// Адаптируем его для использования классов из объекта styles
const CategoryNode = ({ category, selectedId, onSelect, level = 0 }) => (
    <div className={styles['category-tree-node']} style={{ paddingLeft: `${level * 20}px` }}>
        <p
            // Комбинируем базовый класс и класс активности через шаблонную строку
            className={`${styles['category-name']} ${category.id === selectedId ? styles.active : ''}`}
            onClick={() => onSelect(category.id)}
        >
            {category.name}
        </p>
        {category.subcategories && category.subcategories.map(sub => (
            <CategoryNode key={sub.id} category={sub} selectedId={selectedId} onSelect={onSelect} level={level + 1} />
        ))}
    </div>
);

const FiltersSheet = ({ allCategories, currentFilters, onApply, onClose }) => {
    const [localOrdering, setLocalOrdering] = useState(currentFilters.ordering);
    const [localCategory, setLocalCategory] = useState(currentFilters.category);

    useEffect(() => {
        setLocalOrdering(currentFilters.ordering);
        setLocalCategory(currentFilters.category);
    }, [currentFilters]);

    const sortOptions = [
        { key: '-created_at', label: 'По умолчанию (новые)' },
        { key: 'price', label: 'Сначала дешевле' },
        { key: '-price', label: 'Сначала дороже' },
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
            <div className={styles['filters-header']}>
                <button
                    onClick={handleReset}
                    className={`${styles['header-btn']} ${styles.reset}`}
                >
                    Сбросить
                </button>
                <h3 className={styles['header-title']}>Фильтры</h3>
                <button
                    onClick={handleApply}
                    className={`${styles['header-btn']} ${styles.apply}`}
                >
                    Применить
                </button>
            </div>

            <div className={styles['filters-section']}>
                <h4>Сортировка</h4>
                {sortOptions.map(option => (
                    <div
                        key={option.key}
                        className={`${styles['sort-option']} ${localOrdering === option.key ? styles.active : ''}`}
                        onClick={() => setLocalOrdering(option.key)}
                    >
                        {option.label}
                        {localOrdering === option.key && '•'}
                    </div>
                ))}
            </div>

            <div className={styles['filters-section']}>
                <h4>Категории</h4>
                <div className={styles['category-tree']}>
                    <p
                        className={`${styles['category-name']} ${!localCategory ? styles.active : ''}`}
                        onClick={() => setLocalCategory(null)}
                    >
                        Все категории
                    </p>
                    {allCategories.map(cat => (
                        <CategoryNode key={cat.id} category={cat} selectedId={localCategory} onSelect={setLocalCategory} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FiltersSheet;