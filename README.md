================================================================================================================================================
FRONT END 
================================================================================================================================================
# Merchant Command Center - Frontend Architecture

## Overview
The frontend is a modern, single-page React Web Application (SPA) built using **Vite**. It employs TypeScript for strong typing and incorporates a highly polished, aesthetic user interface using Tailwind CSS, Framer Motion, and `shadcn/ui` components.

## Core Components
1. **Routing (`App.tsx`)**: 
   - Uses `react-router-dom` for client-side routing between pages like Simulator, Orders, Settings, and Knowledge Base.
2. **Authentication (`ClerkProvider`)**: 
   - Wraps the application to provide seamless user login/registration via Clerk. Handles protected routes natively.
3. **Application Shell (`DashboardLayout.tsx`)**: 
   - Provides the navigation sidebar layout wrapped around all internal routes. Features user account controls and active page tracking.
4. **AI Simulator (`AISimulator.tsx`)**: 
   - A dedicated UI for testing the chat bot locally before deploying to WhatsApp. 
   - Contains logic to interact with the Python backend's `/chat` endpoint.
   - Features a custom Trial Expiration modal with call-to-action buttons (Contact Us vs Add API Key).
5. **Settings Panel (`Settings.tsx`)**: 
   - Allows the merchant to configure System Prompts, WhatsApp tokens, and OpenAI API Keys.

## Component Design & Aesthetics
- **Shadcn UI**: Provides accessible, robust foundation components (Buttons, Dialogs, Inputs, Tooltips).
- **Framer Motion**: Integrates smooth, modern micro-animations (e.g., sliding components on page load) to make the UI feel alive.
- **Lucide React**: Supplies clean, scalable vector icons used comprehensively across the navigation and interfaces.

## File Structure Highlights
- `/src/pages/*`: Top level routing components corresponding to distinct URLs.
- `/src/components/*`: Reusable bits like layout wrappers and specific UI building blocks.
- `/src/hooks/*`: Custom React hooks, notably `use-toast` for application-wide notifications.
- `vite.config.ts`: Configuration strictly enforcing the Vite dev server to run on `port 8080`.

## Key Dependencies (`package.json`)
- **react & react-dom**: Core UI library.
- **@clerk/clerk-react**: User authentication ecosystem.
- **framer-motion & tailwindcss**: Driving the app's visual aesthetics and animations.
- **@radix-ui/***: Headless accessible primitives backing the shadcn implementation.
- **@tanstack/react-query**: Modern data fetching and caching capability.
- **lucide-react**: Rich iconography.




================================================================================================================================================
BACKEND 
================================================================================================================================================

# Merchant Command Center - Backend Architecture

## Overview
The backend is a robust API built with **Python** and **FastAPI**. It primarily serves as the AI engine connecting the merchant's E-commerce dashboard with an intelligent chatbot capable of parsing product queries, retrieving context via Retrieval-Augmented Generation (RAG), and extracting orders through conversational AI.

## Core Components
1. **API Layer (`main.py`)**: 
   - Handles HTTP routing using FastAPI.
   - Provides endpoints like `/chat` for AI interaction.
   - Configures CORS middleware to allow cross-origin requests from the React frontend.
2. **AI Engine (`brain.py`)**: 
   - Powered by LangChain, LangGraph, and OpenAI (**gpt-4o-mini** by default).
   - Utilizes `create_react_agent` to manage multi-turn conversations and tool usage.
   - Handles Token tracking per merchant session.
   - Contains the `SYSTEM_PROMPT` guiding the bot's e-commerce personality.
3. **Tools (`tools.py`)**: 
   - Defines standard specific tools the AI can invoke, such as `search_products` (querying the vector database) and `place_cod_order` (creating pending checkout sessions).
4. **Authentication (`auth.py`)**: 
   - Fully integrated with Clerk via JWT validation. Extracts the `merchant_id` to ensure isolated requests.
5. **Database Models (`models.py`)**: 
   - SQLAlchemy ORM mapping for MySQL. Defines schemas for Merchants, Customers, Orders, OrderItems, and Products.

## Databases
The backend is designed to connect to two separate databases:
1. **MySQL (Relational Data)**:
   - Used for primary application state.
   - Tables: `merchants`, `customers`, `orders`, `order_items`, `products`.
   - Records API key settings, tokens used, and structured order summaries.
2. **MongoDB / ChromaDB (Vector Store Data)**:
   - Used for semantic and similarity search of product catalogs.
   - Helps the AI `search_products` tool find relevant items when the user asks vague natural language questions (e.g., "Do you have any blue silk kurtas?").

## Key Dependencies (`requirements.txt`)
- **fastapi & uvicorn**: The web server framework and ASGI runner.
- **langchain & langchain-openai**: The core AI orchestration libraries connecting to the LLM.
- **chromadb**: The localized vector database for product semantic search.
- **sqlalchemy & pymysql**: Relational DB toolkit and MySQL driver.
- **python-dotenv**: Loads environment variables like `OPENAI_API_KEY` from the `.env` file.








