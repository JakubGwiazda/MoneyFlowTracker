# MoneyFlowTracker

> A web application for logging, categorizing, and visualizing personal expenses with AI-powered classification.

## Table of Contents

1. [Project Description](#project-description)
2. [Tech Stack](#tech-stack)
3. [Getting Started Locally](#getting-started-locally)
4. [Available Scripts](#available-scripts)
5. [Project Scope](#project-scope)
6. [Project Status](#project-status)
7. [License](#license)

---

## Project Description

MoneyFlowTracker is an Angular + Astro-based web tool that enables users to quickly record expenses, automatically classify them via an external AI model, manually correct categories, and visualize spending through bar and pie charts. Authentication is provided by Supabase, and all API keys are securely managed via environment variables.

## Tech Stack

- **Frontend**
  - Angular 20 (Standalone Components)
  - TypeScript 5
  - Angular Material
  - Bootstrap 5.3.8
- **Backend & Database**
  - Supabase (Auth & Postgres)
- **AI Integration**
  - Openrouter.ai for automatic expense classification
- **Testing**
  - Unit Tests: Karma + Jasmine
  - E2E Tests: Playwright
- **CI/CD & Hosting**
  - GitHub Actions
  - DigitalOcean
- **Runtime**
  - Node.js v22.14.0 (managed via `.nvmrc`)

## Getting Started Locally

### Prerequisites

- Node.js v22.14.0 (recommended via nvm)
- npm (comes with Node.js)
- A Supabase project (URL & API key)
- An Openrouter.ai API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/MoneyFlowTracker.git
   cd MoneyFlowTracker
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**

   For **development** (local Supabase):

   ```bash
   # Start local Supabase instance
   npm run db_start

   # Create .env with local config
   # SUPABASE_URL=http://127.0.0.1:54321
   # SUPABASE_KEY=your_local_anon_key
   # OPENROUTER_API_KEY=your_api_key
   ```

   For **E2E testing** (remote Supabase):

   ```bash
   # Create .env.test with the following variables:
   # E2E_USERNAME=test-user@example.com
   # E2E_PASSWORD=your-test-password
   # SUPABASE_URL=https://your-project-ref.supabase.co
   # SUPABASE_KEY=your-supabase-anon-key
   # OPENROUTER_API_KEY=sk-or-v1-your-key (optional)
   ```

4. **Run in development mode**
   ```bash
   npm start
   ```
5. **Open in browser**  
   Visit `http://localhost:4200` (default Angular port)

## Available Scripts

From the project root, run:

### Development

| Script                | Description                                   |
| --------------------- | --------------------------------------------- |
| `npm start`           | Start Angular dev server (development mode)   |
| `npm run start:local` | Start with local environment config           |
| `npm run start:e2e`   | Start with E2E environment config (.env.test) |
| `npm run start:prod`  | Start with production config                  |

### Build

| Script                | Description             |
| --------------------- | ----------------------- |
| `npm run build`       | Build for production    |
| `npm run build:dev`   | Build for development   |
| `npm run build:e2e`   | Build for E2E tests     |
| `npm run build:local` | Build with local config |

### Testing

| Script                    | Description                      |
| ------------------------- | -------------------------------- |
| `npm test`                | Run unit tests (Karma + Jasmine) |
| `npm run test:e2e`        | Run E2E tests (Playwright)       |
| `npm run test:e2e:ui`     | Run E2E tests with UI            |
| `npm run test:e2e:headed` | Run E2E tests in headed mode     |
| `npm run test:e2e:debug`  | Debug E2E tests                  |
| `npm run test:e2e:report` | Show E2E test report             |

### Code Quality

| Script             | Description               |
| ------------------ | ------------------------- |
| `npm run lint`     | Check code with ESLint    |
| `npm run lint:fix` | Run ESLint with auto-fix  |
| `npm run format`   | Format code with Prettier |

### Database

| Script             | Description                   |
| ------------------ | ----------------------------- |
| `npm run db_start` | Start local Supabase instance |

## Testing

### Unit Tests

Karma + Jasmine power the unit test suite. The CLI uses a headless Chrome instance for CI/CD compatibility.

1. **Single run (CI-friendly)**
   ```bash
   npm test -- --watch=false --browsers=ChromeHeadless
   ```
2. **Watch mode for local development**
   ```bash
   npm test
   ```

> Make sure Google Chrome (or Chromium) is installed locally. The Karma runner launches `ChromeHeadless` by default.

### E2E Tests

End-to-end tests are powered by Playwright and test the application against a remote Supabase instance.

1. **Setup E2E environment**  
   Create a `.env.test` file in the project root with required variables:

   ```env
   E2E_USERNAME=test-user@example.com
   E2E_PASSWORD=your-test-password
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   OPENROUTER_API_KEY=sk-or-v1-your-key
   ```

   > **Note**: Make sure the test user exists in your Supabase database

2. **Run E2E tests**

   ```bash
   # Playwright will automatically start the app in E2E mode
   npm run test:e2e
   ```

3. **Debug E2E tests**

   ```bash
   npm run test:e2e:debug
   ```

4. **View test report**
   ```bash
   npm run test:e2e:report
   ```

> **Note**: E2E tests use environment variables from `.env.test`. Playwright config automatically loads these variables. For GitHub Actions CI setup, see [.github/E2E_GITHUB_SETUP.md](.github/E2E_GITHUB_SETUP.md).

## Project Scope

### In Scope (MVP)

- User registration & login (email/password via Supabase)
- CRUD operations for expense entries (name, amount, date) with validation
- Automatic AI-powered category & subcategory classification
- Manual correction with autocomplete and custom category creation
- Filtering expenses by predefined and custom date ranges (day, week, month, year)
- Bar and pie chart visualizations by category
- Logging all operations (add, edit, classify) in a `Logs` table

### Out of Scope

- Sharing expense records between users
- Advanced budgeting features (budget planning, suggestions)
- Importing expenses from external sources (OCR, images)
- Goal-based budgeting system
- Automated budget suggestions for future months

## Project Status

- Version: **0.0.1** (pre-release)
- Status: MVP under active development
- Roadmap:
  1. Complete user authentication & CRUD flows
  2. Integrate AI classification & manual corrections
  3. Implement filtering & visualizations
  4. Write end-to-end tests (adding expenses, category corrections)
  5. Deployment via GitHub Actions → DigitalOcean

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
