# Twitter Automation Tool

A full-stack automation app that generates AI-powered tweets and posts them to a Twitter clone platform.

## Features

- 🤖 AI-powered tweet generation using OpenRouter API
- 🎨 Modern, responsive UI inspired by automation tools
- 📝 Edit and preview tweets before posting
- 🏷️ Hashtag suggestions and custom hashtag support
- 🎭 Multiple tone options (engaging, professional, casual, etc.)
- 🚀 One-click posting to Twitter clone
- ✅ Real-time character count and validation

## Tech Stack

**Frontend:**
- Solid.js
- Vanilla CSS with modern design
- Responsive layout

**Backend:**
- FastAPI
- OpenRouter API integration
- HTTPX for async requests

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Make sure your `.env` file is in the backend directory with your API keys

5. Run the FastAPI server:
\`\`\`bash
python main.py
\`\`\`

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
\`\`\`bash
cd frontend
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

The frontend will be available at `http://localhost:3000`

## Usage

1. **Enter a Topic**: Type what you want to tweet about in the main text area
2. **Select Hashtags**: Choose from popular hashtags or add custom ones
3. **Choose Tone**: Select the tone for your tweet (engaging, professional, etc.)
4. **Generate Tweet**: Click "Generate Tweet" to create AI-powered content
5. **Edit if Needed**: Use the edit button to modify the generated tweet
6. **Post**: Click "Post to Twitter" to publish your tweet

## API Endpoints

- `GET /` - Health check
- `POST /generate-tweet` - Generate a tweet based on topic and preferences
- `POST /post-tweet` - Post a tweet to the Twitter clone platform

## Environment Variables

Make sure these are set in your `.env` file:

- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `OPENROUTER_MODEL` - The AI model to use (default: google/gemini-flash-1.5)/(mistralai/mistral-small-3.2-24b-instruct:free)
- `TWITTER_CLONE_API_KEY` - Your Twitter clone API key
- `TWITTER_CLONE_USERNAME` - Your username for the Twitter clone
- `TWITTER_CLONE_URL` - The Twitter clone API endpoint

## Verification

After posting, you can verify your tweets at: https://twitter-clone-ui.pages.dev

## Development

- Backend runs on port 8000
- Frontend runs on port 3000
- CORS is configured to allow communication between frontend and backend
- Hot reload is enabled for both frontend and backend during development
