# 🪙 Finora - Real-time Wealth Hub & Finance Tracker

Finora adalah aplikasi pencatat dan pelacak keuangan pribadi modern berbasis **SvelteKit** (Frontend) dan **Express + Socket.IO + SQLite** (Backend) dengan sinkronisasi data real-time antar perangkat.

---

## 📋 Prasyarat

Pastikan perangkat Anda sudah terpasang:
- **Node.js** (versi 18 ke atas disarankan)
- **npm** (biasanya otomatis terpasang bersama Node.js)

---

## 🚀 Cara Menjalankan Aplikasi

Terdapat 2 opsi untuk menjalankan aplikasi Finora:

### 🌟 Opsi 1: Mode Pengembangan (Development / Rekomendasi)
Mode ini menggunakan hot-reload (HMR) dari Vite sehingga setiap perubahan kode akan langsung terlihat di browser tanpa reload manual.

Buka **2 terminal terpisah**:

#### Terminal 1: Backend Server (API & Realtime WebSocket)
```powershell
cd server
npm install
npm run dev
```
*Server akan berjalan di:* `http://localhost:3001`  
*(Menggunakan SQLite di `server/finora.db`)*

#### Terminal 2: Frontend SvelteKit
```powershell
cd finora-svelte
npm install
npm run dev
```
*Frontend akan berjalan di:* `http://localhost:5173`

> 💡 **Catatan:** Frontend di port `5173` secara otomatis mendeteksi dan terhubung ke backend server di port `3001`.

---

### 📦 Opsi 2: Mode Single-Server (Fullstack Production)
Mode ini menggabungkan Frontend dan Backend menjadi satu port di `http://localhost:3001`.

Dari root folder project:
```powershell
# 1. Build frontend SvelteKit
npm run build

# 2. Jalankan server backend yang sekaligus melayani frontend
npm start
```

Atau langkah manualnya:
```powershell
cd finora-svelte
npm run build
cd ../server
node server.js
```
Buka browser dan akses: `http://localhost:3001`

---

## 📱 Mengakses dari HP / Perangkat Lain (Satu Jaringan WiFi)

1. Pastikan laptop/PC dan HP terhubung ke jaringan Wi-Fi yang sama.
2. Cari tahu IP lokal laptop Anda:
   - Buka Terminal / PowerShell, ketik: `ipconfig`
   - Lihat bagian **IPv4 Address** (contoh: `192.168.1.15`).
3. Jalankan aplikasi menggunakan salah satu opsi di atas.
4. Buka browser di HP Anda lalu kunjungi:
   - Mode Dev: `http://192.168.1.15:5173`
   - Mode Single-Server: `http://192.168.1.15:3001`

---

## 🤖 Fitur Opsional: Telegram Bot Parser

Jika ingin mencatat pengeluaran melalui bot Telegram secara instan:
1. Masuk ke folder `server`:
   ```powershell
   cd server
   pip install python-telegram-bot
   ```
2. Isi token Bot Telegram Anda di [telegram_bot.py](file:///c:/Users/andri.hermawan/.gemini/antigravity-ide/scratch/finance-tracker/server/telegram_bot.py).
3. Jalankan bot:
   ```powershell
   python telegram_bot.py
   ```

---

## 🛠️ Struktur Proyek

```
finance-tracker/
├── finora-svelte/         # Frontend SvelteKit (UI Modern, PWA, Komponen)
│   ├── src/
│   │   ├── lib/          # State stores, socket client, komponen UI
│   │   └── routes/       # Halaman utama aplikasi
│   └── package.json
├── server/                # Backend Node.js
│   ├── database.js       # SQLite helper & queries
│   ├── finora.db         # Database SQLite lokal
│   ├── server.js         # Express + Socket.IO server
│   ├── telegram_bot.py   # Bot parser Telegram (opsional)
│   └── package.json
├── package.json           # Root package script (build & start)
└── README.md              # Dokumentasi & panduan
```
