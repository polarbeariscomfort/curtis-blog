/*
 * Loads content/site.json and content/posts.json and renders the page.
 * You normally never need to edit this: change content through /admin instead.
 */
(function () {
  const $ = id => document.getElementById(id);

  const ICON_EXTERNAL =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3H3v10h10v-3"/><path d="M9 2h5v5"/><path d="M14 2 7 9"/></svg>';

  const state = { posts: [], activeTag: null };

  function el(tag, attrs, text) {
    const node = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null && v !== '') node.setAttribute(k, v);
    }
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeUrl(url) {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.href);
      return ['http:', 'https:', 'mailto:'].includes(u.protocol) || url.startsWith('/') ? url : '';
    } catch (e) { return ''; }
  }

  function formatDate(d) {
    const date = new Date(d);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function renderMarkdown(md) {
    if (window.marked && window.DOMPurify) {
      return window.DOMPurify.sanitize(window.marked.parse(md || ''));
    }
    // Fallback if the formatting library can't load: plain paragraphs
    const esc = (md || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return esc.split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  }

  /* ---------- Site header ---------- */
  function renderSite(site) {
    if (site.title) {
      $('site-title').textContent = site.title;
      document.title = site.title + (site.subtitle ? ' – ' + site.subtitle : '');
    }
    if (site.eyebrow) $('site-eyebrow').textContent = site.eyebrow;
    $('site-subtitle').textContent = site.subtitle || '';
    $('site-intro').textContent = site.intro || '';
    $('footer-text').textContent = site.footer || '';

    renderLetter(site.letter || {});
    renderResources(site);

    const logos = $('logos');
    logos.innerHTML = '';
    (site.logos || []).forEach(logo => {
      const a = el('a', { class: 'logo-link', href: safeUrl(logo.url), target: '_blank', rel: 'noopener', title: logo.name });
      const fallback = el('span', { class: 'logo-fallback' }, logo.name || 'Logo');
      if (logo.image) {
        const img = el('img', { src: logo.image, alt: logo.name || '' });
        img.addEventListener('error', () => img.replaceWith(fallback)); // shows the name until you upload the logo
        a.appendChild(img);
      } else {
        a.appendChild(fallback);
      }
      logos.appendChild(a);
    });

    const socials = $('socials');
    socials.innerHTML = '';
    (site.socials || []).forEach(s => {
      const href = safeUrl(s.url);
      if (!href) return;
      const a = el('a', { class: 'social', href, target: '_blank', rel: 'noopener me' }, s.label);
      a.insertAdjacentHTML('beforeend', ICON_EXTERNAL);
      socials.appendChild(a);
    });
  }

  /* ---------- Open letter: email to sign + collapsible letter ---------- */
  const ICON_MAIL =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1.5"/><path d="m2 4 6 5 6-5"/></svg>';

  function renderLetter(letter) {
    $('cta-kicker').textContent = letter.kicker || '';
    $('cta-heading').textContent = letter.heading || '';
    $('cta-body').textContent = letter.text || '';

    const box = $('cta-actions');
    box.innerHTML = '';
    $('cta-email').innerHTML = '';
    const email = (letter.email || '').trim();
    if (email) {
      const params = [];
      if (letter.email_subject) params.push('subject=' + encodeURIComponent(letter.email_subject));
      if (letter.email_body) params.push('body=' + encodeURIComponent(letter.email_body));
      const mailto = 'mailto:' + email + (params.length ? '?' + params.join('&') : '');

      const a = el('a', { class: 'btn btn-primary', href: mailto }, letter.button_label || 'Email me');
      a.insertAdjacentHTML('beforeend', ICON_MAIL);
      box.appendChild(a);

      // Copy button for people whose computer has no email app set up
      const copy = el('button', { class: 'btn btn-ghost', type: 'button' }, 'Copy email address');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(email);
          copy.textContent = 'Copied!';
        } catch (e) {
          copy.textContent = email;
        }
        setTimeout(() => { copy.textContent = 'Copy email address'; }, 2500);
      });
      box.appendChild(copy);

      const p = $('cta-email');
      p.append('Or email ');
      p.appendChild(el('a', { href: 'mailto:' + email }, email));
    }

    // The letter itself
    const card = $('letter-card');
    if (!letter.letter_body) { card.hidden = true; return; }
    card.hidden = false;
    $('letter-title').textContent = letter.letter_title || 'The open letter';
    $('letter-text').innerHTML = renderMarkdown(letter.letter_body);
    $('letter-refs').innerHTML = letter.references ? renderMarkdown(letter.references) : '';

    const body = $('letter-body');
    const toggle = $('letter-toggle');
    const label = toggle.querySelector('span');
    toggle.onclick = () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      body.classList.toggle('is-collapsed', open);
      label.textContent = open ? 'Read the full letter' : 'Show less';
      if (open) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
  }

  /* ---------- Resources ---------- */
  function renderResources(site) {
    $('resources-intro').textContent = site.resources_intro || '';
    const box = $('resource-groups');
    box.innerHTML = '';
    const items = (site.resources || []).filter(r => r && r.title && safeUrl(r.url));
    if (!items.length) return;
    // keep items from the same group together, in the order groups first appear
    const order = [...new Set(items.map(r => r.category || 'More'))];
    items.sort((a, b) => order.indexOf(a.category || 'More') - order.indexOf(b.category || 'More'));
    const grid = el('div', { class: 'resource-grid' });
    items.forEach(r => {
      const a = el('a', { class: 'resource', href: safeUrl(r.url), target: '_blank', rel: 'noopener' });
      if (r.category) a.appendChild(el('em', { class: 'resource-cat' }, r.category));
      const t = el('strong', null, r.title);
      t.insertAdjacentHTML('beforeend', ICON_EXTERNAL);
      a.appendChild(t);
      if (r.description) a.appendChild(el('span', null, r.description));
      grid.appendChild(a);
    });
    box.appendChild(grid);
  }

  /* ---------- Posts ---------- */
  function renderFilters() {
    const tags = [...new Set(state.posts.flatMap(p => p.tags || []))].sort();
    const box = $('filters');
    box.innerHTML = '';
    if (tags.length < 2) return;
    ['All', ...tags].forEach(t => {
      const tag = t === 'All' ? null : t;
      const b = el('button', { class: 'filter', type: 'button', 'aria-pressed': String(state.activeTag === tag) }, t);
      b.addEventListener('click', () => { state.activeTag = tag; renderFilters(); renderPosts(); });
      box.appendChild(b);
    });
  }

  function photosFor(post) {
    const list = [];
    if (post.cover) list.push({ image: post.cover, caption: post.cover_caption || post.title });
    (post.photos || []).forEach(p => { if (p && p.image) list.push(p); });
    return list;
  }

  function renderPosts() {
    const box = $('posts');
    box.innerHTML = '';
    const posts = state.posts.filter(p => !state.activeTag || (p.tags || []).includes(state.activeTag));

    if (!posts.length) {
      box.appendChild(el('p', { class: 'status' }, 'No posts yet. Check back soon!'));
      return;
    }

    posts.forEach(post => {
      const photos = photosFor(post);
      const article = el('article', { class: 'post' });

      if (photos.length) {
        const coverBtn = el('button', { class: 'post-cover', type: 'button', 'aria-label': 'Open photo: ' + (photos[0].caption || post.title) });
        coverBtn.appendChild(el('img', { src: photos[0].image, alt: photos[0].caption || '', loading: 'lazy' }));
        coverBtn.addEventListener('click', () => openLightbox(photos, 0));
        article.appendChild(coverBtn);
      }

      const body = el('div', { class: 'post-body' });
      const meta = el('div', { class: 'post-meta' });
      meta.appendChild(el('time', { datetime: post.date }, formatDate(post.date)));
      (post.tags || []).forEach(t => meta.appendChild(el('span', { class: 'tag' }, t)));
      body.appendChild(meta);
      body.appendChild(el('h2', null, post.title || 'Untitled'));

      const content = el('div', { class: 'post-content' });
      content.innerHTML = renderMarkdown(post.body);
      body.appendChild(content);

      if (photos.length > 1) {
        const gallery = el('div', { class: 'gallery' });
        photos.slice(1).forEach((p, i) => {
          const t = el('button', { class: 'thumb', type: 'button', 'aria-label': 'Open photo: ' + (p.caption || 'photo ' + (i + 2)) });
          t.appendChild(el('img', { src: p.image, alt: p.caption || '', loading: 'lazy' }));
          t.addEventListener('click', () => openLightbox(photos, i + 1));
          gallery.appendChild(t);
        });
        body.appendChild(gallery);
      }

      const links = (post.links || []).filter(l => safeUrl(l.url));
      if (links.length) {
        const row = el('div', { class: 'post-links' });
        links.forEach(l => {
          const a = el('a', { class: 'post-link', href: safeUrl(l.url), target: '_blank', rel: 'noopener' }, l.label || 'Link');
          a.insertAdjacentHTML('beforeend', ICON_EXTERNAL);
          row.appendChild(a);
        });
        body.appendChild(row);
      }

      article.appendChild(body);
      box.appendChild(article);
    });
  }

  /* ---------- Lightbox ---------- */
  const lb = { photos: [], i: 0, returnFocus: null };

  function showPhoto() {
    const p = lb.photos[lb.i];
    $('lb-img').src = p.image;
    $('lb-img').alt = p.caption || '';
    $('lb-cap').textContent = p.caption || '';
    $('lb-prev').hidden = $('lb-next').hidden = lb.photos.length < 2;
  }
  function openLightbox(photos, i) {
    lb.photos = photos; lb.i = i; lb.returnFocus = document.activeElement;
    showPhoto();
    $('lightbox').hidden = false;
    $('lb-close').focus();
  }
  function closeLightbox() {
    $('lightbox').hidden = true;
    if (lb.returnFocus) lb.returnFocus.focus();
  }
  function move(d) { lb.i = (lb.i + d + lb.photos.length) % lb.photos.length; showPhoto(); }

  $('lb-close').addEventListener('click', closeLightbox);
  $('lb-prev').addEventListener('click', () => move(-1));
  $('lb-next').addEventListener('click', () => move(1));
  $('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
  document.addEventListener('keydown', e => {
    if ($('lightbox').hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });

  /* ---------- Load ---------- */
  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(path + ' ' + res.status);
    return res.json();
  }

  async function init() {
    try {
      const preview = window.__PREVIEW_DATA__;
      const [site, posts] = preview
        ? [preview.site, preview.posts]
        : await Promise.all([getJSON('content/site.json'), getJSON('content/posts.json')]);
      renderSite(site || {});
      state.posts = ((posts && posts.posts) || [])
        .filter(p => !p.draft)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      renderFilters();
      renderPosts();
    } catch (err) {
      console.error(err);
      $('posts').innerHTML = '';
      $('posts').appendChild(el('p', { class: 'status' },
        'Posts could not be loaded. If you opened this file directly from your computer, view it on Netlify instead.'));
    }
  }

  init();
})();
