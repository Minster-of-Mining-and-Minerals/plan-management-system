// components/HydrationSafeDiv.tsx
'use client';

import { ReactNode } from 'react';

interface HydrationSafeDivProps {
    className?: string;
    children?: ReactNode;
    [key: string]: any;
}

export default function HydrationSafeDiv({
    className,
    children,
    ...props
}: HydrationSafeDivProps) {
    return (
        <div
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </div>
    );
}