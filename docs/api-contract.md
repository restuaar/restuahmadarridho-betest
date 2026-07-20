# Kontrak API, ms-restuahmadarridho-betest

Live: `https://restuahmadarridho-betest.onrender.com`
Base URL: `/api` · Content-Type: `application/json`

## Format response

Sukses:
```json
{ "success": true, "data": <payload>, "meta": <pagination opsional> }
```

Error:
```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": <opsional> } }
```

Pemetaan kode error ke HTTP: `BAD_REQUEST`/`VALIDATION_ERROR` 400, `UNAUTHORIZED` 401,
`FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `INTERNAL_ERROR` 500.

## Autentikasi

Login menerbitkan dua token yang dikirim sebagai **cookie httpOnly** (client tidak
pernah menangani token di JavaScript, browser atau app mengirimnya otomatis):

- Cookie **`access_token`**: masa hidup pendek (default 15m).
- Cookie **`refresh_token`**: masa hidup panjang (default 7 hari), bisa dicabut.

Kedua cookie bersifat `HttpOnly`, `SameSite=Lax`, `Path=/`, dan `Secure` di produksi.
Kirim request dengan credentials agar cookie ikut terlampir (misal `fetch(url, {
credentials: 'include' })`, atau memakai cookie jar).

### Auto-refresh

Untuk setiap endpoint terproteksi, server memvalidasi cookie `access_token` lebih dulu.
Jika hilang, kedaluwarsa, atau tidak valid, server memakai cookie `refresh_token`:

- refresh valid: access token baru diterbitkan, di-set ulang sebagai cookie
  `access_token` (lewat `Set-Cookie`), dan request tetap berjalan normal (Anda tetap
  mendapat response asli).
- refresh hilang/tidak valid/dicabut: `401 { code: "UNAUTHORIZED", message: "Not authenticated" }`.

### Cookie

| Cookie | Di-set oleh | Keterangan |
|---|---|---|
| `access_token` | login, refresh, auto-refresh | Kredensial utama |
| `refresh_token` | login | Dipakai untuk auto-refresh, refresh, dan logout |

Logout menghapus kedua cookie dan mencabut refresh token di sisi server.

## Endpoint

### Auth & Health (publik)

#### POST `/api/auth/login`
Request:
```json
{ "userName": "admin", "password": "admin123" }
```
Response `200`, menyetel cookie `access_token` + `refresh_token`:
```json
{ "success": true, "data": { "loggedIn": true } }
```
`401` jika kredensial salah. Efek samping: memperbarui `lastLoginDateTime` akun.

#### POST `/api/auth/refresh`
Mengirim cookie `refresh_token`. Menyetel ulang cookie `access_token`. Response `200`:
```json
{ "success": true, "data": { "refreshed": true } }
```
`401` jika refresh token tidak valid atau sudah dicabut.

#### POST `/api/auth/logout`
Mengirim cookie `refresh_token`. Mencabutnya dan menghapus kedua cookie. Response `200`:
```json
{ "success": true, "data": { "loggedOut": true } }
```

#### GET `/api/health`
Response `200`:
```json
{ "success": true, "data": { "status": "ok", "mongo": "up", "redis": "up" } }
```

### Users, `/api/users` (terproteksi)

#### GET `/api/users`
Query (semua opsional): `fullName`, `role` (`admin` atau `user`), `emailAddress`,
`accountNumber`, `registrationNumber`, `userId`, `sort`, `order` (`asc` atau `desc`),
`page` (default 1), `limit` (default 10, maks 100).

Response `200`:
```json
{
  "success": true,
  "data": [ { "userId": "...", "fullName": "...", "accountNumber": "...", "emailAddress": "...", "registrationNumber": "...", "role": "user", "createdAt": "...", "updatedAt": "..." } ],
  "meta": { "page": 1, "limit": 10, "total": 1 }
}
```
`GET /api/users?accountNumber=A100` dan `?registrationNumber=R100` mengembalikan user
tunggal yang cocok (key unik, dilayani dari cache).

#### GET `/api/users/:userId`
Response `200` berisi satu user. `404` jika tidak ditemukan.

#### POST `/api/users`
Request:
```json
{ "fullName": "Alice", "accountNumber": "A100", "emailAddress": "alice@example.com", "registrationNumber": "R100", "role": "user" }
```
Response `201` berisi user yang dibuat (server membuat `userId`, UUIDv7). `409` jika ada
field unik yang duplikat, `400` jika validasi gagal.

#### PATCH `/api/users/:userId`
Update sebagian, bebas subset dari field create. Response `200` berisi user terbaru.
`404` jika tidak ditemukan.

#### DELETE `/api/users/:userId`
Response `200`:
```json
{ "success": true, "data": { "deleted": true } }
```
`404` jika tidak ditemukan.

### Accounts, `/api/accounts` (terproteksi)

#### GET `/api/accounts`
Query: `userName`, `userId`, `accountId`, `inactiveDays` (N berarti last login lebih
lama dari N hari), `sort`, `order`, `page`, `limit`. Response `200` dengan pagination
`meta`. `password` tidak pernah disertakan.

#### GET `/api/accounts/stale`
Query: `days` (default 3). Mengembalikan akun yang `lastLoginDateTime`-nya lebih lama
dari `days`. Response `200` berisi array.

#### GET `/api/accounts/:accountId`
Response `200` berisi satu akun (tanpa password). `404` jika tidak ditemukan.

#### POST `/api/accounts`
Request:
```json
{ "userName": "alice", "password": "alicepass", "userId": "<userId yang sudah ada>" }
```
Response `201` berisi akun yang dibuat (server membuat `accountId`, UUIDv7; password
di-hash dan tidak disertakan di response). `409` jika duplikat, `400` jika validasi gagal.

#### PATCH `/api/accounts/:accountId`
Request (bebas subset): `{ "userName": "...", "password": "..." }`. Password di-hash ulang
jika ada. Response `200` berisi akun terbaru. `404` jika tidak ditemukan.

#### DELETE `/api/accounts/:accountId`
Response `200` berisi `{ "deleted": true }`. `404` jika tidak ditemukan.

## Contoh alur (cookie jar)

```bash
# 1. Login, cookie disimpan ke jar
curl -c jar.txt -X POST /api/auth/login -H 'Content-Type: application/json' \
  -d '{"userName":"admin","password":"admin123"}'

# 2. Panggil endpoint terproteksi, cookie dikirim dari jar
curl -b jar.txt /api/users

# 3. Saat access token kedaluwarsa, cookie refresh_token dipakai otomatis.
#    Response tetap normal dan cookie access_token baru dikembalikan lewat Set-Cookie.

# 4. Logout (mencabut refresh token + menghapus cookie)
curl -b jar.txt -X POST /api/auth/logout
```
