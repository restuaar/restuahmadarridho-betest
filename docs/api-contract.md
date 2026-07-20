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

Login menerbitkan dua token dengan cara penyimpanan berbeda:

- **`accessToken`**: masa hidup pendek (default 15m). Dikembalikan di **body** response
  login, lalu dikirim tiap request lewat header **`Authorization: Bearer <accessToken>`**.
- **`refresh_token`**: masa hidup panjang (default 7 hari), bisa dicabut. Disimpan
  sebagai **cookie httpOnly** (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` di
  produksi), dikirim otomatis oleh browser/app.

### Header request (endpoint terproteksi)

| Sumber | Wajib | Keterangan |
|---|---|---|
| `Authorization: Bearer <accessToken>` | ya | Kredensial utama, divalidasi tiap request |
| cookie `refresh_token` | opsional | Dipakai untuk auto-refresh saat access token gagal |

### Auto-refresh

Server memvalidasi header `Authorization: Bearer` lebih dulu. Jika hilang, kedaluwarsa,
atau tidak valid, server memakai cookie `refresh_token`:

- refresh valid: access token baru diterbitkan, dikembalikan lewat header response
  **`x-access-token`**, dan request tetap berjalan normal (client sebaiknya menyimpan
  access token baru itu).
- refresh hilang/tidak valid/dicabut: `401 { code: "UNAUTHORIZED", message: "Not authenticated" }`.

Logout mencabut refresh token di sisi server dan menghapus cookie `refresh_token`.

## Endpoint

### Auth & Health (publik)

#### POST `/api/auth/login`
Request:
```json
{ "userName": "admin", "password": "admin123" }
```
Response `200`, mengembalikan `accessToken` di body dan menyetel cookie `refresh_token`:
```json
{ "success": true, "data": { "accessToken": "<jwt>" } }
```
`401` jika kredensial salah. Efek samping: memperbarui `lastLoginDateTime` akun.

#### POST `/api/auth/refresh`
Mengirim cookie `refresh_token`. Response `200`:
```json
{ "success": true, "data": { "accessToken": "<jwt>" } }
```
`401` jika refresh token tidak valid atau sudah dicabut.

#### POST `/api/auth/logout`
Mengirim cookie `refresh_token`. Mencabutnya dan menghapus cookie. Response `200`:
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

## Contoh alur

```bash
# 1. Login: simpan cookie refresh ke jar, ambil accessToken dari body
curl -c jar.txt -X POST /api/auth/login -H 'Content-Type: application/json' \
  -d '{"userName":"admin","password":"admin123"}'
# -> { "data": { "accessToken": "<jwt>" } }

# 2. Panggil endpoint terproteksi: header Bearer + cookie refresh dari jar
curl -b jar.txt -H "Authorization: Bearer <accessToken>" /api/users

# 3. Saat access token kedaluwarsa, cookie refresh_token dipakai otomatis;
#    access token baru dikembalikan lewat header response x-access-token.

# 4. Logout (mencabut refresh token + menghapus cookie)
curl -b jar.txt -X POST /api/auth/logout
```
