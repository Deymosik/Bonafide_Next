export const dynamic = 'force-dynamic';

import React from 'react';
import OrderSuccessPage from '@/components/checkout/OrderSuccessPage';

export const metadata = {
    title: 'Заказ успешно оформлен',
    description: 'Спасибо за ваш заказ!',
    robots: {
        index: false,
        follow: false,
    },
};

export default function CheckoutSuccessPage() {
    return <OrderSuccessPage />;
}
