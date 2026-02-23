## CHAPTER FIVE: SYSTEM DESIGN AND IMPLEMENTATION

### 5.0 Introduction
This chapter discusses the technical design and implementation of the AgriVision system. It covers the architecture, detailed database schema, and the implementation of core modules including AI analysis, marketplace, and user management.

### 5.1 System Architecture
AgriVision is implemented as a micro-service-ready monolithic architecture using Next.js, optimized for cloud deployment.

#### 5.1.1 Presentation Layer
Built with **React** and **Tailwind CSS**, the presentation layer ensures a "Visual Excellence" experience as per project standards. It uses:
- **Framer Motion:** For smooth transitions and micro-animations.
- **Responsive Web Design:** To ensure compatibility with smartphones, tablets, and desktops.
- **Lucide React:** For a modern icon system.

#### 5.1.2 Application Layer
The logic is handled by **Next.js API Routes** (Serverless functions), which interact with:
- **Google Gemini SDK:** For multimodal AI analysis.
- **Next-Auth:** For secure session management and authentication.
- **Prisma Client:** For type-safe database access.

#### 5.1.3 Data Layer
- **SQLite:** Used for the development and initial deployment phase for simplicity and performance.
- **Prisma ORM:** Acts as the abstraction layer, making it easy to migrate to PostgreSQL as the system scales.

### 5.2 Database Design

#### 5.2.1 Users Table
Stores information for both farmers and buyers.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | String | PK, CUID | Unique user identifier |
| email | String | Unique | User's login email |
| role | String | Default: 'buyer' | User access level (buyer/farmer) |
| idVerified| Boolean| Default: false | Verification status for listing products |
| farmName | String | Optional | Name of the farm |

#### 5.2.2 Products Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | String | PK, CUID | Product unique ID |
| name | String | | Name of the produce/item |
| price | Float | | Cost per unit |
| quantity | Int | | Available stock |
| farmerId | String | FK (User) | Reference to the seller |

#### 5.2.3 Analysis Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| id | String | PK, CUID | Analysis event ID |
| userId | String | FK (User) | User who initiated analysis |
| imageUrl | String | | Path to the uploaded media |
| results | Json | | AI generated JSON data |

### 5.3 System Implementation

#### 5.3.1 Development Environment Setup
The project utilizes a monorepo-style structure within Next.js:
- **Runtime:** Node.js v20 (LTS)
- **Package Manager:** npm
- **Core Dependencies:** `next`, `react`, `prisma`, `@google/generative-ai`, `next-auth`, `framer-motion`.

#### 5.3.2 Backend Implementation
The backend is built using Next.js **API Routes** (App Router).
- **Authentication:** `src/app/api/auth/[...nextauth]/route.ts` manages OAuth and Credentials providers.
- **Product Management:** `src/app/api/products/route.ts` handles complex querying and permission checks.
- **Verification Service:** `src/app/api/verify-id/route.ts` processes multipart form data for ID uploads.

#### 5.3.3 Frontend Implementation
- **Layout System:** A global `Layout.tsx` component ensures consistent navigation and premium aesthetics.
- **State Management:** React Context API is used for managing user sessions and cart states.
- **UI Components:** Custom buttons, cards, and modals built with Tailwind CSS for high-performance rendering.

#### 5.3.4 AI Model Implementation
AgriVision utilizes **Gemini 2.0 Flash** for its multimodal capabilities.
- **Image Processing:** `src/lib/gemini.ts` converts base64 representations of farmer-uploaded photos into AI-readable parts.
- **System Prompting:** Detailed instructions ensure the AI acts as a "Vision: expert agricultural AI assistant," providing structured feedback on pests, diseases, and growth stages.

### 5.4 System Interfaces
... (rest of the content remains)

#### 5.4.1 User Interfaces
- **Farmer Dashboard:** Focused on upload tools, scan history, and product management.
- **Buyer Storefront:** Clean, visually appealing marketplace with category filters.
- **Admin Panel:** Tracking verification requests and system analytics.

#### 5.4.2 Hardware/Software Interfaces
- **Camera API:** For direct photo capture on mobile devices.
- **Storage API:** For temporary file handling and permanent cloud storage.
- **M-Pesa Daraja API:** For processing local mobile money payments.

### 5.5 System Security
- **Authentication:** JWT-based sessions via Next-Auth.
- **Authorization:** Middleware checks `user.role` for sensitive routes (e.g., only verified farmers can POST to `/api/products`).
- **Data Protection:** Environment variables for API keys and database URLs; input validation using TypeScript types.

### 5.6 Summary
Chapter 5 has detailed the implementation path of AgriVision, showcasing how modern tools like Next.js and Gemini AI are combined to create a premium, secure, and accurate agricultural tool for Kenyon farmers.
