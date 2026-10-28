/* EDDIE13S — shared site script.
 * Renders every page from posts.json + content.json, so posts never 404.
 * Admin: type "admin" in the home-page search box. Edits are committed to this
 * repo through the GitHub API, so everyone sees them once Pages rebuilds (~1 min). */
(() => {
    'use strict';

    const REPO = { owner: 'ed13s', repo: 'ed13s.github.io', branch: 'main' };
    const API = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;
    const FORMSPREE = 'https://formspree.io/f/xgooelrv';
    const TOKEN_KEY = 'ed_gh_token';
    const LOGO = 'https://eddie13s.wordpress.com/wp-content/uploads/2026/01/img_4202-removebg-preview.png';
    const PAGE = document.body.dataset.page || 'home';

    const DEFAULT_CONTENT = {
        siteName: 'EDDIE13S',
        birthday: '2010-04-06',
        bio: 'I am Eddie, {age} years old. Specializing in cyber security software and secure programming.',
        about: '<p>My name is Eddie, I am {age}. I like to program software relating to cyber security.</p>',
        projects: '<p>Projects coming soon.</p>',
        feedbackIntro: '',
        contactIntro: '',
        footer: '© Eddie13S'
    };

    const state = { posts: [], content: { ...DEFAULT_CONTENT }, loadError: null };

    /* ---------- tiny helpers ---------- */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const store = {
        get: k => { try { return localStorage.getItem(k); } catch { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
        del: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } }
    };
    const isAdmin = () => !!store.get(TOKEN_KEY);
    const fmtDate = iso => {
        const d = new Date(iso);
        return isNaN(d) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    };
    const stripTags = html => { const t = document.createElement('template'); t.innerHTML = html || ''; return t.content.textContent || ''; };
    const slugify = t => t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'post';
    const todayISO = () => new Date().toISOString();
    const sortPosts = posts => posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    function toast(msg, isErr = false) {
        const t = $('#toast');
        if (!t) return;
        t.textContent = msg;
        t.className = 'show' + (isErr ? ' err' : '');
        clearTimeout(toast._t);
        toast._t = setTimeout(() => { t.className = ''; }, isErr ? 6000 : 4000);
    }

    /* ---------- content safety: bodies are admin-written HTML, so strip anything scripty ---------- */
    function sanitize(html) {
        const t = document.createElement('template');
        t.innerHTML = html || '';
        t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,base,noscript').forEach(n => n.remove());
        t.content.querySelectorAll('*').forEach(el => {
            [...el.attributes].forEach(a => {
                const n = a.name.toLowerCase();
                const v = a.value.replace(/\s/g, '').toLowerCase();
                if (n.startsWith('on') || n === 'srcdoc' || n === 'style') el.removeAttribute(a.name);
                else if (['href', 'src', 'action', 'formaction', 'xlink:href'].includes(n) && /^(javascript|data|vbscript):/.test(v)) el.removeAttribute(a.name);
            });
            if (el.tagName === 'A' && el.getAttribute('target') === '_blank') el.setAttribute('rel', 'noopener noreferrer');
        });
        return t.innerHTML;
    }
    // {age} in any text is replaced with the age worked out from content.birthday
    function ageNow() {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(state.content.birthday || '');
        if (!m) return '';
        const now = new Date();
        let age = now.getFullYear() - +m[1];
        if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) age--;
        return age;
    }
    const tokens = t => String(t ?? '').replace(/\{age\}/g, ageNow());
    const render = html => sanitize(tokens(html))
        .replace(/\[feedback-form\]/g, formHTML('feedback'))
        .replace(/\[contact-form\]/g, formHTML('contact'));

    function formHTML(kind) {
        const fb = kind === 'feedback';
        return `<form class="site-form" data-formspree="${FORMSPREE}" data-kind="${kind}">
            <label>Name<input name="name" required></label>
            <label>Email<input type="email" name="email" required></label>
            ${fb ? `<label>Website rating<select name="rating" required>
                <option value="">Choose…</option><option value="5">5 – Excellent</option><option value="4">4 – Good</option>
                <option value="3">3 – Average</option><option value="2">2 – Poor</option><option value="1">1 – Very bad</option></select></label>` : ''}
            <label>${fb ? 'How could the site be improved?' : 'Message'}<textarea name="message" rows="6" ${fb ? '' : 'required'}></textarea></label>
            <input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
            <input type="hidden" name="_subject" value="${fb ? 'Website feedback' : 'Contact form'}">
            <button class="btn primary" type="submit">${fb ? 'Send Feedback' : 'Contact Me'}</button>
            <p class="form-status" role="status"></p>
        </form>`;
    }

    document.addEventListener('submit', async e => {
        const f = e.target.closest && e.target.closest('form[data-formspree]');
        if (!f) return;
        e.preventDefault();
        const status = $('.form-status', f);
        const btn = $('button[type=submit]', f);
        btn.disabled = true;
        status.textContent = 'Sending…';
        try {
            const r = await fetch(f.dataset.formspree, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
            if (!r.ok) throw new Error('bad status');
            f.reset();
            status.textContent = 'Thank you for your response. ✨';
        } catch {
            status.textContent = 'Something went wrong. Please try again.';
        }
        btn.disabled = false;
    });

    /* ---------- data loading ---------- */
    async function loadJSON(file) {
        const r = await fetch(`${file}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
        return r.json();
    }
    async function loadPublic() {
        try {
            const [p, c] = await Promise.all([loadJSON('posts.json'), loadJSON('content.json')]);
            state.posts = sortPosts(p.posts || []);
            state.content = { ...DEFAULT_CONTENT, ...c };
        } catch (err) {
            state.loadError = err.message;
        }
    }

    /* ---------- GitHub (admin writes) ---------- */
    function toB64(str) {
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
    }
    function fromB64(b64) {
        const bin = atob(b64.replace(/\s/g, ''));
        return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
    }
    async function gh(path, opts = {}) {
        const r = await fetch(API + path, {
            cache: 'no-store',
            ...opts,
            headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + store.get(TOKEN_KEY), ...(opts.headers || {}) }
        });
        if (!r.ok) {
            let m = '';
            try { m = (await r.json()).message; } catch { /* ignore */ }
            const hint = r.status === 401 ? ' (token invalid or expired, log out and connect again)' : r.status === 403 || r.status === 404 ? ' (does the token have Contents: read and write on this repo?)' : '';
            throw new Error(`GitHub ${r.status}: ${m}${hint}`);
        }
        return r.json();
    }
    async function ghRead(file) {
        const j = await gh(`/contents/${file}?ref=${REPO.branch}`);
        return { data: JSON.parse(fromB64(j.content)), sha: j.sha };
    }
    // read -> change -> write, retrying once if someone else committed in between
    async function mutate(file, fn, message) {
        for (let attempt = 0; ; attempt++) {
            const { data, sha } = await ghRead(file);
            fn(data);
            try {
                await gh(`/contents/${file}`, {
                    method: 'PUT',
                    body: JSON.stringify({ message, content: toB64(JSON.stringify(data, null, 2) + '\n'), sha, branch: REPO.branch })
                });
                return data;
            } catch (e) {
                if (attempt === 0 && /GitHub (409|422)/.test(e.message)) continue;
                throw e;
            }
        }
    }
    async function adminRefresh() {
        const [p, c] = await Promise.all([ghRead('posts.json'), ghRead('content.json')]);
        state.posts = sortPosts(p.data.posts || []);
        state.content = { ...DEFAULT_CONTENT, ...c.data };
    }
    const SAVED_MSG = 'Saved. Everyone will see it in about a minute, once GitHub Pages rebuilds.';

    /* ---------- theme + matrix ---------- */
    function applyTheme() {
        document.documentElement.setAttribute('data-theme', store.get('theme') === 'light' ? 'light' : 'dark');
    }
    function startMatrix() {
        const c = $('#matrix-canvas');
        const ctx = c && c.getContext && c.getContext('2d');
        if (!ctx) return;
        const fs = 16, letters = '0101SECUREEDDIE13SHACKER';
        let drops = [];
        const size = () => { c.width = innerWidth; c.height = innerHeight; drops = Array(Math.floor(c.width / fs)).fill(1); };
        size();
        addEventListener('resize', size);
        setInterval(() => {
            const light = document.documentElement.dataset.theme === 'light';
            ctx.fillStyle = light ? 'rgba(221,207,255,0.15)' : 'rgba(13,2,17,0.15)';
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = light ? '#040DE1' : '#00ff41';
            ctx.font = fs + 'px monospace';
            drops.forEach((y, i) => {
                ctx.fillText(letters.charAt(Math.floor(Math.random() * letters.length)), i * fs, y * fs);
                if (y * fs > c.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            });
        }, 50);
    }

    /* ---------- page shell ---------- */
    const NAV = [
        ['index.html', 'Home', 'home'],
        ['about.html', 'About me', 'about'],
        ['projects.html', 'Projects', 'projects'],
        ['feedback.html', 'Feedback', 'feedback'],
        ['contact.html', 'Contact Me', 'contact']
    ];

    function renderShell() {
        const current = PAGE === 'post' ? 'home' : PAGE;
        const name = esc(state.content.siteName);
        $('#root').innerHTML = `
            <div id="firewall-overlay"><div class="firewall-content">
                <h1>UNAUTHORIZED ACCESS DETECTED</h1>
                <p>FIREWALL PROTOCOL 0-9 ACTIVATED. YOUR IP HAS BEEN LOGGED.</p>
                <button id="firewall-btn" type="button">RE-AUTHENTICATE</button>
            </div></div>
            <div id="custom-alert"><div class="alert-header">_SYSTEM_NOTIFICATION</div>
                <p id="alert-msg"></p><button id="alert-btn" type="button">ACKNOWLEDGE</button></div>
            ${PAGE === 'home' ? `<div class="system-dashboard">
                <div class="dash-item">STATUS: <span style="color:#2ecc71">ENCRYPTED</span></div>
                <div class="dash-item" id="live-clock">00:00:00</div>
                <div class="dash-item" id="user-ip">IP: FETCHING...</div>
                <div class="dash-item" style="color:#f1c40f">SCANNING: <span id="port-scanner">PORT 80</span></div>
            </div>` : ''}
            <div class="container">
                <header class="custom-header"><div class="inner-header">
                    <a href="index.html" class="home-link">
                        <img class="logo" src="${LOGO}" alt="" onerror="this.remove()">
                        <span class="glitch" data-text="${name}">${name}</span>
                    </a>
                    <nav class="nav-links" aria-label="Main">
                        ${NAV.map(([href, label, key]) => `<a class="nav-btn" href="${href}"${key === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
                        <button id="theme-toggle" type="button" title="Toggle light/dark">MODE</button>
                    </nav>
                </div></header>
                <main id="main"></main>
                <footer class="site-footer">${esc(state.content.footer)}</footer>
            </div>
            <button id="backToTop" type="button" aria-label="Back to top">⬆</button>
            <div id="toast" role="status"></div>`;

        $('#theme-toggle').onclick = () => {
            const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
            store.set('theme', next);
            applyTheme();
        };
        const btt = $('#backToTop');
        if (!renderShell.scrollBound) {
            renderShell.scrollBound = true;
            addEventListener('scroll', () => { const b = $('#backToTop'); if (b) b.style.display = scrollY > 300 ? 'block' : 'none'; });
        }
        btt.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
        $('#alert-btn').onclick = closeAlert;
        $('#firewall-btn').onclick = deactivateFirewall;
    }

    function showAlert(msg) { $('#alert-msg').textContent = '> ' + msg; $('#custom-alert').style.display = 'block'; }
    function closeAlert() { $('#custom-alert').style.display = 'none'; }
    function activateFirewall() { $('#firewall-overlay').style.display = 'flex'; }
    function deactivateFirewall() {
        $('#firewall-overlay').style.display = 'none';
        const s = $('#post-search');
        if (s) { s.value = ''; filterPosts(''); $('#admin-panel').hidden = true; }
    }

    /* ---------- pages ---------- */
    const chips = p => (p.categories || []).map(c => `<span class="chip">${esc(c)}</span>`).join('');

    function postCard(p) {
        return `<div class="post-wrapper"><a class="post-card" href="post.html?p=${encodeURIComponent(p.slug)}">
            <div class="post-date">${fmtDate(p.date)}</div>
            <span class="post-title">${esc(p.title)}</span>
            <div class="post-category">${chips(p)}</div></a></div>`;
    }

    function renderHome() {
        document.title = `${state.content.siteName} // SECURE`;
        $('#main').innerHTML = `
            <div class="custom-header"><p id="typing-text" style="margin:0;min-height:1.2rem"></p></div>
            <input type="text" id="post-search" placeholder="Search all posts..." aria-label="Search posts" autocomplete="off">
            <div id="admin-panel" hidden></div>
            <div id="posts-container"></div>`;
        drawPosts(state.posts);
        $('#post-search').oninput = e => {
            const val = e.target.value.toLowerCase().trim();
            if (['hack', 'root', 'exploit'].includes(val)) { activateFirewall(); return; }
            const admin = val === 'admin';
            $('#admin-panel').hidden = !admin;
            if (admin) renderAdminPanel();
            filterPosts(admin ? '' : val);
        };
        typeWriter(tokens(state.content.bio));
        startStats();
        if (!store.get('alerted')) { showAlert('SECURITY PROTOCOL ENGAGED.'); store.set('alerted', 'true'); }
    }

    function drawPosts(list) {
        const box = $('#posts-container');
        if (!box) return;
        if (state.loadError) {
            box.innerHTML = `<div class="custom-header">Could not load posts (${esc(state.loadError)}). Try refreshing.</div>`;
        } else if (!list.length) {
            box.innerHTML = '<div class="custom-header">No posts found.</div>';
        } else {
            box.innerHTML = list.map(postCard).join('');
        }
    }
    function filterPosts(val) {
        const hay = p => `${p.title} ${(p.categories || []).join(' ')} ${stripTags(p.body)}`.toLowerCase();
        drawPosts(val ? state.posts.filter(p => hay(p).includes(val)) : state.posts);
    }

    function typeWriter(text) {
        const el = $('#typing-text');
        let i = 0;
        (function step() { if (el && i < text.length) { el.textContent += text.charAt(i++); setTimeout(step, 40); } })();
    }

    function startStats() {
        if (startStats.started) return;
        startStats.started = true;
        fetch('https://api.ipify.org?format=json').then(r => r.json())
            .then(d => { const el = $('#user-ip'); if (el) el.textContent = 'IP: ' + d.ip; })
            .catch(() => { const el = $('#user-ip'); if (el) el.textContent = 'IP: 127.0.0.1'; });
        setInterval(() => { const el = $('#live-clock'); if (el) el.textContent = new Date().toLocaleTimeString(); }, 1000);
        const ports = [21, 22, 23, 25, 53, 80, 443, 3306];
        let i = 0;
        setInterval(() => { const el = $('#port-scanner'); if (el) el.textContent = 'PORT ' + ports[i] + '... OPEN'; i = (i + 1) % ports.length; }, 1500);
    }

    function renderPost() {
        const slug = new URLSearchParams(location.search).get('p');
        const p = state.posts.find(x => x.slug === slug);
        if (!p) {
            document.title = `Post not found - ${state.content.siteName}`;
            $('#main').innerHTML = `<article class="custom-header"><h1 class="post-heading">Post not found</h1>
                <p>${state.loadError ? 'The posts could not be loaded. Try refreshing.' : "That post doesn't exist (it may have been renamed or deleted)."}</p>
                <a class="btn" href="index.html">← All posts</a></article>`;
            return;
        }
        document.title = `${p.title} - ${state.content.siteName}`;
        $('#main').innerHTML = `<article class="custom-header">
            <div class="post-date">${fmtDate(p.date)}</div>
            <h1 class="post-heading">${esc(p.title)}</h1>
            <div class="post-category">${chips(p)}</div>
            <div class="post-body">${render(p.body)}</div>
            <div class="post-actions">
                <a class="btn" href="index.html">← All posts</a>
                ${isAdmin() ? '<button id="edit-post" type="button">Edit post</button><button id="del-post" class="danger" type="button">Delete</button>' : ''}
            </div></article>`;
        if (isAdmin()) {
            $('#edit-post').onclick = () => openPostEditor(p);
            $('#del-post').onclick = () => deletePost(p.slug, p.title).then(ok => { if (ok) location.href = 'index.html'; });
        }
    }

    const PAGES = {
        about: { title: 'About me', field: 'about' },
        projects: { title: 'Projects', field: 'projects' },
        feedback: { title: 'Feedback', field: 'feedbackIntro', form: 'feedback' },
        contact: { title: 'Contact Me', field: 'contactIntro', form: 'contact' }
    };
    function renderPage() {
        const cfg = PAGES[PAGE];
        document.title = `${cfg.title} - ${state.content.siteName}`;
        $('#main').innerHTML = `<section class="custom-header">
            <h1 class="post-heading">${cfg.title}</h1>
            <div class="post-body">${render(state.content[cfg.field])}${cfg.form ? formHTML(cfg.form) : ''}</div>
            ${isAdmin() ? `<div class="post-actions"><button id="edit-page" type="button">Edit this page's text</button></div>` : ''}
        </section>`;
        if (isAdmin()) $('#edit-page').onclick = () => openSiteEditor(cfg.field);
    }

    /* ---------- admin: modal + editors ---------- */
    function modal(title, inner) {
        const m = document.createElement('div');
        m.className = 'modal-backdrop';
        m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
            <div class="modal-head"><h2>${esc(title)}</h2><button class="small" data-close type="button" aria-label="Close">✕</button></div>${inner}</div>`;
        document.body.appendChild(m);
        const onKey = e => { if (e.key === 'Escape') close(); };
        const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
        document.addEventListener('keydown', onKey);
        m.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
        return { el: m, close };
    }

    function toolbar() {
        return `<div class="toolbar">
            <button class="small" type="button" data-tag="<strong>|</strong>"><b>B</b></button>
            <button class="small" type="button" data-tag="<em>|</em>"><i>I</i></button>
            <button class="small" type="button" data-tag="<h2>|</h2>">H2</button>
            <button class="small" type="button" data-tag="<p>|</p>">¶</button>
            <button class="small" type="button" data-tag="<ul><li>|</li></ul>">List</button>
            <button class="small" type="button" data-tag="<code>|</code>">Code</button>
            <button class="small" type="button" data-link="1">Link</button>
            <button class="small" type="button" data-img="1">Image</button></div>`;
    }
    function wireToolbar(root, ta) {
        const put = (before, after, fallback) => {
            const s = ta.selectionStart, e = ta.selectionEnd;
            const sel = ta.value.slice(s, e) || fallback || '';
            ta.setRangeText(before + sel + after, s, e, 'end');
            ta.focus();
            ta.dispatchEvent(new Event('input'));
        };
        $$('.toolbar button', root).forEach(b => b.onclick = () => {
            if (b.dataset.tag) { const [a, z] = b.dataset.tag.split('|'); put(a, z); }
            else if (b.dataset.link) { const u = prompt('Link address (https://…)'); if (u) put(`<a href="${esc(u)}" target="_blank" rel="noopener">`, '</a>', u); }
            else if (b.dataset.img) { const u = prompt('Image address (https://…)'); if (u) put(`<img src="${esc(u)}" alt="">`, ''); }
        });
    }

    async function openPostEditor(post) {
        try { await adminRefresh(); } catch (e) { toast('Could not load the latest posts: ' + e.message, true); return; }
        const existing = post && state.posts.find(p => p.slug === post.slug);
        const isNew = !existing;
        const p = existing || { title: '', slug: '', date: todayISO(), categories: [], body: '' };
        const m = modal(isNew ? 'New post' : 'Edit post', `
            <label>Title<input id="pe-title" value="${esc(p.title)}"></label>
            <div class="row">
                <label>Date<input type="date" id="pe-date" value="${esc(String(p.date).slice(0, 10))}"></label>
                <label>Categories (comma separated)<input id="pe-cats" value="${esc((p.categories || []).join(', '))}"></label>
            </div>
            <label>Address (post.html?p=…)<input id="pe-slug" value="${esc(p.slug)}" ${isNew ? '' : 'readonly'}></label>
            ${toolbar()}
            <textarea id="pe-body" rows="12" placeholder="Write your post (HTML allowed)">${esc(p.body)}</textarea>
            <details><summary>Preview</summary><div id="pe-preview" class="post-body"></div></details>
            <p class="hint">Tip: type [feedback-form] or [contact-form] to drop in a form.</p>
            <div class="actions"><button class="primary" id="pe-save" type="button">Save post</button><button data-close type="button">Cancel</button></div>
            <p class="form-status" id="pe-status"></p>`);
        const root = m.el, ta = $('#pe-body', root);
        wireToolbar(root, ta);
        const preview = () => { $('#pe-preview', root).innerHTML = render(ta.value); };
        ta.addEventListener('input', preview);
        $('details', root).addEventListener('toggle', preview);
        let slugTouched = !isNew;
        $('#pe-slug', root).addEventListener('input', () => { slugTouched = true; });
        $('#pe-title', root).addEventListener('input', e => { if (!slugTouched) $('#pe-slug', root).value = slugify(e.target.value); });

        $('#pe-save', root).onclick = async () => {
            const status = $('#pe-status', root), btn = $('#pe-save', root);
            const title = $('#pe-title', root).value.trim();
            const slug = slugify($('#pe-slug', root).value || title);
            const date = $('#pe-date', root).value || todayISO().slice(0, 10);
            if (!title) { status.textContent = 'Give the post a title.'; return; }
            if (isNew && state.posts.some(x => x.slug === slug)) { status.textContent = 'A post with that address already exists. Change the address.'; return; }
            const timePart = String(p.date).includes('T') ? String(p.date).slice(11) : todayISO().slice(11);
            const next = {
                slug, title, date: `${date}T${timePart}`,
                categories: $('#pe-cats', root).value.split(',').map(s => s.trim()).filter(Boolean),
                body: ta.value
            };
            btn.disabled = true; status.textContent = 'Saving to GitHub…';
            try {
                const data = await mutate('posts.json', d => {
                    d.posts = d.posts || [];
                    const i = d.posts.findIndex(x => x.slug === slug);
                    if (i >= 0) d.posts[i] = next; else d.posts.push(next);
                }, `Admin: ${isNew ? 'add' : 'edit'} post "${title}"`);
                state.posts = sortPosts(data.posts);
                m.close();
                toast(SAVED_MSG);
                refreshView();
            } catch (e) { status.textContent = e.message; btn.disabled = false; }
        };
    }

    async function deletePost(slug, title) {
        if (!confirm(`Delete "${title}" for everyone? This can't be undone from the site.`)) return false;
        try {
            const data = await mutate('posts.json', d => { d.posts = (d.posts || []).filter(x => x.slug !== slug); }, `Admin: delete post "${title}"`);
            state.posts = sortPosts(data.posts);
            toast('Deleted. ' + SAVED_MSG);
            refreshView();
            return true;
        } catch (e) { toast(e.message, true); return false; }
    }

    const SITE_FIELDS = [
        ['siteName', 'Site name (top bar)', 'input'],
        ['birthday', 'Birthday (used for {age})', 'date'],
        ['bio', 'Typing line on the home page ({age} = your age)', 'input'],
        ['about', 'About me page (HTML, {age} works here too)', 'textarea'],
        ['projects', 'Projects page (HTML)', 'textarea'],
        ['feedbackIntro', 'Feedback page intro (HTML)', 'textarea'],
        ['contactIntro', 'Contact page intro (HTML)', 'textarea'],
        ['footer', 'Footer text', 'input']
    ];
    async function openSiteEditor(focus) {
        try { await adminRefresh(); } catch (e) { toast('Could not load the latest text: ' + e.message, true); return; }
        const c = state.content;
        const m = modal('Edit site text', `
            ${SITE_FIELDS.map(([k, label, kind]) => `<label>${label}${kind !== 'textarea'
                ? `<input ${kind === 'date' ? 'type="date" ' : ''}data-field="${k}" value="${esc(c[k])}">`
                : `<textarea data-field="${k}" rows="6">${esc(c[k])}</textarea>`}</label>`).join('')}
            <div class="actions"><button class="primary" id="se-save" type="button">Save text</button><button data-close type="button">Cancel</button></div>
            <p class="form-status" id="se-status"></p>`);
        const first = $(`[data-field="${focus || 'siteName'}"]`, m.el);
        if (first) first.focus();
        $('#se-save', m.el).onclick = async () => {
            const status = $('#se-status', m.el), btn = $('#se-save', m.el);
            const vals = {};
            $$('[data-field]', m.el).forEach(el => { vals[el.dataset.field] = el.value; });
            btn.disabled = true; status.textContent = 'Saving to GitHub…';
            try {
                const data = await mutate('content.json', d => Object.assign(d, vals), 'Admin: edit site text');
                state.content = { ...DEFAULT_CONTENT, ...data };
                m.close();
                renderAll();
                toast(SAVED_MSG);
            } catch (e) { status.textContent = e.message; btn.disabled = false; }
        };
    }

    function refreshView() {
        if (PAGE === 'home') {
            const s = $('#post-search');
            filterPosts(s && s.value.toLowerCase().trim() !== 'admin' ? s.value.toLowerCase().trim() : '');
            if (!$('#admin-panel').hidden) renderAdminPanel();
        } else if (PAGE === 'post') renderPost();
        else if (PAGES[PAGE]) renderPage();
    }

    function renderAdminPanel() {
        const el = $('#admin-panel');
        if (!isAdmin()) {
            el.innerHTML = `<h3>_ADMIN_LOGIN</h3>
                <p class="hint">To edit the site for everyone, paste a GitHub fine-grained access token limited to the
                <b>${REPO.repo}</b> repository with <b>Contents: Read and write</b>
                (<a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">create one</a>).
                It is stored only in this browser. Without it nothing can be changed.</p>
                <input type="password" id="ap-token" placeholder="github_pat_…" autocomplete="off">
                <div class="actions"><button class="primary" id="ap-connect" type="button">Connect</button></div>
                <p class="form-status" id="ap-status"></p>`;
            $('#ap-connect').onclick = async () => {
                const t = $('#ap-token').value.trim(), st = $('#ap-status');
                if (!t) { st.textContent = 'Paste your token first.'; return; }
                st.textContent = 'Checking…';
                try {
                    const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + t } });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.message || 'HTTP ' + r.status);
                    if (!j.permissions || !j.permissions.push) throw new Error('That token can read the repo but not write to it. Give it Contents: Read and write.');
                    store.set(TOKEN_KEY, t);
                    await adminRefresh();
                    renderAdminPanel();
                    refreshView();
                    toast('Connected.');
                } catch (e) { st.textContent = e.message; }
            };
            return;
        }
        el.innerHTML = `<h3>_ADMIN_ACCESS_GRANTED</h3>
            <div class="actions">
                <button class="primary" id="ap-new" type="button">New post</button>
                <button id="ap-site" type="button">Edit site text</button>
                <button id="ap-reload" type="button">Reload from GitHub</button>
                <button class="danger" id="ap-logout" type="button">Log out</button>
            </div>
            <ul class="admin-list">${state.posts.map(p => `<li><span>${esc(p.title)} <small>(${fmtDate(p.date)})</small></span>
                <span><button class="small" data-edit="${esc(p.slug)}" type="button">Edit</button>
                <button class="small danger" data-del="${esc(p.slug)}" type="button">Delete</button></span></li>`).join('')}</ul>
            <p class="hint">Changes are saved to GitHub and show for everyone after the site rebuilds (about a minute).</p>`;
        $('#ap-new').onclick = () => openPostEditor(null);
        $('#ap-site').onclick = () => openSiteEditor();
        $('#ap-reload').onclick = async () => {
            try { await adminRefresh(); refreshView(); renderAdminPanel(); toast('Reloaded.'); } catch (e) { toast(e.message, true); }
        };
        $('#ap-logout').onclick = () => { store.del(TOKEN_KEY); renderAdminPanel(); toast('Logged out.'); };
        $$('[data-edit]', el).forEach(b => b.onclick = () => openPostEditor(state.posts.find(p => p.slug === b.dataset.edit)));
        $$('[data-del]', el).forEach(b => b.onclick = () => deletePost(b.dataset.del, (state.posts.find(p => p.slug === b.dataset.del) || {}).title));
    }

    /* ---------- boot ---------- */
    // (re)draw the whole page from the current state, keeping the admin panel open if it was
    function renderAll() {
        const panel = $('#admin-panel');
        const panelOpen = PAGE === 'home' && panel && !panel.hidden;
        renderShell();
        if (PAGE === 'home') renderHome();
        else if (PAGE === 'post') renderPost();
        else if (PAGES[PAGE]) renderPage();
        if (panelOpen) { $('#post-search').value = 'admin'; $('#admin-panel').hidden = false; renderAdminPanel(); }
    }

    async function main() {
        applyTheme();
        startMatrix();
        await loadPublic();
        // Admins read straight from GitHub so they see their own edits at once,
        // instead of the public copy, which lags behind by about a minute.
        if (isAdmin()) { try { await adminRefresh(); } catch { /* fall back to the public copy */ } }
        renderAll();
    }
    main();
})();
