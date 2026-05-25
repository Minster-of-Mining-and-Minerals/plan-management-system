export interface BreadcrumbItem {
    title: string;
    path: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
    // ================================================
    // Dashboard Routes
    // ================================================
    "/dashboard": [{ title: "Dashboard", path: "/dashboard" }],
    "/profile": [{ title: "Profile", path: "/profile" }],

    // ================================================
    // Users Routes
    // ================================================
    "/users/list": [
        { title: "Users", path: "/users/list" },
    ],
    "/users/list/[userId]": [
        { title: "Users", path: "/users/list" },
        { title: "User Details", path: "/users/list/[userId]" },
    ],
    "/users/permissions": [
        { title: "Users", path: "/users/list" },
        { title: "Permissions", path: "/users/permissions" },
    ],
    "/users/roles": [
        { title: "Users", path: "/users/list" },
        { title: "Roles", path: "/users/roles" },
    ],
    "/users/roles/new": [
        { title: "Users", path: "/users/list" },
        { title: "Roles", path: "/users/roles" },
        { title: "New Role", path: "/users/roles/new" },
    ],
    "/branding": [{ title: "Branding", path: "/branding" }],
    "/branding/new": [
        { title: "Branding", path: "/branding" },
        { title: "New Branding", path: "/branding/new" },
    ],
    "/branding/[id]": [
        { title: "Branding", path: "/branding" },
        { title: "Edit Branding", path: "/branding/[id]" },
    ],

    // ================================================
    // Auth Routes
    // ================================================
    "/login": [{ title: "Login", path: "/login" }],
};