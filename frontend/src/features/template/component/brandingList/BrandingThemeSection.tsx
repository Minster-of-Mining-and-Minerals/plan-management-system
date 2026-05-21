"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRANDING_COLOR_CATEGORIES } from "@/config/brandingTheme";
import type { BrandingThemeTokens } from "@/config/brandingTheme";
import { BrandingColorField } from "./BrandingColorField";

interface BrandingThemeSectionProps {
  theme: BrandingThemeTokens;
  onThemeChange: (key: string, value: string) => void;
}

export function BrandingThemeSection({
  theme,
  onThemeChange,
}: BrandingThemeSectionProps) {
  return (
    <div className="space-y-6">
      {BRANDING_COLOR_CATEGORIES.map((category) => (
        <Card key={category.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-primary">{category.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {category.fields.map((field) => (
              <BrandingColorField
                key={field.key}
                label={field.label}
                value={theme[field.key] ?? ""}
                format={field.format}
                preserveAlpha={field.preserveAlpha}
                placeholder={field.placeholder}
                onChange={(value) => onThemeChange(field.key, value)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
