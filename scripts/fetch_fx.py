"""Fetch latest USD->NZD rate from open.er-api.com (no key required)."""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

URL = "https://open.er-api.com/v6/latest/USD"


def fetch_usd_to_nzd(timeout: int = 15) -> float:
    req = urllib.request.Request(URL, headers={"User-Agent": "mock-exchange-bot/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data.get("result") != "success":
        raise RuntimeError(f"FX API error: {data}")
    rate = data["rates"]["NZD"]
    return float(rate)


def main() -> int:
    rate = fetch_usd_to_nzd()
    print(json.dumps({"pair": "USD/NZD", "latest_rate": rate, "inverse_rate": 1.0 / rate}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
