# ⚡ MeterFlow.io

> **🚀 Built a fully responsive Meter Tracking & Tariff Audit App in under an hour using Google AI Studio!**

I wanted to test the actual potential of Google AI Studio (free tier), so I threw some loosely typed prompts at it to build a hobby app. The result? **MeterFlow.io** — and honestly, it turned out so practical that I’ve completely replaced my old setup!

---

### 🌐 [Live App Audits Preview](https://meterflow-888668431957.asia-southeast1.run.app/) | 💻 [GitHub Repository](https://github.com/taimoorimran/meterflow.io)

---

## 📖 The Backstory

I used to track my daily electricity meter readings using an iPhone Shortcut that pushed data to Google Sheets via Google Apps Script. It worked, but it wasn't the most elegant solution—specifically when trying to quickly visualize pacing projections status in physical utility cupboards. 

By utilizing conceptual prompting within AI Studio, **MeterFlow.io** was built and fully operational with a robust React state, Firestore database, and authentication layers in less than 60 minutes.

---

## 🌟 What MeterFlow does better

### 📱 1. Mobile-friendly & Responsive
Designed and styled with an eye-safe, high-contrast, neubrutalist visual aesthetic. Built from the ground up to render flawlessly on mobile views, ensuring comfortable real-time reading updates right at your electric cabinet.

### 🗓️ 2. Smart Billing cycles
Align tracking directly with actual billing patterns! The cycle cutoff adjusts instantly to your utility distribution schedule (defaults to the **13th of each month**). 

### 🛡️ 3. Protected Slab warnings & Pacing tracking
In Pakistan’s domestic electricity structures (NEPRA/Distribution Companies), keeping consumption strictly **under 200 kWh** is crucial to retain the subsidized "Protected Consumer" status slab. Exceeding this limit in a single month spikes base rates by up to 450% and inflates government electricity duties massively. 
MeterFlow includes a built-in **Pacing Projection Engine** that calculates your average daily usage and warns you immediately if your current trajectory is trending unsafe.

### 📊 4. Interactive Tariff playground & Database portability
Evaluate bills, fuel pricing adjustments, and GST surcharges instantly using an inside-dashboard **Tariff Analyzer Tool**. Retain total control over your digital footprint with instant **CSV Export/Import back-ups** or clear database controls.

---

## 🛠️ The Tech Stack

- **Framework:** React 18 with Vite
- **Language:** TypeScript (Strict Type Safety)
- **Styling:** Tailwind CSS (Geometric Neubrutalist Control)
- **Database & Authentication:** Firebase Firestore (Real-time Sync) & Google Firebase OAuth 
- **Analytics Visualization:** Recharts (High-fidelity Area & Bar charting metrics)
- **Animations:** Dynamic micro-interactions powered by `motion/react`

---

## 🚀 Run locally

### 1. Clone the project
```bash
git clone https://github.com/taimoorimran/meterflow.io.git
cd meterflow.io
```

### 2. Configure environment variables
Create a `.env` file in the root directory and fill in your Firebase configurations:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install packages & run dev server
```bash
npm install
npm run dev
```

The applet compiles natively on Port `3000`.

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

*It’s crazy what you can build in less than 60 minutes with just conceptual prompting and AI.* I'd love to hear your thoughts, feedback, or stories on how you track your own utility bills!
