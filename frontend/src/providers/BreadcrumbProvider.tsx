"use client"
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface BreadcrumbItem {
    title: string | null;
    id?: string | null;
}

interface BreadcrumbContextType {
    dynamicBreadcrumb: BreadcrumbItem;
    setDynamicBreadcrumb: (item: BreadcrumbItem) => void;
    // Map to store multiple dynamic titles by their ID (e.g., institute name, project name)
    dynamicTitles: Record<string, string>;
    setDynamicTitle: (id: string, title: string) => void;
    clearDynamicTitle: (id: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dynamicBreadcrumb, setDynamicBreadcrumb] = useState<BreadcrumbItem>({
        title: null,
        id: null,
    });
    const [dynamicTitles, setDynamicTitles] = useState<Record<string, string>>({});

    // Memoize functions to prevent infinite loops in useEffect dependencies
    const setDynamicTitle = useCallback((id: string, title: string) => {
        setDynamicTitles((prev) => {
            // Only update if the title actually changed
            if (prev[id] === title) {
                return prev;
            }
            return { ...prev, [id]: title };
        });
    }, []);

    const clearDynamicTitle = useCallback((id: string) => {
        setDynamicTitles((prev) => {
            if (!(id in prev)) {
                return prev;
            }
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    }, []);

    return (
        <BreadcrumbContext.Provider
            value={{
                dynamicBreadcrumb,
                setDynamicBreadcrumb,
                dynamicTitles,
                setDynamicTitle,
                clearDynamicTitle,
            }}
        >
            {children}
        </BreadcrumbContext.Provider>
    );
};

export const useBreadcrumbTitle = () => {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error("useBreadcrumbTitle must be used within BreadcrumbProvider");
    }
    return context;
};
