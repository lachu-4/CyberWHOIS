# CyberWHOIS Intelligence Deployment Guide

This project is a full-stack application with an Express backend and a React (Vite) frontend.

## Vercel Deployment

To deploy this application to Vercel:

1.  **Push to GitHub**: Ensure your code is pushed to your GitHub repository.
2.  **Import to Vercel**: Connect your GitHub repository to Vercel.
3.  **Configure Environment Variables**:
    *   `WHOIS_API_KEY`: Your WhoisXML API key (e.g., `at_MF9h9xbfsXmFLfDnO91OS97SDk7R4`).
    *   `VITE_SUPABASE_URL`: Your Supabase project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
4.  **Build Settings**:
    *   Framework Preset: `Other` (Vercel should detect the `vercel.json` automatically).
    *   Build Command: `npm run build`.
    *   Output Directory: `dist`.

## Local Development

1.  Install dependencies: `npm install`
2.  Set up `.env` file based on `.env.example`.
3.  Run the dev server: `npm run dev`

## Features

*   **Multi-source WHOIS**: WhoisXML API + RDAP Fallback.
*   **DNS Verification**: Final fallback to verify domain existence via DNS.
*   **Risk Scoring**: Real-time analysis of domain age, registrar, and jurisdiction.
*   **Privacy Aware**: Handles GDPR/Redacted data gracefully.
