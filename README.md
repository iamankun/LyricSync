# 🎵 LyricSync Studio

> **Công cụ đồng bộ lời nhạc theo từng từ — thời gian thực, trực quan, mạnh mẽ.**  
> Phát triển bởi **An Kun Studio** · v2.0

---

## Giới thiệu

**LyricSync Studio** là một ứng dụng web cho phép bạn đồng bộ lời bài hát với âm thanh theo **từng từ (word-level timing)** theo thời gian thực. Bạn chỉ cần tải nhạc lên, dán lời vào, rồi bấm phím theo nhịp bài hát — ứng dụng sẽ tự động ghi lại mốc thời gian (timestamp) cho từng từ.

Kết quả có thể xuất ra file **JSON** (dành cho web app, player) hoặc **SRT** (phụ đề video tiêu chuẩn).

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|---|---|
| 🎧 **Waveform Player** | Hiển thị sóng âm tương tác với WaveSurfer.js, hỗ trợ kéo để tua |
| ✍️ **Biên tập lời nhạc** | Dán thô hoặc tải file JSON / SRT có sẵn |
| ⚡ **Đồng bộ realtime** | Bấm `Space` để đánh dấu từng từ, `Enter` để xuống dòng kế tiếp |
| 🎚️ **Quick-sync Slider** | Kéo thanh trượt để đồng bộ nhanh nhiều từ cùng lúc khi nhạc đang chạy |
| ↩️ **Hoàn tác (Undo)** | Lùi lại từng từ đã đồng bộ, tự động seek nhạc về đúng thời điểm |
| 🔁 **Reset theo dòng** | Click vào dòng bất kỳ để reset và đồng bộ lại từ đó |
| 📋 **Theo dõi tiến độ** | Panel hiển thị timestamp từng từ đã đồng bộ theo thời gian thực |
| 📤 **Xuất JSON / SRT** | Xuất kết quả cuối cùng với đầy đủ word-level timing |
| 🏷️ **Phân đoạn (Section)** | Hỗ trợ tag `#Verse`, `#Chorus`, `#Bridge`... để phân chia cấu trúc bài |
| 🌙 **Dark UI** | Giao diện tối cao cấp với animation mượt mà (Framer Motion) |

---

## 🔄 Quy trình sử dụng

```
1. Âm thanh  →  2. Lời nhạc  →  3. Đồng bộ  →  4. Xuất bản
```

### Bước 1 — Âm thanh
Tải lên file nhạc (MP3, WAV, M4A, tối đa ~50MB). Waveform sẽ hiển thị ngay sau khi file được xử lý.

### Bước 2 — Lời nhạc
Dán lời bài hát vào textarea (mỗi dòng = một câu hát).  
Dùng tiền tố `#` để đánh dấu đoạn:
```
#Verse
Lời câu 1
Lời câu 2
#Chorus
Lời điệp khúc 1
```
Hoặc tải lên file `.json` / `.srt` có sẵn để tiếp tục chỉnh sửa.

### Bước 3 — Đồng bộ
Nhấn **Cập nhật & Đồng bộ**, play nhạc và sử dụng phím tắt:

| Phím | Hành động |
|---|---|
| `Space` | Đánh dấu từ hiện tại và chuyển sang từ tiếp theo |
| `Enter` | Kết thúc dòng hiện tại, chuyển sang dòng kế tiếp |
| Slider | Kéo để đồng bộ nhanh nhiều từ trong dòng hiện tại |

> ⚠️ Phím tắt **chỉ hoạt động khi nhạc đang phát** và con trỏ không đứng trong ô nhập liệu.

### Bước 4 — Xuất bản
- **JSON** — Xuất đầy đủ dữ liệu `startTime` / `endTime` cho từng từ và từng dòng, phù hợp để tích hợp vào web player, karaoke app.
- **SRT** — Xuất phụ đề theo chuẩn SubRip, tương thích với video editor và các media player.

---

## 🗂️ Cấu trúc dữ liệu

### Định dạng JSON xuất ra

```json
[
  {
    "section": "verse",
    "startTime": 5.12,
    "endTime": 7.84,
    "text": "Hôm nay trời đẹp quá",
    "words": [
      { "text": "Hôm",   "startTime": 5.12, "endTime": 5.50 },
      { "text": "nay",   "startTime": 5.50, "endTime": 5.90 },
      { "text": "trời",  "startTime": 5.90, "endTime": 6.40 },
      { "text": "đẹp",   "startTime": 6.40, "endTime": 7.10 },
      { "text": "quá",   "startTime": 7.10, "endTime": 7.84 }
    ]
  }
]
```

---

## 🛠️ Công nghệ sử dụng

| Thư viện | Mục đích |
|---|---|
| **React 19** | UI framework |
| **Vite 6** | Build tool, dev server |
| **TypeScript 5.8** | Type safety |
| **Tailwind CSS v4** | Styling |
| **WaveSurfer.js 7** | Waveform audio player |
| **Framer Motion (motion)** | Animation |
| **Lucide React** | Icon set |
| **@google/genai** | Gemini AI SDK |

---

## 🚀 Chạy cục bộ (Local Development)

### Yêu cầu
- **Node.js** v18 trở lên

### Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file môi trường
cp .env.example .env.local
```

### Cấu hình môi trường

Chỉnh sửa `.env.local`:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

> Lấy API key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey).

### Khởi chạy

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

### Các lệnh khác

```bash
npm run build    # Build production
npm run preview  # Preview bản build
npm run lint     # Kiểm tra kiểu TypeScript
npm run clean    # Xóa thư mục dist
```

---

## 📁 Cấu trúc dự án

```
LyricSync/
├── src/
│   ├── App.tsx          # Component chính, UI và logic điều hướng
│   ├── useSyncLogic.ts  # Hook xử lý đồng bộ (word-level timing, undo, reset)
│   ├── utils.ts         # Xuất JSON/SRT, parse SRT
│   ├── types.ts         # TypeScript interfaces (Word, LyricLine, SyncIndex)
│   ├── main.tsx         # Entry point React
│   └── index.css        # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

---

## 📄 License

Apache-2.0 © **An Kun Studio**
