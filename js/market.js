(function () {
  const log = document.getElementById("chat-log");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const statusEl = document.getElementById("chat-status");
  const tape = document.getElementById("market-tape");
  const chips = document.getElementById("chat-chips");
  if (!log || !form || !input) return;

  const SI_ADDRESS = "0xba1A2d9783eBE2B76493c5C12eB9813a0e062843";
  const MAJORS = [
    ["BTCUSDT", "Bitcoin", "BTC"],
    ["ETHUSDT", "Ethereum", "ETH"],
    ["SOLUSDT", "Solana", "SOL"],
    ["BNBUSDT", "BNB", "BNB"],
    ["XRPUSDT", "XRP", "XRP"],
    ["DOGEUSDT", "Dogecoin", "DOGE"],
    ["ADAUSDT", "Cardano", "ADA"],
    ["AVAXUSDT", "Avalanche", "AVAX"],
    ["LINKUSDT", "Chainlink", "LINK"],
    ["TRXUSDT", "TRON", "TRX"],
    ["SUIUSDT", "Sui", "SUI"],
    ["PEPEUSDT", "Pepe", "PEPE"],
    ["SHIBUSDT", "Shiba Inu", "SHIB"],
    ["WIFUSDT", "dogwifhat", "WIF"],
    ["BONKUSDT", "Bonk", "BONK"]
  ];

  let cache = null;
  let busy = false;

  function money(n) {
    if (n == null || !isFinite(n)) return "n/a";
    const abs = Math.abs(n);
    const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
    return n.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits > 2 ? 2 : digits,
      maximumFractionDigits: digits
    });
  }

  function compact(n) {
    if (n == null || !isFinite(n)) return "n/a";
    const abs = Math.abs(n);
    if (abs >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (abs >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (abs >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return money(n);
  }

  function pct(n) {
    if (n == null || !isFinite(n)) return "n/a";
    const sign = n > 0 ? "+" : "";
    return sign + n.toFixed(2) + "%";
  }

  function vibe(change) {
    if (change == null || !isFinite(change)) return "The tape is quiet.";
    if (change >= 8) return "Cape is fully deployed.";
    if (change >= 1.5) return "Green candles. Stay super.";
    if (change > -1.5) return "Sideways. The iguana is watching.";
    if (change > -8) return "A dip. The army does not panic.";
    return "Red day. Hold the line.";
  }

  async function getJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function mapGecko(row) {
    return {
      id: row.id,
      name: row.name,
      symbol: String(row.symbol || "").toUpperCase(),
      price: row.current_price,
      change: row.price_change_percentage_24h,
      cap: row.market_cap,
      volume: row.total_volume,
      rank: row.market_cap_rank
    };
  }

  async function loadBinance() {
    const symbols = MAJORS.map((row) => row[0]);
    const url = "https://api.binance.com/api/v3/ticker/24hr?symbols=" + encodeURIComponent(JSON.stringify(symbols));
    const rows = await getJson(url);
    const bySymbol = new Map(rows.map((row) => [row.symbol, row]));
    return MAJORS.map(([pair, name, symbol], index) => {
      const row = bySymbol.get(pair);
      if (!row) return null;
      return {
        id: symbol.toLowerCase(),
        name,
        symbol,
        price: Number(row.lastPrice),
        change: Number(row.priceChangePercent),
        cap: null,
        volume: Number(row.quoteVolume),
        rank: index + 1
      };
    }).filter(Boolean);
  }

  async function loadSi() {
    try {
      const data = await getJson("https://api.dexscreener.com/latest/dex/tokens/" + SI_ADDRESS);
      const pairs = (data.pairs || []).filter((pair) => pair && pair.priceUsd);
      if (!pairs.length) return null;
      pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const pair = pairs[0];
      const day = pair.priceChange ? Number(pair.priceChange.h24) : null;
      const hour = pair.priceChange ? Number(pair.priceChange.h1) : null;
      const wildDay = day == null || !isFinite(day) || Math.abs(day) > 400;
      return {
        price: Number(pair.priceUsd),
        change: wildDay ? hour : day,
        window: wildDay ? "1h" : "24h",
        volume: pair.volume ? Number(pair.volume.h24) : null,
        liquidity: pair.liquidity ? Number(pair.liquidity.usd) : null,
        dex: pair.dexId || "DEX"
      };
    } catch {
      return null;
    }
  }

  async function loadMarkets(force) {
    if (!force && cache && Date.now() - cache.at < 45000) return cache;
    let markets = [];
    let global = null;
    let source = "live";
    try {
      const [g, m] = await Promise.all([
        getJson("https://api.coingecko.com/api/v3/global"),
        getJson("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&price_change_percentage=24h")
      ]);
      global = {
        cap: g.data.total_market_cap.usd,
        change: g.data.market_cap_change_percentage_24h_usd,
        btcDom: g.data.market_cap_percentage.btc
      };
      markets = m.map(mapGecko);
      source = "CoinGecko";
    } catch {
      try {
        const [g, m] = await Promise.all([
          getJson("https://api.coinpaprika.com/v1/global"),
          getJson("https://api.coinpaprika.com/v1/tickers?limit=40")
        ]);
        global = {
          cap: g.market_cap_usd,
          change: g.market_cap_change_24h,
          btcDom: g.bitcoin_dominance_percentage
        };
        markets = m.map((row) => ({
          id: row.id,
          name: row.name,
          symbol: String(row.symbol || "").toUpperCase(),
          price: row.quotes.USD.price,
          change: row.quotes.USD.percent_change_24h,
          cap: row.quotes.USD.market_cap,
          volume: row.quotes.USD.volume_24h,
          rank: row.rank
        }));
        source = "CoinPaprika";
      } catch {
        markets = await loadBinance();
        source = "Binance";
      }
    }
    const si = await loadSi();
    cache = { at: Date.now(), markets, global, si, source };
    renderTape();
    statusEl.textContent = "Live tape · " + source;
    return cache;
  }

  function renderTape() {
    if (!tape || !cache) return;
    tape.replaceChildren();
    const picks = ["BTC", "ETH", "SOL"];
    picks.forEach((symbol) => {
      const coin = cache.markets.find((row) => row.symbol === symbol);
      if (coin) tape.appendChild(pill(symbol, money(coin.price), coin.change));
    });
    if (cache.si) tape.appendChild(pill("$SI", money(cache.si.price), cache.si.change, cache.si.window));
  }

  function pill(label, price, change, windowLabel) {
    const el = document.createElement("p");
    el.className = "tape-pill" + (change < 0 ? " is-down" : " is-up");
    const name = document.createElement("b");
    name.textContent = label;
    const value = document.createElement("span");
    const span = windowLabel === "1h" ? " 1h" : "";
    value.textContent = price + "  " + pct(change) + span;
    el.append(name, value);
    return el;
  }

  function addMessage(role, text) {
    const item = document.createElement("article");
    item.className = role === "me" ? "msg msg-me" : "msg msg-si";
    if (role !== "me") {
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = "Super Iguana";
      item.appendChild(who);
    }
    const body = document.createElement("p");
    body.textContent = text;
    item.appendChild(body);
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function coinLine(coin) {
    const cap = coin.cap ? " Market cap " + compact(coin.cap) + "." : "";
    const volume = coin.volume ? " 24h volume " + compact(coin.volume) + "." : "";
    const rank = coin.rank ? " Rank #" + coin.rank + "." : "";
    return coin.name + " (" + coin.symbol + ") is " + money(coin.price) + ", " + pct(coin.change) + " over 24 hours." + rank + cap + volume + " " + vibe(coin.change);
  }

  function matchLocal(text) {
    const words = text.toLowerCase().replace(/[^a-z0-9$]+/g, " ").split(" ").filter((word) => word.length > 1);
    for (const word of words) {
      const symbol = word.replace(/^\$/, "");
      if (symbol.length < 2 || symbol === "si") continue;
      const hit = cache.markets.find((coin) => coin.symbol.toLowerCase() === symbol);
      if (hit) return hit;
    }
    const blob = " " + words.join(" ") + " ";
    return cache.markets.find((coin) => blob.includes(" " + coin.name.toLowerCase() + " ")) || null;
  }

  function overview() {
    const btc = cache.markets.find((coin) => coin.symbol === "BTC");
    const eth = cache.markets.find((coin) => coin.symbol === "ETH");
    const lines = [];
    if (cache.global) {
      lines.push("Crypto market cap is " + compact(cache.global.cap) + ", " + pct(cache.global.change) + " today. Bitcoin dominance is " + Number(cache.global.btcDom).toFixed(1) + "%.");
    }
    if (btc) lines.push("Bitcoin is " + money(btc.price) + " (" + pct(btc.change) + ").");
    if (eth) lines.push("Ethereum is " + money(eth.price) + " (" + pct(eth.change) + ").");
    lines.push(vibe(cache.global ? cache.global.change : btc && btc.change));
    return lines.join(" ");
  }

  function movers(up) {
    const ranked = cache.markets
      .filter((coin) => coin.change != null && isFinite(coin.change))
      .sort((a, b) => up ? b.change - a.change : a.change - b.change)
      .slice(0, 3);
    if (!ranked.length) return "The movers are hiding. Ask me again in a moment.";
    const title = up ? "Greenest names on my board:" : "Reddest names on my board:";
    const body = ranked.map((coin) => coin.symbol + " " + money(coin.price) + " (" + pct(coin.change) + ")").join("\n");
    return title + "\n" + body + "\n" + (up ? "Cape likes green. Still not a signal to ape." : "Red candles happen. The iguana stays on the roof.");
  }

  function siLine() {
    if (!cache.si) {
      return "I cannot see the $SI pool this second. The contract is still " + SI_ADDRESS + " on Robinhood Chain. Hit Buy Now when you want the swap.";
    }
    const span = cache.si.window === "1h" ? "over the last hour" : "over 24 hours";
    const fresh = cache.si.window === "1h" ? " The 24-hour print is still noisy because this pool is new." : "";
    return "Super Iguana ($SI) on Robinhood Chain is " + money(cache.si.price) + ", " + pct(cache.si.change) + " " + span + "." + fresh + " Volume " + compact(cache.si.volume) + ". Liquidity " + compact(cache.si.liquidity) + ". " + vibe(cache.si.change) + " Same contract as this site.";
  }

  async function searchCoin(text) {
    const cleaned = text.replace(/[^a-z0-9$ ]/gi, " ").replace(/\b(price|how|what|is|the|of|about|check|show|me|please)\b/gi, " ").trim();
    if (cleaned.length < 2) return null;
    try {
      const found = await getJson("https://api.coingecko.com/api/v3/search?query=" + encodeURIComponent(cleaned));
      const hit = (found.coins || [])[0];
      if (!hit) return null;
      const rows = await getJson("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" + encodeURIComponent(hit.id) + "&price_change_percentage=24h");
      return rows[0] ? mapGecko(rows[0]) : null;
    } catch {
      return null;
    }
  }

  async function answer(raw) {
    const q = raw.toLowerCase().trim();
    await loadMarkets(false);
    if (!cache.markets.length) {
      return "The charts blinked and I lost the feed. Ask me again in a few seconds.";
    }
    if (/^(hi|hey|hello|yo|gm|sup|stay super)\b/.test(q)) {
      return "GM. Cape on. " + overview();
    }
    if (/\b(refresh|update the tape|reload)\b/.test(q)) {
      await loadMarkets(true);
      return "Tape refreshed. " + overview();
    }
    if (/\b(\$si|super iguana|superiguana)\b/.test(q) || /\bsi\b/.test(q)) return siLine();
    if (/\b(should i|buy|sell|ape in|all in|long|short)\b/.test(q)) {
      const coin = matchLocal(q);
      const lead = coin ? coinLine(coin) + " " : "";
      return lead + "I do not call buys or sells. I read the tape. You make the move.";
    }
    if (/\b(pump|pumping|gainer|gainers|moon|ripping|greenest)\b/.test(q)) return movers(true);
    if (/\b(dump|dumping|loser|losers|bleeding|reddest|rekt)\b/.test(q)) return movers(false);
    if (/\btop\b/.test(q)) {
      return cache.markets.slice(0, 5).map((coin, index) => (
        (index + 1) + ". " + coin.symbol + " " + money(coin.price) + " (" + pct(coin.change) + ")"
      )).join("\n");
    }
    const vs = q.match(/([a-z0-9$]{2,})\s+(?:vs|versus)\s+([a-z0-9$]{2,})/);
    if (vs) {
      const left = matchLocal(vs[1]) || await searchCoin(vs[1]);
      const right = matchLocal(vs[2]) || await searchCoin(vs[2]);
      if (left && right) return coinLine(left) + "\n" + coinLine(right);
    }
    const local = matchLocal(q);
    if (local) return coinLine(local);
    if (/\b(market|overview|crypto|whole tape|how's the|hows the|how is the)\b/.test(q)) return overview();
    const found = await searchCoin(q);
    if (found) return coinLine(found);
    return "Point me at a coin, or ask for the market, what's pumping, or $SI. I check live prices. I do not write the next meta for you.";
  }

  async function ask(text) {
    const clean = text.trim();
    if (!clean || busy) return;
    busy = true;
    input.disabled = true;
    addMessage("me", clean);
    statusEl.textContent = "Reading the tape…";
    try {
      const reply = await answer(clean);
      addMessage("si", reply);
      statusEl.textContent = cache ? "Live tape · " + cache.source : "Live tape";
    } catch {
      addMessage("si", "The chain coughed. Ask me that again.");
      statusEl.textContent = "Tape hiccup. Try again.";
    }
    busy = false;
    input.disabled = false;
    input.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = "";
    ask(text);
  });

  chips.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ask]");
    if (!button) return;
    ask(button.getAttribute("data-ask"));
  });

  loadMarkets(false).then(() => {
    addMessage("si", "GM. I'm Super Iguana, and I just checked the live market. " + overview() + " Ask me about a coin, the movers, or $SI.");
  }).catch(() => {
    statusEl.textContent = "Tape offline";
    addMessage("si", "GM. I am Super Iguana, but the price feed is quiet right now. Ask again in a moment and I will read the tape.");
  });
})();
