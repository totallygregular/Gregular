"""Daily updater for the Mock Exchange GitHub Pages site.

What it does, in order:
  1. Read data/meta.json, data/portfolio.json, data/transactions.json, data/decisions.json,
     data/snapshots/index.json, data/fx/latest.json, data/fx/history.json.
  2. Fetch the latest USD->NZD rate from open.er-api.com and write data/fx/latest.json
     and append a row to data/fx/history.json (de-duplicated by date).
  3. For every ticker in data/portfolio.json, fetch the latest close price from Stooq
     and update last_price_usd. Holdings with a missing price are left untouched.
  4. Auto-deposit: if the most recent DEPOSIT transaction is >= 14 days old (UTC),
     add NZD 500 to cash_nzd, append a DEPOSIT transaction, bump total_deposited_nzd
     in meta.json, and append a decision log entry.
  5. Write today's snapshot to data/snapshots/<YYYY-MM-DD>.json and prepend it to
     data/snapshots/index.json (de-duplicated by date).
  6. Bump portfolio.updated_at and meta.last_updated to today (UTC date).

Run from repo root:
  python scripts/update.py
"""
from __future__ import annotations

import csv
import io
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA = REPO_ROOT / "data"

STOOQ_URL = "https://stooq.com/q/l/"
FX_URL = "https://open.er-api.com/v6/latest/USD"
UA = "mock-exchange-bot/1.0"


def today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def http_get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_get_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", errors="replace")


def fetch_fx() -> float:
    data = http_get_json(FX_URL)
    if data.get("result") != "success":
        raise RuntimeError(f"FX API error: {data}")
    return float(data["rates"]["NZD"])


def fetch_prices(tickers: list[str]) -> dict[str, float]:
    if not tickers:
        return {}
    params = urllib.parse.urlencode({
        "s": ",".join(t.lower() if t.lower().endswith(".us") else f"{t.lower()}.us" for t in tickers),
        "f": "sd2t2ohlcv", "h": "", "e": "csv",
    })
    url = f"{STOOQ_URL}?{params}"
    raw = http_get_text(url)
    out: dict[str, float] = {}
    for row in csv.DictReader(io.StringIO(raw)):
        sym = (row.get("Symbol") or "").strip().lower()
        close = (row.get("Close") or "").strip()
        if not sym or not close or close == "-":
            continue
        try:
            out[sym.split(".")[0].upper()] = float(close)
        except ValueError:
            continue
    return out


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def update_fx_files(today: str, rate: float) -> None:
    latest = load_json(DATA / "fx" / "latest.json", {
        "pair": "USD/NZD", "latest_rate": rate, "inverse_rate": 1 / rate,
        "updated_at": today, "source_note": "Auto-updated daily from open.er-api.com.",
    })
    latest["pair"] = "USD/NZD"
    latest["latest_rate"] = round(rate, 6)
    latest["inverse_rate"] = round(1 / rate, 6)
    latest["updated_at"] = today
    latest["source_note"] = "Auto-updated daily from open.er-api.com."
    write_json(DATA / "fx" / "latest.json", latest)

    history = load_json(DATA / "fx" / "history.json", {"history": []})
    rows = history.get("history", [])
    rows = [r for r in rows if r.get("date") != today]
    rows.append({"date": today, "usd_to_nzd": round(rate, 6)})
    rows.sort(key=lambda r: r["date"])
    history["history"] = rows[-90:]
    write_json(DATA / "fx" / "history.json", history)


def update_holdings_prices(portfolio: dict) -> list[str]:
    tickers = sorted({h["ticker"].upper() for h in portfolio.get("holdings", [])})
    if not tickers:
        return []
    prices = fetch_prices(tickers)
    missing = []
    for h in portfolio["holdings"]:
        t = h["ticker"].upper()
        if t in prices:
            h["last_price_usd"] = round(prices[t], 4)
        else:
            missing.append(t)
    return missing


def maybe_deposit(meta: dict, transactions: dict, decisions: dict, today: str) -> bool:
    interval = int(meta.get("deposit_interval_days", 14))
    amount = float(meta.get("deposit_amount_nzd", 0))
    txns = transactions.get("transactions", [])
    last_deposit_date = None
    for t in reversed(txns):
        if (t.get("type") or "").upper() == "DEPOSIT":
            last_deposit_date = t.get("date")
            break
    if last_deposit_date is None:
        anchor = meta.get("start_date", today)
        try:
            anchor_d = datetime.strptime(anchor, "%Y-%m-%d").date()
            today_d = datetime.strptime(today, "%Y-%m-%d").date()
        except ValueError:
            return False
        if today_d < anchor_d:
            return False
    else:
        try:
            anchor_d = datetime.strptime(last_deposit_date, "%Y-%m-%d").date()
            today_d = datetime.strptime(today, "%Y-%m-%d").date()
        except ValueError:
            return False
        if (today_d - anchor_d).days < interval:
            return False

    portfolio_path = DATA / "portfolio.json"
    portfolio = load_json(portfolio_path, {"cash_nzd": 0, "updated_at": today, "holdings": []})
    portfolio["cash_nzd"] = round(float(portfolio.get("cash_nzd", 0)) + amount, 2)
    portfolio["updated_at"] = today
    write_json(portfolio_path, portfolio)

    txns.append({
        "date": today, "type": "DEPOSIT", "ticker": "", "shares": None,
        "price_usd": None, "total_nzd": amount,
        "note": f"Auto fortnightly NZD contribution (every {interval} days).",
    })
    transactions["transactions"] = txns
    write_json(DATA / "transactions.json", transactions)

    meta["total_deposited_nzd"] = round(float(meta.get("total_deposited_nzd", 0)) + amount, 2)
    write_json(DATA / "meta.json", meta)

    decs = decisions.get("decisions", [])
    decs.append({
        "date": today, "action": "AUTO_DEPOSIT",
        "summary": f"Auto-deposited {amount:.0f} NZD on the {interval}-day schedule.",
        "reasoning": f"Today is {today}, which is >= {interval} days after the last deposit on {last_deposit_date or meta.get('start_date')}. The daily updater added the scheduled NZD contribution to cash.",
    })
    decisions["decisions"] = decs
    write_json(DATA / "decisions.json", decisions)
    return True


def write_snapshot(portfolio: dict, fx_latest: dict, today: str) -> None:
    rate = float(fx_latest["latest_rate"])
    holdings_value_usd = sum(h["shares"] * h["last_price_usd"] for h in portfolio.get("holdings", []))
    holdings_value_nzd = holdings_value_usd * rate
    total_nzd = round(float(portfolio.get("cash_nzd", 0)) + holdings_value_nzd, 2)
    snapshot = {
        "date": today,
        "cash_nzd": round(float(portfolio.get("cash_nzd", 0)), 2),
        "holdings_value_usd": round(holdings_value_usd, 2),
        "holdings_value_nzd": round(holdings_value_nzd, 2),
        "total_value_nzd": total_nzd,
        "fx_usd_to_nzd": round(rate, 4),
        "holdings": [
            {"ticker": h["ticker"], "value_usd": round(h["shares"] * h["last_price_usd"], 2),
             "value_nzd": round(h["shares"] * h["last_price_usd"] * rate, 2)}
            for h in portfolio.get("holdings", [])
        ],
    }
    write_json(DATA / "snapshots" / f"{today}.json", snapshot)

    idx = load_json(DATA / "snapshots" / "index.json", {"snapshots": []})
    rows = [r for r in idx.get("snapshots", []) if r.get("date") != today]
    rows.append({"date": today, "total_value_nzd": total_nzd, "fx_usd_to_nzd": round(rate, 4)})
    rows.sort(key=lambda r: r["date"])
    idx["snapshots"] = rows[-365:]
    write_json(DATA / "snapshots" / "index.json", idx)


def main() -> int:
    today = today_utc()

    meta = load_json(DATA / "meta.json", {})
    portfolio = load_json(DATA / "portfolio.json", {"cash_nzd": 0, "updated_at": today, "holdings": []})
    transactions = load_json(DATA / "transactions.json", {"transactions": []})
    decisions = load_json(DATA / "decisions.json", {"decisions": []})

    print(f"[{today}] Starting daily update.")

    rate = fetch_fx()
    print(f"FX USD->NZD = {rate:.4f}")
    update_fx_files(today, rate)

    missing = update_holdings_prices(portfolio)
    if missing:
        print(f"WARNING: missing prices for {missing}; left untouched.", file=sys.stderr)
    print(f"Updated prices for {len(portfolio.get('holdings', [])) - len(missing)} holding(s).")

    deposited = maybe_deposit(meta, transactions, decisions, today)
    if deposited:
        print(f"Auto-deposited NZD {meta.get('deposit_amount_nzd', 0):.0f}.")
    else:
        print("No deposit due today.")

    portfolio["updated_at"] = today
    write_json(DATA / "portfolio.json", portfolio)
    meta["last_updated"] = today
    write_json(DATA / "meta.json", meta)

    fx_latest = load_json(DATA / "fx" / "latest.json", {})
    write_snapshot(portfolio, fx_latest, today)
    print(f"Wrote snapshot for {today}.")
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
