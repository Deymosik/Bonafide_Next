// frontend/src/context/CartContext.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import apiClient from '../api';
jest.mock('../api');
const mockProduct1 = { id: 1, name: 'Product 1', price: '100.00' };
describe('CartContext Logic', () => {
    beforeEach(() => {
        apiClient.post.mockResolvedValue({ data: {} });
    });

    it('should add a new item to the cart', () => {
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.addToCart(mockProduct1));
        expect(result.current.cartItems).toHaveLength(1);
    });

    // ... (остальные синхронные тесты остаются без изменений)
    it('should increase quantity if item already exists', () => {
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.addToCart(mockProduct1));
        act(() => result.current.addToCart(mockProduct1));
        expect(result.current.cartItems[0].quantity).toBe(2);
    });

    it('should update the quantity of an item', () => {
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.addToCart(mockProduct1));
        act(() => result.current.updateQuantity(mockProduct1.id, 5));
        expect(result.current.cartItems[0].quantity).toBe(5);
    });

    it('should remove an item if quantity is updated to 0', () => {
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.addToCart(mockProduct1));
        act(() => result.current.updateQuantity(mockProduct1.id, 0));
        expect(result.current.cartItems).toHaveLength(0);
    });

    it('should clear the cart', () => {
        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });
        act(() => result.current.addToCart(mockProduct1));
        act(() => result.current.clearCart());
        expect(result.current.cartItems).toHaveLength(0);
    });

    it('should call API when items are added and update state', async () => {
        const mockResponse = { data: { final_total: '90.00' } };
        apiClient.post.mockResolvedValue(mockResponse);

        const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;
        const { result } = renderHook(() => useCart(), { wrapper });

        act(() => {
            result.current.addToCart(mockProduct1);
        });

        await waitFor(() => {
            expect(result.current.discountInfo.final_total).toBe('90.00');
        });

        expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
});