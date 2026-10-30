/* EDDIE13S — shared site script.
 * Renders every page from posts.json + content.json, so posts never 404.
 * Admin: type "admin" in the home-page search box. Edits are committed to this
 * repo through the GitHub API, so everyone sees them once Pages rebuilds (~1 min). */
(() => {
    'use strict';

    const REPO = { owner: 'ed13s', repo: 'ed13s.github.io', branch: 'main' };

    // ===== AI WRITE KEY ==========================================================
    // Paste your OpenRouter key between the quotes on the next line (it starts with sk-or-).
    // Leave it as '' and the editor will ask for the key instead and keep it in your browser.
    const OPENROUTER_KEY = '';
    // =============================================================================
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
                if (n === 'style') {
                    const al = /text-align\s*:\s*(left|right|center|justify)/i.exec(a.value);
                    if (al) el.setAttribute('style', 'text-align:' + al[1].toLowerCase()); else el.removeAttribute('style');
                } else if (n.startsWith('on') || n === 'srcdoc') el.removeAttribute(a.name);
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

    /* ---------- Word-style editor: "Simple editor" tab + "Code" tab ---------- */
    const pageLinks = () => [
        ['index.html', 'Home'], ['about.html', 'About me'], ['projects.html', 'Projects'],
        ['feedback.html', 'Feedback'], ['contact.html', 'Contact Me'],
        ...state.posts.map(p => ['post.html?p=' + encodeURIComponent(p.slug), 'Post: ' + p.title])
    ];

    // turns what people type ("example.com", "me@mail.com", "about.html") into a working address
    function normalizeUrl(u) {
        u = (u || '').trim();
        if (!u || /\s/.test(u) || /^(javascript|data|vbscript):/i.test(u)) return '';
        if (/^(https?:\/\/|mailto:|tel:|#|\/|\.\.?\/)/i.test(u)) return u;
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u)) return 'mailto:' + u;
        if (/^[\w-]+\.html?(\?|#|$)/i.test(u)) return u;
        return 'https://' + u;
    }

    const BLOCK_TAG = /^(P|H[1-6]|UL|OL|LI|BLOCKQUOTE|DIV|TABLE|PRE|HR|FORM|SECTION|ARTICLE|FIGURE)$/;
    // clean up what the browser's editor produced: paragraphs instead of loose text / <div>s, no empty lines
    function tidyHTML(html) {
        const t = document.createElement('template');
        t.innerHTML = sanitize(html);
        const walker = document.createTreeWalker(t.content, 128 /* comments */);
        const comments = [];
        while (walker.nextNode()) comments.push(walker.currentNode);
        comments.forEach(c => c.remove());
        const out = document.createElement('div');
        let p = null;
        [...t.content.childNodes].forEach(n => {
            if (n.nodeType === 1 && BLOCK_TAG.test(n.tagName)) { p = null; out.appendChild(n); return; }
            if (!p && ((n.nodeType === 3 && !n.textContent.trim()) || (n.nodeType === 1 && n.tagName === 'BR'))) return;
            if (!p) { p = document.createElement('p'); out.appendChild(p); }
            p.appendChild(n);
        });
        [...out.children].forEach(el => {
            if (el.tagName === 'DIV' && !el.querySelector('p,div,ul,ol,h1,h2,h3,h4,h5,h6,blockquote,table,form')) {
                const q = document.createElement('p');
                q.innerHTML = el.innerHTML;
                if (el.getAttribute('style')) q.setAttribute('style', el.getAttribute('style'));
                el.replaceWith(q);
            }
        });
        [...out.querySelectorAll('p')].forEach(el => { if (!el.textContent.trim() && !el.querySelector('img,hr')) el.remove(); });
        return out.innerHTML;
    }
    const prettyHTML = html => html.replace(/(<\/(?:p|h[1-6]|ul|ol|li|blockquote|table|tr)>|<hr\s*\/?>)(?!\n)/gi, '$1\n').replace(/\n+$/, '');

    /* ---------- AI writing (OpenRouter free models) ----------
     * The key is pasted by the admin and kept only in this browser (never in the repo),
     * and the browser talks to OpenRouter directly. */
    const OR = { url: 'https://openrouter.ai/api/v1', keyK: 'ed_or_key', modelK: 'ed_or_model', auto: 'openrouter/free' };
    const orKey = () => OPENROUTER_KEY.trim() || store.get(OR.keyK) || '';
    const AI_SYSTEM = 'You are a writing assistant for Eddie\'s personal website about cyber security and programming. '
        + 'Reply with ONLY the finished text as simple HTML using <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <a href> and <blockquote>. '
        + 'No markdown, no code fences, no introduction and no explanation. '
        + 'Keep placeholders such as {age}, [contact-form] and [feedback-form] exactly as written. '
        + 'Write in the first person as Eddie unless told otherwise. Do not invent links, facts or personal details; if unsure, keep it general.';
    const AI_MODES = {
        write:    { label: 'Write something new at the cursor', ph: 'e.g. a short intro about my cyber security projects', needsText: true },
        rewrite:  { label: 'Rewrite the selected text', ph: 'Optional: how? e.g. friendlier, more professional', needsSel: true },
        fix:      { label: 'Fix spelling and grammar in the selected text', needsSel: true },
        shorter:  { label: 'Make the selected text shorter', needsSel: true },
        longer:   { label: 'Make the selected text longer', needsSel: true },
        continue: { label: 'Continue writing from the cursor', ph: 'Optional: where should it go?', needsBefore: true }
    };
    function aiPrompt(mode, instr, label, sel, before) {
        const i = (instr || '').trim();
        const page = `The text is for the "${label}" part of the website.`;
        switch (mode) {
            case 'write': return `${page}\nWrite this: ${i}`;
            case 'rewrite': return `${page}\nRewrite the text below${i ? ' (' + i + ')' : ' so it reads better'}, keeping its meaning and any links. Reply with just the rewritten text.\n\nTEXT:\n${sel}`;
            case 'fix': return `${page}\nFix the spelling and grammar of the text below. Do not change the meaning, wording style or links. Reply with just the corrected text.\n\nTEXT:\n${sel}`;
            case 'shorter': return `${page}\nMake the text below shorter while keeping the key points and links. Reply with just the shortened text.\n\nTEXT:\n${sel}`;
            case 'longer': return `${page}\nMake the text below a bit longer by adding relevant detail, without inventing facts. Keep its links. Reply with just the longer text.\n\nTEXT:\n${sel}`;
            default: return `${page}\nContinue the text naturally with one or two more paragraphs${i ? '. Direction: ' + i : ''}. Reply with ONLY the new text, not the text that already exists.\n\nTEXT SO FAR:\n${before}`;
        }
    }
    // tiny markdown -> HTML, for models that ignore "reply in HTML"
    function markdownLite(t) {
        const inline = x => esc(x)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
        const out = [];
        let list = null, para = [];
        const flushP = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
        const flushL = () => { if (list) { out.push(`<${list.t}>` + list.items.map(x => '<li>' + inline(x) + '</li>').join('') + `</${list.t}>`); list = null; } };
        for (const raw of String(t).split('\n')) {
            const line = raw.trim();
            let m;
            if (!line) { flushP(); flushL(); continue; }
            if ((m = /^(#{1,6})\s+(.*)$/.exec(line))) { flushP(); flushL(); const h = m[1].length <= 2 ? 2 : 3; out.push(`<h${h}>${inline(m[2])}</h${h}>`); continue; }
            if ((m = /^[-*•]\s+(.*)$/.exec(line))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
            if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
            flushL(); para.push(line);
        }
        flushP(); flushL();
        return out.join('');
    }
    function aiToHTML(text) {
        let t = String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^\s*```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
        if (!t) return '';
        if (!/<\/?(p|h[1-6]|ul|ol|li|strong|em|a|br|blockquote|b|i)\b/i.test(t)) t = markdownLite(t);
        return tidyHTML(t);
    }
    const AIERR_HINTS = {
        401: 'OpenRouter did not accept your key. Check it was copied in full (it starts with sk-or-) or make a new one.',
        402: 'OpenRouter says your account has no credit left. Free models still need a balance that is not negative.',
        429: 'Too many requests. Free models allow about 20 a minute and 50 a day. Wait a bit and try again.'
    };
    async function aiGenerate(user, signal) {
        const key = orKey();
        const wanted = store.get(OR.modelK) || OR.auto;
        const call = async model => {
            let r, j = null;
            try {
                r = await fetch(OR.url + '/chat/completions', {
                    method: 'POST', signal,
                    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, messages: [{ role: 'system', content: AI_SYSTEM }, { role: 'user', content: user }], temperature: 0.7, max_tokens: 1200 })
                });
            } catch (e) {
                if (e && e.name === 'AbortError') throw e;
                return { status: 0, j };
            }
            try { j = await r.json(); } catch { /* not JSON */ }
            const status = r.ok && j && j.error ? (Number(j.error.code) || 502) : r.status;
            return { status, j };
        };
        let res = await call(wanted);
        // that model is busy / gone: let OpenRouter pick any working free model instead
        if (res.status !== 200 && wanted !== OR.auto && [0, 404, 429, 500, 502, 503].includes(res.status)) res = await call(OR.auto);
        if (res.status !== 200) {
            const detail = res.j && res.j.error && res.j.error.message ? String(res.j.error.message) : '';
            let msg = AIERR_HINTS[res.status];
            if (!msg && res.status === 404 && /data policy|privacy/i.test(detail)) msg = 'OpenRouter blocked the free model by your privacy settings. In your OpenRouter account, open Settings → Privacy and allow free models, then try again.';
            if (!msg && res.status === 0) msg = "Couldn't reach OpenRouter. Check your internet connection and try again.";
            if (!msg) msg = `OpenRouter error ${res.status}${detail ? ': ' + detail.slice(0, 160) : ''}. Try again, or pick another model in Key & model.`;
            const err = new Error(msg); err.status = res.status; throw err;
        }
        const c = res.j && res.j.choices && res.j.choices[0] && res.j.choices[0].message && res.j.choices[0].message.content;
        const text = Array.isArray(c) ? c.map(x => (x && x.text) || '').join('') : c;
        const html = aiToHTML(text);
        if (!html) throw new Error('The AI sent back nothing. Try again, or word your request differently.');
        return { html, model: (res.j && res.j.model) || wanted };
    }
    async function aiFreeModels() {
        const r = await fetch(OR.url + '/models');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        return (j.data || []).filter(m => /:free$/.test(m.id || '')).map(m => ({ id: m.id, name: m.name || m.id })).sort((a, b) => a.name.localeCompare(b.name));
    }

    function richEditor(initialHTML, { label = 'Text' } = {}) {
        const el = document.createElement('div');
        el.className = 'rte';
        const cmdBtn = (cmd, title, inner) => `<button type="button" class="small" data-cmd="${cmd}" title="${title}" aria-label="${title}">${inner}</button>`;
        el.innerHTML = `
            <div class="rte-tabs" role="tablist">
                <button type="button" class="rte-tab active" data-mode="visual" role="tab" aria-selected="true">Simple editor</button>
                <button type="button" class="rte-tab" data-mode="code" role="tab" aria-selected="false">Code</button>
            </div>
            <div class="rte-toolbar" role="toolbar" aria-label="Formatting">
                <span class="rte-group">${cmdBtn('undo', 'Undo', '↶')}${cmdBtn('redo', 'Redo', '↷')}</span>
                <span class="rte-group"><select class="rte-style" title="Text style" aria-label="Text style">
                    <option value="p">Normal text</option><option value="h2">Big heading</option><option value="h3">Medium heading</option>
                    <option value="h4">Small heading</option><option value="blockquote">Quote</option></select></span>
                <span class="rte-group">${cmdBtn('bold', 'Bold (Ctrl+B)', '<b>B</b>')}${cmdBtn('italic', 'Italic (Ctrl+I)', '<i>I</i>')}${cmdBtn('underline', 'Underline (Ctrl+U)', '<u>U</u>')}</span>
                <span class="rte-group">${cmdBtn('insertUnorderedList', 'Bulleted list', '• List')}${cmdBtn('insertOrderedList', 'Numbered list', '1. List')}</span>
                <span class="rte-group">${cmdBtn('justifyLeft', 'Align left', 'Left')}${cmdBtn('justifyCenter', 'Centre', 'Centre')}${cmdBtn('justifyRight', 'Align right', 'Right')}</span>
                <span class="rte-group">
                    <button type="button" class="small" data-act="link" title="Add or edit a link (Ctrl+K)">🔗 Link</button>
                    <button type="button" class="small" data-act="unlink" title="Remove the link">Unlink</button>
                    <button type="button" class="small" data-act="image" title="Add a picture from a web address">🖼 Picture</button>
                    <button type="button" class="small" data-act="ai" title="Let AI write or rewrite text">✨ AI write</button>
                </span>
                <span class="rte-group">
                    <select class="rte-insert" title="Insert" aria-label="Insert">
                        <option value="">Insert…</option><option value="hr">Divider line</option><option value="age">My age</option>
                        <option value="contact">Contact form</option><option value="feedback">Feedback form</option></select>
                    <button type="button" class="small" data-act="clear" title="Remove formatting">Clear</button>
                </span>
            </div>
            <div class="rte-panel" hidden></div>
            <div class="rte-visual post-body" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" aria-label="${esc(label)}"></div>
            <textarea class="rte-code" hidden spellcheck="false" aria-label="${esc(label)} (HTML code)"></textarea>
            <p class="hint rte-hint"></p>`;
        const visual = $('.rte-visual', el), code = $('.rte-code', el), panel = $('.rte-panel', el), bar = $('.rte-toolbar', el), hint = $('.rte-hint', el);
        const HINTS = {
            visual: 'Select some text, then use the buttons above. Press <b>🔗 Link</b> to make it a clickable link. Forms show as [contact-form] here and appear as the real form on the site.',
            code: 'You are editing the raw HTML. {age}, [contact-form] and [feedback-form] work here too. Switch back to <b>Simple editor</b> to see it formatted.'
        };
        let mode = 'visual', saved = null;
        const hasExec = () => typeof document.execCommand === 'function';
        visual.innerHTML = sanitize(initialHTML);
        hint.innerHTML = HINTS.visual;

        /* remember where the cursor / selection was, because clicking a button or dialog field moves focus */
        let restoring = false;
        const saveRange = () => {
            if (restoring) return;
            const sel = getSelection();
            if (sel && sel.rangeCount && visual.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange();
        };
        const restoreRange = () => {
            // focusing the editor makes the browser jump the cursor to the start, so take a copy first and ignore those events
            let r = saved ? saved.cloneRange() : null;
            if (!r) { r = document.createRange(); r.selectNodeContents(visual); r.collapse(false); }
            restoring = true;
            try {
                visual.focus();
                const sel = getSelection();
                if (sel) { sel.removeAllRanges(); sel.addRange(r); }
            } finally { restoring = false; }
            saved = r;
        };
        const closestIn = (node, re) => { let n = node; while (n && n !== visual) { if (n.nodeType === 1 && re.test(n.tagName)) return n; n = n.parentNode; } return null; };
        const blockOf = () => saved && closestIn(saved.startContainer, /^(P|H[1-6]|BLOCKQUOTE|DIV|LI)$/);
        const linkOf = () => saved && closestIn(saved.startContainer, /^A$/);

        const refreshState = () => {
            if (hasExec() && typeof document.queryCommandState === 'function') {
                ['bold', 'italic', 'underline'].forEach(c => { try { $(`[data-cmd="${c}"]`, el).setAttribute('aria-pressed', String(!!document.queryCommandState(c))); } catch { /* ignore */ } });
            }
            const b = blockOf(), tag = b ? b.tagName.toLowerCase() : 'p';
            $('.rte-style', el).value = ['h2', 'h3', 'h4', 'blockquote'].includes(tag) ? tag : 'p';
        };
        // track the selection continuously (mouse, keyboard, double-click, Select All...) so buttons always act on what you selected
        const onSel = () => {
            if (!el.isConnected) { document.removeEventListener('selectionchange', onSel); return; }
            saveRange(); refreshState();
        };
        document.addEventListener('selectionchange', onSel);
        ['keyup', 'mouseup', 'focus', 'blur'].forEach(ev => visual.addEventListener(ev, () => { saveRange(); refreshState(); }));
        visual.addEventListener('focus', () => {
            if (hasExec()) { try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, false); } catch { /* ignore */ } }
        });
        // buttons must not steal the selection from the text
        bar.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
        panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });

        const run = (cmd, val) => {
            saveRange(); restoreRange();
            let ok = false;
            if (hasExec()) { try { ok = document.execCommand(cmd, false, val); } catch { ok = false; } }
            saveRange(); refreshState();
            return ok;
        };
        // put HTML at the cursor (replacing any selection); uses the browser command so Undo still works
        function insertHTMLAtCaret(html) {
            restoreRange();
            if (hasExec()) { let ok = false; try { ok = document.execCommand('insertHTML', false, html); } catch { /* fall through */ } if (ok) { saveRange(); return; } }
            const t = document.createElement('template');
            t.innerHTML = html;
            const last = t.content.lastChild;
            saved.deleteContents();
            saved.insertNode(t.content);
            if (last) { saved.setStartAfter(last); saved.collapse(true); }
        }
        function setBlock(tag) {
            restoreRange();
            if (hasExec() && run('formatBlock', `<${tag}>`)) return;
            const b = blockOf();
            if (!b) return;
            const n = document.createElement(tag);
            n.innerHTML = b.innerHTML;
            b.replaceWith(n);
            saveRange();
        }
        const setTarget = (a, blank) => {
            if (blank) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
            else { a.removeAttribute('target'); a.removeAttribute('rel'); }
        };
        function closePanel() { panel.hidden = true; panel.innerHTML = ''; restoreRange(); saveRange(); }

        /* ---- link dialog ---- */
        function openLinkPanel() {
            saveRange(); restoreRange(); saveRange();
            const a = linkOf();
            const text = a ? a.textContent : (saved ? saved.toString() : '');
            const href = a ? (a.getAttribute('href') || '') : '';
            const newTab = a ? a.getAttribute('target') === '_blank' : true;
            panel.hidden = false;
            panel.innerHTML = `<strong>${a ? 'Edit link' : 'Add a link'}</strong>
                <label>Text to show<input class="lk-text" value="${esc(text)}" placeholder="e.g. my Scratch profile"></label>
                <label>Web address<input class="lk-url" value="${esc(href)}" placeholder="https://example.com" inputmode="url" autocomplete="off"></label>
                <label>…or link to a page on this site<select class="lk-page"><option value="">Choose a page…</option>
                    ${pageLinks().map(([u, n]) => `<option value="${esc(u)}">${esc(n)}</option>`).join('')}</select></label>
                <label class="check"><input type="checkbox" class="lk-new"${newTab ? ' checked' : ''}> Open in a new tab</label>
                <div class="actions"><button type="button" class="primary" data-lk="apply">${a ? 'Update link' : 'Add link'}</button>
                    ${a ? '<button type="button" class="danger" data-lk="remove">Remove link</button>' : ''}
                    <button type="button" data-lk="cancel">Cancel</button></div>
                <p class="form-status" role="alert"></p>`;
            $('.lk-page', panel).onchange = e => { if (e.target.value) { $('.lk-url', panel).value = e.target.value; $('.lk-new', panel).checked = false; } };
            $('[data-lk="cancel"]', panel).onclick = closePanel;
            const rm = $('[data-lk="remove"]', panel);
            if (rm) rm.onclick = () => { closePanel(); unlink(); };
            const apply = () => {
                const st = $('.form-status', panel);
                const url = normalizeUrl($('.lk-url', panel).value);
                if (!url) { st.textContent = 'Type or paste a web address (like https://example.com), or pick a page from the list.'; return; }
                const label = $('.lk-text', panel).value.trim();
                const blank = $('.lk-new', panel).checked;
                restoreRange();
                const existing = linkOf();
                if (existing) {
                    existing.setAttribute('href', url);
                    setTarget(existing, blank);
                    if (label && label !== existing.textContent) existing.textContent = label;
                } else if (saved && !saved.collapsed && (!label || label === saved.toString())) {
                    wrapSelection(url, blank);                 // keeps bold/italic inside the selected text
                } else {
                    const na = document.createElement('a');
                    na.setAttribute('href', url);
                    na.textContent = label || url;
                    setTarget(na, blank);
                    insertHTMLAtCaret(na.outerHTML);
                }
                closePanel();
            };
            $('[data-lk="apply"]', panel).onclick = apply;
            panel.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') { e.preventDefault(); apply(); } else if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } };
            ($('.lk-text', panel).value || a ? $('.lk-url', panel) : $('.lk-text', panel)).focus();
        }
        function wrapSelection(url, blank) {
            const before = $$('a', visual);
            before.forEach(a => a.setAttribute('data-pre', '1'));
            let done = false;
            if (hasExec()) { try { done = document.execCommand('createLink', false, url); } catch { done = false; } }
            if (!done) {
                const a = document.createElement('a');
                a.setAttribute('href', url);
                try { saved.surroundContents(a); } catch { a.appendChild(saved.extractContents()); saved.insertNode(a); }
            }
            $$('a:not([data-pre])', visual).forEach(a => { a.setAttribute('href', url); setTarget(a, blank); });
            before.forEach(a => a.removeAttribute('data-pre'));
        }
        function unlink() {
            restoreRange();
            const a = linkOf();
            if (a) { const f = document.createDocumentFragment(); while (a.firstChild) f.appendChild(a.firstChild); a.replaceWith(f); }
            else run('unlink');
            saveRange();
        }

        /* ---- picture dialog ---- */
        function openImagePanel() {
            saveRange(); restoreRange(); saveRange();
            panel.hidden = false;
            panel.innerHTML = `<strong>Add a picture</strong>
                <label>Picture web address<input class="im-url" placeholder="https://example.com/picture.png" inputmode="url" autocomplete="off"></label>
                <label>Short description (for people who can't see it)<input class="im-alt" placeholder="e.g. my project screenshot"></label>
                <div class="actions"><button type="button" class="primary" data-im="apply">Add picture</button><button type="button" data-im="cancel">Cancel</button></div>
                <p class="form-status" role="alert"></p>`;
            $('[data-im="cancel"]', panel).onclick = closePanel;
            const apply = () => {
                const url = normalizeUrl($('.im-url', panel).value);
                if (!url || /^(mailto:|tel:)/i.test(url)) { $('.form-status', panel).textContent = 'Paste the address of the picture (it should start with https://).'; return; }
                const img = document.createElement('img');
                img.setAttribute('src', url);
                img.setAttribute('alt', $('.im-alt', panel).value.trim());
                closePanel();
                insertHTMLAtCaret(img.outerHTML);
            };
            $('[data-im="apply"]', panel).onclick = apply;
            panel.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); apply(); } else if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } };
            $('.im-url', panel).focus();
        }

        /* ---- AI write dialog ---- */
        let aiAbort = null;
        function openAIPanel() {
            saveRange(); restoreRange(); saveRange();
            panel.hidden = false;
            panel.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); aiClose(); } };
            if (orKey()) aiMain(); else aiSettings(true);
        }
        function aiClose() { if (aiAbort) aiAbort.abort(); aiAbort = null; closePanel(); }

        function aiSettings(first) {
            const builtIn = !!OPENROUTER_KEY.trim();
            const hasKey = !!store.get(OR.keyK);
            const model = store.get(OR.modelK) || OR.auto;
            panel.innerHTML = `<strong>✨ AI write: ${builtIn ? 'model' : first ? 'set up (one time)' : 'key and model'}</strong>
                ${builtIn ? '<p class="hint">The OpenRouter key is built into the site (OPENROUTER_KEY at the top of site.js), so there is nothing to paste.</p>' : `<p class="hint">This uses OpenRouter's free AI models. Get a free key at
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">openrouter.ai/keys</a> (sign in, press <b>Create key</b>, copy it) and paste it here.
                It is stored only in this browser and never put on the website.</p>
                <label>OpenRouter key<input type="password" class="ai-key" placeholder="${hasKey ? '•••••••• (saved, paste a new one to replace it)' : 'sk-or-v1-…'}" autocomplete="off"></label>`}
                <label>Model<select class="ai-model"><option value="${esc(OR.auto)}">Automatic (picks a working free model)</option>
                    ${model !== OR.auto ? `<option value="${esc(model)}" selected>${esc(model)}</option>` : ''}</select></label>
                <div class="actions"><button type="button" class="small" data-ai="models">Load list of free models</button></div>
                <div class="actions"><button type="button" class="primary" data-ai="save">Save</button>
                    ${builtIn ? '<button type="button" data-ai="back">Back</button>' : hasKey ? '<button type="button" data-ai="back">Back</button><button type="button" class="danger" data-ai="remove">Remove key</button>' : '<button type="button" data-ai="cancel">Cancel</button>'}</div>
                <p class="form-status" role="status"></p>`;
            const st = $('.form-status', panel);
            $('[data-ai="models"]', panel).onclick = async () => {
                st.textContent = 'Loading free models…';
                try {
                    const list = await aiFreeModels();
                    const sel = $('.ai-model', panel);
                    const cur = sel.value;
                    sel.innerHTML = `<option value="${esc(OR.auto)}">Automatic (picks a working free model)</option>` +
                        list.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
                    sel.value = [...sel.options].some(o => o.value === cur) ? cur : OR.auto;
                    st.textContent = `${list.length} free models found.`;
                } catch { st.textContent = "Couldn't load the list. Automatic still works."; }
            };
            $('[data-ai="save"]', panel).onclick = () => {
                const k = builtIn ? '' : $('.ai-key', panel).value.trim();
                if (k && !/^sk-or-/i.test(k)) { st.textContent = 'That does not look like an OpenRouter key. It should start with sk-or-'; return; }
                if (k) store.set(OR.keyK, k);
                if (!orKey()) { st.textContent = 'Paste your OpenRouter key first.'; return; }
                store.set(OR.modelK, $('.ai-model', panel).value);
                aiMain();
            };
            const back = $('[data-ai="back"]', panel); if (back) back.onclick = aiMain;
            const cancel = $('[data-ai="cancel"]', panel); if (cancel) cancel.onclick = aiClose;
            const rem = $('[data-ai="remove"]', panel);
            if (rem) rem.onclick = () => { store.del(OR.keyK); store.del(OR.modelK); aiSettings(true); };
            const keyBox = $('.ai-key', panel);
            if (keyBox) keyBox.focus();
        }

        function aiMain() {
            const hasSel = !!saved && !saved.collapsed;
            panel.innerHTML = `<strong>✨ AI write</strong>
                <label>What should it do?<select class="ai-mode">${Object.entries(AI_MODES).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('')}</select></label>
                <label><span class="ai-ins-label">Tell it what you want</span><textarea class="ai-text" rows="3"></textarea></label>
                <p class="hint ai-sel-hint"></p>
                <div class="actions"><button type="button" class="primary" data-ai="go">Write it</button>
                    <button type="button" data-ai="settings">Key &amp; model</button><button type="button" data-ai="cancel">Cancel</button></div>
                <div class="ai-result-box" hidden>
                    <div class="field-label">Here's what it wrote. Nothing is changed until you press Use this.</div>
                    <div class="ai-result post-body"></div>
                    <div class="actions"><button type="button" class="primary" data-ai="use">Use this</button>
                        <button type="button" data-ai="again">Try again</button><button type="button" data-ai="discard">Discard</button></div>
                </div>
                <p class="form-status" role="status"></p>
                <p class="hint">AI can get things wrong, so read it before you save. Free models may keep what you send, so don't include anything private.</p>`;
            const modeSel = $('.ai-mode', panel), text = $('.ai-text', panel), st = $('.form-status', panel), selHint = $('.ai-sel-hint', panel);
            const box = $('.ai-result-box', panel), resEl = $('.ai-result', panel);
            let result = '';
            modeSel.value = hasSel ? 'rewrite' : 'write';
            const syncMode = () => {
                const m = AI_MODES[modeSel.value];
                text.placeholder = m.ph || '';
                text.closest('label').hidden = !m.ph;
                $('.ai-ins-label', panel).textContent = m.needsText ? 'Tell it what you want' : 'Extra instructions (optional)';
                const sel = saved && !saved.collapsed;
                selHint.textContent = m.needsSel ? (sel ? `${saved.toString().length} characters selected.` : 'First select the text you want changed in the editor, then press ✨ AI write again.') : '';
                $('[data-ai="go"]', panel).disabled = !!(m.needsSel && !sel);
            };
            modeSel.onchange = syncMode;
            syncMode();

            const generate = async () => {
                saveRange();
                const mode = modeSel.value, m = AI_MODES[mode], instr = text.value.trim();
                const sel = saved && !saved.collapsed;
                if (m.needsSel && !sel) { syncMode(); return; }
                if (m.needsText && !instr) { st.textContent = 'Say what you want written first.'; text.focus(); return; }
                let selHTML = '', before = '';
                if (sel) { const d = document.createElement('div'); d.appendChild(saved.cloneContents()); selHTML = tidyHTML(d.innerHTML).slice(0, 6000); }
                if (m.needsBefore) {
                    const r = document.createRange();
                    r.selectNodeContents(visual); r.setEnd(saved.startContainer, saved.startOffset);
                    before = r.toString().slice(-1500).trim();
                    if (!before) { st.textContent = 'Write a little in the editor first, so it has something to continue from.'; return; }
                }
                if (aiAbort) aiAbort.abort();
                aiAbort = new AbortController();
                const myAbort = aiAbort;
                const goBtn = $('[data-ai="go"]', panel);
                goBtn.disabled = true; box.hidden = true;
                st.textContent = 'Writing… this can take up to half a minute.';
                const timer = setTimeout(() => myAbort.abort(), 60000);
                try {
                    const out = await aiGenerate(aiPrompt(mode, instr, label, selHTML, before), myAbort.signal);
                    result = out.html;
                    resEl.innerHTML = sanitize(result);
                    box.hidden = false;
                    st.textContent = 'Written by ' + out.model + '.';
                } catch (e) {
                    st.textContent = e && e.name === 'AbortError' ? (myAbort.signal.aborted && aiAbort === myAbort ? 'That took too long. Try again.' : 'Stopped.') : e.message;
                } finally {
                    clearTimeout(timer);
                    goBtn.disabled = false;
                    syncMode();
                }
            };
            $('[data-ai="go"]', panel).onclick = generate;
            $('[data-ai="again"]', panel).onclick = generate;
            $('[data-ai="discard"]', panel).onclick = () => { box.hidden = true; result = ''; st.textContent = ''; };
            $('[data-ai="settings"]', panel).onclick = () => aiSettings(false);
            $('[data-ai="cancel"]', panel).onclick = aiClose;
            $('[data-ai="use"]', panel).onclick = () => {
                if (!result) return;
                let html = result;
                // replacing part of a sentence: drop the wrapping paragraph so the text stays inline
                if (saved && !saved.collapsed) {
                    const t = document.createElement('template'); t.innerHTML = html;
                    if (t.content.children.length === 1 && t.content.firstElementChild.tagName === 'P' && t.content.childNodes.length === 1) html = t.content.firstElementChild.innerHTML;
                }
                aiClose();
                insertHTMLAtCaret(html);
                saveRange();
            };
            (text.closest('label').hidden ? $('[data-ai="go"]', panel) : text).focus();
        }

        /* ---- toolbar wiring ---- */
        $$('[data-cmd]', el).forEach(b => { b.onclick = () => run(b.dataset.cmd); });
        $('[data-act="link"]', el).onclick = openLinkPanel;
        $('[data-act="unlink"]', el).onclick = unlink;
        $('[data-act="image"]', el).onclick = openImagePanel;
        $('[data-act="ai"]', el).onclick = openAIPanel;
        $('[data-act="clear"]', el).onclick = () => { run('removeFormat'); setBlock('p'); };
        $('.rte-style', el).onchange = e => setBlock(e.target.value);
        $('.rte-insert', el).onchange = e => {
            const v = e.target.value;
            e.target.value = '';
            if (v === 'hr') insertHTMLAtCaret('<hr>');
            else if (v === 'age') insertHTMLAtCaret('{age}');
            else if (v === 'contact') insertHTMLAtCaret('<p>[contact-form]</p>');
            else if (v === 'feedback') insertHTMLAtCaret('<p>[feedback-form]</p>');
        };
        visual.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openLinkPanel(); } });
        // pasting from Word / web pages: keep links and basic formatting, drop the fonts and colours
        visual.addEventListener('paste', e => {
            const cd = e.clipboardData;
            if (!cd) return;
            const html = cd.getData('text/html'), text = cd.getData('text/plain');
            e.preventDefault();
            if (html) {
                const t = document.createElement('template');
                t.innerHTML = sanitize(html);
                t.content.querySelectorAll('*').forEach(n => { ['class', 'id', 'style', 'face', 'size', 'color'].forEach(a => n.removeAttribute(a)); });
                t.content.querySelectorAll('span,font,meta').forEach(n => n.replaceWith(...n.childNodes));
                insertHTMLAtCaret(t.innerHTML);
            } else insertHTMLAtCaret(esc(text).replace(/\n/g, '<br>'));
        });

        /* ---- the two tabs ---- */
        const getVisualHTML = () => tidyHTML(visual.innerHTML);
        function setMode(next) {
            if (next === mode) return;
            if (next === 'code') {
                code.value = prettyHTML(getVisualHTML());
                panel.hidden = true; panel.innerHTML = '';
                visual.hidden = true; code.hidden = false;
            } else {
                visual.innerHTML = sanitize(code.value);
                visual.hidden = false; code.hidden = true;
                saved = null;
            }
            mode = next;
            $$('button,select', bar).forEach(c => { c.disabled = next === 'code'; });
            $$('.rte-tab', el).forEach(t => { const on = t.dataset.mode === next; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
            hint.innerHTML = HINTS[next];
        }
        $$('.rte-tab', el).forEach(t => { t.onclick = () => setMode(t.dataset.mode); });

        return {
            el,
            getHTML: () => (mode === 'code' ? code.value : getVisualHTML()),
            setMode,
            focus: () => (mode === 'code' ? code : visual).focus()
        };
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
            <div class="field"><div class="field-label">Post text</div><div id="pe-rich"></div></div>
            <div class="actions"><button class="primary" id="pe-save" type="button">Save post</button><button data-close type="button">Cancel</button></div>
            <p class="form-status" id="pe-status"></p>`);
        const root = m.el;
        const rich = richEditor(p.body, { label: 'Post text' });
        $('#pe-rich', root).appendChild(rich.el);
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
                body: rich.getHTML()
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
        ['about', 'About me page', 'rich'],
        ['projects', 'Projects page', 'rich'],
        ['feedbackIntro', 'Feedback page intro', 'rich'],
        ['contactIntro', 'Contact page intro', 'rich'],
        ['footer', 'Footer text', 'input']
    ];
    // only = a single field name (the "Edit this page" buttons); otherwise every field
    async function openSiteEditor(only) {
        try { await adminRefresh(); } catch (e) { toast('Could not load the latest text: ' + e.message, true); return; }
        const c = state.content;
        const fields = only ? SITE_FIELDS.filter(f => f[0] === only) : SITE_FIELDS;
        const m = modal(only && fields[0] ? 'Edit: ' + fields[0][1] : 'Edit site text', `
            ${fields.map(([k, label, kind]) => kind === 'rich'
                ? `<div class="field"><div class="field-label">${label}</div><div data-rich="${k}"></div></div>`
                : `<label>${label}<input ${kind === 'date' ? 'type="date" ' : ''}data-field="${k}" value="${esc(c[k])}"></label>`).join('')}
            <div class="actions"><button class="primary" id="se-save" type="button">Save text</button><button data-close type="button">Cancel</button></div>
            <p class="form-status" id="se-status"></p>`);
        const editors = {};
        fields.filter(f => f[2] === 'rich').forEach(([k, label]) => {
            editors[k] = richEditor(c[k], { label });
            editors[k].el.dataset.field = k;
            $(`[data-rich="${k}"]`, m.el).appendChild(editors[k].el);
        });
        const first = Object.values(editors)[0];
        if (first) first.focus(); else { const i = $('input[data-field]', m.el); if (i) i.focus(); }
        $('#se-save', m.el).onclick = async () => {
            const status = $('#se-status', m.el), btn = $('#se-save', m.el);
            const vals = {};
            $$('input[data-field]', m.el).forEach(el => { vals[el.dataset.field] = el.value; });
            Object.keys(editors).forEach(k => { vals[k] = editors[k].getHTML(); });
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
        $('#ap-logout').onclick = () => { store.del(TOKEN_KEY); store.del(OR.keyK); store.del(OR.modelK); renderAdminPanel(); toast('Logged out.'); };
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
