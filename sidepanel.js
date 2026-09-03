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
    const newWindow = settings.restoreTarget === 'new';
    if (newWindow) {
      const win = await API.windows.create({ url: tabs[0].url });
      for (let i = 1; i < tabs.length; i++) {
        await API.tabs.create({ windowId: win.id, url: tabs[i].url });
      }
    } else {
      for (const tab of tabs) {
        await API.tabs.create({ url: tab.url });
      }
    }
  }

  // Render
  function renderSnapshots(filter = '') {
    const list = $('#snapshotList');
    const filtered = filter
      ? snapshots.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
      : snapshots;

    list.textContent = '';

    if (filtered.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';

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

      emptyState.append(img, title, desc);
      list.appendChild(emptyState);
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const s of filtered) {
      const card = document.createElement('div');
      card.className = 'snapshot-card';
      card.dataset.id = s.id;

      // Header
      const header = document.createElement('div');
      header.className = 'card-header';

      const info = document.createElement('div');
      info.className = 'card-info';
      info.dataset.action = 'expand';
      info.dataset.id = s.id;

      const name = document.createElement('div');
      name.className = 'card-name';
      name.textContent = s.name;

      const meta = document.createElement('div');
      meta.className = 'card-meta';

      const tabCount = document.createElement('span');
      tabCount.textContent = `${s.tabs.length} tab${s.tabs.length !== 1 ? 's' : ''}`;

      const timeSpan = document.createElement('span');
      timeSpan.textContent = formatRelativeTime(s.timestamp);

      meta.append(tabCount, timeSpan);

      if (s.oneTime) {
        const badge = document.createElement('span');
        badge.className = 'badge-onetime';
        badge.textContent = 'one-time';
        meta.appendChild(badge);
      }

      info.append(name, meta);

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const btnRestore = document.createElement('button');
      btnRestore.className = 'btn-icon-action action-restore';
      btnRestore.dataset.action = 'restore';
      btnRestore.dataset.id = s.id;
      btnRestore.title = 'Restore';
      btnRestore.textContent = '\u25b6';

      const btnRename = document.createElement('button');
      btnRename.className = 'btn-icon-action action-rename';
      btnRename.dataset.action = 'rename';
      btnRename.dataset.id = s.id;
      btnRename.title = 'Rename';
      btnRename.textContent = '\u270e';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-icon-action btn-danger action-delete';
      btnDelete.dataset.action = 'delete';
      btnDelete.dataset.id = s.id;
      btnDelete.title = 'Delete';
      btnDelete.textContent = '\u2715';

      actions.append(btnRestore, btnRename, btnDelete);
      header.append(info, actions);

      // Tab list
      const tabList = document.createElement('div');
      tabList.className = 'tab-list';

      s.tabs.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = 'tab-item';

        if (t.favIconUrl) {
          const favicon = document.createElement('img');
          favicon.className = 'tab-favicon';
          favicon.src = t.favIconUrl;
          favicon.alt = '';
          item.appendChild(favicon);
        }

        const tabTitle = document.createElement('span');
        tabTitle.className = 'tab-title';
        tabTitle.textContent = t.title || t.url;

        const btnRemove = document.createElement('button');
        btnRemove.className = 'tab-remove';
        btnRemove.dataset.action = 'removeTab';
        btnRemove.dataset.id = s.id;
        btnRemove.dataset.index = String(i);
        btnRemove.title = 'Remove tab';
        btnRemove.textContent = '\u2715';

        item.append(tabTitle, btnRemove);
        tabList.appendChild(item);
      });

      card.append(header, tabList);
      fragment.appendChild(card);
    }

    list.appendChild(fragment);
  }

  // Actions
  async function handleCapture() {
    const tabs = await captureCurrentTabs();
    const snapshot = {
      id: generateId(),
      name: generateSessionName(),
      oneTime: false,
      timestamp: Date.now(),
      tabs,
    };
    snapshots.unshift(snapshot);
    await saveSnapshots();
    playSound();
    renderSnapshots($('#searchInput').value);
  }

  async function handleRestore(id) {
    const snapshot = snapshots.find((s) => s.id === id);
    if (!snapshot) return;

    await restoreTabs(snapshot.tabs);

    if (snapshot.oneTime || settings.deleteAfterRestore) {
      snapshots = snapshots.filter((s) => s.id !== id);
      await saveSnapshots();
    }

    playSound();
    renderSnapshots($('#searchInput').value);
  }

  async function handleDelete(id) {
    snapshots = snapshots.filter((s) => s.id !== id);
    await saveSnapshots();
    renderSnapshots($('#searchInput').value);
  }

  async function handleRemoveTab(id, index) {
    const snapshot = snapshots.find((s) => s.id === id);
    if (!snapshot) return;

    snapshot.tabs.splice(index, 1);

    if (snapshot.tabs.length === 0) {
      snapshots = snapshots.filter((s) => s.id !== id);
    }

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
      const newName = input.value.trim() || snapshot.name;
      snapshot.name = newName;
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
  function handleCardClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'expand') {
      target.closest('.snapshot-card').classList.toggle('expanded');
      return;
    }

    if (action === 'restore') {
      e.stopPropagation();
      handleRestore(id);
      return;
    }

    if (action === 'rename') {
      e.stopPropagation();
      handleRename(id);
      return;
    }

    if (action === 'delete') {
      e.stopPropagation();
      handleDelete(id);
      return;
    }

    if (action === 'removeTab') {
      e.stopPropagation();
      handleRemoveTab(id, parseInt(target.dataset.index, 10));
      return;
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

    $('#settingSound').addEventListener('change', (e) => {
      settings.sound = e.target.checked;
      saveSettings();
    });

    $('#settingDeleteAfterRestore').addEventListener('change', (e) => {
      settings.deleteAfterRestore = e.target.checked;
      saveSettings();
    });

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