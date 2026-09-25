# Setup guide

How to run this project on a new PC, what sample data you get, and how to manage admin (site owner) accounts.

---

## 1. Install these first

| Tool | Version | Why |
|---|---|---|
| Git | any | to download the code |
| Node.js | **20.9 or newer** | runs the backend and the Next.js frontend |
| PostgreSQL | 14 or newer | the database (remember the password you set during install) |

Optional: pgAdmin (comes with PostgreSQL) to look at the tables and run SQL.

---

## 2. Download the code

```bash
git clone https://github.com/Levihtkaslev/realestate.git
cd realestate
```

The project has two folders:

| Folder | What it is | Runs on |
|---|---|---|
| `backend/` | Node + Express + Prisma API | http://localhost:5000 |
| `frontend/` | Next.js website | http://localhost:3000 |

---

## 3. Backend (terminal 1)

```bash
cd backend
npm install
copy .env.example .env        # Git Bash / Mac / Linux: cp .env.example .env
```

Open `backend/.env` and fill in:

| Key | What to put |
|---|---|
| `PORT` | `5000` (leave as is) |
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/realestate` — your PostgreSQL password and port. If the password has `@`, write it as `%40` (e.g. `pass@123` → `pass%40123`) |
| `JWT_ACCESS_SECRET` | any long random text. Make one with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — the server will not start without it |
| `FRONTEND_URL` | `http://localhost:3000` (leave as is) |

Then create the database and start the server:

```bash
npx prisma migrate dev        # creates the "realestate" database and all tables
npx prisma generate           # creates the Prisma client code
npx prisma db seed            # basic data (see section 5)
npm run seed:properties       # optional: 50,000 test properties (see section 5)
npm run dev                   # starts the API on http://localhost:5000
```

Check it works: open http://localhost:5000/api-docs (Swagger API documentation).

---

## 4. Frontend (terminal 2)

```bash
cd frontend
npm install
copy .env.example .env.local  # Git Bash / Mac / Linux: cp .env.example .env.local
npm run dev                   # starts the website on http://localhost:3000
```

`.env.local` has one line: `NEXT_PUBLIC_API_URL=http://localhost:5000` (the backend address). Change it only if the backend runs somewhere else.

Always start the **backend first**, otherwise the website shows "Could not load…".

---

## 5. Sample data

The data itself is **not** stored in git (the database lives on each PC). What is stored are two **scripts** that create the same sample data on any PC:

### `npx prisma db seed` (basic data — always run this)

| What | Count |
|---|---|
| States of India | 36 |
| Property types (Apartment, Villa, Plot, Shop …) | 9 |
| Amenities (Parking, Lift, Gym …) | 10 |
| Admin account | 1 — `admin@realestate.local` / `admin123` |

### `npm run seed:properties` (test data — optional)

| What | Count |
|---|---|
| Cities | 5 — Chennai, Coimbatore, Bangalore, Mumbai, Hyderabad |
| Localities | 40 (8 per city) |
| Test owners | 20 — `owner1@seed.local` … `owner20@seed.local`, password `seed12345` |
| Properties (sale + rent) | 50,000 |

Running it again deletes only the test owners' properties and creates fresh ones — your own data is not touched.

**Not included:** properties you added by hand and uploaded photos (`backend/uploads/` is not in git).

---

## 6. Logins

| Who | Email | Password |
|---|---|---|
| Admin (site owner) | `admin@realestate.local` | `admin123` |
| Test owner 1 … 20 | `owner1@seed.local` … `owner20@seed.local` | `seed12345` |
| Normal user | register on the website (`/register`) | your choice |

Change the admin password before putting the site online.

---

## 7. Create another admin (site owner)

For safety nobody can become admin from the website. There are two ways, both done in the database (pgAdmin → `realestate` database → Query Tool, or `psql`).

### Way 1 (easiest): register, then promote

1. Register the person on the website (`/register`).
2. Run:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'newadmin@example.com';
```

3. The person logs out and logs in again (the role is inside the login token).

### Way 2: create the admin directly in SQL

The password must be stored as a bcrypt hash, never as plain text. Make the hash first (run inside the `backend` folder):

```bash
node -e "console.log(require('bcryptjs').hashSync('MyStrongPassword', 10))"
```

Copy the printed text (starts with `$2b$10$...`) and use it here:

```sql
INSERT INTO users (name, email, phone, password_hash, role, updated_at)
VALUES ('Site Owner', 'owner@mysite.com', '9876543210', 'PASTE_HASH_HERE', 'ADMIN', NOW());
```

### Useful queries

```sql
-- list all admins
SELECT id, name, email, role, created_at FROM users WHERE role = 'ADMIN';

-- remove admin rights (back to a normal user)
UPDATE users SET role = 'USER' WHERE email = 'newadmin@example.com';

-- log a user out of every device (deletes their refresh tokens)
DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email = 'newadmin@example.com');
```

---

## 8. Useful commands

| Where | Command | What it does |
|---|---|---|
| backend | `npm run dev` | start the API (restarts on code change) |
| backend | `npm run measure:search` | search speed test on 50,000 rows |
| backend | `npx prisma studio` | open a table viewer in the browser |
| backend | `npm run build` then `npm start` | production run |
| frontend | `npm run dev` | start the website (development) |
| frontend | `npm run build` then `npm start` | production run |

---

## 9. Common problems

| Problem | Fix |
|---|---|
| `P1000: Authentication failed` | wrong password in `DATABASE_URL` (remember `@` → `%40`) |
| `Can't reach database server` | PostgreSQL is not running, or the port is not 5432 |
| Server stops at start: JWT secret missing | set `JWT_ACCESS_SECRET` in `backend/.env` |
| Website shows "Could not load…" | the backend is not running on port 5000 |
| "Too many attempts" on login | login is limited to 10 tries per 15 minutes — restart the backend to reset |
| New admin still sees no Admin menu | log out and log in again |
| Port 3000 or 5000 already in use | close the other program, or change `PORT` / `NEXT_PUBLIC_API_URL` |
