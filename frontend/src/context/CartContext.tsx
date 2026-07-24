import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
    cartItemId: string;
    id: number;
    name: string;
    base_price: number;
    quantity: number;
    image_url?: string;
    variants?: any[];
    selectedVariant?: any;
    notes?: string;
    is_service?: boolean;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: any, variant?: any) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, qty: number) => void;
    updateItemVariant: (cartItemId: string, newVariant: any) => void;
    updateItemNotes: (cartItemId: string, notes: string) => void;
    clearCart: () => void;
    subtotal: number;
    total: number;
    shippingCost: number;
    setShippingCost: (cost: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [shippingCost, setShippingCost] = useState(0);

    const addToCart = (product: any, variant?: any) => {
        setCart(prev => {
            const variantId = variant ? (variant.name || variant.id) : 'BASE';
            const cartItemId = `${product.id}-${variantId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            return [{ ...product, cartItemId, quantity: 1, selectedVariant: variant }, ...prev];
        });
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId: string, qty: number) => {
        if (qty <= 0) {
            removeFromCart(cartItemId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.cartItemId === cartItemId ? { ...item, quantity: qty } : item
        ));
    };

    const updateItemVariant = (cartItemId: string, newVariant: any) => {
        setCart(prev => {
            const item = prev.find(i => i.cartItemId === cartItemId);
            if (!item) return prev;

            const variantId = newVariant ? (newVariant.name || newVariant.id) : 'BASE';
            const newCartItemId = `${item.id}-${variantId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            return prev.map(i => i.cartItemId === cartItemId ? { ...i, selectedVariant: newVariant, cartItemId: newCartItemId } : i);
        });
    };

    const updateItemNotes = (cartItemId: string, notes: string) => {
        setCart(prev => prev.map(item =>
            item.cartItemId === cartItemId ? { ...item, notes } : item
        ));
    };

    const clearCart = () => {
        setCart([]);
        setShippingCost(0);
    };

    // Calculate totals using selected variant
    const calculateTotals = () => {
        let subtotal = 0;
        cart.forEach(item => {
            let unitPrice = item.selectedVariant ? item.selectedVariant.price : item.base_price;
            subtotal += unitPrice * item.quantity;
        });
        return { subtotal, total: subtotal + shippingCost };
    };

    const { subtotal, total } = calculateTotals();

    return (
        <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, updateItemVariant, updateItemNotes, clearCart, subtotal, total, shippingCost, setShippingCost }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
