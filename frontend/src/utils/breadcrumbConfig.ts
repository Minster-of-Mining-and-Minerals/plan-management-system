export interface BreadcrumbItem {
    title: string;
    path: string;
}

export const breadcrumbConfig: Record<string, BreadcrumbItem[]> = {
    // ================================================
    // Dashboard Routes
    // ================================================
    "/dashboard": [{ title: "Dashboard", path: "/dashboard" }],

    // ================================================
    // Base Data Routes
    // ================================================
    "/basedata": [
        { title: "Base Data", path: "/basedata" },
    ],
    "/basedata/sectors": [
        { title: "Base Data", path: "/basedata" },
        { title: "Sectors", path: "/basedata/sectors" },
    ],
    "/basedata/complaint-categories": [
        { title: "Base Data", path: "/basedata" },
        { title: "Complaint Categories", path: "/basedata/complaint-categories" },
    ],

    // ================================================
    // Complaints Routes
    // ================================================
    "/compliants": [
        { title: "Complaints", path: "/compliants" },
    ],
    "/compliants/[complaintId]": [
        { title: "Complaints", path: "/compliants" },
        { title: "Complaint Details", path: "/compliants/[complaintId]" },
    ],

    // ================================================
    // Feedbacks Routes
    // ================================================
    "/feedbacks": [
        { title: "Feedbacks", path: "/feedbacks" },
    ],
    "/feedbacks/[feedbackId]": [
        { title: "Feedbacks", path: "/feedbacks" },
        { title: "Feedback Details", path: "/feedbacks/[feedbackId]" },
    ],

    // ================================================
    // Notifications Routes
    // ================================================
    "/notifications": [
        { title: "Notifications", path: "/notifications" },
    ],

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

    // ================================================
    // Public Routes
    // ================================================
    "/complaint": [{ title: "Submit Complaint", path: "/complaint" }],
    "/feedback": [{ title: "Submit Feedback", path: "/feedback" }],
    "/track-complaint": [{ title: "Track Complaint", path: "/track-complaint" }],

    // ================================================
    // Auth Routes
    // ================================================
    "/login": [{ title: "Login", path: "/login" }],
};