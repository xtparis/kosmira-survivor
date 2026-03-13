# ⚽ Α.Ο. ΚΟΣΜΗΡΑΣ — Survival Tracker

Εφαρμογή παρακολούθησης πορείας για σωτηρία από τον υποβιβασμό.

---

## 🚀 Στήσιμο (μία φορά)

### Απαιτήσεις
- [Node.js](https://nodejs.org/) v18+
- Λογαριασμός στο [GitHub](https://github.com)

### 1. Εγκατάσταση dependencies

```bash
npm install
```

### 2. Δοκιμή τοπικά

```bash
npm run dev
```

Άνοιξε το http://localhost:5173 στο browser.

### 3. Δημιουργία GitHub Repository

1. Πήγαινε στο https://github.com/new
2. Δώσε όνομα: `kosmiras-tracker`
3. Άφησε το Public
4. **ΜΗΝ** προσθέσεις README (θα το κάνεις push εσύ)
5. Κάνε κλικ "Create repository"

### 4. Σύνδεση με GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ΤΟ_USERNAME_ΣΟΥ/kosmiras-tracker.git
git push -u origin main
```

> ⚠️ Άλλαξε `ΤΟ_USERNAME_ΣΟΥ` με το πραγματικό σου GitHub username.

### 5. Πρώτο Deploy

```bash
npm run deploy
```

Το site θα είναι διαθέσιμο σε λίγα λεπτά στο:
`https://ΤΟ_USERNAME_ΣΟΥ.github.io/kosmiras-tracker/`

---

## 🔄 Ενημέρωση μετά από κάθε αγωνιστική

### Βήμα 1: Άνοιξε το `src/data.json`

Αυτό είναι το μόνο αρχείο που αγγίζεις κάθε φορά.

### Βήμα 2: Ενημέρωσε τα δεδομένα

**Βαθμολογία** — Για κάθε ομάδα που αγωνίστηκε:
```json
{ "name": "Α.Ο.ΚΟΣΜΗΡΑΣ", "points": 11, "played": 16, "wins": 2, "draws": 5, "losses": 9, "gf": 17, "ga": 33 }
```

**Επόμενος αγώνας** — Αλλαγή opponent/date/time:
```json
"nextMatch": {
  "opponent": "Α.Ε.ΠΛΑΤΑΝΙΑΣ",
  "date": "Σάββατο 21/03/2026",
  "time": "17:00"
}
```

### Βήμα 3: Deploy

```bash
npm run deploy
```

Αυτό κάνει build και ανεβάζει αυτόματα στο GitHub Pages. Τελειώσατε!

---

## 📐 Πώς λειτουργούν τα σενάρια

| Σενάριο | Λογική |
|---------|--------|
| **📊 Κύριο Σενάριο** | Κάθε ομάδα συνεχίζει με τον ίδιο ρυθμό (βαθμοί ÷ αγώνες × υπόλοιποι αγώνες) |
| **🔴 Χειρότερο** | Η ομάδα ακριβώς πάνω μας κερδίζει ΟΛΑ τα υπόλοιπα |
| **🔵 Καλύτερο** | Η ομάδα ακριβώς πάνω μας δεν κερδίζει ξανά |

---

## 🗂 Δομή αρχείων

```
kosmiras-tracker/
├── src/
│   ├── App.jsx        ← UI components
│   ├── App.css        ← Styles
│   ├── calc.js        ← Υπολογισμός σεναρίων
│   ├── data.json      ← ΤΑ ΔΕΔΟΜΕΝΑ (μόνο αυτό ενημερώνεις)
│   ├── main.jsx       ← Entry point
│   └── index.css      ← Global styles
├── index.html
├── vite.config.js     ← Αλλαγή base αν αλλάξεις όνομα repo
└── package.json
```

---

## ⚙️ Αλλαγή ονόματος repository

Αν το repo σου έχει διαφορετικό όνομα από `kosmiras-tracker`, άλλαξε το `vite.config.js`:

```js
base: '/το-ονομα-του-repo-σου/',
```
