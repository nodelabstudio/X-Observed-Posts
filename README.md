# X Observed Posts

A small Node.js utility to fetch and process observed posts from X (formerly Twitter).

**Quick overview:** This project provides a minimal script that uses `playwright`, and `dotenv` to load configuration, parse HTML, and make HTTP requests. It is intended as a lightweight example or starting point for integrations that observe or collect posts from X.

**Features:**

- **Minimal dependencies:** uses `playwright` for HTML parsing, and `dotenv` for configuration.
- **Single-file entry:** runs from `index.js` for easy inspection and adaptation.

## Installation

Prerequisites: Node.js 16+ and npm.

1. Clone the repo:

   git clone https://github.com/angelr1076/X-Observed-Posts.git
   cd X-Observed-Posts

2. Install dependencies:

   npm install

3. Create a `.env` file in the project root and add any required keys. Example variables this project may use:

   X_API_KEY=your_api_key_here
   OBSERVED_ACCOUNT=some_username

Adjust names to match whatever `index.js` expects (check the top of the file for exact env var names).

## Usage

Run the main script directly with Node:

```
node index.js
```

If your project adds npm scripts you can run them via `npm run <script>`.

## Examples

- Basic run (reads `.env`, makes requests):

  ```
  node index.js
  ```

## Development

- Linting / formatting: none included by default. Add your preferred tools if needed.
- Tests: there are no tests yet — consider adding a test runner (Jest, Vitest) and CI when expanding the project.

## Contributing

Contributions are welcome. Open an issue or submit a pull request with a clear description of the change.

## License

This repository uses the ISC license (see `package.json`).
