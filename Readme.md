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
  - Astro 5  
  - Angular 20  
  - TypeScript 5  
  - Angular Material 
- **Backend & Database**  
  - Supabase (Auth & Postgres)  
- **AI Integration**  
  - Openrouter.ai for automatic expense classification  
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
   Copy the example and populate your keys:
   ```bash
   cp .env.example .env
   # Edit .env to set:
   # SUPABASE_URL=
   # SUPABASE_ANON_KEY=
   # OPENROUTER_API_KEY=
   ```
4. **Run in development mode**  
   ```bash
   npm run dev
   ```
5. **Open in browser**  
   Visit `http://localhost:3000` (default Astro port)

## Available Scripts

From the project root, run:

| Script       | Description                              |
|--------------|------------------------------------------|
| `npm run dev`      | Start Astro dev server                 |
| `npm run build`    | Build production assets               |
| `npm run preview`  | Preview production build locally      |
| `npm run astro`    | Run Astro CLI commands                |
| `npm run lint`     | Check code with ESLint                |
| `npm run lint:fix` | Run ESLint with auto-fix              |
| `npm run format`   | Format code with Prettier             |

## Testing

Karma + Jasmine power the unit test suite. The CLI is already wired to use a headless Chrome instance so you can run tests locally or in CI without opening a browser window.

1. **Single run (CI-friendly)**  
   ```bash
   npm run test -- --watch=false --browsers=ChromeHeadless
   ```
2. **Watch mode for local development**  
   ```bash
   npm run test
   ```

> Make sure Google Chrome (or Chromium) is installed locally. The Karma runner launches `ChromeHeadless` by default, but you can override the `browsers` flag if needed.

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