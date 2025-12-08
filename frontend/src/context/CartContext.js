// src/context/CartContext.js
'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
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
    const userId = user?.id;

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
    useEffect(() => {
        if (userId || process.env.NODE_ENV === 'development') {
            setLoading(true);
            apiClient.get('/cart/')
                .then(res => {
                    const items = res.data.items || [];
                    setCartItems(items);
                    setSelectedItems(new Set(items.map(i => i.product.id)));
                })
                .catch(err => console.error("Cart load error:", err))
                .finally(() => setLoading(false));
        }
    }, [userId]);

    // --- OPTIMISTIC UPDATE LOGIC ---

    // Хелпер для синхронизации с сервером (в фоне)
    const syncItemWithServer = useCallback(debounce(async (productId, quantity) => {
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
            // Тут в идеале нужно откатить стейт назад или показать тост об ошибке
        }
    }, 300), []);

    const addToCart = (product) => {
        setCartItems(prev => {
            const existingIdx = prev.findIndex(item => item.product.id === product.id);
            if (existingIdx >= 0) {
                const newItems = [...prev];
                const newQty = Math.min(newItems[existingIdx].quantity + 1, MAX_QUANTITY);
                newItems[existingIdx] = { ...newItems[existingIdx], quantity: newQty };

                // Синхронизируем
                syncItemWithServer(product.id, newQty);
                return newItems;
            } else {
                // Новый товар
                const newItem = {
                    id: Date.now(), // Временный ID для ключа
                    product,
                    quantity: 1,
                    original_price: product.price // Предполагаем, что это текущая цена
                };

                // Добавляем в выбранные автоматически
                setSelectedItems(prevSel => new Set(prevSel).add(product.id));

                syncItemWithServer(product.id, 1);
                return [...prev, newItem];
            }
        });
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty > MAX_QUANTITY) return;

        setCartItems(prev => {
            if (newQty <= 0) {
                // Удаление
                syncItemWithServer(productId, 0);
                return prev.filter(item => item.product.id !== productId);
            }

            return prev.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: newQty }
                    : item
            );
        });

        if (newQty > 0) {
            syncItemWithServer(productId, newQty);
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
        } catch (error) {
            console.error("Delete error:", error);
            // Тут нужен reload страницы или откат
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