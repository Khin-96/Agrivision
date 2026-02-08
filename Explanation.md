# AgriVision: Project Documentation & Vision 2030 Alignment

## 1. Project Overview
AgriVision is an advanced, AI-powered web application designed to empower Kenyan farmers with precision agriculture tools. It leverages cutting-edge Artificial Intelligence (Google Gemini & Groq) to diagnose plant diseases, provide real-time farming advice, and connect farmers directly to markets.

## 2. Alignment with Kenya Vision 2030
This project directly contributes to the **Economic Pillar** of Kenya's Vision 2030, specifically under the **Agriculture** sector. Here is how AgriVision supports the national agenda:

*   **Food Security**: By providing instant disease detection and treatment recommendations, AgriVision helps minimize crop loss, ensuring higher yields and better food security.
*   **Modernizing Agriculture**: The "Monitor Farm" and "AI Consultant" features introduce technology-driven farming (Precision Agriculture), moving away from traditional, less efficient methods.
*   **Market Access & Value Addition**: The integrated **Marketplace** connects farmers directly to buyers, eliminating middlemen and increasing farmer profitability, a key goal of Vision 2030.
*   **Digital Economy**: Integrating **M-Pesa** for payments promotes the digital economy and financial inclusion for rural farmers.

---

## 3. Page-by-Page Explanation

### 1. Home Page / Landing Page
*   **Route**: `/`
*   **Objective**: To introduce the platform and guide users (farmers/buyers) to the core features.
*   **Key Features**:
    *   Dynamic video background for "Premium" aesthetic.
    *   "How it Works" section explaining the Upload -> Analyze -> Result flow.
    *   Call-to-Actions (CTAs) for "Upload Image" and "Monitor Farm".

### 2. Farmer Dashboard
*   **Route**: `/dashboard`
*   **Objective**: The central command center for a farmer.
*   **Key Features**:
    *   **Financial Stats**: Real-time view of Total Sales and Active Products.
    *   **Farm Health**: An aggregate score of the farm's status.
    *   **Recent Analysis**: Quick access to past disease detection results.
    *   **Market Insights**: Data on top-selling crops (e.g., "Onion +12%").
    *   **Weather & Sustainable Tips**: Localized weather updates and farming advice.
    *   **AI Farm Consultant**: Direct link to the AI assistant.

### 3. Farm Monitor
*   **Route**: `/Monitor-Farm`
*   **Objective**: To provide a geospatial view of the farm for monitoring.
*   **Logic**:
    *   Uses **Leaflet** and **GraphHopper** (instead of Google Maps) for rendering farm maps.
    *   **Geolocation**: Automatically fetches the user's GPS coordinates to center the map on their farm.

### 4. Upload & Analysis
*   **Route**: `/upload`
*   **Objective**: The core diagnostic tool where farmers upload images/videos of crops.
*   **Key Features**:
    *   **Dual Mode**: Supports both Image and Video uploads.
    *   **Live Mode**: "Go Live" feature for real-time analysis.
    *   **Multi-language**: Toggles between English and Kiswahili (crucial for local adoption).
    *   **Vision AI**: A "Chat with your Crop" feature where users can ask follow-up questions about the analysis.
*   **API Usage**: Calls `/api/farmbot` (or internal library) to process the image using Google Gemini Vision.

### 5. Marketplace
*   **Route**: `/market`
*   **Objective**: A digital platform for buying and selling agricultural produce.
*   **Key Features**:
    *   **Product Listing**: Display products with images, prices, and farmer details.
    *   **Cart System**: Add items to cart and manage quantities.
    *   **Role-Based Access**: Specialized views for "Buyers" and "Sellers" (Farmers).
    *   **M-Pesa Integration**: Seamless payment processing.

---

## 4. API & Backend Documentation

### 1. The AI Brain (`/api/farmbot`)
*   **Functionality**: This is the intelligence engine of the platform.
*   **Models Used**:
    *   **Google Gemini Pro Vision**: Used for analyzing images (identifying diseases, pests, soil quality).
    *   **Groq (Llama 3)**: Used as a high-speed fallback and for text-based farm management queries.
*   **Output**: Returns a structured JSON containing:
    *   `analysis`: Detailed diagnosis.
    *   `recommendations`: Step-by-step treatment advice.
    *   `personalizedSchedule`: A weekly task list for the farmer.
    *   `risks`: Potential future risks (e.g., spread of disease).
    *   `didYouKnow`: Educational facts.

### 2. M-Pesa Integration (`/api/mpesa`)
*   **Functionality**: Handles mobile money transactions.
*   **Endpoints**:
    *   `stkpush`: Initiates the payment prompt on the user's phone.
    *   `callback`: Receives confirmation from Safaricom when payment is complete.

### 3. History & Cloud Sync (`/api/history`)
*   **Functionality**: Saves analysis results to the database (MongoDB/Prisma).
*   **Objective**: Allows farmers to track disease patterns over time.

---

## 5. Technical Stack Summary
*   **Frontend**: Next.js 14 (App Router), Tailwind CSS (Styling), Framer Motion (Animations).
*   **Backend**: Next.js API Routes (Serverless functions).
*   **AI/ML**: Google Gemini API, Groq SDK.
*   **Database**: MongoDB (via Prisma ORM).
*   **Maps**: Leaflet & GraphHopper.
*   **Payments**: Daraja API (Safaricom M-Pesa).
