// файл: src/components/SearchBar.js
// Язык: JavaScript

"use client"; // 1. Обязательно: компонент обрабатывает ввод данных (интерактив)

import React from 'react';
// Импорт SVG как компонента (требует настройки next.config.js, см. ниже)
import SearchIcon from '../assets/search-icon.svg';
import CloseIcon from '../assets/close-icon.svg';
// 2. Импортируем стили как объект
import styles from './SearchBar.module.css';

const SearchBar = ({ value, onChange, placeholder, inputRef, isLoading, onClear }) => {
    return (
        // 3. Используем классы из объекта styles
        <div className={styles['search-bar-wrapper']}>
            <SearchIcon className={styles['search-bar-icon']} />
            <input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                className={styles['search-bar-input']}
                value={value}
                // Логика остается прежней: извлекаем value из события и передаем родителю
                onChange={(e) => onChange(e.target.value)}
            />
            {isLoading && <div className={styles['search-bar-loading']} />}
            {!isLoading && value && (
                <button
                    className={styles['search-bar-clear']}
                    onClick={onClear}
                    type="button"
                    aria-label="Очистить поиск"
                >
                    <CloseIcon />
                </button>
            )}
        </div>
    );
};

export default SearchBar;