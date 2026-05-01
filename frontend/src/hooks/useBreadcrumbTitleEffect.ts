"use client"
import { useEffect } from "react";
import { useBreadcrumbTitle } from "../providers/BreadcrumbProvider";

/**
 * Hook to automatically set breadcrumb title and ID from API data
 * Sets the title for the last breadcrumb (current page)
 * 
 * @example
 * ```tsx
 * const { data: category } = useGetIssueCategoryByIdQuery(id!);
 * useBreadcrumbTitleEffect(category?.name, category?.category_id);
 * ```
 */
export const useBreadcrumbTitleEffect = (
    title: string | undefined | null,
    id?: string | undefined | null
) => {
    const { setDynamicBreadcrumb, setDynamicTitle, clearDynamicTitle } = useBreadcrumbTitle();

    useEffect(() => {
        if (title) {
            setDynamicBreadcrumb({ title, id: id || null });
            // Also store the title by ID for use in nested breadcrumbs
            if (id) {
                setDynamicTitle(id, title);
            }
        } else if (title === null) {
            // Only clear if explicitly passed as null (not undefined)
            // undefined means "not set yet" (e.g., data still loading)
            setDynamicBreadcrumb({ title: null, id: null });
        }
        // If title is undefined, don't clear - preserve existing breadcrumb

        // Cleanup: reset when component unmounts
        return () => {
            setDynamicBreadcrumb({ title: null, id: null });
            if (id) {
                clearDynamicTitle(id);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, id]); // Functions are now stable (memoized), so we don't need them in deps
};

/**
 * Hook to set a breadcrumb title by ID (useful for parent breadcrumbs in nested routes)
 * 
 * @example
 * ```tsx
 * // In institute detail page, set the institute name for nested routes
 * const { data: institute } = useGetInstituteByIdQuery(id!);
 * useBreadcrumbTitleById(id!, institute?.name);
 * ```
 */
export const useBreadcrumbTitleById = (
    id: string | undefined | null,
    title: string | undefined | null
) => {
    const { setDynamicTitle, clearDynamicTitle } = useBreadcrumbTitle();

    useEffect(() => {
        if (id && title) {
            setDynamicTitle(id, title);
        } else if (id) {
            // If title is not available but ID is, clear it
            clearDynamicTitle(id);
        }

        // Cleanup: remove title when component unmounts
        return () => {
            if (id) {
                clearDynamicTitle(id);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, title]); // Functions are now stable (memoized), so we don't need them in deps
};
