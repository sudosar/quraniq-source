=======
# 🕌 QuranIQ

**A Daily Puzzle Challenge to Deepen Your Connection with the Quran.**

QuranIQ is an interactive web-based puzzle game designed to help users engage with the Holy Quran in a fun and meaningful way. Every day, players can test their knowledge through four unique game modes, inspired by popular word and logic games but tailored for Quranic learning.

[**Play QuranIQ Now**](https://sudosar.github.io/quraniq/)

---

## 🎮 Game Modes

### 🔗 Ayah Connections
Find four groups of four related Quranic items (verses, names, concepts). Each group has a specific theme, ranging from manifestations of Divine power to historical figures.

### 🔤 Harf by Harf
Guess the Quranic word in six tries. This mode focuses on vocabulary and spelling of key Arabic terms used in the Quran.

### 🔍 Who Am I?
Identify a Quranic figure or concept based on first-person clues. As you unlock more clues, the challenge decreases, but so does your potential score.

### 🧩 Ayah Scramble
Arrange scrambled words to complete a specific verse. Use English translations as hints to help you piece the message together.

### 🌙 Juz Journey (Ramadan Special)
A special mode coming for Ramadan that takes you through one Juz each day. Explore themes, listen to recitations, and understand the structure of the Quran.

---

## ✨ Features

- **Daily Refresh**: New puzzles every single day to keep your learning consistent.
- **PWA Ready**: Install QuranIQ on your home screen for an app-like experience and offline access.
- **Recitations**: Listen to beautiful recitations from Quran.com/EveryAyah.com.
- **Leaderboards**: Join a group and compete with friends and family in a friendly competition.
- **Deep Study Links**: Every verse solved includes links to Quran.com for further study and reflection.
- **Save Progress**: Generate a save code to move your statistics and streaks between devices.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+).
- **Backend/Storage**: Firebase (Realtime Database & Authentication) for leaderboards and user groups.
- **Hosting**: GitHub Pages.
- **PWA**: Service Workers and Web App Manifest for offline support and installation.
- **Analytics**: Google Analytics 4.

---

## 🚀 Local Development

To run this project locally:

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/sudosar/quraniq.git
    cd quraniq
    ```

2.  **Serve the files**:
    Since this is a static site, you can use any local web server. For example, using Python:
    ```bash
    python3 -m http.server 8000
    ```
    Or using `npx`:
    ```bash
    npx serve .
    ```

3.  **Open in Browser**:
    Navigate to `http://localhost:8000`.

---

## 🤲 Shukr & Credits

This project would not be possible without the generous open-source resources provided by the following:

- **[Quran.com](https://quran.com)**: For the verse text, translations, and word-by-word data.
- **[EveryAyah.com](https://everyayah.com)**: For high-quality Quranic audio recitations.
- **[Google Fonts](https://fonts.google.com)**: Specifically the **Amiri** font for beautiful Arabic typography.
- **Firebase**: For providing the infrastructure to support community leaderboards.

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

---

> *"And We have certainly made the Quran easy for remembrance, so is there any who will remember?"* — Surah Al-Qamar 54:17
>>>>>>> f2ffaa5 (docs: add comprehensive README.md)
