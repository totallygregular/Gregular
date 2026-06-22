"""Fetch latest USD prices for the tickers in data/portfolio.json via Stooq.

Stooq returns CSV like: symbol,date,time,open,high,low,close,volume
For US tickers we use the `.us` suffix, e.g. voo.us, qqq.us.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

STOOQ_URL = "https://stooq.com/q/l/"


def _ticker_for_stooq(ticker: str) -> str:
    t = ticker.strip().lower()
    return t if t.endswith(".us") else f"{t}.us"


def fetch_prices(tickers: list[str], timeout: int = 20) -> dict[str, float]:
    """Return a dict of ticker (uppercase, no suffix) -> last close price in USD."""
    if not tickers:
        return {}
    params = urllib.parse.urlencode({"s": ",".join(_ticker_for_stooq(t) for t in tickers), "f": "sd2t2ohlcv", "h": "", "e": "csv"})
    url = f"{STOOQ_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "mock-exchange-bot/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    out: dict[str, float] = {}
    for row in reader:
        sym = (row.get("Symbol") or "").strip().lower()
        close = (row.get("Close") or "").strip()
        if not sym or not close or close == "-":
            continue
        try:
            out[sym.split(".")[0].upper()] = float(close)
        except ValueError:
            continue
    return out


def main() -> int:
    portfolio_path = Path("data/portfolio.json")
    if not portfolio_path.exists():
        print("data/portfolio.json not found", file=sys.stderr)
        return 1
    portfolio = json.loads(portfolio_path.read_text())
    tickers = sorted({h["ticker"].upper() for h in portfolio.get("holdings", [])})
    if not tickers:
        print("No holdings to update.")
        return 0
    prices = fetch_prices(tickers)
    print(json.dumps({"requested": tickers, "fetched": prices}, indent=2))
    missing = [t for t in tickers if t not in prices]
    if missing:
        print(f"Missing prices for: {missing}", file=sys.stderr)
    return 0 if not missing else 2


if __name__ == "__main__":
    raise SystemExit(main())
