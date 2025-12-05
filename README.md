# Meetings-as-a-Service MVP

An internal web application for managing qualified sales meeting bookings. Built with Next.js 14+, MongoDB, BetterAuth, and Shadcn UI.

## 🎯 Overview

This application helps you manage a sales meeting booking service by:
- Managing leads in your target niche (e.g., HVAC contractors in Texas)
- Creating personalized email templates with variables
- Sending batch outreach campaigns
- Tracking lead statuses through the sales pipeline
- Integrating with Calendly for meeting bookings

## 🏗️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: MongoDB with Mongoose
- **Authentication**: BetterAuth (email/password)
- **UI Components**: Shadcn UI with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Email**: Resend API
- **CSV Parsing**: PapaParse

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas)
- Resend API key (get one at [resend.com](https://resend.com))

## 🚀 Getting Started

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/meetings-service

# Authentication
BETTER_AUTH_SECRET=your-secret-key-change-in-production
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Provider
RESEND_API_KEY=re_your_api_key_here

# Admin User for Seeding
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

NODE_ENV=development
```

> **Important**: Replace the placeholder values with your actual credentials.

### 3. Start MongoDB

Make sure MongoDB is running locally:

```bash
# macOS with Homebrew
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Seed Admin User

In a new terminal (while the dev server is running):

```bash
npm run seed
```

This creates an admin user with the credentials from your `.env.local` file.

### 6. Login

Navigate to `http://localhost:3000/login` and sign in with:
- **Email**: The email from `ADMIN_EMAIL`
- **Password**: The password from `ADMIN_PASSWORD`

## 📚 Features

### Dashboard
- Overview of lead statistics
- Status breakdown (NEW, CONTACTED, REPLIED, MEETING_BOOKED, LOST)
- Recently contacted leads
- Email activity metrics

### Offer Configuration (`/settings/offer`)
- Define your target niche and ICP
- Set outreach email sender details
- Configure Calendly booking URL

### Lead Management (`/leads`)
- Import leads via CSV upload
- Manually add individual leads
- Filter leads by status
- View and edit lead details
- Track outreach message history

### Email Templates (`/templates`)
- Create reusable email templates
- Use variables for personalization:
  - `{{firstName}}`, `{{lastName}}`
  - `{{companyName}}`, `{{location}}`
- Edit and delete templates

### Batch Outreach (`/outreach`)
- Select a template
- Filter leads by status
- Select multiple leads with checkboxes
- Send personalized emails in bulk
- Automatic status updates (NEW → CONTACTED)

### Calendly Integration
- Webhook endpoint at `/api/calendly/webhook`
- Automatically marks leads as `MEETING_BOOKED`
- Configure webhook in Calendly dashboard

## 📁 CSV Import Format

When importing leads, use a CSV file with these columns:

```csv
firstName,lastName,companyName,email,phone,location,notes
John,Doe,Acme HVAC,john@acmehvac.com,555-0100,Dallas TX,Interested in new services
Jane,Smith,Cool Air Inc,jane@coolair.com,555-0200,Houston TX,
```

**Required field**: `email` (all others are optional)

## 🔌 API Routes

### Authentication
- `POST /api/auth/sign-up/email` - Create new user
- `POST /api/auth/sign-in/email` - Sign in
- `GET /api/auth/session` - Get current session

### Offer Config
- `GET /api/offer-config` - Get configuration
- `PUT /api/offer-config` - Update configuration

### Leads
- `GET /api/leads` - List leads (optional `?status=NEW` filter)
- `POST /api/leads` - Create lead
- `GET /api/leads/[id]` - Get lead + messages
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead
- `POST /api/leads/import` - Import from CSV

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template

### Outreach
- `POST /api/outreach/send` - Send batch emails

### Webhooks
- `POST /api/calendly/webhook` - Calendly meeting booked

## 🛠️ Development

### Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # BetterAuth handlers
│   ├── calendly/          # Webhooks
│   ├── leads/             # Lead CRUD + import
│   ├── offer-config/      # Settings
│   ├── outreach/          # Batch sending
│   └── templates/         # Template CRUD
├── dashboard/             # Dashboard page
├── leads/                 # Lead management pages
├── login/                 # Authentication page
├── outreach/              # Batch sending page
├── settings/              # Configuration pages
└── templates/             # Template management pages

components/
├── layout/                # Sidebar, Header
└── ui/                    # Shadcn components

lib/
├── auth.ts                # BetterAuth config
├── auth-client.ts         # Client-side auth
├── db.ts                  # MongoDB connection
├── email.ts               # Email sending utility
└── utils.ts               # Utilities

models/
├── Lead.ts                # Lead schema
├── OfferConfig.ts         # Config schema
├── OutreachMessage.ts     # Message log schema
├── Template.ts            # Template schema
└── User.ts                # User schema

scripts/
└── seed.ts                # Admin user seeding
```

### Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run seed       # Create admin user
```

## 🚢 Deployment

### Environment Variables

Ensure all environment variables are set in your production environment:

1. Set `MONGODB_URI` to your production MongoDB connection string
2. Generate a strong `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
3. Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your domain
4. Add your Resend API key

### Build and Deploy

```bash
npm run build
npm run start
```

Or deploy to Vercel:

```bash
npx vercel
```

### Calendly Webhook Setup

1. Log in to your Calendly account
2. Go to Integrations → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/calendly/webhook`
4. Subscribe to "Invitee Created" events

## 🔒 Security Notes

- All routes except `/login` are protected by authentication middleware
- Passwords are hashed with bcrypt
- Sessions use HTTP-only cookies
- Email verification is disabled for MVP (can be enabled in `lib/auth.ts`)

## 📖 Usage Guide

### Initial Setup Workflow

1. **Login** with seed credentials
2. **Configure Offer** at `/settings/offer`
   - Set your niche, ICP, and email details
   - Add Calendly URL
3. **Create Template** at `/templates/new`
   - Write subject and body with variables
4. **Import Leads** at `/leads`
   - Upload CSV or add manually
5. **Send Outreach** at `/outreach`
   - Select template and leads
   - Send batch emails
6. **Track Progress** on `/dashboard`
   - Monitor statuses and conversions

### Template Variable Examples

**Subject**:
```
Quick question for {{companyName}}
```

**Body**:
```
Hi {{firstName}},

I noticed {{companyName}} in {{location}} and thought you might be interested in our service...

Best regards,
[Your signature]
```

## 🤝 Contributing

This is an internal MVP. For improvements:

1. Create a feature branch
2. Make changes
3. Test locally
4. Submit for review

## 📄 License

Proprietary - Internal Use Only

---

**Built with ❤️ using Next.js, MongoDB, and BetterAuth**
