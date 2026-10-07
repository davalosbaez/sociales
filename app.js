const SUPABASE_URL = 'https://zzejwzqdnctwjrjevgwg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mhaUX17rParkGQvV_5GxNw_IB9bgF1r ';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const STORAGE = {
  users: 'sociales_users_v1',
  session: 'sociales_session_v1',
  posts: 'sociales_posts_v1',
  news: 'sociales_news_v1',
  events: 'sociales_events_v1',
  theme: 'sociales_theme_v1'
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const get = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const escapeHTML = (str='') => String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const nowText = () => new Intl.DateTimeFormat('es-PY', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}).format(new Date());

let users = get(STORAGE.users, []);
let posts = get(STORAGE.posts, []);
let news = get(STORAGE.news, []);
let events = get(STORAGE.events, []);
let currentUser = null;
let calendarDate = new Date();
let selectedMedia = null;

function saveAll() {
  set(STORAGE.users, users); set(STORAGE.posts, posts); set(STORAGE.news, news); set(STORAGE.events, events);
}

function avatarHTML(user, cls='user-avatar') {
  if (user.avatar) return `<img class="${cls}" src="${user.avatar}" alt="">`;
  return `<div class="${cls}">${escapeHTML((user.name || user.username).charAt(0).toUpperCase())}</div>`;
}
function findUser(username) { return users.find(u => u.username === username); }
function current() { return findUser(currentUser); }
function toast(message) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  $('#toast-container').appendChild(t);
  setTimeout(() => t.remove(), 2700);
}
const toastStyle = document.createElement('style');
toastStyle.textContent = `.toast{position:fixed;right:20px;bottom:22px;z-index:100;background:#16587B;color:white;padding:12px 16px;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.2);font-size:.82rem;font-weight:700;animation:rise .3s ease}.toast + .toast{bottom:70px}`;
document.head.appendChild(toastStyle);

function showAuth(type='login') {
  $$('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.auth === type));
  $('#login-form').classList.toggle('hidden', type !== 'login');
  $('#register-form').classList.toggle('hidden', type !== 'register');
}

$$('.auth-tab').forEach(btn => btn.addEventListener('click', () => showAuth(btn.dataset.auth)));

$('#login-form').addEventListener('submit', e => {
  e.preventDefault();
  const username = $('#login-username').value.trim().toLowerCase();
  const password = $('#login-password').value;
  const user = findUser(username);
  if (!user || user.password !== password) return toast('Usuario o contraseña incorrectos.');
  currentUser = username;
  set(STORAGE.session, username);
  startApp();
});

$('#register-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#register-name').value.trim();
  const username = $('#register-username').value.trim().toLowerCase();
  const password = $('#register-password').value;
  if (findUser(username)) return toast('Ese usuario ya existe.');
  users.push({username, name, password, bio:'', avatar:'', accent:'#16587B', createdAt: Date.now()});
  saveAll();
  currentUser = username; set(STORAGE.session, username);
  startApp();
  toast('¡Cuenta creada! Bienvenido/a a Sociales.');
});

function startApp() {
  currentUser = get(STORAGE.session, null);
  if (!currentUser || !findUser(currentUser)) {
    $('#auth-screen').classList.remove('hidden'); $('#app').classList.add('hidden'); return;
  }
  $('#auth-screen').classList.add('hidden'); $('#app').classList.remove('hidden');
  applyUserTheme(); renderAll();
}
function logout() {
  localStorage.removeItem(STORAGE.session);
  currentUser = null;
  $('#app').classList.add('hidden'); $('#auth-screen').classList.remove('hidden');
  showAuth('login');
  toast('Sesión cerrada.');
}
$('#logout-btn').addEventListener('click', logout);

function navigate(page) {
  $$('.page').forEach(p => p.classList.remove('active-page'));
  $(`#page-${page}`).classList.add('active-page');
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  window.scrollTo({top:0, behavior:'smooth'});
}
$$('[data-page]').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.page)));

function renderAll() {
  renderMiniProfile(); renderFeed(); renderNews(); renderCalendar(); renderProfile(); renderHeaderAvatar();
}
function renderHeaderAvatar() {
  const u = current();
  const b = $('#header-avatar');
  if (u.avatar) { b.style.backgroundImage=`url(${u.avatar})`; b.style.backgroundSize='cover'; b.textContent=''; }
  else { b.style.backgroundImage='none'; b.textContent=(u.name||u.username).charAt(0).toUpperCase(); }
}
function renderMiniProfile() {
  const u = current();
  $('#mini-profile').innerHTML = `
    ${avatarHTML(u,'big-avatar')}
    <h3>${escapeHTML(u.name)}</h3>
    <p>@${escapeHTML(u.username)}<br>${escapeHTML(u.bio || 'Todavía no agregaste una bio.')}</p>
    <button class="text-btn" id="edit-profile-side">Editar perfil →</button>`;
  $('#edit-profile-side').onclick = openProfileModal;
}
function applyUserTheme() {
  const u = current();
  document.documentElement.style.setProperty('--accent', u.accent || '#16587B');
}
$('#theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('night');
  const night = document.body.classList.contains('night');
  if (night) {
    document.documentElement.style.setProperty('--white','#1c2f39');
    document.documentElement.style.setProperty('--cream','#142731');
    document.documentElement.style.setProperty('--ink','#eaf3f5');
    document.documentElement.style.setProperty('--muted','#a9c0ca');
    document.body.style.background='#10222b';
    $('#theme-toggle').textContent='☾';
  } else {
    document.documentElement.style.setProperty('--white','#fffdf8');
    document.documentElement.style.setProperty('--cream','#F5EEDD');
    document.documentElement.style.setProperty('--ink','#173D52');
    document.documentElement.style.setProperty('--muted','#6d8796');
    document.body.style.background='#f7f3eb';
    $('#theme-toggle').textContent='☼';
  }
});

function renderFeed() {
  const list = $('#feed-list');
  if (!posts.length) {
    list.innerHTML = `<div class="post-card"><h3>✦ Todavía no hay publicaciones</h3><p>¡Sé la primera persona en compartir algo con el curso!</p></div>`;
    return;
  }
  list.innerHTML = [...posts].sort((a,b)=>b.createdAt-a.createdAt).map(post => {
    const u = findUser(post.username) || {username:post.username,name:post.username};
    const liked = (post.likes || []).includes(currentUser);
    const comments = post.comments || [];
    return `<article class="post-card" data-post="${post.id}">
      <div class="post-head">
        ${avatarHTML(u)}
        <div class="user-meta"><strong>${escapeHTML(u.name)}</strong><span>@${escapeHTML(u.username)} · ${escapeHTML(post.time)}</span></div>
        ${post.username===currentUser ? `<button class="more-btn delete-post" data-id="${post.id}" title="Eliminar">⋯</button>` : ''}
      </div>
      <div class="post-text">${escapeHTML(post.text)}</div>
      ${post.media ? (post.media.type.startsWith('video') ? `<video class="post-media" controls src="${post.media.data}"></video>` : `<img class="post-media" src="${post.media.data}" alt="Imagen publicada">`) : ''}
      <div class="post-actions">
        <button class="action-btn ${liked?'liked':''} like-btn" data-id="${post.id}">♡ ${post.likes?.length || 0}</button>
        <button class="action-btn comment-toggle" data-id="${post.id}">◌ ${comments.length} comentarios</button>
        <button class="action-btn share-btn" data-id="${post.id}">↗ Compartir</button>
      </div>
      <div class="comment-box" id="comment-${post.id}">
        <input type="text" maxlength="180" placeholder="Escribí un comentario...">
        <button class="primary-btn add-comment" data-id="${post.id}">Enviar</button>
      </div>
      ${comments.length ? `<div class="comments">${comments.map(c=>`<div class="comment"><b>@${escapeHTML(c.username)}</b> ${escapeHTML(c.text)}</div>`).join('')}</div>` : ''}
    </article>`;
  }).join('');

  $$('.like-btn').forEach(b => b.onclick = () => {
    const p = posts.find(x=>x.id===b.dataset.id);
    p.likes = p.likes || [];
    p.likes = p.likes.includes(currentUser) ? p.likes.filter(x=>x!==currentUser) : [...p.likes,currentUser];
    saveAll(); renderFeed();
  });
  $$('.delete-post').forEach(b => b.onclick = () => {
    if (confirm('¿Eliminar esta publicación?')) { posts = posts.filter(x=>x.id!==b.dataset.id); saveAll(); renderFeed(); toast('Publicación eliminada.'); }
  });
  $$('.comment-toggle').forEach(b => b.onclick = () => $(`#comment-${b.dataset.id}`).classList.toggle('open'));
  $$('.add-comment').forEach(b => b.onclick = () => addComment(b.dataset.id));
  $$('.share-btn').forEach(b => b.onclick = async () => {
    const p = posts.find(x=>x.id===b.dataset.id);
    const text = `${findUser(p.username)?.name || p.username}: ${p.text}`;
    try { await navigator.clipboard.writeText(text); toast('Texto copiado para compartir.'); } catch { toast('No se pudo copiar automáticamente.'); }
  });
}
function addComment(id) {
  const box = $(`#comment-${id}`); const input = box.querySelector('input');
  if (!input.value.trim()) return;
  const p = posts.find(x=>x.id===id); p.comments = p.comments || [];
  p.comments.push({username:currentUser,text:input.value.trim()});
  saveAll(); renderFeed();
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); }
$$('.modal-close').forEach(b => b.onclick = () => closeModal(b.dataset.close));
$$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); }));

function openCreate() { selectedMedia=null; $('#media-name').textContent=''; $('#post-media-preview').classList.add('hidden'); $('#post-form').reset(); openModal('create-modal'); }
$('#open-create').onclick=openCreate; $('#open-create-mobile').onclick=openCreate;

async function fileToDataURL(file) {
  return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });
}
async function handleMedia(file, type) {
  if (!file) return;
  if (file.size > 15 * 1024 * 1024) return toast('Elegí un archivo de hasta 15 MB en esta versión.');
  selectedMedia = {type:file.type || type, data:await fileToDataURL(file), name:file.name};
  $('#media-name').textContent=file.name;
  const preview=$('#post-media-preview'); preview.classList.remove('hidden');
  preview.innerHTML = file.type.startsWith('video') ? `<video controls src="${selectedMedia.data}"></video>` : `<img src="${selectedMedia.data}" alt="Vista previa">`;
}
$('#post-image').onchange = e => { $('#post-video').value=''; handleMedia(e.target.files[0],'image'); };
$('#post-video').onchange = e => { $('#post-image').value=''; handleMedia(e.target.files[0],'video'); };

$('#post-form').onsubmit = e => {
  e.preventDefault();
  posts.push({id:uid(),username:currentUser,text:$('#post-text').value.trim(),media:selectedMedia,likes:[],comments:[],time:nowText(),createdAt:Date.now()});
  saveAll(); closeModal('create-modal'); renderFeed(); $('#post-form').reset(); selectedMedia=null; toast('¡Publicación compartida!');
};

function renderNews() {
  const list=$('#news-list');
  if(!news.length){ list.innerHTML=`<div class="news-card"><h3>No hay noticias todavía.</h3><p>Podés publicar la primera novedad de la comunidad.</p></div>`; return; }
  list.innerHTML=[...news].sort((a,b)=>b.createdAt-a.createdAt).map(n=>{
    const u=findUser(n.username)||{name:n.username};
    return `<article class="news-card">
      <div class="news-meta"><span>Por ${escapeHTML(u.name)} · ${escapeHTML(n.time)}</span>${n.username===currentUser?`<button class="delete-news delete-mini" data-id="${n.id}">Eliminar</button>`:''}</div>
      <h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p>
      ${n.source?`<a class="news-source" href="${escapeHTML(n.source)}" target="_blank" rel="noopener">Ver fuente →</a>`:''}
    </article>`;
  }).join('');
  $$('.delete-news').forEach(b=>b.onclick=()=>{ if(confirm('¿Eliminar esta noticia?')){news=news.filter(n=>n.id!==b.dataset.id);saveAll();renderNews();toast('Noticia eliminada.');}});
}
$('#open-news').onclick=()=>openModal('news-modal');
$('#news-form').onsubmit=e=>{
  e.preventDefault();
  news.push({id:uid(),username:currentUser,title:$('#news-title').value.trim(),body:$('#news-body').value.trim(),source:$('#news-source').value.trim(),time:nowText(),createdAt:Date.now()});
  saveAll(); closeModal('news-modal'); renderNews(); e.target.reset(); toast('Noticia publicada.');
};

function renderCalendar() {
  const year=calendarDate.getFullYear(), month=calendarDate.getMonth();
  $('#calendar-title').textContent=new Intl.DateTimeFormat('es-PY',{month:'long',year:'numeric'}).format(calendarDate);
  const first=new Date(year,month,1), last=new Date(year,month+1,0);
  let start=(first.getDay()+6)%7, cells=[];
  for(let i=0;i<start;i++){ const d=new Date(year,month,i-start+1); cells.push(`<div class="day muted">${d.getDate()}</div>`); }
  for(let day=1;day<=last.getDate();day++){
    const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayEvents=events.filter(e=>e.date===iso);
    const today=new Date(), isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    cells.push(`<div class="day ${isToday?'today':''} ${dayEvents.length?'has-event':''}" data-date="${iso}">${day}${dayEvents.length?'<span class="dot"></span>':''}</div>`);
  }
  while(cells.length%7) cells.push(`<div class="day muted">${cells.length-start-last.getDate()+1}</div>`);
  $('#calendar-grid').innerHTML=cells.join('');
  renderEvents();
}
function renderEvents() {
  const sorted=[...events].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $('#events-list').innerHTML=sorted.length ? sorted.map(e=>`
    <div class="event-item"><button class="delete-mini delete-event" data-id="${e.id}">×</button>
      <div class="event-date">${new Intl.DateTimeFormat('es-PY',{day:'2-digit',month:'short'}).format(new Date(e.date+'T12:00'))}${e.time?' · '+e.time:''}</div>
      <strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.place||'Sin lugar indicado')}</small>
    </div>`).join('') : '<p style="color:#7d929d;font-size:.8rem">No hay fechas agregadas.</p>';
  $$('.delete-event').forEach(b=>b.onclick=()=>{events=events.filter(e=>e.id!==b.dataset.id);saveAll();renderCalendar();toast('Fecha eliminada.');});
}
$('#prev-month').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();};
$('#next-month').onclick=()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();};
$('#open-event').onclick=()=>{ $('#event-date').value=new Date().toISOString().slice(0,10); openModal('event-modal'); };
$('#event-form').onsubmit=e=>{
  e.preventDefault();
  events.push({id:uid(),title:$('#event-title').value.trim(),date:$('#event-date').value,time:$('#event-time').value,place:$('#event-place').value.trim(),createdBy:currentUser});
  saveAll(); closeModal('event-modal'); renderCalendar(); e.target.reset(); toast('Fecha agregada al calendario.');
};

function renderProfile() {
  const u=current(), mine=posts.filter(p=>p.username===currentUser).sort((a,b)=>b.createdAt-a.createdAt);
  $('#profile-view').innerHTML=`<div class="profile-header">
    <div class="profile-cover"></div><div class="profile-info">
      ${avatarHTML(u,'profile-avatar')}
      <div class="profile-actions"><button class="primary-btn" id="edit-profile">Editar perfil</button></div>
      <h2>${escapeHTML(u.name)}</h2><span class="handle">@${escapeHTML(u.username)}</span>
      <p>${escapeHTML(u.bio||'Agregá una bio para contarle a la comunidad quién sos.')}</p>
      <small style="color:#8097a2">${mine.length} publicación${mine.length===1?'':'es'}</small>
    </div></div>
    <div class="profile-tabs"><button class="profile-tab active">Publicaciones</button></div>
    <div class="profile-posts">${mine.length ? mine.map(p=>renderCompactPost(p)).join('') : '<p style="color:#78909c">Todavía no publicaste nada.</p>'}</div>`;
  $('#edit-profile').onclick=openProfileModal;
}
function renderCompactPost(p) {
  return `<article class="post-card" style="box-shadow:none;margin-bottom:12px"><div class="post-text">${escapeHTML(p.text)}</div>${p.media?(p.media.type.startsWith('video')?`<video class="post-media" controls src="${p.media.data}"></video>`:`<img class="post-media" src="${p.media.data}" alt="">`):''}<div class="post-actions"><span class="action-btn">♡ ${p.likes?.length||0}</span><span class="action-btn">${p.comments?.length||0} comentarios</span></div></article>`;
}
function openProfileModal() {
  const u=current(); $('#profile-name').value=u.name; $('#profile-bio').value=u.bio||''; $('#profile-accent').value=u.accent||'#16587B'; $('#profile-avatar').value='';
  openModal('profile-modal');
}
$('#profile-form').onsubmit=async e=>{
  e.preventDefault(); const u=current();
  u.name=$('#profile-name').value.trim(); u.bio=$('#profile-bio').value.trim(); u.accent=$('#profile-accent').value;
  const file=$('#profile-avatar').files[0];
  if(file){ if(file.size>4*1024*1024)return toast('La foto de perfil debe pesar menos de 4 MB.'); u.avatar=await fileToDataURL(file); }
  saveAll(); applyUserTheme(); renderAll(); closeModal('profile-modal'); toast('Perfil actualizado.');
};
$('#header-avatar').onclick=openProfileModal;

$('#search-input').addEventListener('input', e=>{
  const q=e.target.value.trim().toLowerCase();
  if(!q){ navigate('feed'); return; }
  navigate('search'); $('#search-title').textContent=`Resultados para “${q}”`;
  const people=users.filter(u=>u.name.toLowerCase().includes(q)||u.username.includes(q));
  const matchedPosts=posts.filter(p=>p.text.toLowerCase().includes(q));
  const matchedNews=news.filter(n=>(n.title+n.body).toLowerCase().includes(q));
  $('#search-results').innerHTML = `
    ${people.length?`<div class="news-card"><h3>Personas</h3>${people.map(u=>`<p><b>${escapeHTML(u.name)}</b> <span style="color:#78909c">@${escapeHTML(u.username)}</span></p>`).join('')}</div>`:''}
    ${matchedPosts.length?`<div class="feed-list">${matchedPosts.map(p=>{const u=findUser(p.username)||{name:p.username};return `<div class="post-card"><div class="post-head">${avatarHTML(u)}<div class="user-meta"><strong>${escapeHTML(u.name)}</strong><span>@${escapeHTML(u.username)}</span></div></div><div class="post-text">${escapeHTML(p.text)}</div></div>`}).join('')}</div>`:''}
    ${matchedNews.length?`<div class="news-list">${matchedNews.map(n=>`<div class="news-card"><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p></div>`).join('')}</div>`:''}
    ${!people.length&&!matchedPosts.length&&!matchedNews.length?`<div class="post-card"><h3>No encontramos resultados.</h3><p>Probá con otra palabra.</p></div>`:''}`;
});

startApp();
