/** Shared Tailwind classes for sidebar navigation — driven by branding CSS variables. */

export const sidebarTopNavClasses =
  "text-primary hover:bg-sidebar-nav-hover px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-nav-active data-[active=true]:text-sidebar-nav-active-foreground";

export const sidebarTopNavCollapsibleClasses =
  "text-primary hover:bg-sidebar-nav-hover hover:data-[active=false]:bg-sidebar-nav-hover hover:data-[active=true]:bg-sidebar-nav-active hover:data-[active=true]:text-sidebar-nav-active-foreground px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-nav-active data-[active=true]:text-sidebar-nav-active-foreground";

export const sidebarSubNavClasses =
  "text-primary hover:bg-sidebar-nav-hover hover:data-[active=false]:bg-sidebar-nav-hover hover:data-[active=true]:bg-sidebar-subnav-active hover:data-[active=true]:text-sidebar-subnav-active-foreground group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-subnav-active data-[active=true]:text-sidebar-subnav-active-foreground";
