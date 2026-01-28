"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Компоненты
import ProductCard from '@/components/products/ProductCard';
import ProductCardSkeleton from '@/components/products/ProductCardSkeleton';
import ArticleCard from '@/components/articles/ArticleCard';
import PromoCarousel from '@/components/features/PromoCarousel';
import PromoCarouselSkeleton from '@/components/features/PromoCarouselSkeleton';
import DealOfTheDay from '@/components/features/DealOfTheDay';
import SearchBar from '@/components/ui/SearchBar';
import BottomSheet from '@/components/ui/BottomSheet';
import FiltersSheet from '@/components/features/FiltersSheet';

// Утилиты и ассеты
import apiClient from '@/lib/api';
import useDebounce from '@/utils/useDebounce';
import { useSettings } from '@/context/SettingsContext';
import FilterIcon from '@/assets/sort-icon.svg'; // Проверьте, как импортируется SVG (как компонент или src)

// Стили
import styles from '@/app/HomePage.module.css';

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
    const [isPending, startTransition] = React.useTransition();

    // --- Эффекты ---

    // 1. Синхронизация при изменении URL (фильтрация/поиск сработали на сервере)
    // Если пришли новые initialProducts (пользователь что-то нашел или отфильтровал),
    // мы должны обновить локальный стейт.
    useEffect(() => {
        setProducts(initialProducts);
        setNextPage(initialNextPage);
        // Также обновляем поле поиска, если URL изменился извне (например, кнопка "назад")
        // Но только если мы не печатаем прямо сейчас (чтобы фокус не скакал или не стиралось)
        // Простой вариант: всегда обновляем.
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

            startTransition(() => {
                // Используем replace, чтобы не забивать историю браузера каждой буквой,
                // но для завершенного поиска можно использовать push
                // Опция scroll: false важна, чтобы не скроллить наверх при каждом символе
                router.replace(`/?${params.toString()}`, { scroll: false });
            });
        }
    }, [debouncedSearchTerm, router, currentSearchParams]);

    // Обработчик очистки
    const handleClearSearch = () => {
        setSearchTerm('');
        // Эффект с debounce сам подчистит URL
    };

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

            {/* Баннеры: Если данных нет, ничего не показываем */}
            {banners && banners.length > 0 && (
                <PromoCarousel banners={banners} />
            )}

            {/* Товар дня */}
            {dealProduct && <DealOfTheDay product={dealProduct} />}

            {/* Верхняя панель: Поиск и Фильтр */}
            <div className={`${styles['top-bar']} sticky-top-safe`}>
                <SearchBar
                    value={searchTerm}
                    onChange={(newValue) => setSearchTerm(newValue)}
                    onClear={handleClearSearch}
                    isLoading={isPending}
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

            {/* --- NEW: Horizontal Category Chips --- */}
            <div className={styles['filters-bar']}>
                <div className={styles['categories-scroll']}>
                    <div
                        className={`${styles['category-chip']} ${!activeFilters.category ? styles.active : ''}`}
                        onClick={() => handleApplyFilters({ ...activeFilters, category: null })}
                    >
                        Все
                    </div>
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className={`${styles['category-chip']} ${String(activeFilters.category) === String(cat.id) ? styles.active : ''}`}
                            onClick={() => handleApplyFilters({ ...activeFilters, category: cat.id })}
                        >
                            {cat.name}
                        </div>
                    ))}
                </div>
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
                            key={product.id} // key лучше оставить ID, так как он гарантированно уникален
                            ref={isLast ? lastProductElementRef : null}
                        >
                            {/* --- ИЗМЕНЕНИЕ ЗДЕСЬ --- */}
                            {/* Было: href={`/products/${product.id}`} */}
                            {/* Стало: href={`/products/${product.slug}`} */}
                            <Link href={`/products/${product.slug}`} className={styles['product-link']}>
                                <ProductCard
                                    product={product}
                                    priority={isPriority}
                                    searchQuery={activeFilters.search}
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