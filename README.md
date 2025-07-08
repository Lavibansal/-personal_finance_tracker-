# My Buddy – Personal Finance Tracker

**My Buddy** is a modern, user-friendly web application designed to help individuals and families manage their finances with ease. Track your expenses, incomes, loans, and shared bills, all in one place. Built with React and Firebase, My Buddy offers real-time updates, secure authentication, and a beautiful analytics dashboard.

---

## 🚀 Features

- **User Authentication**: Sign up and log in securely using email/password or Google.
- **Expense Tracker**: Add, edit, and delete personal and shared expenses. See category-wise breakdowns and analytics.
- **Income Management**: Track all your income sources and view your total income at a glance.
- **Loan Tracker**: Manage borrowed and lent money, set due dates, and mark loans as paid.
- **Bill Splitter**: Easily split bills with family or friends, and track your own share in your expenses.
- **Financial Analytics**: Visualize your balance over time, see spending trends, and export/import transactions as CSV.
- **Real-Time Updates**: All data updates instantly thanks to Firebase's real-time database.
- **Responsive UI**: Clean, modern interface that works great on desktop and mobile.

---

![IMG20250708202806](https://github.com/user-attachments/assets/93de479b-c703-4c61-b4d9-78795f46328f)


- **Login & Signup**
  - Simple, clean forms for secure authentication (email/password or Google).
![IMG20250708203112](https://github.com/user-attachments/assets/bb030022-cd0b-4618-8e95-7ba8c17e9570)

- **Dashboard Overview**
  - See your current balance, total income, and total expenses at a glance.
  - Financial analytics chart shows your balance trend over time.


- **Expense Tracker**
  - Add, view, and categorize expenses. Shared expenses show participant breakdowns.
  - ![IMG20250708203138](https://github.com/user-attachments/assets/e1a06a51-19bf-4d92-b000-59b00be7c297)

- **Loan Tracker**
  - Track borrowed/lent money, due dates, and mark loans as paid.

![IMG20250708203147](https://github.com/user-attachments/assets/9752c1e5-963f-4010-ac76-54cc3772af5c)

- **Transactions Table**
  - View all your transactions, filter/search, and export/import as CSV.

![IMG20250708203129](https://github.com/user-attachments/assets/344515f6-a420-44b2-a63e-a58cd4bd0ce5)

- **Bill Splitter**
  - Split bills with family/friends, and your share is automatically tracked in your expenses.

> _Screenshots show the modern blue-themed UI, summary cards, analytics charts, and detailed tables for transactions and loans._

---

## 🛠️ Tech Stack
- **Frontend:** React, Ant Design, CSS
- **Backend/Database:** Firebase (Firestore, Auth)
- **Deployment:** Vercel (recommended), Netlify, or Firebase Hosting

---

## ⚡ Getting Started

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd my-app
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Firebase:**
   - Add your Firebase config in `src/Firebase.js`.
   - Make sure your Firebase project has Authentication and Firestore enabled.
4. **Run locally:**
   ```bash
   npm start
   ```
5. **Build for production:**
   ```bash
   npm run build
   ```
6. **Deploy:**
   - **Vercel:** Connect your repo at [vercel.com](https://vercel.com/), set build command to `npm run build` and output directory to `build`.
   - **Netlify:** Similar steps, or use `netlify deploy` CLI.
   - **Firebase Hosting:**
     ```bash
     npm install -g firebase-tools
     firebase login
     firebase init hosting
     npm run build
     firebase deploy
     ```

---

## 📧 Contact & Credits
- **Developer:** Lavi Bansal
- **Email:** bansallavi@37gmail.com
- **UI/UX:** Inspired by modern finance dashboards

---

**My Buddy** makes personal and family finance management simple, collaborative, and insightful. Try it out and take control of your money today!
