# X Observed Posts

A small Node.js utility that monitors selected X (Twitter) accounts, captures newly published posts, and pushes structured data into a database for review and reuse.

This project is intentionally simple. It’s built to reliably observe posts, extract the parts that matter, and store them somewhere useful.

## What this does

- Visits specific X accounts using Playwright
- Scrapes **recent posts only** (timestamps, text, and post URLs)
- Captures screenshots of posts
- Uploads screenshots to Cloudinary
- Inserts post metadata into the database
- Skips posts that already exist in Quickbase (URL-based dedupe)
- Generates short neutral quote-post drafts for later manual use

This currently runs **logged out of X** and still pulls recent posts successfully.

## Setup

### Requirements

- Node.js 18+
- npm
- A Quickbase table with the expected fields
- A Cloudinary account

### Install

```
npm install
```

### Environment variables

Create a `.env` file in the project root:

```
X_HANDLES=handle1,handle2,handle3
QB_REALM=yourrealm
QB_TABLE_ID=yourtableid
QB_TOKEN=yourtoken

CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

`X_HANDLES` should be a comma-separated list of X usernames **without** the `@`.

## Running the script

```
npm run start
```

You’ll see console output showing:

- Which accounts are being scanned
- Whether the session is logged in or logged out
- What posts were scraped
- Which posts were inserted or skipped

## Authentication notes

This project currently runs without logging into X.

Earlier experiments with Playwright login, browser profiles, and cookie injection are intentionally **not part of the active flow** anymore. Logged-out access is sufficient for recent posts and keeps the setup deployable (Railway-friendly).

If X tightens access in the future, cookie-based auth can be reintroduced as a fallback, but it’s not required right now.

## Project structure

- `index.js` — main scraper + Quickbase + Cloudinary logic
- `start.js` — bootstrap helper
- `screenshots/` — temporary local screenshots (deleted after upload)

## My intent

The intent is to build a lightweight “inbox” of interesting posts from accounts worth watching, so they can be reviewed, quoted, or expanded on later without constantly living inside the X timeline.
