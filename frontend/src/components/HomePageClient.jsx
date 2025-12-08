"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Компоненты
import ProductCard from './ProductCard';
import ProductCardSkeleton from './ProductCardSkeleton';
import PromoCarousel from './PromoCarousel';
import PromoCarouselSkeleton from './PromoCarouselSkeleton';
import DealOfTheDay from './DealOfTheDay';
import SearchBar from './SearchBar';
import BottomSheet from './BottomSheet';
import FiltersSheet from './FiltersSheet';

// Утилиты и ассеты
import apiClient from '../lib/api';
import useDebounce from '../utils/useDebounce';
import { useSettings } from '@/context/SettingsContext';
import FilterIcon from '../assets/sort-icon.svg'; // Проверьте, как импортируется SVG (как компонент или src)

// Стили
import styles from '@/components/HomePage.module.css';

export default function HomePageClient({
                                           banners,
                                           categories,
                                           dealProduct,
                                           initialProducts,
                                           initialNextPage,
                                           currentSearchParams
                                       }) {
    const router = useRouter();
    const settings = useSettings();

    // --- Состояния ---

    // Товары инициализируем тем, что пришло с сервера
    const [products, setProducts] = useState(initialProducts);
    const [nextPage, setNextPage] = useState(initialNextPage);

    // Состояния загрузки
    const [loadingMore, setLoadingMore] = useState(false);

    // UI состояния
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Поиск
    const initialSearch = currentSearchParams?.search || '';
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    // --- Эффекты ---

    // 1. Синхронизация при изменении URL (фильтрация/поиск сработали на сервере)
    // Если пришли новые initialProducts (пользователь что-то нашел или отфильтровал),
    // мы должны обновить локальный стейт.
    useEffect(() => {
        setProducts(initialProducts);
        setNextPage(initialNextPage);
        // Также обновляем поле поиска, если URL изменился извне (например, кнопка "назад")
        setSearchTerm(currentSearchParams?.search || '');
    }, [initialProducts, initialNextPage, currentSearchParams]);

    // 2. Обработка поиска (Debounce)
    useEffect(() => {
        // Проверяем, отличается ли текущий дебаунс от того, что уже есть в URL
        const currentUrlSearch = currentSearchParams?.search || '';

        if (debouncedSearchTerm !== currentUrlSearch) {
            const params = new URLSearchParams(currentSearchParams);
            if (debouncedSearchTerm) {
                params.set('search', debouncedSearchTerm);
            } else {
                params.delete('search');
            }
            // Используем replace, чтобы не забивать историю браузера каждой буквой,
            // но для завершенного поиска можно использовать push
            router.replace(`/?${params.toString()}`, { scroll: false });
        }
    }, [debouncedSearchTerm, router, currentSearchParams]);

    // --- Логика Бесконечного Скролла ---

    const observer = useRef();

    const loadMoreProducts = useCallback(async () => {
        if (!nextPage || loadingMore) return;

        setLoadingMore(true);
        try {
            const response = await apiClient.get(nextPage);
            setProducts(prev => [...prev, ...response.data.results]);
            setNextPage(response.data.next);
        } catch (error) {
            console.error("Ошибка при подгрузке товаров:", error);
        } finally {
            setLoadingMore(false);
        }
    }, [nextPage, loadingMore]);

    const lastProductElementRef = useCallback(node => {
        if (loadingMore) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && nextPage) {
                loadMoreProducts();
            }
        });

        if (node) observer.current.observe(node);
    }, [loadingMore, nextPage, loadMoreProducts]);

    // --- Обработчики ---

    const handleApplyFilters = (newFilters) => {
        const params = new URLSearchParams(currentSearchParams);

        if (newFilters.category) params.set('category', newFilters.category);
        else params.delete('category');

        if (newFilters.ordering) params.set('ordering', newFilters.ordering);
        else params.delete('ordering');

        // При применении фильтров сбрасываем поиск, если это требуется логикой,
        // или оставляем. В React версии поиск брался из currentFilters.
        // Здесь мы оставляем search, если он был.

        setIsFiltersOpen(false);
        router.push(`/?${params.toString()}`);
    };

    // Собираем объект текущих фильтров для передачи в FiltersSheet
    const activeFilters = {
        category: currentSearchParams?.category || null,
        ordering: currentSearchParams?.ordering || '-created_at',
        search: currentSearchParams?.search || '',
    };

    return (
        <div className={styles['home-page']}>

            {/* Баннеры: Если данных нет, показываем скелетон (хотя с SSR данные уже должны быть) */}
            {banners && banners.length > 0 ? (
                <PromoCarousel banners={banners} />
            ) : (
                <PromoCarouselSkeleton />
            )}

            {/* Товар дня */}
            {dealProduct && <DealOfTheDay product={dealProduct} />}

            {/* Верхняя панель: Поиск и Фильтр */}
            {/* sticky-top-safe - глобальный класс, styles['top-bar'] - локальный */}
            <div className={`${styles['top-bar']} sticky-top-safe`}>
                <SearchBar
                    value={searchTerm}
                    onChange={(newValue) => setSearchTerm(newValue)}
                    // Было: settings.search_placeholder || "Найти товары..."
                    // Стало:
                    placeholder={settings.search_placeholder || "Поиск по названию или артикулу..."}
                />
                <button
                    className={styles['filter-button']}
                    onClick={() => setIsFiltersOpen(true)}
                    aria-label="Фильтры"
                >
                    <FilterIcon />
                </button>
            </div>

            {/* Сетка товаров */}
            <div className={styles['products-grid']}>
                {products.map((product, index) => {
                    const isLast = products.length === index + 1;

                    // Определяем, приоритетная ли это картинка.
                    // Обычно первые 4 товара видны на первом экране.
                    const isPriority = index < 4;

                    return (
                        <div
                            key={product.id}
                            ref={isLast ? lastProductElementRef : null}
                        >
                            <Link href={`/products/${product.id}`} className={styles['product-link']}>
                                {/* Передаем priority в компонент */}
                                <ProductCard
                                    product={product}
                                    priority={isPriority}
                                />
                            </Link>
                        </div>
                    );
                })}

                {/* Скелетоны при подгрузке (Infinite Scroll) */}
                {loadingMore && (
                    [...Array(2)].map((_, i) => <ProductCardSkeleton key={`skeleton-more-${i}`} />)
                )}
            </div>

            {/* Сообщение, если товаров нет */}
            {products.length === 0 && (
                <div className={styles['no-products-message']}>
                    Товары не найдены
                </div>
            )}

            {/* Нижняя шторка с фильтрами */}
            <BottomSheet isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)}>
                <FiltersSheet
                    allCategories={categories}
                    currentFilters={activeFilters}
                    onApply={handleApplyFilters}
                    onClose={() => setIsFiltersOpen(false)}
                />
            </BottomSheet>
        </div>
    );
}