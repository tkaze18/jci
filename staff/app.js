(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CATEGORIES = ['Design', 'Documentation', 'Meetings', 'Site visit', 'Procurement', 'Client presentation', 'Research', 'Admin', 'Business development', 'Training'];
  const COLORS = ['#E3232B', '#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#be185d', '#15803d', '#475569', '#0369a1', '#a16207'];
  const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
  const S = { sb: null, me: null, tab: 'track', projects: [], entries: [], timer: null, people: [], team: [], timers: [], settings: { lock_before: null, daily_hours: 8, weekly_hours: 40, weekly_target: 40 }, sheets: [], allSheets: [], apTab: 'pending', attOffset: -1, leaveTypes: [], holidays: [], myLeave: [], myAllow: [], allLeave: [], allAllow: [], leaveTab: 'requests', calMonth: null, holYear: null, myExp: [], allExp: [], expTab: 'pending', expMonth: '', finRange: 'month', rates: [], taskRates: [], lifeFin: null, plan: [], schOffset: 0, invoices: [], recurring: [], invTab: 'all', invId: null, cms: {}, cmsTab: 'articles', suppliers: [], bills: [], payTab: 'pay', projFilter: 'active', projFocus: null, hub: null, hubPid: null, hubView: 'board', hubWho: '', hubStage: '', myTasks: [], mtDone: false, enq: [], enqSt: 'open', enqKind: '', enqQ: '', jobs: [], jobView: 'all', jobStage: '', jobQ: '', jobSector: '', jobOwner: '', weekOffset: 0, range: 'week', fProj: '', fStaff: '' };
  const CFG = window.JCI_PORTAL || {};
  const HERE = location.origin + location.pathname;

  /* ---------- day / night (matches the website) ---------- */
  const h = new Date().getHours(); document.documentElement.dataset.theme = (h >= 6 && h < 19) ? 'light' : 'dark';

  /* ---------- helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const hm = mins => { mins = Math.max(0, Math.round(mins)); return `${Math.floor(mins / 60)}:${pad(mins % 60)}`; };
  const hrs = mins => (mins / 60).toFixed(mins >= 600 ? 0 : 1) + 'h';
  const clock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`; };
  const tstr = v => { const d = new Date(v); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const startOfWeek = (off = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7 + off * 7); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dayLabel = k => { if (k === dkey(new Date())) return 'Today'; if (k === dkey(addDays(new Date(), -1))) return 'Yesterday'; return fromKey(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }); };
  const initials = n => (n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const nextJobCode = () => 'J' + String(Math.max(0, ...S.projects.map(p => +((p.job_code || '').match(/^J0*(\d+)$/i) || [])[1] || 0), ...(S.jobs || []).map(j => +((j.job_number || '').match(/^J0*(\d+)$/i) || [])[1] || 0)) + 1).padStart(3, '0');
  const proj = id => S.projects.find(p => p.id === id) || { name: 'No project', color: '#9a9ca1' };
  const person = id => S.people.find(p => p.id === id) || (S.me && S.me.id === id ? S.me : null);
  const nameOf = id => { const p = person(id); return (p && (p.full_name || p.email)) || 'Team member'; };
  const MODULES = [
    ['Personal', [['track', 'Time tracking and timesheets'], ['leave', 'Time off'], ['expenses', 'Expenses']]],
    ['Business', [['enquiries', 'Website enquiries'], ['pipeline', 'Jobs and pipeline']]],
    ['Projects', [['pm', 'Project hub (stages, milestones, tasks for all)']]],
    ['Team', [['team', 'Team overview, attendance and reports'], ['approvals', 'Timesheet approvals'], ['team_leave', 'Team time off'], ['team_expenses', 'Team expenses'], ['schedule', 'Schedule'], ['forecast', 'Forecast'], ['profit', 'Profit and costs'], ['projects', 'Projects, budgets and rates']]],
    ['Billing', [['invoices', 'Invoices and recurring invoices'], ['payables', 'Payables (suppliers and bills)']]],
    ['Website', [['cms', 'Website content (articles, projects, careers, press)']]],
    ['Admin', [['people', 'People, roles and access'], ['settings', 'Workspace settings and hourly rates']]],
  ];
  const ALL_MODS = MODULES.flatMap(g => g[1].map(m => m[0]));
  const DEF_MODS = { admin: ALL_MODS, manager: ['track', 'leave', 'expenses', 'pipeline', 'enquiries', 'team', 'approvals', 'team_leave', 'team_expenses', 'profit', 'schedule', 'forecast', 'projects', 'pm'], staff: ['track', 'leave', 'expenses'] };
  const modsOf = p => !p ? [] : p.role === 'admin' ? ALL_MODS : (p.modules || DEF_MODS[p.role] || []);
  const can = m => !!S.me && S.me.active !== false && modsOf(S.me).includes(m);
  const isMgr = () => ['pm', 'team', 'approvals', 'team_leave', 'team_expenses', 'schedule', 'forecast', 'profit', 'projects', 'pipeline', 'invoices', 'people', 'enquiries'].some(can);
  const isAdmin = () => S.me && S.me.role === 'admin';
  const mins = e => e.minutes || 0;
  let toastT; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };
  document.addEventListener('error', e => {
    const im = e.target; if (!im || im.tagName !== 'IMG') return;
    if (im.dataset.hide !== undefined) { im.remove(); return; }
    if (im.dataset.fb) { if (!im.dataset.p && /\.jpg$/.test(im.src)) { im.dataset.p = '1'; im.src = im.src.replace(/\.jpg$/, '.png'); } else { const sp = document.createElement('span'); sp.className = im.dataset.fb + ' noimg'; sp.textContent = 'Image'; im.replaceWith(sp); } }
  }, true);
  const main = html => { $('#main').innerHTML = html; window.scrollTo(0, 0); };
  const chrome = on => document.body.classList.toggle('authed', !!on);
  const ICON = {
    track: '<path d="M12 7v5l3 2"/><circle cx="12" cy="13" r="8"/><path d="M9 2h6"/>',
    sheet: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h3M8 17h6"/>',
    mine: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.6 3.3-5.5 6.5-5.5s5.8 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.6c2.4.2 4 1.8 4.5 4.4"/>',
    reports: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 17v-3M12 17v-6M16 17v-2"/>',
    projects: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    people: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/><path d="M19 3v4M17 5h4"/>',
    alerts: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    approvals: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    attendance: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><circle cx="12" cy="15" r="3"/><path d="M12 14v1.2l.8.6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    leave: '<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    teamleave: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    expenses: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    teamexp: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/>',
    profit: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    schedule: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M13 17h4"/>',
    forecast: '<path d="M3 20h18"/><path d="M5 16l4-5 4 3 6-8"/><path d="M15 6h4v4" stroke-dasharray="2 2"/>',
    invoices: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    recurring: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    jobs: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    enquiries: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M22 6l-10 7L2 6"/>',
    cms: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M6 7h7M6 10h12M6 13h9"/>',
    payables: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5M15 16l2 2 3-3"/>',
    mytasks: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
    hub: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="11" rx="1"/><rect x="17" y="3" width="4" height="14" rx="1"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6"/>',
    data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    security: '<path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    out: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>',
  };
  const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
  const NAV = () => [
    ['My work', [['mytasks', 'My tasks'], ...(can('track') ? [['track', 'Track time'], ['sheet', 'Timesheet']] : []), ...(can('leave') ? [['leave', 'Time off']] : []), ...(can('expenses') ? [['expenses', 'Expenses']] : []), ['mine', 'My dashboard']]],
    ['Projects', can('pm') ? [['hub', 'Project hub']] : []],
    ['Business', [...(can('enquiries') ? [['enquiries', 'Enquiries']] : []), ...(can('pipeline') || S.jobs.length ? [['jobs', 'Jobs and pipeline']] : [])]],
    ['Team', [...(can('team') ? [['team', 'Team overview']] : []), ...(can('approvals') ? [['approvals', 'Approvals']] : []), ...(can('team_leave') ? [['teamleave', 'Team time off']] : []), ...(can('team_expenses') ? [['teamexp', 'Team expenses']] : []), ...(can('team') ? [['attendance', 'Attendance'], ['reports', 'Reports']] : []), ...(can('profit') ? [['profit', 'Profit and costs']] : []), ...(can('schedule') ? [['schedule', 'Schedule']] : []), ...(can('forecast') ? [['forecast', 'Forecast']] : []), ...(can('projects') ? [['projects', 'Projects']] : [])]],
    ['Website', can('cms') ? [['cms', 'Website content']] : []],
    ['Billing', [...(can('invoices') ? [['invoices', 'Invoices'], ['recurring', 'Recurring invoices']] : []), ...(can('payables') ? [['payables', 'Payables']] : [])]],
    ['Admin', [...(can('people') ? [['people', 'People and access']] : []), ...(can('settings') ? [['settings', 'Workspace settings'], ['data', 'Data and backups']] : [])]],
    ['Settings', [['account', 'My account'], ['alerts', 'Email alerts'], ['security', 'Two-step login']]],
  ].filter(g => g[1].length);
  const TITLE = { track: 'Track time', sheet: 'Timesheet', mine: 'My dashboard', team: 'Team overview', reports: 'Reports', projects: 'Projects', people: 'People and access', alerts: 'Email alerts', approvals: 'Approvals', attendance: 'Attendance', settings: 'Workspace settings', leave: 'Time off', teamleave: 'Team time off', expenses: 'Expenses', teamexp: 'Team expenses', profit: 'Profit and costs', schedule: 'Schedule', forecast: 'Forecast', jobs: 'Jobs and pipeline', enquiries: 'Enquiries', cms: 'Website content', security: 'Two-step login', payables: 'Payables', mytasks: 'My tasks', hub: 'Project hub', account: 'My account', data: 'Data and backups', invoices: 'Invoices', invoice: 'Invoice', recurring: 'Recurring invoices' };

  /* ---------- boot ---------- */
  async function boot(){
    if (!window.supabase || !CFG.SUPABASE_URL || CFG.SUPABASE_URL.includes('YOUR-PROJECT')) {
      chrome(false);
      return main(`<div class="notice"><h1>Staff portal not connected yet</h1><p class="sub">Add your Supabase project URL and anon key to <b>staff/config.js</b>, as described in the setup guide.</p></div>`);
    }
    const flow = /type=(invite|recovery)/.exec(location.hash)?.[1] || null;
    S.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    S.sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') showSetPassword('recovery'); if (ev === 'SIGNED_OUT') showLogin(); });
    const { data: { session } } = await S.sb.auth.getSession();
    if (flow && session) { history.replaceState(null, '', HERE); return showSetPassword(flow); }
    if (!session) return showLogin();
    await enter(session.user);
  }

  async function enter(user){
    if (!(await mfaGate())) return;
    const { data: me, error } = await S.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error || !me) { chrome(false); return main(`<div class="notice"><h1>Your account isn’t set up</h1><p class="sub">Ask your administrator to invite you to the staff portal.</p><button class="btn ghost" id="so">Sign out</button></div>`), $('#so').onclick = () => S.sb.auth.signOut(); }
    if (!me.active) { chrome(false); return main(`<div class="notice"><h1>Your access has been turned off</h1><p class="sub">Contact your administrator if you think this is a mistake.</p><button class="btn ghost" id="so">Sign out</button></div>`), $('#so').onclick = () => S.sb.auth.signOut(); }
    S.me = me; chrome(true);
    if (!can('track') && ['track', 'sheet'].includes(S.tab)) S.tab = 'mine';
    renderTop();
    await Promise.all([loadProjects(), loadMine(), loadTimer(), loadSettings(), loadSheets(), loadLeave(), loadMyExp(), loadPlan(), loadJobs(), loadEnq(), loadMyTasks(), loadFx()]);
    if (isMgr()) await loadTeam();
    { const allowed = NAV().flatMap(g => g[1].map(i => i[0])).concat(S.tab === 'invoice' && can('invoices') ? ['invoice'] : []); if (!allowed.includes(S.tab)) S.tab = can('track') ? 'track' : 'mine'; }
    renderTop(); render(true);
    clearInterval(S.tick); S.tick = setInterval(tick, 1000);
    clearInterval(S.poll); S.poll = setInterval(async () => { if (document.hidden) return; if (isMgr() && ['team', 'reports'].includes(S.tab)) { await loadTeam(); render(); } }, 30000);
  }

  /* ---------- auth screens ---------- */
  function authShell(inner){ chrome(false); main(`<div class="auth"><div class="auth-card"><div class="brand big"><img src="logo.png" alt="" data-hide><span>James Cubitt Interiors<small>Staff portal</small></span></div>${inner}</div><p class="auth-foot"><a href="../index.html">← Back to jamescubittinteriors.com</a></p></div>`); }
  function showLogin(msg){
    authShell(`<h1>Sign in</h1><p class="sub">Use the work email your administrator invited.</p>
      <form id="loginF" class="stack"><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label>
      <p class="form-msg" id="lMsg" role="alert">${esc(msg || '')}</p><button class="btn red full">Sign in</button></form>
      <button class="link" id="forgot">Forgot your password?</button>`);
    $('#loginF').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button'); b.disabled = true; $('#lMsg').textContent = '';
      const { data, error } = await S.sb.auth.signInWithPassword({ email: f.get('email').trim(), password: f.get('password') });
      b.disabled = false;
      if (error) return $('#lMsg').textContent = /invalid/i.test(error.message) ? 'That email and password don’t match. Check them and try again.' : /banned/i.test(error.message) ? 'Your access has been turned off. Contact your administrator.' : error.message;
      enter(data.user);
    };
    $('#forgot').onclick = showForgot;
  }
  function showForgot(){
    authShell(`<h1>Reset your password</h1><p class="sub">We’ll email you a link to choose a new password.</p>
      <form id="fF" class="stack"><label>Email<input type="email" name="email" autocomplete="email" required></label><p class="form-msg" id="fMsg" role="status"></p><button class="btn red full">Send reset link</button></form>
      <button class="link" id="back">Back to sign in</button>`);
    $('#fF').onsubmit = async e => {
      e.preventDefault(); const email = new FormData(e.target).get('email').trim();
      await S.sb.auth.resetPasswordForEmail(email, { redirectTo: HERE });
      $('#fMsg').textContent = 'If that email has a staff account, a reset link is on its way. Check your inbox.';
    };
    $('#back').onclick = () => showLogin();
  }
  function showSetPassword(kind){
    authShell(`<h1>${kind === 'invite' ? 'Welcome to the staff portal' : 'Choose a new password'}</h1><p class="sub">${kind === 'invite' ? 'Set a password to finish setting up your account.' : 'Enter a new password for your account.'}</p>
      <form id="pF" class="stack">${kind === 'invite' ? '<label>Your full name<input name="name" autocomplete="name" required></label>' : ''}<label>New password<input type="password" name="p1" minlength="10" autocomplete="new-password" required></label><label>Confirm password<input type="password" name="p2" minlength="10" autocomplete="new-password" required></label>
      <p class="form-msg" id="pMsg" role="alert"></p><button class="btn red full">Save password</button></form>`);
    $('#pF').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      if (f.get('p1') !== f.get('p2')) return $('#pMsg').textContent = 'The passwords don’t match.';
      if (String(f.get('p1')).length < 10) return $('#pMsg').textContent = 'Use at least 10 characters.';
      const { data, error } = await S.sb.auth.updateUser({ password: f.get('p1') });
      if (error) return $('#pMsg').textContent = error.message;
      if (f.get('name')) await S.sb.from('profiles').update({ full_name: String(f.get('name')).trim() }).eq('id', data.user.id);
      history.replaceState(null, '', HERE); toast('Password saved'); enter(data.user);
    };
  }

  /* ---------- data ---------- */
  const since = () => dkey(addDays(new Date(), -120));
  async function loadProjects(){ const { data } = await S.sb.from('projects').select('*').order('name'); S.projects = (data || []).sort((a, b) => (a.job_code || 'Z').localeCompare(b.job_code || 'Z', undefined, { numeric: true }) || a.name.localeCompare(b.name)); }
  async function loadMine(){ const { data } = await S.sb.from('time_entries').select('*').eq('user_id', S.me.id).gte('entry_date', since()).order('started_at', { ascending: false }).limit(2000); S.entries = data || []; }
  async function loadSettings(){ const { data } = await S.sb.from('settings').select('*').eq('id', 1).maybeSingle(); if (data) S.settings = data; }
  async function loadSheets(){ const { data } = await S.sb.from('timesheets').select('*').eq('user_id', S.me.id).gte('week_start', since()); S.sheets = data || []; }
  async function loadTimer(){ const { data } = await S.sb.from('timers').select('*').eq('user_id', S.me.id).maybeSingle(); S.timer = data || null; }
  async function loadTeam(){
    const [p, e, t, ts] = await Promise.all([
      S.sb.from('profiles').select('*').order('full_name'),
      S.sb.from('time_entries').select('*').gte('entry_date', since()).order('started_at', { ascending: false }).limit(10000),
      S.sb.from('timers').select('*'),
      S.sb.from('timesheets').select('*').gte('week_start', since()),
    ]);
    S.people = p.data || []; S.team = e.data || []; S.timers = t.data || []; S.allSheets = ts.data || [];
    await Promise.all([loadTeamLeave(), loadTeamExp(), loadRates(), loadTaskRates(), can('people') ? S.sb.rpc('mfa_overview').then(r => { S.mfaUsers = r.data || []; }) : null]);
  }

  async function startTimer(){
    const note = $('#tNote').value.trim(), project_id = $('#tProj').value, category = $('#tCat').value, billable = $('#tBill').checked;
    if (!project_id) { $('#tProj').focus(); return toast('Choose a project first'); }
    const row = { user_id: S.me.id, note, project_id, category, billable, started_at: new Date().toISOString(), reminded_at: null, reminder_count: 0 };
    const { error } = await S.sb.from('timers').upsert(row);
    if (error) return toast('Couldn’t start the timer. Try again.');
    S.timer = row; render(); toast('Timer started');
  }
  async function stopTimer(){
    const t = S.timer; if (!t) return;
    const end = Date.now(), start = +new Date(t.started_at);
    const ok = await saveEntry({ start, end, note: $('#tNote')?.value.trim() ?? t.note, project_id: $('#tProj')?.value || t.project_id, category: $('#tCat')?.value || t.category, billable: $('#tBill') ? $('#tBill').checked : t.billable });
    await S.sb.from('timers').delete().eq('user_id', S.me.id);
    S.timer = null; if (ok) toast('Time saved: ' + hm((end - start) / 60000));
    await loadMine(); render(true);
  }
  async function saveEntry({ id, start, end, note, project_id, category, billable }){
    const minutes = Math.round((end - start) / 60000);
    if (minutes < 1) { toast('Entries under a minute aren’t saved'); return false; }
    if (minutes > 1440) { toast('An entry can’t be longer than 24 hours'); return false; }
    const row = { started_at: new Date(start).toISOString(), ended_at: new Date(end).toISOString(), minutes, entry_date: dkey(new Date(start)), note: note || '', project_id: project_id || null, category: category || '', billable: !!billable };
    const { error } = id ? await S.sb.from('time_entries').update(row).eq('id', id) : await S.sb.from('time_entries').insert({ ...row, user_id: S.me.id });
    if (error) { toast(errText(error)); return false; }
    return true;
  }
  const weekKey = k => dkey(startOfWeekOf(fromKey(k)));
  function startOfWeekOf(d){ const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  const mySheet = wk => S.sheets.find(t => t.week_start === wk);
  const lockReason = k => {
    if (isAdmin()) return '';
    if (S.settings.lock_before && k < S.settings.lock_before) return 'Locked by admin';
    const t = mySheet(weekKey(k)); if (t && (t.status === 'submitted' || t.status === 'approved')) return t.status === 'approved' ? 'Approved' : 'Submitted';
    return '';
  };
  const errText = e => /locked|submitted|approved|manager/i.test(e?.message || '') ? e.message : 'Couldn’t save this entry. Try again.';
  async function deleteEntry(id){
    if (!confirm('Delete this time entry?')) return;
    const { error } = await S.sb.from('time_entries').delete().eq('id', id);
    if (error) return toast(/locked|submitted/i.test(error.message || '') ? error.message : 'Couldn’t delete. Try again.');
    toast('Entry deleted'); await loadMine(); render(true);
  }

  /* ---------- top bar ---------- */
  function renderTop(){
    $('#nav').innerHTML = NAV().map(([h, items]) => `<div class="nav-group"><p>${h}</p>${items.map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k || (k === 'invoices' && S.tab === 'invoice') ? 'on' : ''}" ${S.tab === k ? 'aria-current="page"' : ''}>${ico(k)}<span>${l}</span>${k === 'track' ? '<em class="nav-clock" id="navClock" hidden></em>' : ''}${k === 'approvals' && pendingCount() ? `<em class="nav-count">${pendingCount()}</em>` : ''}${k === 'teamleave' && pendingLeave() ? `<em class="nav-count">${pendingLeave()}</em>` : ''}${k === 'teamexp' && pendingExp() ? `<em class="nav-count">${pendingExp()}</em>` : ''}${k === 'mytasks' && myOpenTasks() ? `<em class="nav-count">${myOpenTasks()}</em>` : ''}${k === 'enquiries' && newEnq() ? `<em class="nav-count">${newEnq()}</em>` : ''}</button>`).join('')}</div>`).join('');
    $$('#nav [data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
    $('#who').innerHTML = `<span class="av"></span><span class="who-t"><b></b><small></small></span><button class="icon" id="signout" title="Sign out" aria-label="Sign out">${ico('out')}</button>`;
    $('#who .av').textContent = initials(S.me.full_name || S.me.email);
    $('#who b').textContent = S.me.full_name || S.me.email;
    $('#who small').textContent = ROLE_LABEL[S.me.role];
    $('#signout').onclick = () => S.sb.auth.signOut();
    $('#pageTitle').textContent = TITLE[S.tab];
    tick();
  }
  async function go(tab){
    if (tab === 'projects') S.lifeFin = null;
    if (['invoices', 'recurring'].includes(tab) && can('invoices')) await loadInvoices();
    if (tab === 'enquiries') await loadEnq();
    if (tab === 'cms') await loadCMS();
    if (['schedule', 'forecast', 'mine'].includes(tab)) await loadPlan();
    if (tab === 'jobs') await loadJobs();
    S.tab = tab; closeMenu(); renderTop();
    if (['team', 'reports', 'people', 'projects', 'approvals', 'attendance', 'settings', 'teamleave', 'teamexp', 'profit', 'schedule', 'forecast', 'data'].includes(tab) && isMgr()) { main('<div class="notice"><p class="sub">Loading…</p></div>'); await loadTeam(); renderTop(); }
    render(true);
  }
  const openMenu = () => { document.body.classList.add('menu-open'); $('#menuBtn').setAttribute('aria-expanded', 'true'); };
  const closeMenu = () => { document.body.classList.remove('menu-open'); $('#menuBtn')?.setAttribute('aria-expanded', 'false'); };
  document.addEventListener('click', e => { if (e.target.closest('#topClock')) { const t = document.querySelector('[data-tab=track]'); if (t) t.click(); return; } if (e.target.closest('#menuBtn')) openMenu(); else if (e.target.closest('#scrim')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  function renderAlerts(){
    const m = S.me, row = (k, t, d) => `<label class="alert-row"><span><b>${t}</b><small>${d}</small></span><span class="switch"><input type="checkbox" data-n="${k}" ${m[k] !== false ? 'checked' : ''}><i></i></span></label>`;
    main(`<div class="head"><div><h1>Email alerts</h1><p class="sub">Choose which emails you receive at <b></b>.</p></div></div>
      <div class="card alerts">
        ${row('notify_daily', 'Daily summary', 'Weekdays at 6:30pm: what you logged today, or a reminder if you logged nothing.')}
        ${row('notify_weekly', 'Weekly summary', 'Fridays at 5pm: your hours by day and by project.')}
        ${row('notify_running', 'Timer reminders', 'If your timer has been running for 4 hours or more, so a forgotten timer doesn’t inflate your hours.')}
        ${isMgr() ? row('notify_team', 'Team reports', 'Daily and weekly team summaries, including who hasn’t logged time. The weekly one has a spreadsheet attached.') : ''}
      </div>
      <div class="card" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap"><span><b style="font-weight:500">Check your emails arrive</b><br><span class="sub">We’ll send today’s summary to you now.</span></span><button class="btn ghost" id="testMail">Send me a test email</button></div>`);
    $('.head .sub b').textContent = m.email;
    $$('[data-n]').forEach(c => c.onchange = async () => {
      const k = c.dataset.n, v = c.checked; const { error } = await S.sb.from('profiles').update({ [k]: v }).eq('id', m.id);
      if (error) { c.checked = !v; return toast('Couldn’t save that. Try again.'); }
      m[k] = v; toast(v ? 'Alert turned on' : 'Alert turned off');
    });
    $('#testMail').onclick = async e => {
      const b = e.currentTarget; b.disabled = true;
      const { error } = await S.sb.functions.invoke('notify', { body: { job: 'test' } });
      b.disabled = false; toast(error ? 'The email couldn’t be sent. Ask your admin to check the email setup.' : 'Test email sent to ' + m.email);
    };
  }

  function render(force){
    if (!S.me) return;
    if (S.tab === 'track') { if (force || !$('#tNote')) renderTrack(); else refreshTrack(); }
    else if (S.tab === 'sheet') renderSheet();
    else if (S.tab === 'mine') renderMine();
    else if (S.tab === 'team') renderTeam();
    else if (S.tab === 'reports') { if (force || !$('#rBody')) renderReports(); else renderReportBody(); }
    else if (S.tab === 'projects') renderProjects();
    else if (S.tab === 'people') renderPeople();
    else if (S.tab === 'alerts') renderAlerts();
    else if (S.tab === 'approvals') renderApprovals();
    else if (S.tab === 'attendance') renderAttendance();
    else if (S.tab === 'settings') renderSettings();
    else if (S.tab === 'leave') renderLeave();
    else if (S.tab === 'teamleave') renderTeamLeave();
    else if (S.tab === 'expenses') renderExpenses();
    else if (S.tab === 'teamexp') renderTeamExp();
    else if (S.tab === 'profit') renderProfit();
    else if (S.tab === 'schedule') renderSchedule();
    else if (S.tab === 'jobs') renderJobs();
    else if (S.tab === 'enquiries') renderEnquiries();
    else if (S.tab === 'cms') renderCMS();
    else if (S.tab === 'security') renderSecurity();
    else if (S.tab === 'account') renderAccount();
    else if (S.tab === 'mytasks') renderMyTasks();
    else if (S.tab === 'payables') renderPayables();
    else if (S.tab === 'hub') renderHub();
    else if (S.tab === 'data') renderData();
    else if (S.tab === 'forecast') renderForecast();
    else if (S.tab === 'invoices') renderInvoices();
    else if (S.tab === 'invoice') viewInvoice(S.invId);
    else if (S.tab === 'recurring') renderRecurring();
  }
  const projOptions = (sel, all) => `<option value="">${all ? 'All projects' : 'Select project'}</option>` + S.projects.filter(p => !p.archived || p.id === sel).map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${p.job_code ? esc(p.job_code) + ' · ' : p.status === 'pipeline' ? 'Proposal · ' : ''}${esc(p.name)}${p.client ? ' · ' + esc(p.client) : ''}</option>`).join('');
  const catOptions = sel => CATEGORIES.map(c => `<option${c === sel ? ' selected' : ''}>${c}</option>`).join('');

  /* ---------- track ---------- */
  function renderTrack(){
    const t = S.timer || {}, today = dkey(new Date());
    main(`<div class="head"><div><h1>Track time</h1><p class="sub">Start the timer when you begin a task, or add time you’ve already worked.</p></div></div>
      <div class="card" id="noProj" style="margin-bottom:14px" ${S.projects.length ? 'hidden' : ''}>No projects yet. ${isMgr() ? 'Add your first project in the Projects tab.' : 'Ask a manager to add projects before you track time.'}</div>
      <div class="timer" id="timerBox">
        <input type="text" id="tNote" placeholder="What are you working on?" value="${esc(t.note || '')}" aria-label="Task description" maxlength="500">
        <select id="tProj" aria-label="Project">${projOptions(t.project_id)}</select>
        <select id="tCat" aria-label="Category">${catOptions(t.category || 'Design')}</select>
        <label class="bill"><input type="checkbox" id="tBill" ${t.billable === false ? '' : 'checked'}>Billable</label>
        <div style="display:flex;align-items:center;gap:12px"><span class="clock" id="clk">00:00:00</span><button class="btn startbtn" id="tBtn">Start</button></div>
      </div>
      <details class="manual"><summary>Add time manually</summary>
        <form class="f card" id="manForm">
          <label class="c3">Description<input name="note" maxlength="500" placeholder="e.g. Ground floor layout revisions"></label>
          <label class="c3">Project<select name="project_id" required>${projOptions('')}</select></label>
          <label class="c2">Date<input type="date" name="date" value="${today}" max="${today}" required></label>
          <label>Start<input type="time" name="from" value="09:00" required></label>
          <label>End<input type="time" name="to" value="10:00" required></label>
          <label>Category<select name="category">${catOptions('Design')}</select></label>
          <label class="bill" style="align-self:center;margin-top:16px"><input type="checkbox" name="billable" checked>Billable</label>
          <div class="c6" style="display:flex;justify-content:flex-end"><button class="btn" type="submit">Add entry</button></div>
        </form>
      </details>
      <div id="days"></div>`);
    $('#tBtn').onclick = () => S.timer ? stopTimer() : startTimer();
    $('#tNote').addEventListener('keydown', e => { if (e.key === 'Enter' && !S.timer) startTimer(); });
    $('#manForm').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), [s, en] = spanFrom(f);
      if (!f.get('project_id')) return toast('Choose a project');
      if (await saveEntry({ start: s, end: en, note: f.get('note'), project_id: f.get('project_id'), category: f.get('category'), billable: f.get('billable') === 'on' })) { toast('Entry added'); e.target.reset(); await loadMine(); refreshTrack(); }
    };
    refreshTrack();
  }
  const spanFrom = f => { const d = fromKey(f.get('date')), [h1, m1] = f.get('from').split(':').map(Number), [h2, m2] = f.get('to').split(':').map(Number); const s = new Date(d); s.setHours(h1, m1); const e = new Date(d); e.setHours(h2, m2); if (e <= s) e.setDate(e.getDate() + 1); return [+s, +e]; };
  function refreshTrack(){
    const box = $('#timerBox'); if (!box) return;
    $('#noProj').hidden = S.projects.length > 0;
    box.classList.toggle('running', !!S.timer);
    const b = $('#tBtn'); b.textContent = S.timer ? 'Stop' : 'Start'; b.classList.toggle('red', !!S.timer);
    tick();
    const byDay = {}; S.entries.forEach(e => (byDay[e.entry_date] ||= []).push(e));
    const days = Object.keys(byDay).sort().reverse().slice(0, 14);
    $('#days').innerHTML = days.length ? days.map(k => { const list = byDay[k].sort((a, c) => +new Date(c.started_at) - +new Date(a.started_at)); return `<section class="day"><div class="day-h"><span>${dayLabel(k)}</span><span>Total <b>${hm(list.reduce((s, e) => s + mins(e), 0))}</b></span></div><div class="rows">${list.map(entryRow).join('')}</div></section>`; }).join('')
      : `<div class="card empty" style="margin-top:18px">Your tracked time will appear here. Start the timer or add an entry to begin.</div>`;
    $$('[data-edit]').forEach(b => b.onclick = () => openEdit(b.dataset.edit));
    $$('[data-del]').forEach(b => b.onclick = () => deleteEntry(b.dataset.del));
    $$('[data-again]').forEach(b => b.onclick = () => { const e = S.entries.find(x => x.id === b.dataset.again); if (!e || S.timer) return; $('#tNote').value = e.note; $('#tProj').innerHTML = projOptions(e.project_id); $('#tCat').innerHTML = catOptions(e.category); $('#tBill').checked = e.billable; startTimer(); });
  }
  const entryRow = e => { const p = proj(e.project_id); return `<div class="row"><div class="what"><b>${esc(e.note || e.category || 'Untitled task')}</b><span class="tag"><span class="dot" style="background:${esc(p.color)}"></span>${p.job_code ? `<b class="jc">${esc(p.job_code)}</b> ` : ''}${esc(p.name)}${e.category ? ' · ' + esc(e.category) : ''}${e.billable ? ' · <span style="color:var(--ok)">Billable</span>' : ''}</span></div><span class="span">${tstr(e.started_at)} – ${tstr(e.ended_at)}</span><span class="dur">${hm(e.minutes)}</span><span style="display:flex">${S.timer ? '' : `<button class="icon" data-again="${e.id}" title="Continue this task" aria-label="Continue this task">▶</button>`}${lockReason(e.entry_date) ? `<span class="lockchip" title="${lockReason(e.entry_date)}: this week can’t be edited">${ico('lock')}</span>` : `<button class="icon" data-edit="${e.id}" title="Edit" aria-label="Edit entry">✎</button><button class="icon" data-del="${e.id}" title="Delete" aria-label="Delete entry">×</button>`}</span></div>`; };
  function tick(){
    const c = $('#clk'); if (c) c.textContent = S.timer ? clock(Date.now() - +new Date(S.timer.started_at)) : '00:00:00';
    const nc = $('#navClock'); if (nc) { nc.hidden = !S.timer; if (S.timer) nc.textContent = clock(Date.now() - +new Date(S.timer.started_at)); }
    const tc = $('#topClock'); if (tc) { tc.hidden = !S.timer; if (S.timer) tc.textContent = clock(Date.now() - +new Date(S.timer.started_at)); }
    document.title = S.timer ? clock(Date.now() - +new Date(S.timer.started_at)) + ' · JCI Staff Portal' : 'JCI Staff Portal';
    $$('[data-live]').forEach(el => { const t = S.timers.find(x => x.user_id === el.dataset.live); if (t) el.textContent = clock(Date.now() - +new Date(t.started_at)); });
  }
  function openEdit(id){
    const e = S.entries.find(x => x.id === id); if (!e) return;
    $('#editForm').innerHTML = `<h2 class="c6">Edit entry</h2>
      <label class="c6">Description<input name="note" maxlength="500" value="${esc(e.note)}"></label>
      <label class="c3">Project<select name="project_id">${projOptions(e.project_id)}</select></label>
      <label class="c3">Category<select name="category">${catOptions(e.category)}</select></label>
      <label class="c2">Date<input type="date" name="date" value="${e.entry_date}" required></label>
      <label>Start<input type="time" name="from" value="${tstr(e.started_at)}" required></label>
      <label>End<input type="time" name="to" value="${tstr(e.ended_at)}" required></label>
      <label class="bill c2" style="margin-top:16px"><input type="checkbox" name="billable" ${e.billable ? 'checked' : ''}>Billable</label>
      <div class="c6" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="save">Save changes</button></div>`;
    const dlg = $('#editDlg'); dlg.showModal();
    $('#editForm').onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return;
      ev.preventDefault(); const f = new FormData(ev.target), [s, en] = spanFrom(f);
      if (await saveEntry({ id, start: s, end: en, note: f.get('note'), project_id: f.get('project_id'), category: f.get('category'), billable: f.get('billable') === 'on' })) { dlg.close(); toast('Changes saved'); await loadMine(); render(true); }
    };
  }

  /* ---------- timesheet ---------- */
  function renderSheet(){
    const s = startOfWeek(S.weekOffset), wk = dkey(s), days = [...Array(7)].map((_, i) => dkey(addDays(s, i))), rows = {};
    const wkEntries = S.entries.filter(e => days.includes(e.entry_date));
    wkEntries.forEach(e => { const r = rows[e.project_id] ||= Array(7).fill(0); r[days.indexOf(e.entry_date)] += mins(e); });
    const colT = days.map((_, i) => Object.values(rows).reduce((a, r) => a + r[i], 0)), tot = colT.reduce((a, b) => a + b, 0);
    const att = attendance(wkEntries, days), sh = mySheet(wk), st = sh?.status || 'draft';
    const lockedByAdmin = !isAdmin() && S.settings.lock_before && days[6] < S.settings.lock_before;
    const offM = offMinutes(S.me.id, days, S.myLeave), target = Math.max(0, Number(S.settings.weekly_target || 40) * 60 - offM);
    const statusBox = lockedByAdmin ? `<div class="sheet-status st-locked">${ico('lock')}<span><b>Locked</b><small>Time before ${fromKey(S.settings.lock_before).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} is locked by your admin.</small></span></div>`
      : st === 'approved' ? `<div class="sheet-status st-approved">${ico('approvals')}<span><b>Approved</b><small>Approved by ${esc(nameOf(sh.reviewed_by))}${sh.reviewed_at ? ' on ' + new Date(sh.reviewed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}. This week is locked.</small></span></div>`
      : st === 'submitted' ? `<div class="sheet-status st-submitted">${ico('lock')}<span><b>Waiting for approval</b><small>Submitted ${new Date(sh.submitted_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}. Entries are locked while your manager reviews them.</small></span><button class="btn ghost sm" id="withdraw">Withdraw</button></div>`
      : `<div class="sheet-status ${st === 'rejected' ? 'st-rejected' : ''}"><span><b>${st === 'rejected' ? 'Sent back for changes' : 'Not submitted yet'}</b><small>${st === 'rejected' && sh.comment ? 'Note from ' + esc(nameOf(sh.reviewed_by)) + ': “' + esc(sh.comment) + '”' : `${tot < target ? hm(target - tot) + ' short of your ' + hm(target) + ' target this week' + (offM ? ' (adjusted for leave and holidays)' : '') + '. ' : 'Weekly target met. '}Check your entries, then submit the week for approval.`}</small></span><button class="btn red" id="submitWk" ${S.weekOffset > 0 ? 'disabled' : ''}>Submit week</button></div>`;
    main(`<div class="head"><div><h1>Timesheet</h1><p class="sub">${s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${addDays(s, 6).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
      <div style="display:flex;gap:6px"><button class="btn ghost sm" id="wPrev">‹ Previous</button><button class="btn ghost sm" id="wNow">This week</button><button class="btn ghost sm" id="wNext" ${S.weekOffset >= 0 ? 'disabled' : ''}>Next ›</button></div></div>
      ${statusBox}
      <div class="card scroll"><table class="sheet"><thead><tr><th>Project</th>${days.map(k => `<th>${fromKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</th>`).join('')}<th>Total</th></tr></thead>
      <tbody>${Object.keys(rows).length ? Object.entries(rows).map(([pid, r]) => { const p = proj(pid === 'null' ? null : pid); return `<tr><td><span class="tag" style="color:var(--ink)"><span class="dot" style="background:${esc(p.color)}"></span>${p.job_code ? `<span class="jcode">${esc(p.job_code)}</span>` : ''}${esc(p.name)}</span></td>${r.map(m => `<td class="${m ? '' : 'z'}">${m ? hm(m) : '–'}</td>`).join('')}<td><b>${hm(r.reduce((a, b) => a + b, 0))}</b></td></tr>`; }).join('') : `<tr><td colspan="9" class="empty">No time tracked this week.</td></tr>`}</tbody>
      <tfoot><tr><td>Total</td>${colT.map(m => `<td>${m ? hm(m) : '–'}</td>`).join('')}<td>${hm(tot)}</td></tr>
        <tr class="att"><td>In – out</td>${att.days.map(d => `<td>${d.first ? tstr(d.first) + '–' + tstr(d.last) : holName(d.k) ? '<span class="offtag">Holiday</span>' : leaveOn(S.me.id, d.k, S.myLeave) ? `<span class="offtag">${esc(ltype(leaveOn(S.me.id, d.k, S.myLeave).type_id).name.replace(/ leave$/i, ''))}</span>` : '–'}</td>`).join('')}<td></td></tr>
        <tr class="att"><td>Overtime</td>${att.days.map(d => `<td class="${d.ot ? 'ot' : 'z'}">${d.ot ? '+' + hm(d.ot) : '–'}</td>`).join('')}<td class="${att.weekOt ? 'ot' : ''}">${att.weekOt ? '+' + hm(att.weekOt) : '–'}</td></tr></tfoot></table></div>
      <p class="sub" style="margin-top:10px;font-size:12px">Overtime counts time over ${S.settings.daily_hours} hours in a day or ${S.settings.weekly_hours} hours in a week, whichever is greater.</p>`);
    $('#wPrev').onclick = () => { S.weekOffset--; renderSheet(); };
    $('#wNext').onclick = () => { if (S.weekOffset < 0) { S.weekOffset++; renderSheet(); } };
    $('#wNow').onclick = () => { S.weekOffset = 0; renderSheet(); };
    if ($('#submitWk')) $('#submitWk').onclick = async e => {
      if (!tot && !confirm('You have no time logged this week. Submit anyway?')) return;
      e.currentTarget.disabled = true;
      const { error } = await S.sb.from('timesheets').upsert({ user_id: S.me.id, week_start: wk, status: 'submitted' });
      if (error) { toast(error.message || 'Couldn’t submit. Try again.'); e.currentTarget.disabled = false; return; }
      S.sb.functions.invoke('notify', { body: { job: 'event', kind: 'submitted', user_id: S.me.id, week_start: wk } }).catch(() => {});
      await loadSheets(); toast('Week submitted for approval'); renderTop(); renderSheet();
    };
    if ($('#withdraw')) $('#withdraw').onclick = async () => {
      const { error } = await S.sb.from('timesheets').update({ status: 'draft' }).eq('user_id', S.me.id).eq('week_start', wk);
      if (error) return toast(error.message || 'Couldn’t withdraw. Try again.');
      await loadSheets(); toast('Week withdrawn. You can edit it again.'); renderSheet();
    };
  }

  /* ---------- attendance & overtime ---------- */
  function attendance(list, days){
    const dLim = Number(S.settings.daily_hours || 8) * 60, wLim = Number(S.settings.weekly_hours || 40) * 60;
    const out = days.map(k => { const l = list.filter(e => e.entry_date === k), w = sum(l);
      return { k, worked: w, first: l.length ? l.reduce((a, e) => e.started_at < a ? e.started_at : a, l[0].started_at) : null, last: l.length ? l.reduce((a, e) => e.ended_at > a ? e.ended_at : a, l[0].ended_at) : null, ot: Math.max(0, w - dLim) }; });
    const tot = out.reduce((a, d) => a + d.worked, 0), dailyOt = out.reduce((a, d) => a + d.ot, 0);
    return { days: out, total: tot, weekOt: Math.max(dailyOt, tot - wLim, 0) };
  }
  function renderAttendance(){
    const s = startOfWeek(S.attOffset), days = [...Array(7)].map((_, i) => dkey(addDays(s, i)));
    const people = S.people.filter(p => p.active);
    const rows = people.map(p => ({ p, a: attendance(S.team.filter(e => e.user_id === p.id && days.includes(e.entry_date)), days) }));
    main(`<div class="head"><div><h1>Attendance</h1><p class="sub">${s.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${addDays(s, 6).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} · first start and last finish each day, from tracked time</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="aPrev">‹ Previous</button><button class="btn ghost sm" id="aNow">This week</button><button class="btn ghost sm" id="aNext" ${S.attOffset >= 0 ? 'disabled' : ''}>Next ›</button><button class="btn sm" id="aCsv">Export CSV</button></div></div>
      <div class="grid g4" style="margin-bottom:14px">${kpi('Team hours', hm(rows.reduce((a, r) => a + r.a.total, 0)), people.length + ' people')}${kpi('Overtime', hm(rows.reduce((a, r) => a + r.a.weekOt, 0)), rows.filter(r => r.a.weekOt).length + ' people with overtime')}${kpi('Days worked', rows.reduce((a, r) => a + r.a.days.filter(d => d.worked).length, 0), 'across the team')}${kpi('No time logged', rows.filter(r => !r.a.total).length, 'people this week')}</div>
      <div class="card scroll"><table class="sheet att-table"><thead><tr><th>Name</th>${days.map(k => `<th>${fromKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</th>`).join('')}<th>Total</th><th>Overtime</th></tr></thead><tbody>
      ${rows.length ? rows.map(({ p, a }) => `<tr><td>${esc(p.full_name || p.email)}</td>${a.days.map(d => `<td class="${d.worked ? (d.ot ? 'ot' : '') : 'z'}">${d.worked ? `<b>${hm(d.worked)}</b><small>${tstr(d.first)}–${tstr(d.last)}</small>` : holName(d.k) ? '<span class="offtag">Holiday</span>' : leaveOn(p.id, d.k, S.allLeave) ? '<span class="offtag">Leave</span>' : '–'}</td>`).join('')}<td><b>${hm(a.total)}</b></td><td class="${a.weekOt ? 'ot' : 'z'}">${a.weekOt ? '+' + hm(a.weekOt) : '–'}</td></tr>`).join('') : '<tr><td colspan="10" class="empty">No team members yet.</td></tr>'}</tbody></table></div>
      <p class="sub" style="margin-top:10px;font-size:12px">Red cells are over ${S.settings.daily_hours} hours in a day. Weekly overtime is time over ${S.settings.weekly_hours} hours, or the daily overtime if that’s greater. Change these in Workspace settings.</p>`);
    $('#aPrev').onclick = () => { S.attOffset--; renderAttendance(); };
    $('#aNext').onclick = () => { if (S.attOffset < 0) { S.attOffset++; renderAttendance(); } };
    $('#aNow').onclick = () => { S.attOffset = 0; renderAttendance(); };
    $('#aCsv').onclick = () => {
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, lines = ['Name,Email,Date,First start,Last finish,Hours,Overtime hours'];
      rows.forEach(({ p, a }) => a.days.forEach(d => { if (d.worked) lines.push([p.full_name, p.email, d.k, tstr(d.first), tstr(d.last), (d.worked / 60).toFixed(2), (d.ot / 60).toFixed(2)].map(q).join(',')); }));
      const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv' })); el.download = `jci-attendance-${days[0]}.csv`; el.click(); setTimeout(() => URL.revokeObjectURL(el.href), 2000);
    };
  }

  /* ---------- approvals ---------- */
  const pendingCount = () => can('approvals') ? S.allSheets.filter(t => t.status === 'submitted' && t.user_id !== S.me.id).length : 0;
  function renderApprovals(){
    const lastWk = dkey(startOfWeek(-1)), active = S.people.filter(p => p.active);
    const tabs = [['pending', 'Waiting', S.allSheets.filter(t => t.status === 'submitted').length], ['missing', 'Not submitted', 0], ['approved', 'Approved', 0], ['rejected', 'Sent back', 0]];
    const missing = active.filter(p => !S.allSheets.some(t => t.user_id === p.id && t.week_start === lastWk && (t.status === 'submitted' || t.status === 'approved')));
    tabs[1][2] = missing.length;
    const list = S.apTab === 'missing' ? [] : S.allSheets.filter(t => t.status === (S.apTab === 'pending' ? 'submitted' : S.apTab)).sort((a, b) => b.week_start.localeCompare(a.week_start));
    const wkLabel = k => `${fromKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${addDays(fromKey(k), 6).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
    const weekMins = (uid, k) => sum(S.team.filter(e => e.user_id === uid && e.entry_date >= k && e.entry_date <= dkey(addDays(fromKey(k), 6))));
    main(`<div class="head"><div><h1>Approvals</h1><p class="sub">Review submitted timesheets. Approving a week locks it.</p></div>${S.apTab === 'pending' && list.filter(t => t.user_id !== S.me.id || isAdmin()).length > 1 ? '<button class="btn" id="approveAll">Approve all</button>' : ''}</div>
      <div class="seg">${tabs.map(([k, l, n]) => `<button data-ap="${k}" class="${S.apTab === k ? 'on' : ''}">${l}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
      <div class="card" style="margin-top:14px">${S.apTab === 'missing'
        ? (missing.length ? `<p class="sub" style="margin-bottom:6px">Last week (${wkLabel(lastWk)})</p>` + missing.map(p => `<div class="aprow"><span class="av">${esc(initials(p.full_name || p.email))}</span><span class="ap-t"><b>${esc(p.full_name || p.email)}</b><small>${hm(weekMins(p.id, lastWk))} logged · not submitted</small></span><button class="btn ghost sm" data-remind="${esc(p.id)}">Send reminder</button></div>`).join('') : '<p class="empty">Everyone has submitted last week’s timesheet.</p>')
        : (list.length ? list.map(t => { const a = attendance(S.team.filter(e => e.user_id === t.user_id), [...Array(7)].map((_, i) => dkey(addDays(fromKey(t.week_start), i)))); const own = t.user_id === S.me.id && !isAdmin();
            return `<div class="aprow"><span class="av">${esc(initials(nameOf(t.user_id)))}</span><span class="ap-t"><b>${esc(nameOf(t.user_id))}</b><small>${wkLabel(t.week_start)} · ${hm(a.total)}${a.weekOt ? ` · <span style="color:var(--red)">+${hm(a.weekOt)} overtime</span>` : ''}${t.comment ? ' · “' + esc(t.comment) + '”' : ''}</small></span>
              <span class="ap-act"><button class="btn ghost sm" data-view="${esc(t.user_id)}|${t.week_start}">View</button>${S.apTab === 'pending' && !own ? `<button class="btn ghost sm" data-back="${esc(t.user_id)}|${t.week_start}">Send back</button><button class="btn red sm" data-ok="${esc(t.user_id)}|${t.week_start}">Approve</button>` : ''}${S.apTab === 'approved' && isAdmin() ? `<button class="btn ghost sm" data-back="${esc(t.user_id)}|${t.week_start}">Reopen</button>` : ''}${own ? '<span class="tag">Your own week</span>' : ''}</span></div>`; }).join('')
          : `<p class="empty">${S.apTab === 'pending' ? 'No timesheets are waiting for approval.' : 'Nothing here yet.'}</p>`)}</div>`);
    $$('[data-ap]').forEach(b => b.onclick = () => { S.apTab = b.dataset.ap; renderApprovals(); });
    const review = async (key, status, comment = '') => {
      const [uid, wk] = key.split('|');
      const { error } = await S.sb.from('timesheets').update({ status, comment }).eq('user_id', uid).eq('week_start', wk);
      if (error) { toast(error.message || 'That didn’t work. Try again.'); return false; }
      S.sb.functions.invoke('notify', { body: { job: 'event', kind: status, user_id: uid, week_start: wk } }).catch(() => {});
      return true;
    };
    $$('[data-ok]').forEach(b => b.onclick = async () => { b.disabled = true; if (await review(b.dataset.ok, 'approved')) { toast('Timesheet approved'); await loadTeam(); renderTop(); renderApprovals(); } else b.disabled = false; });
    $$('[data-back]').forEach(b => b.onclick = async () => { const c = prompt('Add a note so they know what to change (optional):', ''); if (c === null) return; if (await review(b.dataset.back, 'rejected', c.trim().slice(0, 500))) { toast('Sent back for changes'); await loadTeam(); renderTop(); renderApprovals(); } });
    $$('[data-view]').forEach(b => b.onclick = () => viewWeek(...b.dataset.view.split('|')));
    $$('[data-remind]').forEach(b => b.onclick = async () => { b.disabled = true; const { error } = await S.sb.functions.invoke('notify', { body: { job: 'event', kind: 'remind', user_id: b.dataset.remind, week_start: lastWk } }); toast(error ? 'The reminder couldn’t be sent' : 'Reminder sent'); });
    if ($('#approveAll')) $('#approveAll').onclick = async () => { if (!confirm(`Approve all ${list.length} waiting timesheets?`)) return; let n = 0; for (const t of list) { if (t.user_id === S.me.id && !isAdmin()) continue; if (await review(t.user_id + '|' + t.week_start, 'approved')) n++; } toast(`${n} timesheet${n === 1 ? '' : 's'} approved`); await loadTeam(); renderTop(); renderApprovals(); };
  }
  function viewWeek(uid, wk){
    const days = [...Array(7)].map((_, i) => dkey(addDays(fromKey(wk), i))), l = S.team.filter(e => e.user_id === uid && days.includes(e.entry_date)).sort((a, b) => a.started_at.localeCompare(b.started_at)), a = attendance(l, days);
    $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">${esc(nameOf(uid))}</h2><p class="sub">Week of ${fromKey(wk).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} · ${hm(a.total)}${a.weekOt ? ' · +' + hm(a.weekOt) + ' overtime' : ''}</p></div>
      <div class="c6 scroll" style="max-height:55vh;overflow:auto">${l.length ? `<table class="sheet"><thead><tr><th>Day</th><th style="text-align:left">Task</th><th style="text-align:left">Project</th><th>Time</th><th>Hours</th></tr></thead><tbody>${l.map(e => `<tr><td>${fromKey(e.entry_date).toLocaleDateString(undefined, { weekday: 'short' })}</td><td style="text-align:left">${esc(e.note || e.category)}</td><td style="text-align:left">${esc(proj(e.project_id).name)}</td><td>${tstr(e.started_at)}–${tstr(e.ended_at)}</td><td><b>${hm(e.minutes)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No time logged this week.</p>'}</div>
      <div class="c6" style="display:flex;justify-content:flex-end"><button class="btn" value="cancel">Close</button></div>`;
    $('#editForm').onsubmit = null; $('#editDlg').showModal();
  }

  /* ---------- time off ---------- */
  const holName = k => (S.holidays.find(h => h.day === k) || {}).name || '';
  const isWeekday = k => { const d = fromKey(k).getDay(); return d !== 0 && d !== 6; };
  function workingDays(a, b){ let n = 0; for (let d = fromKey(a); dkey(d) <= b; d = addDays(d, 1)) { const k = dkey(d); if (isWeekday(k) && !holName(k)) n++; } return n; }
  const ltype = id => S.leaveTypes.find(t => t.id === id) || { name: 'Time off', color: '#475569', allowance: null };
  const allowanceFor = (uid, tid, yr, list) => { const o = list.find(a => a.user_id === uid && a.type_id === tid && a.year === yr); return o ? Number(o.days) : (ltype(tid).allowance == null ? null : Number(ltype(tid).allowance)); };
  const usedOf = (list, uid, tid, yr, st) => list.filter(r => r.user_id === uid && r.type_id === tid && st.includes(r.status) && Number(r.start_date.slice(0, 4)) === yr).reduce((a, r) => a + Number(r.days), 0);
  const leaveOn = (uid, k, list) => list.find(r => r.user_id === uid && r.status === 'approved' && r.start_date <= k && r.end_date >= k);
  const fmtD = k => fromKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const span = r => r.start_date === r.end_date ? fmtD(r.start_date) + (r.half_day ? ' (half day)' : '') : `${fmtD(r.start_date)} – ${fmtD(r.end_date)}`;
  const daysTxt = n => `${Number(n)} day${Number(n) === 1 ? '' : 's'}`;
  const ST = { pending: 'Waiting for approval', approved: 'Approved', rejected: 'Declined', cancelled: 'Cancelled' };
  const pendingLeave = () => can('team_leave') ? S.allLeave.filter(r => r.status === 'pending' && r.user_id !== S.me.id).length : 0;
  function offMinutes(uid, days, list){ const dm = Number(S.settings.daily_hours || 8) * 60; return days.filter(isWeekday).reduce((a, k) => { if (holName(k)) return a + dm; const r = leaveOn(uid, k, list); return a + (r ? (r.half_day ? dm / 2 : dm) : 0); }, 0); }
  async function loadLeave(){
    const yr = new Date().getFullYear();
    const [t, h, r, a] = await Promise.all([
      S.sb.from('leave_types').select('*').order('sort'),
      S.sb.from('holidays').select('*').gte('day', `${yr - 1}-01-01`).lte('day', `${yr + 1}-12-31`).order('day'),
      S.sb.from('leave_requests').select('*').eq('user_id', S.me.id).gte('end_date', `${yr - 1}-01-01`).order('start_date', { ascending: false }),
      S.sb.from('leave_allowances').select('*').eq('user_id', S.me.id),
    ]);
    S.leaveTypes = t.data || []; S.holidays = h.data || []; S.myLeave = r.data || []; S.myAllow = a.data || [];
  }
  async function loadTeamLeave(){
    const yr = new Date().getFullYear();
    const [r, a] = await Promise.all([
      S.sb.from('leave_requests').select('*').gte('end_date', `${yr - 1}-01-01`).order('start_date', { ascending: false }),
      S.sb.from('leave_allowances').select('*'),
    ]);
    S.allLeave = r.data || []; S.allAllow = a.data || [];
  }
  const leaveErr = e => /leave|booked|weekend|holiday|request|manager|cancel/i.test(e?.message || '') ? e.message : 'That didn’t work. Try again.';

  function renderLeave(){
    const yr = new Date().getFullYear(), today = dkey(new Date()), types = S.leaveTypes.filter(t => !t.archived);
    const cards = types.map(t => { const al = allowanceFor(S.me.id, t.id, yr, S.myAllow), used = usedOf(S.myLeave, S.me.id, t.id, yr, ['approved']), pend = usedOf(S.myLeave, S.me.id, t.id, yr, ['pending']);
      return `<div class="card kpi leave-card" style="border-top:3px solid ${esc(t.color)}"><small>${esc(t.name)}</small><b>${al == null ? daysTxt(used) : daysTxt(Math.max(0, al - used - pend))}</b><span>${al == null ? 'taken this year' : `left · ${used} of ${al} used${pend ? ` · ${pend} pending` : ''}`}</span></div>`; }).join('');
    const upcoming = S.myLeave.filter(r => r.end_date >= today && r.status !== 'cancelled' && r.status !== 'rejected'), past = S.myLeave.filter(r => !upcoming.includes(r));
    const row = r => `<div class="aprow"><span class="dot" style="background:${esc(ltype(r.type_id).color)};width:12px;height:12px"></span><span class="ap-t"><b>${esc(ltype(r.type_id).name)} · ${span(r)}</b><small>${daysTxt(r.days)} · <span class="st st-${r.status}">${ST[r.status]}</span>${r.comment ? ' · “' + esc(r.comment) + '”' : ''}${r.note ? ' · ' + esc(r.note) : ''}</small></span>${(r.status === 'pending' || (r.status === 'approved' && r.start_date > today)) ? `<button class="btn ghost sm" data-cancel="${esc(r.id)}">Cancel</button>` : ''}</div>`;
    const hols = S.holidays.filter(h => h.day >= today).slice(0, 6);
    main(`<div class="head"><div><h1>Time off</h1><p class="sub">Your leave balances for ${yr}, requests and upcoming public holidays.</p></div></div>
      <div class="grid g4">${cards || '<div class="card">No leave types set up yet.</div>'}</div>
      <div class="grid g2" style="margin-top:14px">
        <form class="card f" id="lvF"><h2 class="c6">Request time off</h2>
          <label class="c6">Type<select name="type_id" required>${types.map(t => `<option value="${esc(t.id)}">${esc(t.name)}${t.paid ? '' : ' (unpaid)'}</option>`).join('')}</select></label>
          <label class="c3">From<input type="date" name="start_date" required value="${today}"></label>
          <label class="c3">To<input type="date" name="end_date" required value="${today}"></label>
          <label class="bill c6"><input type="checkbox" name="half_day">Half day (single day only)</label>
          <label class="c6">Note for your manager (optional)<input name="note" maxlength="500" placeholder="e.g. Family wedding in Enugu"></label>
          <p class="c6 lv-sum" id="lvSum"></p>
          <div class="c6" style="display:flex;justify-content:flex-end"><button class="btn red">Send request</button></div>
        </form>
        <div class="card"><h2>Upcoming public holidays</h2>${hols.length ? hols.map(h => `<div class="hol"><b>${fmtD(h.day)}</b><span>${esc(h.name)}</span></div>`).join('') : '<p class="empty">No upcoming holidays listed.</p>'}<p class="sub" style="font-size:12px;margin-top:8px">Public holidays and weekends aren’t counted as leave days.</p></div>
      </div>
      <div class="card" style="margin-top:14px"><h2>Upcoming and pending</h2>${upcoming.length ? upcoming.map(row).join('') : '<p class="empty">No upcoming time off.</p>'}</div>
      ${past.length ? `<div class="card" style="margin-top:14px"><h2>History</h2>${past.slice(0, 20).map(row).join('')}</div>` : ''}`);
    const f = $('#lvF'), sumUp = () => {
      const a = f.start_date.value, b = f.end_date.value; f.half_day.disabled = a !== b; if (a !== b) f.half_day.checked = false;
      if (!a || !b || b < a) return $('#lvSum').textContent = 'Choose a valid date range.';
      const n = workingDays(a, b) * (f.half_day.checked ? 0.5 : 1), t = S.leaveTypes.find(x => x.id === f.type_id.value), al = t && allowanceFor(S.me.id, t.id, Number(a.slice(0, 4)), S.myAllow);
      const left = al == null ? null : al - usedOf(S.myLeave, S.me.id, t.id, Number(a.slice(0, 4)), ['approved', 'pending']);
      $('#lvSum').innerHTML = n ? `<b>${daysTxt(n)}</b> of leave${left != null ? ` · you have ${daysTxt(Math.max(0, left))} left` : ''}${left != null && n > left ? ' · <span style="color:var(--red)">not enough left</span>' : ''}` : 'Those dates are weekends or public holidays, so no leave is needed.';
    };
    ['change', 'input'].forEach(ev => f.addEventListener(ev, sumUp)); sumUp();
    f.onsubmit = async e => {
      e.preventDefault(); const d = new FormData(f), b = f.querySelector('button.red'); if (d.get('end_date') < d.get('start_date')) return toast('The end date is before the start date');
      b.disabled = true;
      const { data, error } = await S.sb.from('leave_requests').insert({ user_id: S.me.id, type_id: d.get('type_id'), start_date: d.get('start_date'), end_date: d.get('end_date'), half_day: d.get('half_day') === 'on', note: String(d.get('note') || '').trim() }).select().single();
      b.disabled = false; if (error) return toast(leaveErr(error));
      S.sb.functions.invoke('notify', { body: { job: 'event', kind: 'leave_requested', request_id: data.id, user_id: S.me.id } }).catch(() => {});
      toast('Request sent to your manager'); await loadLeave(); renderLeave();
    };
    $$('[data-cancel]').forEach(b => b.onclick = async () => { if (!confirm('Cancel this time off request?')) return; const { error } = await S.sb.from('leave_requests').update({ status: 'cancelled' }).eq('id', b.dataset.cancel); if (error) return toast(leaveErr(error)); toast('Request cancelled'); await loadLeave(); if (isMgr()) await loadTeamLeave(); renderLeave(); });
  }

  function renderTeamLeave(){
    const yr = new Date().getFullYear(), today = dkey(new Date()), people = S.people.filter(p => p.active);
    const tabs = [['requests', 'Requests', pendingLeave()], ['calendar', 'Calendar', 0], ['balances', 'Balances', 0]];
    let body = '';
    if (S.leaveTab === 'requests') {
      const pend = S.allLeave.filter(r => r.status === 'pending').sort((a, b) => a.start_date.localeCompare(b.start_date));
      const soon = S.allLeave.filter(r => r.status === 'approved' && r.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
      const row = (r, act) => `<div class="aprow"><span class="av">${esc(initials(nameOf(r.user_id)))}</span><span class="ap-t"><b>${esc(nameOf(r.user_id))} · ${esc(ltype(r.type_id).name)}</b><small>${span(r)} · ${daysTxt(r.days)}${r.note ? ' · “' + esc(r.note) + '”' : ''}${(() => { const al = allowanceFor(r.user_id, r.type_id, Number(r.start_date.slice(0, 4)), S.allAllow); return al == null ? '' : ` · ${Math.max(0, al - usedOf(S.allLeave, r.user_id, r.type_id, Number(r.start_date.slice(0, 4)), ['approved']))} of ${al} days left before this`; })()}</small></span>${act}</div>`;
      body = `<div class="card"><h2>Waiting for a decision</h2>${pend.length ? pend.map(r => row(r, r.user_id === S.me.id && !isAdmin() ? '<span class="tag">Your own request</span>' : `<span class="ap-act"><button class="btn ghost sm" data-lno="${esc(r.id)}">Decline</button><button class="btn red sm" data-lok="${esc(r.id)}">Approve</button></span>`)).join('') : '<p class="empty">No requests waiting.</p>'}</div>
        <div class="card" style="margin-top:14px"><h2>Approved and upcoming</h2>${soon.length ? soon.map(r => row(r, r.start_date > today ? `<button class="btn ghost sm" data-lno="${esc(r.id)}">Withdraw approval</button>` : '<span class="tag">On leave now</span>')).join('') : '<p class="empty">Nobody has time off coming up.</p>'}</div>`;
    } else if (S.leaveTab === 'calendar') {
      const m = S.calMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1), first = new Date(m), lead = (first.getDay() + 6) % 7, dim = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const cells = [...Array(lead)].map(() => '<div class="cal-c empty-c"></div>').join('') + [...Array(dim)].map((_, i) => { const k = dkey(new Date(m.getFullYear(), m.getMonth(), i + 1)), h = holName(k), offs = isWeekday(k) && !h ? S.allLeave.filter(r => r.status === 'approved' && r.start_date <= k && r.end_date >= k) : [];
        return `<div class="cal-c ${isWeekday(k) ? '' : 'wkend'} ${k === today ? 'today' : ''}"><span class="cal-n">${i + 1}</span>${h ? `<span class="chip hol-chip" title="${esc(h)}">${esc(h)}</span>` : ''}${offs.slice(0, 3).map(r => `<span class="chip" style="background:${esc(ltype(r.type_id).color)}" title="${esc(nameOf(r.user_id))} · ${esc(ltype(r.type_id).name)}">${esc((nameOf(r.user_id) || '').split(' ')[0])}${r.half_day ? ' ½' : ''}</span>`).join('')}${offs.length > 3 ? `<span class="more-c">+${offs.length - 3} more</span>` : ''}</div>`; }).join('');
      body = `<div class="card"><div class="head" style="margin-bottom:10px"><h2 style="margin:0">${m.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><span style="display:flex;gap:6px"><button class="btn ghost sm" id="cPrev">‹</button><button class="btn ghost sm" id="cNow">Today</button><button class="btn ghost sm" id="cNext">›</button></span></div>
        <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-h">${d}</div>`).join('')}${cells}</div>
        <div class="legend">${S.leaveTypes.filter(t => !t.archived).map(t => `<span><i style="background:${esc(t.color)}"></i>${esc(t.name)}</span>`).join('')}<span><i class="hol-i"></i>Public holiday</span></div></div>`;
    } else {
      const types = S.leaveTypes.filter(t => !t.archived);
      body = `<div class="card scroll"><h2>${yr} balances</h2><table class="sheet"><thead><tr><th>Name</th>${types.map(t => `<th>${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${people.map(p => `<tr><td>${esc(p.full_name || p.email)}</td>${types.map(t => { const al = allowanceFor(p.id, t.id, yr, S.allAllow), used = usedOf(S.allLeave, p.id, t.id, yr, ['approved']), pend = usedOf(S.allLeave, p.id, t.id, yr, ['pending']);
          return `<td>${al == null ? `${used} taken` : `<b>${Math.max(0, al - used - pend)}</b> <span class="sub">of ${al}</span>`}${pend ? ` <small class="sub">(${pend} pending)</small>` : ''}${can('settings') && al != null ? ` <button class="icon sm-i" data-allow="${esc(p.id)}|${esc(t.id)}" title="Change ${esc(p.full_name || p.email)}’s ${esc(t.name)} allowance" aria-label="Change allowance">✎</button>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table>
        <p class="sub" style="font-size:12px;margin-top:8px">Days left = yearly allowance minus approved and pending leave. ${isAdmin() ? 'Use ✎ to give someone a different allowance this year.' : ''}</p></div>`;
    }
    main(`<div class="head"><div><h1>Team time off</h1><p class="sub">Approve requests, see who’s off and check balances.</p></div></div>
      <div class="seg">${tabs.map(([k, l, n]) => `<button data-lt="${k}" class="${S.leaveTab === k ? 'on' : ''}">${l}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div><div style="margin-top:14px">${body}</div>`);
    $$('[data-lt]').forEach(b => b.onclick = () => { S.leaveTab = b.dataset.lt; renderTeamLeave(); });
    const decide = async (id, status) => {
      const c = status === 'rejected' ? prompt('Add a note explaining why (optional):', '') : ''; if (c === null) return;
      const { error } = await S.sb.from('leave_requests').update({ status, comment: (c || '').trim().slice(0, 500) }).eq('id', id);
      if (error) return toast(leaveErr(error));
      S.sb.functions.invoke('notify', { body: { job: 'event', kind: status === 'approved' ? 'leave_approved' : 'leave_rejected', request_id: id, user_id: '' } }).catch(() => {});
      toast(status === 'approved' ? 'Time off approved' : 'Request declined'); await loadTeamLeave(); renderTop(); renderTeamLeave();
    };
    $$('[data-lok]').forEach(b => b.onclick = () => decide(b.dataset.lok, 'approved'));
    $$('[data-lno]').forEach(b => b.onclick = () => decide(b.dataset.lno, 'rejected'));
    const mv = n => { const m = S.calMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1); S.calMonth = n === 0 ? null : new Date(m.getFullYear(), m.getMonth() + n, 1); renderTeamLeave(); };
    if ($('#cPrev')) { $('#cPrev').onclick = () => mv(-1); $('#cNext').onclick = () => mv(1); $('#cNow').onclick = () => mv(0); }
    $$('[data-allow]').forEach(b => b.onclick = async () => {
      const [uid, tid] = b.dataset.allow.split('|'), cur = allowanceFor(uid, tid, yr, S.allAllow), v = prompt(`${ltype(tid).name} allowance for ${nameOf(uid)} in ${yr} (days):`, cur);
      if (v === null || v.trim() === '' || isNaN(Number(v)) || Number(v) < 0) return;
      const { error } = await S.sb.from('leave_allowances').upsert({ user_id: uid, type_id: tid, year: yr, days: Number(v) });
      if (error) return toast('Couldn’t save the allowance'); toast('Allowance updated'); await loadTeamLeave(); renderTeamLeave();
    });
  }

  function leaveSettingsHtml(){
    const yr = S.holYear || new Date().getFullYear(), hols = S.holidays.filter(h => h.day.startsWith(String(yr)));
    return `<div class="card" style="margin-top:14px"><h2>Leave types</h2><p class="sub" style="margin:-6px 0 10px">Yearly allowance in working days. Leave the allowance empty for no limit (for example unpaid leave).</p>
      ${S.leaveTypes.map(t => `<div class="lt-row ${t.archived ? 'off' : ''}" data-lrow="${esc(t.id)}"><input type="color" class="swatch" value="${esc(t.color)}" data-k="color" aria-label="Colour"><input data-k="name" value="${esc(t.name)}" aria-label="Name" maxlength="60"><input data-k="allowance" type="number" min="0" step="0.5" placeholder="No limit" value="${t.allowance ?? ''}" aria-label="Days per year"><label class="bill"><input type="checkbox" data-k="paid" ${t.paid ? 'checked' : ''}>Paid</label><button type="button" class="btn ghost sm" data-ltarch="${esc(t.id)}">${t.archived ? 'Restore' : 'Archive'}</button></div>`).join('')}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button type="button" class="btn ghost" id="ltAdd">Add leave type</button><button type="button" class="btn" id="ltSave">Save leave types</button></div></div>
      <div class="card" style="margin-top:14px"><div class="head" style="margin-bottom:6px"><h2 style="margin:0">Public holidays ${yr}</h2><span style="display:flex;gap:6px"><button type="button" class="btn ghost sm" id="hPrev">‹ ${yr - 1}</button><button type="button" class="btn ghost sm" id="hNext">${yr + 1} ›</button></span></div>
      <p class="sub" style="margin-bottom:8px">Islamic holidays depend on the moon sighting. Update them when the Federal Government confirms the dates.</p>
      ${hols.length ? hols.map(h => `<div class="hol"><b>${fmtD(h.day)}</b><span>${esc(h.name)}</span><button type="button" class="icon" data-hdel="${h.day}" aria-label="Remove holiday">×</button></div>`).join('') : '<p class="empty">No holidays listed for this year.</p>'}
      <div class="f" style="margin-top:10px"><label class="c2">Date<input type="date" id="hDay" min="${yr}-01-01" max="${yr}-12-31"></label><label class="c3">Name<input id="hName" maxlength="80" placeholder="e.g. Eid el-Fitr"></label><button type="button" class="btn" id="hAdd">Add</button></div></div>`;
  }
  function bindLeaveSettings(){
    $('#ltAdd').onclick = async () => { const n = prompt('Name of the new leave type:', 'Study leave'); if (!n || !n.trim()) return; const { error } = await S.sb.from('leave_types').insert({ name: n.trim(), allowance: 5, color: COLORS[S.leaveTypes.length % COLORS.length], sort: S.leaveTypes.length + 1 }); if (error) return toast('Couldn’t add the leave type'); await loadLeave(); renderSettings(); toast('Leave type added'); };
    $('#ltSave').onclick = async () => { for (const r of $$('[data-lrow]')) { const v = k => r.querySelector(`[data-k=${k}]`); const row = { name: v('name').value.trim() || 'Leave', color: v('color').value, allowance: v('allowance').value === '' ? null : Number(v('allowance').value), paid: v('paid').checked }; const { error } = await S.sb.from('leave_types').update(row).eq('id', r.dataset.lrow); if (error) return toast('Couldn’t save the leave types'); } await loadLeave(); toast('Leave types saved'); };
    $$('[data-ltarch]').forEach(b => b.onclick = async () => { const t = S.leaveTypes.find(x => x.id === b.dataset.ltarch); await S.sb.from('leave_types').update({ archived: !t.archived }).eq('id', t.id); await loadLeave(); renderSettings(); });
    $('#hPrev').onclick = () => { S.holYear = (S.holYear || new Date().getFullYear()) - 1; renderSettings(); };
    $('#hNext').onclick = () => { S.holYear = (S.holYear || new Date().getFullYear()) + 1; renderSettings(); };
    $('#hAdd').onclick = async () => { const d = $('#hDay').value, n = $('#hName').value.trim(); if (!d || !n) return toast('Enter a date and a name'); const { error } = await S.sb.from('holidays').upsert({ day: d, name: n }); if (error) return toast('Couldn’t add the holiday'); await loadLeave(); renderSettings(); toast('Holiday added'); };
    $$('[data-hdel]').forEach(b => b.onclick = async () => { if (!confirm('Remove this public holiday?')) return; await S.sb.from('holidays').delete().eq('day', b.dataset.hdel); await loadLeave(); renderSettings(); toast('Holiday removed'); });
  }

  /* ---------- costs, profit and expenses ---------- */
  const EXP_CATS = ['Transport', 'Travel and accommodation', 'Meals and entertainment', 'Materials and samples', 'Printing', 'Site supplies', 'Software and subscriptions', 'Other'];
  const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'XOF'];
  const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: S.settings.currency || 'NGN', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const moneyC = n => Math.abs(Number(n) || 0) >= 1e7 ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: S.settings.currency || 'NGN', notation: 'compact', maximumFractionDigits: 2 }).format(Number(n) || 0) : money(n);
  const baseCur = () => S.settings.currency || 'NGN';
  const fxOf = c => (!c || c === baseCur()) ? 1 : (Number((S.fxr || {})[c]) || 1);
  const pcur = p => (p && p.currency) || baseCur();
  const moneyIn = (n, c) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: c || baseCur(), maximumFractionDigits: 0 }).format(Number(n) || 0);
  const expCur = x => x.currency || pcur(proj(x.project_id));
  const P_ST = { pipeline: ['Pipeline', '#7c3aed'], active: ['Active', '#15803d'], on_hold: ['On hold', '#a16207'], completed: ['Completed', '#475569'], lost: ['Lost', '#E3232B'] };
  const pStatus = p => `<span class="pst" style="--c:${(P_ST[p.status || 'active'] || P_ST.active)[1]}">${(P_ST[p.status || 'active'] || P_ST.active)[0]}</span>`;
  const jobOf = pid => (S.jobs || []).find(j => j.project_id === pid);
  const toBase = (n, c) => (Number(n) || 0) * fxOf(c);
  const curOpts = sel => CURRENCIES.map(c => `<option ${c === sel ? 'selected' : ''}>${c}</option>`).join('');
  async function loadFx(){ const { data } = await S.sb.from('exchange_rates').select('*'); S.fxr = Object.fromEntries((data || []).map(r => [r.currency, Number(r.rate)])); S.fxRows = data || []; }
  const pendingExp = () => can('team_expenses') ? S.allExp.filter(x => x.status === 'pending' && x.user_id !== S.me.id).length : 0;
  const expErr = e => /expense|reviewed|manager|pending/i.test(e?.message || '') ? e.message : 'That didn’t work. Try again.';
  async function loadMyExp(){ const { data } = await S.sb.from('expenses').select('*').eq('user_id', S.me.id).gte('spent_on', dkey(addDays(new Date(), -400))).order('spent_on', { ascending: false }); S.myExp = data || []; }
  async function loadTeamExp(){ const { data } = await S.sb.from('expenses').select('*').gte('spent_on', dkey(addDays(new Date(), -400))).order('spent_on', { ascending: false }); S.allExp = data || []; }
  async function openReceipt(path){
    const w = window.open('', '_blank'); if (w) w.opener = null;
    const { data, error } = await S.sb.storage.from('receipts').createSignedUrl(path, 600);
    if (error || !data) { w && w.close(); return toast('Couldn’t open the receipt'); }
    if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
  }
  const expStatus = x => `<span class="st st-${x.status}">${{ pending: 'Waiting for approval', approved: 'Approved', rejected: 'Declined' }[x.status]}</span>`;

  function renderExpenses(){
    const today = dkey(new Date()), m0 = today.slice(0, 7), month = S.myExp.filter(x => x.spent_on.startsWith(m0));
    main(`<div class="head"><div><h1>Expenses</h1><p class="sub">Log money you spent on JCI work. Attach a receipt so your manager can approve it.</p></div></div>
      <div class="grid g4">${kpi('This month', money(month.reduce((a, x) => a + toBase(x.amount, expCur(x)), 0)), month.length + ' expenses')}${kpi('Waiting for approval', money(S.myExp.filter(x => x.status === 'pending').reduce((a, x) => a + toBase(x.amount, expCur(x)), 0)), S.myExp.filter(x => x.status === 'pending').length + ' expenses')}${kpi('Approved this month', money(month.filter(x => x.status === 'approved').reduce((a, x) => a + toBase(x.amount, expCur(x)), 0)), 'ready to reimburse or bill')}${kpi('Declined', S.myExp.filter(x => x.status === 'rejected').length, 'in the last year')}</div>
      <form class="card f" id="exF" style="margin-top:14px"><h2 class="c6">Add an expense</h2>
        <label class="c2">Date<input type="date" name="spent_on" value="${today}" max="${today}" required></label>
        <label class="c2">Project<select name="project_id" required>${projOptions('')}</select></label>
        <label class="c2">Category<select name="category">${EXP_CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
        <label>Currency<select name="currency">${curOpts(baseCur())}</select></label><label>Amount<input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required placeholder="0.00"></label>
        <label class="c4">What was it for?<input name="note" maxlength="500" required placeholder="e.g. Uber to Afreximbank site meeting"></label>
        <label class="c3">Receipt (photo or PDF, up to 5 MB)<input type="file" name="receipt" accept="image/*,application/pdf" capture="environment"></label>
        <label class="bill c2" style="align-self:center;margin-top:16px"><input type="checkbox" name="billable" checked>Billable to the client</label>
        <div style="display:flex;justify-content:flex-end;align-self:end"><button class="btn red">Add expense</button></div>
      </form>
      <div class="card" style="margin-top:14px"><h2>Your expenses</h2>${S.myExp.length ? S.myExp.map(x => `<div class="aprow"><span class="dot" style="background:${esc(proj(x.project_id).color)};width:12px;height:12px"></span><span class="ap-t"><b>${moneyIn(x.amount, expCur(x))} · ${esc(x.note || x.category)}</b><small>${fmtD(x.spent_on)} · ${esc(proj(x.project_id).name)} · ${esc(x.category)}${x.billable ? ' · Billable' : ''} · ${expStatus(x)}${x.comment ? ' · “' + esc(x.comment) + '”' : ''}</small></span><span class="ap-act">${x.receipt_path ? `<button class="btn ghost sm" data-rcpt="${esc(x.receipt_path)}">Receipt</button>` : '<span class="tag">No receipt</span>'}${x.status === 'pending' ? `<button class="btn ghost sm" data-exdel="${esc(x.id)}">Delete</button>` : ''}</span></div>`).join('') : '<p class="empty">No expenses yet.</p>'}</div>`);
    $('#exF').project_id.onchange = e => { $('#exF').currency.value = pcur(proj(e.target.value)); };
    $('#exF').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button.red'), file = f.get('receipt');
      if (file && file.size > 5 * 1024 * 1024) return toast('The receipt is larger than 5 MB');
      b.disabled = true; let path = null;
      if (file && file.size) { path = `${S.me.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-60)}`; const up = await S.sb.storage.from('receipts').upload(path, file, { contentType: file.type || undefined }); if (up.error) { b.disabled = false; return toast('The receipt couldn’t be uploaded'); } }
      const { error } = await S.sb.from('expenses').insert({ user_id: S.me.id, spent_on: f.get('spent_on'), project_id: f.get('project_id') || null, category: f.get('category'), currency: f.get('currency') === baseCur() ? '' : f.get('currency'), amount: Number(f.get('amount')), note: String(f.get('note')).trim(), billable: f.get('billable') === 'on', receipt_path: path });
      b.disabled = false;
      if (error) { if (path) S.sb.storage.from('receipts').remove([path]); return toast(expErr(error)); }
      toast('Expense added'); await loadMyExp(); renderExpenses();
    };
    $$('[data-rcpt]').forEach(b => b.onclick = () => openReceipt(b.dataset.rcpt));
    $$('[data-exdel]').forEach(b => b.onclick = async () => { if (!confirm('Delete this expense?')) return; const x = S.myExp.find(y => y.id === b.dataset.exdel); const { error } = await S.sb.from('expenses').delete().eq('id', x.id); if (error) return toast(expErr(error)); if (x.receipt_path) S.sb.storage.from('receipts').remove([x.receipt_path]); toast('Expense deleted'); await loadMyExp(); renderExpenses(); });
  }

  function renderTeamExp(){
    const list = S.allExp.filter(x => x.status === S.expTab).filter(x => !S.expMonth || x.spent_on.startsWith(S.expMonth));
    const months = [...new Set(S.allExp.map(x => x.spent_on.slice(0, 7)))].sort().reverse();
    main(`<div class="head"><div><h1>Team expenses</h1><p class="sub">Approve expenses, check receipts and export them for reimbursement or billing.</p></div><button class="btn" id="exCsv">Export CSV</button></div>
      <div class="toolbar"><div class="seg">${[['pending', 'Waiting', pendingExp()], ['approved', 'Approved', 0], ['rejected', 'Declined', 0]].map(([k, l, n]) => `<button data-et="${k}" class="${S.expTab === k ? 'on' : ''}">${l}${n ? ` <em>${n}</em>` : ''}</button>`).join('')}</div>
        <select id="exMonth" aria-label="Month"><option value="">All months</option>${months.map(m => `<option value="${m}" ${S.expMonth === m ? 'selected' : ''}>${fromKey(m + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</option>`).join('')}</select></div>
      <div class="card">${list.length ? `<p class="sub" style="margin-bottom:6px">${list.length} expense${list.length === 1 ? '' : 's'} · ${money(list.reduce((a, x) => a + toBase(x.amount, expCur(x)), 0))}${list.some(x => expCur(x) !== baseCur()) ? ' (converted)' : ''}</p>` + list.map(x => `<div class="aprow"><span class="av">${esc(initials(nameOf(x.user_id)))}</span><span class="ap-t"><b>${moneyIn(x.amount, expCur(x))} · ${esc(nameOf(x.user_id))}</b><small>${fmtD(x.spent_on)} · ${esc(proj(x.project_id).name)} · ${esc(x.category)} · ${esc(x.note)}${x.billable ? ' · Billable' : ''}${x.comment ? ' · “' + esc(x.comment) + '”' : ''}</small></span><span class="ap-act">${x.receipt_path ? `<button class="btn ghost sm" data-rcpt="${esc(x.receipt_path)}">Receipt</button>` : '<span class="tag" style="color:var(--red)">No receipt</span>'}${x.status === 'pending' && (x.user_id !== S.me.id || isAdmin()) ? `<button class="btn ghost sm" data-exno="${esc(x.id)}">Decline</button><button class="btn red sm" data-exok="${esc(x.id)}">Approve</button>` : ''}</span></div>`).join('') : '<p class="empty">Nothing here.</p>'}</div>`);
    $$('[data-et]').forEach(b => b.onclick = () => { S.expTab = b.dataset.et; renderTeamExp(); });
    $('#exMonth').onchange = e => { S.expMonth = e.target.value; renderTeamExp(); };
    $$('[data-rcpt]').forEach(b => b.onclick = () => openReceipt(b.dataset.rcpt));
    const decide = async (id, status) => { const c = status === 'rejected' ? prompt('Add a note explaining why (optional):', '') : ''; if (c === null) return; const { error } = await S.sb.from('expenses').update({ status, comment: (c || '').trim().slice(0, 500) }).eq('id', id); if (error) return toast(expErr(error)); toast(status === 'approved' ? 'Expense approved' : 'Expense declined'); await loadTeamExp(); renderTop(); renderTeamExp(); };
    $$('[data-exok]').forEach(b => b.onclick = () => decide(b.dataset.exok, 'approved'));
    $$('[data-exno]').forEach(b => b.onclick = () => decide(b.dataset.exno, 'rejected'));
    $('#exCsv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const rows = S.allExp.filter(x => !S.expMonth || x.spent_on.startsWith(S.expMonth)); const csv = ['Date,Team member,Project,Client,Category,Description,Amount,Currency,Billable,Status', ...rows.map(x => [x.spent_on, nameOf(x.user_id), proj(x.project_id).name, proj(x.project_id).client || '', x.category, x.note, Number(x.amount).toFixed(2), expCur(x), x.billable ? 'Yes' : 'No', x.status].map(q).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-expenses-${S.expMonth || 'all'}.csv`; a.click(); };
  }

  function finRange(){
    const t = new Date(), y = t.getFullYear(), m = t.getMonth(), today = dkey(t);
    return { month: [dkey(new Date(y, m, 1)), today], lastmonth: [dkey(new Date(y, m - 1, 1)), dkey(new Date(y, m, 0))], quarter: [dkey(new Date(y, Math.floor(m / 3) * 3, 1)), today], year: [`${y}-01-01`, today], all: ['2000-01-01', today] }[S.finRange] || [S.finFrom || today, S.finTo || today];
  }
  async function renderProfit(){
    const [f, t] = finRange();
    main(`<div class="notice"><p class="sub">Calculating…</p></div>`);
    const { data, error } = await S.sb.rpc('financials', { p_from: f, p_to: t });
    if (error) return main(`<div class="notice"><h1>Profit and costs</h1><p class="sub">${esc(error.message)}</p></div>`);
    const P = data.projects || [], X = data.expenses || [], U = data.people || [];
    const { data: BL } = await S.sb.rpc('project_bills', { p_from: f, p_to: t }).then(r => r, () => ({ data: [] }));
    (BL || []).forEach(b => { const x = X.find(y => y.project_id === b.project_id); if (x) x.total = Number(x.total) + Number(b.total); else X.push({ project_id: b.project_id, total: Number(b.total), billable: 0 }); });
    const ids = [...new Set([...P.map(p => p.project_id), ...X.map(x => x.project_id)])];
    const rows = ids.map(id => { const p = P.find(x => x.project_id === id) || { minutes: 0, labour_cost: 0, billable_amount: 0, missing_cost: 0 }, x = X.find(y => y.project_id === id) || { total: 0, billable: 0 };
      const rev = Number(p.billable_amount) + Number(x.billable), cost = Number(p.labour_cost) + Number(x.total); return { id, pr: proj(id || null), minutes: p.minutes, labour: Number(p.labour_cost), exp: Number(x.total), rev, cost, profit: rev - cost, missing: p.missing_cost }; }).sort((a, b) => b.rev - a.rev);
    const T = rows.reduce((a, r) => ({ rev: a.rev + r.rev, labour: a.labour + r.labour, exp: a.exp + r.exp, profit: a.profit + r.profit, minutes: a.minutes + Number(r.minutes) }), { rev: 0, labour: 0, exp: 0, profit: 0, minutes: 0 });
    const missing = U.filter(u => u.missing_cost).length, margin = r => r.rev ? Math.round(r.profit / r.rev * 100) + '%' : '–';
    const projById = id => S.projects.find(p => p.id === id);
    const budgetCell = r => { const p = projById(r.id); if (!p || p.budget_type === 'none' || !p.budget) return '–'; return `<span class="sub">${p.budget_type === 'hours' ? p.budget + 'h' : moneyIn(p.budget, pcur(p))}</span>`; };
    main(`<div class="head"><div><h1>Profit and costs</h1><p class="sub">${fromKey(f).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} – ${fromKey(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><button class="btn" id="finCsv">Export CSV</button></div>
      <div class="toolbar"><div class="seg">${[['month', 'This month'], ['lastmonth', 'Last month'], ['quarter', 'This quarter'], ['year', 'This year'], ['all', 'All time']].map(([k, l]) => `<button data-fr="${k}" class="${S.finRange === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      ${missing ? `<div class="card warn">${missing} ${missing === 1 ? 'person has' : 'people have'} no hourly cost set, so labour cost is understated. ${can('settings') ? 'Set rates in <b>Workspace settings</b>.' : 'Ask an admin to set rates.'}</div>` : ''}
      <div class="grid g4">${kpi('Revenue', money(T.rev), 'billable time and expenses')}${kpi('Labour cost', money(T.labour), hm(T.minutes) + ' tracked')}${kpi('Expenses', money(T.exp), 'approved and pending')}${kpi('Profit', `<span style="color:${T.profit < 0 ? 'var(--red)' : 'var(--ok)'}">${money(T.profit)}</span>`, 'margin ' + margin(T))}</div>
      <div class="card scroll" style="margin-top:14px"><h2>By project</h2>${rows.length ? `<table class="sheet"><thead><tr><th>Project</th><th>Hours</th><th>Revenue</th><th>Labour cost</th><th title="Team expenses plus supplier bills (before VAT)">Expenses and bills</th><th>Profit</th><th>Margin</th><th>Budget</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="tag" style="color:var(--ink)"><span class="dot" style="background:${esc(r.pr.color)}"></span>${esc(r.pr.name)}</span></td><td>${hm(r.minutes)}</td><td>${money(r.rev)}</td><td>${money(r.labour)}</td><td>${money(r.exp)}</td><td style="color:${r.profit < 0 ? 'var(--red)' : 'inherit'}"><b>${money(r.profit)}</b></td><td>${margin(r)}</td><td>${budgetCell(r)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td>${hm(T.minutes)}</td><td>${money(T.rev)}</td><td>${money(T.labour)}</td><td>${money(T.exp)}</td><td>${money(T.profit)}</td><td>${margin(T)}</td><td></td></tr></tfoot></table>` : '<p class="empty">No time or expenses in this period.</p>'}</div>
      <div class="card scroll" style="margin-top:14px"><h2>By person</h2>${U.length ? `<table class="sheet"><thead><tr><th>Name</th><th>Hours</th><th>Billable value</th><th>Labour cost</th></tr></thead><tbody>${U.sort((a, b) => b.billable_amount - a.billable_amount).map(u => `<tr><td>${esc(nameOf(u.user_id))}${u.missing_cost ? ' <span class="tag" style="color:var(--red)">no rate</span>' : ''}</td><td>${hm(u.minutes)}</td><td>${money(u.billable_amount)}</td><td>${money(u.labour_cost)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">No time tracked in this period.</p>'}</div>
      <p class="sub" style="font-size:12px;margin-top:10px">Revenue = billable hours × billable rate (activity rate on the project, else project rate, else the person’s rate) plus billable expenses. Labour cost = hours × each person’s hourly cost on that date. Profit = revenue − labour cost − all expenses. Declined expenses are excluded. All figures are in ${esc(baseCur())}; projects, expenses and invoices in other currencies are converted at the exchange rates in Workspace settings.</p>`);
    $$('[data-fr]').forEach(b => b.onclick = () => { S.finRange = b.dataset.fr; renderProfit(); });
    $('#finCsv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const csv = ['Project,Client,Hours,Revenue,Labour cost,Expenses,Profit,Margin', ...rows.map(r => [r.pr.name, r.pr.client || '', (r.minutes / 60).toFixed(2), r.rev.toFixed(2), r.labour.toFixed(2), r.exp.toFixed(2), r.profit.toFixed(2), margin(r)].map(q).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-profit-${f}-to-${t}.csv`; a.click(); };
  }

  function ratesHtml(){
    const people = S.people.filter(p => p.active), cur = S.settings.currency || 'NGN';
    const latest = uid => S.rates.filter(r => r.user_id === uid).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
    return `<div class="card" style="margin-top:14px"><h2>Currency and rates</h2><p class="sub" style="margin:-6px 0 10px">Hourly <b>cost</b> is what an hour of someone’s time costs JCI (salary and overheads). Hourly <b>billable rate</b> is what clients are charged, unless a project or activity rate applies. Only admins can see these.</p>
      <div class="f" style="margin-bottom:10px"><label class="c2">Currency<select id="curSel">${CURRENCIES.map(c => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}</select></label><label class="c2">New rates apply from<input type="date" id="rateFrom" value="${dkey(new Date())}"></label></div>
      <div class="fx-box"><b>Exchange rates</b><span class="sub">For projects, invoices and expenses in other currencies. Reports convert them to ${esc(cur)} at these rates.</span>
        <div class="fx-grid">${CURRENCIES.filter(c => c !== cur).map(c => { const r = (S.fxRows || []).find(x => x.currency === c); return `<label>1 ${c} =<span><input type="number" min="0" step="any" data-fx="${c}" value="${r ? r.rate : ''}" placeholder="rate"> ${esc(cur)}</span>${r ? `<small>updated ${new Date(r.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</small>` : '<small>not set</small>'}</label>`; }).join('')}</div></div>
      <div class="scroll"><table class="sheet rates"><thead><tr><th>Name</th><th>Hourly cost (${esc(cur)})</th><th>Billable rate (${esc(cur)})</th><th>Since</th></tr></thead><tbody>${people.map(p => { const r = latest(p.id); return `<tr data-rate="${esc(p.id)}"><td>${esc(p.full_name || p.email)}</td><td><input type="number" min="0" step="100" data-k="cost_rate" value="${r ? r.cost_rate : ''}" placeholder="Not set"></td><td><input type="number" min="0" step="100" data-k="bill_rate" value="${r ? r.bill_rate : ''}" placeholder="Not set"></td><td class="sub">${r ? fmtD(r.effective_from) : '–'}</td></tr>`; }).join('')}</tbody></table></div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="btn" id="rateSave">Save currency and rates</button></div></div>`;
  }
  function bindRates(){
    $('#rateSave').onclick = async () => {
      const cur = $('#curSel').value, from = $('#rateFrom').value || dkey(new Date());
      if (cur !== S.settings.currency) { const { error } = await S.sb.from('settings').update({ currency: cur }).eq('id', 1); if (error) return toast('Couldn’t save the currency'); S.settings.currency = cur; }
      const latest = uid => S.rates.filter(r => r.user_id === uid).sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
      const ups = $$('[data-rate]').map(tr => { const uid = tr.dataset.rate, c = tr.querySelector('[data-k=cost_rate]').value, b = tr.querySelector('[data-k=bill_rate]').value, l = latest(uid); if (c === '' && b === '') return null; const row = { user_id: uid, effective_from: from, cost_rate: Number(c || 0), bill_rate: Number(b || 0) }; return (l && Number(l.cost_rate) === row.cost_rate && Number(l.bill_rate) === row.bill_rate) ? null : row; }).filter(Boolean);
      if (ups.length) { const { error } = await S.sb.from('member_rates').upsert(ups); if (error) return toast('Couldn’t save the rates'); }
      const fxUps = $$('[data-fx]').filter(i => i.value !== '' && Number(i.value) > 0 && Number(i.value) !== Number((S.fxr || {})[i.dataset.fx])).map(i => ({ currency: i.dataset.fx, rate: Number(i.value), updated_at: new Date().toISOString() }));
      if (fxUps.length) { const { error } = await S.sb.from('exchange_rates').upsert(fxUps); if (error) return toast('Couldn’t save the exchange rates'); await loadFx(); }
      await loadRates(); toast(ups.length ? `Rates saved for ${ups.length} ${ups.length === 1 ? 'person' : 'people'}` : 'Saved'); renderSettings();
    };
  }
  async function loadRates(){ if (!can('settings')) return; const { data } = await S.sb.from('member_rates').select('*'); S.rates = data || []; }

  function editProject(p){
    const cats = CATEGORIES, tr = S.taskRates.filter(r => r.project_id === p.id);
    $('#editForm').innerHTML = `<h2 class="c6">Edit project</h2>
      <label>Job ID<input name="job_code" maxlength="20" value="${esc(p.job_code || '')}" placeholder="J001" style="text-transform:uppercase"></label><label class="c3">Name<input name="name" required maxlength="120" value="${esc(p.name)}"></label><label class="c2">Client<input name="client" value="${esc(p.client || '')}"></label><label>Colour<input type="color" name="color" value="${esc(p.color)}" class="swatch" style="width:100%;height:42px"></label>
      <label class="c2">Team lead<input name="team_lead" maxlength="60" value="${esc(p.team_lead || '')}" placeholder="e.g. JA/EO"></label><label class="c2">Year<input type="number" name="year" min="1990" max="2100" value="${p.year ?? ''}"></label><label class="c2">Type<input name="project_type" maxlength="60" value="${esc(p.project_type || '')}" placeholder="e.g. Workplace"></label>
      <label class="c4">Scope<input name="scope" maxlength="120" value="${esc(p.scope || '')}" placeholder="e.g. Consultancy / Fit Out"></label><span class="c2"></span>
      <label class="c2">Status<select name="status">${Object.entries(P_ST).map(([k, v]) => `<option value="${k}" ${k === (p.status || 'active') ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label><label class="c2">Currency<select name="currency">${curOpts(pcur(p))}</select></label><label class="c2">Billable rate per hour<input type="number" name="bill_rate" min="0" step="100" value="${p.bill_rate ?? ''}" placeholder="Use each person’s rate"></label>
      <label class="c2">Budget type<select name="budget_type"><option value="none">No budget</option><option value="hours" ${p.budget_type === 'hours' ? 'selected' : ''}>Hours</option><option value="amount" ${p.budget_type === 'amount' ? 'selected' : ''}>Amount (fees + billable expenses)</option></select></label>
      <label class="c2">Budget<input type="number" name="budget" min="0" step="1" value="${p.budget ?? ''}"></label>
      <label class="c2">Estimate (hours)<input type="number" name="estimate_hours" min="0" step="1" value="${p.estimate_hours ?? ''}" placeholder="Optional"></label>
      ${can('settings') ? `<details class="c6"><summary style="cursor:pointer;color:var(--muted);font-weight:500;padding:6px 0">Rates by activity (optional)</summary><p class="sub" style="font-size:12px;margin:4px 0 8px">Charge a different hourly rate for certain types of work on this project, for example site visits.</p><div class="trates">${cats.map(c => { const r = tr.find(x => x.category === c); return `<label>${c}<input type="number" min="0" step="100" data-cat="${esc(c)}" value="${r ? r.bill_rate : ''}" placeholder="Project rate"></label>`; }).join('')}</div></details>` : ''}
      <p class="c6 sub" style="font-size:12px">Managers get an email when a project reaches 80% and 100% of its budget.</p>
      <div class="c6" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn" value="save">Save project</button></div>`;
    const dlg = $('#editDlg'); dlg.showModal();
    $('#editForm').onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return; ev.preventDefault();
      const f = new FormData(ev.target), num = k => f.get(k) === '' ? null : Number(f.get(k));
      const jc = String(f.get('job_code') || '').trim().toUpperCase();
      if (jc && S.projects.some(x => x.id !== p.id && (x.job_code || '').toUpperCase() === jc)) return toast(`${jc} is already used by another project`);
      const { error } = await S.sb.from('projects').update({ job_code: jc || null, team_lead: String(f.get('team_lead') || '').trim().toUpperCase(), year: f.get('year') ? Number(f.get('year')) : null, project_type: String(f.get('project_type') || '').trim(), scope: String(f.get('scope') || '').trim(), status: f.get('status') || 'active', currency: f.get('currency') === baseCur() ? null : f.get('currency'), name: String(f.get('name')).trim(), client: String(f.get('client') || '').trim(), color: f.get('color'), bill_rate: num('bill_rate'), budget_type: f.get('budget_type'), budget: num('budget'), estimate_hours: num('estimate_hours') }).eq('id', p.id);
      if (error) return toast('Couldn’t save the project');
      if (can('settings')) { const rows = $$('[data-cat]', ev.target); const set = rows.filter(i => i.value !== '').map(i => ({ project_id: p.id, category: i.dataset.cat, bill_rate: Number(i.value) })), clear = rows.filter(i => i.value === '' && tr.some(x => x.category === i.dataset.cat)).map(i => i.dataset.cat);
        if (set.length) await S.sb.from('project_task_rates').upsert(set); for (const c of clear) await S.sb.from('project_task_rates').delete().eq('project_id', p.id).eq('category', c); }
      dlg.close(); toast('Project saved'); await Promise.all([loadProjects(), loadTaskRates()]); renderProjects();
    };
  }
  async function loadTaskRates(){ if (!isMgr()) return; const { data } = await S.sb.from('project_task_rates').select('*'); S.taskRates = data || []; }

  /* ---------- scheduling ---------- */
  const weekKeys = (off, n) => [...Array(n)].map((_, i) => dkey(startOfWeek(off + i)));
  async function loadPlan(){
    const from = dkey(startOfWeek(-8)), to = dkey(startOfWeek(26));
    const q = S.sb.from('assignments').select('*').gte('week_start', from).lte('week_start', to);
    const { data } = isMgr() ? await q : await q.eq('user_id', S.me.id);
    S.plan = data || [];
  }
  function capacityMins(uid, wk){
    const days = [...Array(7)].map((_, i) => dkey(addDays(fromKey(wk), i)));
    const list = uid === S.me.id && !isMgr() ? S.myLeave : S.allLeave;
    return Math.max(0, Number(S.settings.weekly_hours || 40) * 60 - offMinutes(uid, days, list));
  }
  function renderSchedule(){
    const weeks = weekKeys(S.schOffset, 8), people = S.people.filter(p => p.active), thisWk = dkey(startOfWeek(0));
    const cell = (uid, wk) => { const a = S.plan.filter(x => x.user_id === uid && x.week_start === wk), h = a.reduce((s, x) => s + Number(x.hours), 0), cap = capacityMins(uid, wk) / 60, cls = !h ? '' : h > cap ? 'over' : h >= cap * .9 ? 'full' : 'ok';
      return `<td class="sch ${cls} ${wk === thisWk ? 'now' : ''}" data-cell="${esc(uid)}|${wk}" tabindex="0" role="button" aria-label="Plan ${esc(nameOf(uid))}, week of ${wk}">${a.map(x => `<span class="chip" style="background:${esc(proj(x.project_id).color)}" title="${esc(proj(x.project_id).name)}: ${Number(x.hours)}h">${esc(proj(x.project_id).name.split(/\s+/)[0])} ${Number(x.hours)}h</span>`).join('')}<small>${h ? `${h}h / ${Math.round(cap)}h` : `<span class="plus">+</span>`}</small></td>`; };
    const totals = weeks.map(wk => { const h = S.plan.filter(x => x.week_start === wk).reduce((s, x) => s + Number(x.hours), 0), cap = people.reduce((s, p) => s + capacityMins(p.id, wk) / 60, 0); return { h, cap }; });
    main(`<div class="head"><div><h1>Schedule</h1><p class="sub">Plan who works on what, week by week. Capacity allows for leave and public holidays.</p></div>
      <div style="display:flex;gap:6px"><button class="btn ghost sm" id="sPrev">‹ Earlier</button><button class="btn ghost sm" id="sNow">This week</button><button class="btn ghost sm" id="sNext">Later ›</button></div></div>
      <div class="card scroll"><table class="sheet sch-t"><thead><tr><th>Person</th>${weeks.map(wk => `<th class="${wk === thisWk ? 'now' : ''}">${fromKey(wk).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</th>`).join('')}</tr></thead>
      <tbody>${people.map(p => `<tr><td>${esc(p.full_name || p.email)}</td>${weeks.map(wk => cell(p.id, wk)).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td>Team</td>${totals.map(t => `<td class="${t.h > t.cap ? 'ot' : ''}">${Math.round(t.h)}h <span class="sub">/ ${Math.round(t.cap)}h</span></td>`).join('')}</tr></tfoot></table></div>
      <div class="legend"><span><i style="background:var(--ok)"></i>Has spare capacity</span><span><i style="background:#b45309"></i>Nearly full</span><span><i style="background:var(--red)"></i>Over capacity</span><span>Click a cell to plan hours.</span></div>`);
    $('#sPrev').onclick = () => { S.schOffset -= 4; renderSchedule(); };
    $('#sNext').onclick = () => { S.schOffset += 4; renderSchedule(); };
    $('#sNow').onclick = () => { S.schOffset = 0; renderSchedule(); };
    $$('[data-cell]').forEach(td => { const open = () => planCell(...td.dataset.cell.split('|')); td.onclick = open; td.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; });
  }
  function planCell(uid, wk){
    const list = S.plan.filter(x => x.user_id === uid && x.week_start === wk), cap = capacityMins(uid, wk) / 60;
    $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">${esc(nameOf(uid))}</h2><p class="sub">Week of ${fromKey(wk).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} · capacity ${Math.round(cap)} hours</p></div>
      <div class="c6">${list.length ? list.map(x => `<div class="aprow"><span class="dot" style="background:${esc(proj(x.project_id).color)};width:12px;height:12px"></span><span class="ap-t"><b>${esc(proj(x.project_id).name)}</b><small>${Number(x.hours)} hours${x.note ? ' · ' + esc(x.note) : ''}</small></span><button type="button" class="btn ghost sm" data-adel="${esc(x.id)}">Remove</button></div>`).join('') : '<p class="sub">Nothing planned yet.</p>'}</div>
      <label class="c3">Project<select name="project_id" required>${projOptions('')}</select></label>
      <label>Hours<input type="number" name="hours" min="0.5" max="80" step="0.5" value="8" required></label>
      <label class="c2">Repeat for<select name="repeat"><option value="1">This week only</option><option value="2">2 weeks</option><option value="4">4 weeks</option><option value="8">8 weeks</option><option value="12">12 weeks</option></select></label>
      <label class="c6">Note (optional)<input name="note" maxlength="200" placeholder="e.g. Design development drawings"></label>
      <div class="c6" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Close</button><button class="btn red" value="save">Add to schedule</button></div>`;
    const dlg = $('#editDlg'); dlg.showModal();
    $$('[data-adel]').forEach(b => b.onclick = async () => { const { error } = await S.sb.from('assignments').delete().eq('id', b.dataset.adel); if (error) return toast('Couldn’t remove it'); await loadPlan(); dlg.close(); renderSchedule(); toast('Removed from schedule'); });
    $('#editForm').onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return; ev.preventDefault();
      const f = new FormData(ev.target), n = Number(f.get('repeat')), rows = [...Array(n)].map((_, i) => ({ user_id: uid, project_id: f.get('project_id'), week_start: dkey(addDays(fromKey(wk), 7 * i)), hours: Number(f.get('hours')), note: String(f.get('note') || '').trim() }));
      const { error } = await S.sb.from('assignments').insert(rows); if (error) return toast('Couldn’t save the plan');
      await loadPlan(); dlg.close(); renderSchedule(); toast(n > 1 ? `Planned for ${n} weeks` : 'Added to schedule');
    };
  }
  const myPlanHtml = () => { const weeks = weekKeys(0, 4), mine = S.plan.filter(x => x.user_id === S.me.id); if (!mine.some(x => weeks.includes(x.week_start))) return ''; return `<div class="card" style="margin-top:14px"><h2>My schedule</h2><div class="myplan">${weeks.map(wk => { const a = mine.filter(x => x.week_start === wk); return `<div><b>${wk === weeks[0] ? 'This week' : 'Week of ' + fromKey(wk).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</b>${a.length ? a.map(x => `<span class="tag" style="color:var(--ink)"><span class="dot" style="background:${esc(proj(x.project_id).color)}"></span>${esc(proj(x.project_id).name)} · ${Number(x.hours)}h</span>`).join('') : '<span class="sub">Nothing planned</span>'}</div>`; }).join('')}</div></div>`; };

  /* ---------- forecasting ---------- */
  async function renderForecast(){
    main(`<div class="notice"><p class="sub">Calculating…</p></div>`);
    const thisWk = dkey(startOfWeek(0)), today = dkey(new Date());
    const [a, f] = await Promise.all([S.sb.rpc('financials', { p_from: '2000-01-01', p_to: today }), S.sb.rpc('forecast', { p_from: thisWk })]);
    if (a.error || f.error) return main(`<div class="notice"><h1>Forecast</h1><p class="sub">${esc((a.error || f.error).message)}</p></div>`);
    const A = a.data || { projects: [], expenses: [] }, F = f.data || [];
    const rows = S.projects.filter(p => !p.archived).map(p => { const ac = (A.projects || []).find(x => x.project_id === p.id) || { minutes: 0, labour_cost: 0, billable_amount: 0 }, ex = (A.expenses || []).find(x => x.project_id === p.id) || { total: 0, billable: 0 }, fc = F.find(x => x.project_id === p.id) || { hours: 0, cost: 0, revenue: 0 };
      const actH = Number(ac.minutes) / 60, futH = Number(fc.hours), totH = actH + futH, rev = Number(ac.billable_amount) + Number(ex.billable) + Number(fc.revenue), cost = Number(ac.labour_cost) + Number(ex.total) + Number(fc.cost);
      const ref = p.budget_type === 'hours' && p.budget ? { label: p.budget + 'h budget', pct: totH / p.budget * 100 } : p.budget_type === 'amount' && p.budget ? { label: moneyIn(p.budget, pcur(p)) + ' budget', pct: rev / toBase(p.budget, pcur(p)) * 100 } : p.estimate_hours ? { label: p.estimate_hours + 'h estimate', pct: totH / p.estimate_hours * 100 } : null;
      return { p, actH, futH, totH, rev, cost, profit: rev - cost, ref }; }).filter(r => r.totH || r.ref).sort((x, y) => y.futH - x.futH);
    const weeks = weekKeys(0, 12), people = S.people.filter(p => p.active);
    const cap = weeks.map(wk => ({ wk, h: S.plan.filter(x => x.week_start === wk).reduce((s, x) => s + Number(x.hours), 0), c: people.reduce((s, p) => s + capacityMins(p.id, wk) / 60, 0) }));
    const mx = Math.max(1, ...cap.map(c => Math.max(c.h, c.c)));
    main(`<div class="head"><div><h1>Forecast</h1><p class="sub">Actual time and costs to date, plus scheduled work from this week, projected to completion.</p></div></div>
      <div class="card scroll"><h2>Projects at completion</h2>${rows.length ? `<table class="sheet"><thead><tr><th>Project</th><th>Hours to date</th><th>Scheduled</th><th>Projected hours</th><th>Projected revenue</th><th>Projected cost</th><th>Projected profit</th><th>Against</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="tag" style="color:var(--ink)"><span class="dot" style="background:${esc(r.p.color)}"></span>${esc(r.p.name)}</span></td><td>${Math.round(r.actH)}h</td><td>${Math.round(r.futH)}h</td><td><b>${Math.round(r.totH)}h</b></td><td>${money(r.rev)}</td><td>${money(r.cost)}</td><td style="color:${r.profit < 0 ? 'var(--red)' : 'inherit'}"><b>${money(r.profit)}</b></td><td>${r.ref ? `<span style="color:${r.ref.pct > 100 ? 'var(--red)' : r.ref.pct >= 80 ? '#b45309' : 'var(--ok)'};font-weight:600">${Math.round(r.ref.pct)}%</span> <span class="sub">of ${r.ref.label}</span>` : '–'}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">Add budgets or schedule work to see forecasts.</p>'}</div>
      <div class="card" style="margin-top:14px"><h2>Team capacity, next 12 weeks</h2><div class="capchart">${cap.map(c => `<div><span class="cap-bar"><i class="cap-c" style="height:${c.c / mx * 100}%"></i><i class="cap-h ${c.h > c.c ? 'over' : ''}" style="height:${c.h / mx * 100}%"></i></span><em>${Math.round(c.h)}/${Math.round(c.c)}h</em><small>${fromKey(c.wk).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small></div>`).join('')}</div>
        <div class="legend"><span><i style="background:var(--line)"></i>Capacity</span><span><i style="background:var(--ink)"></i>Scheduled</span><span><i style="background:var(--red)"></i>Over capacity</span></div></div>
      <p class="sub" style="font-size:12px;margin-top:10px">Projected revenue uses the project’s billable rate, or each person’s rate if the project has none. Set an internal project’s rate to 0 so it doesn’t count as revenue. Costs use each person’s hourly cost.</p>`);
  }

  /* ---------- invoices (admin) ---------- */
  const INV_ST = { draft: 'Draft', sent: 'Sent', part_paid: 'Part paid', paid: 'Paid', void: 'Void' };
  const isOverdue = i => ['sent', 'part_paid'].includes(i.status) && i.due_date < dkey(new Date());
  const invBal = i => Math.max(0, Number(i.total) - Number(i.amount_paid || 0));
  async function loadInvoices(){ const [i, r] = await Promise.all([S.sb.from('invoices').select('*').order('issue_date', { ascending: false }).order('number', { ascending: false }), S.sb.from('recurring_invoices').select('*').order('next_date')]); S.invoices = i.data || []; S.recurring = r.data || []; }
  const invMoney = (n, cur) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: cur || S.settings.currency || 'NGN' }).format(Number(n) || 0);
  function renderInvoices(){
    const L = S.invoices, today = dkey(new Date()), m0 = today.slice(0, 7);
    const list = L.filter(i => S.invTab === 'all' ? i.status !== 'void' : S.invTab === 'overdue' ? isOverdue(i) : i.status === S.invTab);
    main(`<div class="head"><div><h1>Invoices</h1><p class="sub">Bill clients for approved billable time and expenses, or for fixed fees.</p></div><button class="btn red" id="newInv">New invoice</button></div>
      <div class="grid g4">${kpi('Outstanding', money(L.filter(i => ['sent', 'part_paid'].includes(i.status)).reduce((a, i) => a + toBase(invBal(i), i.currency), 0)), L.filter(i => ['sent', 'part_paid'].includes(i.status)).length + ' unpaid or part paid')}${kpi('Overdue', `<span style="color:${L.some(isOverdue) ? 'var(--red)' : 'inherit'}">${money(L.filter(isOverdue).reduce((a, i) => a + toBase(invBal(i), i.currency), 0))}</span>`, L.filter(isOverdue).length + ' invoices')}${kpi('Paid this month', money(L.filter(i => i.status === 'paid' && (i.paid_at || '').startsWith(m0)).reduce((a, i) => a + Number(i.total), 0)), '')}${kpi('Drafts', L.filter(i => i.status === 'draft').length, 'not sent yet')}</div>
      <div class="toolbar"><div class="seg">${[['all', 'All'], ['draft', 'Drafts'], ['sent', 'Sent'], ['part_paid', 'Part paid'], ['overdue', 'Overdue'], ['paid', 'Paid'], ['void', 'Void']].map(([k, l]) => `<button data-it="${k}" class="${S.invTab === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="card scroll">${list.length ? `<table class="sheet inv-t"><thead><tr><th>Number</th><th style="text-align:left">Client</th><th>Issued</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead><tbody>${list.map(i => `<tr data-inv="${esc(i.id)}" tabindex="0" role="button"><td><b>${esc(i.number)}</b></td><td style="text-align:left">${esc(i.client_name)}${i.recurring_id ? ' <span class="tag">recurring</span>' : ''}</td><td>${fmtD(i.issue_date)}</td><td>${fmtD(i.due_date)}</td><td><b>${invMoney(i.total, i.currency)}</b></td><td>${['sent', 'part_paid'].includes(i.status) ? invMoney(invBal(i), i.currency) : '–'}</td><td><span class="ist ist-${isOverdue(i) ? 'overdue' : i.status}">${isOverdue(i) ? 'Overdue' : INV_ST[i.status]}</span></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No invoices here yet.</p>'}</div>`);
    $$('[data-it]').forEach(b => b.onclick = () => { S.invTab = b.dataset.it; renderInvoices(); });
    $$('[data-inv]').forEach(tr => { tr.onclick = () => viewInvoice(tr.dataset.inv); tr.onkeydown = e => { if (e.key === 'Enter') viewInvoice(tr.dataset.inv); }; });
    $('#newInv').onclick = newInvoice;
  }
  function newInvoice(){
    const today = dkey(new Date()), first = dkey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)), last = dkey(new Date(new Date().getFullYear(), new Date().getMonth(), 0));
    $('#editForm').innerHTML = `<h2 class="c6">New invoice</h2>
      <label class="c3">Project<select name="project_id"><option value="">No project (fixed fee)</option>${S.projects.filter(p => !p.archived).map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.client ? ' · ' + esc(p.client) : ''}</option>`).join('')}</select></label>
      <label class="c3">Client name<input name="client_name" required maxlength="120"></label>
      <label class="c3">Client email<input type="email" name="client_email" placeholder="accounts@client.com"></label>
      <label class="c3">Client address<input name="client_address" maxlength="300"></label>
      <label class="c2">Bill work from<input type="date" name="period_from" value="${first}"></label><label class="c2">to<input type="date" name="period_to" value="${last}"></label>
      <label class="c2">Issue date<input type="date" name="issue_date" value="${today}" required></label>
      <label class="bill c6"><input type="checkbox" name="import" checked>Add uninvoiced billable time and approved billable expenses for this project and period</label>
      <div class="c6" style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Create draft</button></div>`;
    const f = $('#editForm'), dlg = $('#editDlg'); dlg.showModal();
    const prefill = () => { const p = S.projects.find(x => x.id === f.project_id.value); if (!p) return; const prev = S.invoices.find(i => i.project_id === p.id) || S.invoices.find(i => i.client_name === p.client); f.client_name.value = prev?.client_name || p.client || ''; f.client_email.value = prev?.client_email || ''; f.client_address.value = prev?.client_address || ''; };
    f.project_id.onchange = prefill;
    f.onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return; ev.preventDefault();
      const d = new FormData(f), pid = d.get('project_id') || null, from = d.get('period_from'), to = d.get('period_to'), issue = d.get('issue_date');
      const due = dkey(addDays(fromKey(issue), Number(S.settings.payment_terms || 30)));
      const { data: inv, error } = await S.sb.from('invoices').insert({ client_name: String(d.get('client_name')).trim(), client_email: String(d.get('client_email') || '').trim(), client_address: String(d.get('client_address') || '').trim(), project_id: pid, issue_date: issue, due_date: due, period_from: from || null, period_to: to || null, currency: pid ? pcur(proj(pid)) : baseCur(), tax_rate: Number(S.settings.tax_rate ?? 7.5), notes: S.settings.invoice_note || '' }).select().single();
      if (error) return toast('Couldn’t create the invoice');
      let n = 0;
      if (pid && d.get('import') === 'on') {
        const { data: lines } = await S.sb.rpc('billable_lines', { p_project: pid, p_from: from, p_to: to });
        const items = (lines || []).map((l, i) => ({ invoice_id: inv.id, sort: i, kind: 'time', description: `${l.category} (${fromKey(from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${fromKey(to).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})`, quantity: Math.round(l.minutes / 60 * 100) / 100, unit_price: Number(l.rate) }));
        const { data: exps } = await S.sb.from('expenses').select('*').eq('project_id', pid).eq('status', 'approved').eq('billable', true).is('invoice_id', null).gte('spent_on', from).lte('spent_on', to);
        (exps || []).forEach((x, i) => items.push({ invoice_id: inv.id, sort: 100 + i, kind: 'expense', description: `Expense: ${x.note || x.category} (${fmtD(x.spent_on)})`, quantity: 1, unit_price: Math.round(toBase(x.amount, expCur(x)) / fxOf(pcur(proj(pid))) * 100) / 100 }));
        if (items.length) await S.sb.from('invoice_items').insert(items);
        const { error: le } = await S.sb.rpc('invoice_link', { p_invoice: inv.id, p_entries: (lines || []).flatMap(l => l.ids), p_expenses: (exps || []).map(x => x.id) });
        if (le) toast('Lines added, but the time couldn’t be locked to this invoice');
        n = items.length;
      }
      dlg.close(); await loadInvoices(); toast(n ? `Draft created with ${n} line${n === 1 ? '' : 's'}` : 'Draft created. Add lines to it.'); viewInvoice(inv.id);
    };
  }
  const invF = (i, k) => (i && i[k] && String(i[k]).trim()) ? i[k] : (S.settings[k] || '');
  function editInvoiceDetails(i){
    const v = k => esc(invF(i, k)), sent = i.status !== 'draft';
    $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">Invoice details</h2><p class="sub">${sent ? 'This invoice has already been sent. Changes update the portal copy and anything you print or email from now on.' : 'Everything shown on the invoice, apart from the lines.'}</p></div>
      <label class="c2">Invoice number<input name="number" required maxlength="40" value="${esc(i.number || '')}"></label>
      <label class="c2">Issue date<input type="date" name="issue_date" required value="${i.issue_date}"></label>
      <label class="c2">Due date<input type="date" name="due_date" required value="${i.due_date}"></label>
      <label class="c3">Client PO / reference<input name="po_number" maxlength="80" value="${esc(i.po_number || '')}" placeholder="Optional"></label>
      <label class="c3">Currency<select name="currency">${CURRENCIES.map(c => `<option ${c === i.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <h3 class="c6 ed-h">Bill to</h3>
      <label class="c3">Client name<input name="client_name" required maxlength="160" value="${esc(i.client_name)}"></label>
      <label class="c3">Client email<input type="email" name="client_email" maxlength="200" value="${esc(i.client_email || '')}"></label>
      <label class="c6">Client address<textarea name="client_address" rows="2" maxlength="400">${esc(i.client_address || '')}</textarea></label>
      <h3 class="c6 ed-h">From</h3>
      <label class="c3">Company name<input name="company_name" maxlength="160" value="${v('company_name')}"></label>
      <label class="c3">Company email<input type="email" name="company_email" maxlength="200" value="${v('company_email')}"></label>
      <label class="c6">Company address<textarea name="company_address" rows="2" maxlength="400">${v('company_address')}</textarea></label>
      <h3 class="c6 ed-h">Payment details</h3>
      <label class="c6">Bank and account details shown on the invoice<textarea name="bank_details" rows="4" maxlength="1000" placeholder="Bank: …&#10;Account name: …&#10;Account number: …&#10;Sort code / SWIFT: …">${v('bank_details')}</textarea></label>
      <h3 class="c6 ed-h">Tax, discount and note</h3>
      <label class="c2">Tax label<input name="tax_label" maxlength="30" value="${esc(i.tax_label || 'VAT')}"></label>
      <label class="c2">Tax %<input type="number" name="tax_rate" min="0" step="0.5" value="${Number(i.tax_rate)}"></label>
      <label class="c2">Discount (${esc(i.currency)})<input type="number" name="discount" min="0" step="0.01" value="${Number(i.discount)}"></label>
      <label class="c6">Note on invoice<textarea name="notes" rows="2" maxlength="1000">${esc(i.notes || '')}</textarea></label>
      ${can('settings') || can('invoices') ? '<label class="bill c6"><input type="checkbox" name="as_default">Also use these company and payment details for new invoices</label>' : ''}
      <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Save details</button></div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    f.onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return; ev.preventDefault();
      const d = new FormData(f), g = k => String(d.get(k) ?? '').trim();
      if (g('due_date') < g('issue_date')) return toast('The due date is before the issue date');
      const row = { number: g('number'), issue_date: g('issue_date'), due_date: g('due_date'), po_number: g('po_number'), currency: g('currency'), client_name: g('client_name'), client_email: g('client_email'), client_address: g('client_address'),
        company_name: g('company_name'), company_email: g('company_email'), company_address: g('company_address'), bank_details: g('bank_details'), tax_label: g('tax_label') || 'VAT', tax_rate: Number(g('tax_rate') || 0), discount: Number(g('discount') || 0), notes: g('notes') };
      const { error } = await S.sb.from('invoices').update(row).eq('id', i.id);
      if (error) return toast(/duplicate|unique/i.test(error.message || '') ? `Invoice number ${row.number} is already used` : 'Couldn’t save the invoice');
      if (d.get('as_default') === 'on') { const def = { company_name: row.company_name, company_email: row.company_email, company_address: row.company_address, bank_details: row.bank_details }; const r = await S.sb.from('settings').update(def).eq('id', 1); if (!r.error) S.settings = { ...S.settings, ...def }; }
      dlg.close(); await loadInvoices(); toast('Invoice details saved'); viewInvoice(i.id);
    };
  }
  const PAY_METHODS = ['Bank transfer', 'Cheque', 'Cash', 'Card', 'Mobile money', 'Other'];
  async function viewInvoice(id){
    S.tab = 'invoice'; S.invId = id; renderTop();
    const i = S.invoices.find(x => x.id === id); if (!i) return go('invoices');
    const [{ data: items }, { data: pays }] = await Promise.all([S.sb.from('invoice_items').select('*').eq('invoice_id', id).order('sort'), S.sb.from('invoice_payments').select('*').eq('invoice_id', id).order('paid_on')]);
    const draft = i.status === 'draft', m = n => invMoney(n, i.currency), paid = Number(i.amount_paid || 0), bal = Number(i.total) - paid;
    const open = ['sent', 'part_paid'].includes(i.status), stLabel = isOverdue(i) ? 'Overdue' : INV_ST[i.status];
    const discLabel = i.discount_type === 'percent' && Number(i.discount_pct) ? `Discount (${Number(i.discount_pct)}%)` : 'Discount';
    main(`<div class="head no-print"><div><button class="link" id="backInv" style="margin:0 0 6px">‹ All invoices</button><h1>Invoice ${esc(i.number)}</h1><p class="sub"><span class="ist ist-${isOverdue(i) ? 'overdue' : i.status}">${stLabel}</span>${i.sent_at ? ' · sent ' + new Date(i.sent_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : ''}${i.paid_at ? ' · paid ' + fmtD(i.paid_at) : ''}${paid && bal > 0 ? ` · ${m(bal)} still due` : ''}</p></div>
      <div class="ap-act">${i.status !== 'void' ? '<button class="btn ghost" id="editInvD">Edit details</button>' : ''}${open && !paid ? '<button class="btn ghost" id="reopenInv">Reopen for editing</button>' : ''}${i.status !== 'void' ? '<button class="btn ghost" id="printInv">Print or save PDF</button>' : ''}${draft || open ? `<button class="btn ghost" id="mailInv">${draft ? 'Email to client' : 'Email again'}</button>` : ''}${open ? '<button class="btn ghost" id="payInv">Record payment</button><button class="btn red" id="paidInv">Paid in full</button>' : ''}${draft ? '<button class="btn red" id="sentInv">Mark as sent</button>' : ''}${i.status !== 'void' && i.status !== 'paid' && !paid ? '<button class="btn ghost" id="voidInv">Void</button>' : ''}${draft ? '<button class="btn ghost" id="delInv">Delete draft</button>' : ''}</div></div>
      <div class="invoice card">
        <div class="inv-top"><div><img src="logo.png" alt="" class="inv-logo"><h2>${esc(invF(i, 'company_name') || 'James Cubitt Interiors')}</h2><p class="pre">${esc(invF(i, 'company_address'))}<br>${esc(invF(i, 'company_email'))}</p></div><div class="inv-meta"><h1>INVOICE</h1><p><b>${esc(i.number)}</b></p>${i.po_number ? `<p>Your ref: ${esc(i.po_number)}</p>` : ''}<p>Issued ${fmtD(i.issue_date)}<br>Due ${fmtD(i.due_date)}</p></div></div>
        <div class="inv-to"><small>BILL TO</small>${draft ? `<input id="cName" value="${esc(i.client_name)}" aria-label="Client name"><input id="cEmail" value="${esc(i.client_email)}" placeholder="Client email" aria-label="Client email"><textarea id="cAddr" rows="2" placeholder="Client address" aria-label="Client address">${esc(i.client_address)}</textarea>` : `<b>${esc(i.client_name)}</b><p class="pre">${esc(i.client_address)}${i.client_email ? '\n' + esc(i.client_email) : ''}</p>`}${i.project_id ? `<p class="sub">Project: ${proj(i.project_id).job_code ? esc(proj(i.project_id).job_code) + ' · ' : ''}${esc(proj(i.project_id).name)}${i.period_from ? ` · ${fmtD(i.period_from)} – ${fmtD(i.period_to)}` : ''}</p>` : ''}</div>
        <div class="inv-lines ${draft ? 'edit' : ''}">
          <div class="il-head"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span>${draft ? '<span></span>' : ''}</div>
          ${(items || []).map(it => draft
            ? `<div class="il-row" data-item="${esc(it.id)}"><span class="il-d"><textarea data-k="description" rows="1" aria-label="Description">${esc(it.description)}</textarea></span><span><input data-k="quantity" type="number" step="0.01" value="${Number(it.quantity)}" aria-label="Quantity"></span><span><input data-k="unit_price" type="number" step="0.01" value="${Number(it.unit_price)}" aria-label="Rate"></span><span class="il-a">${m(it.amount)}</span><span><button type="button" class="icon" data-idel="${esc(it.id)}" aria-label="Remove line">×</button></span></div>`
            : `<div class="il-row"><span class="il-d">${esc(it.description)}</span><span data-l="Qty">${Number(it.quantity)}</span><span data-l="Rate">${m(it.unit_price)}</span><span class="il-a" data-l="Amount">${m(it.amount)}</span></div>`).join('') || '<p class="empty">No lines yet.</p>'}
        </div>
        ${draft ? '<div class="no-print" style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap"><button type="button" class="btn ghost sm" id="addLine">+ Add line</button><button type="button" class="btn ghost sm" id="addStage">+ Stage or deposit payment</button><button type="button" class="btn sm" id="saveLines">Save changes</button></div>' : ''}
        <div class="inv-sum">
          <div><span>Subtotal</span><b>${m(i.subtotal)}</b></div>
          ${draft ? `<div><span>Discount <select id="discT" aria-label="Discount type"><option value="amount" ${i.discount_type !== 'percent' ? 'selected' : ''}>${esc(i.currency)}</option><option value="percent" ${i.discount_type === 'percent' ? 'selected' : ''}>%</option></select></span><input id="disc" type="number" min="0" step="0.01" value="${i.discount_type === 'percent' ? Number(i.discount_pct) : Number(i.discount)}" aria-label="Discount"></div>${Number(i.discount) ? `<div class="sub-line"><span></span><b>−${m(i.discount)}</b></div>` : ''}` : (Number(i.discount) ? `<div><span>${discLabel}</span><b>−${m(i.discount)}</b></div>` : '')}
          <div><span>${esc(i.tax_label || 'VAT')} ${draft ? `<input id="taxr" type="number" min="0" step="0.5" value="${Number(i.tax_rate)}" style="width:64px">` : Number(i.tax_rate)}%</span><b>${m(i.tax)}</b></div>
          <div class="inv-total"><span>${paid ? 'Invoice total' : 'Total due'}</span><b>${m(i.total)}</b></div>
          ${paid ? `<div><span>Paid to date</span><b>−${m(paid)}</b></div><div class="inv-total bal"><span>${bal > 0 ? 'Balance due' : 'Balance'}</span><b>${m(Math.max(0, bal))}</b></div>` : ''}
        </div>
        ${invF(i, 'bank_details') ? `<div class="inv-bank"><small>PAYMENT DETAILS</small><p>${esc(invF(i, 'bank_details'))}</p></div>` : ''}
        ${draft ? `<label class="no-print" style="display:grid;gap:4px;font-size:12px;color:var(--muted);margin-top:12px">Note on invoice<textarea id="iNote" rows="2">${esc(i.notes)}</textarea></label><label class="no-print" style="display:grid;gap:4px;font-size:12px;color:var(--muted);margin-top:8px;max-width:220px">Due date<input type="date" id="iDue" value="${i.due_date}"></label>` : (i.notes ? `<p class="inv-note pre">${esc(i.notes)}</p>` : '')}
      </div>
      ${!draft && i.status !== 'void' ? `<div class="card no-print" style="margin-top:14px;max-width:880px"><div class="head" style="margin-bottom:6px"><h2 style="margin:0">Payments</h2>${open ? '<button class="btn ghost sm" id="payInv2">Record payment</button>' : ''}</div>
        ${(pays || []).length ? `<table class="sheet"><thead><tr><th style="text-align:left">Date</th><th style="text-align:left">Method</th><th style="text-align:left">Reference</th><th>Amount</th><th></th></tr></thead><tbody>${pays.map(p => `<tr><td style="text-align:left">${fmtD(p.paid_on)}</td><td style="text-align:left">${esc(p.method)}</td><td style="text-align:left">${esc(p.reference)}${p.note ? `<small class="sub" style="display:block">${esc(p.note)}</small>` : ''}</td><td><b>${m(p.amount)}</b></td><td><button class="icon" data-pdel="${esc(p.id)}" aria-label="Remove payment">×</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No payments recorded yet.</p>'}</div>` : ''}`);
    $$('.inv-lines textarea, #cAddr, #iNote').forEach(t => { const fit = () => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }; t.addEventListener('input', fit); fit(); });
    $('#backInv').onclick = () => go('invoices');
    const setStatus = async (patch, msg) => { const { error } = await S.sb.from('invoices').update(patch).eq('id', id); if (error) return toast('Couldn’t update the invoice'); await loadInvoices(); toast(msg); viewInvoice(id); };
    if ($('#printInv')) $('#printInv').onclick = () => window.print();
    if ($('#editInvD')) $('#editInvD').onclick = async () => { if (draft) await saveDraft(true); editInvoiceDetails(S.invoices.find(x => x.id === id) || i); };
    if ($('#reopenInv')) $('#reopenInv').onclick = () => { if (!confirm('Reopen this invoice as a draft so you can change its lines? Remember to email the client the corrected version.')) return; setStatus({ status: 'draft' }, 'Reopened as a draft'); };
    if ($('#sentInv')) $('#sentInv').onclick = async () => { await saveDraft(true); setStatus({ status: 'sent', sent_at: new Date().toISOString() }, 'Marked as sent'); };
    const recordPay = (amount) => {
      $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">Record a payment</h2><p class="sub">Invoice ${esc(i.number)} · ${m(i.total)} total · ${m(Math.max(0, bal))} still due</p></div>
        <label class="c2">Amount (${esc(i.currency)})<input type="number" name="amount" min="0.01" step="0.01" required value="${amount ?? ''}" inputmode="decimal"></label>
        <label class="c2">Date received<input type="date" name="paid_on" required value="${dkey(new Date())}" max="${dkey(new Date())}"></label>
        <label class="c2">Method<select name="method">${PAY_METHODS.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="c3">Reference<input name="reference" maxlength="120" placeholder="e.g. bank transfer ref or cheque no."></label>
        <label class="c3">Note<input name="note" maxlength="500" placeholder="Optional"></label>
        <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Save payment</button></div>`;
      const dlg = $('#editDlg'), f = $('#editForm'); dlg.showModal();
      f.onsubmit = async ev => { if (ev.submitter?.value !== 'save') return; ev.preventDefault(); const d = new FormData(f), amt = Number(d.get('amount'));
        if (amt > bal + 0.005 && !confirm(`That’s more than the ${m(bal)} still due. Record it anyway?`)) return;
        const { error } = await S.sb.from('invoice_payments').insert({ invoice_id: id, amount: amt, paid_on: d.get('paid_on'), method: d.get('method'), reference: String(d.get('reference') || '').trim(), note: String(d.get('note') || '').trim() });
        if (error) return toast('Couldn’t record the payment'); dlg.close(); await loadInvoices(); const ni = S.invoices.find(x => x.id === id); toast(ni && ni.status === 'paid' ? 'Payment recorded: invoice paid in full' : `Payment recorded: ${m(Math.max(0, (ni ? ni.total - ni.amount_paid : bal - amt)))} still due`); viewInvoice(id); };
    };
    if ($('#payInv')) $('#payInv').onclick = () => recordPay(null);
    if ($('#payInv2')) $('#payInv2').onclick = () => recordPay(null);
    if ($('#paidInv')) $('#paidInv').onclick = () => recordPay(Math.round(Math.max(0, bal) * 100) / 100);
    $$('[data-pdel]').forEach(b => b.onclick = async () => { if (!confirm('Remove this payment?')) return; const { error } = await S.sb.from('invoice_payments').delete().eq('id', b.dataset.pdel); if (error) return toast('Couldn’t remove the payment'); await loadInvoices(); toast('Payment removed'); viewInvoice(id); });
    if ($('#mailInv')) $('#mailInv').onclick = async e => { if (!i.client_email && !$('#cEmail')?.value) return toast('Add the client’s email address first'); if (draft) await saveDraft(true); e.currentTarget.disabled = true; const { error } = await S.sb.functions.invoke('notify', { body: { job: 'invoice', invoice_id: id } }); if (error) { e.currentTarget.disabled = false; return toast('The invoice couldn’t be emailed. Check the email setup.'); } await loadInvoices(); toast('Invoice emailed to ' + (i.client_email || $('#cEmail')?.value)); viewInvoice(id); };
    const unlink = async () => { await S.sb.rpc('invoice_unlink', { p_invoice: id }); };
    if ($('#voidInv')) $('#voidInv').onclick = async () => { if (!confirm('Void this invoice? Its time and expenses become available to invoice again.')) return; await unlink(); setStatus({ status: 'void' }, 'Invoice voided'); };
    if ($('#delInv')) $('#delInv').onclick = async () => { if (!confirm('Delete this draft?')) return; await unlink(); const { error } = await S.sb.from('invoices').delete().eq('id', id); if (error) return toast('Couldn’t delete the draft'); await loadInvoices(); toast('Draft deleted'); go('invoices'); };
    async function saveDraft(quiet){
      if (!draft) return true;
      for (const tr of $$('[data-item]')) { const v = k => tr.querySelector(`[data-k=${k}]`).value; await S.sb.from('invoice_items').update({ description: v('description').trim(), quantity: Number(v('quantity')), unit_price: Number(v('unit_price')) }).eq('id', tr.dataset.item); }
      const dt = $('#discT').value, dv = Number($('#disc').value || 0);
      if (dt === 'percent' && (dv < 0 || dv > 100)) { toast('A percentage discount must be between 0 and 100'); return false; }
      const { error } = await S.sb.from('invoices').update({ client_name: $('#cName').value.trim(), client_email: $('#cEmail').value.trim(), client_address: $('#cAddr').value.trim(), discount_type: dt, discount_pct: dt === 'percent' ? dv : 0, discount: dt === 'percent' ? 0 : dv, tax_rate: Number($('#taxr').value || 0), notes: $('#iNote').value, due_date: $('#iDue').value }).eq('id', id);
      if (error) { toast('Couldn’t save the invoice'); return false; }
      await loadInvoices(); if (!quiet) { toast('Invoice saved'); viewInvoice(id); } return true;
    }
    if (draft) {
      $('#saveLines').onclick = () => saveDraft(false);
      $('#addLine').onclick = async () => { await saveDraft(true); await S.sb.from('invoice_items').insert({ invoice_id: id, sort: (items || []).length + 200, kind: 'fixed', description: 'Design fee', quantity: 1, unit_price: 0 }); await loadInvoices(); viewInvoice(id); };
      $('#addStage').onclick = async () => {
        await saveDraft(true); const p = proj(i.project_id), base = p && p.budget_type === 'amount' && p.budget ? Number(p.budget) : '';
        $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">Stage or deposit payment</h2><p class="sub">Bill a percentage of the agreed fee, for example a 30% deposit or the Design development stage.</p></div>
          <label class="c6">Description<input name="desc" required maxlength="200" value="Stage payment: Design development"></label>
          <label class="c3">Agreed fee (${esc(i.currency)})<input type="number" name="fee" min="0" step="0.01" required value="${base}" placeholder="Total fee for the job"></label>
          <label class="c3">Percentage to bill now<input type="number" name="pct" min="0.01" max="100" step="0.01" required value="30"></label>
          <p class="c6 sub" id="stPrev" style="font-size:13px"></p>
          <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Add line</button></div>`;
        const dlg = $('#editDlg'), f = $('#editForm'); dlg.showModal();
        const pv = () => { const v = Number(f.fee.value || 0) * Number(f.pct.value || 0) / 100; $('#stPrev').textContent = v ? `Adds a line of ${m(v)}.` : ''; }; f.fee.oninput = pv; f.pct.oninput = pv; pv();
        f.onsubmit = async ev => { if (ev.submitter?.value !== 'save') return; ev.preventDefault(); const fee = Number(f.fee.value), pct = Number(f.pct.value), amt = Math.round(fee * pct) / 100;
          const { error } = await S.sb.from('invoice_items').insert({ invoice_id: id, sort: (items || []).length + 200, kind: 'fixed', description: `${f.desc.value.trim()} (${pct}% of ${m(fee)} agreed fee)`, quantity: 1, unit_price: amt });
          if (error) return toast('Couldn’t add the line'); dlg.close(); toast('Stage payment line added'); await loadInvoices(); viewInvoice(id); };
      };
      $$('[data-idel]').forEach(b => b.onclick = async () => { await saveDraft(true); await S.sb.from('invoice_items').delete().eq('id', b.dataset.idel); await loadInvoices(); viewInvoice(id); });
    }
  }

  function renderRecurring(){
    main(`<div class="head"><div><h1>Recurring invoices</h1><p class="sub">Retainers and fixed monthly fees. A draft is created automatically on each date, or emailed straight to the client if you choose.</p></div><button class="btn red" id="newRec">New recurring invoice</button></div>
      <div class="card">${S.recurring.length ? S.recurring.map(r => `<div class="aprow ${r.active ? '' : 'off'}"><span class="ap-t"><b>${esc(r.client_name)} · ${moneyIn(r.amount, r.currency || baseCur())} ${r.frequency}</b><small>${esc(r.description)} · next ${fmtD(r.next_date)}${r.end_date ? ' · ends ' + fmtD(r.end_date) : ''} · ${r.auto_send ? 'emailed automatically' : 'saved as draft'}${r.active ? '' : ' · paused'}</small></span><span class="ap-act"><button class="btn ghost sm" data-redit="${esc(r.id)}">Edit</button><button class="btn ghost sm" data-rtog="${esc(r.id)}">${r.active ? 'Pause' : 'Resume'}</button></span></div>`).join('') : '<p class="empty">No recurring invoices yet.</p>'}</div>`);
    $('#newRec').onclick = () => editRecurring(null);
    $$('[data-redit]').forEach(b => b.onclick = () => editRecurring(S.recurring.find(r => r.id === b.dataset.redit)));
    $$('[data-rtog]').forEach(b => b.onclick = async () => { const r = S.recurring.find(x => x.id === b.dataset.rtog); await S.sb.from('recurring_invoices').update({ active: !r.active }).eq('id', r.id); await loadInvoices(); renderRecurring(); toast(r.active ? 'Paused' : 'Resumed'); });
  }
  function editRecurring(r){
    const x = r || { client_name: '', client_email: '', client_address: '', project_id: null, description: 'Monthly design retainer', amount: '', tax_rate: S.settings.tax_rate ?? 7.5, frequency: 'monthly', next_date: dkey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)), end_date: '', auto_send: false };
    $('#editForm').innerHTML = `<h2 class="c6">${r ? 'Edit' : 'New'} recurring invoice</h2>
      <label class="c3">Client name<input name="client_name" required value="${esc(x.client_name)}"></label><label class="c3">Client email<input type="email" name="client_email" value="${esc(x.client_email)}"></label>
      <label class="c3">Client address<input name="client_address" value="${esc(x.client_address)}"></label><label class="c3">Project (optional)<select name="project_id"><option value="">None</option>${S.projects.map(p => `<option value="${esc(p.id)}" ${p.id === x.project_id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="c4">Line description<input name="description" required value="${esc(x.description)}"></label><label class="c2">Amount before VAT<input type="number" name="amount" min="1" step="0.01" required value="${x.amount}"></label>
      <label>Currency<select name="currency">${curOpts(x.currency || baseCur())}</select></label><label>Every<select name="frequency">${['monthly', 'quarterly', 'yearly'].map(f => `<option value="${f}" ${f === x.frequency ? 'selected' : ''}>${{ monthly: 'Month', quarterly: 'Quarter', yearly: 'Year' }[f]}</option>`).join('')}</select></label>
      <label class="c2">Next invoice date<input type="date" name="next_date" required value="${x.next_date}"></label><label class="c2">End date (optional)<input type="date" name="end_date" value="${x.end_date || ''}"></label>
      <label>VAT %<input type="number" name="tax_rate" min="0" step="0.5" value="${x.tax_rate}"></label><label class="bill c5" style="margin-top:16px"><input type="checkbox" name="auto_send" ${x.auto_send ? 'checked' : ''}>Email to the client automatically (otherwise saved as a draft for you to check)</label>
      <div class="c6" style="display:flex;gap:8px;justify-content:flex-end">${r ? '<button class="btn ghost" value="delete" formnovalidate>Delete</button>' : ''}<button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Save</button></div>`;
    const dlg = $('#editDlg'); dlg.showModal();
    $('#editForm').onsubmit = async ev => {
      const v = ev.submitter?.value; if (v === 'cancel') return; ev.preventDefault();
      if (v === 'delete') { if (!confirm('Delete this recurring invoice? Invoices already created stay.')) return; await S.sb.from('recurring_invoices').delete().eq('id', r.id); dlg.close(); await loadInvoices(); renderRecurring(); return toast('Deleted'); }
      const f = new FormData(ev.target), row = { client_name: f.get('client_name').trim(), client_email: f.get('client_email').trim(), client_address: f.get('client_address').trim(), project_id: f.get('project_id') || null, description: f.get('description').trim(), currency: f.get('currency') === baseCur() ? '' : f.get('currency'), amount: Number(f.get('amount')), frequency: f.get('frequency'), next_date: f.get('next_date'), end_date: f.get('end_date') || null, tax_rate: Number(f.get('tax_rate') || 0), auto_send: f.get('auto_send') === 'on', active: true };
      const { error } = r ? await S.sb.from('recurring_invoices').update(row).eq('id', r.id) : await S.sb.from('recurring_invoices').insert(row);
      if (error) return toast('Couldn’t save'); dlg.close(); await loadInvoices(); renderRecurring(); toast('Recurring invoice saved');
    };
  }
  function invoiceSettingsHtml(){ const c = S.settings; return `<form class="card f" id="invSet" style="margin-top:14px"><h2 class="c6">Invoice details</h2>
      <label class="c3">Company name<input name="company_name" value="${esc(c.company_name || '')}"></label><label class="c3">Company email<input type="email" name="company_email" value="${esc(c.company_email || '')}"></label>
      <label class="c6">Company address<input name="company_address" value="${esc(c.company_address || '')}"></label>
      <label class="c6">Payment details shown on invoices<textarea name="bank_details" rows="3" placeholder="Bank: …&#10;Account name: James Cubitt Interiors&#10;Account number: …">${esc(c.bank_details || '')}</textarea></label>
      <label>VAT %<input type="number" name="tax_rate" min="0" step="0.5" value="${c.tax_rate ?? 7.5}"></label><label>Invoice prefix<input name="invoice_prefix" maxlength="10" value="${esc(c.invoice_prefix || 'JCI')}"></label><label class="c2">Payment terms (days)<input type="number" name="payment_terms" min="0" max="120" value="${c.payment_terms ?? 30}"></label>
      <label class="c6">Default note on invoices<input name="invoice_note" value="${esc(c.invoice_note || '')}"></label>
      <div class="c6" style="display:flex;justify-content:flex-end"><button class="btn">Save invoice details</button></div></form>`; }
  function bindInvoiceSettings(){ $('#invSet').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), row = { company_name: f.get('company_name'), company_email: f.get('company_email'), company_address: f.get('company_address'), bank_details: f.get('bank_details'), tax_rate: Number(f.get('tax_rate') || 0), invoice_prefix: String(f.get('invoice_prefix') || 'JCI').trim(), payment_terms: Number(f.get('payment_terms') || 30), invoice_note: f.get('invoice_note') }; const { error } = await S.sb.from('settings').update(row).eq('id', 1); if (error) return toast('Couldn’t save'); S.settings = { ...S.settings, ...row }; toast('Invoice details saved'); }; }

  /* ---------- job & pipeline tracker ---------- */
  const STAGES = [
    ['lead', 'Lead', 10, 'pipe', '#94a3b8'], ['qualified', 'Qualified', 25, 'pipe', '#0369a1'], ['proposal', 'Proposal sent', 50, 'pipe', '#7c3aed'], ['negotiation', 'Negotiation', 75, 'pipe', '#b45309'],
    ['won', 'Won', 100, 'job', '#15803d'], ['in_progress', 'In progress', 100, 'job', '#0f766e'], ['on_hold', 'On hold', 100, 'job', '#a16207'], ['completed', 'Completed', 100, 'done', '#475569'], ['lost', 'Lost', 0, 'lost', '#E3232B']];
  const STG = Object.fromEntries(STAGES.map(([k, l, p, g, c]) => [k, { l, p, g, c }]));
  const SECTORS = ['Workplace', 'Hospitality', 'Residential', 'Retail', 'Healthcare', 'Education', 'Mixed use', 'Other'];
  const SOURCES = ['Repeat client', 'Referral', 'Tender', 'Architect / partner', 'Website', 'Event', 'Direct approach', 'Other'];
  async function loadJobs(){ const { data } = await S.sb.from('jobs').select('*').order('updated_at', { ascending: false }); S.jobs = data || []; }
  const canEditJob = j => can('pipeline') || j.owner_id === S.me.id || j.lead_id === S.me.id;
  const stagePill = k => `<span class="stg" style="--c:${STG[k].c}">${STG[k].l}</span>`;
  function jobsFiltered(){
    const q = (S.jobQ || '').toLowerCase();
    return S.jobs.filter(j => (S.jobView === 'all' ? true : S.jobView === 'pipe' ? STG[j.stage].g === 'pipe' : S.jobView === 'job' ? STG[j.stage].g === 'job' : S.jobView === 'done' ? j.stage === 'completed' : j.stage === 'lost')
      && (!S.jobStage || j.stage === S.jobStage) && (!S.jobSector || j.sector === S.jobSector) && (!S.jobOwner || j.owner_id === S.jobOwner || j.lead_id === S.jobOwner)
      && (!q || [j.title, j.client, j.location, j.ref, j.job_number, j.contact_name].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (a.next_action_date || '9999').localeCompare(b.next_action_date || '9999') || Number(b.value) - Number(a.value));
  }
  function renderJobs(){
    const J = S.jobs, yr = String(new Date().getFullYear()), today = dkey(new Date());
    const pipe = J.filter(j => STG[j.stage].g === 'pipe'), wonY = J.filter(j => j.won_at && j.won_at.startsWith(yr)), lostY = J.filter(j => j.lost_at && j.lost_at.startsWith(yr));
    const list = jobsFiltered(), owners = S.people.filter(p => p.active);
    main(`<div class="head"><div><h1>Jobs and pipeline</h1><p class="sub">Every opportunity and live job in one list, from first lead to completion.</p></div><div class="ap-act"><button class="btn ghost" id="jobCsv">Export CSV</button>${can('pipeline') ? '<button class="btn red" id="jobAdd">Add opportunity</button>' : ''}</div></div>
      ${can('pipeline') ? `<div class="grid g4">${kpi('Open pipeline', moneyC(pipe.reduce((a, j) => a + toBase(j.value, j.currency), 0)), pipe.length + ' opportunities')}${kpi('Weighted pipeline', moneyC(pipe.reduce((a, j) => a + toBase(j.value, j.currency) * j.probability / 100, 0)), 'value × probability')}${kpi('Won in ' + yr, moneyC(wonY.reduce((a, j) => a + toBase(j.value, j.currency), 0)), wonY.length + ' jobs')}${kpi('Win rate ' + yr, (wonY.length + lostY.length ? Math.round(wonY.length / (wonY.length + lostY.length) * 100) : 0) + '%', `${wonY.length} won · ${lostY.length} lost`)}</div>
      <div class="funnel">${STAGES.filter(s => s[3] === 'pipe' || s[3] === 'job').map(([k, l]) => { const g = J.filter(j => j.stage === k); return `<button data-fst="${k}" class="${S.jobStage === k ? 'on' : ''}" style="--c:${STG[k].c}"><small>${l}</small><b>${g.length}</b><span>${money(g.reduce((a, j) => a + Number(j.value), 0))}</span></button>`; }).join('')}</div>` : ''}
      <div class="toolbar"><div class="seg">${[['all', 'All'], ['pipe', 'Pipeline'], ['job', 'Live jobs'], ['done', 'Completed'], ['lost', 'Lost']].map(([k, l]) => `<button data-jv="${k}" class="${S.jobView === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <input type="search" id="jobQ" placeholder="Search client, project or ref" value="${esc(S.jobQ || '')}" aria-label="Search">
        <select id="jobSector" aria-label="Sector"><option value="">All sectors</option>${SECTORS.map(s => `<option ${S.jobSector === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        ${isMgr() ? `<select id="jobOwner" aria-label="Person"><option value="">Everyone</option>${owners.map(p => `<option value="${esc(p.id)}" ${S.jobOwner === p.id ? 'selected' : ''}>${esc(p.full_name || p.email)}</option>`).join('')}</select>` : ''}
        ${S.jobStage ? `<button class="btn ghost sm" id="jobClr">Clear stage: ${STG[S.jobStage].l} ×</button>` : ''}</div>
      <div class="card scroll">${list.length ? `<table class="sheet jobs-t"><thead><tr><th>Ref</th><th style="text-align:left">Opportunity / job</th><th style="text-align:left">Sector</th><th style="text-align:left">Stage</th><th>Value</th><th>Prob.</th><th style="text-align:left">Owner</th><th style="text-align:left">Next action</th><th>Close / start</th></tr></thead><tbody>
        ${list.map(j => { const od = j.next_action_date && j.next_action_date < today && !['completed', 'lost'].includes(j.stage); return `<tr data-job="${esc(j.id)}" tabindex="0" role="button"><td><b>${esc(j.job_number || j.ref)}</b>${j.job_number && j.ref !== j.job_number ? `<small>${esc(j.ref)}</small>` : ''}</td><td style="text-align:left"><b class="jt">${esc(j.title)}</b>${j.lead_heat ? `<span class="heat heat-${j.lead_heat}">${j.lead_heat}</span>` : ''}<small>${[j.client, j.location].filter(Boolean).map(esc).join(' · ')}</small>${j.project_id ? `<span class="jp-chip" title="Linked portal project">▸ ${proj(j.project_id).job_code ? esc(proj(j.project_id).job_code) : 'Proposal'} project</span>` : ''}</td><td style="text-align:left">${esc(j.sector)}</td><td style="text-align:left">${stagePill(j.stage)}</td><td>${moneyIn(j.value, j.currency || baseCur())}</td><td>${j.probability}%</td><td style="text-align:left">${j.owner_id ? esc((nameOf(j.owner_id) || '').split(' ')[0]) : '–'}</td><td style="text-align:left" class="na ${od ? 'od' : ''}">${j.next_action ? `${esc(j.next_action)}<small>${j.next_action_date ? (od ? 'Overdue · ' : '') + fmtD(j.next_action_date) : ''}</small>` : '<span class="sub">–</span>'}</td><td>${(STG[j.stage].g === 'pipe' ? j.expected_close : j.start_date) ? fmtD(STG[j.stage].g === 'pipe' ? j.expected_close : j.start_date) : '–'}</td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td></td><td style="text-align:left">${list.length} shown</td><td></td><td></td><td>${money(list.reduce((a, j) => a + Number(j.value), 0))}</td><td colspan="4"></td></tr></tfoot></table>` : `<p class="empty">${S.jobs.length ? 'Nothing matches these filters.' : isMgr() ? 'Add your first opportunity to start the tracker.' : 'No jobs are assigned to you yet.'}</p>`}</div>`);
    $$('[data-jv]').forEach(b => b.onclick = () => { S.jobView = b.dataset.jv; S.jobStage = ''; renderJobs(); });
    $$('[data-fst]').forEach(b => b.onclick = () => { S.jobStage = S.jobStage === b.dataset.fst ? '' : b.dataset.fst; S.jobView = 'all'; renderJobs(); });
    if ($('#jobClr')) $('#jobClr').onclick = () => { S.jobStage = ''; renderJobs(); };
    let qt; $('#jobQ').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.jobQ = e.target.value; renderJobs(); const i = $('#jobQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    $('#jobSector').onchange = e => { S.jobSector = e.target.value; renderJobs(); };
    if ($('#jobOwner')) $('#jobOwner').onchange = e => { S.jobOwner = e.target.value; renderJobs(); };
    $$('[data-job]').forEach(tr => { tr.onclick = () => openJob(S.jobs.find(j => j.id === tr.dataset.job)); tr.onkeydown = e => { if (e.key === 'Enter') tr.onclick(); }; });
    if ($('#jobAdd')) $('#jobAdd').onclick = () => openJob(null);
    $('#jobCsv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const csv = ['Ref,Job number,Title,Client,Contact,Email,Phone,Sector,Location,Source,Services,Stage,Probability,Value,Weighted value,Expected close,Start,End,Owner,Project lead,Next action,Next action date,Won,Lost,Lost reason', ...jobsFiltered().map(j => [j.ref, j.job_number, j.title, j.client, j.contact_name, j.contact_email, j.contact_phone, j.sector, j.location, j.source, j.services, STG[j.stage].l, j.probability, Number(j.value).toFixed(2), (Number(j.value) * j.probability / 100).toFixed(2), j.expected_close, j.start_date, j.end_date, j.owner_id ? nameOf(j.owner_id) : '', j.lead_id ? nameOf(j.lead_id) : '', j.next_action, j.next_action_date, j.won_at, j.lost_at, j.lost_reason].map(q).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-jobs-pipeline-${dkey(new Date())}.csv`; a.click(); };
  }
  async function openJob(j){
    const x = j || { title: '', client: '', contact_name: '', contact_email: '', contact_phone: '', sector: 'Workplace', location: 'Lagos', source: 'Direct approach', services: '', stage: 'lead', probability: 10, value: '', size_sqm: '', expected_close: '', start_date: '', end_date: '', owner_id: S.me.id, lead_id: null, next_action: '', next_action_date: '', lost_reason: '', notes: '' };
    const edit = !j || canEditJob(j), people = S.people.length ? S.people.filter(p => p.active) : [S.me], dis = edit ? '' : 'disabled';
    let updates = [];
    if (j) { const { data } = await S.sb.from('job_updates').select('*').eq('job_id', j.id).order('created_at', { ascending: false }); updates = data || []; }
    const opt = (list, v) => (v && !list.includes(v) ? [v, ...list] : list).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('');
    const pplOpt = v => `<option value="">Not assigned</option>` + people.map(p => `<option value="${esc(p.id)}" ${p.id === v ? 'selected' : ''}>${esc(p.full_name || p.email)}</option>`).join('');
    $('#editForm').innerHTML = `<div class="c6 job-h"><h2 style="margin:0">${j ? esc(j.job_number || j.ref) : 'New opportunity'}</h2>${j ? stagePill(j.stage) + (j.job_number ? ` <span class="sub">${esc(j.ref)}</span>` : '') : ''}</div>
      <label class="c4">Project / opportunity<input name="title" required maxlength="160" value="${esc(x.title)}" ${dis} placeholder="e.g. Head office fit-out, 3 floors"></label><label class="c2">Client<input name="client" value="${esc(x.client)}" ${dis}></label>
      <label class="c2">Job ID<input name="job_number" maxlength="20" value="${esc(x.job_number || '')}" ${can('pipeline') ? '' : 'disabled'} placeholder="${j ? '' : 'Next: ' + esc(nextJobCode())}" style="text-transform:uppercase"></label>
      <label class="c2">Lead status<select name="lead_heat" ${dis}>${[['', 'Not set'], ['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold']].map(([k, l]) => `<option value="${k}" ${k === (x.lead_heat || '') ? 'selected' : ''}>${l}</option>`).join('')}</select></label><span class="c2"></span>
      <label class="c2">Stage<select name="stage" ${dis}>${STAGES.map(([k, l]) => `<option value="${k}" ${k === x.stage ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Probability %<input type="number" name="probability" min="0" max="100" value="${x.probability}" ${dis}></label>
      <label>Currency<select name="currency" ${dis}>${curOpts(x.currency || baseCur())}</select></label><label>Fee value<input type="number" name="value" min="0" step="1000" value="${x.value}" ${dis}></label>
      <label class="c2">Expected decision<input type="date" name="expected_close" value="${x.expected_close || ''}" ${dis}></label>
      <label class="c2">Sector<select name="sector" ${dis}>${opt(SECTORS, x.sector)}</select></label><label class="c2">Location<input name="location" value="${esc(x.location)}" ${dis}></label><label class="c2">Source<select name="source" ${dis}>${opt(SOURCES, x.source)}</select></label>
      <label class="c4">Services<input name="services" value="${esc(x.services)}" ${dis} placeholder="e.g. Interior design, FF&E, project monitoring"></label><label class="c2">Size (m²)<input type="number" name="size_sqm" min="0" value="${x.size_sqm ?? ''}" ${dis}></label>
      <label class="c2">Contact name<input name="contact_name" value="${esc(x.contact_name)}" ${dis}></label><label class="c2">Contact email<input type="email" name="contact_email" value="${esc(x.contact_email)}" ${dis}></label><label class="c2">Contact phone<input name="contact_phone" value="${esc(x.contact_phone)}" ${dis}></label>
      <label class="c3">BD owner<select name="owner_id" ${can('pipeline') ? '' : 'disabled'}>${pplOpt(x.owner_id)}</select></label><label class="c3">Project lead<select name="lead_id" ${can('pipeline') ? '' : 'disabled'}>${pplOpt(x.lead_id)}</select></label>
      <label class="c2">Start date<input type="date" name="start_date" value="${x.start_date || ''}" ${dis}></label><label class="c2">End date<input type="date" name="end_date" value="${x.end_date || ''}" ${dis}></label><span class="c2"></span>
      <label class="c4">Next action<input name="next_action" maxlength="200" value="${esc(x.next_action)}" ${dis} placeholder="e.g. Send fee proposal"></label><label class="c2">Due<input type="date" name="next_action_date" value="${x.next_action_date || ''}" ${dis}></label>
      <label class="c6 lostbox" ${x.stage === 'lost' ? '' : 'hidden'}>Why was it lost?<input name="lost_reason" value="${esc(x.lost_reason)}" ${dis} placeholder="e.g. Fee too high, client went with incumbent"></label>
      <label class="c6">Notes<textarea name="notes" rows="2" ${dis}>${esc(x.notes)}</textarea></label>
      ${j ? `<div class="c6 job-log"><h3>History</h3>${edit ? '<div class="job-note"><input id="jobNote" maxlength="1000" placeholder="Add an update, e.g. Site visit done, client wants 3 options"><button type="button" class="btn ghost sm" id="jobNoteAdd">Add update</button></div>' : ''}${updates.map(u => `<div class="jl"><span class="av sm">${esc(initials(nameOf(u.user_id)))}</span><span><b>${esc(nameOf(u.user_id))}</b> ${u.to_stage && u.from_stage ? `moved it from ${STG[u.from_stage].l} to ${STG[u.to_stage].l}` : u.to_stage && !u.from_stage ? 'added it as ' + STG[u.to_stage].l : ''}${u.note ? `<span class="jl-n">${esc(u.note)}</span>` : ''}<small>${new Date(u.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span></div>`).join('') || '<p class="sub">No history yet.</p>'}</div>` : ''}
      ${j ? `<div class="c6 jp-link">${j.project_id ? `<div class="jp-on"><span class="dot" style="background:${esc(proj(j.project_id).color)}"></span><span><small>LINKED PROJECT</small><b>${proj(j.project_id).job_code ? esc(proj(j.project_id).job_code) + ' · ' : ''}${esc(proj(j.project_id).name)}</b> ${pStatus(proj(j.project_id))}<small id="jpHours">Counting time…</small></span><span class="jp-act"><button type="button" class="btn ghost sm" id="jpOpen">Open project</button>${can('pm') ? '<button type="button" class="btn ghost sm" id="jpHub">Hub</button>' : ''}</span></div>`
        : (can('projects') || can('pipeline')) && x.stage !== 'lost' ? `<div class="jp-off"><span><small>PROJECT</small>${STG[x.stage].g === 'pipe' ? 'Start a project now to track proposal and bid time under this Job ID. It becomes an active job when won.' : 'Create the portal project so the team can track time, plan tasks and invoice.'}</span><span class="jp-act"><button class="btn ghost sm" value="project" formnovalidate>${STG[x.stage].g === 'pipe' ? 'Start proposal project' : 'Create project'}</button>${S.projects.some(p => !p.archived && !jobOf(p.id)) ? `<select id="jpPick" aria-label="Link an existing project"><option value="">or link an existing project…</option>${S.projects.filter(p => !p.archived && !jobOf(p.id)).map(p => `<option value="${esc(p.id)}">${p.job_code ? esc(p.job_code) + ' · ' : ''}${esc(p.name)}</option>`).join('')}</select>` : ''}</span></div>` : ''}</div>` : ''}
      <div class="c6 dlg-actions">${j && isAdmin() ? '<button class="btn ghost" value="delete" formnovalidate>Delete</button>' : ''}<button class="btn ghost" value="cancel" formnovalidate>Close</button>${edit ? `<button class="btn red" value="save">${j ? 'Save' : 'Add to tracker'}</button>` : ''}</div>`;
    const f = $('#editForm'), dlg = $('#editDlg'); dlg.classList.add('wide'); dlg.showModal();
    if (j && j.project_id) { S.sb.from('time_entries').select('minutes').eq('project_id', j.project_id).then(({ data }) => { const h = (data || []).reduce((a, e) => a + e.minutes, 0) / 60, el = $('#jpHours'); if (el) el.textContent = `${Math.round(h * 10) / 10} hours logged${proj(j.project_id).status === 'pipeline' ? ' on the proposal so far' : ''}`; });
      $('#jpOpen').onclick = () => { dlg.close(); S.projFilter = 'all'; S.projFocus = j.project_id; go('projects'); }; if ($('#jpHub')) $('#jpHub').onclick = () => { dlg.close(); S.hubPid = j.project_id; go('hub'); }; }
    if ($('#jpPick')) $('#jpPick').onchange = async e => { const pid = e.target.value; if (!pid) return; const p = proj(pid); if (!confirm(`Link “${p.name}” to this opportunity?`)) { e.target.value = ''; return; }
      await S.sb.from('jobs').update({ project_id: pid }).eq('id', j.id); if (STG[j.stage].g === 'pipe' && !p.job_code) await S.sb.from('projects').update({ status: 'pipeline' }).eq('id', pid); await Promise.all([loadProjects(), loadJobs()]); dlg.close(); renderJobs(); toast('Project linked'); }; dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    f.stage.onchange = () => { const k = f.stage.value; f.probability.value = STG[k].p; f.querySelector('.lostbox').hidden = k !== 'lost'; };
    if ($('#jobNoteAdd')) $('#jobNoteAdd').onclick = async () => { const n = $('#jobNote').value.trim(); if (!n) return; const { error } = await S.sb.from('job_updates').insert({ job_id: j.id, user_id: S.me.id, note: n }); if (error) return toast('Couldn’t add the update'); dlg.close(); toast('Update added'); openJob(j); };
    f.onsubmit = async ev => {
      const v = ev.submitter?.value; if (v === 'cancel') return; ev.preventDefault();
      if (v === 'delete') { if (!confirm('Delete this from the tracker? Its history is deleted too.')) return; await S.sb.from('jobs').delete().eq('id', j.id); dlg.close(); await loadJobs(); renderJobs(); return toast('Deleted'); }
      if (v === 'project') { const pipe = STG[j.stage].g === 'pipe';
        const { data: p, error } = await S.sb.from('projects').insert({ name: j.title, client: j.client, status: pipe ? 'pipeline' : 'active', job_code: j.job_number || null, currency: j.currency || null, budget_type: Number(j.value) ? 'amount' : 'none', budget: Number(j.value) || null, color: COLORS[S.projects.length % COLORS.length] }).select().single();
        if (error) return toast('Couldn’t create the project'); await S.sb.from('jobs').update({ project_id: p.id }).eq('id', j.id); await Promise.all([loadProjects(), loadJobs()]); dlg.close(); renderJobs();
        return toast(pipe ? `Proposal project started${j.job_number ? ' as ' + j.job_number : ''}. The team can log bid time against it now.` : 'Project created. Staff can now track time against it.'); }
      const d = new FormData(f), val = k => { const s = String(d.get(k) ?? '').trim(); return s === '' ? null : s; };
      if (d.get('stage') === 'lost' && !val('lost_reason')) { f.lost_reason.focus(); return toast('Add a short reason it was lost'); }
      const row = { title: val('title'), client: val('client') || '', lead_heat: d.get('lead_heat') || '', stage: d.get('stage'), probability: Number(d.get('probability') || 0), value: Number(d.get('value') || 0), currency: d.get('currency') === baseCur() ? '' : (d.get('currency') || ''), expected_close: val('expected_close'), sector: d.get('sector'), location: val('location') || '', source: d.get('source'), services: val('services') || '', size_sqm: val('size_sqm') == null ? null : Number(val('size_sqm')), contact_name: val('contact_name') || '', contact_email: val('contact_email') || '', contact_phone: val('contact_phone') || '', start_date: val('start_date'), end_date: val('end_date'), next_action: val('next_action') || '', next_action_date: val('next_action_date'), lost_reason: val('lost_reason') || '', notes: val('notes') || '' };
      if (can('pipeline')) { row.owner_id = val('owner_id'); row.lead_id = val('lead_id'); const jn = (val('job_number') || '').toUpperCase(); if (jn && (S.jobs || []).some(o => o.id !== (j && j.id) && (o.job_number || '').toUpperCase() === jn)) { f.job_number.focus(); return toast(`${jn} is already used by another opportunity`); } if (jn || j) row.job_number = jn || null; }
      const { error } = j ? await S.sb.from('jobs').update(row).eq('id', j.id) : await S.sb.from('jobs').insert(row);
      if (error) return toast('Couldn’t save. Try again.');
      dlg.close(); await Promise.all([loadJobs(), j && j.project_id ? loadProjects() : null]); renderJobs(); toast(j ? (row.stage === 'won' && j.stage !== 'won' ? (j.project_id ? 'Marked as won. The linked project is now an active job.' : 'Marked as won.') : 'Saved') : 'Added to the tracker with the next Job ID');
    };
  }

  /* ---------- website enquiries ---------- */
  const ENQ_KIND = { brief: 'Project brief', project: 'Project enquiry', vendor: 'Vendor registration', newsletter: 'Newsletter', career: 'Career enquiry', other: 'Other' };
  const ENQ_ST = { new: 'New', in_progress: 'In progress', closed: 'Closed', converted: 'Converted to opportunity', spam: 'Spam' };
  async function loadEnq(){ if (!can('enquiries')) return; const { data } = await S.sb.from('enquiries').select('*').order('created_at', { ascending: false }).limit(1000); S.enq = data || []; }
  const newEnq = () => can('enquiries') ? S.enq.filter(q => q.status === 'new' && q.kind !== 'newsletter').length : 0;
  function renderEnquiries(){
    const E = S.enq, wk = Date.now() - 7 * 864e5;
    const list = E.filter(q => (S.enqKind ? q.kind === S.enqKind : q.kind !== 'newsletter') && (S.enqSt === 'open' ? ['new', 'in_progress'].includes(q.status) : S.enqSt === 'all' ? q.status !== 'spam' : q.status === S.enqSt)
      && (!S.enqQ || [q.name, q.company, q.email, q.subject, q.message].join(' ').toLowerCase().includes(S.enqQ.toLowerCase())));
    main(`<div class="head"><div><h1>Enquiries</h1><p class="sub">Messages and registrations from the website, ready to assign and follow up.</p></div><button class="btn ghost" id="enqCsv">Export CSV</button></div>
      <div class="grid g4">${kpi('New', newEnq(), 'waiting for someone to pick up')}${kpi('This week', E.filter(q => +new Date(q.created_at) > wk && q.kind !== 'newsletter').length, 'project and vendor enquiries')}${kpi('Converted', E.filter(q => q.status === 'converted').length, 'became pipeline opportunities')}${kpi('Newsletter', E.filter(q => q.kind === 'newsletter' && q.status !== 'spam').length, 'subscribers')}</div>
      <div class="toolbar"><div class="seg">${[['open', 'Open'], ['all', 'All'], ['closed', 'Closed'], ['converted', 'Converted'], ['spam', 'Spam']].map(([k, l]) => `<button data-es="${k}" class="${S.enqSt === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <select id="enqKind" aria-label="Type"><option value="">All except newsletter</option>${Object.entries(ENQ_KIND).map(([k, l]) => `<option value="${k}" ${S.enqKind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input type="search" id="enqQ" placeholder="Search name, company or message" value="${esc(S.enqQ || '')}" aria-label="Search"></div>
      <div class="card">${list.length ? list.map(q => `<div class="aprow enq-row ${q.status === 'new' ? 'is-new' : ''}" data-enq="${esc(q.id)}" tabindex="0" role="button"><span class="av">${esc(initials(q.name || q.company || q.email))}</span><span class="ap-t"><b>${esc(q.name || q.email || 'Website visitor')}${q.company ? ' · ' + esc(q.company) : ''}</b><small>${ENQ_KIND[q.kind]} · ${new Date(q.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${q.assigned_to ? ' · ' + esc(nameOf(q.assigned_to)) : ''}</small>${q.kind === 'brief' ? `<span class="enq-tags">${['Type of space', 'Location', 'Size', 'Budget', 'Start'].map(k => q.details?.[k]).filter(Boolean).map(v => `<em>${esc(v)}</em>`).join('')}</span>` : ''}${q.message ? `<span class="enq-msg">${esc(q.message.slice(0, 160))}${q.message.length > 160 ? '…' : ''}</span>` : ''}</span><span class="enq-st enq-${q.status}">${ENQ_ST[q.status]}</span></div>`).join('') : '<p class="empty">No enquiries here.</p>'}</div>`);
    $$('[data-es]').forEach(b => b.onclick = () => { S.enqSt = b.dataset.es; renderEnquiries(); });
    $('#enqKind').onchange = e => { S.enqKind = e.target.value; if (S.enqKind === 'newsletter') S.enqSt = 'all'; renderEnquiries(); };
    let qt; $('#enqQ').oninput = e => { clearTimeout(qt); qt = setTimeout(() => { S.enqQ = e.target.value; renderEnquiries(); const i = $('#enqQ'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    $$('[data-enq]').forEach(r => { r.onclick = () => openEnq(S.enq.find(q => q.id === r.dataset.enq)); r.onkeydown = e => { if (e.key === 'Enter') r.onclick(); }; });
    $('#enqCsv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const csv = ['Received,Type,Status,Name,Company,Email,Phone,Subject,Message,Assigned to', ...list.map(x => [x.created_at.slice(0, 16).replace('T', ' '), ENQ_KIND[x.kind], ENQ_ST[x.status], x.name, x.company, x.email, x.phone, x.subject, x.message, x.assigned_to ? nameOf(x.assigned_to) : ''].map(q).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-enquiries-${dkey(new Date())}.csv`; a.click(); };
  }
  function openEnq(q){
    const people = S.people.filter(p => p.active), det = Object.entries(q.details || {}).filter(([, v]) => v && String(v).length);
    $('#editForm').innerHTML = `<div class="c6 job-h"><h2 style="margin:0">${esc(q.name || q.email || 'Website visitor')}</h2><span class="enq-st enq-${q.status}">${ENQ_ST[q.status]}</span><span class="sub">${ENQ_KIND[q.kind]} · ${new Date(q.created_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
      <div class="c6 enq-info">${[['Company', q.company], ['Email', q.email ? `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>` : ''], ['Phone', q.phone ? `<a href="tel:${esc(q.phone)}">${esc(q.phone)}</a>` : ''], ['Subject', esc(q.subject)], ['From page', esc(q.source_page)], ...det.map(([k, v]) => [esc(k), esc(Array.isArray(v) ? v.join(', ') : v)])].filter(r => r[1]).map(([k, v]) => `<div><small>${k}</small><span>${k === 'Company' ? esc(v) : v}</span></div>`).join('')}</div>
      ${q.message ? `<div class="c6 enq-full">${esc(q.message)}</div>` : ''}
      <label class="c3">Status<select name="status">${Object.entries(ENQ_ST).filter(([k]) => k !== 'converted' || q.status === 'converted').map(([k, l]) => `<option value="${k}" ${k === q.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="c3">Assigned to<select name="assigned_to"><option value="">Nobody yet</option>${people.map(p => `<option value="${esc(p.id)}" ${p.id === q.assigned_to ? 'selected' : ''}>${esc(p.full_name || p.email)}</option>`).join('')}</select></label>
      <label class="c6">Internal notes<textarea name="notes" rows="3" placeholder="e.g. Called back, sending capability statement">${esc(q.notes)}</textarea></label>
      <div class="c6 dlg-actions">${isAdmin() ? '<button class="btn ghost" value="delete" formnovalidate>Delete</button>' : ''}${q.email ? `<a class="btn ghost" href="mailto:${esc(q.email)}?subject=${encodeURIComponent('Re: your enquiry to James Cubitt Interiors')}">Reply by email</a>` : ''}${(q.kind === 'project' || q.kind === 'brief') && !q.job_id && (can('pipeline') || can('enquiries')) ? '<button class="btn ghost" value="convert" formnovalidate>Add to pipeline</button>' : ''}${q.job_id ? '<span class="tag" style="align-self:center">In the pipeline</span>' : ''}<button class="btn ghost" value="cancel" formnovalidate>Close</button><button class="btn red" value="save">Save</button></div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    f.onsubmit = async ev => {
      const v = ev.submitter?.value; if (v === 'cancel') return; ev.preventDefault();
      if (v === 'delete') { if (!confirm('Delete this enquiry?')) return; await S.sb.from('enquiries').delete().eq('id', q.id); dlg.close(); await loadEnq(); renderTop(); renderEnquiries(); return toast('Enquiry deleted'); }
      if (v === 'convert') {
        const dt = q.details || {}, space = dt['Type of space'] || dt['Project type'] || '';
        const sectorOf = t => /hospital|hotel|restaurant/i.test(t) ? 'Hospitality' : /resid/i.test(t) ? 'Residential' : /retail|showroom/i.test(t) ? 'Retail' : /health/i.test(t) ? 'Healthcare' : /educat/i.test(t) ? 'Education' : /something|other/i.test(t) ? 'Other' : 'Workplace';
        const sourceOf = t => /recommend/i.test(t) ? 'Referral' : /worked with you/i.test(t) ? 'Repeat client' : /event/i.test(t) ? 'Event' : 'Website';
        const facts = Object.entries(dt).filter(([, v]) => v && String(v).length).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
        const { data: j, error } = await S.sb.from('jobs').insert({ title: (space ? space.replace(/ \(.*\)$/, '') : 'New project') + (q.company ? ' · ' + q.company : ''), client: q.company || q.name, contact_name: q.name, contact_email: q.email, contact_phone: q.phone, sector: sectorOf(space), location: dt['Location'] || '', services: dt['Services'] || '', source: sourceOf(dt['Heard about us'] || ''), stage: 'lead', probability: 10, expected_close: null, notes: [q.message, facts].filter(Boolean).join('\n\n'), owner_id: f.assigned_to.value || S.me.id, next_action: 'Respond to the website brief', next_action_date: dkey(new Date()) }).select().single();
        if (error) return toast('Couldn’t add it to the pipeline');
        await S.sb.from('enquiries').update({ status: 'converted', job_id: j.id, assigned_to: f.assigned_to.value || S.me.id }).eq('id', q.id);
        dlg.close(); await Promise.all([loadEnq(), loadJobs()]); renderTop(); renderEnquiries(); return toast('Added to Jobs and pipeline as a lead');
      }
      const d = new FormData(f), { error } = await S.sb.from('enquiries').update({ status: d.get('status'), assigned_to: d.get('assigned_to') || null, notes: String(d.get('notes') || ''), updated_at: new Date().toISOString() }).eq('id', q.id);
      if (error) return toast('Couldn’t save'); dlg.close(); await loadEnq(); renderTop(); renderEnquiries(); toast('Saved');
    };
  }

  /* ---------- module access (People) ---------- */
  function editAccess(p){
    const custom = !!p.modules, cur = modsOf(p);
    $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">Access for ${esc(p.full_name || p.email)}</h2><p class="sub">${p.role === 'admin' ? 'Admins always have access to everything.' : `Role: ${ROLE_LABEL[p.role]}. Tick the modules this person can use.`}</p></div>
      ${p.role === 'admin' ? '' : `<label class="bill c6"><input type="checkbox" name="useDefault" ${custom ? '' : 'checked'}>Use the standard access for a ${ROLE_LABEL[p.role]}</label>
      <div class="c6 mod-grid">${MODULES.map(([g, list]) => `<fieldset><legend>${g}</legend>${list.map(([k, l]) => `<label class="bill"><input type="checkbox" name="m" value="${k}" ${cur.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</fieldset>`).join('')}</div>
      <p class="c6 sub" style="font-size:12px">Access is enforced by the database, not just hidden on screen. Everyone keeps My dashboard and Email alerts.</p>`}
      <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Close</button>${p.role === 'admin' ? '' : '<button class="btn red" value="save">Save access</button>'}</div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    const sync = () => { const d = f.useDefault && f.useDefault.checked; $$('[name=m]', f).forEach(c => { c.disabled = d; if (d) c.checked = DEF_MODS[p.role].includes(c.value); }); };
    if (f.useDefault) { f.useDefault.onchange = sync; sync(); }
    f.onsubmit = async ev => {
      if (ev.submitter?.value !== 'save') return; ev.preventDefault();
      const modules = f.useDefault.checked ? null : $$('[name=m]:checked', f).map(c => c.value);
      const { error } = await S.sb.from('profiles').update({ modules }).eq('id', p.id);
      if (error) return toast('Couldn’t save access'); dlg.close(); await loadTeam(); renderPeople(); toast('Access updated');
    };
  }

  /* ---------- website content (CMS) ---------- */
  const SITE = (window.JCI_PORTAL && window.JCI_PORTAL.SITE_URL) || '..';
  const CMS_T = { articles: 'cms_articles', projects: 'cms_projects', jobs: 'cms_jobs', press: 'cms_press', testi: 'cms_testimonials' };
  const BLOCKS = [['p', 'Paragraph'], ['h3', 'Heading'], ['quote', 'Quote'], ['pull', 'Pull quote'], ['callout', 'Callout box'], ['ul', 'Bullet list'], ['img', 'Image'], ['stats', 'Statistics'], ['offers', 'Offer cards'], ['close', 'Closing line']];
  const slugify = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item-' + Date.now();
  const imgUrl = k => !k ? '' : /^(https?:|data:|\/)/.test(k) ? k : `${SITE}/assets/img/${k}.jpg`;
  const thumb = (k, cls = 'cthumb') => k ? `<img class="${cls}" src="${esc(imgUrl(k))}" alt="" data-fb="${cls}">` : `<span class="${cls} noimg">No image</span>`;
  async function loadCMS(){ if (!can('cms')) return; const r = await Promise.all(Object.values(CMS_T).map(t => S.sb.from(t).select('*').order('sort'))); Object.keys(CMS_T).forEach((k, i) => S.cms[k] = r[i].data || []); }
  async function compressImage(file){
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 250000) return file;
    const bmp = await createImageBitmap(file).catch(() => null); if (!bmp) return file;
    const sc = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, file.type === 'image/png' ? 'image/png' : 'image/jpeg', .82)); return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, file.type === 'image/png' ? '.png' : '.jpg'), { type: blob.type }) : file;
  }
  async function uploadImage(file, folder){
    if (file.size > 10 * 1024 * 1024) { toast('Images must be under 10 MB'); return null; }
    const f = await compressImage(file), path = `${folder}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_').slice(-60)}`;
    const { error } = await S.sb.storage.from('site-media').upload(path, f, { contentType: f.type, upsert: false });
    if (error) { toast('The image couldn’t be uploaded'); return null; }
    return S.sb.storage.from('site-media').getPublicUrl(path).data.publicUrl;
  }
  const pickImage = (folder, cb) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { if (!i.files[0]) return; toast('Uploading…'); const u = await uploadImage(i.files[0], folder); if (u) { cb(u); toast('Image uploaded'); } }; i.click(); };

  async function renderCMS(){
    if (S.cmsTab === 'site') {
      if (!S.cmsSite) await loadSite();
      main(`<div class="head"><div><h1>Website content</h1><p class="sub">Edit what appears on jamescubittinteriors.com. Changes show on the website straight away.</p></div></div>
        <div class="seg">${[['articles', 'Articles'], ['projects', 'Projects'], ['jobs', 'Careers'], ['press', 'Press'], ['testi', 'Testimonials'], ['site', 'Site settings']].map(([k, l]) => `<button data-ct="${k}" class="${S.cmsTab === k ? 'on' : ''}">${l}${k !== 'site' ? ` <em class="soft">${(S.cms[k] || []).length}</em>` : ''}</button>`).join('')}</div><div id="siteBox" style="margin-top:14px"></div>`);
      $$('[data-ct]').forEach(b => b.onclick = () => { S.cmsTab = b.dataset.ct; renderCMS(); });
      return renderSiteSettings($('#siteBox'));
    }
    const tab = S.cmsTab, L = S.cms[tab] || [];
    const meta = { articles: ['Articles', 'Blog posts, thought leadership and research on the Research & Insights pages.', 'New article'], projects: ['Projects', 'The portfolio on the Projects page and the home page.', 'New project'], jobs: ['Careers', 'Open and closed roles on the Careers page.', 'New role'], press: ['Press', 'Press coverage on the Press page and the Insights Press tab.', 'Add press item'], testi: ['Testimonials', 'Client quotes in “What people are saying”.', 'Add testimonial'] }[tab];
    const row = x => { const title = { articles: x.title, projects: x.name, jobs: x.title, press: x.title, testi: '“' + (x.quote || '').slice(0, 90) + (x.quote?.length > 90 ? '…”' : '”') }[tab];
      const sub = { articles: [x.series, x.edition, x.author?.name, x.external_url ? 'External link' : ''], projects: [x.sector, x.location, x.year, x.home_feature ? 'On home page' : ''], jobs: [x.dept, x.location, x.closed ? 'Closed' : 'Open'], press: [x.source], testi: [x.name, x.company] }[tab].filter(Boolean).join(' · ');
      const img = tab === 'articles' || tab === 'projects' ? thumb(x.hero) : '';
      return `<div class="cms-row ${x.published ? '' : 'draft'}">${img}<span class="ap-t"><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="pub ${x.published ? 'on' : ''}">${x.published ? 'Published' : 'Draft'}</span><span class="ap-act"><button class="icon" data-up="${esc(x.id)}" aria-label="Move up">↑</button><button class="icon" data-down="${esc(x.id)}" aria-label="Move down">↓</button><button class="btn ghost sm" data-pubt="${esc(x.id)}">${x.published ? 'Unpublish' : 'Publish'}</button><button class="btn sm" data-cedit="${esc(x.id)}">Edit</button></span></div>`; };
    main(`<div class="head"><div><h1>Website content</h1><p class="sub">Edit what appears on jamescubittinteriors.com. Changes to published items show on the website straight away.</p></div><button class="btn red" id="cmsNew">${meta[2]}</button></div>
      <div class="seg">${[['articles', 'Articles'], ['projects', 'Projects'], ['jobs', 'Careers'], ['press', 'Press'], ['testi', 'Testimonials'], ['site', 'Site settings']].map(([k, l]) => `<button data-ct="${k}" class="${tab === k ? 'on' : ''}">${l}${k !== 'site' ? ` <em class="soft">${(S.cms[k] || []).length}</em>` : ''}</button>`).join('')}</div>
      <div class="card" style="margin-top:14px"><p class="sub" style="margin-bottom:8px">${meta[1]} The order here is the order on the website${tab === 'articles' ? ', and the first article is featured' : ''}.</p>${L.length ? L.map(row).join('') : `<p class="empty">Nothing here yet. Use “${meta[2]}”, or run the content import from the setup guide.</p>`}</div>`);
    $$('[data-ct]').forEach(b => b.onclick = () => { S.cmsTab = b.dataset.ct; renderCMS(); });
    $('#cmsNew').onclick = () => cmsEdit(tab, null);
    $$('[data-cedit]').forEach(b => b.onclick = () => cmsEdit(tab, L.find(x => x.id === b.dataset.cedit)));
    $$('[data-pubt]').forEach(b => b.onclick = async () => { const x = L.find(y => y.id === b.dataset.pubt); const { error } = await S.sb.from(CMS_T[tab]).update({ published: !x.published }).eq('id', x.id); if (error) return toast('Couldn’t update'); await loadCMS(); renderCMS(); toast(x.published ? 'Unpublished: hidden from the website' : 'Published: now live on the website'); });
    const move = async (id, dir) => { const i = L.findIndex(x => x.id === id), j = i + dir; if (j < 0 || j >= L.length) return; const a = L[i], b = L[j]; await Promise.all([S.sb.from(CMS_T[tab]).update({ sort: j * 10 }).eq('id', a.id), S.sb.from(CMS_T[tab]).update({ sort: i * 10 }).eq('id', b.id), ...L.filter((x, k) => k !== i && k !== j && x.sort !== k * 10).map(x => S.sb.from(CMS_T[tab]).update({ sort: L.indexOf(x) * 10 }).eq('id', x.id))]); await loadCMS(); renderCMS(); };
    $$('[data-up]').forEach(b => b.onclick = () => move(b.dataset.up, -1));
    $$('[data-down]').forEach(b => b.onclick = () => move(b.dataset.down, 1));
  }

  /* block editor for articles */
  const blockFields = (b, i) => {
    const t = b[0], v = k => esc(b[k] ?? '');
    const L = Array.isArray(b[1]) ? b[1] : [], lines = t === 'ul' ? L.join('\n') : t === 'stats' ? L.map(r => r.join(' | ')).join('\n') : t === 'offers' ? L.map(r => [r[0], r[1], (r[2] || []).join('; ')].join(' | ')).join('\n') : '';
    if (t === 'p' || t === 'pull') return `<textarea data-bf="1" rows="${t === 'p' ? 4 : 3}" placeholder="${t === 'p' ? 'Paragraph text. You can use <strong>bold</strong>.' : 'A short, striking line from the article'}">${v(1)}</textarea>`;
    if (t === 'h3' || t === 'close') return `<input data-bf="1" value="${v(1)}" placeholder="${t === 'h3' ? 'Section heading' : 'Final line, shown large'}">`;
    if (t === 'quote') return `<textarea data-bf="1" rows="2" placeholder="Quote">${v(1)}</textarea><input data-bf="2" value="${v(2)}" placeholder="Who said it">`;
    if (t === 'callout') return `<input data-bf="1" value="${v(1)}" placeholder="Callout title"><textarea data-bf="2" rows="4" placeholder="Callout text">${v(2)}</textarea>`;
    if (t === 'img') return `<div class="bimg">${thumb(b[1], 'bthumb')}<span><input data-bf="1" value="${v(1)}" placeholder="Image link, or upload"><button type="button" class="btn ghost sm" data-bup="${i}">Upload image</button></span></div><input data-bf="2" value="${v(2)}" placeholder="Caption">`;
    if (t === 'ul') return `<textarea data-bl="ul" rows="4" placeholder="One bullet per line">${esc(lines)}</textarea>`;
    if (t === 'stats') return `<textarea data-bl="stats" rows="4" placeholder="One per line: figure | label, e.g. 80%+ | rated clean air a top priority">${esc(lines)}</textarea>`;
    if (t === 'offers') return `<textarea data-bl="offers" rows="4" placeholder="One card per line: Title | Subtitle | point; point; point">${esc(lines)}</textarea>`;
    return '';
  };
  function readBlocks(root){
    return $$('.blk', root).map(el => { const t = el.dataset.t, f = k => (el.querySelector(`[data-bf="${k}"]`) || {}).value || '', l = (el.querySelector('[data-bl]') || {}).value || '', rows = l.split('\n').map(x => x.trim()).filter(Boolean);
      if (t === 'ul') return ['ul', rows]; if (t === 'stats') return ['stats', rows.map(r => r.split('|').map(x => x.trim()).slice(0, 2))];
      if (t === 'offers') return ['offers', rows.map(r => { const [a, b2, c] = r.split('|').map(x => (x || '').trim()); return [a, b2 || '', (c || '').split(';').map(x => x.trim()).filter(Boolean)]; })];
      if (t === 'quote' || t === 'callout' || t === 'img') return [t, f(1), f(2)]; return [t, f(1)]; }).filter(b => b.slice(1).some(x => Array.isArray(x) ? x.length : String(x).trim()));
  }
  function renderBlocks(box, blocks){
    box.innerHTML = blocks.map((b, i) => `<div class="blk" data-t="${b[0]}"><div class="blk-h"><select data-btype="${i}">${BLOCKS.map(([k, l]) => `<option value="${k}" ${k === b[0] ? 'selected' : ''}>${l}</option>`).join('')}</select><span><button type="button" class="icon" data-bmv="${i}|-1" aria-label="Move up">↑</button><button type="button" class="icon" data-bmv="${i}|1" aria-label="Move down">↓</button><button type="button" class="icon" data-bdel="${i}" aria-label="Remove block">×</button></span></div>${blockFields(b, i)}</div>`).join('') + `<div class="blk-add">${BLOCKS.map(([k, l]) => `<button type="button" class="btn ghost sm" data-badd="${k}">+ ${l}</button>`).join('')}</div>`;
    const cur = () => readBlocksRaw(box);
    $$('[data-btype]', box).forEach(s => s.onchange = () => { const bl = cur(); bl[+s.dataset.btype] = [s.value, '', '']; renderBlocks(box, bl); });
    $$('[data-bmv]', box).forEach(btn => btn.onclick = () => { const [i, d] = btn.dataset.bmv.split('|').map(Number), bl = cur(), j = i + d; if (j < 0 || j >= bl.length) return; [bl[i], bl[j]] = [bl[j], bl[i]]; renderBlocks(box, bl); });
    $$('[data-bdel]', box).forEach(btn => btn.onclick = () => { const bl = cur(); bl.splice(+btn.dataset.bdel, 1); renderBlocks(box, bl); });
    $$('[data-badd]', box).forEach(btn => btn.onclick = () => { const bl = cur(); bl.push([btn.dataset.badd, '', '']); renderBlocks(box, bl); box.lastElementChild.previousElementSibling?.querySelector('input,textarea')?.focus(); });
    $$('[data-bup]', box).forEach(btn => btn.onclick = () => pickImage('articles', u => { const bl = cur(); bl[+btn.dataset.bup][1] = u; renderBlocks(box, bl); }));
  }
  const readBlocksRaw = box => $$('.blk', box).map(el => { const r = readBlocks({ querySelectorAll: () => [el] }); return r[0] || [el.dataset.t, '', '']; });

  const sectionsToText = secs => (secs || []).map(([h, ps, li]) => [`## ${h}`, ...(ps || []), ...(li || []).map(x => '- ' + x)].join('\n')).join('\n\n');
  const textToSections = t => { const out = []; let cur = null; t.split('\n').forEach(line => { const l = line.trim(); if (!l) return; if (l.startsWith('## ')) { cur = [l.slice(3).trim(), [], []]; out.push(cur); return; } if (!cur) { cur = ['About the role', [], []]; out.push(cur); } if (/^[-•]\s+/.test(l)) cur[2].push(l.replace(/^[-•]\s+/, '')); else cur[1].push(l); }); return out; };
  const imgField = (name, val, folder, label) => `<div class="c6 imgf"><span class="imgf-l">${label}</span><div class="imgf-r">${thumb(val, 'ithumb')}<input name="${name}" value="${esc(val || '')}" placeholder="Image link or file name"><button type="button" class="btn ghost sm" data-iup="${name}|${folder}">Upload</button></div></div>`;

  async function cmsEdit(tab, x){
    const f = $('#editForm'), dlg = $('#editDlg'), cats = x?.cats || ['blog'];
    let body = '';
    if (tab === 'articles') {
      const a = x || { title: '', slug: '', standfirst: '', series: 'Incubitt', edition: '', topic: '', author: { name: S.me.full_name || '', role: '', img: '', bio: [] }, hero: '', hero_alt: '', body: [['p', '']], cta: '', cta_href: '', cta_label: '', external_url: '', published: false };
      body = `<label class="c4">Title<input name="title" required value="${esc(a.title)}"></label><label class="c2">Web address<input name="slug" value="${esc(a.slug)}" placeholder="made from the title"></label>
        <label class="c6">Standfirst (the short intro)<textarea name="standfirst" rows="2">${esc(a.standfirst)}</textarea></label>
        <label class="c2">Series<input name="series" value="${esc(a.series)}" placeholder="Incubitt, Outlook…"></label><label class="c2">Edition / date label<input name="edition" value="${esc(a.edition)}" placeholder="e.g. IWD 2026"></label><label class="c2">Topic<input name="topic" value="${esc(a.topic)}"></label>
        <div class="c6 cats"><span>Show under</span>${['blog', 'research'].map(c => `<label class="bill"><input type="checkbox" name="cats" value="${c}" ${cats.includes(c) ? 'checked' : ''}>${c === 'blog' ? 'Blog' : 'Research'}</label>`).join('')}</div>
        ${imgField('hero', a.hero, 'articles', 'Cover image')}<label class="c6">Cover image description (for accessibility)<input name="hero_alt" value="${esc(a.hero_alt)}"></label>
        <label class="c2">Author<input name="au_name" value="${esc(a.author?.name || '')}"></label><label class="c2">Author role<input name="au_role" value="${esc(a.author?.role || '')}"></label>${imgField('au_img', a.author?.img || '', 'people', 'Author photo').replace('class="c6 imgf"', 'class="c2 imgf"')}
        <label class="c6">Author bio (optional)<textarea name="au_bio" rows="2">${esc((a.author?.bio || []).join('\n'))}</textarea></label>
        <label class="c6">Link to an external article instead (e.g. LinkedIn) — leave empty to write the article here<input name="external_url" value="${esc(a.external_url)}" placeholder="https://"></label>
        <div class="c6"><h3 class="ed-h">Article</h3><div id="blocks"></div></div>
        <label class="c3">Call to action at the end<input name="cta" value="${esc(a.cta)}" placeholder="e.g. Planning a workplace refresh? Let’s talk."></label><label class="c2">Button link (optional)<input name="cta_href" value="${esc(a.cta_href)}" placeholder="Contact page"></label><label>Button text<input name="cta_label" value="${esc(a.cta_label)}" placeholder="Talk to us ↗"></label>
        <label class="bill c6"><input type="checkbox" name="published" ${a.published ? 'checked' : ''}>Published on the website</label>`;
    } else if (tab === 'projects') {
      const p = x || { name: '', slug: '', client: '', sector: 'Workplace', location: 'Lagos, Nigeria', year: '', duration: '', service: 'Interior design', tag: '', hero: '', gallery: [], paragraphs: [], leed: false, home_feature: false, published: false };
      body = `<label class="c3">Project name<input name="name" required value="${esc(p.name)}"></label><label class="c3">Client<input name="client" value="${esc(p.client)}"></label>
        <label class="c2">Sector<select name="sector">${['Workplace', 'Hospitality', 'Residential', 'Retail'].map(s => `<option ${s === p.sector ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="c2">Location<input name="location" value="${esc(p.location)}"></label><label class="c2">Web address<input name="slug" value="${esc(p.slug)}" placeholder="made from the name"></label>
        <label class="c2">Year(s)<input name="year" value="${esc(p.year)}" placeholder="2024 – 2025"></label><label class="c2">Duration<input name="duration" value="${esc(p.duration)}" placeholder="6 months"></label><label class="c2">Services<input name="service" value="${esc(p.service)}"></label>
        <label class="c6">Title line<input name="tag" value="${esc(p.tag)}" placeholder="e.g. Refined Heritage"></label>
        ${imgField('hero', p.hero, 'projects', 'Cover photo')}
        <div class="c6"><span class="imgf-l">Gallery photos (drag the order with the arrows)</span><div id="gal" class="galed"></div><button type="button" class="btn ghost sm" id="galAdd">+ Upload photos</button></div>
        <label class="c6">Write-up (leave a blank line between paragraphs) <span class="sub" style="font-size:11.5px">· For a case study: start a section with “## The Challenge”, list items with “• ”, results with “✓ ”, facts as “Sector: Financial Services” lines, and a highlighted statement with “> ”</span><textarea name="paragraphs" rows="10">${esc((p.paragraphs || []).join('\n\n'))}</textarea></label>
        <label class="c6">Project film (optional YouTube link)<input name="video" value="${esc(p.video && p.video !== 'IFFV' ? p.video : '')}" placeholder="https://youtube.com/shorts/…"></label>
        <label class="bill c2"><input type="checkbox" name="home_feature" ${p.home_feature ? 'checked' : ''}>Show on the home page</label><label class="bill c2"><input type="checkbox" name="leed" ${p.leed ? 'checked' : ''}>LEED Platinum badge</label><label class="bill c2"><input type="checkbox" name="published" ${p.published ? 'checked' : ''}>Published</label>`;
    } else if (tab === 'jobs') {
      const j = x || { title: '', slug: '', dept: '', reports: '', location: 'Lagos, Nigeria', type: 'Full time', closed: false, summary: '', sections: [['About the role', [''], []]], published: false };
      body = `<label class="c4">Role title<input name="title" required value="${esc(j.title)}"></label><label class="c2">Web address<input name="slug" value="${esc(j.slug)}" placeholder="made from the title"></label>
        <label class="c2">Department<input name="dept" value="${esc(j.dept)}"></label><label class="c2">Reports to<input name="reports" value="${esc(j.reports)}"></label><label>Location<input name="location" value="${esc(j.location)}"></label><label>Type<input name="type" value="${esc(j.type)}"></label>
        <label class="c6">Summary<textarea name="summary" rows="2">${esc(j.summary)}</textarea></label>
        <label class="c6">Job description — start each section with “## ”, and each bullet with “- ”<textarea name="sections" rows="12">${esc(sectionsToText(j.sections))}</textarea></label>
        <label class="bill c3"><input type="checkbox" name="closed" ${j.closed ? 'checked' : ''}>Closed (no longer accepting applications)</label><label class="bill c3"><input type="checkbox" name="published" ${j.published ? 'checked' : ''}>Published</label>`;
    } else if (tab === 'press') {
      const pr = x || { source: '', title: '', url: '', published: true };
      body = `<label class="c2">Publication<input name="source" required value="${esc(pr.source)}" placeholder="e.g. BusinessDay"></label><label class="c4">Headline<input name="title" required value="${esc(pr.title)}"></label><label class="c6">Link<input name="url" type="url" required value="${esc(pr.url)}" placeholder="https://"></label><label class="bill c6"><input type="checkbox" name="published" ${pr.published ? 'checked' : ''}>Published</label>`;
    } else {
      const t = x || { quote: '', name: '', company: '', published: true };
      body = `<label class="c6">Quote<textarea name="quote" rows="4" required>${esc(t.quote)}</textarea></label><label class="c3">Name<input name="name" required value="${esc(t.name)}"></label><label class="c3">Company<input name="company" value="${esc(t.company)}"></label><label class="bill c6"><input type="checkbox" name="published" ${t.published ? 'checked' : ''}>Published</label>`;
    }
    f.innerHTML = `<div class="c6 job-h"><h2 style="margin:0">${x ? 'Edit' : 'New'} ${{ articles: 'article', projects: 'project', jobs: 'role', press: 'press item', testi: 'testimonial' }[tab]}</h2>${x ? `<span class="pub ${x.published ? 'on' : ''}">${x.published ? 'Published' : 'Draft'}</span>` : ''}</div>${body}
      <div class="c6 dlg-actions">${x ? '<button class="btn ghost" value="delete" formnovalidate>Delete</button>' : ''}${x && x.slug && x.published && ['articles', 'projects', 'jobs'].includes(tab) ? `<a class="btn ghost" target="_blank" rel="noopener" href="${SITE}/#/${{ articles: 'insights', projects: 'work', jobs: 'careers' }[tab]}/${esc(x.slug)}">View on website ↗</a>` : ''}<button class="btn ghost" value="cancel" formnovalidate>Close</button><button class="btn red" value="save">Save</button></div>`;
    dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    if (tab === 'articles') renderBlocks($('#blocks'), (x?.body?.length ? x.body : [['p', '']]).map(b => [...b]));
    let gallery = [...(x?.gallery || [])];
    const drawGal = () => { const g = $('#gal'); if (!g) return; g.innerHTML = gallery.map((k, i) => `<div class="gi">${thumb(k, 'gthumb')}<span><button type="button" class="icon" data-gm="${i}|-1" aria-label="Move left">←</button><button type="button" class="icon" data-gm="${i}|1" aria-label="Move right">→</button><button type="button" class="icon" data-gd="${i}" aria-label="Remove">×</button></span></div>`).join('') || '<p class="sub">No gallery photos yet.</p>';
      $$('[data-gm]', g).forEach(b => b.onclick = () => { const [i, d] = b.dataset.gm.split('|').map(Number), j = i + d; if (j < 0 || j >= gallery.length) return; [gallery[i], gallery[j]] = [gallery[j], gallery[i]]; drawGal(); });
      $$('[data-gd]', g).forEach(b => b.onclick = () => { gallery.splice(+b.dataset.gd, 1); drawGal(); }); };
    drawGal();
    if ($('#galAdd')) $('#galAdd').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.onchange = async () => { toast('Uploading…'); for (const file of i.files) { const u = await uploadImage(file, 'projects'); if (u) gallery.push(u); } drawGal(); toast('Photos added'); }; i.click(); };
    $$('[data-iup]').forEach(b => b.onclick = () => { const [name, folder] = b.dataset.iup.split('|'); pickImage(folder, u => { f[name].value = u; b.parentElement.querySelector('.ithumb')?.replaceWith(Object.assign(document.createElement('img'), { className: 'ithumb', src: u })); }); });
    $$('.imgf-r input').forEach(inp => inp.onchange = () => { const t = inp.parentElement.querySelector('.ithumb'); if (t) t.outerHTML = thumb(inp.value, 'ithumb'); });
    f.onsubmit = async ev => {
      const v = ev.submitter?.value; if (v === 'cancel') return; ev.preventDefault();
      if (v === 'delete') { if (!confirm('Delete this from the website content? This can’t be undone.')) return; const { error } = await S.sb.from(CMS_T[tab]).delete().eq('id', x.id); if (error) return toast('Couldn’t delete'); dlg.close(); await loadCMS(); renderCMS(); return toast('Deleted'); }
      const d = new FormData(f), g = k => String(d.get(k) ?? '').trim(), pub = d.get('published') === 'on';
      let row;
      if (tab === 'articles') {
        const blocks = readBlocks($('#blocks'));
        if (!g('external_url') && !blocks.length) return toast('Add some article text, or an external link');
        row = { title: g('title'), slug: slugify(g('slug') || g('title')), standfirst: g('standfirst'), series: g('series'), edition: g('edition'), topic: g('topic'), cats: d.getAll('cats').length ? d.getAll('cats') : ['blog'], author: { ...(x?.author || {}), name: g('au_name'), role: g('au_role'), img: g('au_img'), bio: g('au_bio') ? g('au_bio').split('\n').filter(Boolean) : [] }, hero: g('hero'), hero_alt: g('hero_alt'), body: blocks, cta: g('cta'), cta_href: g('cta_href'), cta_label: g('cta_label'), external_url: g('external_url'), published: pub };
      } else if (tab === 'projects') row = { name: g('name'), slug: slugify(g('slug') || g('name')), client: g('client'), sector: g('sector'), location: g('location'), year: g('year'), duration: g('duration'), service: g('service'), tag: g('tag'), hero: g('hero'), gallery, paragraphs: g('paragraphs').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean), video: x && x.video === 'IFFV' ? 'IFFV' : g('video'), leed: d.get('leed') === 'on', home_feature: d.get('home_feature') === 'on', published: pub };
      else if (tab === 'jobs') row = { title: g('title'), slug: slugify(g('slug') || g('title')), dept: g('dept'), reports: g('reports'), location: g('location'), type: g('type'), summary: g('summary'), sections: textToSections(g('sections')), closed: d.get('closed') === 'on', published: pub };
      else if (tab === 'press') row = { source: g('source'), title: g('title'), url: g('url'), published: pub };
      else row = { quote: g('quote'), name: g('name'), company: g('company'), published: pub };
      if (tab === 'projects' && !row.hero) return toast('Add a cover photo');
      if (!x) row.sort = ((S.cms[tab] || []).reduce((m, y) => Math.max(m, y.sort || 0), 0)) + 10;
      if (!x && tab === 'articles') row.sort = -10;
      const { error } = x ? await S.sb.from(CMS_T[tab]).update(row).eq('id', x.id) : await S.sb.from(CMS_T[tab]).insert(row);
      if (error) return toast(/duplicate|unique/i.test(error.message || '') ? 'That web address is already used. Change it and try again.' : 'Couldn’t save. Check the fields and try again.');
      dlg.close(); await loadCMS(); renderCMS(); toast(pub ? 'Saved and live on the website' : 'Saved as a draft');
    };
  }

  /* ---------- two-step login (TOTP) ---------- */
  async function mfaGate(){
    try {
      const { data: aal } = await S.sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') { showMfaCode(); return false; }
      const { data: st } = await S.sb.rpc('my_mfa_status');
      S.mfa = st || {};
      if (st && st.required && !st.enrolled) { showMfaEnroll(true); return false; }
    } catch (e) { /* if the check fails, the database rules still protect the data */ }
    return true;
  }
  const codeInput = id => `<label>6-digit code<input id="${id}" class="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>`;
  async function verifiedFactor(){ const { data } = await S.sb.auth.mfa.listFactors(); return (data?.totp || []).find(f => f.status === 'verified'); }
  function showMfaCode(){
    authShell(`<h1>Two-step login</h1><p class="sub">Open your authenticator app (for example Google Authenticator or Microsoft Authenticator) and enter the code for the JCI staff portal.</p>
      <form id="mfaF" class="stack">${codeInput('mfaCode')}<p class="form-msg" id="mfaMsg" role="alert"></p><button class="btn red full">Verify</button></form>
      <button class="link" id="mfaOut">Use a different account</button><p class="sub" style="font-size:12px;margin-top:12px">Lost your phone? Ask your administrator to reset your two-step login.</p>`);
    $('#mfaCode').focus();
    $('#mfaOut').onclick = () => S.sb.auth.signOut();
    $('#mfaF').onsubmit = async e => {
      e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true; $('#mfaMsg').textContent = '';
      const f = await verifiedFactor(); if (!f) { b.disabled = false; return $('#mfaMsg').textContent = 'No authenticator is set up for this account. Ask your administrator.'; }
      const { error } = await S.sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: $('#mfaCode').value.trim() });
      b.disabled = false;
      if (error) { $('#mfaMsg').textContent = 'That code didn’t work. Check the time on your phone is correct and try the newest code.'; $('#mfaCode').select(); return; }
      const { data: { user } } = await S.sb.auth.getUser(); enter(user);
    };
  }
  async function startEnroll(box, done){
    const { data: list } = await S.sb.auth.mfa.listFactors();
    for (const f of (list?.all || []).filter(f => f.status !== 'verified')) await S.sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await S.sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'JCI portal ' + new Date().toISOString().slice(0, 16) });
    if (error || !data) { box.innerHTML = '<p class="form-msg">Two-step login couldn’t be started. Try again later.</p>'; return; }
    const secret = (data.totp.secret || '').replace(/(.{4})/g, '$1 ').trim();
    box.innerHTML = `<ol class="mfa-steps"><li>Install an authenticator app on your phone, such as <b>Google Authenticator</b> or <b>Microsoft Authenticator</b>.</li><li>In the app, add an account and scan this code:</li></ol>
      <div class="mfa-qr"><img src="${esc(data.totp.qr_code)}" alt="QR code for your authenticator app" width="180" height="180"><div><small>Can’t scan? Type this key instead:</small><code>${esc(secret)}</code></div></div>
      <ol class="mfa-steps" start="3"><li>Enter the 6-digit code the app shows:</li></ol>
      <form id="enrF" class="stack">${codeInput('enrCode')}<p class="form-msg" id="enrMsg" role="alert"></p><button class="btn red full">Turn on two-step login</button></form>`;
    $('#enrF').onsubmit = async e => {
      e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true;
      const { error: ve } = await S.sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: $('#enrCode').value.trim() });
      b.disabled = false;
      if (ve) { $('#enrMsg').textContent = 'That code didn’t work. Try the newest code from the app.'; return; }
      S.mfa = { ...(S.mfa || {}), enrolled: true }; toast('Two-step login is on'); done();
    };
  }
  function showMfaEnroll(forced){
    authShell(`<h1>Set up two-step login</h1><p class="sub">${forced ? 'Your administrator requires a second step when you sign in, using a code from your phone. It takes about a minute.' : ''}</p><div id="enrBox"><p class="sub">Preparing…</p></div><button class="link" id="mfaOut">Sign out</button>`);
    $('#mfaOut').onclick = () => S.sb.auth.signOut();
    startEnroll($('#enrBox'), async () => { const { data: { user } } = await S.sb.auth.getUser(); enter(user); });
  }
  async function renderSecurity(){
    const f = await verifiedFactor(), st = S.mfa || {};
    main(`<div class="head"><div><h1>Two-step login</h1><p class="sub">Protect your account with a code from your phone, so a stolen password isn’t enough to get in.</p></div></div>
      <div class="card" style="max-width:640px">${f ? `<div class="mfa-on"><b>Two-step login is on</b><span class="sub">Added ${new Date(f.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}. You’ll be asked for a code each time you sign in.</span></div>
        ${st.required ? '<p class="sub" style="margin-top:12px">Your administrator requires two-step login for your account, so it can’t be switched off. If you get a new phone, ask them to reset it, then set it up again.</p>' : '<button class="btn ghost" id="mfaOff" style="margin-top:14px">Turn off two-step login</button>'}`
        : `<div id="enrBox"><button class="btn red" id="mfaOn">Set up two-step login</button></div>`}</div>`);
    if ($('#mfaOn')) $('#mfaOn').onclick = () => { $('#enrBox').innerHTML = '<p class="sub">Preparing…</p>'; startEnroll($('#enrBox'), renderSecurity); };
    if ($('#mfaOff')) $('#mfaOff').onclick = async () => { if (!confirm('Turn off two-step login? Your account will only be protected by your password.')) return; const { error } = await S.sb.auth.mfa.unenroll({ factorId: f.id }); if (error) return toast('Couldn’t turn it off. Sign out and in again, then retry.'); await S.sb.auth.refreshSession(); toast('Two-step login is off'); renderSecurity(); };
  }

  /* ---------- my account ---------- */
  const dlFile = (name, text, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
  const csvOf = rows => { if (!rows.length) return ''; const cols = [...new Set(rows.flatMap(r => Object.keys(r)))]; const q = v => `"${String(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"`; return '\ufeff' + [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n'); };
  async function fetchAll(table, build){
    const out = []; for (let from = 0; from < 100000; from += 1000) { let q = S.sb.from(table).select('*'); if (build) q = build(q); const { data, error } = await q.range(from, from + 999); if (error) return { rows: out, error }; out.push(...(data || [])); if (!data || data.length < 1000) break; } return { rows: out };
  }
  async function renderAccount(){
    S.mfaOn = !!(await verifiedFactor().catch(() => null));
    const m = S.me;
    main(`<div class="head"><div><h1>My account</h1><p class="sub">Your profile, password and personal data.</p></div></div>
      <form class="card f" id="profF"><h2 class="c6">Profile</h2>
        <label class="c3">Full name<input name="full_name" required maxlength="120" value="${esc(m.full_name || '')}" autocomplete="name"></label>
        <label class="c3">Job title<input name="job_title" maxlength="120" value="${esc(m.job_title || '')}" placeholder="e.g. Senior Interior Designer"></label>
        <label class="c3">Work email<input value="${esc(m.email)}" disabled></label>
        <label class="c3">Phone<input name="phone" maxlength="40" value="${esc(m.phone || '')}" inputmode="tel" autocomplete="tel"></label>
        <p class="c4 sub" style="font-size:12px">To change your email address or role, ask an admin.</p>
        <div class="c2" style="display:flex;justify-content:flex-end"><button class="btn">Save profile</button></div></form>
      <form class="card f" id="pwF" style="margin-top:14px"><h2 class="c6">Change password</h2>
        <label class="c2">Current password<input type="password" name="cur" required autocomplete="current-password"></label>
        <label class="c2">New password<input type="password" name="p1" required minlength="10" autocomplete="new-password"></label>
        <label class="c2">Confirm new password<input type="password" name="p2" required minlength="10" autocomplete="new-password"></label>
        <p class="c4 sub" style="font-size:12px">At least 10 characters. A short phrase is easier to remember and harder to guess.</p>
        <div class="c2" style="display:flex;justify-content:flex-end"><button class="btn">Change password</button></div><p class="c6 form-msg" id="pwMsg" role="alert"></p></form>
      <div class="grid g2" style="margin-top:14px">
        <div class="card"><h2>Signed-in devices</h2><p class="sub" style="margin-bottom:12px">Lost a phone or used a shared computer? Sign out everywhere except this device.</p><button class="btn ghost" id="soOthers">Sign out other devices</button>
          <p class="sub" style="margin-top:14px;font-size:13px">Two-step login: <b>${S.mfaOn ? 'on' : 'off'}</b> · <button class="link" id="goSec" style="margin:0">Manage</button></p></div>
        <div class="card"><h2>Your data</h2><p class="sub" style="margin-bottom:12px">Download a copy of everything the portal holds about you: your profile, time, timesheets, time off, expenses and schedule.</p><button class="btn ghost" id="myData">Download my data</button>
          <p class="sub" style="margin-top:14px;font-size:13px">To correct or delete your data, contact an admin. See how we handle personal data in our <a href="../#/privacy" target="_blank" rel="noopener">privacy notice</a>.</p></div>
      </div>`);
    $('#profF').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), row = { full_name: String(f.get('full_name')).trim(), job_title: String(f.get('job_title') || '').trim(), phone: String(f.get('phone') || '').trim() };
      const { error } = await S.sb.from('profiles').update(row).eq('id', m.id); if (error) return toast('Couldn’t save your profile'); Object.assign(S.me, row); renderTop(); toast('Profile saved'); };
    $('#pwF').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target), msg = $('#pwMsg'), b = e.target.querySelector('button'); msg.textContent = '';
      if (f.get('p1') !== f.get('p2')) return msg.textContent = 'The new passwords don’t match.';
      if (String(f.get('p1')).length < 10) return msg.textContent = 'Use at least 10 characters.';
      if (f.get('p1') === f.get('cur')) return msg.textContent = 'Choose a password you haven’t used here before.';
      b.disabled = true;
      const chk = await S.sb.auth.signInWithPassword({ email: m.email, password: f.get('cur') });
      if (chk.error) { b.disabled = false; return msg.textContent = 'Your current password isn’t right.'; }
      const { error } = await S.sb.auth.updateUser({ password: f.get('p1') }); b.disabled = false;
      if (error) return msg.textContent = /reauth|recent|aal/i.test(error.message) ? 'For security, sign out and back in, then try again.' : error.message;
      e.target.reset(); toast('Password changed'); };
    $('#soOthers').onclick = async () => { if (!confirm('Sign out of the portal on all your other devices?')) return; const { error } = await S.sb.auth.signOut({ scope: 'others' }); toast(error ? 'That didn’t work. Try again.' : 'Signed out of your other devices'); };
    $('#goSec').onclick = () => go('security');
    $('#myData').onclick = async e => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'Preparing…';
      const own = q => q.eq('user_id', m.id), out = { exported_at: new Date().toISOString(), profile: m };
      for (const [k, t] of [['time_entries', 'time_entries'], ['timesheets', 'timesheets'], ['time_off', 'leave_requests'], ['expenses', 'expenses'], ['schedule', 'assignments']]) out[k] = (await fetchAll(t, own)).rows;
      out.jobs_you_own_or_lead = (await fetchAll('jobs')).rows.filter(j => j.owner_id === m.id || j.lead_id === m.id);
      dlFile(`jci-my-data-${dkey(new Date())}.json`, JSON.stringify(out, null, 2));
      if (out.time_entries.length) dlFile(`jci-my-time-${dkey(new Date())}.csv`, csvOf(out.time_entries.map(r => ({ date: r.entry_date, project: proj(r.project_id).name, job_id: proj(r.project_id).job_code || '', category: r.category, task: r.note, start: r.started_at, end: r.ended_at, minutes: r.minutes, billable: r.billable }))), 'text/csv');
      b.disabled = false; b.textContent = 'Download my data'; toast('Your data has been downloaded');
    };
  }

  /* ---------- admin data tools ---------- */
  const DATA_TABLES = [['profiles', 'People'], ['projects', 'Projects'], ['time_entries', 'Time entries'], ['timesheets', 'Timesheets'], ['timers', 'Running timers'], ['leave_types', 'Leave types'], ['leave_allowances', 'Leave allowances'], ['leave_requests', 'Time off requests'], ['holidays', 'Public holidays'], ['expenses', 'Expenses'], ['member_rates', 'Hourly rates'], ['project_task_rates', 'Activity rates'], ['assignments', 'Schedule'], ['invoices', 'Invoices'], ['invoice_items', 'Invoice lines'], ['recurring_invoices', 'Recurring invoices'], ['jobs', 'Jobs and pipeline'], ['job_updates', 'Job history'], ['suppliers', 'Suppliers'], ['bills', 'Supplier bills'], ['bill_payments', 'Bill payments'], ['enquiries', 'Enquiries'], ['cms_articles', 'Website articles'], ['cms_projects', 'Website projects'], ['cms_jobs', 'Website careers'], ['cms_press', 'Website press'], ['cms_testimonials', 'Website testimonials'], ['settings', 'Workspace settings']];
  const IMPORTS = {
    staff: { label: 'Staff (sends invitations)', cols: ['Full name', 'Email', 'Role'], example: [['Ada Okafor', 'ada@jamescubittinteriors.com', 'Staff']] },
    projects: { label: 'Projects', cols: ['Job ID', 'Project name', 'Client', 'Billable rate', 'Budget type', 'Budget', 'Estimate hours'], example: [['J020', 'Head office refresh', 'Client name', '25000', 'Hours', '120', '100']] },
    holidays: { label: 'Public holidays', cols: ['Date', 'Name'], example: [['2027-01-01', 'New Year’s Day']] },
  };
  function parseCSV(text){
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.map(r => r.map(x => x.replace(/^\ufeff/, '').trim())).filter(r => r.some(Boolean));
  }
  const loadXLSX = () => window.XLSX ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  async function readSheet(file){
    if (/\.(xlsx|xls)$/i.test(file.name)) { await loadXLSX(); const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); const ws = wb.Sheets[wb.SheetNames[0]]; return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' }).map(r => r.map(x => String(x ?? '').trim())).filter(r => r.some(Boolean)); }
    return parseCSV(await file.text());
  }
  function validateImport(kind, rows){
    const head = rows[0].map(h => h.toLowerCase()), idx = c => head.indexOf(c.toLowerCase()), get = (r, c) => (r[idx(c)] || '').trim();
    const missing = IMPORTS[kind].cols.filter(c => idx(c) < 0 && !['Job ID', 'Client', 'Billable rate', 'Budget type', 'Budget', 'Estimate hours'].includes(c));
    if (missing.length) return { error: `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. Use the template.` };
    const seen = new Set();
    return { rows: rows.slice(1).map((r, n) => {
      const line = n + 2;
      if (kind === 'staff') { const email = get(r, 'Email').toLowerCase(), role = (get(r, 'Role') || 'staff').toLowerCase(), name = get(r, 'Full name');
        const err = !name ? 'Name missing' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 'Email looks wrong' : !['staff', 'manager', 'admin'].includes(role) ? 'Role must be Staff, Manager or Admin' : (role === 'admin' && !isAdmin()) ? 'Only admins can invite admins' : S.people.some(p => p.email.toLowerCase() === email) ? 'Already in the portal' : seen.has(email) ? 'Duplicate in file' : '';
        seen.add(email); return { line, data: { full_name: name, email, role }, show: [name, email, role], err }; }
      if (kind === 'projects') { const code = get(r, 'Job ID').toUpperCase(), name = get(r, 'Project name'), bt = (get(r, 'Budget type') || 'none').toLowerCase().replace('money', 'amount'), num = c => get(r, c) === '' ? null : Number(String(get(r, c)).replace(/[^\d.]/g, ''));
        const err = !name ? 'Project name missing' : (code && (S.projects.some(p => (p.job_code || '').toUpperCase() === code) || seen.has(code))) ? `${code} is already used` : !['none', 'hours', 'amount'].includes(bt) ? 'Budget type must be Hours, Amount or empty' : '';
        if (code) seen.add(code); return { line, data: { job_code: code || null, name, client: get(r, 'Client'), bill_rate: num('Billable rate'), budget_type: bt, budget: num('Budget'), estimate_hours: num('Estimate hours'), color: COLORS[(S.projects.length + n) % COLORS.length] }, show: [code || 'auto', name, get(r, 'Client')], err }; }
      const d = get(r, 'Date'), name = get(r, 'Name'), ok = /^\d{4}-\d{2}-\d{2}$/.test(d);
      return { line, data: { day: d, name }, show: [d, name], err: !ok ? 'Date must look like 2027-01-01' : !name ? 'Name missing' : '' };
    }) };
  }
  const fmtBytes = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  function driveLogHtml(logs){
    if (!logs.length) return '<p class="empty">No backups yet. Once your developer connects Google Drive or Microsoft OneDrive (section 19 of the setup guide), the first backup runs tonight, or press “Back up now”.</p>';
    const ok = logs.find(l => l.status === 'success'), last = logs[0];
    return `<div class="bk-status ${last.status}"><b>${last.status === 'success' ? 'Last backup succeeded' : 'Last backup failed'}${last.destination ? ' · ' + esc(last.destination) : ''}</b><span>${new Date(last.created_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${last.status === 'failed' ? ' · ' + esc(last.message) : ''}</span>${ok && last.status !== 'success' ? `<small>Last good backup: ${new Date(ok.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>` : ''}</div>
      <table class="sheet bk-t"><thead><tr><th style="text-align:left">When</th><th style="text-align:left">File</th><th>Records</th><th>Size</th><th style="text-align:left">Where</th><th style="text-align:left">How</th></tr></thead><tbody>${logs.map(l => `<tr class="${l.status === 'failed' ? 'bad' : ''}"><td style="text-align:left">${new Date(l.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td style="text-align:left">${l.status === 'success' ? (l.file_url ? `<a href="${esc(l.file_url)}" target="_blank" rel="noopener">${esc(l.file_name)} ↗</a>` : esc(l.file_name)) : `<span style="color:var(--red)">Failed: ${esc(l.message)}</span>`}</td><td>${l.rows ? l.rows.toLocaleString() : '–'}</td><td>${l.bytes ? fmtBytes(l.bytes) : '–'}</td><td style="text-align:left">${esc(l.destination || 'Google Drive')}</td><td style="text-align:left">${esc(l.trigger === 'scheduled' ? 'Nightly' : l.trigger.replace('manual by ', 'By '))}</td></tr>`).join('')}</tbody></table>`;
  }
  async function renderData(){
    main(`<div class="head"><div><h1>Data and backups</h1><p class="sub">Back up the portal and bring in data from spreadsheets.</p></div></div><div class="notice"><p class="sub">Counting records…</p></div>`);
    const counts = await Promise.all(DATA_TABLES.map(([t]) => S.sb.from(t).select('*', { count: 'exact', head: true }).then(r => r.count ?? 0, () => 0)));
    const total = counts.reduce((a, b) => a + b, 0);
    const logs = (await S.sb.from('backup_log').select('*').order('created_at', { ascending: false }).limit(10)).data || [];
    main(`<div class="head"><div><h1>Data and backups</h1><p class="sub">Back up the portal and bring in data from spreadsheets.</p></div></div>
      <div class="card"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Backup and export</h2><button class="btn red" id="fullBk">Download full backup</button></div>
        <p class="sub" style="margin-bottom:12px">${total.toLocaleString()} records across ${DATA_TABLES.length} tables. The full backup is one JSON file; each table can also be downloaded as a spreadsheet (CSV). Receipts and uploaded images stay in Supabase storage and aren’t included. Store backups somewhere safe: they contain personal data and pay rates.</p>
        <div class="dt-grid">${DATA_TABLES.map(([t, l], i) => `<button class="dt" data-csv="${t}"><b>${l}</b><small>${counts[i].toLocaleString()} rows · CSV ↓</small></button>`).join('')}</div></div>
      <div class="card" style="margin-top:14px"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Automatic backups</h2><button class="btn ghost" id="driveNow">Back up now</button></div>
        <p class="sub" style="margin-bottom:12px">Every night at 2:00am the whole database is saved as one compressed file in your backup folder on Google Drive or Microsoft OneDrive / SharePoint, and the newest 30 backups are kept.</p>
        <div id="driveLog">${driveLogHtml(logs)}</div></div>
      <div class="card" style="margin-top:14px"><h2>Import from a spreadsheet</h2><p class="sub" style="margin-bottom:12px">Upload an Excel file (.xlsx) or CSV. Check the preview, then import. Download a template to see the columns.</p>
        <div class="f"><label class="c2">What are you importing?<select id="impKind">${Object.entries(IMPORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label>
          <label class="c3">File<input type="file" id="impFile" accept=".xlsx,.xls,.csv,text/csv"></label>
          <div style="display:flex;align-items:flex-end"><button type="button" class="btn ghost sm" id="impTpl">Template ↓</button></div></div>
        <div id="impPrev"></div></div>
`);
    $('#fullBk').onclick = async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Preparing…'; const out = { exported_at: new Date().toISOString(), exported_by: S.me.email, tables: {} };
      for (const [t] of DATA_TABLES) { b.textContent = `Exporting ${t}…`; out.tables[t] = (await fetchAll(t)).rows; }
      dlFile(`jci-portal-backup-${dkey(new Date())}.json`, JSON.stringify(out)); b.disabled = false; b.textContent = 'Download full backup'; toast('Backup downloaded'); };
    $$('[data-csv]').forEach(b => b.onclick = async () => { const t = b.dataset.csv, { rows } = await fetchAll(t); if (!rows.length) return toast('That table is empty'); dlFile(`jci-${t}-${dkey(new Date())}.csv`, csvOf(rows), 'text/csv'); });
    $('#driveNow').onclick = async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Backing up…';
      const { data, error } = await S.sb.functions.invoke('backup', { body: {} }); b.disabled = false; b.textContent = 'Back up now';
      let msg = data && data.ok ? `Saved ${data.file} to ${data.destination === 'microsoft' ? 'OneDrive' : 'Google Drive'}` : 'The backup didn’t work';
      if (error) { try { const j = await error.context.json(); msg = j.error || msg; } catch (x) {} }
      toast(msg); const l = (await S.sb.from('backup_log').select('*').order('created_at', { ascending: false }).limit(10)).data || []; $('#driveLog').innerHTML = driveLogHtml(l); };
    $('#impTpl').onclick = () => { const k = $('#impKind').value, t = IMPORTS[k]; dlFile(`jci-import-${k}-template.csv`, '\ufeff' + [t.cols, ...t.example].map(r => r.map(x => `"${x}"`).join(',')).join('\n'), 'text/csv'); };
    const preview = async () => {
      const file = $('#impFile').files[0], box = $('#impPrev'); if (!file) return box.innerHTML = '';
      let rows; try { rows = await readSheet(file); } catch (e) { return box.innerHTML = '<p class="form-msg">That file couldn’t be read. Save it as .xlsx or CSV and try again.</p>'; }
      if (rows.length < 2) return box.innerHTML = '<p class="form-msg">The file has no rows under the header.</p>';
      const kind = $('#impKind').value, v = validateImport(kind, rows); if (v.error) return box.innerHTML = `<p class="form-msg">${esc(v.error)}</p>`;
      const good = v.rows.filter(r => !r.err);
      box.innerHTML = `<div class="scroll" style="max-height:320px;overflow:auto;margin-top:12px"><table class="sheet"><thead><tr><th>Row</th>${IMPORTS[kind].cols.slice(0, v.rows[0]?.show.length || 3).map(c => `<th style="text-align:left">${c}</th>`).join('')}<th style="text-align:left">Check</th></tr></thead><tbody>${v.rows.map(r => `<tr class="${r.err ? 'bad' : ''}"><td>${r.line}</td>${r.show.map(x => `<td style="text-align:left">${esc(x)}</td>`).join('')}<td style="text-align:left">${r.err ? `<span style="color:var(--red)">${esc(r.err)}</span>` : '<span style="color:var(--ok)">Ready</span>'}</td></tr>`).join('')}</tbody></table></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap"><span class="sub">${good.length} of ${v.rows.length} rows ready${v.rows.length - good.length ? ' · rows with problems will be skipped' : ''}</span><button class="btn red" id="impGo" ${good.length ? '' : 'disabled'}>Import ${good.length} row${good.length === 1 ? '' : 's'}</button></div>`;
      $('#impGo').onclick = async e => { const b = e.currentTarget; b.disabled = true; let ok = 0, fail = 0;
        if (kind === 'staff') for (const r of good) { b.textContent = `Inviting ${ok + fail + 1} of ${good.length}…`; try { await adminCall({ action: 'invite', full_name: r.data.full_name, email: r.data.email, role: r.data.role, redirectTo: HERE }); ok++; } catch (x) { fail++; } }
        else if (kind === 'projects') { const { error } = await S.sb.from('projects').insert(good.map(r => r.data)); error ? fail = good.length : ok = good.length; }
        else { const { error } = await S.sb.from('holidays').upsert(good.map(r => r.data)); error ? fail = good.length : ok = good.length; }
        toast(`${ok} imported${fail ? ` · ${fail} failed` : ''}`); await Promise.all([loadProjects(), loadLeave(), isMgr() ? loadTeam() : null]); renderData(); };
    };
    $('#impFile').onchange = preview; $('#impKind').onchange = preview;
  }

  /* ---------- project hub: stages, milestones, tasks ---------- */
  const T_STATUS = [['todo', 'To do'], ['doing', 'In progress'], ['review', 'Review'], ['done', 'Done']];
  const T_PRI = { low: ['Low', '#94a3b8'], normal: ['Normal', '#0369a1'], high: ['High', '#b45309'], urgent: ['Urgent', '#E3232B'] };
  const STD_STAGES = ['Brief', 'Concept design', 'Design development', 'Tender and procurement', 'Construction', 'Handover'];
  const tToday = () => dkey(new Date());
  const dueTag = t => !t.due_date ? '' : `<span class="due ${t.status !== 'done' && t.due_date < tToday() ? 'late' : t.due_date === tToday() ? 'today' : ''}">${t.due_date === tToday() ? 'Today' : fromKey(t.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>`;
  const ckProg = t => { const c = t.checklist || []; return c.length ? `<span class="ck">☑ ${c.filter(x => x.done).length}/${c.length}</span>` : ''; };
  async function loadHub(pid){
    const [st, ms, tk] = await Promise.all([S.sb.from('project_stages').select('*').eq('project_id', pid).order('sort'), S.sb.from('milestones').select('*').eq('project_id', pid).order('due_date'), S.sb.from('tasks').select('*').eq('project_id', pid).order('sort')]);
    S.hub = { pid, stages: st.data || [], miles: ms.data || [], tasks: tk.data || [] };
  }
  async function loadMyTasks(){ const { data } = await S.sb.from('tasks').select('*').eq('assignee_id', S.me.id).order('due_date', { ascending: true, nullsFirst: false }); S.myTasks = data || []; }
  const myOpenTasks = () => (S.myTasks || []).filter(t => t.status !== 'done' && t.due_date && t.due_date <= tToday()).length;

  async function renderHub(){
    const ps = S.projects.filter(p => !p.archived);
    if (!S.hubPid || !ps.some(p => p.id === S.hubPid)) S.hubPid = ps[0]?.id || null;
    if (!S.hubPid) return main('<div class="notice"><h1>Project hub</h1><p class="sub">Add a project first, then plan its stages and tasks here.</p></div>');
    if (!S.hub || S.hub.pid !== S.hubPid) { main('<div class="notice"><p class="sub">Loading…</p></div>'); await loadHub(S.hubPid); }
    const H = S.hub, p = proj(H.pid), open = H.tasks.filter(t => t.status !== 'done'), done = H.tasks.length - open.length;
    const late = open.filter(t => t.due_date && t.due_date < tToday()).length, nextM = H.miles.find(m => !m.done);
    const stageNow = H.stages.find(s => s.status === 'in_progress');
    main(`<div class="head"><div><h1>Project hub</h1><p class="sub">Stages, milestones and tasks for each project.</p></div>
      <select id="hubPick" class="hub-pick" aria-label="Project">${ps.map(x => `<option value="${esc(x.id)}" ${x.id === H.pid ? 'selected' : ''}>${x.job_code ? esc(x.job_code) + ' · ' : ''}${esc(x.name)}</option>`).join('')}</select></div>
      <div class="grid g4">${kpi('Progress', (H.tasks.length ? Math.round(done / H.tasks.length * 100) : 0) + '%', `${done} of ${H.tasks.length} tasks done`)}${kpi('Current stage', esc(stageNow ? stageNow.name : H.stages.length ? (H.stages.every(s => s.status === 'done') ? 'Complete' : 'Not started') : '–'), H.stages.length + ' stages')}${kpi('Overdue tasks', `<span style="color:${late ? 'var(--red)' : 'inherit'}">${late}</span>`, open.length + ' open')}${kpi('Next milestone', nextM ? fromKey(nextM.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '–', nextM ? esc(nextM.title) : 'none planned')}</div>
      <div class="toolbar" style="margin-top:14px"><div class="seg">${[['board', 'Board'], ['timeline', 'Timeline'], ['plan', 'Stages and milestones']].map(([k, l]) => `<button data-hv="${k}" class="${S.hubView === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${S.hubView === 'board' ? `<select id="hubWho" aria-label="Assignee"><option value="">Everyone</option><option value="me" ${S.hubWho === 'me' ? 'selected' : ''}>My tasks</option>${S.people.filter(x => x.active).map(x => `<option value="${esc(x.id)}" ${S.hubWho === x.id ? 'selected' : ''}>${esc(x.full_name || x.email)}</option>`).join('')}</select><select id="hubStage" aria-label="Stage"><option value="">All stages</option>${H.stages.map(s => `<option value="${esc(s.id)}" ${S.hubStage === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}</div>
      <div id="hubBody"></div>`);
    $('#hubPick').onchange = e => { S.hubPid = e.target.value; S.hubStage = ''; renderHub(); };
    $$('[data-hv]').forEach(b => b.onclick = () => { S.hubView = b.dataset.hv; renderHub(); });
    if ($('#hubWho')) { $('#hubWho').onchange = e => { S.hubWho = e.target.value; drawBoard(); }; $('#hubStage').onchange = e => { S.hubStage = e.target.value; drawBoard(); }; }
    if (S.hubView === 'board') drawBoard(); else if (S.hubView === 'timeline') drawTimeline(); else drawPlan();
  }
  function drawBoard(){
    const H = S.hub, who = S.hubWho === 'me' ? S.me.id : S.hubWho;
    const list = H.tasks.filter(t => (!who || t.assignee_id === who) && (!S.hubStage || t.stage_id === S.hubStage));
    $('#hubBody').innerHTML = `<div class="kb">${T_STATUS.map(([k, l]) => { const col = list.filter(t => t.status === k).sort((a, b) => a.sort - b.sort);
      return `<section class="kb-col" data-col="${k}"><header><b>${l}</b><span>${col.length}</span></header><div class="kb-list" data-drop="${k}">${col.map(t => `<article class="kb-card" draggable="true" data-task="${esc(t.id)}" tabindex="0"><span class="pri" style="--c:${T_PRI[t.priority][1]}" title="${T_PRI[t.priority][0]} priority"></span><b>${esc(t.title)}</b><div class="kb-meta">${t.stage_id ? `<span class="stg-t">${esc((H.stages.find(s => s.id === t.stage_id) || {}).name || '')}</span>` : ''}${ckProg(t)}${dueTag(t)}${t.assignee_id ? `<span class="av sm" title="${esc(nameOf(t.assignee_id))}">${esc(initials(nameOf(t.assignee_id)))}</span>` : ''}</div></article>`).join('')}</div>
        <button class="kb-add" data-add="${k}">+ Add task</button></section>`; }).join('')}</div>`;
    $$('[data-task]').forEach(c => { c.onclick = () => openTask(H.tasks.find(t => t.id === c.dataset.task)); c.onkeydown = e => { if (e.key === 'Enter') c.onclick(); };
      c.ondragstart = e => { e.dataTransfer.setData('text/plain', c.dataset.task); c.classList.add('drag'); }; c.ondragend = () => c.classList.remove('drag'); });
    $$('[data-drop]').forEach(z => { z.ondragover = e => { e.preventDefault(); z.classList.add('over'); }; z.ondragleave = () => z.classList.remove('over');
      z.ondrop = async e => { e.preventDefault(); z.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'), t = H.tasks.find(x => x.id === id); if (!t) return;
        const cards = [...z.querySelectorAll('.kb-card')].filter(c => c.dataset.task !== id), after = cards.find(c => e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
        const sorts = cards.map(c => H.tasks.find(x => x.id === c.dataset.task).sort), i = after ? cards.indexOf(after) : cards.length;
        const sort = i === 0 ? (sorts[0] ?? 0) - 1 : i >= sorts.length ? (sorts[sorts.length - 1] ?? 0) + 1 : (sorts[i - 1] + sorts[i]) / 2;
        const was = t.status; Object.assign(t, { status: z.dataset.drop, sort }); drawBoard();
        const { error } = await S.sb.from('tasks').update({ status: t.status, sort }).eq('id', id); if (error) { t.status = was; drawBoard(); return toast('Couldn’t move the task'); }
        if (t.status === 'done' && was !== 'done') toast('Task done'); }; });
    $$('[data-add]').forEach(b => b.onclick = () => openTask(null, b.dataset.add));
  }
  function drawTimeline(){
    const H = S.hub, items = [...H.stages.filter(s => s.start_date && s.end_date).map(s => ({ ...s, kind: 'stage' })), ...H.miles.map(m => ({ ...m, kind: 'mile' }))];
    if (!items.length) { $('#hubBody').innerHTML = '<div class="card"><p class="empty">Add stage dates and milestones in <b>Stages and milestones</b> to see the timeline.</p></div>'; return; }
    const dates = items.flatMap(x => x.kind === 'stage' ? [x.start_date, x.end_date] : [x.due_date]).concat(H.tasks.filter(t => t.due_date).map(t => t.due_date)).sort();
    let a = fromKey(dates[0]); a = new Date(a.getFullYear(), a.getMonth(), 1); let z = fromKey(dates[dates.length - 1]); z = new Date(z.getFullYear(), z.getMonth() + 1, 0);
    const days = Math.round((z - a) / 864e5) + 1, x = k => (Math.round((fromKey(k) - a) / 864e5) / days * 100).toFixed(2) + '%', w = (s, e) => ((Math.round((fromKey(e) - fromKey(s)) / 864e5) + 1) / days * 100).toFixed(2) + '%';
    const months = []; for (let m = new Date(a); m <= z; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m);
    const today = tToday(), showToday = today >= dkey(a) && today <= dkey(z);
    const SC = { not_started: '#94a3b8', in_progress: 'var(--red)', done: 'var(--ok)' };
    $('#hubBody').innerHTML = `<div class="card scroll"><div class="gantt" style="--days:${days}"><div class="g-head"><span></span><div class="g-months">${months.map(m => `<i style="left:${x(dkey(m))}">${m.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}</i>`).join('')}</div></div>
      ${H.stages.map(s => `<div class="g-row"><span class="g-lab">${esc(s.name)}<small>${s.status === 'done' ? 'Done' : s.status === 'in_progress' ? 'In progress' : 'Not started'}</small></span><div class="g-track">${s.start_date && s.end_date ? `<em class="g-bar" style="left:${x(s.start_date)};width:${w(s.start_date, s.end_date)};background:${SC[s.status]}" title="${esc(s.name)}: ${s.start_date} – ${s.end_date}"></em>` : ''}${H.miles.filter(m => m.stage_id === s.id).map(m => `<b class="g-mile ${m.done ? 'done' : ''}" style="left:${x(m.due_date)}" title="${esc(m.title)} · ${m.due_date}"></b>`).join('')}${showToday ? `<i class="g-today" style="left:${x(today)}"></i>` : ''}</div></div>`).join('')}
      ${H.miles.some(m => !m.stage_id) ? `<div class="g-row"><span class="g-lab">Milestones</span><div class="g-track">${H.miles.filter(m => !m.stage_id).map(m => `<b class="g-mile ${m.done ? 'done' : ''}" style="left:${x(m.due_date)}" title="${esc(m.title)} · ${m.due_date}"></b>`).join('')}${showToday ? `<i class="g-today" style="left:${x(today)}"></i>` : ''}</div></div>` : ''}
      </div><div class="legend"><span><i style="background:#94a3b8"></i>Not started</span><span><i style="background:var(--red)"></i>In progress</span><span><i style="background:var(--ok)"></i>Done</span><span>◆ Milestone</span>${showToday ? '<span><i style="background:var(--ink);width:2px"></i>Today</span>' : ''}</div></div>
      <div class="card" style="margin-top:14px"><h2>Upcoming milestones</h2>${H.miles.filter(m => !m.done).slice(0, 8).map(m => `<div class="aprow"><span class="g-dot ${m.due_date < today ? 'late' : ''}"></span><span class="ap-t"><b>${esc(m.title)}</b><small>${fromKey(m.due_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}${m.stage_id ? ' · ' + esc((H.stages.find(s => s.id === m.stage_id) || {}).name || '') : ''}${m.due_date < today ? ' · <span style="color:var(--red)">overdue</span>' : ''}</small></span></div>`).join('') || '<p class="empty">No open milestones.</p>'}</div>`;
  }
  function drawPlan(){
    const H = S.hub;
    $('#hubBody').innerHTML = `<div class="card"><div class="head" style="margin-bottom:8px"><h2 style="margin:0">Stages</h2>${H.stages.length ? '' : '<button class="btn ghost sm" id="stdSt">Add standard stages</button>'}</div>
      ${H.stages.length ? `<div class="scroll"><table class="sheet st-t"><thead><tr><th style="text-align:left">Stage</th><th>Start</th><th>End</th><th>Status</th><th></th></tr></thead><tbody>${H.stages.map((s, i) => `<tr data-st="${esc(s.id)}"><td style="text-align:left"><input data-k="name" value="${esc(s.name)}" maxlength="80"></td><td><input type="date" data-k="start_date" value="${s.start_date || ''}"></td><td><input type="date" data-k="end_date" value="${s.end_date || ''}"></td><td><select data-k="status">${[['not_started', 'Not started'], ['in_progress', 'In progress'], ['done', 'Done']].map(([k, l]) => `<option value="${k}" ${k === s.status ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><button class="icon" data-stup="${i}" aria-label="Move up">↑</button><button class="icon" data-stdel="${esc(s.id)}" aria-label="Remove stage">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="sub">Use the standard stages (Brief, Concept design, Design development, Tender and procurement, Construction, Handover) or add your own.</p>'}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap"><button class="btn ghost sm" id="stAdd">+ Add stage</button>${H.stages.length ? '<button class="btn sm" id="stSave">Save stages</button>' : ''}</div></div>
      <div class="card" style="margin-top:14px"><h2>Milestones</h2>${H.miles.map(m => `<div class="ms-row ${m.done ? 'done' : ''}"><label class="bill"><input type="checkbox" data-msdone="${esc(m.id)}" ${m.done ? 'checked' : ''}><span><b>${esc(m.title)}</b><small>${fromKey(m.due_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${m.stage_id ? ' · ' + esc((H.stages.find(s => s.id === m.stage_id) || {}).name || '') : ''}</small></span></label><button class="icon" data-msdel="${esc(m.id)}" aria-label="Remove milestone">×</button></div>`).join('') || '<p class="sub">No milestones yet.</p>'}
        <form class="f" id="msF" style="margin-top:10px"><label class="c3">Milestone<input name="title" required maxlength="160" placeholder="e.g. Client sign-off on concept"></label><label>Date<input type="date" name="due_date" required></label><label>Stage<select name="stage_id"><option value="">None</option>${H.stages.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select></label><div style="display:flex;align-items:flex-end"><button class="btn sm">Add</button></div></form></div>`;
    const reload = async msg => { await loadHub(H.pid); renderHub(); if (msg) toast(msg); };
    if ($('#stdSt')) $('#stdSt').onclick = async () => { const { error } = await S.sb.from('project_stages').insert(STD_STAGES.map((n, i) => ({ project_id: H.pid, name: n, sort: i * 10 }))); if (error) return toast('Couldn’t add stages'); reload('Standard stages added. Add their dates.'); };
    $('#stAdd').onclick = async () => { const n = prompt('Stage name:', ''); if (!n || !n.trim()) return; const { error } = await S.sb.from('project_stages').insert({ project_id: H.pid, name: n.trim().slice(0, 80), sort: (H.stages.length + 1) * 10 }); if (error) return toast('Couldn’t add the stage'); reload('Stage added'); };
    if ($('#stSave')) $('#stSave').onclick = async () => { for (const tr of $$('[data-st]')) { const v = k => tr.querySelector(`[data-k=${k}]`).value; const row = { name: v('name').trim() || 'Stage', start_date: v('start_date') || null, end_date: v('end_date') || null, status: v('status') };
        if (row.start_date && row.end_date && row.end_date < row.start_date) return toast(`“${row.name}” ends before it starts`); const { error } = await S.sb.from('project_stages').update(row).eq('id', tr.dataset.st); if (error) return toast('Couldn’t save the stages'); } reload('Stages saved'); };
    $$('[data-stup]').forEach(b => b.onclick = async () => { const i = +b.dataset.stup; if (!i) return; const a1 = H.stages[i], b1 = H.stages[i - 1]; await Promise.all([S.sb.from('project_stages').update({ sort: (i - 1) * 10 }).eq('id', a1.id), S.sb.from('project_stages').update({ sort: i * 10 }).eq('id', b1.id)]); reload(); });
    $$('[data-stdel]').forEach(b => b.onclick = async () => { if (!confirm('Remove this stage? Its tasks and milestones stay, without a stage.')) return; await S.sb.from('project_stages').delete().eq('id', b.dataset.stdel); reload('Stage removed'); });
    $$('[data-msdone]').forEach(c => c.onchange = async () => { await S.sb.from('milestones').update({ done: c.checked }).eq('id', c.dataset.msdone); reload(c.checked ? 'Milestone reached' : null); });
    $$('[data-msdel]').forEach(b => b.onclick = async () => { if (!confirm('Remove this milestone?')) return; await S.sb.from('milestones').delete().eq('id', b.dataset.msdel); reload('Milestone removed'); });
    $('#msF').onsubmit = async e => { e.preventDefault(); const f = new FormData(e.target); const { error } = await S.sb.from('milestones').insert({ project_id: H.pid, title: String(f.get('title')).trim(), due_date: f.get('due_date'), stage_id: f.get('stage_id') || null }); if (error) return toast('Couldn’t add the milestone'); reload('Milestone added'); };
  }
  async function openTask(t, status = 'todo'){
    const edit = can('pm'), H = S.hub && t && S.hub.pid === t.project_id ? S.hub : (S.hub && !t ? S.hub : null);
    const x = t || { title: '', description: '', status, priority: 'normal', assignee_id: null, due_date: '', stage_id: S.hubStage || null, checklist: [], project_id: S.hubPid };
    let stages = H ? H.stages : []; if (!H && t) stages = (await S.sb.from('project_stages').select('*').eq('project_id', t.project_id).order('sort')).data || [];
    const comments = t ? ((await S.sb.from('task_comments').select('*').eq('task_id', t.id).order('created_at')).data || []) : [];
    let ck = (x.checklist || []).map(c => ({ ...c })); const dis = edit ? '' : 'disabled';
    const people = S.people.length ? S.people.filter(p => p.active) : [S.me];
    $('#editForm').innerHTML = `<div class="c6 job-h"><h2 style="margin:0">${t ? 'Task' : 'New task'}</h2><span class="sub">${esc(proj(x.project_id).job_code ? proj(x.project_id).job_code + ' · ' : '')}${esc(proj(x.project_id).name)}</span></div>
      <label class="c6">Task<input name="title" required maxlength="200" value="${esc(x.title)}" ${dis} placeholder="e.g. Issue FF&E schedule for client review"></label>
      <label class="c6">Details<textarea name="description" rows="3" ${dis}>${esc(x.description)}</textarea></label>
      <label class="c2">Status<select name="status">${T_STATUS.map(([k, l]) => `<option value="${k}" ${k === x.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="c2">Priority<select name="priority" ${dis}>${Object.entries(T_PRI).map(([k, v]) => `<option value="${k}" ${k === x.priority ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></label>
      <label class="c2">Due<input type="date" name="due_date" value="${x.due_date || ''}" ${dis}></label>
      <label class="c3">Assigned to<select name="assignee_id" ${dis}><option value="">Nobody</option>${people.map(p => `<option value="${esc(p.id)}" ${p.id === x.assignee_id ? 'selected' : ''}>${esc(p.full_name || p.email)}</option>`).join('')}</select></label>
      <label class="c3">Stage<select name="stage_id" ${dis}><option value="">None</option>${stages.map(s => `<option value="${esc(s.id)}" ${s.id === x.stage_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <div class="c6"><span class="imgf-l">Checklist</span><div id="ckList"></div><div class="ck-add"><input id="ckNew" maxlength="200" placeholder="Add an item and press Enter"><button type="button" class="btn ghost sm" id="ckAdd">Add</button></div></div>
      ${t ? `<div class="c6 job-log"><h3>Comments</h3><div class="job-note"><input id="tcNew" maxlength="2000" placeholder="Write a comment"><button type="button" class="btn ghost sm" id="tcAdd">Post</button></div>${comments.map(c => `<div class="jl"><span class="av sm">${esc(initials(nameOf(c.user_id)))}</span><span><b>${esc(nameOf(c.user_id))}</b><span class="jl-n">${esc(c.body)}</span><small>${new Date(c.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span></div>`).join('') || '<p class="sub">No comments yet.</p>'}</div>` : ''}
      <div class="c6 dlg-actions">${t && edit ? '<button class="btn ghost" value="delete" formnovalidate>Delete</button>' : ''}<button class="btn ghost" value="cancel" formnovalidate>Close</button><button class="btn red" value="save">${t ? 'Save' : 'Add task'}</button></div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    const drawCk = () => { $('#ckList').innerHTML = ck.map((c, i) => `<label class="ck-row"><input type="checkbox" data-ck="${i}" ${c.done ? 'checked' : ''}><span class="${c.done ? 'dn' : ''}">${esc(c.t)}</span>${edit ? `<button type="button" class="icon" data-ckdel="${i}" aria-label="Remove item">×</button>` : ''}</label>`).join('') || '<p class="sub" style="font-size:13px">No checklist items.</p>';
      $$('[data-ck]').forEach(c => c.onchange = () => { ck[+c.dataset.ck].done = c.checked; drawCk(); }); $$('[data-ckdel]').forEach(b => b.onclick = () => { ck.splice(+b.dataset.ckdel, 1); drawCk(); }); };
    drawCk();
    const addCk = () => { const v = $('#ckNew').value.trim(); if (!v) return; ck.push({ t: v.slice(0, 200), done: false }); $('#ckNew').value = ''; drawCk(); $('#ckNew').focus(); };
    $('#ckAdd').onclick = addCk; $('#ckNew').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addCk(); } };
    if (!edit) { $('#ckNew').disabled = true; $('#ckAdd').disabled = true; }
    if ($('#tcAdd')) { const post = async () => { const v = $('#tcNew').value.trim(); if (!v) return; const { error } = await S.sb.from('task_comments').insert({ task_id: t.id, user_id: S.me.id, body: v }); if (error) return toast('Couldn’t post the comment'); dlg.close(); openTask(t); }; $('#tcAdd').onclick = post; $('#tcNew').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); post(); } }; }
    f.onsubmit = async ev => {
      const v = ev.submitter?.value; if (v === 'cancel') return; ev.preventDefault();
      const refresh = async () => { if (S.hub && S.hub.pid === x.project_id) await loadHub(x.project_id); await loadMyTasks(); dlg.close(); renderTop(); render(true); };
      if (v === 'delete') { if (!confirm('Delete this task?')) return; await S.sb.from('tasks').delete().eq('id', t.id); toast('Task deleted'); return refresh(); }
      const d = new FormData(f);
      const row = edit ? { title: String(d.get('title')).trim(), description: String(d.get('description') || '').trim(), status: d.get('status'), priority: d.get('priority'), due_date: d.get('due_date') || null, assignee_id: d.get('assignee_id') || null, stage_id: d.get('stage_id') || null, checklist: ck } : { status: d.get('status'), checklist: ck };
      let res; if (t) res = await S.sb.from('tasks').update(row).eq('id', t.id).select().single();
      else { const col = (S.hub?.tasks || []).filter(y => y.status === row.status); res = await S.sb.from('tasks').insert({ ...row, project_id: x.project_id, sort: col.length ? Math.max(...col.map(y => y.sort)) + 1 : 0 }).select().single(); }
      if (res.error) return toast('Couldn’t save the task');
      if (edit && row.assignee_id && row.assignee_id !== (t && t.assignee_id) && row.assignee_id !== S.me.id) S.sb.functions.invoke('notify', { body: { job: 'event', kind: 'task_assigned', task_id: res.data.id, user_id: row.assignee_id } }).catch(() => {});
      toast(t ? 'Task saved' : 'Task added'); refresh();
    };
  }
  async function renderMyTasks(){
    await loadMyTasks();
    const L = S.myTasks.filter(t => S.mtDone || t.status !== 'done'), today = tToday(), wk = dkey(addDays(new Date(), 7));
    const groups = [['Overdue', t => t.status !== 'done' && t.due_date && t.due_date < today], ['Today', t => t.due_date === today], ['Next 7 days', t => t.due_date > today && t.due_date <= wk], ['Later', t => t.due_date > wk], ['No due date', t => !t.due_date]];
    const used = new Set();
    const html = groups.map(([g, fn]) => { const rows = L.filter(t => !used.has(t.id) && fn(t)); rows.forEach(t => used.add(t.id)); return rows.length ? `<div class="card" style="margin-top:14px"><h2>${g} <span class="sub" style="font-size:13px">${rows.length}</span></h2>${rows.map(t => `<div class="mt-row ${t.status === 'done' ? 'done' : ''}"><span class="pri" style="--c:${T_PRI[t.priority][1]}"></span><button class="mt-t" data-mt="${esc(t.id)}"><b>${esc(t.title)}</b><small>${esc(proj(t.project_id).job_code ? proj(t.project_id).job_code + ' · ' : '')}${esc(proj(t.project_id).name)}${(t.checklist || []).length ? ' · ' + ckProg(t).replace(/<[^>]+>/g, '') : ''}</small></button>${dueTag(t)}<select data-mts="${esc(t.id)}" aria-label="Status">${T_STATUS.map(([k, l]) => `<option value="${k}" ${k === t.status ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>` : ''; }).join('');
    main(`<div class="head"><div><h1>My tasks</h1><p class="sub">Everything assigned to you, across all projects.</p></div><label class="bill"><input type="checkbox" id="mtDone" ${S.mtDone ? 'checked' : ''}>Show done</label></div>
      ${html || '<div class="card"><p class="empty">Nothing assigned to you right now.</p></div>'}`);
    $('#mtDone').onchange = e => { S.mtDone = e.target.checked; renderMyTasks(); };
    $$('[data-mt]').forEach(b => b.onclick = () => openTask(S.myTasks.find(t => t.id === b.dataset.mt)));
    $$('[data-mts]').forEach(s => s.onchange = async () => { const { error } = await S.sb.from('tasks').update({ status: s.value }).eq('id', s.dataset.mts); if (error) return toast('Couldn’t update the task'); toast(s.value === 'done' ? 'Task done' : 'Task updated'); renderTop(); renderMyTasks(); });
  }

  /* ---------- website site settings ---------- */
  const SEO_PAGES = [['home', 'Home', 'James Cubitt Interiors — Commercial interior architects', 'Commercial interior architects in Lagos, Nigeria, improving wellbeing through interior design for workplaces, hospitality, retail and homes across West Africa.'],
    ['about', 'About', 'About — James Cubitt Interiors', 'About James Cubitt Interiors: commercial interior architects in Lagos, part of the James Cubitt group with over 60 years of West African design experience.'],
    ['services', 'Services', 'Services — James Cubitt Interiors', 'Interior design, workplace strategy, FF&E sourcing and procurement, wellness assessment, 3D visualisation and lighting design for commercial spaces in Nigeria.'],
    ['work', 'Projects', 'Projects — James Cubitt Interiors', 'Portfolio of office, headquarters, banking, retail and hospitality interiors by James Cubitt Interiors across Nigeria, Ghana and Côte d’Ivoire.'],
    ['insights', 'Research & Insights', 'Research & Insights — James Cubitt Interiors', 'Insights on workplace design, well-being and interior architecture from the James Cubitt Interiors team.'],
    ['careers', 'Careers', 'Careers — James Cubitt Interiors', 'Join James Cubitt Interiors: a team of designers, architects and strategists creating timeless design that improves people’s lives.'],
    ['contact', 'Contact', 'Contact — James Cubitt Interiors', 'Contact James Cubitt Interiors, 8th Floor, Leadway Marble House, Lagos. Email info@jamescubittinteriors.com or call +234 704 577 1218.'],
    ['start', 'Start a project', 'Start a project — James Cubitt Interiors', 'Start a project with James Cubitt Interiors: answer a few quick questions about your space and our team will be in touch within two working days.'],
    ['partner', 'Partner with us', 'Partner with us — James Cubitt Interiors', 'Partner with James Cubitt Interiors: register as a furniture, lighting, finishes or fit-out supplier for commercial interior projects in Nigeria and West Africa.'],
    ['recognition', 'Press', 'Press — James Cubitt Interiors', 'Press coverage of James Cubitt Interiors in BusinessDay, THISDAY and The Guardian Nigeria.'],
    ['privacy', 'Privacy and cookies', 'Privacy and cookies — James Cubitt Interiors', 'Privacy and cookies at James Cubitt Interiors: what personal data we collect, why, who we share it with, how long we keep it and your rights under the Nigeria Data Protection Act.']];
  const SOCIALS = [['facebook', 'Facebook'], ['x', 'X (Twitter)'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['instagram', 'Instagram']];
  async function loadSite(){ const { data } = await S.sb.from('cms_site').select('*').eq('id', 1).maybeSingle(); S.cmsSite = data || { email: '', phone: '', address: '', social: {}, seo: {}, announcement: { enabled: false } }; }
  function renderSiteSettings(box){
    const c = S.cmsSite || {}, so = c.social || {}, seo = c.seo || {}, an = c.announcement || {};
    const cnt = (v, max) => `<small class="cnt ${v.length > max ? 'over' : ''}">${v.length}/${max}</small>`;
    box.innerHTML = `<form class="card f" id="siteF">
      <h2 class="c6">Contact details</h2>
      <label class="c3">Email<input type="email" name="email" required maxlength="200" value="${esc(c.email || '')}"></label>
      <label class="c3">Phone<input name="phone" required maxlength="40" value="${esc(c.phone || '')}"></label>
      <label class="c6">Address<input name="address" required maxlength="300" value="${esc(c.address || '')}"></label>
      <p class="c6 sub" style="font-size:12px;margin-top:-4px">Updates the footer, Contact page and every other place these appear on the website.</p>
      <h2 class="c6" style="margin-top:10px">Social links</h2>
      ${SOCIALS.map(([k, l]) => `<label class="c3">${l}<input type="url" name="so_${k}" maxlength="300" value="${esc(so[k] || '')}" placeholder="https://"></label>`).join('')}
      <h2 class="c6" style="margin-top:10px">Announcement bar</h2>
      <label class="bill c6"><input type="checkbox" name="an_on" ${an.enabled ? 'checked' : ''}>Show a message bar at the top of every page</label>
      <label class="c6">Message<input name="an_text" maxlength="160" value="${esc(an.text || '')}" placeholder="e.g. We’re hiring: Key Account Manager"></label>
      <label class="c3">Link (optional)<input name="an_link" maxlength="300" value="${esc(an.link || '')}" placeholder="#/careers or https://…"></label>
      <label class="c3">Link text<input name="an_label" maxlength="40" value="${esc(an.label || '')}" placeholder="See the role →"></label>
      <label class="c2">Colour<select name="an_style"><option value="red" ${an.style !== 'dark' ? 'selected' : ''}>JCI red</option><option value="dark" ${an.style === 'dark' ? 'selected' : ''}>Dark</option></select></label>
      <label class="c2">Show from (optional)<input type="date" name="an_from" value="${an.from || ''}"></label>
      <label class="c2">Until (optional)<input type="date" name="an_until" value="${an.until || ''}"></label>
      <div class="c6 ann-prev ${an.style === 'dark' ? 'dark' : ''}" id="annPrev">${esc(an.text || 'Your message appears here')}${an.label ? ` <u>${esc(an.label)}</u>` : ''}<span>×</span></div>
      <h2 class="c6" style="margin-top:10px">Search titles and descriptions</h2>
      <p class="c6 sub" style="font-size:12.5px;margin-top:-6px">What Google and link previews show for each main page. Leave a field empty to keep the current wording (shown in grey). Aim for titles under 60 characters and descriptions under 160. Project, article and role pages use their own content.</p>
      <div class="c6 seo-list">${SEO_PAGES.map(([k, l, dt, dd]) => { const v = seo[k] || {}; return `<details class="seo-item" ${v.title || v.description ? 'open' : ''}><summary><b>${l}</b>${v.title || v.description ? '<span class="pub on">Custom</span>' : '<span class="pub">Default</span>'}</summary>
        <label>Title<input name="seo_${k}_t" maxlength="90" value="${esc(v.title || '')}" placeholder="${esc(dt)}" data-cnt="60"></label>
        <label>Description<textarea name="seo_${k}_d" rows="2" maxlength="300" placeholder="${esc(dd)}" data-cnt="160">${esc(v.description || '')}</textarea></label>
        <div class="serp"><span class="serp-u">jamescubittinteriors.com${k === 'home' ? '' : ' › ' + esc(l.toLowerCase())}</span><span class="serp-t">${esc(v.title || dt)}</span><span class="serp-d">${esc(v.description || dd)}</span></div></details>`; }).join('')}</div>
      <div class="c6 dlg-actions" style="position:static;border:0"><span class="sub" style="margin-right:auto;font-size:12.5px">${c.updated_at ? 'Last saved ' + new Date(c.updated_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + (c.updated_by ? ' by ' + esc(nameOf(c.updated_by)) : '') : ''}</span><button class="btn red">Save site settings</button></div></form>`;
    const f = $('#siteF');
    $$('[data-cnt]', f).forEach(i => { const sm = document.createElement('small'); sm.className = 'cnt'; i.after(sm); const up = () => { const n = (i.value || i.placeholder).length, mx = +i.dataset.cnt; sm.textContent = `${n}/${mx}`; sm.classList.toggle('over', n > mx); const it = i.closest('.seo-item'); if (it) { it.querySelector('.serp-t').textContent = it.querySelector('input').value || it.querySelector('input').placeholder; it.querySelector('.serp-d').textContent = it.querySelector('textarea').value || it.querySelector('textarea').placeholder; } }; i.addEventListener('input', up); up(); });
    const prev = () => { const p = $('#annPrev'); p.classList.toggle('dark', f.an_style.value === 'dark'); p.innerHTML = `${esc(f.an_text.value || 'Your message appears here')}${f.an_label.value ? ` <u>${esc(f.an_label.value)}</u>` : ''}<span>×</span>`; p.style.opacity = f.an_on.checked ? 1 : .45; };
    ['an_text', 'an_label', 'an_style', 'an_on'].forEach(n => f[n].addEventListener('input', prev)); f.an_on.addEventListener('change', prev); prev();
    f.onsubmit = async e => {
      e.preventDefault(); const d = new FormData(f), g = k => String(d.get(k) ?? '').trim();
      const link = g('an_link'); if (link && !/^(https?:\/\/|#\/|mailto:)/.test(link)) return toast('The announcement link should start with https://, #/ or mailto:');
      if (d.get('an_on') === 'on' && !g('an_text')) return toast('Write a message for the announcement bar');
      const bad = SOCIALS.find(([k]) => g('so_' + k) && !/^https:\/\//.test(g('so_' + k))); if (bad) return toast(`The ${bad[1]} link should start with https://`);
      const seo = {}; SEO_PAGES.forEach(([k]) => { const t = g(`seo_${k}_t`), ds = g(`seo_${k}_d`); if (t || ds) seo[k] = { title: t, description: ds }; });
      const row = { email: g('email'), phone: g('phone'), address: g('address'), social: Object.fromEntries(SOCIALS.map(([k]) => [k, g('so_' + k)]).filter(([, v]) => v)), seo,
        announcement: { enabled: d.get('an_on') === 'on', text: g('an_text'), link, label: g('an_label'), style: g('an_style'), from: g('an_from') || null, until: g('an_until') || null } };
      const { error } = await S.sb.from('cms_site').update(row).eq('id', 1); if (error) return toast('Couldn’t save the site settings');
      await loadSite(); toast('Saved: live on the website now'); renderSiteSettings(box);
    };
  }

  /* ---------- payables: suppliers and bills ---------- */
  const BILL_ST = { awaiting_approval: ['Awaiting approval', '#a16207'], approved: ['To pay', '#0369a1'], part_paid: ['Part paid', '#b45309'], paid: ['Paid', '#15803d'], void: ['Void', '#64748b'] };
  const BILL_CATS = ['Materials and finishes', 'Furniture and FF&E', 'Lighting', 'Subcontractor', 'Consultant', 'Transport and logistics', 'Printing and samples', 'Rent and utilities', 'Software and subscriptions', 'Office and admin', 'Other'];
  const billOverdue = b => ['approved', 'part_paid'].includes(b.status) && b.due_date < dkey(new Date());
  const billSt = b => billOverdue(b) ? `<span class="pst" style="--c:#E3232B">Overdue</span>` : `<span class="pst" style="--c:${(BILL_ST[b.status] || BILL_ST.awaiting_approval)[1]}">${(BILL_ST[b.status] || BILL_ST.awaiting_approval)[0]}</span>`;
  const bCur = b => b.currency || baseCur();
  const supName = id => ((S.suppliers || []).find(x => x.id === id) || {}).name || 'Unknown supplier';
  async function loadPayables(){ const [a, b] = await Promise.all([S.sb.from('suppliers').select('*').order('name'), S.sb.from('bills').select('*').order('due_date')]); S.suppliers = a.data || []; S.bills = b.data || []; }
  async function renderPayables(){
    await loadPayables();
    const B = S.bills, today = dkey(new Date()), mon = today.slice(0, 7), f = S.payTab || 'pay';
    const toPay = B.filter(b => ['approved', 'part_paid'].includes(b.status)), due7 = dkey(addDays(new Date(), 7));
    const sumB = L => money(L.reduce((a, b) => a + toBase(b.balance, bCur(b)), 0));
    const tabs = [['approval', 'Awaiting approval', B.filter(b => b.status === 'awaiting_approval')], ['pay', 'To pay', toPay], ['overdue', 'Overdue', B.filter(billOverdue)], ['paid', 'Paid', B.filter(b => b.status === 'paid')], ['all', 'All bills', B.filter(b => b.status !== 'void')], ['suppliers', 'Suppliers', S.suppliers]];
    const cur = tabs.find(t => t[0] === f) || tabs[1];
    main(`<div class="head"><div><h1>Payables</h1><p class="sub">Supplier bills to approve and pay, linked to projects so they count as project costs.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" id="supNew">New supplier</button><button class="btn red" id="billNew">New bill</button></div></div>
      <div class="grid g4">${kpi('To pay', sumB(toPay), toPay.length + ' approved bills')}${kpi('Overdue', `<span style="color:${B.some(billOverdue) ? 'var(--red)' : 'inherit'}">${sumB(B.filter(billOverdue))}</span>`, B.filter(billOverdue).length + ' bills')}${kpi('Due in 7 days', sumB(toPay.filter(b => b.due_date >= today && b.due_date <= due7)), toPay.filter(b => b.due_date >= today && b.due_date <= due7).length + ' bills')}${kpi('Awaiting approval', B.filter(b => b.status === 'awaiting_approval').length, sumB(B.filter(b => b.status === 'awaiting_approval')))}</div>
      <div class="toolbar" style="margin-top:14px"><div class="seg">${tabs.map(([k, l, L]) => `<button data-pt="${k}" class="${cur[0] === k ? 'on' : ''}">${l} <em class="soft">${L.length}</em></button>`).join('')}</div>${cur[0] !== 'suppliers' ? '<button class="btn ghost sm" id="billCsv">Download CSV</button>' : ''}</div>
      <div class="card" style="margin-top:10px">${cur[0] === 'suppliers'
        ? (S.suppliers.length ? `<div class="scroll"><table class="sheet"><thead><tr><th style="text-align:left">Supplier</th><th style="text-align:left">Category</th><th style="text-align:left">Contact</th><th>Bills</th><th>Owed</th><th></th></tr></thead><tbody>${S.suppliers.map(x => { const mine = B.filter(b => b.supplier_id === x.id && b.status !== 'void'), owed = mine.filter(b => ['approved', 'part_paid', 'awaiting_approval'].includes(b.status)); return `<tr class="${x.active ? '' : 'off'}"><td style="text-align:left"><b style="font-weight:500">${esc(x.name)}</b>${x.active ? '' : ' <span class="tag">Inactive</span>'}</td><td style="text-align:left">${esc(x.category)}</td><td style="text-align:left">${esc(x.contact_name)}${x.email ? `<small class="sub" style="display:block">${esc(x.email)}</small>` : ''}</td><td>${mine.length}</td><td>${owed.length ? sumB(owed) : '–'}</td><td><button class="btn ghost sm" data-sup="${esc(x.id)}">Edit</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="empty">No suppliers yet. Add your first one with “New supplier”.</p>')
        : (cur[2].length ? `<div class="scroll"><table class="sheet"><thead><tr><th style="text-align:left">Supplier</th><th style="text-align:left">Their ref</th><th style="text-align:left">Project</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead><tbody>${cur[2].map(b => `<tr class="click" data-bill="${esc(b.id)}" tabindex="0"><td style="text-align:left"><b style="font-weight:500">${esc(supName(b.supplier_id))}</b><small class="sub" style="display:block">${esc(b.category)}${b.description ? ' · ' + esc(b.description.slice(0, 60)) : ''}</small></td><td style="text-align:left">${esc(b.reference || '–')}</td><td style="text-align:left">${b.project_id ? `${proj(b.project_id).job_code ? esc(proj(b.project_id).job_code) + ' · ' : ''}${esc(proj(b.project_id).name)}` : '<span class="sub">Overheads</span>'}</td><td style="color:${billOverdue(b) ? 'var(--red)' : 'inherit'}">${fmtD(b.due_date)}</td><td>${moneyIn(b.total, bCur(b))}</td><td><b>${b.status === 'void' ? '–' : moneyIn(b.balance, bCur(b))}</b></td><td>${billSt(b)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Nothing here.</p>')}</div>`);
    $$('[data-pt]').forEach(b => b.onclick = () => { S.payTab = b.dataset.pt; renderPayables(); });
    $('#supNew').onclick = () => editSupplier(null);
    $('#billNew').onclick = () => { if (!S.suppliers.filter(x => x.active).length) { toast('Add a supplier first'); return editSupplier(null, true); } editBill(null); };
    $$('[data-sup]').forEach(b => b.onclick = () => editSupplier(S.suppliers.find(x => x.id === b.dataset.sup)));
    $$('[data-bill]').forEach(r => { r.onclick = () => viewBill(r.dataset.bill); r.onkeydown = e => { if (e.key === 'Enter') r.onclick(); }; });
    if ($('#billCsv')) $('#billCsv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; const csv = ['Supplier,Their reference,Category,Description,Project,Job ID,Issued,Due,Currency,Amount before VAT,VAT,WHT,Total,Paid,Balance,Status,Approved by', ...cur[2].map(b => [supName(b.supplier_id), b.reference, b.category, b.description, b.project_id ? proj(b.project_id).name : 'Overheads', b.project_id ? proj(b.project_id).job_code || '' : '', b.issue_date, b.due_date, bCur(b), b.subtotal, b.tax, b.wht, b.total, b.amount_paid, b.balance, billOverdue(b) ? 'Overdue' : BILL_ST[b.status][0], b.approved_by ? nameOf(b.approved_by) : ''].map(q).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-payables-${cur[0]}-${today}.csv`; a.click(); };
  }
  function editSupplier(x, thenBill){
    const v = x || { name: '', category: '', contact_name: '', email: '', phone: '', address: '', tax_id: '', bank_details: '', currency: '', payment_terms: 30, notes: '', active: true };
    $('#editForm').innerHTML = `<div class="c6"><h2>${x ? 'Edit supplier' : 'New supplier'}</h2></div>
      <label class="c3">Supplier name<input name="name" required maxlength="160" value="${esc(v.name)}"></label>
      <label class="c3">Category<input name="category" maxlength="80" value="${esc(v.category)}" list="supCats" placeholder="e.g. Furniture"><datalist id="supCats">${BILL_CATS.map(c => `<option>${c}</option>`).join('')}</datalist></label>
      <label class="c2">Contact person<input name="contact_name" maxlength="120" value="${esc(v.contact_name)}"></label>
      <label class="c2">Email<input type="email" name="email" maxlength="200" value="${esc(v.email)}"></label>
      <label class="c2">Phone<input name="phone" maxlength="40" value="${esc(v.phone)}"></label>
      <label class="c4">Address<input name="address" maxlength="300" value="${esc(v.address)}"></label>
      <label class="c2">TIN / tax ID<input name="tax_id" maxlength="40" value="${esc(v.tax_id)}"></label>
      <label class="c6">Bank details for payment<textarea name="bank_details" rows="3" maxlength="1000" placeholder="Bank, account name, account number">${esc(v.bank_details)}</textarea></label>
      <label class="c2">Usual currency<select name="currency">${curOpts(v.currency || baseCur())}</select></label>
      <label class="c2">Payment terms (days)<input type="number" name="payment_terms" min="0" max="365" value="${v.payment_terms}"></label>
      <label class="bill c2" style="align-self:end"><input type="checkbox" name="active" ${v.active ? 'checked' : ''}>Active supplier</label>
      <label class="c6">Notes<textarea name="notes" rows="2" maxlength="1000">${esc(v.notes)}</textarea></label>
      <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">${x ? 'Save' : 'Add supplier'}</button></div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    f.onsubmit = async e => { if (e.submitter?.value !== 'save') return; e.preventDefault(); const d = new FormData(f), g = k => String(d.get(k) ?? '').trim();
      const row = { name: g('name'), category: g('category'), contact_name: g('contact_name'), email: g('email'), phone: g('phone'), address: g('address'), tax_id: g('tax_id'), bank_details: g('bank_details'), currency: g('currency') === baseCur() ? '' : g('currency'), payment_terms: Number(g('payment_terms') || 30), notes: g('notes'), active: d.get('active') === 'on' };
      const { data, error } = x ? await S.sb.from('suppliers').update(row).eq('id', x.id).select().single() : await S.sb.from('suppliers').insert(row).select().single();
      if (error) return toast('Couldn’t save the supplier'); dlg.close(); toast(x ? 'Supplier saved' : 'Supplier added'); await loadPayables(); if (thenBill && data) return editBill(null, data.id); renderPayables(); };
  }
  function editBill(b, supId){
    const sup0 = (S.suppliers || []).find(x => x.id === (b ? b.supplier_id : supId)), terms = sup0 ? sup0.payment_terms : 30;
    const v = b || { supplier_id: supId || '', project_id: '', reference: '', description: '', category: BILL_CATS[0], issue_date: dkey(new Date()), due_date: dkey(addDays(new Date(), terms)), currency: sup0?.currency || '', subtotal: '', tax_rate: 7.5, wht_rate: 0 };
    $('#editForm').innerHTML = `<div class="c6"><h2>${b ? 'Edit bill' : 'New supplier bill'}</h2><p class="sub">${b ? '' : 'Enter the bill as received. It waits for approval before it can be paid.'}</p></div>
      <label class="c3">Supplier<select name="supplier_id" required><option value="">Select supplier</option>${S.suppliers.filter(x => x.active || x.id === v.supplier_id).map(x => `<option value="${esc(x.id)}" ${x.id === v.supplier_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="c3">Their invoice number<input name="reference" maxlength="80" value="${esc(v.reference)}"></label>
      <label class="c3">Project<select name="project_id"><option value="">Overheads (no project)</option>${S.projects.filter(p => !p.archived || p.id === v.project_id).map(p => `<option value="${esc(p.id)}" ${p.id === v.project_id ? 'selected' : ''}>${p.job_code ? esc(p.job_code) + ' · ' : p.status === 'pipeline' ? 'Proposal · ' : ''}${esc(p.name)}</option>`).join('')}</select></label>
      <label class="c3">Category<select name="category">${BILL_CATS.map(c => `<option ${c === v.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label class="c6">Description<textarea name="description" rows="2" maxlength="2000" placeholder="What the bill is for">${esc(v.description)}</textarea></label>
      <label class="c2">Bill date<input type="date" name="issue_date" required value="${v.issue_date}"></label>
      <label class="c2">Due date<input type="date" name="due_date" required value="${v.due_date}"></label>
      <label class="c2">Currency<select name="currency">${curOpts(v.currency || baseCur())}</select></label>
      <label class="c2">Amount before VAT<input type="number" name="subtotal" min="0" step="0.01" required value="${v.subtotal}" inputmode="decimal"></label>
      <label class="c2">VAT %<input type="number" name="tax_rate" min="0" max="100" step="0.5" value="${v.tax_rate}"></label>
      <label class="c2">Withholding tax %<input type="number" name="wht_rate" min="0" max="100" step="0.5" value="${v.wht_rate}" title="WHT deducted when paying the supplier, e.g. 5% or 10%"></label>
      <p class="c6 sub" id="billCalc" style="font-size:13px"></p>
      <label class="c6">Copy of the bill (PDF or photo, optional)<input type="file" name="file" accept="application/pdf,image/*"></label>
      <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">${b ? 'Save' : 'Add bill'}</button></div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); dlg.classList.add('wide'); dlg.showModal(); dlg.addEventListener('close', () => dlg.classList.remove('wide'), { once: true });
    const calc = () => { const sub = Number(f.subtotal.value || 0), t = sub * Number(f.tax_rate.value || 0) / 100, w = sub * Number(f.wht_rate.value || 0) / 100, c = f.currency.value; $('#billCalc').innerHTML = sub ? `VAT ${moneyIn(t, c)}${w ? ` · WHT −${moneyIn(w, c)}` : ''} · <b>Payable ${moneyIn(sub + t - w, c)}</b>` : ''; };
    ['subtotal', 'tax_rate', 'wht_rate', 'currency'].forEach(n => f[n].addEventListener('input', calc)); calc();
    f.supplier_id.onchange = () => { const sp = S.suppliers.find(x => x.id === f.supplier_id.value); if (!sp || b) return; f.due_date.value = dkey(addDays(fromKey(f.issue_date.value), sp.payment_terms)); if (sp.currency) f.currency.value = sp.currency; calc(); };
    f.issue_date.onchange = () => { const sp = S.suppliers.find(x => x.id === f.supplier_id.value); if (sp && !b) f.due_date.value = dkey(addDays(fromKey(f.issue_date.value), sp.payment_terms)); };
    f.onsubmit = async e => { if (e.submitter?.value !== 'save') return; e.preventDefault(); const d = new FormData(f), g = k => String(d.get(k) ?? '').trim();
      if (g('due_date') < g('issue_date')) return toast('The due date is before the bill date');
      const btn = e.submitter; btn.disabled = true; let file_path = b ? b.file_path : null; const file = d.get('file');
      if (file && file.size) { if (file.size > 10 * 1048576) { btn.disabled = false; return toast('That file is over 10 MB'); } file_path = `${new Date().getFullYear()}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-60)}`; const up = await S.sb.storage.from('bills').upload(file_path, file, { contentType: file.type || undefined }); if (up.error) { btn.disabled = false; return toast('The file couldn’t be uploaded'); } }
      const row = { supplier_id: g('supplier_id'), reference: g('reference'), project_id: g('project_id') || null, category: g('category'), description: g('description'), issue_date: g('issue_date'), due_date: g('due_date'), currency: g('currency') === baseCur() ? '' : g('currency'), subtotal: Number(g('subtotal')), tax_rate: Number(g('tax_rate') || 0), wht_rate: Number(g('wht_rate') || 0), file_path };
      const { data, error } = b ? await S.sb.from('bills').update(row).eq('id', b.id).select().single() : await S.sb.from('bills').insert(row).select().single();
      btn.disabled = false; if (error) return toast('Couldn’t save the bill'); dlg.close(); toast(b ? 'Bill saved' : 'Bill added. It’s waiting for approval.'); await loadPayables(); viewBill(data.id); };
  }
  async function viewBill(id){
    const b = S.bills.find(x => x.id === id); if (!b) return renderPayables();
    const { data: pays } = await S.sb.from('bill_payments').select('*').eq('bill_id', id).order('paid_on'); const m = n => moneyIn(n, bCur(b)), sp = S.suppliers.find(x => x.id === b.supplier_id) || {};
    const open = ['approved', 'part_paid'].includes(b.status);
    $('#editForm').innerHTML = `<div class="c6 job-h"><h2 style="margin:0">${esc(sp.name || 'Bill')}${b.reference ? ` · ${esc(b.reference)}` : ''}</h2>${billSt(b)}</div>
      <div class="c6 bill-grid"><div><small>PROJECT</small>${b.project_id ? `${proj(b.project_id).job_code ? esc(proj(b.project_id).job_code) + ' · ' : ''}${esc(proj(b.project_id).name)}` : 'Overheads'}</div><div><small>CATEGORY</small>${esc(b.category)}</div><div><small>BILL DATE</small>${fmtD(b.issue_date)}</div><div><small>DUE</small><span style="color:${billOverdue(b) ? 'var(--red)' : 'inherit'}">${fmtD(b.due_date)}</span></div></div>
      ${b.description ? `<p class="c6 pre" style="margin:0">${esc(b.description)}</p>` : ''}
      <div class="c6 inv-sum" style="margin:0;max-width:none"><div><span>Amount before VAT</span><b>${m(b.subtotal)}</b></div><div><span>VAT ${Number(b.tax_rate)}%</span><b>${m(b.tax)}</b></div>${Number(b.wht) ? `<div><span>Withholding tax ${Number(b.wht_rate)}%</span><b>−${m(b.wht)}</b></div>` : ''}<div class="inv-total"><span>Payable</span><b>${m(b.total)}</b></div>${Number(b.amount_paid) ? `<div><span>Paid</span><b>−${m(b.amount_paid)}</b></div><div class="inv-total bal"><span>Balance</span><b>${m(Math.max(0, b.balance))}</b></div>` : ''}</div>
      ${sp.bank_details ? `<div class="c6 inv-bank" style="margin:0"><small>PAY TO</small><p>${esc(sp.bank_details)}</p></div>` : ''}
      <p class="c6 sub" style="font-size:12.5px;margin:0">Entered by ${esc(nameOf(b.created_by))} on ${new Date(b.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${b.approved_at ? ` · approved by ${esc(nameOf(b.approved_by))} on ${new Date(b.approved_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</p>
      ${(pays || []).length ? `<div class="c6"><h3 style="font-size:15px;margin-bottom:6px">Payments</h3>${pays.map(p => `<div class="aprow"><span class="ap-t"><b>${m(p.amount)}</b><small>${fmtD(p.paid_on)} · ${esc(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''}${p.note ? ' · ' + esc(p.note) : ''}</small></span><button type="button" class="icon" data-bpdel="${esc(p.id)}" aria-label="Remove payment">×</button></div>`).join('')}</div>` : ''}
      <div class="c6 dlg-actions" style="flex-wrap:wrap">${b.file_path ? '<button type="button" class="btn ghost" id="bFile">View bill</button>' : ''}${b.status !== 'paid' && b.status !== 'void' && !Number(b.amount_paid) ? '<button type="button" class="btn ghost" id="bEdit">Edit</button>' : ''}${b.status !== 'void' && !Number(b.amount_paid) ? '<button type="button" class="btn ghost" id="bVoid">Void</button>' : ''}<button class="btn ghost" value="cancel" formnovalidate>Close</button>${b.status === 'awaiting_approval' ? '<button type="button" class="btn red" id="bApprove">Approve for payment</button>' : ''}${open ? '<button type="button" class="btn ghost" id="bPay">Record payment</button><button type="button" class="btn red" id="bPayAll">Paid in full</button>' : ''}</div>`;
    const dlg = $('#editDlg'), f = $('#editForm'); if (!dlg.open) dlg.showModal(); f.onsubmit = null;
    const done = async msg => { await loadPayables(); toast(msg); renderPayables(); viewBill(id); };
    if ($('#bFile')) $('#bFile').onclick = async () => { const w = window.open('', '_blank'); if (w) w.opener = null; const { data, error } = await S.sb.storage.from('bills').createSignedUrl(b.file_path, 600); if (error) { if (w) w.close(); return toast('Couldn’t open the file'); } if (w) w.location = data.signedUrl; else location.href = data.signedUrl; };
    if ($('#bEdit')) $('#bEdit').onclick = () => { dlg.close(); editBill(b); };
    if ($('#bVoid')) $('#bVoid').onclick = async () => { if (!confirm('Void this bill? It will no longer count as owed or as a project cost.')) return; await S.sb.from('bills').update({ status: 'void' }).eq('id', id); done('Bill voided'); };
    if ($('#bApprove')) $('#bApprove').onclick = async () => { if (b.created_by === S.me.id && !isAdmin()) return toast('Someone else needs to approve a bill you entered'); const { error } = await S.sb.from('bills').update({ status: 'approved' }).eq('id', id); if (error) return toast('Couldn’t approve the bill'); done('Approved for payment'); };
    const pay = amount => { dlg.close();
      $('#editForm').innerHTML = `<div class="c6"><h2 style="margin-bottom:2px">Record a payment</h2><p class="sub">${esc(sp.name || '')} · ${m(Math.max(0, b.balance))} still to pay</p></div>
        <label class="c2">Amount (${esc(bCur(b))})<input type="number" name="amount" min="0.01" step="0.01" required value="${amount ?? ''}"></label><label class="c2">Date paid<input type="date" name="paid_on" required value="${dkey(new Date())}" max="${dkey(new Date())}"></label><label class="c2">Method<select name="method">${PAY_METHODS.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="c3">Reference<input name="reference" maxlength="120" placeholder="Transfer reference"></label><label class="c3">Note<input name="note" maxlength="500"></label>
        <div class="c6 dlg-actions"><button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn red" value="save">Save payment</button></div>`;
      dlg.showModal(); f.onsubmit = async ev => { if (ev.submitter?.value !== 'save') { f.onsubmit = null; return; } ev.preventDefault(); const d = new FormData(f), amt = Number(d.get('amount'));
        if (amt > Number(b.balance) + 0.005 && !confirm(`That’s more than the ${m(b.balance)} still to pay. Record it anyway?`)) return;
        const { error } = await S.sb.from('bill_payments').insert({ bill_id: id, amount: amt, paid_on: d.get('paid_on'), method: d.get('method'), reference: String(d.get('reference') || '').trim(), note: String(d.get('note') || '').trim() });
        if (error) return toast('Couldn’t record the payment'); f.onsubmit = null; dlg.close(); done('Payment recorded'); }; };
    if ($('#bPay')) $('#bPay').onclick = () => pay(null);
    if ($('#bPayAll')) $('#bPayAll').onclick = () => pay(Math.round(Math.max(0, b.balance) * 100) / 100);
    $$('[data-bpdel]').forEach(x => x.onclick = async () => { if (!confirm('Remove this payment?')) return; await S.sb.from('bill_payments').delete().eq('id', x.dataset.bpdel); done('Payment removed'); });
  }

  /* ---------- workspace settings (admin) ---------- */
  function renderSettings(){
    const c = S.settings, lastMonthEnd = dkey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), thisWeek = dkey(startOfWeek(0));
    main(`<div class="head"><div><h1>Workspace settings</h1><p class="sub">Rules that apply to everyone in the portal.</p></div></div>
      <form class="card f" id="setF">
        <h2 class="c6">Lock time</h2>
        <p class="c6 sub" style="margin-top:-8px">Staff can’t add, edit or delete time before this date. Admins can still correct locked time. Weeks also lock automatically when submitted or approved.</p>
        <label class="c2">Lock all time before<input type="date" name="lock_before" value="${c.lock_before || ''}"></label>
        <div class="c4" style="display:flex;gap:6px;flex-wrap:wrap;align-self:end"><button type="button" class="btn ghost sm" data-lock="${lastMonthEnd}">Up to end of last month</button><button type="button" class="btn ghost sm" data-lock="${thisWeek}">Up to end of last week</button><button type="button" class="btn ghost sm" data-lock="">Remove lock</button></div>
        <h2 class="c6" style="margin-top:12px">Two-step login</h2>
        <label class="c3">Require a code from a phone app for<select name="require_mfa"><option value="none" ${c.require_mfa === 'none' ? 'selected' : ''}>Nobody (optional for everyone)</option><option value="admins" ${(c.require_mfa || 'admins') === 'admins' ? 'selected' : ''}>Admins</option><option value="everyone" ${c.require_mfa === 'everyone' ? 'selected' : ''}>Everyone</option></select></label>
        <p class="c3 sub" style="font-size:12px;align-self:end">People who are required to use it are asked to set it up the next time they sign in.</p>
        <h2 class="c6" style="margin-top:12px">Working hours and overtime</h2>
        <label class="c2">Standard day (hours)<input type="number" name="daily_hours" min="1" max="24" step="0.5" value="${c.daily_hours}" required></label>
        <label class="c2">Standard week (hours)<input type="number" name="weekly_hours" min="1" max="100" step="0.5" value="${c.weekly_hours}" required></label>
        <label class="c2">Weekly target (hours)<input type="number" name="weekly_target" min="0" max="100" step="0.5" value="${c.weekly_target}" required></label>
        <p class="c6 sub" style="font-size:12px">Overtime is time over the standard day or week. The weekly target appears on each person’s timesheet and in their Friday email.</p>
        <div class="c6" style="display:flex;justify-content:flex-end"><button class="btn red">Save settings</button></div>
      </form>${ratesHtml()}${invoiceSettingsHtml()}${leaveSettingsHtml()}`);
    bindLeaveSettings(); bindRates(); bindInvoiceSettings();
    $$('[data-lock]').forEach(b => b.onclick = () => { $('#setF').lock_before.value = b.dataset.lock; });
    $('#setF').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target);
      const row = { require_mfa: f.get('require_mfa') || 'admins', lock_before: f.get('lock_before') || null, daily_hours: Number(f.get('daily_hours')), weekly_hours: Number(f.get('weekly_hours')), weekly_target: Number(f.get('weekly_target')), updated_at: new Date().toISOString() };
      const { error } = await S.sb.from('settings').update(row).eq('id', 1);
      if (error) return toast('Only admins can change these settings');
      S.settings = { ...S.settings, ...row }; toast('Settings saved');
    };
  }

  /* ---------- dashboards ---------- */
  const sum = l => l.reduce((a, e) => a + mins(e), 0);
  const inRange = (l, f, t) => l.filter(e => e.entry_date >= f && e.entry_date <= t);
  const barList = (pairs, max, colorOf) => pairs.length ? `<div class="bars">${pairs.map(([k, v]) => `<div class="bar"><span class="lbl" title="${esc(k)}">${esc(k)}</span><span class="trk"><i style="width:${max ? v / max * 100 : 0}%;background:${colorOf ? esc(colorOf(k)) : 'var(--ink)'}"></i></span><span class="v">${hm(v)}</span></div>`).join('')}</div>` : `<p class="empty">No time recorded in this period.</p>`;
  const weekCols = l => { const s = startOfWeek(0), t = dkey(new Date()), v = [...Array(7)].map((_, i) => sum(l.filter(e => e.entry_date === dkey(addDays(s, i))))), mx = Math.max(480, ...v); return `<div class="cols">${v.map((m, i) => { const k = dkey(addDays(s, i)); return `<div class="${k === t ? 'today' : ''}"><em>${m ? hrs(m) : ''}</em><i style="height:${m / mx * 100}%"></i>${fromKey(k).toLocaleDateString(undefined, { weekday: 'short' })}</div>`; }).join('')}</div>`; };
  const byProject = l => { const o = {}; l.forEach(e => { const n = proj(e.project_id).name; o[n] = (o[n] || 0) + mins(e); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const colorByName = n => (S.projects.find(p => p.name === n) || {}).color || '#9a9ca1';
  const kpi = (l, v, s) => `<div class="card kpi"><small>${l}</small><b>${v}</b><span>${s}</span></div>`;

  function renderMine(){
    const ws = dkey(startOfWeek(0)), we = dkey(addDays(startOfWeek(0), 6)), today = dkey(new Date());
    const week = inRange(S.entries, ws, we), td = S.entries.filter(e => e.entry_date === today), month = inRange(S.entries, dkey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), today);
    const wt = sum(week), bill = sum(week.filter(e => e.billable)), cats = {}; week.forEach(e => cats[e.category || 'Other'] = (cats[e.category || 'Other'] || 0) + mins(e));
    const running = S.timer ? (Date.now() - +new Date(S.timer.started_at)) / 60000 : 0;
    const pp = byProject(week), cp = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    main(`<div class="head"><div><h1>My dashboard</h1><p class="sub">Your week at a glance.</p></div></div>
      <div class="grid g4">${kpi('Today', hm(sum(td) + running), S.timer ? 'Timer running' : td.length + ' entries')}${kpi('This week', hm(wt), 'of a 40:00 week')}${kpi('Billable this week', (wt ? Math.round(bill / wt * 100) : 0) + '%', hm(bill) + ' billable')}${kpi('This month', hm(sum(month)), new Set(month.map(e => e.project_id)).size + ' projects')}</div>
      <div class="grid g2" style="margin-top:14px"><div class="card"><h2>Hours this week</h2>${weekCols(S.entries)}</div><div class="card"><h2>By project this week</h2>${barList(pp, pp[0]?.[1], colorByName)}</div></div>
      <div class="card" style="margin-top:14px"><h2>By activity this week</h2>${barList(cp, cp[0]?.[1])}</div>${myPlanHtml()}`);
  }
  function renderTeam(){
    const all = S.team, ws = dkey(startOfWeek(0)), we = dkey(addDays(startOfWeek(0), 6)), today = dkey(new Date());
    const week = inRange(all, ws, we), wt = sum(week), bill = sum(week.filter(e => e.billable));
    const active = S.people.filter(p => p.active), running = S.timers;
    const sw = active.map(p => [p.full_name || p.email, sum(week.filter(e => e.user_id === p.id))]).sort((a, b) => b[1] - a[1]);
    const recent = [...all].sort((a, b) => +new Date(b.updated_at || b.ended_at) - +new Date(a.updated_at || a.ended_at)).slice(0, 12), pp = byProject(week);
    main(`<div class="head"><div><h1>Team</h1><p class="sub">${active.length} active team members · week of ${startOfWeek(0).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</p></div><button class="btn ghost sm" id="refresh">Refresh</button></div>
      <div class="grid g4">${kpi('Team hours this week', hm(wt), week.length + ' entries')}${kpi('Today', hm(sum(all.filter(e => e.entry_date === today))), 'logged so far')}${kpi('Billable this week', (wt ? Math.round(bill / wt * 100) : 0) + '%', hm(bill) + ' billable')}${kpi('Working now', running.length, (running.length === 1 ? 'person' : 'people') + ' with a timer on')}</div>
      <div class="grid g2e" style="margin-top:14px">
        <div class="card"><h2>Working now</h2>${running.length ? `<div class="feed">${running.map(t => `<div><span class="av">${esc(initials(nameOf(t.user_id)))}</span><span><b style="font-weight:500">${esc(nameOf(t.user_id))}</b><br><span class="tag"><span class="live"></span>${esc(t.note || t.category || 'Working')} · ${esc(proj(t.project_id).name)}</span></span><span class="dur" data-live="${t.user_id}">${clock(Date.now() - +new Date(t.started_at))}</span></div>`).join('')}</div>` : '<p class="empty">Nobody has a timer running.</p>'}</div>
        <div class="card"><h2>Hours by person this week</h2>${barList(sw, sw[0]?.[1])}</div></div>
      <div class="grid g2" style="margin-top:14px"><div class="card"><h2>Team hours this week</h2>${weekCols(all)}</div><div class="card"><h2>Hours by project this week</h2>${barList(pp, pp[0]?.[1], colorByName)}</div></div>
      <div class="card" style="margin-top:14px"><h2>Recent activity</h2>${recent.length ? `<div class="feed">${recent.map(e => `<div><span class="av">${esc(initials(nameOf(e.user_id)))}</span><span><b style="font-weight:500">${esc(nameOf(e.user_id))}</b> logged ${hm(e.minutes)} on <b style="font-weight:500">${esc(proj(e.project_id).name)}</b><br><span class="tag">${esc(e.note || e.category || '')}</span></span><span class="span">${dayLabel(e.entry_date)}</span></div>`).join('')}</div>` : '<p class="empty">Activity appears here once your team starts tracking time.</p>'}</div>`);
    $('#refresh').onclick = async () => { await loadTeam(); renderTeam(); toast('Updated'); };
  }

  /* ---------- reports ---------- */
  function rangeDates(){
    const t = new Date(), today = dkey(t);
    if (S.range === 'week') return [dkey(startOfWeek(0)), dkey(addDays(startOfWeek(0), 6))];
    if (S.range === 'lastweek') return [dkey(startOfWeek(-1)), dkey(addDays(startOfWeek(-1), 6))];
    if (S.range === 'month') return [dkey(new Date(t.getFullYear(), t.getMonth(), 1)), today];
    if (S.range === 'lastmonth') return [dkey(new Date(t.getFullYear(), t.getMonth() - 1, 1)), dkey(new Date(t.getFullYear(), t.getMonth(), 0))];
    return [S.from || today, S.to || today];
  }
  function renderReports(){
    main(`<div class="head"><div><h1>Reports</h1><p class="sub">Filter the team’s time and export it as a spreadsheet.</p></div><button class="btn" id="csv">Export CSV</button></div>
      <div class="toolbar"><select id="rRange" aria-label="Date range"><option value="week">This week</option><option value="lastweek">Last week</option><option value="month">This month</option><option value="lastmonth">Last month</option><option value="custom">Custom range</option></select>
        <span id="custom" ${S.range === 'custom' ? '' : 'hidden'}><input type="date" id="rFrom" aria-label="From"> <input type="date" id="rTo" aria-label="To"></span>
        <select id="rProj" aria-label="Project">${projOptions(S.fProj, true)}</select><select id="rStaff" aria-label="Team member"><option value="">All team members</option></select></div><div id="rBody"></div>`);
    S.people.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.full_name || p.email; if (p.id === S.fStaff) o.selected = true; $('#rStaff').appendChild(o); });
    $('#rRange').value = S.range; const [f, t] = rangeDates(); $('#rFrom').value = S.from || f; $('#rTo').value = S.to || t;
    $('#rRange').onchange = e => { S.range = e.target.value; $('#custom').hidden = S.range !== 'custom'; renderReportBody(); };
    $('#rFrom').onchange = e => { S.from = e.target.value; renderReportBody(); };
    $('#rTo').onchange = e => { S.to = e.target.value; renderReportBody(); };
    $('#rProj').onchange = e => { S.fProj = e.target.value; renderReportBody(); };
    $('#rStaff').onchange = e => { S.fStaff = e.target.value; renderReportBody(); };
    $('#csv').onclick = exportCsv; renderReportBody();
  }
  const reportRows = () => { const [f, t] = rangeDates(); return inRange(S.team, f, t).filter(e => (!S.fProj || e.project_id === S.fProj) && (!S.fStaff || e.user_id === S.fStaff)).sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at)); };
  function renderReportBody(){
    const b = $('#rBody'); if (!b) return;
    const rows = reportRows(), tot = sum(rows), bill = sum(rows.filter(e => e.billable)), st = {};
    rows.forEach(e => st[nameOf(e.user_id)] = (st[nameOf(e.user_id)] || 0) + mins(e));
    const sp = Object.entries(st).sort((a, c) => c[1] - a[1]), pp = byProject(rows);
    b.innerHTML = `<div class="grid g4">${kpi('Total time', hm(tot), rows.length + ' entries')}${kpi('Billable', hm(bill), (tot ? Math.round(bill / tot * 100) : 0) + '% of total')}${kpi('Projects', pp.length, 'with time logged')}${kpi('Team members', sp.length, 'logged time')}</div>
      <div class="grid g2e" style="margin-top:14px"><div class="card"><h2>By project</h2>${barList(pp, pp[0]?.[1], colorByName)}</div><div class="card"><h2>By team member</h2>${barList(sp, sp[0]?.[1])}</div></div>
      <div class="card scroll" style="margin-top:14px"><h2>Entries</h2>${rows.length ? `<table class="sheet"><thead><tr><th>Date</th><th style="text-align:left">Team member</th><th style="text-align:left">Project</th><th style="text-align:left">Task</th><th>Time</th><th>Duration</th></tr></thead><tbody>${rows.slice(0, 300).map(e => `<tr><td>${fromKey(e.entry_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</td><td style="text-align:left">${esc(nameOf(e.user_id))}</td><td style="text-align:left"><span class="tag" style="color:var(--ink)"><span class="dot" style="background:${esc(proj(e.project_id).color)}"></span>${esc(proj(e.project_id).name)}</span></td><td style="text-align:left">${esc(e.note || e.category || '')}</td><td>${tstr(e.started_at)}–${tstr(e.ended_at)}</td><td><b>${hm(e.minutes)}</b></td></tr>`).join('')}</tbody></table>${rows.length > 300 ? '<p class="sub" style="margin-top:8px">Showing the latest 300 entries. Export the CSV for the full list.</p>' : ''}` : '<p class="empty">No entries match these filters.</p>'}</div>`;
  }
  function exportCsv(){
    const rows = reportRows(); if (!rows.length) return toast('No entries to export');
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Date,Team member,Email,Job ID,Project,Client,Category,Task,Start,End,Hours,Billable', ...rows.map(e => { const p = proj(e.project_id), u = person(e.user_id) || {}; return [e.entry_date, nameOf(e.user_id), u.email || '', p.job_code || '', p.name, p.client || '', e.category, e.note, tstr(e.started_at), tstr(e.ended_at), (e.minutes / 60).toFixed(2), e.billable ? 'Yes' : 'No'].map(q).join(','); })].join('\n');
    const [f, t] = rangeDates(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = `jci-time-${f}-to-${t}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- projects ---------- */
  const projList = k => { const q = (S.projQ || '').trim().toLowerCase(); return S.projects.filter(p => (k === 'all' ? true : k === 'pipeline' ? p.status === 'pipeline' : k === 'done' ? ['completed', 'lost'].includes(p.status) : !['pipeline', 'completed', 'lost'].includes(p.status || 'active')) && (!q || [p.job_code, p.name, p.client, p.team_lead, p.project_type, p.scope, p.year].join(' ').toLowerCase().includes(q))); };
  async function renderProjects(){
    if (!S.lifeFin) { const { data } = await S.sb.rpc('financials', { p_from: '2000-01-01', p_to: dkey(new Date()) }); S.lifeFin = data || { projects: [], expenses: [] }; }
    if (!S.jobs || !S.jobs.length) await loadJobs().catch(() => {});
    const F = S.lifeFin, usage = p => { const f = (F.projects || []).find(x => x.project_id === p.id) || { minutes: 0, billable_amount: 0 }, x = (F.expenses || []).find(y => y.project_id === p.id) || { billable: 0 }; return { hours: Number(f.minutes) / 60, amount: Number(f.billable_amount) + Number(x.billable) }; };
    const bar = (used, total, label) => { const pct = total ? used / total * 100 : 0, c = pct >= 100 ? 'var(--red)' : pct >= 80 ? '#b45309' : 'var(--ok)'; return `<div class="pbar"><div class="pbar-t"><i style="width:${Math.min(100, pct)}%;background:${c}"></i></div><small>${label} · <b style="color:${c}">${Math.round(pct)}%</b></small></div>`; };
    main(`<div class="head"><div><h1>Projects</h1><p class="sub">Projects your team can track time against, with budgets, estimates and billable rates. Archived projects stay in reports but can’t be selected.</p></div></div>
      <form class="f card" id="pForm"><label>Job ID<input name="job_code" maxlength="20" value="${nextJobCode()}" style="text-transform:uppercase"></label><label class="c2">Project name<input name="name" required maxlength="120" placeholder="e.g. Afreximbank Abuja"></label><label class="c2">Client<input name="client" placeholder="Optional"></label><label>Currency<select name="currency">${curOpts(baseCur())}</select></label><label>Colour<input type="color" name="color" value="${COLORS[S.projects.length % COLORS.length]}" class="swatch" style="width:100%;height:42px"></label><div class="c6" style="display:flex;justify-content:flex-end"><button class="btn">Add project</button></div></form>
      <div class="toolbar" style="margin-top:14px"><div class="seg">${[['active', 'Active'], ['pipeline', 'Pipeline'], ['done', 'Completed and lost'], ['all', 'All']].map(([k, l]) => `<button data-pf="${k}" class="${(S.projFilter || 'active') === k ? 'on' : ''}">${l} <em class="soft">${projList(k).length}</em></button>`).join('')}</div><input id="projQ" type="search" placeholder="Search Job ID, name, lead…" value="${esc(S.projQ || '')}" style="min-width:220px"></div>
      <div class="card" style="margin-top:10px">${projList(S.projFilter || 'active').length > 120 ? `<p class="sub" style="margin-bottom:8px">Showing 120 of ${projList(S.projFilter || 'active').length} projects. Search to find others.</p>` : ''}${projList(S.projFilter || 'active').length ? projList(S.projFilter || 'active').slice(0, 120).map(p => { const u = usage(p), jb = jobOf(p.id);
        const extra = [p.budget_type === 'hours' && p.budget ? bar(u.hours, Number(p.budget), `${Math.round(u.hours)} of ${p.budget} budget hours`) : '', p.budget_type === 'amount' && p.budget ? bar(u.amount / fxOf(pcur(p)), Number(p.budget), `${moneyIn(u.amount / fxOf(pcur(p)), pcur(p))} of ${moneyIn(p.budget, pcur(p))} budget`) : '', p.estimate_hours ? bar(u.hours, Number(p.estimate_hours), `${Math.round(u.hours)} of ${p.estimate_hours} estimated hours`) : ''].join('');
        return `<div class="prow2 ${p.archived ? 'off' : ''} ${S.projFocus === p.id ? 'focus' : ''}" id="pr-${esc(p.id)}"><span class="dot" style="background:${esc(p.color)};width:14px;height:14px"></span><span class="pr-main">${p.job_code ? `<span class="jcode">${esc(p.job_code)}</span>` : ''}<b style="font-weight:500">${esc(p.name)}</b>${p.client ? `<span class="tag"> · ${esc(p.client)}</span>` : ''} ${pStatus(p)}${p.archived ? '<span class="tag"> · Archived</span>' : ''}${jb ? `<button class="link pj-link" data-pjob="${esc(jb.id)}">${p.status === 'pipeline' ? 'Opportunity' : 'From pipeline'}: ${esc(jb.ref || jb.title)} · ${esc(STG[jb.stage].l)}${Number(jb.value) ? ' · ' + moneyIn(jb.value, jb.currency || baseCur()) : ''} ›</button>` : ''}${[p.year, p.project_type, p.scope, p.team_lead ? 'Lead: ' + p.team_lead : ''].filter(Boolean).length ? `<small class="sub pr-reg">${[p.year, p.project_type, p.scope, p.team_lead ? 'Lead: ' + p.team_lead : ''].filter(Boolean).map(esc).join(' · ')}</small>` : ''}<small class="sub">${Math.round(u.hours * 10) / 10} hours logged${p.status === 'pipeline' ? ' on the proposal' : ''}${p.bill_rate != null ? ' · ' + moneyIn(p.bill_rate, pcur(p)) + '/hour' : ''}</small>${extra}</span><span style="display:flex;gap:6px">${can('pm') ? `<button class="btn ghost sm" data-phub="${esc(p.id)}">Hub</button>` : ''}<button class="btn ghost sm" data-pedit="${esc(p.id)}">Edit</button><button class="btn ghost sm" data-arch="${esc(p.id)}">${p.archived ? 'Restore' : 'Archive'}</button></span></div>`; }).join('') : '<p class="empty">Add your first project above.</p>'}</div>`);
    $$('[data-pf]').forEach(b => b.onclick = () => { S.projFilter = b.dataset.pf; S.projFocus = null; renderProjects(); });
    $('#projQ').oninput = e => { S.projQ = e.target.value; clearTimeout(S.pqT); S.pqT = setTimeout(() => { renderProjects().then(() => { const i = $('#projQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 250); };
    $$('[data-pjob]').forEach(b => b.onclick = () => { const jb = (S.jobs || []).find(x => x.id === b.dataset.pjob); if (jb) openJob(jb); });
    if (S.projFocus) { const el = document.getElementById('pr-' + S.projFocus); if (el) el.scrollIntoView({ block: 'center' }); }
    $('#pForm').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), name = String(f.get('name')).trim(); if (!name) return;
      const jc = String(f.get('job_code') || '').trim().toUpperCase();
      if (jc && S.projects.some(x => (x.job_code || '').toUpperCase() === jc)) return toast(`${jc} is already used by another project`);
      const { error } = await S.sb.from('projects').insert({ name, currency: f.get('currency') === baseCur() ? null : f.get('currency'), job_code: jc || null, client: String(f.get('client') || '').trim(), color: f.get('color') });
      if (error) return toast('Only managers and admins can add projects');
      toast('Project added'); await loadProjects(); renderProjects();
    };
    $$('[data-arch]').forEach(b => b.onclick = async () => { const p = S.projects.find(x => x.id === b.dataset.arch); const { error } = await S.sb.from('projects').update({ archived: !p.archived }).eq('id', p.id); if (error) return toast('Couldn’t update the project'); toast(p.archived ? 'Project restored' : 'Project archived'); await loadProjects(); renderProjects(); });
    $$('[data-phub]').forEach(b => b.onclick = () => { S.hubPid = b.dataset.phub; go('hub'); });
    $$('[data-pedit]').forEach(b => b.onclick = () => editProject(S.projects.find(x => x.id === b.dataset.pedit)));
  }


  /* ---------- people (admin) ---------- */
  async function adminCall(body){
    const { data, error } = await S.sb.functions.invoke('invite-staff', { body });
    if (error) { let msg = 'That didn’t work. Try again.'; try { const j = await error.context.json(); msg = j.error || msg; } catch (e) {} throw new Error(msg); }
    return data;
  }
  function renderPeople(){
    const wk = dkey(startOfWeek(0)), we = dkey(addDays(startOfWeek(0), 6));
    main(`<div class="head"><div><h1>People and access</h1><p class="sub">Invite staff, choose which modules each person can use, and turn off access when someone leaves.</p></div></div>
      <form class="f card" id="invF"><label class="c2">Full name<input name="full_name" required autocomplete="off"></label><label class="c2">Work email<input type="email" name="email" required autocomplete="off"></label><label>Role<select name="role"><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></label><div style="display:flex;justify-content:flex-end"><button class="btn red">Send invite</button></div>
        <p class="c6 sub" style="font-size:12px">Each role starts with standard access: staff get time tracking, time off and expenses; managers also get the team, business and project modules; admins get everything. Use <b>Modules</b> to give anyone more or less.</p></form>
      <div class="card scroll" style="margin-top:14px"><table class="sheet people"><thead><tr><th>Name</th><th style="text-align:left">Email</th><th style="text-align:left">Role</th><th style="text-align:left">Modules</th><th>Two-step</th><th>This week</th><th>Sign-in</th></tr></thead><tbody></tbody></table></div>`);
    const tb = $('.people tbody');
    S.people.forEach(p => {
      const tr = document.createElement('tr'); if (!p.active) tr.className = 'off';
      tr.innerHTML = `<td><span class="tag" style="color:var(--ink)"><span class="av sm"></span><span class="nm"></span></span></td><td style="text-align:left" class="em"></td><td style="text-align:left"><select data-role="${esc(p.id)}" ${p.id === S.me.id ? 'disabled title="You can’t change your own role"' : ''}><option value="staff">Staff</option><option value="manager">Manager</option><option value="admin">Admin</option></select></td><td style="text-align:left"><button class="btn ghost sm" data-mods="${esc(p.id)}">${p.role === 'admin' ? 'All modules' : p.modules ? `Custom · ${p.modules.length}` : 'Standard'}</button></td><td>${(S.mfaUsers || []).includes(p.id) ? `<span class="mfa-b on">On</span>${p.id !== S.me.id && (p.role !== 'admin' || isAdmin()) ? ` <button class="link-s" data-mfareset="${esc(p.id)}">Reset</button>` : ''}` : '<span class="mfa-b">Off</span>'}</td><td>${hm(sum(inRange(S.team.filter(e => e.user_id === p.id), wk, we)))}</td><td>${p.id === S.me.id ? '<span class="tag">You</span>' : `<button class="btn ghost sm" data-act="${esc(p.id)}">${p.active ? 'Turn off access' : 'Restore access'}</button>`}</td>`;
      tr.querySelector('.nm').textContent = p.full_name || '(name not set)'; tr.querySelector('.av').textContent = initials(p.full_name || p.email); tr.querySelector('.em').textContent = p.email;
      tr.querySelector('select').value = p.role; tb.appendChild(tr);
    });
    $('#invF').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector('button'); b.disabled = true;
      try { await adminCall({ action: 'invite', full_name: f.get('full_name'), email: f.get('email'), role: f.get('role'), redirectTo: HERE }); toast('Invite sent to ' + f.get('email')); e.target.reset(); await loadTeam(); renderPeople(); }
      catch (x) { toast(x.message); } finally { b.disabled = false; }
    };
    $$('[data-mods]').forEach(b => b.onclick = () => editAccess(S.people.find(x => x.id === b.dataset.mods)));
    $$('[data-mfareset]').forEach(b => b.onclick = async () => { const p = S.people.find(x => x.id === b.dataset.mfareset); if (!confirm(`Reset two-step login for ${p.full_name || p.email}? Use this if they lost their phone. They’ll set it up again at their next sign-in.`)) return; try { await adminCall({ action: 'reset_mfa', user_id: p.id }); toast('Two-step login reset'); S.mfaUsers = (S.mfaUsers || []).filter(x => x !== p.id); renderPeople(); } catch (x) { toast(x.message); } });
    $$('[data-role]').forEach(s => s.onchange = async () => { const { error } = await S.sb.from('profiles').update({ role: s.value }).eq('id', s.dataset.role); if (error) { toast('Couldn’t change the role'); return renderPeople(); } toast('Role updated'); await loadTeam(); });
    $$('[data-act]').forEach(b => b.onclick = async () => {
      const p = S.people.find(x => x.id === b.dataset.act), off = p.active;
      if (off && !confirm(`Turn off access for ${p.full_name || p.email}? They won’t be able to sign in. Their time entries stay in reports.`)) return;
      b.disabled = true;
      try { await adminCall({ action: off ? 'deactivate' : 'reactivate', user_id: p.id }); toast(off ? 'Access turned off' : 'Access restored'); await loadTeam(); renderPeople(); } catch (x) { toast(x.message); b.disabled = false; }
    });
  }

  boot().catch(e => { console.error(e); main(`<div class="notice"><h1>The staff portal couldn’t load</h1><p class="sub">Check your internet connection and reload the page.</p></div>`); });
})();
