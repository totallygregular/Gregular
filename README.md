# Mock Exchange

A GitHub Pages-ready paper-trading dashboard that uses real market prices but fake cash balances.

## Publish on GitHub Pages

1. Create a public GitHub repository, for example `mock-exchange`.
2. Upload all files from this folder to the repository root.
3. In GitHub, open **Settings > Pages**.
4. Set **Source** to `Deploy from a branch`.
5. Choose the `main` branch and `/ (root)`.
6. Rename `mock-exchange.html` to `index.html` before publishing, or set up a redirect page.

## Daily update workflow

- Update `data/portfolio.json` with current cash and holdings.
- Append new trades to `data/transactions.json`.
- Append an AI decision record to `data/decisions.json`.
- Append a new object to `data/snapshots/index.json`.
- Add a full daily snapshot file in `data/snapshots/YYYY-MM-DD.json`.

## Suggested autonomous loop

1. Pull current JSON files from GitHub.
2. Get latest market prices from a free data source.
3. Check whether a 14-day deposit is due.
4. Decide BUY, SELL, or HOLD.
5. Update the JSON files.
6. Commit and push.
