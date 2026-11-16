const STATE = {
  lang: 'en',
  pair: 'XAU/USD',
  chartMode: 'smc',
  images: { D1: null, H4: null, H1: null },
  lastReport: '',
  lastVerdict: 'WAIT',
  lwChart: null,
  candleSeries: null,
  priceLines: [],
  tvInitialized: false
};

// Institutional SMC Structure Presets per Pair
const SMC_DATA = {
  'XAU/USD': {
    tv: 'OANDA:XAUUSD',
    bias: 'BULLISH • DISCOUNT ZONE',
    base: 2648.0,
    step: 4.2,
    ob: { high: 2642.50, low: 2638.00 },
    fvg: { high: 2649.80, low: 2644.60 },
    bsl: 2674.50,
    ssl: 2633.20,
    eq: 2653.85
  },
  'BTC/USDT': {
    tv: 'BINANCE:BTCUSDT',
    bias: 'BULLISH • H4 BOS CONFIRMED',
    base: 91400,
    step: 480,
    ob: { high: 89950, low: 89300 },
    fvg: { high: 90850, low: 90200 },
    bsl: 93800,
    ssl: 88750,
    eq: 91275
  },
  'ETH/USDT': {
    tv: 'BINANCE:ETHUSDT',
    bias: 'BULLISH • FVG RETRACEMENT',
    base: 3110,
    step: 24,
    ob: { high: 3065, low: 3038 },
    fvg: { high: 3102, low: 3076 },
    bsl: 3245,
    ssl: 3010,
    eq: 3127.5
  },
  'SOL/USDT': {
    tv: 'BINANCE:SOLUSDT',
    bias: 'BULLISH • ASIAN SSL SWEPT',
    base: 214.0,
    step: 2.6,
    ob: { high: 208.50, low: 205.80 },
    fvg: { high: 212.40, low: 209.60 },
    bsl: 226.50,
    ssl: 203.20,
    eq: 214.85
  },
  'EUR/USD': {
    tv: 'FX:EURUSD',
    bias: 'BULLISH • LONDON KZ EXPANSION',
    base: 1.0575,
    step: 0.0019,
    ob: { high: 1.0542, low: 1.0525 },
    fvg: { high: 1.0566, low: 1.0549 },
    bsl: 1.0665,
    ssl: 1.0502,
    eq: 1.0583
  }
};

const DICT = {
  en: {
    aiTitle: 'SMC Multi-Timeframe Vision',
    aiSub: 'Upload D1, H4, H1 charts for BOS, CHoCH, OB, FVG & Liquidity audit',
    resetBtn: 'Reset',
    analyzeBtn: 'Execute SMC & ICT Chart Audit',
    matrixTitle: 'SMC 100-Point Confluence Matrix',
    matrixSub: 'Verify institutional rules before pulling the trigger',
    journalTitle: 'Execution Journal'
  },
  bn: {
    aiTitle: 'SMC মাল্টি-টাইমফ্রেম ভিশন',
    aiSub: 'BOS, CHoCH, OB, FVG ও Liquidity যাচাই করতে D1, H4, H1 চার্ট দিন',
    resetBtn: 'রিসেট',
    analyzeBtn: 'SMC ও ICT চার্ট অ্যানালাইসিস শুরু করুন',
    matrixTitle: 'SMC ১০০-পয়েন্ট কনফ্লুয়েন্স ম্যাট্রিক্স',
    matrixSub: 'ট্রেড নেওয়ার আগে ইনস্টিটিউশনাল শর্তগুলো যাচাই করুন',
    journalTitle: 'ট্রেড এক্সিকিউশন জার্নাল'
  }
};

// Kill Zone Session Monitor
function updateKillZone() {
  const h = new Date().getUTCHours();
  const textEl = document.getElementById('kz-text');
  const dotEl = document.getElementById('kz-dot');

  if (h >= 7 && h < 10) {
    textEl.textContent = 'LONDON KILL ZONE • ACTIVE';
    dotEl.style.background = '#0ecb81';
  } else if (h >= 12 && h < 15) {
    textEl.textContent = 'NEW YORK KILL ZONE • ACTIVE';
    dotEl.style.background = '#0ecb81';
  } else if (h >= 0 && h < 6) {
    textEl.textContent = 'ASIAN RANGE • LIQUIDITY BUILD';
    dotEl.style.background = '#f0b90b';
  } else {
    textEl.textContent = 'OFF-SESSION • WAIT FOR KZ';
    dotEl.style.background = '#848e9c';
  }
}

function toggleLang() {
  STATE.lang = STATE.lang === 'en' ? 'bn' : 'en';
  document.getElementById('lang-btn').textContent = STATE.lang === 'en' ? 'বাংলা' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (DICT[STATE.lang][k]) el.textContent = DICT[STATE.lang][k];
  });
  evaluateSMCMatrix();
}

// Navigation
function switchView(viewId, btnEl) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  btnEl.classList.add('active');

  if (viewId === 'view-chart') {
    if (STATE.chartMode === 'smc') initSMCChart();
    else renderTradingView();
  }
  if (viewId === 'view-journal') renderJournal();
}

function selectPair(pair) {
  STATE.pair = pair;
  document.querySelectorAll('.pair-chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-pair') === pair);
  });
  if (document.getElementById('view-chart').classList.contains('active')) {
    if (STATE.chartMode === 'smc') renderSMCMap();
    else renderTradingView();
  }
}

// ==========================================
// SMC STRUCTURE & LIQUIDITY CHART ENGINE
// ==========================================
function setChartMode(mode) {
  STATE.chartMode = mode;
  document.getElementById('btn-mode-smc').classList.toggle('active', mode === 'smc');
  document.getElementById('btn-mode-tv').classList.toggle('active', mode === 'tv');

  const smcWrap = document.getElementById('smc-canvas-wrap');
  const tvWrap = document.getElementById('tv-container');
  const layers = document.getElementById('smc-layers');

  if (mode === 'smc') {
    smcWrap.classList.remove('hidden');
    layers.classList.remove('hidden');
    tvWrap.classList.add('hidden');
    initSMCChart();
  } else {
    smcWrap.classList.add('hidden');
    layers.classList.add('hidden');
    tvWrap.classList.remove('hidden');
    renderTradingView();
  }
}

function initSMCChart() {
  const container = document.getElementById('lw-smc-chart');
  if (!STATE.lwChart) {
    STATE.lwChart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: 'solid', color: '#070a0f' },
        textColor: '#848e9c',
        fontFamily: 'JetBrains Mono, monospace'
      },
      grid: {
        vertLines: { color: '#111722' },
        horzLines: { color: '#111722' }
      },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true }
    });

    STATE.candleSeries = STATE.lwChart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d'
    });

    window.addEventListener('resize', () => {
      if (STATE.lwChart && STATE.chartMode === 'smc') {
        STATE.lwChart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    });
  }
  renderSMCMap();
}

function renderSMCMap() {
  if (!STATE.candleSeries) return;
  const d = SMC_DATA[STATE.pair];

  document.getElementById('chart-pair-title').textContent = `${STATE.pair} • H4 SMC MAP`;
  document.getElementById('smc-bias-sub').textContent = `BIAS: ${d.bias}`;

  // Generate SMC Displacement + Retracement Candles
  const candles = [];
  let t = Math.floor(Date.now() / 1000) - 60 * 14400;
  let price = d.base;
  const s = d.step;

  for (let i = 0; i < 60; i++) {
    const open = price;
    let close;
    if (i < 18) close = open + Math.sin(i * 0.7) * s * 0.6;
    else if (i < 34) close = open + s * 0.55; // Impulsive BOS displacement
    else if (i < 50) close = open + (((d.ob.high + d.ob.low) / 2) - open) * 0.24; // Pullback into Discount OB
    else close = open + s * 0.38 + Math.sin(i) * s * 0.15; // LTF CHoCH reaction

    const high = Math.max(open, close) + Math.abs(Math.sin(i * 1.4)) * s * 0.4;
    const low = Math.min(open, close) - Math.abs(Math.cos(i * 1.6)) * s * 0.4;
    candles.push({
      time: t + i * 14400,
      open: Number(open.toFixed(4)),
      high: Number(high.toFixed(4)),
      low: Number(low.toFixed(4)),
      close: Number(close.toFixed(4))
    });
    price = close;
  }

  STATE.candleSeries.setData(candles);

  // Clear existing price lines
  STATE.priceLines.forEach(l => STATE.candleSeries.removePriceLine(l));
  STATE.priceLines = [];

  if (document.getElementById('chk-ob').checked) {
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.ob.high, color: '#0ecb81', lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: 'OB High (POI)'
    }));
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.ob.low, color: '#0ecb81', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'OB Low'
    }));
  }

  if (document.getElementById('chk-fvg').checked) {
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.fvg.high, color: '#a855f7', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'FVG Top'
    }));
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.fvg.low, color: '#a855f7', lineWidth: 1, lineStyle: 1, axisLabelVisible: true, title: 'FVG Bottom'
    }));
  }

  if (document.getElementById('chk-liq').checked) {
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.bsl, color: '#f0b90b', lineWidth: 2, lineStyle: 2, axisLabelVisible: true, title: 'BSL (Target)'
    }));
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.ssl, color: '#f6465d', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SSL (Sweep)'
    }));
  }

  if (document.getElementById('chk-eq').checked) {
    STATE.priceLines.push(STATE.candleSeries.createPriceLine({
      price: d.eq, color: '#64748b', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: '50% EQ'
    }));
  }

  STATE.lwChart.timeScale().fitContent();

  // Populate Institutional POI Cards
  document.getElementById('poi-grid').innerHTML = `
    <div class="poi-box">
      <div class="poi-label">BULLISH ORDER BLOCK (POI)</div>
      <div class="poi-val" style="color:var(--bull)">${d.ob.low} – ${d.ob.high}</div>
    </div>
    <div class="poi-box">
      <div class="poi-label">H4 FAIR VALUE GAP (FVG)</div>
      <div class="poi-val" style="color:var(--purple)">${d.fvg.low} – ${d.fvg.high}</div>
    </div>
    <div class="poi-box">
      <div class="poi-label">BUY-SIDE LIQUIDITY (BSL)</div>
      <div class="poi-val" style="color:var(--accent-gold)">${d.bsl}</div>
    </div>
    <div class="poi-box">
      <div class="poi-label">SELL-SIDE LIQUIDITY (SSL)</div>
      <div class="poi-val" style="color:var(--bear)">${d.ssl}</div>
    </div>
  `;
}

function renderTradingView() {
  STATE.tvInitialized = true;
  const container = document.getElementById('tv-container');
  container.innerHTML = '';
  const script = document.createElement('script');
  script.src = 'https://s3.tradingview.com/tv.js';
  script.async = true;
  script.onload = () => {
    new TradingView.widget({
      autosize: true,
      symbol: SYMBOLS[STATE.pair] || 'OANDA:XAUUSD',
      interval: '240',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: '#0e131d',
      enable_publishing: false,
      hide_side_toolbar: true,
      container_id: 'tv-container'
    });
  };
  container.appendChild(script);
}

// ==========================================
// 100-POINT SMC CONFLUENCE MATRIX
// ==========================================
function evaluateSMCMatrix() {
  let score = 0;
  document.querySelectorAll('.smc-rule').forEach(chk => {
    if (chk.checked) score += parseInt(chk.getAttribute('data-pts'), 10);
  });

  document.getElementById('total-score').textContent = score;
  const box = document.getElementById('matrix-verdict-box');
  const badge = document.getElementById('matrix-badge');
  const msg = document.getElementById('matrix-verdict-msg');

  if (score >= 85) {
    box.className = 'verdict-panel approved';
    badge.className = 'verdict-badge approved';
    badge.textContent = 'APPROVED (A+ SETUP)';
    msg.textContent = STATE.lang === 'bn'
      ? 'A+ ইনস্টিটিউশনাল সেটআপ নিশ্চিত! POI জোনে এন্ট্রি নিন, TP1 (1:2)-এ ৫০% ক্লোজ করে SL ব্রেকইভেনে আনুন।'
      : 'High-probability A+ institutional setup. Execute with strict SL, scale out 50% at TP1 (1:2), and trail to BE.';
  } else if (score >= 70) {
    box.className = 'verdict-panel approved';
    badge.className = 'verdict-badge approved';
    badge.textContent = 'APPROVED';
    msg.textContent = STATE.lang === 'bn'
      ? 'সব মূল SMC শর্ত পূরণ হয়েছে। রিস্ক ম্যানেজমেন্ট মেনে ট্রেড এক্সিকিউট করা যাবে।'
      : 'Core SMC confluence criteria met. Valid for execution within strict session & news rules.';
  } else if (score >= 50) {
    box.className = 'verdict-panel wait';
    badge.className = 'verdict-badge wait';
    badge.textContent = 'WAIT';
    msg.textContent = STATE.lang === 'bn'
      ? 'সেটআপ তৈরি হচ্ছে, কিন্তু H1/15M LTF CHoCH কনফার্মেশন বা লিকুইডিটি সুইপের জন্য অপেক্ষা করুন।'
      : 'Developing setup. Wait for price to sweep liquidity and confirm LTF CHoCH inside POI.';
  } else {
    box.className = 'verdict-panel reject';
    badge.className = 'verdict-badge reject';
    badge.textContent = 'REJECT';
    msg.textContent = STATE.lang === 'bn'
      ? 'দুর্বল মার্কেট স্ট্রাকচার বা অপর্যাপ্ত কনফ্লুয়েন্স। এই সেটআপে ট্রেড নেওয়া থেকে বিরত থাকুন।'
      : 'Weak structure or missing confluence. Do not force a trade without HTF/LTF alignment.';
  }
}

// ==========================================
// AI VISION ANALYZER & JOURNAL
// ==========================================
function toggleModal(id) {
  document.getElementById(id).classList.toggle('hidden');
}

function saveApiConfig() {
  const key = document.getElementById('api-key-input').value.trim();
  const model = document.getElementById('model-select').value;
  localStorage.setItem('apex_or_key', key);
  localStorage.setItem('apex_or_model', model);
  toggleModal('api-modal');
}

function handleUpload(event, tf) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1280;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      STATE.images[tf] = dataUrl;
      document.getElementById(`preview-${tf}`).innerHTML = `
        <img src="${dataUrl}" class="preview-thumb" alt="${tf}" />
        <span class="tf-label" style="color:#0ecb81;margin-top:4px;">${tf} LOADED</span>
      `;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetCharts() {
  STATE.images = { D1: null, H4: null, H1: null };
  const hints = { D1: 'HTF Bias / PD', H4: 'BOS / OB / FVG', H1: 'LTF CHoCH' };
  ['D1', 'H4', 'H1'].forEach(tf => {
    document.getElementById(`preview-${tf}`).innerHTML = `
      <div class="plus-ring">+</div>
      <span class="tf-label">${tf === 'H1' ? 'H1 / 15M' : tf}</span>
      <span class="tf-hint">${hints[tf]}</span>
    `;
  });
  document.getElementById('result-card').classList.add('hidden');
}

async function analyzeWithAI() {
  const apiKey = (document.getElementById('api-key-input').value || localStorage.getItem('apex_or_key') || '').trim();
  const model = document.getElementById('model-select').value;

  if (!apiKey) {
    toggleModal('api-modal');
    return;
  }

  const activeSlots = Object.entries(STATE.images).filter(([_, val]) => val !== null);
  if (activeSlots.length === 0) {
    alert(STATE.lang === 'bn' ? 'অন্তত একটি চার্ট স্ক্রিনশট আপলোড করুন।' : 'Please upload at least one chart screenshot.');
    return;
  }

  const btn = document.getElementById('run-ai-btn');
  const resultCard = document.getElementById('result-card');
  const reportEl = document.getElementById('ai-report-text');

  btn.disabled = true;
  btn.textContent = STATE.lang === 'bn' ? 'SMC স্ট্রাকচার বিশ্লেষণ চলছে...' : 'Auditing SMC & ICT Structure...';
  resultCard.classList.remove('hidden');
  reportEl.textContent = STATE.lang === 'bn'
    ? 'AI চার্টের BOS, CHoCH, Order Block, FVG এবং Liquidity যাচাই করছে...'
    : 'Inspecting D1/H4/H1 Market Structure, Order Blocks, FVGs, and Liquidity sweeps...';

  const langRule = STATE.lang === 'bn'
    ? 'Write the explanation in clear Bengali while keeping SMC/ICT technical terms (BOS, CHoCH, Order Block, FVG, Liquidity, BSL, SSL, Inducement, Premium, Discount, Entry, SL, TP1, TP2, RRR, APPROVED, WAIT, REJECT) in English.'
    : 'Respond concisely in professional institutional English.';

  const content = [{
    type: 'text',
    text: `You are an institutional Smart Money Concepts (SMC) & ICT Price Action Analyst. Analyze these ${STATE.pair} chart screenshot(s) strictly from visible candlesticks and price scale. Never invent unseen prices or fake news. ${langRule}

Deliver a strict SMC/ICT Audit Report:
1. FINAL DECISION: [APPROVED / WAIT / REJECT] + Setup Score (/100) + Core Reason
2. Multi-Timeframe Structure (D1 / H4 / H1): Overall Bias, BOS, CHoCH, Premium/Discount Zone
3. Institutional POIs & Liquidity: Unmitigated Order Block, Fair Value Gap (FVG), BSL/SSL & Inducement Sweep
4. Trade Execution Plan: Direction (BUY/SELL/NO TRADE), Entry Zone, Stop Loss, TP1 (50% Partial + BE), TP2 (Final Target), RRR (Min 1:2)`
  }];

  activeSlots.forEach(([tf, url]) => {
    content.push({ type: 'text', text: `Timeframe Screenshot: ${tf}` });
    content.push({ type: 'image_url', image_url: { url } });
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'APEX SMC Institutional Terminal'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error?.message || `API Error ${response.status}`);

    const reply = data.choices?.[0]?.message?.content || 'No analysis returned.';
    STATE.lastReport = reply;
    reportEl.textContent = reply;

    const badge = document.getElementById('verdict-badge');
    if (reply.includes('APPROVED')) {
      STATE.lastVerdict = 'APPROVED';
      badge.textContent = 'APPROVED';
      badge.className = 'verdict-badge approved';
    } else if (reply.includes('REJECT')) {
      STATE.lastVerdict = 'REJECT';
      badge.textContent = 'REJECT';
      badge.className = 'verdict-badge reject';
    } else {
      STATE.lastVerdict = 'WAIT';
      badge.textContent = 'WAIT';
      badge.className = 'verdict-badge wait';
    }
  } catch (err) {
    reportEl.textContent = `❌ Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = DICT[STATE.lang].analyzeBtn;
  }
}

function saveToJournal() {
  if (!STATE.lastReport) return;
  const journal = JSON.parse(localStorage.getItem('apex_smc_journal') || '[]');
  journal.unshift({
    id: Date.now(),
    pair: STATE.pair,
    verdict: STATE.lastVerdict,
    date: new Date().toLocaleString(),
    text: STATE.lastReport
  });
  localStorage.setItem('apex_smc_journal', JSON.stringify(journal));
  alert(STATE.lang === 'bn' ? 'SMC সেটআপটি জার্নালে সেভ হয়েছে!' : 'SMC setup saved to Journal!');
}

function renderJournal() {
  const journal = JSON.parse(localStorage.getItem('apex_smc_journal') || '[]');
  document.getElementById('journal-stats').textContent = `${journal.length} setups archived locally`;
  const feed = document.getElementById('journal-feed');

  if (journal.length === 0) {
    feed.innerHTML = `<p style="text-align:center;color:#848e9c;font-size:12px;padding:24px 0;">No setups logged yet.</p>`;
    return;
  }

  feed.innerHTML = journal.map(item => {
    const cls = item.verdict.toLowerCase();
    return `
      <div class="journal-item">
        <div class="journal-top">
          <div>
            <strong style="font-family:var(--font-mono);font-size:12px;">${item.pair}</strong>
            <span class="verdict-badge ${cls}" style="margin-left:6px;">${item.verdict}</span>
          </div>
          <span class="journal-date">${item.date}</span>
        </div>
        <div class="journal-body">${item.text}</div>
      </div>
    `;
  }).join('');
}

function clearJournal() 
