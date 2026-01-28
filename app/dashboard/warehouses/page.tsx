'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WarehousesRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/organizations');
    }, [router]);

    return null;
}
