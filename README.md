# FashioMe Backend

RESTful API powering the FashioMe fashion recommendation platform: user auth, wardrobe/catalog management, AI-assisted outfit generation, cart/checkout (eSewa), reviews, and an admin back office for users/clothes/orders.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| File uploads | Multer |
| Email | Nodemailer |
| AI | OpenAI (outfit generation / styling assistant) |
| Payments | eSewa |
| Testing | Jest, Supertest, mongodb-memory-server |
| Linting | ESLint (typescript-eslint) |

## Architecture

Code is layered by responsibility, with routing kept separate from business logic:

```
routes/        → HTTP endpoint definitions, wires middleware to controllers
controllers/   → request/response handling, delegates to services
services/      → business logic
repositories/  → data access (Mongoose queries)
models/        → Mongoose schemas + TypeScript interfaces
dtos/          → request/response shape definitions
middlewares/   → auth, admin gating, upload handling, error handling, validation
exceptions/    → custom HttpException for consistent error responses
configs/       → environment/config constants
```

## Prerequisites

- Node.js 18+ and npm
- MongoDB running locally or a remote connection string

## Environment Setup

Copy `.env.example` to `.env` and fill in real values:

```env
PORT=8089
MONGO_URI=mongodb://localhost:27017/fashiome-db
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
PUBLIC_API_URL=http://localhost:8089
GEMINI_API_KEY=your-gemini-api-key-here
OPENAI_API_KEY=your-openai-api-key-here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=no-reply@fashiome.com
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET=your-esewa-secret
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## Getting Started

```bash
npm install
npm run dev
```

Server starts on `http://localhost:8089` (or whatever `PORT` is set to).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server with auto-reload (tsx watch) |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled/dev server once |
| `npm test` | Run the Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run seed` | Seed the database with sample data |
| `npm run create-admin` | Create an admin user |
| `npx eslint .` | Lint the codebase |

## Testing

Tests use Jest + Supertest against an in-memory MongoDB instance (`mongodb-memory-server`), so no real database connection is needed to run them. Test files live under `tests/`, organized by layer (`controllers` via route-level tests, `services`, `repositories`, `models`, `middlewares`) plus route/API-level integration tests at the top level (`auth.test.ts`, `cart.test.ts`, `order.test.ts`, etc.) and `app.smoke.test.ts` for a basic health check.

## API Reference

All routes are prefixed with `/api/v1`. Endpoints marked 🔒 require a valid JWT (`Authorization: Bearer <token>`); 🔒👑 require an authenticated admin.

### Auth & Account — `/auth`, `/users`
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Authenticate and receive a JWT |
| POST | `/auth/forgot-password` | Request a password reset email |
| POST | `/auth/reset-password` | Reset password with a reset token |
| GET | `/users/whoami` 🔒 | Get the current authenticated user |
| PUT | `/users/update` 🔒 | Update the current user's profile |
| DELETE | `/users/delete` 🔒 | Delete the current user's account |
| GET | `/users/style-archive` 🔒 | Get the user's saved style archive |
| POST | `/users/style-archive` 🔒 | Add/update a style archive entry |

### Onboarding & Silhouette — `/onboarding`, `/silhouette`
| Method | Path | Description |
|---|---|---|
| GET | `/onboarding/status` 🔒 | Get onboarding completion status |
| POST | `/onboarding/complete` 🔒 | Mark onboarding as complete |
| GET | `/silhouette/profile` 🔒 | Get the user's body/style silhouette profile |
| POST | `/silhouette/profile` 🔒 | Create/update the silhouette profile |
| DELETE | `/silhouette/profile` 🔒 | Clear the silhouette profile |

### Home, Wardrobe & AI Stylist — `/home`
| Method | Path | Description |
|---|---|---|
| GET | `/home/dashboard` 🔒 | Aggregated dashboard data |
| GET | `/home/trends` 🔒 | Style trend suggestions |
| POST | `/home/generate-outfit` 🔒 | Generate an AI outfit suggestion |
| POST | `/home/assistant-chat` 🔒 | Chat with the AI styling assistant |
| POST | `/home/search` 🔒 | Search the catalog/wardrobe |
| GET | `/home/wardrobe` 🔒 | List the user's wardrobe items |
| POST | `/home/wardrobe` 🔒 | Add a wardrobe item |
| POST | `/home/wardrobe/sync` 🔒 | Bulk sync wardrobe items |
| PATCH | `/home/wardrobe/:itemId` 🔒 | Update a wardrobe item |
| DELETE | `/home/wardrobe/:itemId` 🔒 | Remove a wardrobe item |
| POST | `/home/generate-profile` 🔒 | Generate a style profile from inputs |

### Catalog (Public) — `/home`
| Method | Path | Description |
|---|---|---|
| GET | `/home/clothes` | Browse the public clothing catalog |
| GET | `/home/clothes/:id` | Get a single catalog item |

### Cart, Orders & Payments — `/cart`, `/orders`, `/esewa`
| Method | Path | Description |
|---|---|---|
| GET | `/cart` 🔒 | Get the current user's cart |
| PUT | `/cart` 🔒 | Replace the current user's cart |
| POST | `/orders` 🔒 | Create an order |
| GET | `/orders/me` 🔒 | List the current user's orders |
| GET | `/orders/:id` 🔒 | Get a single order |
| GET | `/esewa/checkout` | Initiate an eSewa checkout |
| GET | `/esewa/payment-url` 🔒 | Get the eSewa payment URL |
| POST | `/esewa/verify` 🔒 | Verify an eSewa payment |

### Reviews — `/reviews`
| Method | Path | Description |
|---|---|---|
| POST | `/reviews` 🔒 | Create a review |
| GET | `/reviews/clothe/:clotheId` | Get reviews for a catalog item |
| GET | `/reviews/my` 🔒 | Get the current user's reviews |
| PUT | `/reviews/:id` 🔒 | Update a review |
| DELETE | `/reviews/:id` 🔒 | Delete a review |

### Uploads — `/upload`
| Method | Path | Description |
|---|---|---|
| POST | `/upload/upload-photo` 🔒 | Upload an image (profile photo, etc.) |

### Admin — Users — `/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` 🔒👑 | List all users |
| GET | `/admin/users/:id` 🔒👑 | Get a single user |
| POST | `/admin/users` 🔒👑 | Create a user |
| PUT | `/admin/users/:id` 🔒👑 | Update a user |
| PATCH | `/admin/users/:id` 🔒👑 | Partially update a user |
| DELETE | `/admin/users/:id` 🔒👑 | Delete a user |

### Admin — Clothes — `/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/clothes` 🔒👑 | List all catalog items |
| GET | `/admin/clothes/low-stock` 🔒👑 | List low-stock items |
| GET | `/admin/clothes/:id` 🔒👑 | Get a single catalog item |
| POST | `/admin/clothes` 🔒👑 | Create a catalog item (with image) |
| PUT | `/admin/clothes/:id` 🔒👑 | Update a catalog item |
| PATCH | `/admin/clothes/:id` 🔒👑 | Partially update a catalog item |
| DELETE | `/admin/clothes/:id` 🔒👑 | Delete a catalog item |

### Admin — Orders — `/admin`
| Method | Path | Description |
|---|---|---|
| GET | `/admin/orders/stats` 🔒👑 | Order statistics |
| GET | `/admin/orders` 🔒👑 | List all orders |
| PATCH | `/admin/orders/:id/status` 🔒👑 | Update an order's status |
| DELETE | `/admin/orders/:id` 🔒👑 | Delete an order |

## Error Responses

Errors are raised as `HttpException` and normalized by `errorMiddleware` into a consistent shape:

```json
{
  "statusCode": 400,
  "isSuccess": false,
  "responseMessage": "Human-readable error message",
  "responseData": null
}
```

## Related Repos

- Frontend (Next.js SPA): [`Fashiome web project`](../Fashiome%20web%20project)
