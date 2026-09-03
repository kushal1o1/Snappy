(() => {
  'use strict';

  let snapshots = [];
  let settings = {
    sound: false,
    deleteAfterRestore: false,
    restoreTarget: 'this',
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function generateId() {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function generateSessionName() {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `Session ${month} ${day}, ${h}:${minutes} ${ampm}`;
  }

  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function playSound() {
    if (!settings.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  // Storage
  async function loadData() {
    const data = await API.storage.get(['snapshots', 'settings']);
    snapshots = data.snapshots || [];
    if (data.settings) {
      settings = { ...settings, ...data.settings };
    }
  }

  async function saveSnapshots() {
    await API.storage.set({ snapshots });
  }

  async function saveSettings() {
    await API.storage.set({ settings });
  }

  function removeSnapshot(id) {
    snapshots = snapshots.filter((s) => s.id !== id);
  }

  // Tabs
  async function captureCurrentTabs() {
    const tabs = await API.tabs.query({ currentWindow: true });
    return tabs.map((tab) => ({
      title: tab.title || '',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl || '',
    }));
  }

  async function restoreTabs(tabs) {
    if (tabs.length === 0) return;
    const newWindow = settings.restoreTarget === 'new';
    if (newWindow) {
      const win = await API.windows.create({ url: tabs[0].url });
      await Promise.all(
        tabs.slice(1).map((tab) => API.tabs.create({ windowId: win.id, url: tab.url }))
      );
    } else {
      await Promise.all(tabs.map((tab) => API.tabs.create({ url: tab.url })));
    }
  }

  // Render helpers
  function createEmptyState(filter) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';

    const img = document.createElement('img');
    img.src = 'icons/icon128.png';
    img.alt = '';
    img.className = 'empty-logo';

    const title = document.createElement('div');
    title.className = 'empty-title';
    title.textContent = filter ? 'No matches' : 'No snapshots yet';

    const desc = document.createElement('div');
    desc.className = 'empty-desc';
    desc.textContent = filter ? 'Try a different search' : 'Click the capture button to save your tabs';

    empty.append(img, title, desc);
    return empty;
  }

  function createMeta(s) {
    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const tabCount = document.createElement('span');
    tabCount.textContent = `${s.tabs.length} tab${s.tabs.length !== 1 ? 's' : ''}`;

    const time = document.createElement('span');
    time.textContent = formatRelativeTime(s.timestamp);

    meta.append(tabCount, time);

    if (s.oneTime) {
      const badge = document.createElement('span');
      badge.className = 'badge-onetime';
      badge.textContent = 'one-time';
      meta.appendChild(badge);
    }
    return meta;
  }

  function createActionButton(action, cls, title, glyph, id) {
    const btn = document.createElement('button');
    btn.className = cls;
    btn.dataset.action = action;
    btn.dataset.id = id;
    btn.title = title;
    btn.textContent = glyph;
    return btn;
  }

  function createActions(s) {
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      createActionButton('restore', 'btn-icon-action action-restore', 'Restore', '\u25b6', s.id),
      createActionButton('rename', 'btn-icon-action action-rename', 'Rename', '\u270e', s.id),
      createActionButton('delete', 'btn-icon-action btn-danger action-delete', 'Delete', '\u2715', s.id)
    );
    return actions;
  }

  function createTabItem(t, i, id) {
    const item = document.createElement('div');
    item.className = 'tab-item';

    if (t.favIconUrl) {
      const favicon = document.createElement('img');
      favicon.className = 'tab-favicon';
      favicon.src = t.favIconUrl;
      favicon.alt = '';
      item.appendChild(favicon);
    }

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = t.title || t.url;

    const btnRemove = createActionButton('removeTab', 'tab-remove', 'Remove tab', '\u2715', id);
    btnRemove.dataset.index = String(i);

    item.append(title, btnRemove);
    return item;
  }

  function createCard(s) {
    const card = document.createElement('div');
    card.className = 'snapshot-card';
    card.dataset.id = s.id;

    const header = document.createElement('div');
    header.className = 'card-header';

    const info = document.createElement('div');
    info.className = 'card-info';
    info.dataset.action = 'expand';
    info.dataset.id = s.id;

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = s.name;

    info.append(name, createMeta(s));
    header.append(info, createActions(s));

    const tabList = document.createElement('div');
    tabList.className = 'tab-list';
    s.tabs.forEach((t, i) => tabList.appendChild(createTabItem(t, i, s.id)));

    card.append(header, tabList);
    return card;
  }

  function renderSnapshots(filter = '') {
    const list = $('#snapshotList');
    const norm = (filter || '').toLowerCase();
    const filtered = norm
      ? snapshots.filter((s) => s.name.toLowerCase().includes(norm))
      : snapshots;

    list.textContent = '';

    if (filtered.length === 0) {
      list.appendChild(createEmptyState(filter));
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((s) => fragment.appendChild(createCard(s)));
    list.appendChild(fragment);
  }

  // Actions
  async function handleCapture() {
    const tabs = await captureCurrentTabs();
    snapshots.unshift({
      id: generateId(),
      name: generateSessionName(),
      oneTime: false,
      timestamp: Date.now(),
      tabs,
    });
    await saveSnapshots();
    playSound();
    renderSnapshots($('#searchInput').value);
  }

  async function handleRestore(id) {
    const snapshot = snapshots.find((s) => s.id === id);
    if (!snapshot) return;

    await restoreTabs(snapshot.tabs);

    if (snapshot.oneTime || settings.deleteAfterRestore) {
      removeSnapshot(id);
      await saveSnapshots();
    }

    playSound();
    renderSnapshots($('#searchInput').value);
  }

  async function handleDelete(id) {
    removeSnapshot(id);
    await saveSnapshots();
    renderSnapshots($('#searchInput').value);
  }

  async function handleRemoveTab(id, index) {
    const snapshot = snapshots.find((s) => s.id === id);
    if (!snapshot) return;

    snapshot.tabs.splice(index, 1);
    if (snapshot.tabs.length === 0) removeSnapshot(id);

    await saveSnapshots();
    renderSnapshots($('#searchInput').value);
  }

  function handleRename(id) {
    const card = document.querySelector(`.snapshot-card[data-id="${id}"]`);
    const nameEl = card.querySelector('.card-name');
    const snapshot = snapshots.find((s) => s.id === id);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = snapshot.name;

    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
      snapshot.name = input.value.trim() || snapshot.name;
      await saveSnapshots();
      renderSnapshots($('#searchInput').value);
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') input.blur();
      if (ev.key === 'Escape') {
        input.value = snapshot.name;
        input.blur();
      }
    });
  }

  // Card click handler
  const actionHandlers = {
    expand(target, id) {
      target.closest('.snapshot-card').classList.toggle('expanded');
    },
    restore: (t, id) => handleRestore(id),
    rename: (t, id) => handleRename(id),
    delete: (t, id) => handleDelete(id),
    removeTab: (target, id) => handleRemoveTab(id, parseInt(target.dataset.index, 10)),
  };

  function handleCardClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const { action, id } = target.dataset;
    const handler = actionHandlers[action];
    if (handler) {
      e.stopPropagation();
      handler(target, id);
    }
  }

  // Settings
  function applySettings() {
    $('#settingSound').checked = settings.sound;
    $('#settingDeleteAfterRestore').checked = settings.deleteAfterRestore;
    const radio = document.querySelector(`input[name="restoreTarget"][value="${settings.restoreTarget}"]`);
    if (radio) radio.checked = true;
  }

  function bindEvents() {
    $('#captureBtn').addEventListener('click', handleCapture);

    $('#searchToggle').addEventListener('click', () => {
      const bar = $('#searchBar');
      bar.classList.toggle('open');
      if (bar.classList.contains('open')) $('#searchInput').focus();
    });

    $('#settingsToggle').addEventListener('click', () => {
      $('#settingsPanel').classList.toggle('open');
    });

    const bindSetting = (selector, key) => {
      $(selector).addEventListener('change', (e) => {
        settings[key] = e.target.checked;
        saveSettings();
      });
    };
    bindSetting('#settingSound', 'sound');
    bindSetting('#settingDeleteAfterRestore', 'deleteAfterRestore');

    $$('input[name="restoreTarget"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        settings.restoreTarget = e.target.value;
        saveSettings();
      });
    });

    $('#searchInput').addEventListener('input', (e) => {
      renderSnapshots(e.target.value);
    });

    $('#snapshotList').addEventListener('click', handleCardClick);
  }

  async function init() {
    await loadData();
    applySettings();
    renderSnapshots();
    bindEvents();
  }

  init();
})();