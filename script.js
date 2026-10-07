(() => {
  'use strict';
  const STORAGE_KEY = 'feral-hiit-v1';
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const parseDate = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const shiftDate = (key, days) => { const date = parseDate(key); date.setDate(date.getDate() + days); return dateKey(date); };
  const validDate = key => typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(parseDate(key)) === key;
  let today = dateKey(new Date());
  let storageAvailable = true;
  let storageMessage = '';
  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { startDate: today, records: {} };
      const saved = JSON.parse(raw);
      if (!saved || !validDate(saved.startDate) || !saved.records || typeof saved.records !== 'object' || Array.isArray(saved.records)) throw new Error('Invalid saved data');
      const records = {};
      for (const [key, value] of Object.entries(saved.records)) {
        if (validDate(key) && value && typeof value === 'object') records[key] = { morning: value.morning === true, evening: value.evening === true, t: Number(value.t) || 0 };
      }
      return { startDate: saved.startDate, records };
    } catch (error) {
      storageAvailable = false;
      storageMessage = '保存データを読み込めません。この画面の記録は再読み込みで失われる可能性があります。';
      return { startDate: today, records: {} };
    }
  }
  let state = readState();
  let viewMonth = today.slice(0, 7);
  const monthDates = month => { const [y, m] = month.split('-').map(Number); const days = new Date(y, m, 0).getDate(); return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`); };
  const shiftMonth = (month, n) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + n, 1, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const $ = id => document.getElementById(id);
  const achieved = (key, full = false) => { const record = state.records[key]; return Boolean(record && (full ? record.morning && record.evening : record.morning || record.evening)); };
  function streak(full = false) {
    let key = achieved(today, full) ? today : shiftDate(today, -1);
    let count = 0;
    while (achieved(key, full)) { count++; key = shiftDate(key, -1); }
    return count;
  }
  function rewardCount() {
    let previous = null, run = 0, total = 0;
    const keys = Object.keys(state.records).filter(key => key <= today && achieved(key, true)).sort();
    for (const key of keys) {
      run = previous && shiftDate(previous, 1) === key ? run + 1 : 1;
      if (run % 3 === 0) total++;
      previous = key;
    }
    return total;
  }
  function save() {
    if (!storageAvailable) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (error) { storageAvailable = false; storageMessage = '保存できません。ブラウザのストレージ設定をご確認ください。現在の記録はこの画面だけに保持されます。'; return false; }
  }
  const prettyDate = key => new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(parseDate(key));
  function render() {
    $('today').textContent = prettyDate(today);
    $('today').dateTime = today;
    const [ty, tm, td] = today.split('-');
    $('day-label').textContent = `${ty}.${tm} / DAY ${td}`;
    $('streak').textContent = streak();
    const fullStreak = streak(true), rewards = rewardCount();
    const progress = fullStreak > 0 && fullStreak % 3 === 0 ? 3 : fullStreak % 3;
    $('full-streak').textContent = fullStreak;
    $('reward-count').textContent = rewards;
    $('reward').classList.toggle('unlocked', rewards > 0);
    $('reward-badge').textContent = rewards > 0 ? 'UNLOCKED' : 'LOCKED';
    $('reward-message').textContent = progress === 3 ? '報酬 GET！次の解放まであと3日' : `${rewards > 0 ? '次の報酬' : '報酬解放'}まであと${3 - progress}日`;
    $('reward-gauge').setAttribute('aria-valuenow', progress);
    Array.from($('reward-gauge').children).forEach((segment, index) => segment.classList.toggle('filled', index < progress));
    for (const period of ['morning', 'evening']) {
      const active = Boolean(state.records[today]?.[period]);
      $(period).setAttribute('aria-pressed', String(active));
      $(period).querySelector('.check').textContent = active ? '✓' : '＋';
      $(period).querySelector('.button-state').textContent = active ? '記録済み / COMPLETE' : '未記録 / STANDBY';
    }
    const dates = monthDates(viewMonth);
    const [vy, vm] = viewMonth.split('-').map(Number);
    $('month-label').textContent = `${vy}年${vm}月`;
    $('this-month').hidden = viewMonth === today.slice(0, 7);
    $('next-month').disabled = viewMonth >= today.slice(0, 7);
    $('completed-count').textContent = `${String(dates.filter(key => achieved(key)).length).padStart(2, '0')} / ${dates.length} CLEAR`;
    const blanks = Array.from({ length: parseDate(dates[0]).getDay() }, () => { const cell = document.createElement('div'); cell.className = 'day blank'; cell.setAttribute('aria-hidden', 'true'); return cell; });
    $('calendar').replaceChildren(...blanks, ...dates.map((key, index) => {
      const done = achieved(key), full = achieved(key, true);
      const cell = document.createElement('div');
      cell.className = `day${done ? ' done' : ''}${full ? ' full' : ''}${key === today ? ' today' : ''}${key > today ? ' future' : ''}`;
      cell.setAttribute('role', 'listitem');
      cell.setAttribute('aria-label', `${prettyDate(key)}、${full ? '朝夜フル達成' : done ? '達成' : '未達成'}${key === today ? '、今日' : ''}`);
      cell.title = cell.getAttribute('aria-label');
      if (key === today) cell.setAttribute('aria-current', 'date');
      cell.innerHTML = `<span class="day-number">${index + 1}</span>${done ? '<svg viewBox="0 0 80 64" aria-hidden="true"><use href="#cat-stamp"/></svg>' : ''}`;
      return cell;
    }));
    $('save-status').classList.toggle('error', !storageAvailable);
    if (!storageAvailable) $('save-status').textContent = storageMessage;
  }
  function refreshDate() {
    const current = dateKey(new Date());
    if (current !== today) { if (viewMonth === today.slice(0, 7)) viewMonth = current.slice(0, 7); today = current; render(); if (storageAvailable) $('save-status').textContent = '日付が変わりました。今日の記録をどうぞ。'; }
  }
  for (const period of ['morning', 'evening']) {
    $(period).addEventListener('click', () => {
      refreshDate();
      const record = state.records[today] || { morning: false, evening: false };
      record[period] = !record[period];
      record.t = Date.now();
      state.records[today] = record;
      const saved = save();
      render();
      if (saved) $('save-status').textContent = `${period === 'morning' ? '朝' : '夜'}の記録を${record[period] ? '保存' : '解除'}しました。`;
      sync();
    });
  }
  $('prev-month').addEventListener('click', () => { viewMonth = shiftMonth(viewMonth, -1); render(); });
  $('next-month').addEventListener('click', () => { if (viewMonth < today.slice(0, 7)) viewMonth = shiftMonth(viewMonth, 1); render(); });
  $('this-month').addEventListener('click', () => { viewMonth = today.slice(0, 7); render(); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      storageAvailable = true; storageMessage = ''; state = readState();
      render();
      if (storageAvailable) $('save-status').textContent = '別のタブの記録を反映しました。';
    }
  });
  const SYNC_URL = 'https://api.github.com/repos/tetsunuja/feral-hiit-data/contents/records.json';
  const TOKEN_KEY = 'feral-hiit-token';
  const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (error) { return ''; } };
  const setSync = (text, error = false) => { $('sync-status').textContent = text; $('sync-status').classList.toggle('error', error); };
  function mergeRemote(remote) {
    let pulled = false, localNewer = false;
    for (const [key, value] of Object.entries(remote)) {
      if (!validDate(key) || !value || typeof value !== 'object') continue;
      const local = state.records[key];
      if (!local || (Number(value.t) || 0) > (local.t || 0)) { state.records[key] = { morning: value.morning === true, evening: value.evening === true, t: Number(value.t) || 0 }; pulled = true; }
    }
    for (const [key, local] of Object.entries(state.records)) {
      const value = remote[key];
      if (!value || (local.t || 0) > (Number(value.t) || 0)) localNewer = true;
    }
    return { pulled, localNewer };
  }
  async function github(method, body) {
    const response = await fetch(method === 'GET' ? `${SYNC_URL}?_=${Date.now()}` : SYNC_URL, { method, cache: 'no-store', headers: { Authorization: `Bearer ${readToken()}`, Accept: 'application/vnd.github+json' }, body: body && JSON.stringify(body) });
    if (!response.ok) throw Object.assign(new Error(`GitHub ${response.status}`), { status: response.status });
    return response.json();
  }
  let syncing = false, syncAgain = false;
  async function sync() {
    if (typeof fetch !== 'function') return;
    if (!readToken()) { setSync('クラウド同期：未設定（この端末だけに保存中）'); return; }
    if (syncing) { syncAgain = true; return; }
    syncing = true; setSync('クラウド同期中…');
    try {
      for (let attempt = 0; ; attempt++) {
        const file = await github('GET');
        const remote = JSON.parse(atob(file.content.replace(/\s/g, ''))).records || {};
        const { pulled, localNewer } = mergeRemote(remote);
        if (pulled) { save(); render(); }
        if (!localNewer) break;
        try {
          await github('PUT', { message: `records ${today}`, sha: file.sha, content: btoa(JSON.stringify({ records: state.records }, null, 1)) });
          break;
        } catch (error) { if (attempt >= 2 || ![409, 422].includes(error.status)) throw error; }
      }
      setSync(`クラウド同期済み ${new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      setSync(error.status === 401 ? '同期エラー：キーが無効か期限切れです。キーを入れ直してください。' : error.status === 403 || error.status === 404 ? '同期エラー：キーに記録用リポジトリ（feral-hiit-data）の読み書き権限がありません。' : '同期できませんでした（オフライン？）。記録は端末に保存済みで、次に開いた時に同期します。', true);
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; sync(); }
    }
  }
  $('token-save').addEventListener('click', () => {
    const token = $('token-input').value.trim();
    if (!token) return;
    try { localStorage.setItem(TOKEN_KEY, token); } catch (error) { setSync('この端末ではキーを保存できません。', true); return; }
    $('token-input').value = '';
    sync();
  });
  $('token-clear').addEventListener('click', () => { try { localStorage.removeItem(TOKEN_KEY); } catch (error) {} sync(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshDate(); sync(); } });
  window.addEventListener('focus', refreshDate);
  setInterval(refreshDate, 30000);
  save();
  render();
  sync();
})();
