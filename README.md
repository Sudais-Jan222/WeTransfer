# FileShare SaaS

A simple self-hosted SaaS-style application that lets registered users upload files and share them via unique public links. Anyone with the link can download the file without needing an account.

## Features

* User registration & login
* Dashboard with file upload capability
* Unique public link for every uploaded file
* Public download page (no login required)
* Built with Node.js, Express, SQLite, and EJS templates

## Getting Started

1. **Install dependencies**

```bash
npm install
```

2. **Start the server**

```bash
npm start
```

3. Open `http://localhost:3000` in your browser.

The first page lets users sign up. After signing up, you will be redirected to the dashboard where you can upload files and get shareable links.

## Project Structure

```
├── index.js          # Main Express server
├── package.json      # Dependencies & scripts
├── uploads/          # Uploaded files (created automatically)
└── views/            # EJS templates for pages
```

## Notes

* For demonstration, session data is stored in memory and file metadata is saved in a local SQLite database file (`data.db`).
* The app uses a hard-coded session secret. Replace it with a secure, environment-specific secret for production.
* Consider storing uploads on a cloud storage service (e.g., AWS S3) if you plan to scale this beyond a demo setup.