# Runtime Branding System

## Source Files

- `tenantapp/runtime/contracts/runtime.ts`
- `tenantapp/runtime/providers/RuntimeConfigProvider.tsx`
- `tenantapp/runtime/theme/themeUtils.ts`
- `tenantapp/runtime/theme/useTheme.ts`
- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/runtime/mocks/mockRuntimeConfig.ts`
- `tenantapp/app/globals.css`
- `tenantapp/components/layout/Header.tsx`
- `tenantapp/components/layout/DashboardShell.tsx`
- `tenantapp/components/layout/OrganizationSidebar.tsx`

## Runtime Branding Input

`TenantBrandingConfig` is optional on `TenantRuntimeConfig`.

```ts
interface TenantBrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  faviconUrl?: string;
}
```

`tenant.name` is required by contract, but theme resolution also falls back if it is missing at runtime.

## Centralized Theme Logic

All runtime branding resolution is centralized in `tenantapp/runtime/theme/themeUtils.ts`.

Key helpers:

- `withBrandingDefaults(config)`
  Normalizes tenant name, slug, and branding before the app consumes them.
- `getResolvedTheme(config)`
  Produces the full runtime theme object used by UI components.
- `injectThemeVariables(config)`
  Writes CSS variables and favicon updates into the document.
- `normalizeHexColor()`
  Accepts `#rgb` and `#rrggbb`, otherwise falls back safely.
- `getReadableTextColor()`
  Chooses readable foreground text for a background.
- `ensureAccessibleColor()`
  Adjusts tenant accent colors until they meet the minimum configured contrast target.

## Runtime-Safe Resolved Fields

The runtime app does not consume raw `branding` directly after provider boot.

Resolved theme always supplies:

- `tenantName`
- `logoUrl`
- `faviconUrl`
- `fontFamily`
- `primaryColor`
- `secondaryColor`
- `primaryHoverColor`
- `secondaryHoverColor`
- `onPrimaryColor`
- `onSecondaryColor`
- `linkColor`
- `linkHoverColor`
- `softAccent`
- `strongAccent`
- `borderAccent`
- `surfaceAccent`
- `surfaceAccentStrong`
- `brandGradient`
- `heroGradient`
- `headerGradient`
- `pageGradient`
- `dashboardGradient`
- `cardGradient`
- `chartGridColor`
- `chartAxisColor`
- `chartTooltipStyle`
- `chartColors.palette`

## Fallback Strategy

Resolved defaults in `themeUtils.ts`:

- `DEFAULT_PRIMARY = "#f58220"`
- `DEFAULT_SECONDARY = "#f37820"`
- `DEFAULT_LOGO = "/images/logo.png"`
- `DEFAULT_TENANT_NAME = "RemedyGCC"`
- `DEFAULT_FONT_FAMILY = "Inter, system-ui, sans-serif"`
- `DEFAULT_FAVICON = "/favicon.ico"`

Behavior:

- Missing `branding.primaryColor`
  Resolved to the default primary, then passed through `ensureAccessibleColor`.
- Missing `branding.secondaryColor`
  Derived from `mixHexColors(primary, DEFAULT_SECONDARY, 0.55)`, then contrast-adjusted.
- Missing `branding.logoUrl`
  Resolved to `DEFAULT_LOGO`.
- Missing `branding.fontFamily`
  Resolved to `DEFAULT_FONT_FAMILY`.
- Missing `branding.faviconUrl`
  Resolved to `DEFAULT_FAVICON`.
- Missing `tenant.name`
  Resolved to `DEFAULT_TENANT_NAME`.
- Missing `tenant.slug`
  Resolved to `tenant.id` or a lowercase tenant-name fallback.

Because the provider applies `withBrandingDefaults()` before rendering, logo fallbacks in header and sidebar are normally bypassed in favor of the default asset.

## Mock Tenant Switching

Implemented in `tenantapp/runtime/mocks/mockTenantRegistry.ts`.

| Tenant | Input state | Expected runtime result |
|---|---|---|
| `tenant-a` | Full branding config | Uses provided logo, primary, secondary, font family, favicon, and tenant name. |
| `tenant-b` | Partial branding config | Uses provided primary and logo; derives missing secondary and falls back other branding fields safely. |
| `tenant-c` | No branding config | Uses all branding defaults and keeps the UI readable through accessibility normalization. |

Tenant resolution order in `RuntimeConfigProvider`:

1. `?tenant=<slug>` query parameter
2. `localStorage["remedygcc-active-tenant"]`
3. `process.env.NEXT_PUBLIC_TENANT_SLUG`
4. `DEFAULT_MOCK_TENANT_SLUG`

Unknown tenant slugs resolve back to `tenant-a`.

## Rendering Surfaces Using Theme

Branding is actively applied to:

- global CSS variables in `tenantapp/app/globals.css`
- homepage hero chip, gradients, and CTA in `tenantapp/app/page.tsx`
- header logo, tenant name, nav links, and mobile menu in `tenantapp/components/layout/Header.tsx`
- dashboard shell border, gradients, and badges in `tenantapp/components/layout/DashboardShell.tsx`
- dashboard sidebar accents, active states, and logo block in `tenantapp/components/layout/OrganizationSidebar.tsx`
- survey landing fields, chips, button states, and selected pills in `tenantapp/app/survey/page.tsx`
- question progress, status chips, selected answer states, and completion state in `tenantapp/app/survey-questions/page.tsx`
- dashboard cards, lists, progress meters, bars, pie colors, and tooltips in `tenantapp/components/dashboard/*`
- analysis empty states via themed icon colors in `tenantapp/components/dashboard/adminDashboard/surveys/*`

## Responsive Behavior

Current safeguards:

- Header tenant name is truncated with `max-w` limits.
- Survey page titles use `break-words`.
- Sidebar tenant name is truncated and sidebar collapses on smaller widths.
- Header logo uses a fixed 36px box; sidebar logo uses a fixed 44px box.
- When a tenant logo is present, the public header now renders it without a colored background tile.

## Known Gaps

- `useBranding()` exists in `tenantapp/runtime/hooks/useBranding.ts` but is currently unused.
- Logo sizing is fixed. Extremely wide or tall uploaded logos are constrained with `object-contain`, but there is no tenant-specific aspect-ratio policy.
- Runtime branding is mock-backed only. No DB collection or API endpoint composes this payload yet.
