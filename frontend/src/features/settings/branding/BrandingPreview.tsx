"use client";

import { resolveBrandingAssetUrl, brandingToCssVariables } from "@/lib/branding/applyBrandingTheme";
import { BRANDING_COLOR_FIELD_GROUPS } from "@/lib/branding/defaults";
import type { BrandingSettings } from "@/redux/types/branding";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

type Props = {
  branding: BrandingSettings;
};

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2">
      <span
        className="h-8 w-8 shrink-0 rounded border"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{color}</p>
      </div>
    </div>
  );
}

export function BrandingPreview({ branding }: Props) {
  const primaryLogo = resolveBrandingAssetUrl(branding.logo_primary_path);
  const secondaryLogo = resolveBrandingAssetUrl(branding.logo_secondary_path);
  const faviconUrl = resolveBrandingAssetUrl(branding.favicon_path);
  const loginLogo = secondaryLogo || primaryLogo;

  const scopedStyle = Object.fromEntries(
    Object.entries(brandingToCssVariables(branding)).map(([key, value]) => [key, value])
  ) as React.CSSProperties;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Live Preview</h2>
        <p className="text-sm text-muted-foreground">
          Updates instantly as you edit branding settings.
        </p>
      </div>

      <div
        style={scopedStyle}
        className="space-y-4 rounded-lg border bg-background p-4 max-h-[calc(100vh-12rem)] overflow-y-auto"
      >
        {/* Identity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">System Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p style={{ color: branding.text_primary_color }}>
              <span className="font-medium">Full name:</span> {branding.system_name_full}
            </p>
            <p style={{ color: branding.text_primary_color }}>
              <span className="font-medium">Short name:</span> {branding.system_name_short}
            </p>
            <p style={{ color: branding.text_secondary_color }}>
              <span className="font-medium">Tagline:</span>{" "}
              {branding.system_tagline || "—"}
            </p>
            <p className="text-xs text-muted-foreground pt-1">
              Browser title: {branding.system_name_full}
            </p>
          </CardContent>
        </Card>

        {/* Logos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Logos & Favicon</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="space-y-1 text-center">
              <p className="text-xs font-medium">Primary</p>
              <div className="flex h-16 items-center justify-center rounded border bg-muted/30 p-1">
                {primaryLogo ? (
                  <Image src={primaryLogo} alt="Primary" width={48} height={48} className="max-h-14 w-auto object-contain" unoptimized />
                ) : (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-medium">Secondary</p>
              <div className="flex h-16 items-center justify-center rounded border bg-muted/30 p-1">
                {secondaryLogo ? (
                  <Image src={secondaryLogo} alt="Secondary" width={48} height={48} className="max-h-14 w-auto object-contain" unoptimized />
                ) : (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-xs font-medium">Favicon</p>
              <div className="flex h-16 items-center justify-center rounded border bg-muted/30 p-1">
                {faviconUrl ? (
                  <Image src={faviconUrl} alt="Favicon" width={24} height={24} className="object-contain" unoptimized />
                ) : (
                  <span className="text-[10px] text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color palette - all configured colors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Theme Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {BRANDING_COLOR_FIELD_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">{group.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {group.fields.map(({ key, label }) => (
                    <ColorSwatch key={key} label={label} color={branding[key]} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* App shell: sidebar + header + content */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">App Shell</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex gap-2 rounded-lg border overflow-hidden min-h-[180px]"
              style={{ backgroundColor: branding.background_color }}
            >
              <div
                className="w-28 shrink-0 border-r p-2 space-y-2"
                style={{
                  backgroundColor: branding.sidebar_color,
                  borderColor: branding.border_color,
                }}
              >
                {primaryLogo && (
                  <Image
                    src={primaryLogo}
                    alt="Sidebar logo"
                    width={40}
                    height={40}
                    className="mx-auto h-10 w-auto object-contain"
                    unoptimized
                  />
                )}
                <p
                  className="text-center text-[10px] font-semibold leading-tight"
                  style={{ color: branding.sidebar_header_text_color }}
                >
                  {branding.system_name_short}
                </p>
                <p
                  className="text-center text-[9px] leading-tight"
                  style={{ color: branding.sidebar_header_text_color }}
                >
                  {branding.system_tagline}
                </p>
                <div
                  className="rounded px-2 py-1 text-[10px]"
                  style={{
                    backgroundColor: branding.sidebar_nav_active_color,
                    color: branding.sidebar_nav_active_text_color,
                  }}
                >
                  Active menu
                </div>
                <div
                  className="rounded px-2 py-1 text-[10px]"
                  style={{
                    backgroundColor: branding.sidebar_nav_hover_color,
                    color: branding.text_primary_color,
                  }}
                >
                  Hover menu
                </div>
                <div
                  className="rounded px-2 py-1 text-[10px] ml-2"
                  style={{
                    backgroundColor: branding.sidebar_subnav_active_color,
                    color: branding.sidebar_subnav_active_text_color,
                  }}
                >
                  Active sub-item
                </div>
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div
                  className="flex h-9 items-center border-b px-3 text-xs font-medium"
                  style={{
                    backgroundColor: branding.header_color,
                    borderColor: branding.border_color,
                    color: branding.text_primary_color,
                  }}
                >
                  {branding.system_name_full}
                </div>
                <div
                  className="flex-1 p-2"
                  style={{ backgroundColor: branding.background_color }}
                >
                  <div
                    className="rounded border p-2 text-[10px]"
                    style={{
                      backgroundColor: branding.surface_color,
                      borderColor: branding.border_color,
                      color: branding.text_primary_color,
                    }}
                  >
                    Dashboard content area
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Login Screen</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg border p-3 flex gap-3"
              style={{ backgroundColor: branding.background_color, borderColor: branding.border_color }}
            >
              <div className="flex-1 flex items-center justify-center rounded bg-muted/20 p-2">
                {loginLogo ? (
                  <Image src={loginLogo} alt="Login logo" width={64} height={64} className="max-h-16 w-auto object-contain" unoptimized />
                ) : null}
              </div>
              <div
                className="flex-1 space-y-2 rounded border p-2"
                style={{ backgroundColor: branding.surface_color, borderColor: branding.border_color }}
              >
                <p className="text-xs font-semibold text-primary">Login</p>
                <p className="text-[10px] text-muted-foreground truncate">{branding.system_name_full}</p>
                <div className="h-6 rounded border bg-background" />
                <div className="h-6 rounded border bg-background" />
                <button
                  type="button"
                  className="w-full rounded py-1 text-[10px] text-white"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Log In
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UI components */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">UI Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-7 text-xs bg-toolbar text-toolbar-foreground hover:bg-toolbar-hover">
                Selected toolbar
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Toolbar outline
              </Button>
              <Button size="sm" style={{ backgroundColor: branding.primary_color }} className="text-white h-7 text-xs">
                Primary
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                style={{ borderColor: branding.secondary_color, color: branding.secondary_color }}
              >
                Secondary
              </Button>
              <Button size="sm" style={{ backgroundColor: branding.accent_color }} className="text-white h-7 text-xs">
                Accent
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs">
                Danger
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Badge className="text-white text-[10px]" style={{ backgroundColor: branding.success_color }}>Success</Badge>
              <Badge className="text-white text-[10px]" style={{ backgroundColor: branding.warning_color }}>Warning</Badge>
              <Badge className="text-white text-[10px]" style={{ backgroundColor: branding.error_color }}>Error</Badge>
              <Badge className="text-white text-[10px]" style={{ backgroundColor: branding.info_color }}>Info</Badge>
            </div>

            <div
              className="space-y-1.5 rounded border p-2"
              style={{ backgroundColor: branding.surface_color, borderColor: branding.border_color }}
            >
              <Label className="text-xs">Form field</Label>
              <Input placeholder="Sample input" className="h-8 text-xs" />
            </div>

            <div className="rounded border overflow-hidden" style={{ borderColor: branding.border_color }}>
              <Table>
                <TableHeader>
                  <TableRow
                    style={{
                      backgroundColor: branding.table_header_color,
                      color: branding.table_header_text_color,
                    }}
                  >
                    <TableHead className="h-8 text-xs">Name</TableHead>
                    <TableHead className="h-8 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-2 text-xs">Sample row</TableCell>
                    <TableCell className="py-2">
                      <Badge className="text-white text-[10px]" style={{ backgroundColor: branding.success_color }}>
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div
                className="rounded border px-2 py-1.5"
                style={{
                  backgroundColor: `color-mix(in srgb, ${branding.success_color} 12%, white)`,
                  color: branding.success_color,
                  borderColor: `color-mix(in srgb, ${branding.success_color} 35%, white)`,
                }}
              >
                Success notification
              </div>
              <div
                className="rounded border px-2 py-1.5"
                style={{
                  backgroundColor: `color-mix(in srgb, ${branding.error_color} 12%, white)`,
                  color: branding.error_color,
                  borderColor: `color-mix(in srgb, ${branding.error_color} 35%, white)`,
                }}
              >
                Error notification
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
