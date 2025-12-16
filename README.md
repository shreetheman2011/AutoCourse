# AutoCourse

An intelligent study companion that lets you chat with AI and upload study guide PDFs to generate customizable flashcards, quizzes, and matching exercises.

## Features

- 💬 **AI Chat Interface** - Talk to AI for study help and explanations
- 📄 **PDF Upload** - Upload study guide PDFs for content extraction
- 🎴 **Flashcards** - Generate customizable flashcards from your content
- 📝 **Quizzes** - Create interactive quizzes with multiple question types
- 🔗 **Matching Exercises** - Generate matching exercises for key concepts
- 🎨 **Customizable** - Customize difficulty, topics, and study modes

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create a `.env.local` file in the root directory with:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

To get a free Gemini API key:

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key and add it to your `.env.local` file

**Note:** The `.env.local` file is already in `.gitignore`, so your API key won't be committed to version control.

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Gemini API** - AI chat and content generation (free tier available)
- **pdf-parse** - PDF text extraction

## Usage

1. **Chat with AI**: Use the chat interface to ask questions and get study help
2. **Upload PDF**: Upload a study guide PDF to extract content
3. **Generate Study Tools**: Choose from flashcards, quizzes, or matching exercises
4. **Customize**: Adjust settings like difficulty level, number of items, and topics
5. **Study**: Use the generated tools to enhance your learning
