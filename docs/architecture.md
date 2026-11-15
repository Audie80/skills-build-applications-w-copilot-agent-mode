# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Use route-level React pages that fetch from the API and render accessible loading, empty, and error states without business logic in the UI.
- Logic tier decision: Keep Express route handlers thin and delegate all validation, lookups, and aggregation to a single service module keyed to the API contract.
- Data tier decision: Define strict Mongoose schemas for users, teams, activities, and workouts with required fields, ObjectId references, and a seed script that is idempotent.
- Activity tracking approach: Validate `userId` and `teamId` against existing records, reject malformed IDs with deliberate 4xx errors, store the linked references plus computed `points` and `occurredAt`, and return the created record on success.
- Team management approach: Require a team name and mascot, default `members` to an empty array, and preserve member references as ObjectIds so the API can list teams with members.
- Leaderboard approach: Aggregate each team's total points from activities, sort totals descending, and assign a 1-based rank for display in the leaderboard response.
- Workout suggestions approach: Resolve the user by email, inspect their recent activities or fitness goal to infer focus, and return a small prioritized list of workouts whose focus and reason match that behavior.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — verifies the Mongoose schema contract and seed idempotence; failures here mean the persisted model layer is missing required validation or default values.
- API command: `npm run test:api --prefix octofit-tracker/backend` — verifies the Express contract for create/list endpoints, validation, leaderboard ordering, and workout suggestions; failures here mean the route/service layer is still stubbed or returning the wrong JSON/HTTP behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — verifies that the UI renders data, announces loading states, handles empty data, and surfaces API failures with accessible output; failures here mean the component layer still uses placeholder content instead of real API-driven behavior.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — catches TypeScript and import/export issues in the Node/Express implementation before shipping the backend.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — catches TypeScript and Vite build problems in the React presentation layer before shipping the frontend.
