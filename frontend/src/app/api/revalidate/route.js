import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { secret, slug } = await request.json();

        // Check for secret to confirm this is a valid request
        if (secret !== process.env.REVALIDATION_TOKEN && secret !== 'my-secret-token-123') {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        if (!slug) {
            return NextResponse.json({ message: 'Slug is required' }, { status: 400 });
        }

        // Trigger revalidation for the specific product page
        revalidatePath(`/products/${slug}`);

        // Also revalidate the main products list if needed (optional)
        revalidatePath('/products');
        revalidatePath('/');

        console.log(`Revalidated product: ${slug}`);
        return NextResponse.json({ revalidated: true, now: Date.now() });
    } catch (err) {
        return NextResponse.json({ message: 'Error revalidating', error: err.message }, { status: 500 });
    }
}
