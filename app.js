const STATE = {
  lang: 'en',
  pair: 'XAU/USD',
  images: { D1: null, H4: null, H1: null },
  lastReport: '',
  lastVerdict: 'WAIT',
  tvInitialized: false
};

const SYMBOLS = {
  'XAU/USD': 'OANDA:XAUUSD',
  'BTC/USDT': 'BINANCE:BTCUSDT',
  'ETH/USDT': 'BINANCE:ETHUSDT',
  'SOL/USDT': 'BINANCE:SOLUSDT',
  'EUR/USD': 'FX:EURUSD'
};

const DICT = {
  en: {
    aiTitle: 'Institutional Chart Vision',
    aiSub: 'Upload D1, H4, H1 chart screenshots for SMC/ICT validation',
    resetBtn: 'Reset',
    analyzeBtn: 'Run SMC Vision Analysis',
    journalTitle: 'Execution Journal'
  },
  bn: {
    aiTitle: 'ইনস্টিটিউশনাল চার্ট ভিশন',
    aiSub: 'SMC/ICT অ্যানালাইসিসের জন্য D1, H4, H1 চার্ট আপলোড করুন',
    resetBtn: 'রিসেট',
    analyzeBtn: 'AI চার্ট অ্যানালাইসিস শুরু করুন',
    journalTitle: 'ট্রেড এক্সিকিউশন জার্নাল'
  }
};

// Session Kill Zone Clock
function updateKillZone() {
  const hour = new Date().getUTCHours();
  const textEl = document.getElementById('kz-text');
  const dotEl = document.getElementById('kz-dot');

  if (hour >= 7 && hour < 10) {
    textEl.textContent = 'LONDON KILL ZONE • LIVE';
    dotEl.style.background = '#0ecb81';
  } else if (hour >= 12 && hour < 15) {
    textEl.textContent = 'NEW YORK KILL ZONE • LIVE';
    dotEl.style.background = '#0ecb81';
  } else if (hour >= 0 && hour < 6) {
    textEl.textContent = 'ASIAN RANGE • LIQUIDITY BUILD';
    dotEl.style.background = '#f0b90b';
  } else {
    textEl.textContent = 'OFF-SESSION • WAIT FOR KZ';
    dotEl.style.background = '#848e9c';
  }
}

// Language Switch
function toggleLang() {
  STATE.lang = STATE.lang === 'en' ? 'bn' : 'en';
  document.getElementById('lang-btn').textContent = STATE.lang === 'en' ? 'বাংলা' : 'EN';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (DICT[STATE.lang][key]) el.textContent = DICT[STATE.lang][key];
  });
}

// Navigation
function switchView(viewId, btnEl) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  btnEl.classList.add('active');

  if (viewId === 'view-chart' && !STATE.tvInitialized) {
    renderTradingView();
  }
  if (viewId === 'view-journal') {
    renderJournal();
  }
}

function selectPair(pair) {
  STATE.pair = pair;
  document.querySelectorAll('.pair-chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-pair') === pair);
  });
  if (STATE.tvInitialized) renderTradingView();
}

function renderTradingView() {
  STATE.tvInitialized = true;
  document.getElementById('chart-pair-title').textContent = `${STATE.pair} • LIVE FEED`;
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

// Modal & API Settings
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

// Image Upload & Compression
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
        <span class="tf-label" style="color:#0ecb81;margin-top:4px;">${tf} READY</span>
      `;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function resetCharts() {
  STATE.images = { D1: null, H4: null, H1: null };
  const hints = { D1: 'HTF Bias', H4: 'OB & FVG', H1: 'CHoCH Entry' };
  ['D1', 'H4', 'H1'].forEach(tf => {
    document.getElementById(`preview-${tf}`).innerHTML = `
      <div class="plus-ring">+</div>
      <span class="tf-label">${tf === 'H1' ? 'H1 / 15M' : tf}</span>
      <span class="tf-hint">${hints[tf]}</span>
    `;
  });
  document.getElementById('result-card').classList.add('hidden');
}

// OpenRouter Vision Analysis
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
  btn.textContent = STATE.lang === 'bn' ? 'বিশ্লেষণ চলছে...' : 'Analyzing Market Structure...';
  resultCard.classList.remove('hidden');
  reportEl.textContent = STATE.lang === 'bn' ? 'AI চার্টের Order Block, FVG এবং Liquidity যাচাই করছে...' : 'Inspecting Order Blocks, Fair Value Gaps, and Liquidity sweeps...';

  const langRule = STATE.lang === 'bn'
    ? 'Write the explanation in clear Bengali while keeping SMC/ICT technical terms (BOS, CHoCH, Order Block, FVG, Liquidity, Entry, SL, TP, RRR, APPROVED, WAIT, REJECT) in English.'
    : 'Respond concisely in professional English.';

  const content = [{
    type: 'text',
    text: `You are an institutional Forex & Crypto Swing Trading Analyst (SMC & ICT Specialist). Analyze these ${STATE.pair} chart screenshot(s) strictly from visible candlesticks and price scale. Never invent unseen prices. ${langRule}

Structure your report cleanly:
1. FINAL DECISION: [APPROVED / WAIT / REJECT] — Main Reason
2. Multi-Timeframe Structure (D1 / H4 / H1): Trend, BOS, CHoCH
3. Institutional POIs: Liquidity (BSL/SSL, EQH/EQL), Order Block, Fair Value Gap (FVG)
4. Execution Levels: Direction, Entry Zone, Stop Loss, TP1, TP2, Risk-to-Reward (Minimum 1:2)`
  }];

  activeSlots.forEach(([tf, url]) => {
    content.push({ type: 'text', text: `Timeframe: ${tf}` });
    content.push({ type: 'image_url', image_url: { url } });
  });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'APEX SMC Terminal'
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

// Local Journal
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
  alert(STATE.lang === 'bn' ? 'জার্নালে সেভ হয়েছে!' : 'Saved to Journal!');
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

function clearJournal() {
  if (confirm('Clear all journal entries?')) {
    localStorage.removeItem('apex_smc_journal');
    renderJournal();
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateKillZone();
  setInterval(updateKillZone, 15000);
  const savedKey = localStorage.getItem('apex_or_key') || '';
  const savedModel = localStorage.getItem('apex_or_model') || 'google/gemma-3-27b-it:free';
  if (savedKey) document.getElementById('api-key-input').value = savedKey;
  document.getElementById('model-select').value = savedModel;
});
