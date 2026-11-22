/** Shared Tailwind classes for sidebar navigation — driven by branding CSS variables. */

export const sidebarTopNavClasses =
  "text-primary hover:bg-sidebar-nav-hover px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-nav-active data-[active=true]:text-sidebar-nav-active-foreground";

export const sidebarTopNavCollapsibleClasses =
  "text-primary hover:bg-sidebar-nav-hover hover:data-[active=false]:bg-sidebar-nav-hover hover:data-[active=true]:bg-sidebar-nav-active hover:data-[active=true]:text-sidebar-nav-active-foreground px-5 py-5 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center data-[active=true]:bg-sidebar-nav-active data-[active=true]:text-sidebar-nav-active-foreground";

export const sidebarSubNavClasses =
  "text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60 data-[active=true]:bg-[#E5A93C]/20 data-[active=true]:text-amber-950 dark:data-[active=true]:text-amber-200 data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-[#E5A93C] data-[active=true]:shadow-2xs group-data-[collapsible=icon]:justify-center";
