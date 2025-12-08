import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>Страница не найдена</h2>
            <p>К сожалению, такой страницы или товара не существует.</p>
            <br />
            <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
                Вернуться на главную
            </Link>
        </div>
    );
}