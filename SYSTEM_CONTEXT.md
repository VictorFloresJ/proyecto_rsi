# System Context: Video Game Recommendation Platform

## 1. Project Overview & Scope
This project is a Web-Based Video Game Recommendation System designed as a final university project. The core objective is to deliver an end-to-end software solution that demonstrates advanced information retrieval and recommendation techniques through decoupled web services.

### Core Recommendation Requirements (Rubric Constraints)
*   **Cold Start Handling:** Mitigation strategies for both New Users (via an interactive onboarding wizard) and New Items (via metadata affinity scoring).
*   **Hybrid Model:** A recommendation engine combining Content-Based Filtering (game mechanics, genres, publishers) and Collaborative Filtering (user-item interaction matrices).
*   **Ranking & Boosting:** Post-processing algorithms to boost items based on discounts or recent release dates, followed by contextual re-ranking (user's platform and available gameplay time).
*   **White-Box & Organic Recommendation:** Every recommended item must include an explicit, human-readable text explaining the logic behind the suggestion (e.g., "Recommended because you played X and it features Y").
*   **Advanced UI Feature (Bonus):** Utilization of client-side Web Workers to offload heavy filtering and sorting tasks from the UI main thread.
*   **Advanced Storage Feature (Bonus):** Usage of an unstructured/document database to persist complex, highly variable game metadata.

---

## 2. Global Constraints & Guidelines
*   **Language Policy:** When discussing software development, architecture, variable names, documentation, or technical terms, priority MUST be given to English. General user interaction can remain in Spanish.
*   **Formatting Guardrail:** The use of emojis is STRICTLY PROHIBITED in any context, including code comments, commit messages, API documentation, explanations, or terminal outputs.
*   **Architecture Pattern:** Decoupled Micro-services/Modules. Every component must behave as an independent layer, communicating via clean RESTful APIs.

---

## 3. System Architecture & Directory Structure
The workspace is organized into a single repository where each logical component is strictly mapped to a specific directory:

```text
video-game-recommender/
│
├── frontend/
│   ├── web-client/               # React.js + TypeScript + Tailwind CSS (UI & Views)
│   └── web-workers/              # Native JavaScript Web Workers (Client-side heavy processing)
│
├── backend/
│   ├── api-gateway/              # FastAPI (Routing, Authentication JWT, Rate-limiting)
│   ├── user-service/             # FastAPI + SQLAlchemy + PostgreSQL (User management & Onboarding data)
│   ├── catalog-service/          # FastAPI + Beanie/Motor + MongoDB (Game metadata and catalog management)
│   └── recommendation-engine/    # FastAPI + NumPy + Pandas + Scikit-learn (Algorithmic core)
│
└── storage/
    ├── data-pipeline/            # Python Scripts (Data ingestion, parsing, and initial DB seeding)
    ├── relational-db/            # PostgreSQL configuration/schemas (Users, Authentication, Ratings Matrix)
    └── nosql-db/                 # MongoDB configuration/collections (Game documents, tags, platforms)