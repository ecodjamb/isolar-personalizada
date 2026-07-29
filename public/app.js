const $ = (id) => document.getElementById(id);
const state = { devices: [], selected: null, timer: null };

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function error(target, message = '') {
  target.textContent = message;
  target.classList.toggle('hidden', !message);
}

function showAuthenticated(authenticated) {
  $('loginView').classList.toggle('hidden', authenticated);
  $('appView').classList.toggle('hidden', !authenticated);
  $('logoutBtn').classList.toggle('hidden', !authenticated);
}

function fmt(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function metric(label, value, unit = '') {
  return `<div class="metric"><div class="label">${label}</div><div class="value">${fmt(value)}${unit ? `<span class="unit">${unit}</span>` : ''}</div></div>`;
}

function renderDevices() {
  $('deviceList').innerHTML = state.devices.map((device) => {
    const isOnline = Number(device.onlineStatus) === 1;
    const active = state.selected === device.deviceSn ? 'active' : '';
    return `<button class="device ${active}" data-sn="${device.deviceSn}">
      <div class="name">${fmt(device.nickName, 'Equipo sin nombre')}</div>
      <div class="sn">SN ${fmt(device.deviceSn)}</div>
      <div class="device-bottom"><span class="${isOnline ? 'online' : 'offline'}">${isOnline ? '● En línea' : '● Sin conexión'}</span><strong>${fmt(device.pvInputPower, '0')} W FV</strong></div>
    </button>`;
  }).join('');
  document.querySelectorAll('.device').forEach((button) => button.addEventListener('click', () => selectDevice(button.dataset.sn)));
}

async function loadDevices() {
  error($('appError'));
  const data = await api('devices');
  state.devices = data.devices || [];
  $('counts').textContent = `${data.total ?? state.devices.length} equipos · ${data.online ?? 0} en línea · ${data.offline ?? 0} sin conexión`;
  renderDevices();
  if (state.devices.length && !state.selected) await selectDevice(state.devices[0].deviceSn);
}

async function selectDevice(sn) {
  state.selected = sn;
  renderDevices();
  const device = state.devices.find((item) => item.deviceSn === sn) || {};
  $('detail').classList.remove('hidden');
  $('detailName').textContent = fmt(device.nickName, 'Inversor');
  $('detailSn').textContent = `SN ${sn}`;
  await loadRealtime();
  clearInterval(state.timer);
  state.timer = setInterval(loadRealtime, 15000);
}

async function loadRealtime() {
  if (!state.selected) return;
  try {
    error($('appError'));
    $('liveStatus').textContent = 'Actualizando…';
    const [{ data }, summaryResult] = await Promise.all([
      api(`devices/${encodeURIComponent(state.selected)}/realtime`),
      api(`devices/${encodeURIComponent(state.selected)}/summary`).catch(() => ({ data: {} }))
    ]);
    const summary = summaryResult.data || {};
    $('liveStatus').textContent = Number(data.statusInverter) === 1 ? '● En línea' : 'Estado recibido';
    $('lastUpdate').textContent = `Último dato del inversor: ${fmt(data.currentTime || data.createTime)}`;
    $('metrics').innerHTML = [
      metric('Solar total', (Number(data.pvInputPower1 || 0) + Number(data.pvInputPower2 || 0)).toFixed(1), 'W'),
      metric('PV1', data.pvInputPower1, 'W'),
      metric('PV2', data.pvInputPower2, 'W'),
      metric('Consumo / salida', data.acOutputActivePowerTotal ?? summary.acOutputActivePowerR, 'W'),
      metric('Red', data.gridPowerInputActiveTotal, 'W'),
      metric('Batería', data.batteryCapacity, '%'),
      metric('Voltaje batería', data.batteryVoltage, 'V'),
      metric('Carga batería', data.batteryChargingPower, 'W'),
      metric('Descarga batería', data.batteryDischargingPower, 'W'),
      metric('Carga inversor', data.acOutputLoadTotal, '%'),
      metric('Temperatura', data.innerTemperature, '°C'),
      metric('Modo', summary.workMode || data.workMode)
    ].join('');
    $('rawData').textContent = JSON.stringify({ realtime: data, summary }, null, 2);
  } catch (err) {
    $('liveStatus').textContent = 'Error';
    error($('appError'), err.message);
    if (/sesión/i.test(err.message)) {
      clearInterval(state.timer);
      showAuthenticated(false);
    }
  }
}

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  error($('loginError'));
  $('loginBtn').disabled = true;
  $('loginBtn').textContent = 'Ingresando…';
  try {
    const result = await api('login', {
      method: 'POST',
      body: JSON.stringify({ username: $('username').value, password: $('password').value })
    });
    $('welcome').textContent = `Equipos de ${result.user.nickname}`;
    $('password').value = '';
    showAuthenticated(true);
    await loadDevices();
  } catch (err) {
    error($('loginError'), err.message);
  } finally {
    $('loginBtn').disabled = false;
    $('loginBtn').textContent = 'Ingresar';
  }
});

$('refreshBtn').addEventListener('click', async () => { await loadDevices(); if (state.selected) await loadRealtime(); });
$('logoutBtn').addEventListener('click', async () => {
  clearInterval(state.timer);
  await api('logout', { method: 'POST', body: '{}' }).catch(() => {});
  state.devices = []; state.selected = null;
  showAuthenticated(false);
});

(async () => {
  try {
    const session = await api('session');
    showAuthenticated(session.authenticated);
    if (session.authenticated) {
      $('welcome').textContent = `Equipos de ${session.user?.nickname || session.user?.username || ''}`;
      await loadDevices();
    }
  } catch {
    showAuthenticated(false);
  }
})();
