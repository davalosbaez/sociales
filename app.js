const SUPABASE_URL = 'https://zzejwzqdnctwjrjevgwg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mhaUX17rParkGQvV_5GxNw_IB9bgF1r';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const escapeHTML = (str = '') =>
  String(str).replace(/[&<>"']/g, m => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#039;'
  }[m]));

let currentUser = null;
let currentProfile = null;

let users = [];
let posts = [];
let news = [];
let events = [];

let calendarDate = new Date();
let selectedMedia = null;


/* =========================
   UTILIDADES
   ========================= */

function toast(message) {
  const container = $('#toast-container');

  if (!container) {
    alert(message);
    return;
  }

  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;

  container.appendChild(t);

  setTimeout(() => t.remove(), 3000);
}

const toastStyle = document.createElement('style');

toastStyle.textContent = `
.toast{
  position:fixed;
  right:20px;
  bottom:22px;
  z-index:10000;
  background:#16587B;
  color:white;
  padding:12px 16px;
  border-radius:12px;
  box-shadow:0 12px 30px rgba(0,0,0,.2);
  font-size:.82rem;
  font-weight:700;
  animation:rise .3s ease
}

.toast + .toast{
  bottom:70px
}
`;

document.head.appendChild(toastStyle);


function current() {
  return currentProfile;
}


function profileById(id) {
  return users.find(user => user.id === id) || {
    username: 'usuario',
    full_name: 'Usuario',
    avatar_url: ''
  };
}


function formatDateTime(value) {
  if (!value) return '';

  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}


function avatarHTML(user, cls = 'user-avatar') {

  const avatar = user?.avatar_url || '';

  const label =
    user?.full_name ||
    user?.username ||
    'U';

  if (avatar) {
    return `
      <img
        class="${cls}"
        src="${escapeHTML(avatar)}"
        alt=""
      >
    `;
  }

  return `
    <div class="${cls}">
      ${escapeHTML(label.charAt(0).toUpperCase())}
    </div>
  `;
}


function openModal(id) {
  $(`#${id}`)?.classList.remove('hidden');
}


function closeModal(id) {
  $(`#${id}`)?.classList.add('hidden');
}


/* =========================
   SUPABASE - PERFILES
   ========================= */

async function loadUsers() {

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .order('created_at', {
      ascending: true
    });

  if (error) {
    console.error('Error cargando perfiles:', error);
    users = [];
    return;
  }

  users = data || [];
}


async function loadCurrentProfile() {

  if (!currentUser) return null;

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser)
    .maybeSingle();

  if (error) {
    console.error('Error cargando perfil:', error);
    return null;
  }

  currentProfile = data || null;

  return currentProfile;
}


/* =========================
   AUTENTICACIÓN
   ========================= */

function showAuth(type = 'login') {

  $$('.auth-tab').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.auth === type
    );
  });

  $('#login-form')?.classList.toggle(
    'hidden',
    type !== 'login'
  );

  $('#register-form')?.classList.toggle(
    'hidden',
    type !== 'register'
  );
}


$$('.auth-tab').forEach(button => {

  button.addEventListener('click', () => {
    showAuth(button.dataset.auth);
  });

});


/* =========================
   LOGIN
   ========================= */

$('#login-form')?.addEventListener('submit', async e => {

  e.preventDefault();

  const username =
    $('#login-username').value
      .trim()
      .toLowerCase();

  const password =
    $('#login-password').value;

  if (!username || !password) {
    return toast(
      'Completá todos los campos.'
    );
  }

  const email =
    `${username}@sociales.local`;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    console.error(error);

    return toast(
      'Usuario o contraseña incorrectos.'
    );
  }

  currentUser = data.user.id;

  const profile =
    await loadCurrentProfile();

  if (!profile) {

    await supabaseClient.auth.signOut();

    currentUser = null;

    return toast(
      'La cuenta existe, pero no tiene un perfil de SOCIALES.'
    );
  }

  await startApp();

});


/* =========================
   REGISTRO
   ========================= */

$('#register-form')?.addEventListener('submit', async e => {

  e.preventDefault();

  const name =
    $('#register-name').value.trim();

  const username =
    $('#register-username').value
      .trim()
      .toLowerCase();

  const password =
    $('#register-password').value;


  if (!name || !username || !password) {
    return toast(
      'Completá todos los campos.'
    );
  }


  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {

    return toast(
      'Usá entre 3 y 24 caracteres: letras, números, punto, guion o guion bajo.'
    );

  }


  if (password.length < 6) {

    return toast(
      'La contraseña debe tener al menos 6 caracteres.'
    );

  }


  const { data: existing } =
    await supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();


  if (existing) {

    return toast(
      'Ese nombre de usuario ya existe.'
    );

  }


  const email =
    `${username}@sociales.local`;


  const { data, error } =
    await supabaseClient.auth.signUp({
      email,
      password
    });


  if (error) {

    console.error(error);

    if (/rate/i.test(error.message || '')) {

      return toast(
        'Hay demasiados intentos de registro. Probá más tarde.'
      );

    }

    return toast(error.message);
  }


  if (!data.user) {

    return toast(
      'No se pudo crear la cuenta.'
    );

  }


  /*
    Si Supabase no devuelve sesión,
    significa que la configuración actual
    requiere confirmación de correo.
  */

  if (!data.session) {

    return toast(
      'La cuenta se creó, pero Supabase requiere confirmación antes de iniciar sesión.'
    );

  }


  currentUser = data.user.id;


  const { error: profileError } =
    await supabaseClient
      .from('profiles')
      .insert({

        id: currentUser,

        username,

        full_name: name,

        bio: '',

        avatar_url: '',

        accent_color: '#16587B'

      });


  if (profileError) {

    console.error(profileError);

    return toast(
      'La cuenta se creó, pero no se pudo crear el perfil.'
    );

  }


  $('#register-form').reset();

  await startApp();

  toast(
    '¡Cuenta creada! Bienvenido/a a Sociales 💙'
  );

});


/* =========================
   INICIAR APP
   ========================= */

async function startApp() {

  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
  }

  const session = data?.session;


  if (!session) {

    currentUser = null;
    currentProfile = null;

    $('#auth-screen')?.classList.remove('hidden');
    $('#app')?.classList.add('hidden');

    return;
  }


  currentUser = session.user.id;


  const profile =
    await loadCurrentProfile();


  if (!profile) {

    $('#auth-screen')?.classList.remove('hidden');
    $('#app')?.classList.add('hidden');

    return;
  }


  $('#auth-screen')?.classList.add('hidden');
  $('#app')?.classList.remove('hidden');


  applyUserTheme();

  await renderAll();

}


/* =========================
   CERRAR SESIÓN
   ========================= */

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  users = [];
  posts = [];
  news = [];
  events = [];

  $('#app')?.classList.add('hidden');
  $('#auth-screen')?.classList.remove('hidden');

  showAuth('login');

  toast('Sesión cerrada.');

}


$('#logout-btn')?.addEventListener(
  'click',
  logout
);


/* =========================
   NAVEGACIÓN
   ========================= */

function navigate(page) {

  $$('.page').forEach(pageElement => {
    pageElement.classList.remove(
      'active-page'
    );
  });

  $(`#page-${page}`)
    ?.classList.add('active-page');


  $$('.nav-item').forEach(button => {

    button.classList.toggle(
      'active',
      button.dataset.page === page
    );

  });


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


$$('[data-page]').forEach(button => {

  button.addEventListener(
    'click',
    () => navigate(button.dataset.page)
  );

});


/* =========================
   RENDER GENERAL
   ========================= */

async function renderAll() {

  await loadUsers();

  renderMiniProfile();

  renderHeaderAvatar();

  await renderFeed();

  await renderNews();

  await renderCalendar();

  renderProfile();

}


/* =========================
   AVATAR DEL HEADER
   ========================= */

function renderHeaderAvatar() {

  const user = current();

  const avatar = $('#header-avatar');

  if (!user || !avatar) return;


  if (user.avatar_url) {

    avatar.style.backgroundImage =
      `url(${user.avatar_url})`;

    avatar.style.backgroundSize = 'cover';

    avatar.style.backgroundPosition =
      'center';

    avatar.textContent = '';

  } else {

    avatar.style.backgroundImage = 'none';

    avatar.textContent =
      (
        user.full_name ||
        user.username ||
        '?'
      )
      .charAt(0)
      .toUpperCase();

  }

}


/* =========================
   MINI PERFIL
   ========================= */

function renderMiniProfile() {

  const user = current();

  const box = $('#mini-profile');

  if (!user || !box) return;


  box.innerHTML = `

    ${avatarHTML(user, 'big-avatar')}

    <h3>
      ${escapeHTML(
        user.full_name ||
        user.username
      )}
    </h3>

    <p>
      @${escapeHTML(user.username)}
      <br>
      ${escapeHTML(
        user.bio ||
        'Todavía no agregaste una bio.'
      )}
    </p>

    <button
      class="text-btn"
      id="edit-profile-side"
    >
      Editar perfil →
    </button>

  `;


  $('#edit-profile-side').onclick =
    openProfileModal;

}


/* =========================
   TEMA
   ========================= */

function applyUserTheme() {

  const user = current();

  document.documentElement.style.setProperty(
    '--accent',
    user?.accent_color || '#16587B'
  );

}


$('#theme-toggle')?.addEventListener(
  'click',
  () => {

    document.body.classList.toggle(
      'night'
    );

    const night =
      document.body.classList.contains(
        'night'
      );


    if (night) {

      document.documentElement
        .style.setProperty(
          '--white',
          '#1c2f39'
        );

      document.documentElement
        .style.setProperty(
          '--cream',
          '#142731'
        );

      document.documentElement
        .style.setProperty(
          '--ink',
          '#eaf3f5'
        );

      document.documentElement
        .style.setProperty(
          '--muted',
          '#a9c0ca'
        );

      document.body.style.background =
        '#10222b';

      $('#theme-toggle').textContent =
        '☾';

    } else {

      document.documentElement
        .style.setProperty(
          '--white',
          '#fffdf8'
        );

      document.documentElement
        .style.setProperty(
          '--cream',
          '#F5EEDD'
        );

      document.documentElement
        .style.setProperty(
          '--ink',
          '#173D52'
        );

      document.documentElement
        .style.setProperty(
          '--muted',
          '#6d8796'
        );

      document.body.style.background =
        '#f7f3eb';

      $('#theme-toggle').textContent =
        '☼';

    }

  }
);


/* =========================
   PUBLICACIONES
   ========================= */

async function loadFeed() {

  const { data, error } =
    await supabaseClient
      .from('posts')
      .select('*')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Error cargando publicaciones:',
      error
    );

    posts = [];

    return;
  }


  const postIds =
    (data || []).map(post => post.id);


  let likes = [];
  let comments = [];


  if (postIds.length) {

    const [
      likesResult,
      commentsResult
    ] = await Promise.all([

      supabaseClient
        .from('likes')
        .select('*')
        .in(
          'post_id',
          postIds
        ),

      supabaseClient
        .from('comments')
        .select('*')
        .in(
          'post_id',
          postIds
        )
        .order(
          'created_at',
          { ascending: true }
        )

    ]);


    likes =
      likesResult.data || [];

    comments =
      commentsResult.data || [];

  }


  posts =
    (data || []).map(post => ({

      ...post,

      likes:
        likes.filter(
          like =>
            String(like.post_id) ===
            String(post.id)
        ),

      comments:
        comments.filter(
          comment =>
            String(comment.post_id) ===
            String(post.id)
        )

    }));

}


function nowTextFrom(value) {

  if (!value) return '';

  return new Intl.DateTimeFormat(
    'es-PY',
    {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(new Date(value));

}


async function renderFeed() {

  const list = $('#feed-list');

  if (!list) return;


  await loadFeed();


  if (!posts.length) {

    list.innerHTML = `

      <div class="post-card">

        <h3>
          ✦ Todavía no hay publicaciones
        </h3>

        <p>
          ¡Sé la primera persona en
          compartir algo con el curso!
        </p>

      </div>

    `;

    return;
  }


  list.innerHTML =
    posts.map(post => {

      const user =
        profileById(post.user_id);

      const liked =
        post.likes.some(
          like =>
            like.user_id === currentUser
        );

      return `

        <article
          class="post-card"
          data-post="${post.id}"
        >

          <div class="post-head">

            ${avatarHTML(user)}

            <div class="user-meta">

              <strong>
                ${escapeHTML(
                  user.full_name ||
                  user.username
                )}
              </strong>

              <span>
                @${escapeHTML(
                  user.username
                )}
                ·
                ${escapeHTML(
                  nowTextFrom(
                    post.created_at
                  )
                )}
              </span>

            </div>

            ${
              post.user_id === currentUser
                ? `
                  <button
                    class="more-btn delete-post"
                    data-id="${post.id}"
                    title="Eliminar"
                  >
                    ⋯
                  </button>
                `
                : ''
            }

          </div>


          <div class="post-text">

            ${escapeHTML(
              post.content || ''
            )}

          </div>


          ${
            post.media_url
              ? (
                  (post.media_type || '')
                    .startsWith('video')

                  ? `
                    <video
                      class="post-media"
                      controls
                      src="${post.media_url}"
                    ></video>
                  `

                  : `
                    <img
                      class="post-media"
                      src="${post.media_url}"
                      alt="Imagen publicada"
                    >
                  `
                )
              : ''
          }


          <div class="post-actions">

            <button
              class="action-btn ${
                liked ? 'liked' : ''
              } like-btn"
              data-id="${post.id}"
            >
              ${liked ? '♥' : '♡'}
              ${post.likes.length}
            </button>


            <button
              class="action-btn comment-toggle"
              data-id="${post.id}"
            >
              ◌
              ${post.comments.length}
              comentarios
            </button>


            <button
              class="action-btn share-btn"
              data-id="${post.id}"
            >
              ↗ Compartir
            </button>

          </div>


          <div
            class="comment-box"
            id="comment-${post.id}"
          >

            <input
              type="text"
              maxlength="180"
              placeholder="Escribí un comentario..."
            >

            <button
              class="primary-btn add-comment"
              data-id="${post.id}"
            >
              Enviar
            </button>

          </div>


          ${
            post.comments.length
              ? `
                <div class="comments">

                  ${
                    post.comments
                      .map(comment => {

                        const commentUser =
                          profileById(
                            comment.user_id
                          );

                        return `
                          <div class="comment">

                            <b>
                              @${escapeHTML(
                                commentUser.username
                              )}
                            </b>

                            ${escapeHTML(
                              comment.content
                            )}

                          </div>
                        `;

                      })
                      .join('')
                  }

                </div>
              `
              : ''
          }

        </article>

      `;

    }).join('');


  $$('.like-btn').forEach(button => {

    button.onclick =
      () => toggleLike(
        button.dataset.id
      );

  });


  $$('.delete-post').forEach(button => {

    button.onclick =
      () => deletePost(
        button.dataset.id
      );

  });


  $$('.comment-toggle').forEach(button => {

    button.onclick = () => {

      $(`#comment-${button.dataset.id}`)
        ?.classList.toggle('open');

    };

  });


  $$('.add-comment').forEach(button => {

    button.onclick =
      () => addComment(
        button.dataset.id
      );

  });


  $$('.share-btn').forEach(button => {

    button.onclick = async () => {

      const post =
        posts.find(
          x =>
            String(x.id) ===
            String(button.dataset.id)
        );

      if (!post) return;

      const user =
        profileById(
          post.user_id
        );

      const text =
        `${user.full_name}: ${
          post.content || ''
        }`;

      try {

        await navigator.clipboard
          .writeText(text);

        toast(
          'Texto copiado para compartir.'
        );

      } catch {

        toast(
          'No se pudo copiar automáticamente.'
        );

      }

    };

  });

}


/* =========================
   LIKES
   ========================= */

async function toggleLike(postId) {

  const post =
    posts.find(
      x =>
        String(x.id) ===
        String(postId)
    );

  if (!post) return;


  const existing =
    post.likes.find(
      like =>
        like.user_id === currentUser
    );


  let result;


  if (existing) {

    result =
      await supabaseClient
        .from('likes')
        .delete()
        .eq('id', existing.id);

  } else {

    result =
      await supabaseClient
        .from('likes')
        .insert({

          post_id:
            Number(postId),

          user_id:
            currentUser

        });

  }


  if (result.error) {

    console.error(result.error);

    return toast(
      'No se pudo actualizar el like.'
    );

  }


  await renderFeed();

  renderProfile();

}


/* =========================
   COMENTARIOS
   ========================= */

async function addComment(postId) {

  const box =
    $(`#comment-${postId}`);

  const input =
    box?.querySelector('input');

  const content =
    input?.value.trim();


  if (!content) return;


  const { error } =
    await supabaseClient
      .from('comments')
      .insert({

        post_id:
          Number(postId),

        user_id:
          currentUser,

        content

      });


  if (error) {

    console.error(error);

    return toast(
      'No se pudo publicar el comentario.'
    );

  }


  await renderFeed();

  renderProfile();

}


async function deletePost(postId) {

  if (!confirm(
    '¿Eliminar esta publicación?'
  )) return;


  const { error } =
    await supabaseClient
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', currentUser);


  if (error) {

    console.error(error);

    return toast(
      'No se pudo eliminar la publicación.'
    );

  }


  await renderFeed();

  renderProfile();

  toast(
    'Publicación eliminada.'
  );

}


/* =========================
   MODALES
   ========================= */

$$('.modal-close').forEach(button => {

  button.onclick =
    () => closeModal(
      button.dataset.close
    );

});


$$('.modal').forEach(modal => {

  modal.addEventListener(
    'click',
    event => {

      if (
        event.target === modal
      ) {
        closeModal(modal.id);
      }

    }
  );

});


/* =========================
   CREAR PUBLICACIÓN
   ========================= */

function openCreate() {

  selectedMedia = null;

  if ($('#media-name')) {
    $('#media-name').textContent = '';
  }

  $('#post-media-preview')
    ?.classList.add('hidden');

  $('#post-form')?.reset();

  openModal('create-modal');

}


if ($('#open-create')) {
  $('#open-create').onclick =
    openCreate;
}


if ($('#open-create-mobile')) {
  $('#open-create-mobile').onclick =
    openCreate;
}


async function fileToDataURL(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () => resolve(
          reader.result
        );

      reader.onerror =
        reject;

      reader.readAsDataURL(file);

    }
  );

}


async function handleMedia(
  file,
  type
) {

  if (!file) return;


  if (
    file.size >
    2 * 1024 * 1024
  ) {

    return toast(
      'Por ahora elegí una foto o video de hasta 2 MB.'
    );

  }


  selectedMedia = {

    type:
      file.type || type,

    data:
      await fileToDataURL(file),

    name:
      file.name

  };


  if ($('#media-name')) {

    $('#media-name').textContent =
      file.name;

  }


  const preview =
    $('#post-media-preview');

  if (!preview) return;


  preview.classList.remove(
    'hidden'
  );


  preview.innerHTML =
    (file.type || '')
      .startsWith('video')

      ? `
        <video
          controls
          src="${selectedMedia.data}"
        ></video>
      `

      : `
        <img
          src="${selectedMedia.data}"
          alt="Vista previa"
        >
      `;

}


if ($('#post-image')) {

  $('#post-image').onchange =
    event => {

      if ($('#post-video')) {
        $('#post-video').value = '';
      }

      handleMedia(
        event.target.files[0],
        'image'
      );

    };

}


if ($('#post-video')) {

  $('#post-video').onchange =
    event => {

      if ($('#post-image')) {
        $('#post-image').value = '';
      }

      handleMedia(
        event.target.files[0],
        'video'
      );

    };

}


$('#post-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const content =
      $('#post-text').value.trim();


    if (
      !content &&
      !selectedMedia
    ) {

      return toast(
        'Escribí algo o agregá una imagen/video.'
      );

    }


    const { error } =
      await supabaseClient
        .from('posts')
        .insert({

          user_id:
            currentUser,

          content,

          media_url:
            selectedMedia?.data || '',

          media_type:
            selectedMedia?.type || ''

        });


    if (error) {

      console.error(error);

      return toast(
        'No se pudo publicar: ' +
        error.message
      );

    }


    closeModal(
      'create-modal'
    );

    event.target.reset();

    selectedMedia = null;


    await renderFeed();

    renderProfile();


    toast(
      '¡Publicación compartida! 💙'
    );

  }
);
/* =========================
   NOTICIAS
   ========================= */

async function loadNews() {

  const { data, error } =
    await supabaseClient
      .from('news')
      .select('*')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Error cargando noticias:',
      error
    );

    news = [];

    return;
  }


  news = data || [];

}


async function renderNews() {

  const list =
    $('#news-list');

  if (!list) return;


  await loadNews();


  if (!news.length) {

    list.innerHTML = `

      <div class="news-card">

        <h3>
          No hay noticias todavía.
        </h3>

        <p>
          Podés publicar la primera
          novedad de la comunidad.
        </p>

      </div>

    `;

    return;
  }


  list.innerHTML =
    news.map(item => {

      const user =
        profileById(
          item.user_id
        );


      return `

        <article class="news-card">

          <div class="news-meta">

            <span>

              Por
              ${escapeHTML(
                user.full_name ||
                user.username
              )}

              ·

              ${escapeHTML(
                nowTextFrom(
                  item.created_at
                )
              )}

            </span>


            ${
              item.user_id === currentUser

                ? `

                  <button
                    class="delete-news delete-mini"
                    data-id="${item.id}"
                  >
                    Eliminar
                  </button>

                `

                : ''
            }

          </div>


          <h3>
            ${escapeHTML(
              item.title
            )}
          </h3>


          <p>
            ${escapeHTML(
              item.content
            )}
          </p>


          ${
            item.image_url

              ? `

                <a
                  class="news-source"
                  href="${escapeHTML(
                    item.image_url
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Ver fuente →
                </a>

              `

              : ''
          }

        </article>

      `;

    }).join('');


  $$('.delete-news').forEach(
    button => {

      button.onclick =
        () => deleteNews(
          button.dataset.id
        );

    }
  );

}


$('#open-news')?.addEventListener(
  'click',
  () => openModal(
    'news-modal'
  )
);


$('#news-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const title =
      $('#news-title')
        .value
        .trim();


    const content =
      $('#news-body')
        .value
        .trim();


    const source =
      $('#news-source')
        ?.value
        .trim() || '';


    if (!title || !content) {

      return toast(
        'Completá el título y la noticia.'
      );

    }


    const { error } =
      await supabaseClient
        .from('news')
        .insert({

          user_id:
            currentUser,

          title,

          content,

          /*
            La tabla que ya creaste
            no tiene una columna "source".
            Usamos image_url para guardar
            el enlace de la fuente.
          */

          image_url:
            source

        });


    if (error) {

      console.error(error);

      return toast(
        'No se pudo publicar la noticia: ' +
        error.message
      );

    }


    closeModal(
      'news-modal'
    );


    event.target.reset();


    await renderNews();


    toast(
      '¡Noticia publicada! 📰💙'
    );

  }
);


async function deleteNews(id) {

  if (
    !confirm(
      '¿Eliminar esta noticia?'
    )
  ) {
    return;
  }


  const { error } =
    await supabaseClient
      .from('news')
      .delete()
      .eq('id', id)
      .eq(
        'user_id',
        currentUser
      );


  if (error) {

    console.error(error);

    return toast(
      'No se pudo eliminar la noticia.'
    );

  }


  await renderNews();


  toast(
    'Noticia eliminada.'
  );

}


/* =========================
   CALENDARIO
   ========================= */

/*
  La tabla "events" que ya creaste
  tiene:

  - id
  - user_id
  - title
  - description
  - event_date
  - created_at

  Como no tiene columnas separadas
  para hora y lugar, los guardamos
  dentro de "description" como JSON.
*/


function packEventDescription(
  time,
  place
) {

  return JSON.stringify({

    time:
      time || '',

    place:
      place || ''

  });

}


function unpackEventDescription(
  value
) {

  try {

    const data =
      JSON.parse(
        value || '{}'
      );


    return {

      time:
        data.time || '',

      place:
        data.place || ''

    };

  } catch {

    return {

      time: '',

      place:
        value || ''

    };

  }

}


async function loadEvents() {

  const { data, error } =
    await supabaseClient
      .from('events')
      .select('*')
      .order(
        'event_date',
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      'Error cargando eventos:',
      error
    );

    events = [];

    return;
  }


  events = data || [];

}


async function renderCalendar() {

  await loadEvents();


  const year =
    calendarDate.getFullYear();


  const month =
    calendarDate.getMonth();


  const title =
    $('#calendar-title');


  if (title) {

    title.textContent =
      new Intl.DateTimeFormat(
        'es-PY',
        {
          month: 'long',
          year: 'numeric'
        }
      ).format(
        calendarDate
      );

  }


  const firstDay =
    new Date(
      year,
      month,
      1
    );


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    );


  const start =
    (
      firstDay.getDay() +
      6
    ) % 7;


  const cells = [];


  /*
    Días del mes anterior
  */

  for (
    let i = 0;
    i < start;
    i++
  ) {

    const date =
      new Date(
        year,
        month,
        i - start + 1
      );


    cells.push(`

      <div class="day muted">

        ${date.getDate()}

      </div>

    `);

  }


  /*
    Días del mes actual
  */

  for (
    let day = 1;
    day <= lastDay.getDate();
    day++
  ) {

    const iso =
      `${year}-${String(
        month + 1
      ).padStart(2,'0')}-${String(
        day
      ).padStart(2,'0')}`;


    const dayEvents =
      events.filter(
        event =>
          event.event_date === iso
      );


    const today =
      new Date();


    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;


    cells.push(`

      <div
        class="day
          ${isToday ? 'today' : ''}
          ${dayEvents.length ? 'has-event' : ''}
        "
        data-date="${iso}"
      >

        ${day}

        ${
          dayEvents.length
            ? '<span class="dot"></span>'
            : ''
        }

      </div>

    `);

  }


  /*
    Completar última fila
  */

  while (
    cells.length % 7
  ) {

    cells.push(`

      <div class="day muted"></div>

    `);

  }


  const grid =
    $('#calendar-grid');


  if (grid) {

    grid.innerHTML =
      cells.join('');

  }


  renderEvents();

}


function renderEvents() {

  const list =
    $('#events-list');


  if (!list) return;


  const sorted =
    [...events].sort(
      (a, b) =>
        a.event_date.localeCompare(
          b.event_date
        )
    );


  if (!sorted.length) {

    list.innerHTML = `

      <p
        style="
          color:#7d929d;
          font-size:.8rem
        "
      >
        No hay fechas agregadas.
      </p>

    `;

    return;
  }


  list.innerHTML =
    sorted.map(event => {

      const meta =
        unpackEventDescription(
          event.description
        );


      const creator =
        profileById(
          event.user_id
        );


      return `

        <div class="event-item">

          ${
            event.user_id === currentUser

              ? `

                <button
                  class="delete-mini delete-event"
                  data-id="${event.id}"
                >
                  ×
                </button>

              `

              : ''
          }


          <div class="event-date">

            ${new Intl.DateTimeFormat(
              'es-PY',
              {
                day: '2-digit',
                month: 'short'
              }
            ).format(
              new Date(
                event.event_date +
                'T12:00'
              )
            )}

            ${
              meta.time
                ? ` · ${escapeHTML(
                    meta.time
                  )}`
                : ''
            }

          </div>


          <strong>

            ${escapeHTML(
              event.title
            )}

          </strong>


          <small>

            ${escapeHTML(
              meta.place ||
              'Sin lugar indicado'
            )}

            ·

            @${escapeHTML(
              creator.username
            )}

          </small>

        </div>

      `;

    }).join('');


  $$('.delete-event').forEach(
    button => {

      button.onclick =
        () => deleteEvent(
          button.dataset.id
        );

    }
  );

}


/* =========================
   CAMBIAR MES
   ========================= */

$('#prev-month')?.addEventListener(
  'click',
  () => {

    calendarDate.setMonth(
      calendarDate.getMonth() - 1
    );

    renderCalendar();

  }
);


$('#next-month')?.addEventListener(
  'click',
  () => {

    calendarDate.setMonth(
      calendarDate.getMonth() + 1
    );

    renderCalendar();

  }
);


/* =========================
   ABRIR NUEVO EVENTO
   ========================= */

$('#open-event')?.addEventListener(
  'click',
  () => {

    if ($('#event-date')) {

      const today =
        new Date();


      const year =
        today.getFullYear();


      const month =
        String(
          today.getMonth() + 1
        ).padStart(2,'0');


      const day =
        String(
          today.getDate()
        ).padStart(2,'0');


      $('#event-date').value =
        `${year}-${month}-${day}`;

    }


    openModal(
      'event-modal'
    );

  }
);


/* =========================
   CREAR EVENTO
   ========================= */

$('#event-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const title =
      $('#event-title')
        .value
        .trim();


    const eventDate =
      $('#event-date')
        .value;


    const time =
      $('#event-time')
        ?.value || '';


    const place =
      $('#event-place')
        ?.value
        .trim() || '';


    if (
      !title ||
      !eventDate
    ) {

      return toast(
        'Completá el título y la fecha.'
      );

    }


    const { error } =
      await supabaseClient
        .from('events')
        .insert({

          user_id:
            currentUser,

          title,

          description:
            packEventDescription(
              time,
              place
            ),

          event_date:
            eventDate

        });


    if (error) {

      console.error(error);

      return toast(
        'No se pudo agregar la fecha: ' +
        error.message
      );

    }


    closeModal(
      'event-modal'
    );


    event.target.reset();


    await renderCalendar();


    toast(
      '¡Fecha agregada al calendario! 📅'
    );

  }
);


/* =========================
   ELIMINAR EVENTO
   ========================= */

async function deleteEvent(id) {

  if (
    !confirm(
      '¿Eliminar esta fecha?'
    )
  ) {

    return;

  }


  const { error } =
    await supabaseClient
      .from('events')
      .delete()
      .eq('id', id)
      .eq(
        'user_id',
        currentUser
      );


  if (error) {

    console.error(error);

    return toast(
      'No se pudo eliminar la fecha.'
    );

  }


  await renderCalendar();


  toast(
    'Fecha eliminada.'
  );

}
/* =========================
   NOTICIAS
   ========================= */

async function loadNews() {

  const { data, error } =
    await supabaseClient
      .from('news')
      .select('*')
      .order('created_at', {
        ascending: false
      });


  if (error) {

    console.error(
      'Error cargando noticias:',
      error
    );

    news = [];

    return;
  }


  news = data || [];

}


async function renderNews() {

  const list =
    $('#news-list');

  if (!list) return;


  await loadNews();


  if (!news.length) {

    list.innerHTML = `

      <div class="news-card">

        <h3>
          No hay noticias todavía.
        </h3>

        <p>
          Podés publicar la primera
          novedad de la comunidad.
        </p>

      </div>

    `;

    return;
  }


  list.innerHTML =
    news.map(item => {

      const user =
        profileById(
          item.user_id
        );


      return `

        <article class="news-card">

          <div class="news-meta">

            <span>

              Por
              ${escapeHTML(
                user.full_name ||
                user.username
              )}

              ·

              ${escapeHTML(
                nowTextFrom(
                  item.created_at
                )
              )}

            </span>


            ${
              item.user_id === currentUser

                ? `

                  <button
                    class="delete-news delete-mini"
                    data-id="${item.id}"
                  >
                    Eliminar
                  </button>

                `

                : ''
            }

          </div>


          <h3>
            ${escapeHTML(
              item.title
            )}
          </h3>


          <p>
            ${escapeHTML(
              item.content
            )}
          </p>


          ${
            item.image_url

              ? `

                <a
                  class="news-source"
                  href="${escapeHTML(
                    item.image_url
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Ver fuente →
                </a>

              `

              : ''
          }

        </article>

      `;

    }).join('');


  $$('.delete-news').forEach(
    button => {

      button.onclick =
        () => deleteNews(
          button.dataset.id
        );

    }
  );

}


$('#open-news')?.addEventListener(
  'click',
  () => openModal(
    'news-modal'
  )
);


$('#news-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const title =
      $('#news-title')
        .value
        .trim();


    const content =
      $('#news-body')
        .value
        .trim();


    const source =
      $('#news-source')
        ?.value
        .trim() || '';


    if (!title || !content) {

      return toast(
        'Completá el título y la noticia.'
      );

    }


    const { error } =
      await supabaseClient
        .from('news')
        .insert({

          user_id:
            currentUser,

          title,

          content,

          /*
            La tabla que ya creaste
            no tiene una columna "source".
            Usamos image_url para guardar
            el enlace de la fuente.
          */

          image_url:
            source

        });


    if (error) {

      console.error(error);

      return toast(
        'No se pudo publicar la noticia: ' +
        error.message
      );

    }


    closeModal(
      'news-modal'
    );


    event.target.reset();


    await renderNews();


    toast(
      '¡Noticia publicada! 📰💙'
    );

  }
);


async function deleteNews(id) {

  if (
    !confirm(
      '¿Eliminar esta noticia?'
    )
  ) {
    return;
  }


  const { error } =
    await supabaseClient
      .from('news')
      .delete()
      .eq('id', id)
      .eq(
        'user_id',
        currentUser
      );


  if (error) {

    console.error(error);

    return toast(
      'No se pudo eliminar la noticia.'
    );

  }


  await renderNews();


  toast(
    'Noticia eliminada.'
  );

}


/* =========================
   CALENDARIO
   ========================= */

/*
  La tabla "events" que ya creaste
  tiene:

  - id
  - user_id
  - title
  - description
  - event_date
  - created_at

  Como no tiene columnas separadas
  para hora y lugar, los guardamos
  dentro de "description" como JSON.
*/


function packEventDescription(
  time,
  place
) {

  return JSON.stringify({

    time:
      time || '',

    place:
      place || ''

  });

}


function unpackEventDescription(
  value
) {

  try {

    const data =
      JSON.parse(
        value || '{}'
      );


    return {

      time:
        data.time || '',

      place:
        data.place || ''

    };

  } catch {

    return {

      time: '',

      place:
        value || ''

    };

  }

}


async function loadEvents() {

  const { data, error } =
    await supabaseClient
      .from('events')
      .select('*')
      .order(
        'event_date',
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      'Error cargando eventos:',
      error
    );

    events = [];

    return;
  }


  events = data || [];

}


async function renderCalendar() {

  await loadEvents();


  const year =
    calendarDate.getFullYear();


  const month =
    calendarDate.getMonth();


  const title =
    $('#calendar-title');


  if (title) {

    title.textContent =
      new Intl.DateTimeFormat(
        'es-PY',
        {
          month: 'long',
          year: 'numeric'
        }
      ).format(
        calendarDate
      );

  }


  const firstDay =
    new Date(
      year,
      month,
      1
    );


  const lastDay =
    new Date(
      year,
      month + 1,
      0
    );


  const start =
    (
      firstDay.getDay() +
      6
    ) % 7;


  const cells = [];


  /*
    Días del mes anterior
  */

  for (
    let i = 0;
    i < start;
    i++
  ) {

    const date =
      new Date(
        year,
        month,
        i - start + 1
      );


    cells.push(`

      <div class="day muted">

        ${date.getDate()}

      </div>

    `);

  }


  /*
    Días del mes actual
  */

  for (
    let day = 1;
    day <= lastDay.getDate();
    day++
  ) {

    const iso =
      `${year}-${String(
        month + 1
      ).padStart(2,'0')}-${String(
        day
      ).padStart(2,'0')}`;


    const dayEvents =
      events.filter(
        event =>
          event.event_date === iso
      );


    const today =
      new Date();


    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;


    cells.push(`

      <div
        class="day
          ${isToday ? 'today' : ''}
          ${dayEvents.length ? 'has-event' : ''}
        "
        data-date="${iso}"
      >

        ${day}

        ${
          dayEvents.length
            ? '<span class="dot"></span>'
            : ''
        }

      </div>

    `);

  }


  /*
    Completar última fila
  */

  while (
    cells.length % 7
  ) {

    cells.push(`

      <div class="day muted"></div>

    `);

  }


  const grid =
    $('#calendar-grid');


  if (grid) {

    grid.innerHTML =
      cells.join('');

  }


  renderEvents();

}


function renderEvents() {

  const list =
    $('#events-list');


  if (!list) return;


  const sorted =
    [...events].sort(
      (a, b) =>
        a.event_date.localeCompare(
          b.event_date
        )
    );


  if (!sorted.length) {

    list.innerHTML = `

      <p
        style="
          color:#7d929d;
          font-size:.8rem
        "
      >
        No hay fechas agregadas.
      </p>

    `;

    return;
  }


  list.innerHTML =
    sorted.map(event => {

      const meta =
        unpackEventDescription(
          event.description
        );


      const creator =
        profileById(
          event.user_id
        );


      return `

        <div class="event-item">

          ${
            event.user_id === currentUser

              ? `

                <button
                  class="delete-mini delete-event"
                  data-id="${event.id}"
                >
                  ×
                </button>

              `

              : ''
          }


          <div class="event-date">

            ${new Intl.DateTimeFormat(
              'es-PY',
              {
                day: '2-digit',
                month: 'short'
              }
            ).format(
              new Date(
                event.event_date +
                'T12:00'
              )
            )}

            ${
              meta.time
                ? ` · ${escapeHTML(
                    meta.time
                  )}`
                : ''
            }

          </div>


          <strong>

            ${escapeHTML(
              event.title
            )}

          </strong>


          <small>

            ${escapeHTML(
              meta.place ||
              'Sin lugar indicado'
            )}

            ·

            @${escapeHTML(
              creator.username
            )}

          </small>

        </div>

      `;

    }).join('');


  $$('.delete-event').forEach(
    button => {

      button.onclick =
        () => deleteEvent(
          button.dataset.id
        );

    }
  );

}


/* =========================
   CAMBIAR MES
   ========================= */

$('#prev-month')?.addEventListener(
  'click',
  () => {

    calendarDate.setMonth(
      calendarDate.getMonth() - 1
    );

    renderCalendar();

  }
);


$('#next-month')?.addEventListener(
  'click',
  () => {

    calendarDate.setMonth(
      calendarDate.getMonth() + 1
    );

    renderCalendar();

  }
);


/* =========================
   ABRIR NUEVO EVENTO
   ========================= */

$('#open-event')?.addEventListener(
  'click',
  () => {

    if ($('#event-date')) {

      const today =
        new Date();


      /*
        Se usa la fecha local
        para evitar problemas de
        zona horaria.
      */

      const year =
        today.getFullYear();


      const month =
        String(
          today.getMonth() + 1
        ).padStart(2,'0');


      const day =
        String(
          today.getDate()
        ).padStart(2,'0');


      $('#event-date').value =
        `${year}-${month}-${day}`;

    }


    openModal(
      'event-modal'
    );

  }
);


/* =========================
   CREAR EVENTO
   ========================= */

$('#event-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const title =
      $('#event-title')
        .value
        .trim();


    const eventDate =
      $('#event-date')
        .value;


    const time =
      $('#event-time')
        ?.value || '';


    const place =
      $('#event-place')
        ?.value
        .trim() || '';


    if (
      !title ||
      !eventDate
    ) {

      return toast(
        'Completá el título y la fecha.'
      );

    }


    const { error } =
      await supabaseClient
        .from('events')
        .insert({

          user_id:
            currentUser,

          title,

          description:
            packEventDescription(
              time,
              place
            ),

          event_date:
            eventDate

        });


    if (error) {

      console.error(error);

      return toast(
        'No se pudo agregar la fecha: ' +
        error.message
      );

    }


    closeModal(
      'event-modal'
    );


    event.target.reset();


    await renderCalendar();


    toast(
      '¡Fecha agregada al calendario! 📅'
    );

  }
);


/* =========================
   ELIMINAR EVENTO
   ========================= */

async function deleteEvent(id) {

  if (
    !confirm(
      '¿Eliminar esta fecha?'
    )
  ) {

    return;

  }


  const { error } =
    await supabaseClient
      .from('events')
      .delete()
      .eq('id', id)
      .eq(
        'user_id',
        currentUser
      );


  if (error) {

    console.error(error);

    return toast(
      'No se pudo eliminar la fecha.'
    );

  }


  await renderCalendar();


  toast(
    'Fecha eliminada.'
  );

}


/* =========================
   PERFIL
   ========================= */

function renderProfile() {

  const user =
    current();


  const view =
    $('#profile-view');


  if (
    !user ||
    !view
  ) {

    return;

  }


  const mine =
    posts.filter(
      post =>
        post.user_id ===
        currentUser
    );


  view.innerHTML = `

    <div class="profile-header">

      <div class="profile-cover"></div>


      <div class="profile-info">

        ${avatarHTML(
          user,
          'profile-avatar'
        )}


        <div class="profile-actions">

          <button
            class="primary-btn"
            id="edit-profile"
          >
            Editar perfil
          </button>

        </div>


        <h2>

          ${escapeHTML(
            user.full_name ||
            user.username
          )}

        </h2>


        <span class="handle">

          @${escapeHTML(
            user.username
          )}

        </span>


        <p>

          ${escapeHTML(
            user.bio ||
            'Agregá una bio para contarle a la comunidad quién sos.'
          )}

        </p>


        <small
          style="color:#8097a2"
        >

          ${mine.length}

          publicación${
            mine.length === 1
              ? ''
              : 'es'
          }

        </small>

      </div>

    </div>


    <div class="profile-tabs">

      <button
        class="profile-tab active"
      >
        Publicaciones
      </button>

    </div>


    <div class="profile-posts">

      ${
        mine.length

          ? mine
              .map(
                renderCompactPost
              )
              .join('')

          : `

            <p
              style="
                color:#78909c
              "
            >
              Todavía no publicaste nada.
            </p>

          `
      }

    </div>

  `;


  $('#edit-profile').onclick =
    openProfileModal;

}


function renderCompactPost(post) {

  let media = '';


  if (post.media_url) {

    if (
      (
        post.media_type ||
        ''
      ).startsWith('video')
    ) {

      media = `

        <video
          class="post-media"
          controls
          src="${post.media_url}"
        ></video>

      `;

    } else {

      media = `

        <img
          class="post-media"
          src="${post.media_url}"
          alt=""
        >

      `;

    }

  }


  return `

    <article
      class="post-card"
      style="
        box-shadow:none;
        margin-bottom:12px
      "
    >

      <div class="post-text">

        ${escapeHTML(
          post.content || ''
        )}

      </div>


      ${media}


      <div class="post-actions">

        <span class="action-btn">

          ♡
          ${post.likes?.length || 0}

        </span>


        <span class="action-btn">

          ${post.comments?.length || 0}
          comentarios

        </span>

      </div>

    </article>

  `;

}


/* =========================
   ABRIR EDITAR PERFIL
   ========================= */

function openProfileModal() {

  const user =
    current();


  if (!user) return;


  if ($('#profile-name')) {

    $('#profile-name').value =
      user.full_name || '';

  }


  if ($('#profile-bio')) {

    $('#profile-bio').value =
      user.bio || '';

  }


  if ($('#profile-accent')) {

    $('#profile-accent').value =
      user.accent_color ||
      '#16587B';

  }


  if ($('#profile-avatar')) {

    $('#profile-avatar').value =
      '';

  }


  /*
    Si tu HTML ya tiene un campo
    #profile-username, también
    lo cargamos automáticamente.
  */

  if ($('#profile-username')) {

    $('#profile-username').value =
      user.username || '';

  }


  openModal(
    'profile-modal'
  );

}


/* =========================
   GUARDAR PERFIL
   ========================= */

$('#profile-form')?.addEventListener(
  'submit',
  async event => {

    event.preventDefault();


    const fullName =
      $('#profile-name')
        ?.value
        .trim() ||
      currentProfile.full_name;


    const bio =
      $('#profile-bio')
        ?.value
        .trim() || '';


    const accent =
      $('#profile-accent')
        ?.value ||
      '#16587B';


    let avatarUrl =
      currentProfile.avatar_url ||
      '';


    const file =
      $('#profile-avatar')
        ?.files?.[0];


    if (file) {

      if (
        file.size >
        1 * 1024 * 1024
      ) {

        return toast(
          'La foto de perfil debe pesar menos de 1 MB.'
        );

      }


      avatarUrl =
        await fileToDataURL(
          file
        );

    }


    const updateData = {

      full_name:
        fullName,

      bio,

      accent_color:
        accent,

      avatar_url:
        avatarUrl

    };


    /*
      Solo actualizamos username
      si realmente existe el campo
      en el HTML.
    */

    if ($('#profile-username')) {

      const newUsername =
        $('#profile-username')
          .value
          .trim()
          .toLowerCase();


      if (
        !/^[a-z0-9._-]{3,24}$/
          .test(newUsername)
      ) {

        return toast(
          'El usuario debe tener entre 3 y 24 caracteres válidos.'
        );

      }


      if (
        newUsername !==
        currentProfile.username
      ) {

        const { data: taken } =
          await supabaseClient
            .from('profiles')
            .select('id')
            .eq(
              'username',
              newUsername
            )
            .neq(
              'id',
              currentUser
            )
            .maybeSingle();


        if (taken) {

          return toast(
            'Ese @usuario ya está ocupado.'
          );

        }


        updateData.username =
          newUsername;

      }

    }


    const { error } =
      await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq(
          'id',
          currentUser
        );


    if (error) {

      console.error(error);

      return toast(
        'No se pudo actualizar el perfil: ' +
        error.message
      );

    }


    await loadUsers();

    await loadCurrentProfile();


    applyUserTheme();

    renderMiniProfile();

    renderHeaderAvatar();

    await renderFeed();

    await renderNews();

    await renderCalendar();

    renderProfile();


    closeModal(
      'profile-modal'
    );


    toast(
      '¡Perfil actualizado! 💙'
    );

  }
);


if ($('#header-avatar')) {

  $('#header-avatar').onclick =
    openProfileModal;

}
/* =========================
   BÚSQUEDA
   ========================= */

function renderSearchResults(
  query
) {

  const results =
    $('#search-results');


  if (!results) return;


  const q =
    query
      .trim()
      .toLowerCase();


  if (!q) {

    results.innerHTML = '';

    return;

  }


  const matchingUsers =
    users.filter(user => {

      const name =
        (
          user.full_name ||
          ''
        ).toLowerCase();


      const username =
        (
          user.username ||
          ''
        ).toLowerCase();


      return (
        name.includes(q) ||
        username.includes(q)
      );

    });


  const matchingPosts =
    posts.filter(post => {

      const content =
        (
          post.content ||
          ''
        ).toLowerCase();


      return content.includes(q);

    });


  let html = '';


  if (matchingUsers.length) {

    html += `

      <section class="search-section">

        <h3>
          Personas
        </h3>

        ${matchingUsers
          .map(user => `

            <div
              class="search-user"
              data-user-id="${user.id}"
            >

              ${avatarHTML(
                user,
                'search-avatar'
              )}

              <div>

                <strong>
                  ${escapeHTML(
                    user.full_name ||
                    user.username
                  )}
                </strong>

                <span>
                  @${escapeHTML(
                    user.username
                  )}
                </span>

              </div>

            </div>

          `)
          .join('')}

      </section>

    `;

  }


  if (matchingPosts.length) {

    html += `

      <section class="search-section">

        <h3>
          Publicaciones
        </h3>

        ${matchingPosts
          .slice(0, 10)
          .map(post => {

            const user =
              profileById(
                post.user_id
              );


            return `

              <article
                class="search-post"
              >

                <strong>

                  @${escapeHTML(
                    user.username
                  )}

                </strong>

                <p>

                  ${escapeHTML(
                    post.content ||
                    ''
                  )}

                </p>

              </article>

            `;

          })
          .join('')}

      </section>

    `;

  }


  if (!html) {

    html = `

      <p
        style="
          color:#78909c;
          padding:12px
        "
      >
        No encontramos resultados.
      </p>

    `;

  }


  results.innerHTML =
    html;


  $$('.search-user').forEach(
    item => {

      item.addEventListener(
        'click',
        () => {

          const id =
            item.dataset.userId;


          const user =
            profileById(id);


          if (!user) return;


          openPublicProfile(
            user
          );

        }
      );

    }
  );

}


$('#search-input')?.addEventListener(
  'input',
  event => {

    renderSearchResults(
      event.target.value
    );

  }
);


/* =========================
   PERFIL PÚBLICO
   ========================= */

function openPublicProfile(
  user
) {

  const userPosts =
    posts.filter(
      post =>
        post.user_id ===
        user.id
    );


  const modal =
    $('#public-profile-modal');


  if (!modal) {

    /*
      Si el HTML no tiene un modal
      especial para perfiles públicos,
      mostramos la información
      directamente en un modal
      genérico si existe.
    */

    const profileView =
      $('#profile-view');


    if (profileView) {

      profileView.innerHTML = `

        <div class="profile-header">

          <div class="profile-info">

            ${avatarHTML(
              user,
              'profile-avatar'
            )}

            <h2>

              ${escapeHTML(
                user.full_name ||
                user.username
              )}

            </h2>

            <span class="handle">

              @${escapeHTML(
                user.username
              )}

            </span>

            <p>

              ${escapeHTML(
                user.bio || ''
              )}

            </p>

          </div>

        </div>


        <div class="profile-posts">

          ${
            userPosts.length

              ? userPosts
                  .map(
                    renderCompactPost
                  )
                  .join('')

              : `

                <p
                  style="
                    color:#78909c
                  "
                >
                  Esta persona todavía
                  no publicó nada.
                </p>

              `
          }

        </div>

      `;

    }


    return;

  }


  const content =
    modal.querySelector(
      '.public-profile-content'
    );


  if (!content) return;


  content.innerHTML = `

    <div class="profile-info">

      ${avatarHTML(
        user,
        'profile-avatar'
      )}


      <h2>

        ${escapeHTML(
          user.full_name ||
          user.username
        )}

      </h2>


      <span class="handle">

        @${escapeHTML(
          user.username
        )}

      </span>


      <p>

        ${escapeHTML(
          user.bio || ''
        )}

      </p>

    </div>


    <div class="profile-posts">

      ${
        userPosts.length

          ? userPosts
              .map(
                renderCompactPost
              )
              .join('')

          : `

            <p>
              Esta persona todavía
              no publicó nada.
            </p>

          `
      }

    </div>

  `;


  openModal(
    'public-profile-modal'
  );

}


/* =========================
   NAVEGACIÓN DE SECCIONES
   ========================= */

$$('[data-section]').forEach(
  button => {

    button.addEventListener(
      'click',
      async () => {

        const section =
          button.dataset.section;


        if (!section) return;


        $$('.app-section').forEach(
          item => {

            item.classList.toggle(
              'active',
              item.id ===
                section
            );

          }
        );


        $$('[data-section]').forEach(
          item => {

            item.classList.toggle(
              'active',
              item === button
            );

          }
        );


        if (
          section === 'home' ||
          section === 'feed'
        ) {

          await renderFeed();

        }


        if (
          section === 'news'
        ) {

          await renderNews();

        }


        if (
          section === 'calendar'
        ) {

          await renderCalendar();

        }


        if (
          section === 'profile'
        ) {

          renderProfile();

        }

      }
    );

  }
);


/* =========================
   CERRAR BÚSQUEDA
   ========================= */

$('#close-search')?.addEventListener(
  'click',
  () => {

    const input =
      $('#search-input');


    if (input) {

      input.value = '';

    }


    renderSearchResults('');

  }
);


/* =========================
   MODALES
   ========================= */

$$('[data-close-modal]').forEach(
  button => {

    button.addEventListener(
      'click',
      () => {

        closeModal(
          button.dataset.closeModal
        );

      }
    );

  }
);


$$('.modal').forEach(
  modal => {

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target ===
          modal
        ) {

          modal.classList.remove(
            'open'
          );

        }

      }
    );

  }
);


/* =========================
   ESC PARA CERRAR MODALES
   ========================= */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key !== 'Escape'
    ) {

      return;

    }


    $$('.modal.open').forEach(
      modal => {

        modal.classList.remove(
          'open'
        );

      }
    );

  }
);


/* =========================
   ACTUALIZACIÓN EN TIEMPO REAL
   ========================= */

/*
  Esto hace que cuando una persona
  publique, dé like, comente,
  agregue una noticia o una fecha,
  los demás usuarios puedan recibir
  la actualización sin tener que
  recargar manualmente.
*/


supabaseClient
  .channel(
    'sociales-realtime'
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'posts'
    },
    async () => {

      await loadUsers();

      await renderFeed();

      renderProfile();

    }
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'likes'
    },
    async () => {

      await renderFeed();

    }
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'comments'
    },
    async () => {

      await renderFeed();

    }
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'profiles'
    },
    async () => {

      await loadUsers();

      await loadCurrentProfile();

      renderHeaderAvatar();

      renderMiniProfile();

      applyUserTheme();

      renderProfile();

    }
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'news'
    },
    async () => {

      await renderNews();

    }
  )


  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'events'
    },
    async () => {

      await renderCalendar();

    }
  )


  .subscribe();


/* =========================
   RECARGAR TODO
   ========================= */

async function refreshEverything() {

  await loadUsers();

  await loadCurrentProfile();

  await loadFeed();

  await loadNews();

  await loadEvents();


  renderHeaderAvatar();

  renderMiniProfile();

  applyUserTheme();

  renderProfile();

  await renderFeed();

  await renderNews();

  await renderCalendar();

}


/* =========================
   BOTÓN DE ACTUALIZAR
   ========================= */

$('#refresh-btn')?.addEventListener(
  'click',
  async () => {

    await refreshEverything();

    toast(
      '¡Contenido actualizado! ✨'
    );

  }
);


/* =========================
   DETECTAR CAMBIO DE SESIÓN
   ========================= */

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (
      event ===
      'SIGNED_OUT'
    ) {

      currentUser =
        null;

      currentProfile =
        null;

      users = [];

      posts = [];

      news = [];

      events = [];

      showAuth();

      return;

    }


    if (
      event ===
        'SIGNED_IN' &&
      session?.user
    ) {

      currentUser =
        session.user.id;


      await startApp();

    }

  }
);


/* =========================
   COMPROBAR SESIÓN AL CARGAR
   ========================= */

(async function boot() {

  try {

    const {
      data: {
        session
      }
    } =
      await supabaseClient
        .auth
        .getSession();


    if (
      session?.user
    ) {

      currentUser =
        session.user.id;


      await startApp();

    } else {

      showAuth();

    }

  } catch (error) {

    console.error(
      'Error iniciando la aplicación:',
      error
    );


    showAuth();


    toast(
      'No se pudo iniciar la aplicación.'
    );

  }

})();
