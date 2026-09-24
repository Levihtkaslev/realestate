# Real Estate Listing Platform

A real-estate listing platform inspired by 99acres and NoBroker. Owners post properties with photos, visitors search and filter, and buyers send enquiries to owners.

> **Status:** the backend is complete. API docs are at `http://localhost:5000/api-docs`. The frontend (Next.js + Tailwind) is in progress.

## Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 16 |
| ORM / migrations | Prisma 7 (with `@prisma/adapter-pg`) |
| Auth | JWT access token and a refresh token stored as a hash in the database (`jsonwebtoken`, `bcryptjs`) |
| Uploads | `multer` (local disk) |
| Security | `helmet`, `cors`, `express-rate-limit` |

---

## Getting started

Requirements: Node.js 20 or later, and PostgreSQL 14 or later.

```bash
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Fill in `backend/.env`:

| Key | Example | Notes |
|---|---|---|
| `PORT` | `5000` | API port |
| `DATABASE_URL` | `postgresql://postgres:PASS@localhost:5432/realestate` | Write `@` in the password as `%40`. Prisma creates the database if it doesn't exist. |
| `JWT_ACCESS_SECRET` | long random text | Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The server won't start without it. |
| `FRONTEND_URL` | `http://localhost:3000` | The only browser origin CORS allows |

```bash
npx prisma migrate dev        # creates all tables
npx prisma generate           # generates the typed client
npx prisma db seed            # 36 states, property types, amenities, admin account
npm run seed:properties       # optional: 50,000 fake properties for performance testing
npm run dev                   # http://localhost:5000
```

**Admin account from the seed:** `admin@realestate.local` / `admin123`. This is for development only; change it for any real deployment.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server with auto-restart (tsx watch) |
| `npm run build` / `npm start` | Compiles TypeScript to `dist/` and runs it |
| `npx prisma db seed` | Seeds the master data and the admin account |
| `npm run seed:properties` | Inserts 50,000 fake properties owned by 20 fake owners (`owner1..20@seed.local`). Re-running it replaces only those. |
| `npm run measure:search` | Runs `EXPLAIN ANALYZE` on typical search queries and prints the scan type and timing |

---

## Folder structure

```
backend/
├── prisma/
│   ├── schema.prisma          all tables, relations and indexes
│   ├── migrations/            generated SQL history
│   ├── seed.ts                master data + admin
│   ├── seed-properties.ts     50k performance data
│   └── measure-search.ts      EXPLAIN ANALYZE benchmark
├── src/
│   ├── index.ts               app setup: middleware order, route mounting, 404 + error handler
│   ├── prisma.ts              one shared Prisma client
│   ├── docs/swagger.ts        OpenAPI description served at /api-docs
│   ├── routes/                one file per module (auth, user, state, city, locality,
│   │                          propertyType, amenity, property, propertyImage, inquiry)
│   ├── middlewares/
│   │   ├── auth.ts            requireLogin, requireAdmin
│   │   ├── rateLimit.ts       general, auth and enquiry limiters
│   │   └── error.ts           notFound + central errorHandler
│   └── utils/
│       ├── slug.ts            makeSlug()
│       └── upload.ts          multer config, file helpers
└── uploads/properties/        uploaded photos (git-ignored)
```

**Why this structure:** each module is one route file, and each endpoint is one handler that reads top to bottom (validate → check permissions → query → respond). Code shared by several modules (auth, rate limits, errors, slugs, uploads) lives in `middlewares/` and `utils/`. For a codebase this size, a separate controller/service layer per endpoint would spread one endpoint across three files without adding anything. The next step as the app grows would be to move the database logic of the larger modules (`property`) into a service file.

**Request pipeline** (the order in `index.ts`):

```
helmet → cors → express.json → generalLimiter → route [→ requireLogin → requireAdmin] → handler
                                                     ↘ no match → notFound (404)
                                                     ↘ thrown error → errorHandler
```

---

## Database design

```
states 1─* cities 1─* localities
                 │          │
users 1─* properties *──────┘ (city_id, locality_id, property_type_id)
  │          │ 1
  │          ├─* property_images
  │          ├─* property_amenities *─1 amenities
  │          └─* inquiries *─1 users
  └─* refresh_tokens
```

- **Masters** (states, cities, localities, property types, amenities) are managed by the admin. Users choose from them rather than typing free text, so names stay consistent and filters can match on integer IDs. Each master has a unique `slug` and an `isActive` flag (deactivate instead of delete).
- **Referential integrity:** masters use `onDelete: Restrict`, so a city with properties can't be deleted, and the API returns a clear 409 first. Owned data uses `Cascade`: deleting a user removes their properties, images, enquiries and tokens, and deleting a property removes its images, amenity links and enquiries.
- **Denormalised `city_id` on properties.** The locality already implies the city, but storing `city_id` directly makes the most common filter a single indexed column with no join.
- **Money** is stored in whole rupees (`Int`). For rent listings, `price` is the monthly rent.
- **Naming:** camelCase in code, snake_case in the database (`@map` / `@@map`).

---

## Authentication and authorisation

**Tokens**

| | Access token | Refresh token |
|---|---|---|
| Format | JWT (`userId`, `role`), HS256 | 40 random bytes (hex) |
| Lifetime | 15 minutes | 7 days |
| Stored on the server | No. It's verified by signature, with no database lookup. | Only its **SHA-256 hash**, one row per device |
| Sent on | Every protected request (`Authorization: Bearer …`) | Only `/auth/refresh` and `/auth/logout` |

- **Why two tokens:** the short-lived access token limits the damage if it's stolen, and it's checked without touching the database. The long-lived refresh token keeps users logged in, and because it's stored server-side, logout can revoke it.
- **Rotation:** every `/auth/refresh` deletes the used refresh token and issues a new pair, so a stolen refresh token stops working after the next legitimate refresh.
- **Hashing:** passwords use bcrypt. Refresh tokens are stored hashed, so a database leak doesn't expose usable tokens.
- **Login errors:** login returns the same 401 for an unknown email and a wrong password, which prevents account enumeration.

**Permissions**

| Level | How | Examples |
|---|---|---|
| Public | No middleware | Search, property detail, similar, master lists |
| Logged in | `requireLogin` sets `req.user` | Post property, my listings, send/read enquiries, `/auth/me` |
| Owner | `requireLogin` plus a check in the handler (`property.ownerId === req.user.userId`, or ADMIN) | Edit/delete a property, manage its images |
| Admin | `requireLogin, requireAdmin` | Create/update/delete masters, all `/api/users` |

The owner and the enquiry sender are **always taken from the token**, never from the request body.

---

## Search, filtering and scalability (50,000+ rows)

`GET /api/properties/search`
- **Required:** `listingType=SALE|RENT`.
- **Optional filters:** `cityId`, `localityId`, `propertyTypeId`, `bedrooms`, `minPrice`, `maxPrice`.
- **Sort:** `newest` (default), `price_asc` or `price_desc`, always with `id` as a tie-breaker.
- **Filtering happens in the database.** The client only sends the selected values, and only `ACTIVE` listings are returned.

**Indexes.** These are composite indexes that follow the query shape: equality columns first, then the sort/range column, then `id`.

```prisma
@@index([listingType, status, cityId, price, id])
@@index([listingType, status, cityId, createdAt, id])
@@index([listingType, status, price, id])
@@index([listingType, status, createdAt, id])
@@index([localityId])  @@index([propertyTypeId])  @@index([ownerId])
```

**Measured on 50,000 rows** (`npm run measure:search`, median of 5 runs):

| Query | Before | After |
|---|---|---|
| SALE + city + budget, price ↑ | Seq Scan, 7.18 ms | Index Scan, 0.04 ms |
| SALE + city + 2 BHK, newest | Seq Scan, 7.37 ms | Index Scan, 0.14 ms |
| SALE, all cities, newest | Seq Scan, 12.30 ms | Index Scan, 0.02 ms |
| RENT, all cities, price ↓ | Seq Scan, 7.18 ms | Index Scan, 0.02 ms |
| RENT + locality, price ↑ | Seq Scan, 5.95 ms | Index Scan, 0.25 ms |

**Pagination is cursor-based (keyset).** The client sends `limit` (default 20, max 50) and the `cursor` from the previous response, which returns `{ items, hasMore, nextCursor }`. The API fetches `limit + 1` rows to know whether another page exists, without a count query. Unlike `OFFSET`, deep pages stay fast (a page after 3,000 results takes the same time as page 1), and new listings don't cause duplicates or skipped items between pages. The trade-off is that you can't jump to page N, which suits "Load more" / infinite scroll.

**Response size:** list cards include only the cover image and the city/locality/type names. The full detail (all images, amenities, owner contact) is returned only by the detail endpoints.

---

## Similar properties

`GET /api/properties/:id/similar` returns up to 6 properties in about 9 ms on 50k rows.

1. **Candidates:** the newest 50 that are ACTIVE and match the same sale/rent type, **city** and **property type**, with BHK ±1 and a price within ±30%. This query uses the search index.
2. **Score:** same locality +3, same BHK +2, and price closeness up to +2 (`2 × (1 − gap% / 30)`).
3. Sort by score and keep the top 6.
4. **Fallback:** if fewer than 6 are found (for a rare type or a small city), fill the rest with the newest listings in the same city and sale/rent type.

The candidates are filtered by property type **before** scoring. An earlier version scored every nearby-priced listing in the city and ranked warehouses as "similar" to flats.

---

## Enquiries: duplicate and spam protection

`POST /api/inquiries` requires login. The sender is taken from the token.

| Protection | How |
|---|---|
| Validation | Message of 10–500 characters; the property must exist and be `ACTIVE`; you can't enquire about your own property |
| Duplicates | Checked in the handler (clear 409), plus a database-level `@@unique([propertyId, userId])`. Concurrent duplicates that pass the check are caught as Prisma `P2002` and returned as 409. |
| Spam per user | At most 5 enquiries per hour per user (an indexed count on `[userId, createdAt]`), otherwise 429 |
| Spam per network | `express-rate-limit`: 20 per hour per IP |

Owners read `GET /api/inquiries/received` (with the sender's name, email and phone). Senders read `GET /api/inquiries/sent`.

---

## Images

- `multer` saves files to `uploads/properties/` with unique names. The database stores only the URL, and files are served at `/uploads/...`.
- Only jpg/png/webp are allowed, up to 5 MB each and 10 per property. `requireLogin` runs **before** multer, so anonymous uploads never reach the disk. Files from rejected requests are deleted.
- The first image becomes the cover, and the cover can be changed in a transaction. When the cover is deleted, the next image is promoted. Deleting an image or a property also deletes its files.
- Storage is local disk to keep setup simple. The URL-based design allows moving to S3 or another object store without changing the schema.

---

## Validation, errors and security

- **Validation:** explicit checks in each handler (required fields, enums, number ranges, referenced records exist and are active, locality belongs to the chosen city).
- **One error shape:** every error response is `{ "message": "..." }`.
  - `notFound` handles unknown routes (404).
  - `errorHandler` maps invalid JSON → 400, upload errors → 400, Prisma `P2002` → 409, `P2025` → 404, `P2003` → 409, and anything else → 500 with a generic message. Stack traces and SQL are never sent to the client.
- **Rate limits (per IP):** 1000 requests per 15 minutes on all `/api` routes (high because server-side rendering shares one IP), 10 per 15 minutes on login/register, and 20 per hour on enquiries.
- **Headers:** `helmet` is enabled. Cross-origin resource policy is relaxed only so the frontend can show `/uploads` images.
- **CORS:** only `FRONTEND_URL` is allowed.
- **Secrets:** `.env` is git-ignored, and the server refuses to start without `JWT_ACCESS_SECRET`.

---

## API reference

The interactive docs (Swagger UI) are at **`/api-docs`**, and the raw OpenAPI JSON is at `/api-docs.json`. To call protected endpoints there, log in, click **Authorize** and paste the `accessToken`.

🌐 public · 🔑 login · 👤 owner or admin · 🛡️ admin

**Auth**

| Method | Path | Access | Body / notes |
|---|---|---|---|
| POST | `/api/auth/register` | 🌐 | `{ name, email, phone?, password }` |
| POST | `/api/auth/login` | 🌐 | `{ email, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | 🌐 | `{ refreshToken }` → new pair (rotation) |
| POST | `/api/auth/logout` | 🌐 | `{ refreshToken }` |
| GET | `/api/auth/me` | 🔑 | The current user |

**Properties**

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/properties/search` | 🌐 | Filters, sort and cursor pagination (see above) |
| GET | `/api/properties/slug/:slug` | 🌐 | Detail by SEO slug |
| GET | `/api/properties/:id` | 🌐 | Detail: images, amenities, owner contact |
| GET | `/api/properties/:id/similar` | 🌐 | Up to 6 similar |
| GET | `/api/properties` | 🌐 | Latest 20 active |
| GET | `/api/properties/mine` | 🔑 | My listings (all statuses) |
| POST | `/api/properties` | 🔑 | `{ title, description, listingType, price, areaSqft, propertyTypeId, cityId, localityId, bedrooms?, bathrooms?, furnishing?, address?, amenityIds? }` |
| PUT | `/api/properties/:id` | 👤 | Any of the fields above, plus `status` (ACTIVE / INACTIVE / SOLD) |
| DELETE | `/api/properties/:id` | 👤 | Also removes images, amenity links and enquiries |

**Property images**

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/property-images/:propertyId` | 👤 | multipart form-data, key `images` (1–10 files) |
| GET | `/api/property-images/by-property/:propertyId` | 🌐 | |
| PUT | `/api/property-images/:imageId/cover` | 👤 | |
| DELETE | `/api/property-images/:imageId` | 👤 | |

**Enquiries**

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/inquiries` | 🔑 | `{ propertyId, message }` |
| GET | `/api/inquiries/received` | 🔑 | Enquiries on my properties |
| GET | `/api/inquiries/sent` | 🔑 | Enquiries I sent |

**Masters.** Every master has a public list and detail, and admin-only create/update/delete.

| Resource | Public GET | 🛡️ POST / PUT / DELETE body |
|---|---|---|
| `/api/states` | list, `/:id` | `{ name, code }` |
| `/api/cities` | list, `/:id`, `/by-state/:stateId` | `{ name, stateId }` |
| `/api/localities` | list, `/:id`, `/by-city/:cityId` | `{ name, cityId }` |
| `/api/property-types` | list, `/:id` | `{ name }` |
| `/api/amenities` | list, `/:id` | `{ name }` |

Add `?all=true` to a master list to include inactive rows. Updates also accept `isActive`.

**Users:** `/api/users` (full CRUD) is 🛡️ admin only. Normal sign-up uses `/api/auth/register`.

---

## Not done yet / next steps

- Schema-based validation (e.g. Zod) to replace the handwritten checks
- Frontend: Next.js App Router + Tailwind, with SSR/ISR property pages and `generateMetadata` for SEO
- Production items: a shared rate-limit store (Redis) when running more than one server instance; image storage in S3 with a CDN
