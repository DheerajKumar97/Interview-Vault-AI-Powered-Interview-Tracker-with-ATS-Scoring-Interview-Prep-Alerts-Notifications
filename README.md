# Interview Vault - Your Interview Journey, Simplified & Tracked

![Interview Compass Banner](https://drive.google.com/uc?export=view&id=1XBglxx9TMLkxPiHVjzkfksbyHLwQL2X_)

> **Track, manage, and visualize your entire interview journey across top companies with smart analytics, automated email alerts, and real-time notifications.**

**Live Demo**: [https://dheerajkumark-interview-vault.netlify.app/](https://dheerajkumark-interview-vault.netlify.app/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Getting Started](#-getting-started)
  - [Sign Up](#1-sign-up)
  - [Sign In](#2-sign-in)
  - [Add Applications](#3-add-applications)
  - [Add Events](#4-add-events)
  - [BI Dashboard](#5-bi-dashboard)
  - [Import/Export Records](#6-importexport-records)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🎯 Core Functionality
- ✅ **Authentication System** - Secure sign-up and sign-in with email verification
- ✅ **Application Tracking** - Track job applications across multiple companies
- ✅ **Event Management** - Monitor interview stages and scheduling
- ✅ **Business Intelligence Dashboard** - Real-time analytics and insights
- ✅ **Data Import/Export** - Excel (.xlsx/.csv) file support
- ✅ **Multi-Stage Pipeline** - Track 7+ interview stages
- ✅ **Company Database** - 350+ pre-loaded companies
- ✅ **24/7 Support** - Always available

### 📊 Key Statistics
- **7** Interview Stages Tracked
- **350+** Top Companies Database
- **24/7** Platform Availability

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite 5.4.19
- **Styling**: Tailwind CSS + Custom Components
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Routing**: React Router with SPA navigation
- **State Management**: React Hooks & Context API
- **HTTP Client**: Supabase Client

### Backend & Database
- **Backend-as-a-Service**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Email Service**: Supabase Edge Functions
- **Real-time**: Supabase Realtime subscriptions

### DevOps & Hosting
- **Version Control**: Git & GitHub
- **Deployment**: Netlify
- **Package Manager**: npm / Bun

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v16.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: v7.0.0 or higher (comes with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))
- **Code Editor**: VS Code recommended ([Download](https://code.visualstudio.com/))
- **Supabase Account**: Free account ([Sign up](https://supabase.com/))
- **GitHub Account**: For version control ([Sign up](https://github.com/))

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
# Clone the project
git clone https://github.com/DheerajKumar97/interview-compass.git

# Navigate to project directory
cd interview-compass
```

### Step 2: Install Dependencies

```bash
# Install all required packages
npm install

# Or if you use Bun
bun install
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_public_key

# Optional: Analytics & Monitoring
VITE_API_URL=http://localhost:3000
```

**How to get Supabase credentials:**
1. Go to [https://supabase.com/](https://supabase.com/)
2. Create a new project
3. Copy the Project URL and Anon Key from Project Settings → API
4. Paste them into `.env.local`

### Step 4: Start Development Server

```bash
# Start the development server
npm run dev

# The app will be available at: http://localhost:5173
```

### Step 5: Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

---

## 📖 Getting Started

### 1. Sign Up

**How to create a new account:**

1. Navigate to the **Sign Up** page from the home screen
2. Enter your details:
   - **Full Name**: Your complete name
   - **Email**: Valid email address
   - **Password**: Strong password (min 8 characters recommended)
3. Click **"Sign Up"** button
4. Check your email for verification link
5. Once verified, you'll be redirected to **Sign In** page
6. Enter your credentials to access the dashboard

**Sign Up Features:**
- ✅ Email verification required
- ✅ Secure password encryption
- ✅ OTP support for additional security
- ✅ Auto-profile creation

---

### 2. Sign In

**How to log in to your account:**

1. Go to the **Sign In** page
2. Enter your registered email address
3. Enter your password
4. Click **"Sign In"** button
5. You'll be redirected to the **Applications Dashboard**

**Sign In Features:**
- ✅ Persistent session (auto-login)
- ✅ Forgot Password recovery
- ✅ Remember device option
- ✅ Session timeout (24 hours)

**Forgot Password:**
- Click "Forgot Password?" link
- Enter your email
- Check your inbox for reset link
- Create a new password

---

### 3. Add Applications

**What is an Application?**
An application record represents a job application you've submitted to a company. Each application tracks:
- Company name
- Job title
- Application date
- Current status
- Interview events

#### Adding Existing Application vs New Application

**Adding an Existing Application:**

If you've already applied to companies before signing up, you can add them manually:

1. Go to **Applications** page
2. Click **"Add Application"** button
3. Fill in the details:
   - **Select Company**: Choose from 350+ companies or create new
   - **Job Title**: Position you applied for (e.g., "Senior Software Engineer")
   - **Applied Date**: When you submitted the application
   - **Current Status**: Select status from dropdown
4. Click **"Save"** button

**Supported Status Options:**
- Got Calls
- Shortlisted
- Interview Scheduled
- Interview Rescheduled
- Selected
- Offer Released
- Ghosted

**Adding a New Application (Step-by-Step):**

1. **Navigate to Add Application:**
   - Click the **"+ Add Application"** button on the Applications page

2. **Fill Company Information:**
   - Type company name in search box
   - If not found, select "Create New Company"
   - Enter company details (optional: industry, location)

3. **Add Job Details:**
   - **Job Title**: The position title
   - **Applied Date**: Date of submission
   - **Current Status**: Initial application status
   - **Notes**: Any additional notes (optional)

4. **Submit Application:**
   - Review all details
   - Click **"Save Application"**
   - Application will appear in your dashboard

**Quick Add Feature:**
- Use the **"Quick Add"** form on the Applications page
- Add multiple applications without leaving the page
- Track all submissions in real-time

---

### 4. Add Events

**What is an Event?**
Events represent milestones in your interview journey. Each event tracks the progression of an application.

**Event Types:**

| Event Type | Description |
|---|---|
| **CALL** | Initial contact from company |
| **SHORTLISTED** | You've been shortlisted |
| **INTERVIEW_SCHEDULED** | Interview date confirmed |
| **INTERVIEW_RESCHEDULED** | Interview date changed |
| **SELECTED** | You passed the interview |
| **OFFER_RELEASED** | Job offer received |
| **GHOSTED** | No response from company |

**How to Add an Event:**

1. **Go to Application Details:**
   - Click on an application from the list
   - Application detail page opens

2. **Add Event:**
   - Scroll to "Events" section
   - Click **"Add Event"** button
   - Select event type from dropdown
   - Enter event date
   - Add optional notes (interview tips, feedback, etc.)

3. **Save Event:**
   - Click **"Save"** button
   - Application status automatically updates
   - Event appears in timeline

**Auto-Status Update:**
When you add an event, the application status automatically updates:
- Add "INTERVIEW_SCHEDULED" → Status becomes "Interview Scheduled"
- Add "OFFER_RELEASED" → Status becomes "Offer Released"

**Event Timeline View:**
- See all events in chronological order
- Visual timeline of your interview journey
- Filter events by type
- Add notes and comments to events

---

### 5. BI Dashboard

**What is the Business Intelligence Dashboard?**
The BI Dashboard provides comprehensive analytics and insights into your entire interview journey. It helps you understand your performance metrics and identify trends.

**Dashboard Overview:**

#### Key Metrics

1. **Total Applications**
   - Count of all applications you've submitted
   - Month-over-month comparison

2. **Conversion Rate**
   - Percentage of applications leading to interviews
   - Visual trend analysis

3. **Interview Success Rate**
   - Percentage of interviews resulting in offers
   - Performance tracking

4. **Average Days to Response**
   - How long companies typically take to respond
   - Expected timeline for next update

#### Dashboard Charts & Insights

**1. Application Status Distribution**
- Pie chart showing breakdown of applications by status
- At a glance view of your pipeline
- Identifies bottleneck stages

**2. Interview Stage Trends**
- Line chart showing progression over time
- Track how many applications move through each stage
- Monthly/weekly view options

**3. Company Performance**
- Bar chart of top companies for callbacks
- Identifies most responsive companies
- Helps prioritize future applications

**4. Interview Scheduling**
- Calendar view of upcoming interviews
- Countdown to next interview
- Interview preparation timeline

**5. Success Rate by Company**
- Heatmap showing which companies have highest offer rate
- Helps identify target companies
- Career path recommendations

#### Dashboard Features

- 📊 **Real-time Updates**: Data updates instantly
- 📈 **Comparative Analytics**: Compare your metrics
- 🎯 **Goal Tracking**: Set and track interview targets
- 📅 **Date Filtering**: View specific time periods
- 💾 **Export Reports**: Download insights as PDF/Excel
- 📱 **Responsive Design**: Works on desktop & mobile
- 🔄 **Auto-refresh**: Updates every 5 minutes

#### How to Use Dashboard

1. **Access Dashboard:**
   - Click **"Dashboard"** from main navigation
   - Or click **"View Dashboard"** button on Applications page

2. **Explore Metrics:**
   - Review key statistics at the top
   - Examine charts and trends
   - Identify patterns and insights

3. **Filter Data:**
   - Use date range picker
   - Filter by company or status
   - View specific timeframe

4. **Export Insights:**
   - Click **"Export"** button
   - Choose format (PDF or Excel)
   - Share insights with mentors

5. **Set Goals:**
   - Set monthly interview targets
   - Set offer target
   - Track progress toward goals

**Dashboard Benefits:**
- ✅ Visualize your interview journey
- ✅ Identify improvement areas
- ✅ Track success metrics
- ✅ Make data-driven decisions
- ✅ Share progress with coaches
- ✅ Plan next career moves

---

### 6. Import/Export Records

**What is Import/Export?**
Import/Export allows you to bulk manage your application records using Excel files. Perfect for:
- Adding many applications at once
- Backing up your data
- Sharing data with others
- Migrating from other platforms

#### Export Records

**How to Export Your Applications:**

1. **Go to Applications Page:**
   - Click on **"Applications"** in navigation
   - View all your applications

2. **Click Export Button:**
   - Click **"⬇️ Export"** button
   - Select format:
     - **Excel (.xlsx)** - Recommended
     - **CSV (.csv)** - For compatibility

3. **File Downloads:**
   - File downloads automatically to your device
   - Filename: `interview_applications_[date].xlsx`

**Export File Structure:**

| Column | Description | Example |
|---|---|---|
| Company | Company name | Google |
| Job Title | Position applied for | Software Engineer |
| Applied Date | Application date | 12/01/2025 |
| Status | Current status | Interview Scheduled |
| Scheduled Date | Interview date (if applicable) | 12/15/2025 |

**Exported File Uses:**
- 💾 Backup your data
- 📤 Share with career coaches
- 📊 Personal record keeping
- 📋 Excel analysis

#### Import Records

**How to Import Applications:**

1. **Prepare Excel File:**

Create an Excel file with these columns:
```
| Company Name | Job Title | Applied Date | Status |
|---|---|---|---|
| Google | Software Engineer | 11/15/2025 | Shortlisted |
| Microsoft | Product Manager | 11/20/2025 | Interview Scheduled |
| Amazon | Data Scientist | 11/22/2025 | Applied |
```

**Accepted Column Names (Case-insensitive):**
- Company: "Company Name", "Company", "Organization", "Employer"
- Job Title: "Job Title", "Job", "Position", "Role", "Designation"
- Applied Date: "Applied Date", "Date", "Application Date"
- Status: "Status", "Current Status"
- Scheduled Date (optional): "Scheduled Date", "Interview Date"

2. **Upload File:**
   - Click **"⬆️ Import"** button on Applications page
   - Select your Excel file
   - Click **"Open"**

3. **Validation:**
   - System validates file structure
   - Shows success count & error details
   - Auto-creates new companies if needed

4. **Confirmation:**
   - Review import summary
   - Click **"Confirm"** to proceed
   - Applications appear in dashboard

**Import Features:**
- ✅ Bulk upload up to 1000 records
- ✅ Auto-create missing companies
- ✅ Validate data before import
- ✅ Show success/error count
- ✅ Preview before confirming
- ✅ Rollback on errors

**Import Best Practices:**
1. Use consistent date format (MM/DD/YYYY)
2. Use exact status names from dropdown
3. Keep company names consistent
4. Avoid special characters in fields
5. Test with 5-10 records first

**Common Issues & Solutions:**

| Issue | Solution |
|---|---|
| "Column not found" | Ensure you have required columns |
| "Invalid date format" | Use MM/DD/YYYY format |
| "Company not found" | File creates new company automatically |
| "Status invalid" | Use exact status names from list |

---

## 🚀 Deployment

### Deploy to Netlify (Recommended)

**Prerequisites:**
- GitHub account with repository pushed
- Netlify account ([Sign up free](https://netlify.com/))

**Deployment Steps:**

1. **Connect to Netlify:**
   ```bash
   # Push your code to GitHub first
   git add .
   git commit -m "Final build"
   git push origin main
   ```

2. **Create Netlify Site:**
   - Go to [netlify.com](https://netlify.com/)
   - Click **"Add new site"** → **"Import an existing project"**
   - Select GitHub repository
   - Choose branch: **main**

3. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Leave other settings default

4. **Add Environment Variables:**
   - Go to **Site settings** → **Build & deploy** → **Environment**
   - Click **"Edit variables"**
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL = your_url
     VITE_SUPABASE_PUBLISHABLE_KEY = your_key
     ```

5. **Deploy:**
   - Click **"Deploy"**
   - Wait for build to complete (usually 2-3 minutes)
   - Your app is now live! 🎉

**Post-Deployment:**
- Custom domain setup (optional)
- Enable analytics
- Set up deployment notifications
- Configure SSL/HTTPS (automatic on Netlify)

### Deploy to Vercel (Alternative)

1. Go to [vercel.com](https://vercel.com/)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure environment variables
5. Click **"Deploy"**

### Deploy to Docker (Advanced)

```dockerfile
# Create Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

```bash
# Build and run Docker container
docker build -t interview-compass .
docker run -p 3000:3000 interview-compass
```

---

## 📁 Project Structure

```
interview-compass/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Header.tsx       # App header
│   │   ├── Footer.tsx       # App footer
│   │   ├── StatusBadge.tsx  # Status indicator
│   │   ├── KpiCard.tsx      # Dashboard metrics
│   │   ├── ProtectedRoute.tsx # Auth guard
│   │   └── ui/              # shadcn/ui components
│   ├── pages/               # Page components
│   │   ├── Home.tsx         # Landing page
│   │   ├── Applications.tsx  # Applications list
│   │   ├── ApplicationForm.tsx # Add/Edit app
│   │   ├── ApplicationDetail.tsx # App details
│   │   ├── Dashboard.tsx    # BI Dashboard
│   │   ├── auth/            # Authentication pages
│   │   └── legal/           # Legal pages
│   ├── contexts/            # Context API
│   │   └── AuthContext.tsx  # Auth state management
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Third-party integrations
│   │   └── supabase/        # Supabase config
│   ├── lib/                 # Utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # React entry point
├── supabase/                # Supabase config
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge functions
│   └── config.toml          # Supabase config
├── public/                  # Static assets
├── dist/                    # Production build
├── .env.local               # Environment variables (not committed)
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind CSS config
└── README.md                # This file
```

---

## 🔐 Environment Variables

Create `.env.local` file in root directory:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional Configuration
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Interview Compass
VITE_APP_VERSION=1.0.0
```

**How to Get Supabase Credentials:**

1. Create account at [supabase.com](https://supabase.com/)
2. Create new project
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Create production build
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Database
npm run supabase:up  # Run migrations
npm run supabase:gen # Generate TypeScript types
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Create** a Pull Request

**Code Style:**
- Use TypeScript for type safety
- Follow React best practices
- Use functional components & hooks
- Style with Tailwind CSS

---

## 📧 Support & Contact

- **Email**: interviewvault.2026@gmail.com
- **Portfolio**: [https://dheerajkumar-k.netlify.app/](https://dheerajkumar-k.netlify.app/)
- **Issues**: [GitHub Issues](https://github.com/DheerajKumar97/interview-compass/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DheerajKumar97/interview-compass/discussions)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Supabase** - Backend infrastructure
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool
- **React** - UI library

---

**Made with by [Dheeraj Kumar K](https://dheerajkumar-k.netlify.app/)**

*Last Updated: November 2025*
