# ms-restuahmadarridho-betest

Microservice manajemen user: operasi CRUD untuk **User Info** dan **Account Login**
yang diproteksi autentikasi, dengan penyimpanan **MongoDB** dan lapisan cache **Redis**
(strategi cache-aside).

**Live:** https://restuahmadarridho-betest.onrender.com (health: `/api/health`). Akun awal: `admin` / `admin123`.

Dibangun dengan **Node.js + Express + TypeScript**. Arsitektur berlapis (Routes,
Controller, Service, Repository, Model) ditulis sebagai fungsi biasa per modul, dengan
satu global exception filter, serta unit test dan integration test (Jest).

## Tech Stack

| Bagian | Pilihan |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Bahasa | TypeScript 5 |
| Database | MongoDB (Mongoose 8) |
| Cache | Redis (ioredis), cache-aside |
| Auth | JWT (jsonwebtoken) + bcrypt, disimpan di cookie httpOnly |
| Validasi | Zod |
| ID | UUIDv7 (terurut waktu) |
| Test | Jest + ts-jest + mongodb-memory-server + supertest |
| Package manager | pnpm |

## Menjalankan (lokal)

Prasyarat: Node 20+, pnpm, Docker (untuk MongoDB dan Redis).

```bash
# 1. Jalankan MongoDB + Redis
docker compose up -d

# 2. Siapkan environment
cp .env.example .env

# 3. Install dependency
pnpm install

# 4. Seed akun admin awal (lihat catatan di bawah)
pnpm seed

# 5. Jalankan mode dev (hot reload)
pnpm dev

# 6. Jalankan test
pnpm test          # atau: pnpm test:coverage

# 7. Build + jalankan bundle produksi
pnpm build && pnpm start
```

Health check: `GET http://localhost:3000/api/health`.

### Seed akun pertama

Semua endpoint tulis diproteksi dan butuh token, sedangkan token butuh akun yang sudah
ada. Karena itu akun pertama tidak bisa dibuat lewat API. `pnpm seed` membuatkannya
(idempotent):

| userName | password | role |
|---|---|---|
| `admin` | `admin123` | admin |

Login dengan akun ini untuk mendapatkan cookie autentikasi, lalu buat user/akun lain
lewat API.

### Variabel environment

| Var | Contoh | Keterangan |
|---|---|---|
| `NODE_ENV` | `development` | `production` menyembunyikan pesan error 500 |
| `PORT` | `3000` | Port HTTP |
| `MONGO_URI` | `mongodb://localhost:27017/db_restuahmadarridho_betest` | Koneksi MongoDB |
| `REDIS_URL` | `redis://localhost:6379` | Koneksi Redis |
| `JWT_SECRET` | `change_me_access_secret` | Secret HMAC untuk access token |
| `JWT_EXPIRES_IN` | `15m` | Masa hidup access token |
| `JWT_REFRESH_SECRET` | `change_me_refresh_secret` | Secret HMAC untuk refresh token |
| `JWT_REFRESH_TTL` | `604800` | Masa hidup refresh token + TTL Redis (detik) |
| `CACHE_TTL` | `300` | TTL cache (detik) |

## Database: Koleksi, Constraint, dan Index

Business key (`userId`, `accountId`) berupa string **UUIDv7 yang dibuat di sisi server**
saat create. `password` di-hash bcrypt dan tidak pernah dikembalikan di response mana pun.

### Koleksi `user_info`

| Field | Tipe | Constraint |
|---|---|---|
| `userId` | String | wajib, **unik**, UUIDv7 |
| `fullName` | String | wajib |
| `accountNumber` | String | wajib, **unik** |
| `emailAddress` | String | wajib, **unik**, format email |
| `registrationNumber` | String | wajib, **unik** |
| `role` | String | wajib, enum `admin` atau `user` |
| `createdAt` / `updatedAt` | Date | otomatis |

Index:

| Key | Tipe | Tujuan |
|---|---|---|
| `userId` | unik | lookup detail + cegah duplikat |
| `accountNumber` | unik | required read + integritas |
| `registrationNumber` | unik | required read + integritas |
| `emailAddress` | unik | cegah email ganda |
| `role` | non-unik | filter list |
| `fullName` | non-unik (collation case-insensitive) | filter nama |

### Koleksi `account_login`

| Field | Tipe | Constraint |
|---|---|---|
| `accountId` | String | wajib, **unik**, UUIDv7 |
| `userName` | String | wajib, **unik** |
| `password` | String | wajib, hash bcrypt (tidak dikembalikan) |
| `lastLoginDateTime` | Date | default `null` |
| `userId` | String | wajib, **unik**, referensi ke `user_info.userId` (1:1) |
| `createdAt` / `updatedAt` | Date | otomatis |

Index:

| Key | Tipe | Tujuan |
|---|---|---|
| `accountId` | unik | lookup detail |
| `userName` | unik | login cepat + cegah duplikat |
| `userId` | unik | jaga relasi 1:1 dengan user_info |
| `lastLoginDateTime` | non-unik | query "stale lebih dari N hari" |

## Autentikasi

Login menerbitkan **access token** (masa hidup pendek) dan **refresh token** (masa hidup
panjang dan bisa dicabut) yang dikirim sebagai **cookie httpOnly** (`access_token`,
`refresh_token`). Client cukup mengirim request dengan credentials, cookie ikut otomatis.

1. Login (cookie disimpan ke jar):

```bash
curl -c jar.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userName":"admin","password":"admin123"}'
# hasil: { "success": true, "data": { "loggedIn": true } } beserta Set-Cookie
```

2. Panggil endpoint terproteksi, cookie terkirim otomatis:

```bash
curl -b jar.txt http://localhost:3000/api/users
```

3. Auto-refresh: saat `access_token` kedaluwarsa, cookie `refresh_token` dipakai
   otomatis. Request tetap berhasil dan cookie `access_token` baru dikembalikan lewat
   `Set-Cookie`.

4. Logout mencabut refresh token dan menghapus kedua cookie: `POST /api/auth/logout`.

Semua route selain `/api/auth/*` dan `GET /api/health` divalidasi pada tiap request.
Detail lengkap ada di [docs/api-contract.md](docs/api-contract.md).

## Format Response

Sukses: `{ "success": true, "data": <payload>, "meta": <pagination opsional> }`
Error: `{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": <opsional> } }`

Kode error: `BAD_REQUEST` (400), `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401),
`FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500).

## Referensi API (15 endpoint)

Kontrak lengkap beserta contoh request/response: [docs/api-contract.md](docs/api-contract.md).

### Auth & Health
| Method | Path | Auth | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | publik | Body `{ userName, password }`, set cookie `access_token` + `refresh_token`, update `lastLoginDateTime` |
| POST | `/api/auth/refresh` | cookie refresh | Set ulang cookie `access_token` |
| POST | `/api/auth/logout` | cookie refresh | Cabut refresh token + hapus cookie |
| GET | `/api/health` | publik | `{ status, mongo, redis }` |

### Users, `/api/users`
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/users` | List. Query: `fullName`, `role`, `emailAddress`, `accountNumber`, `registrationNumber`, `userId`, `sort`, `order` (asc/desc), `page`, `limit` |
| GET | `/api/users/:userId` | Detail berdasarkan userId (cache) |
| POST | `/api/users` | Create `{ fullName, accountNumber, emailAddress, registrationNumber, role }` |
| PATCH | `/api/users/:userId` | Update sebagian |
| DELETE | `/api/users/:userId` | Hapus |

Required read: `GET /api/users?accountNumber=A100` dan
`GET /api/users?registrationNumber=R100` (key unik, hasil tunggal, lewat cache).

### Accounts, `/api/accounts`
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/accounts` | List. Query: `userName`, `userId`, `accountId`, `inactiveDays`, `sort`, `order`, `page`, `limit` |
| GET | `/api/accounts/stale?days=3` | Akun dengan `lastLoginDateTime` lebih lama dari `days` (default 3) |
| GET | `/api/accounts/:accountId` | Detail berdasarkan accountId (cache) |
| POST | `/api/accounts` | Create `{ userName, password, userId }` (password di-hash) |
| PATCH | `/api/accounts/:accountId` | Update sebagian (hash ulang password jika berubah) |
| DELETE | `/api/accounts/:accountId` | Hapus |

"Stale" tersedia dua bentuk: route khusus `GET /api/accounts/stale?days=N` dan filter
list `GET /api/accounts?inactiveDays=N`.

## Cache (Redis, cache-aside)

- Key item tunggal: `user:id:<userId>`, `user:acct:<accountNumber>`,
  `user:reg:<registrationNumber>`, `account:id:<accountId>`.
- Key list: `user:list:g<gen>:<paramHash>`, `account:list:g<gen>:<paramHash>`, di-hash
  dari parameter query yang sudah dinormalisasi.
- Invalidasi list memakai counter generasi per koleksi (`user:list:gen`,
  `account:list:gen`): setiap operasi tulis melakukan `INCR`, sehingga semua cache list
  lama otomatis tidak valid dalam O(1).

Refresh token juga disimpan di Redis (`refresh:<jti>`) agar bisa dicabut saat logout.

## Testing

```bash
pnpm test            # jalankan suite
pnpm test:coverage   # jalankan dengan laporan coverage (threshold dipaksa)
```

Unit test mencakup service (repository dan cache di-mock), middleware JWT, global error
filter, validasi, model, dan util. Integration test menjalankan seluruh endpoint lewat
`supertest` di atas MongoDB in-memory (`mongodb-memory-server`) dengan Redis palsu.

Coverage dipaksa minimal **95% statement/function/line dan 90% branch** (saat ini sekitar
98% statement/line, 92% branch).

## Deployment (Render)

1. Push repo ini ke Git (`restuahmadarridho-betest`).
2. Buat cluster gratis **MongoDB Atlas**, ambil connection string.
3. Sediakan instance **Redis** terkelola, ambil URL-nya.
4. Di **Render**, buat Web Service dari repo ini (runtime Docker, `render.yaml` sudah
   disertakan). Set env: `MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
   (`JWT_EXPIRES_IN`, `JWT_REFRESH_TTL`, `CACHE_TTL` opsional).
5. Deploy dan verifikasi `GET /<url-render>/api/health`.

URL live: https://restuahmadarridho-betest.onrender.com

## Struktur Proyek

```
src/
  types/         seluruh type + interface bersama
  config/        pemuatan + validasi env
  db/            singleton mongo + redis
  exceptions/    AppException + subclass bertipe
  middlewares/   jwt-auth, global error filter, validasi request
  cache/         fungsi cache-aside di atas singleton Redis
  utils/         hashing password, param hashing, cookie, helper response
  models/        user.ts, account.ts (schema mongoose)
  repositories/  fungsi akses data
  services/      fungsi logika bisnis (termasuk token.service: access + refresh)
  controllers/   fungsi handler express
  routes/        router auth / health / user / account + index
  validation/    schema zod
  seed.ts        bootstrap admin awal (pnpm seed)
  server.ts      merakit express app + entrypoint bootstrap
test/            unit test + integration test
```

Postman collection untuk mencoba semua endpoint: [docs/postman-collection.json](docs/postman-collection.json).
