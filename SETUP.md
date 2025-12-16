# AutoCourse Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up API Key

Create a `.env.local` file in the root directory (same level as `package.json`):

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

**That's it!** Just these two steps and you're ready to go.

### 3. Run the App
```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

## Getting Your Free Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it into your `.env.local` file

## File Structure

- `.env.local` - Your API key (already in .gitignore, won't be committed)
- `app/` - Next.js app directory with pages and API routes
- `components/` - React components
- `package.json` - Dependencies and scripts

## That's All You Need!

The `.env.local` file is the only configuration needed. Everything else is already set up.

