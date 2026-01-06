// src/context/CartContext.js
'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api';
import { useTelegram } from '@/utils/telegram';

export const CartContext = createContext();
export const useCart = () => useContext(CartContext);
export const MAX_QUANTITY = 10;

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectionInfo, setSelectionInfo] = useState({
        subtotal: '0.00',
        discount_amount: '0.00',
        final_total: '0.00',
        applied_rule: null,
        upsell_hint: null,
    });

    const { user } = useTelegram();
    // userId больше не обязателен для работы корзины, но может пригодиться для аналитики

    const totalItems = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.quantity, 0),
        [cartItems]);

    // Дебаунс для пересчета скидок (чтобы не спамить сервер при быстром клике +/-)
    const debouncedCalculate = useCallback(debounce(async (currentItems, currentSelection) => {
        // Формируем payload для расчета
        const selection = currentItems
            .filter(item => currentSelection.has(item.product.id))
            .map(item => ({ product_id: item.product.id, quantity: item.quantity }));

        if (selection.length === 0) {
            setSelectionInfo({
                subtotal: '0.00', discount_amount: '0.00', final_total: '0.00',
                applied_rule: null, upsell_hint: null
            });
            return;
        }

        try {
            const response = await apiClient.post('/calculate-selection/', { selection });
            setSelectionInfo(response.data);
        } catch (error) {
            console.error("Calc error:", error);
        }
    }, 500), []);

    // Обновляем расчеты при изменении корзины локально
    useEffect(() => {
        debouncedCalculate(cartItems, selectedItems);
    }, [cartItems, selectedItems, debouncedCalculate]);

    // Инициализация корзины
    // ИЗМЕНЕНИЕ: Загружаем корзину всегда при монтировании компонента.
    // Авторизация (Telegram или Session ID) теперь обрабатывается автоматически в apiClient.
    useEffect(() => {
        setLoading(true);
        apiClient.get('/cart/')
            .then(res => {
                const items = res.data.items || [];
                setCartItems(items);
                // По умолчанию выбираем все товары, которые пришли с сервера
                setSelectedItems(new Set(items.map(i => i.product.id)));
            })
            .catch(err => {
                console.error("Cart load error:", err);
                // Если корзины нет (например, первый заход без товаров), это не критичная ошибка
            })
            .finally(() => setLoading(false));
    }, []); // Пустой массив зависимостей = запуск 1 раз при старте

    // --- OPTIMISTIC UPDATE LOGIC ---

    // Хелпер для синхронизации с сервером (в фоне)
    const syncItemWithServer = useCallback(debounce(async (productId, quantity, previousQty = null) => {
        try {
            if (quantity <= 0) {
                // Если удалили товар, можно не слать quantity=0, а сразу delete,
                // но ваш бэкенд обрабатывает quantity=0 как удаление.
                await apiClient.post('/cart/', { product_id: productId, quantity: 0 });
            } else {
                await apiClient.post('/cart/', { product_id: productId, quantity });
            }
        } catch (error) {
            console.error("Sync error:", error);
            // Откат состояния при ошибке
            if (previousQty !== null) {
                toast.error("Ошибка синхронизации. Возвращаем значение.");
                setCartItems(prev => {
                    return prev.map(item =>
                        item.product.id === productId ? { ...item, quantity: previousQty } : item
                    );
                });
            } else {
                toast.error("Не удалось сохранить изменения в корзине.");
            }
        }
    }, 500), []);

    const addToCart = (product) => {
        // const toastId = toast.loading('Добавляем...'); // Убрали тост по просьбе пользователя
        setCartItems(prev => {
            const existingIdx = prev.findIndex(item => item.product.id === product.id);
            if (existingIdx >= 0) {
                const newItems = [...prev];
                const newQty = Math.min(newItems[existingIdx].quantity + 1, MAX_QUANTITY);
                newItems[existingIdx] = { ...newItems[existingIdx], quantity: newQty };

                // Синхронизируем
                syncItemWithServer(product.id, newQty, newItems[existingIdx].quantity - 1);
                // toast.success("Количество обновлено", { id: toastId });
                return newItems;
            } else {
                // Новый товар
                const newItem = {
                    id: Date.now(), // Временный ID для ключа React (заменится на ID сервера при перезагрузке)
                    product,
                    quantity: 1,
                    original_price: product.price // Предполагаем, что это текущая цена
                };

                // Добавляем в выбранные автоматически
                setSelectedItems(prevSel => new Set(prevSel).add(product.id));

                syncItemWithServer(product.id, 1, 0);
                // toast.success("Товар в корзине", { id: toastId });
                return [...prev, newItem];
            }
        });
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty > MAX_QUANTITY) {
            toast.error(`Максимум ${MAX_QUANTITY} шт.`);
            return;
        }

        let previousQty = 0;

        setCartItems(prev => {
            const currentItem = prev.find(item => item.product.id === productId);
            previousQty = currentItem ? currentItem.quantity : 0;

            if (newQty <= 0) {
                // Удаление
                syncItemWithServer(productId, 0, previousQty);
                // toast.success("Товар удален"); // Можно и без уведомления, визуально и так понятно
                return prev.filter(item => item.product.id !== productId);
            }

            return prev.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: newQty }
                    : item
            );
        });

        if (newQty > 0) {
            syncItemWithServer(productId, newQty, previousQty);
        }
    };

    const toggleItemSelection = (productId) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === cartItems.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartItems.map(i => i.product.id)));
        }
    };

    const deleteSelectedItems = async () => {
        const idsToDelete = Array.from(selectedItems);

        // Оптимистично удаляем
        setCartItems(prev => prev.filter(item => !selectedItems.has(item.product.id)));
        setSelectedItems(new Set());

        try {
            await apiClient.delete('/cart/', { data: { product_ids: idsToDelete } });
            toast.success("Выбранные товары удалены");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Не удалось удалить товары");
            // Возвращаем удаленные товары, чтобы пользователь видел, что действие не прошло
            // (Для этого нужно было бы сохранить их копию перед удалением, но пока оставим toast)
        }
    };

    const clearCart = () => {
        const allIds = cartItems.map(i => i.product.id);
        setCartItems([]);
        setSelectedItems(new Set());
        apiClient.delete('/cart/', { data: { product_ids: allIds } });
    };

    const value = {
        cartItems,
        totalItems,
        loading,
        selectedItems,
        selectionInfo,
        addToCart,
        updateQuantity,
        toggleSelectAll,
        toggleItemSelection,
        deleteSelectedItems,
        clearCart,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};