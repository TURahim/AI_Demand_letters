# Steno - Demand Letter Generator Frontend

## Project Overview

Steno is an AI-powered demand letter generation platform for legal professionals. The frontend is a modern Next.js 16 application built with React 19, TypeScript, and Tailwind CSS v4. It provides lawyers with an intuitive interface to upload documents, manage templates, generate demand letters, and refine them using AI assistance.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Node.js / Next.js built-in runtime
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS v4 with custom design tokens
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner toast system
- **Analytics**: Vercel Analytics

## Project Structure

\`\`\`
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with metadata & fonts
│   ├── globals.css              # Global styles & design tokens
│   ├── page.tsx                 # Landing page
│   ├── dashboard/page.tsx       # Main dashboard with stats & quick actions
│   ├── documents/page.tsx       # Document library & management
│   ├── upload/page.tsx          # Document upload interface
│   ├── templates/page.tsx       # Template management & creation
│   ├── generation/page.tsx      # 4-step letter generation wizard
│   ├── editor/page.tsx          # Rich text letter editor
│   ├── letters/page.tsx         # Generated letters library
│   ├── analytics/page.tsx       # Usage analytics dashboard
│   ├── settings/page.tsx        # User settings
│   └── auth/
│       ├── login/page.tsx       # Login page
│       └── signup/page.tsx      # Signup page
│
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx       # App wrapper with header, sidebar, footer
│   │   ├── header.tsx           # Top navigation bar with branding
│   │   ├── sidebar.tsx          # Navigation sidebar
│   │   └── footer.tsx           # Application footer
│   │
│   ├── document-upload.tsx      # Drag & drop file upload component
│   ├── template-editor.tsx      # Rich text editor for template creation
│   ├── letter-editor.tsx        # Main letter editing interface
│   ├── generation-wizard.tsx    # Multi-step letter generation wizard
│   │
│   ├── dashboard/
│   │   ├── stats-card.tsx       # Metric card component
│   │   ├── activity-feed.tsx    # Recent activity list
│   │   ├── usage-chart.tsx      # Recharts visualization
│   │   └── quick-actions.tsx    # Quick action buttons
│   │
│   ├── ui/                      # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── tabs.tsx
│   │   ├── select.tsx
│   │   ├── chart.tsx
│   │   └── [others]
│   │
│   └── theme-provider.tsx       # Dark mode provider (ready to integrate)
│
├── hooks/
│   ├── use-toast.ts             # Toast notification hook
│   └── use-mobile.ts            # Mobile detection hook
│
├── lib/
│   └── utils.ts                 # Utility functions (cn for className merging)
│
└── public/                      # Static assets
    ├── placeholder.svg
    ├── placeholder-logo.svg
    └── icons/
\`\`\`

## Design System

### Color Palette

The app uses a sophisticated 4-color scheme optimized for legal professionals:

- **Primary (Gold)**: `#A18050` - Professional, trustworthy accent color
- **Secondary (Teal)**: `#193D3D` - Authority and stability for headers/footers
- **Accent (Purple)**: `#7848DF` - Interactive elements and highlights
- **Neutral (Paper)**: `#EFF2E9` - Off-white background for readability

All colors are defined in `app/globals.css` as CSS custom properties using oklch color space for better color manipulation. Design tokens automatically adapt for dark mode.

### Typography

- **Sans Serif (Geist)**: UI text, navigation, labels
- **Monospace (Geist Mono)**: Code, data, technical content
- **Body Text**: line-height 1.5-1.6 for readability
- **Headings**: Font weights 600-700 for hierarchy

### Component Styling

- All Tailwind utility classes (responsive, gap-based layout, semantic tokens)
- No arbitrary values - uses design token scale
- Flexbox-first layout strategy (grid only for 2D layouts)
- Consistent spacing using Tailwind scale (p-4, gap-6, etc.)

## Key Pages & Components

### Authentication (`/auth/login`, `/auth/signup`)

**Purpose**: User login and registration

**Features**:
- Email/password forms with Zod validation
- Error messaging and success feedback
- Links to signup/login pages
- Ready for backend integration

**Backend Integration Points**:
- POST `/api/auth/login` - Authenticate user
- POST `/api/auth/signup` - Create new account
- Set authentication cookie/token in response

### Dashboard (`/dashboard`)

**Purpose**: Central hub with usage overview

**Components Used**:
- `StatsCard` - KPI metrics (letters generated, documents uploaded, templates used, API calls)
- `ActivityFeed` - Recent user activity timeline
- `UsageChart` - Weekly letter generation chart (Recharts)
- `QuickActions` - Shortcuts to common tasks

**Backend Integration Points**:
- GET `/api/dashboard/stats` - Fetch user statistics
- GET `/api/dashboard/activity` - Fetch recent activity logs
- GET `/api/dashboard/usage` - Fetch usage metrics for chart

### Documents (`/documents`, `/upload`)

**Purpose**: Manage case files and reference materials

**Features**:
- Drag & drop file upload with visual feedback
- Document library with search and filtering
- File type support: PDF, DOCX, TXT
- File preview modal
- Delete and manage documents

**State Management**: Local component state with todo list for batch operations

**Backend Integration Points**:
- POST `/api/documents/upload` - Upload files (multipart form data)
- GET `/api/documents` - Fetch user's document library
- DELETE `/api/documents/:id` - Delete document
- GET `/api/documents/:id/preview` - Preview file content

### Templates (`/templates`)

**Purpose**: Create and manage letter templates with variables

**Features**:
- Rich text editor with formatting toolbar
- Variable insertion using `{{variableName}}` syntax
- Template management (create, edit, clone, delete)
- Variable panel to define required fields
- Live preview

**Components Used**:
- `TemplateEditor` - Rich text editing interface
- Built-in textarea with markdown support (TipTap integration ready)

**Backend Integration Points**:
- POST `/api/templates` - Create new template
- GET `/api/templates` - Fetch all templates
- PUT `/api/templates/:id` - Update template
- DELETE `/api/templates/:id` - Delete template
- GET `/api/templates/:id` - Fetch single template

### Generation (`/generation`)

**Purpose**: AI-powered 4-step wizard to generate demand letters

**Steps**:
1. **Select Template** - Choose from saved templates
2. **Fill Variables** - Enter document-specific information
3. **Configure AI** - Set tone, length, emphasis preferences
4. **Review & Generate** - Preview and trigger generation

**Components Used**:
- `GenerationWizard` - Multi-step form manager
- Form validation at each step
- Preview of generated letter

**Backend Integration Points**:
- POST `/api/generation/generate` - Generate letter with AI
  - Request: `{ templateId, variables, tone, length, emphasis, documentIds }`
  - Response: `{ letterId, content, generatedAt }`

### Editor (`/editor`)

**Purpose**: Fine-tune generated letters with AI refinement

**Features**:
- Rich text editor with formatting toolbar
- AI refinement controls (tone slider, length selector, emphasis checkboxes)
- Version history with diff viewer
- Export options (PDF, DOCX, save)
- Letter status tracking

**Components Used**:
- `LetterEditor` - Main editing interface
- Sidebar for refinement panel
- Toolbar with formatting options

**Backend Integration Points**:
- GET `/api/letters/:id` - Fetch letter content
- PUT `/api/letters/:id` - Save letter edits
- POST `/api/letters/:id/refine` - Apply AI refinement
- GET `/api/letters/:id/versions` - Fetch version history
- POST `/api/letters/:id/export` - Export letter (PDF/DOCX)

### Letters (`/letters`)

**Purpose**: Library of generated and saved letters

**Features**:
- List view with sorting and filtering
- Status badges (draft, sent, archived)
- Quick actions (edit, send, delete, duplicate)
- Search functionality
- Date-based organization

**Backend Integration Points**:
- GET `/api/letters` - Fetch user's letters (with pagination)
- DELETE `/api/letters/:id` - Delete letter
- POST `/api/letters/:id/send` - Send letter (if email integration exists)
- POST `/api/letters/:id/duplicate` - Create copy

### Analytics (`/analytics`)

**Purpose**: Usage tracking and performance insights

**Features**:
- Key metrics cards
- Time-series charts
- Template performance data
- User activity timeline
- Export options

**Backend Integration Points**:
- GET `/api/analytics/metrics` - User statistics
- GET `/api/analytics/timeline` - Activity timeline
- GET `/api/analytics/templates` - Template usage data

### Settings (`/settings`)

**Purpose**: User configuration and preferences

**Features** (ready to implement):
- Profile information
- API key management
- Template defaults
- Notification preferences
- Theme selection (light/dark mode ready)

**Backend Integration Points**:
- GET `/api/settings` - Fetch user settings
- PUT `/api/settings` - Update settings
- POST `/api/settings/api-keys` - Generate API keys

## State Management

**Current Approach**: Local component state with React hooks

**For Backend Integration**:
1. **Simple Fetch**: Use `fetch()` or `SWR` for data fetching in Client Components
2. **Server Actions**: Use Server Actions for mutations (forms, deletions)
3. **Loading States**: Use `useState` or `useTransition` for loading indicators
4. **Error Handling**: Use try-catch blocks with user-facing toast notifications

### Recommended Data Flow

\`\`\`
Client Component (useState for local UI)
  ↓
Server Action or Route Handler (POST/PUT/DELETE)
  ↓
Backend API (/api/...)
  ↓
Database
  ↓
Response back to Client
\`\`\`

## API Route Structure (Ready for Implementation)

All API routes should follow RESTful conventions and return consistent JSON:

\`\`\`
/api/auth/
  POST /login                 - User login
  POST /signup                - User registration
  POST /logout                - User logout

/api/documents/
  POST /upload                - Upload files
  GET /                        - List documents
  GET /:id/preview            - Preview document
  DELETE /:id                 - Delete document

/api/templates/
  POST /                       - Create template
  GET /                        - List templates
  GET /:id                     - Get single template
  PUT /:id                     - Update template
  DELETE /:id                  - Delete template

/api/generation/
  POST /generate              - Generate letter with AI

/api/letters/
  GET /                        - List letters
  GET /:id                     - Get letter
  PUT /:id                     - Update letter
  DELETE /:id                  - Delete letter
  POST /:id/refine            - AI refinement
  POST /:id/export            - Export (PDF/DOCX)
  POST /:id/send              - Send letter
  GET /:id/versions           - Version history

/api/analytics/
  GET /metrics                - User metrics
  GET /timeline               - Activity timeline
  GET /templates              - Template analytics

/api/settings/
  GET /                        - Get user settings
  PUT /                        - Update settings
  POST /api-keys              - Generate API keys
\`\`\`

## Environment Variables

The frontend is ready to accept the following environment variables:

\`\`\`env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Authentication (if using external service)
NEXT_PUBLIC_AUTH_PROVIDER=supabase  # or similar

# Analytics
NEXT_PUBLIC_GA_ID=
\`\`\`

Add environment variables in the **Vars** section of the v0 in-chat sidebar or in `.env.local` for local development.

## Running the Development Server

\`\`\`bash
# Install dependencies (if not already done)
npm install
# or
pnpm install

# Start development server
npm run dev

# Application will be available at http://localhost:3000
\`\`\`

## Building for Production

\`\`\`bash
# Build the application
npm run build

# Start production server
npm start
\`\`\`

## Key Integration Points for Backend

### 1. Authentication
- Implement `/api/auth/login` and `/api/auth/signup`
- Set secure cookies or JWT tokens
- Add middleware to protect authenticated routes

### 2. Document Upload & Storage
- Implement `/api/documents/upload` with file storage (Vercel Blob, AWS S3, etc.)
- Add virus scanning and file validation
- Store metadata in database

### 3. Template Management
- Implement `/api/templates/*` endpoints
- Store templates with variable definitions
- Support template versioning

### 4. AI Letter Generation
- Implement `/api/generation/generate` with AI provider integration
- Accept template, variables, and AI parameters
- Return generated letter content

### 5. Letter Management
- Implement CRUD operations for letters
- Store drafts and final versions
- Track letter history and changes

### 6. Analytics
- Track user activity and metrics
- Store usage data for dashboards
- Implement data retention policies

## Database Schema Recommendations

\`\`\`sql
-- Users table
users (id, email, password_hash, name, created_at, updated_at)

-- Documents table
documents (id, user_id, filename, file_type, file_path, uploaded_at)

-- Templates table
templates (id, user_id, name, content, variables, created_at, updated_at)

-- Letters table
letters (id, user_id, template_id, status, content, created_at, sent_at)

-- Letter versions (for history tracking)
letter_versions (id, letter_id, version, content, created_at)

-- Activity logs (for analytics)
activity_logs (id, user_id, action, resource_type, resource_id, created_at)
\`\`\`

## Common Development Tasks

### Adding a New Page

1. Create file in `app/[feature]/page.tsx`
2. Import layout components from `components/layout/app-layout.tsx`
3. Use existing shadcn/ui components for consistency
4. Add route to sidebar navigation in `components/layout/sidebar.tsx`

### Creating a New Component

1. Create file in `components/[feature]/` or `components/`
2. Use TypeScript with proper prop typing
3. Import UI components from `components/ui/`
4. Follow existing naming and structure patterns

### Adding Form Validation

1. Use `react-hook-form` with Zod schemas
2. Import `useForm` and `zodResolver`
3. Use shadcn/ui Form component for consistency

### Adding API Route

1. Create file in `app/api/[endpoint]/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` functions as needed
3. Add authentication checks at route level
4. Return consistent JSON responses with proper status codes

## Styling Notes

- All colors use CSS custom properties defined in `globals.css`
- Responsive design with `md:`, `lg:` prefixes (mobile-first)
- Uses Tailwind v4 with built-in PostCSS
- Dark mode support automatically via CSS variables
- No custom CSS files needed (use Tailwind utilities)

## Performance Considerations

- Next.js 16 with Turbopack enabled
- Automatic code splitting per page
- Image optimization ready
- Font optimization with next/font
- Analytics integrated via Vercel

## Accessibility

- Semantic HTML structure
- ARIA roles and labels on interactive elements
- Screen reader support with sr-only classes
- Keyboard navigation throughout
- Color contrast ratios meet WCAG AA standards

## File Upload Security

- Client-side file type validation
- Server-side validation required
- Virus/malware scanning recommended
- File size limits should be enforced
- Secure storage path (not web-accessible)

## Next Steps for Backend Integration

1. Set up database with recommended schema
2. Create API routes following the structure outlined
3. Implement authentication middleware
4. Connect form submissions to backend endpoints
5. Add loading states and error handling
6. Test API integration with real data
7. Implement real-time updates if needed (WebSockets)

## Troubleshooting

### Routes Not Working
- Check sidebar.tsx for navigation items
- Verify page files are in correct `app/` subdirectories
- Clear Next.js cache: `rm -rf .next`

### Styling Issues
- Check globals.css for design token definitions
- Verify Tailwind config in tailwind.config.ts
- Use browser DevTools to inspect computed styles

### Component Props Errors
- Check TypeScript types in component files
- Verify all required props are passed
- Use `npm run build` to catch type errors

---

**Last Updated**: November 2024
**Status**: Frontend complete, ready for backend integration
