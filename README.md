# Runtime-Driven Survey Application

A Next.js application with runtime configuration for multi-tenant survey rendering.

## Features

- **Runtime Configuration**: Tenant data loaded dynamically via `?tenant=demo-tenant` query parameter
- **Dynamic Question Rendering**: Survey questions rendered from runtime config
- **Component Structure**: Modular, reusable components

## Project Structure

```
src/
├── app/
│   ├── layout.tsx      # Root layout with RuntimeConfigProvider
│   ├── page.tsx        # Main survey page
│   └── globals.css     # Global styles
├── components/
│   ├── survey/
│   │   ├── SurveyContainer.tsx
│   │   └── QuestionRenderer.tsx
│   └── dashboard/
│       └── DashboardContainer.tsx
├── runtime/
│   ├── index.ts             # Public exports
│   ├── contracts/           # TypeScript interfaces
│   ├── providers/           # Context provider
│   ├── hooks/              # Custom hooks
│   ├── context/            # React context
│   └── mocks/              # Mock data
└── types/                  # Shared types
```

## Getting Started

```bash
cd src
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Runtime Config API

The `TenantRuntimeConfig` interface defines the structure:

- `tenant`: Organization details
- `branding`: Logo, colors, fonts
- `attributeTemplate`: Streams, locations, functions, departments
- `scannerVersion`: Categories with questions
- `runtimeSettings`: Feature flags, language

## Query Parameters

- `?tenant=demo-tenant` - Select tenant (future: subdomain-based)