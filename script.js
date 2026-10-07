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
        if (validDate(key) && value && typeof value === 'object') records[key] = { morning: value.morning === true, evening: value.evening === true };
      }
      return { startDate: saved.startDate, records };
    } catch (error) {
      storageAvailable = false;
      storageMessage = '保存データを読み込めません。この画面の記録は再読み込みで失われる可能性があります。';
      return { startDate: today, records: {} };
    }
  }
  let state = readState();
  const $ = id => document.getElementById(id);
  const achieved = (key, full = false) => { const record = state.records[key]; return Boolean(record && (full ? record.morning && record.evening : record.morning || record.evening)); };
  function streak(full = false) {
    let key = achieved(today, full) ? today : shiftDate(today, -1);
    let count = 0;
    while (key >= state.startDate && achieved(key, full)) { count++; key = shiftDate(key, -1); }
    return count;
  }
  function rewardCount() {
    let previous = null, run = 0, total = 0;
    const keys = Object.keys(state.records).filter(key => key >= state.startDate && key <= today && achieved(key, true)).sort();
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
    const dates = Array.from({ length: 30 }, (_, index) => shiftDate(state.startDate, index));
    const dayIndex = dates.indexOf(today);
    $('day-label').textContent = dayIndex >= 0 ? `DAY ${String(dayIndex + 1).padStart(2, '0')} / 30` : today > dates[29] ? '30日期間終了 / 記録継続中' : '開始日前';
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
    $('calendar-range').textContent = `${prettyDate(dates[0])} → ${prettyDate(dates[29])} / 初回起動日から30日間`;
    $('completed-count').textContent = `${String(dates.filter(key => achieved(key)).length).padStart(2, '0')} / 30 CLEAR`;
    $('calendar').replaceChildren(...dates.map((key, index) => {
      const done = achieved(key), full = achieved(key, true);
      const cell = document.createElement('div');
      cell.className = `day${done ? ' done' : ''}${full ? ' full' : ''}${key === today ? ' today' : ''}`;
      cell.setAttribute('role', 'listitem');
      cell.setAttribute('aria-label', `${index + 1}日目、${prettyDate(key)}、${full ? '朝夜フル達成' : done ? '達成' : '未達成'}${key === today ? '、今日' : ''}`);
      cell.title = cell.getAttribute('aria-label');
      if (key === today) cell.setAttribute('aria-current', 'date');
      cell.innerHTML = `<span class="day-number">${String(index + 1).padStart(2, '0')}</span>${done ? '<svg viewBox="0 0 80 64" aria-hidden="true"><use href="#cat-stamp"/></svg>' : ''}`;
      return cell;
    }));
    $('save-status').classList.toggle('error', !storageAvailable);
    if (!storageAvailable) $('save-status').textContent = storageMessage;
  }
  function refreshDate() {
    const current = dateKey(new Date());
    if (current !== today) { today = current; render(); if (storageAvailable) $('save-status').textContent = '日付が変わりました。今日の記録をどうぞ。'; }
  }
  for (const period of ['morning', 'evening']) {
    $(period).addEventListener('click', () => {
      refreshDate();
      const record = state.records[today] || { morning: false, evening: false };
      record[period] = !record[period];
      state.records[today] = record;
      const saved = save();
      render();
      if (saved) $('save-status').textContent = `${period === 'morning' ? '朝' : '夜'}の記録を${record[period] ? '保存' : '解除'}しました。`;
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      storageAvailable = true; storageMessage = ''; state = readState();
      render();
      if (storageAvailable) $('save-status').textContent = '別のタブの記録を反映しました。';
    }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDate(); });
  window.addEventListener('focus', refreshDate);
  setInterval(refreshDate, 30000);
  save();
  render();
})();
