// Plugin stories: a tiny DesktopHQ2 desktop that acts out each plugin in the bar, on its own, until someone taps it.
// `.st-player` = tabs + one stage that plays every story in turn; `.st-solo[data-story]` = one story on a loop.
// `data-root` is the path back to the site root. Needs plugins.js (window.DHQ) loaded first.
(function () {
    const D = window.DHQ;
    if (!D) {
        return;
    }
    const { morpher, GLYPHS, springEase, reduceMotion, sound } = D;

    // Tidy's own glyph: two tiles side by side, drawn so it can turn into the check, part for part.
    GLYPHS.tiles = [[[3.5, 4], [3.5, 20], [11, 20], [11, 4]], [[13, 4], [13, 12.2], [20.5, 12.2], [20.5, 4]]];

    const ORANGE = '#ff9f0a';
    const GREEN = '#30d158';
    const YELLOW = '#f5b800';
    const INK = '#1f1a16';

    const PLUGINS = {
        focus: {
            id: 'dev.desktophq2.focus',
            name: 'Focus',
            tab: 'A countdown in your bar',
            headline: 'Twenty-five minutes.<br>Nothing else.',
            text: 'Start a session from the bar and the ring fills while you work. Rain, Ocean or Fireplace fades in, and a chime says when you’re done.'
        },
        awake: {
            id: 'dev.desktophq2.awake',
            name: 'Awake',
            tab: 'No more mid-export naps',
            headline: 'Step away.<br>Your Mac won’t.',
            text: 'One click and the moon becomes a sun: your Mac stays awake until you say so, for a while, or while one group is showing. It lets go by itself at 10% battery.'
        },
        tidy: {
            id: 'dev.desktophq2.tidy',
            name: 'Tidy',
            tab: 'Messy group, one click',
            headline: 'One click.<br>Every gap even.',
            text: 'Tidy pulls stray windows back on screen and sets 16-point gaps at every edge and between neighbours. Or press Hyper+T.'
        },
        bookmarks: {
            id: 'dev.desktophq2.bookmarks',
            name: 'Bookmarks',
            tab: 'Links that live with the work',
            headline: 'Every group,<br>its own links.',
            text: 'The links, files and folders for each group sit right in its tile. Switch groups and the right ones come with you. Hyper+D saves the tab you’re on.'
        }
    };
    const ORDER = ['focus', 'awake', 'tidy', 'bookmarks'];

    const APPLE = '<path d="M17.48 12.38c-.03-2.35 1.91-3.49 2-3.55-1.09-1.6-2.78-1.82-3.38-1.85-1.44-.15-2.81.86-3.55.86-.74 0-1.87-.84-3.08-.81-1.58.02-3.03.92-3.85 2.32-1.63 2.83-.42 7.03 1.17 9.34.8 1.16 1.76 2.47 3.01 2.42 1.21-.05 1.66-.78 3.13-.78 1.47 0 1.87.78 3.09.76 1.28-.02 2.09-1.18 2.89-2.35.91-1.26 1.28-2.48 1.3-2.55-.03-.01-2.5-.96-2.53-3.61zM15.16 5.4c.63-.76 1.06-1.81.94-2.87-.91.04-2.01.6-2.66 1.36-.58.67-1.1 1.76-.96 2.79 1.01.08 2.05-.52 2.68-1.28z"/>';
    const BODIES = {
        canvas: '<i class="st-sticky"></i><i class="st-card"></i><i class="st-ring"></i>',
        web: '<i class="st-url"></i><i class="st-hero"></i><i class="st-l" style="width:70%"></i><i class="st-l" style="width:88%"></i><i class="st-l" style="width:46%"></i>',
        chat: '<i class="st-in"></i><i class="st-out"></i><i class="st-in" style="width:44%"></i><i class="st-out" style="width:52%"></i>',
        code: '<i class="st-c" style="width:42%;--c:#c678dd"></i><i class="st-c" style="width:64%;margin-left:8%;--c:#61afef"></i><i class="st-c" style="width:52%;margin-left:8%;--c:#98c379"></i><i class="st-c" style="width:30%;margin-left:16%;--c:#e5c07b"></i><i class="st-c" style="width:58%;margin-left:8%;--c:#61afef"></i><i class="st-c" style="width:20%;--c:#c678dd"></i><i class="st-c" style="width:48%;--c:#98c379"></i>',
        notes: '<i class="st-h"></i><i class="st-l" style="width:84%"></i><i class="st-l" style="width:72%"></i><i class="st-l" style="width:90%"></i><i class="st-l" style="width:40%"></i>'
    };

    const icon = (root, app) => `<img src="${root}assets/apps/${app}.png" alt="" draggable="false">`;
    const win = (root, { key, app, title, body, rect, dark }) => `
        <div class="st-win${dark ? ' st-win--dark' : ''}" data-win="${key}" style="${rectStyle(rect)}">
            <div class="st-win__bar"><i></i><i></i><i></i>${app ? icon(root, app) : ''}<span>${title}</span></div>
            <div class="st-win__body">${BODIES[body] || body}</div>
        </div>`;
    const rectStyle = ([x, y, w, h]) => `left:${x}%;top:${y}%;width:${w}%;height:${h}%`;
    const place = (el, rect) => {
        const [x, y, w, h] = rect;
        Object.assign(el.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
    };

    // ── Bar items, drawn the way the app draws them: a round control (ring + glyph) and a label slot
    // reserved at the widest label, so nothing in the bar moves when a state changes (WB-PL-15).
    let uid = 0;
    const itemHTML = (kind) => {
        uid += 1;
        const glyph = kind === 'awake'
            ? `<defs><mask id="st-moon-${uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><circle class="st-shadow" fill="#000"/></mask></defs>
               <g class="st-rays">${Array.from({ length: 8 }, () => '<line/>').join('')}</g>
               <circle class="st-disc" cx="12" cy="12" mask="url(#st-moon-${uid})"/>`
            : '<path class="st-glyph" transform="translate(6.6 6.6) scale(0.45)"/>';
        const label = { focus: 'Focus', awake: 'Awake', tidy: 'Tidy' }[kind];
        const slot = { focus: '1:30:00', awake: '4:00:00', tidy: 'Tidy' }[kind];
        return `
            <span class="st-item" data-item="${kind}" role="button" tabindex="-1" aria-label="${label}">
                <span class="st-ctl"><svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle class="st-track" cx="12" cy="12" r="10.5"/>
                    <circle class="st-ripple" cx="12" cy="12" r="10.5"/>
                    <circle class="st-ringfill" cx="12" cy="12" r="10.5" pathLength="100"/>
                    ${glyph}
                </svg></span>
                <span class="st-label"><span class="st-label__slot">${slot}</span><span class="st-label__text">${label}</span>${kind === 'focus' ? '<span class="st-stop" role="button" aria-label="Stop"><i></i></span>' : ''}</span>
            </span>`;
    };

    // One animation clock per item: runs `fn(k)` on the app's spring, k from 0 to 1, from what is on screen now.
    const springRun = () => {
        let frame = 0;
        return (fn, delays = 0) => {
            cancelAnimationFrame(frame);
            if (reduceMotion) {
                fn(() => 1);
                return;
            }
            const start = performance.now();
            const step = (now) => {
                const t = (now - start) / 1000;
                fn((delay = 0) => (t - delay <= 0 ? 0 : t - delay >= 0.6 ? 1 : springEase(t - delay)));
                if (t < 0.6 + delays) {
                    frame = requestAnimationFrame(step);
                }
            };
            frame = requestAnimationFrame(step);
        };
    };

    const ringOf = (item) => {
        const ring = item.querySelector('.st-ringfill');
        return {
            set(fill, color, mode = 'glide') {
                ring.classList.toggle('is-drain', mode === 'drain');
                ring.classList.toggle('is-snap', mode === 'snap');
                ring.style.strokeDashoffset = String(100 * (1 - fill));
                if (color) {
                    ring.style.stroke = color;
                }
            },
            ripple(color) {
                const ripple = item.querySelector('.st-ripple');
                ripple.style.stroke = color;
                ripple.classList.remove('is-on');
                void ripple.getBoundingClientRect();
                ripple.classList.add('is-on');
            },
            press() {
                const ctl = item.querySelector('.st-ctl');
                ctl.classList.remove('is-press');
                void ctl.offsetWidth;
                ctl.classList.add('is-press');
            }
        };
    };

    const setLabel = (item, text, color) => {
        const el = item.querySelector('.st-label__text');
        if (el.textContent !== text) {
            const ticking = /^\d/.test(text) && /^\d/.test(el.textContent);
            el.textContent = text;
            if (!ticking && !reduceMotion) {
                el.classList.remove('is-roll');
                void el.offsetWidth;
                el.classList.add('is-roll');
            }
        }
        el.style.color = color || '';
    };

    const fmt = (sec) => {
        const s = Math.max(0, Math.ceil(sec));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    };

    const focusItem = (item, { quiet }) => {
        const glyph = morpher(item.querySelector('.st-glyph'), 'play');
        const path = item.querySelector('.st-glyph');
        const ring = ringOf(item);
        const api = { state: 'idle', total: 25 * 60, remaining: 25 * 60, speed: 60 };
        const cue = (name) => !quiet() && sound.sfx[name]();
        const paint = () => {
            if (api.state === 'running' || api.state === 'paused') {
                ring.set(1 - api.remaining / api.total);
                setLabel(item, fmt(api.remaining), api.state === 'paused' ? ORANGE : '');
            }
        };
        api.start = (minutes) => {
            if (minutes) {
                api.total = minutes * 60;
                api.remaining = api.total;
            }
            api.state = 'running';
            item.dataset.state = 'running';
            path.style.fill = ORANGE;
            ring.set(1 - api.remaining / api.total, ORANGE, 'snap');
            ring.press();
            glyph('pause');
            cue('start');
            paint();
        };
        api.pause = () => {
            api.state = 'paused';
            item.dataset.state = 'paused';
            ring.press();
            glyph('play');
            cue('pause');
            paint();
        };
        api.toggle = () => {
            if (api.state === 'running') {
                api.pause();
            } else if (api.state !== 'done') {
                api.start();
            }
        };
        api.idle = (drain) => {
            api.state = 'idle';
            item.dataset.state = 'idle';
            item.classList.remove('is-hover');
            api.remaining = api.total;
            ring.set(0, null, drain ? 'drain' : 'snap');
            path.style.fill = INK;
            glyph('play', drain ? 450 : 0);
            setLabel(item, 'Focus');
        };
        api.stop = () => {
            cue('stop');
            ring.press();
            api.idle(true);
        };
        api.done = () => {
            api.state = 'done';
            item.dataset.state = 'done';
            item.classList.remove('is-hover');
            path.style.fill = GREEN;
            ring.set(1, GREEN);
            ring.press();
            ring.ripple(GREEN);
            glyph('check');
            setLabel(item, 'Done');
            cue('chime');
            api.onDone && api.onDone();
        };
        api.tick = (dt) => {
            if (api.state !== 'running') {
                return;
            }
            api.remaining -= dt * api.speed;
            if (api.remaining <= 0) {
                api.remaining = 0;
                api.done();
                return;
            }
            paint();
        };
        api.idle(false);
        return api;
    };

    // Moon and sun share one disc, one shadow disc that bites it into a crescent, and 8 rays (the app's sky pose).
    const awakeItem = (item, { quiet }) => {
        const disc = item.querySelector('.st-disc');
        const shadow = item.querySelector('.st-shadow');
        const rays = [...item.querySelectorAll('.st-rays line')];
        const ring = ringOf(item);
        const run = springRun();
        const POSE = {
            moon: { r: 5.32, sx: 15.36, sy: 9.76, ray: 0 },
            sun: { r: 3.08, sx: 22.5, sy: 3.6, ray: 1 }
        };
        let pose = { ...POSE.moon };
        const draw = (p, rayK) => {
            disc.setAttribute('r', p.r.toFixed(2));
            shadow.setAttribute('cx', p.sx.toFixed(2));
            shadow.setAttribute('cy', p.sy.toFixed(2));
            shadow.setAttribute('r', p.r.toFixed(2));
            rays.forEach((ray, i) => {
                const k = rayK(i);
                const a = ((i * 45 - 45 * (1 - k)) * Math.PI) / 180;
                const r0 = 4.76;
                const r1 = 4.76 + (7 - 4.76) * Math.max(0.05, k);
                ray.setAttribute('x1', (12 + Math.sin(a) * r0).toFixed(2));
                ray.setAttribute('y1', (12 - Math.cos(a) * r0).toFixed(2));
                ray.setAttribute('x2', (12 + Math.sin(a) * r1).toFixed(2));
                ray.setAttribute('y2', (12 - Math.cos(a) * r1).toFixed(2));
                ray.style.opacity = String(Math.min(1, k * 1.6));
            });
        };
        const api = { on: false };
        api.set = (on, { silent } = {}) => {
            api.on = on;
            item.dataset.state = on ? 'on' : 'off';
            const from = { ...pose };
            const to = on ? POSE.sun : POSE.moon;
            disc.style.fill = on ? YELLOW : INK;
            ring.set(on ? 1 : 0, YELLOW, on ? 'glide' : 'drain');
            ring.press();
            if (!silent && !quiet()) {
                sound.sfx[on ? 'wake' : 'sleep']();
            }
            run((k) => {
                const kk = k();
                pose = {
                    r: from.r + (to.r - from.r) * kk,
                    sx: from.sx + (to.sx - from.sx) * kk,
                    sy: from.sy + (to.sy - from.sy) * kk,
                    ray: from.ray + (to.ray - from.ray) * kk
                };
                draw(pose, (i) => {
                    const ki = on ? k(i * 0.02) : 1 - k((7 - i) * 0.02);
                    return Math.max(0, Math.min(1.1, ki));
                });
            }, 0.16);
        };
        draw(pose, () => 0);
        ring.set(0, YELLOW, 'snap');
        disc.style.fill = INK;
        return api;
    };

    const tidyItem = (item, { quiet }) => {
        const glyph = morpher(item.querySelector('.st-glyph'), 'tiles');
        const path = item.querySelector('.st-glyph');
        const ring = ringOf(item);
        let timer = 0;
        path.style.fill = INK;
        return {
            flash() {
                clearTimeout(timer);
                ring.press();
                path.style.fill = GREEN;
                glyph('check');
                ring.set(1, GREEN, 'snap');
                ring.ripple(GREEN);
                if (!quiet()) {
                    sound.sfx.chime();
                }
                timer = setTimeout(() => {
                    path.style.fill = INK;
                    glyph('tiles');
                    ring.set(0, GREEN, 'drain');
                }, 1500);
            },
            reset() {
                clearTimeout(timer);
                path.style.fill = INK;
                glyph('tiles', 0);
                ring.set(0, GREEN, 'snap');
            }
        };
    };

    // ── The stage: menu bar, desktop, floating bar, a layer for menus and cards, and a cursor.
    const GROUPS = {
        Design: ['freeform', 'safari', 'messages'],
        Code: ['xcode', 'terminal', 'safari'],
        Inbox: ['mail', 'calendar', 'messages']
    };
    const CHIPS = {
        Design: [['F', '#a259ff', 'Landing v3', 'figma.com'], ['D', '#ea4c89', 'Moodboard', 'dribbble.com']],
        Code: [['G', '#24292f', 'PR #482', 'github.com'], ['L', '#5e6ad2', 'Sprint board', 'linear.app']]
    };

    const stageHTML = (root, { groups, items, chips }) => `
        <div class="st-menubar" aria-hidden="true">
            <svg class="st-apple" viewBox="3 2 18 20">${APPLE}</svg><b>DesktopHQ2</b><span class="st-menus">File&ensp;Edit&ensp;View&ensp;Window</span>
            <span class="st-clock">Thu 9:41</span>
        </div>
        <div class="st-desk" aria-hidden="true"></div>
        <div class="st-sleep" aria-hidden="true"><span></span></div>
        <p class="st-caption" aria-live="polite"></p>
        <div class="st-bar">
            ${groups.map((g, i) => `<span class="st-group${i === 0 ? ' is-active' : ''}" data-group="${g}" role="button" tabindex="-1">
                <b>${g}</b><span class="st-group__row"><span class="st-group__icons">${GROUPS[g].map((app) => icon(root, app)).join('')}</span>${chips ? `<span class="st-chips">${(CHIPS[g] || []).map(([l, c, n, s]) => `<span class="st-chip" style="--chip:${c}" data-name="${n}" data-site="${s}" role="button" tabindex="-1">${l}</span>`).join('')}</span>` : ''}</span>
                <i class="st-group__dot"></i>
            </span>`).join('')}
            ${items.length ? '<span class="st-divider"></span>' : ''}
            ${items.map(itemHTML).join('')}
        </div>
        <div class="st-layer" aria-hidden="true"></div>
        <div class="st-cursor is-gone" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.3-4.1 2.8 6.3 3-1.3-2.8-6.2h6z" fill="#fff" stroke="#1f1a16" stroke-width="1.4" stroke-linejoin="round"/></svg></div>
        <button class="st-replay" type="button" hidden>↺ Replay</button>`;

    const makeStage = (stage, root, config) => {
        stage.innerHTML = stageHTML(root, config);
        const $ = (sel) => stage.querySelector(sel);
        const desk = $('.st-desk');
        const layer = $('.st-layer');
        const cursor = $('.st-cursor');
        const caption = $('.st-caption');
        let captionTimer = 0;
        const S = {
            stage,
            $,
            desk,
            layer,
            root,
            live: false,
            quiet: () => !S.live,
            windows(list) {
                desk.innerHTML = list.map((w) => win(root, w)).join('');
            },
            win: (key) => desk.querySelector(`[data-win="${key}"]`),
            caption(text, hold = 0) {
                clearTimeout(captionTimer);
                caption.classList.toggle('is-on', !!text);
                if (text) {
                    caption.innerHTML = text;
                }
                if (hold) {
                    captionTimer = setTimeout(() => caption.classList.remove('is-on'), hold);
                }
            },
            point(target, ms = 600) {
                const box = stage.getBoundingClientRect();
                let x;
                let y;
                if (typeof target === 'string') {
                    const r = stage.querySelector(target).getBoundingClientRect();
                    x = r.left + r.width / 2 - box.left;
                    y = r.top + r.height / 2 - box.top;
                } else {
                    x = (target[0] / 100) * box.width;
                    y = (target[1] / 100) * box.height;
                }
                cursor.classList.remove('is-gone');
                cursor.style.transitionDuration = `${ms}ms`;
                cursor.style.transform = `translate(${x}px, ${y}px)`;
            },
            click() {
                cursor.classList.remove('is-click');
                void cursor.offsetWidth;
                cursor.classList.add('is-click');
            },
            hideCursor() {
                cursor.classList.add('is-gone');
            },
            card(html, ms) {
                const card = document.createElement('div');
                card.className = 'st-card';
                card.innerHTML = html;
                layer.appendChild(card);
                requestAnimationFrame(() => card.classList.add('is-on'));
                if (ms) {
                    setTimeout(() => S.drop(card), ms);
                }
                return card;
            },
            drop(el) {
                if (!el || !el.isConnected) {
                    return;
                }
                el.classList.remove('is-on');
                setTimeout(() => el.remove(), 300);
            },
            clearLayer() {
                layer.innerHTML = '';
            },
            keys(text, ms = 1600) {
                const k = document.createElement('div');
                k.className = 'st-keys';
                k.innerHTML = text.split('+').map((t) => `<kbd>${t.trim()}</kbd>`).join('<span>+</span>');
                layer.appendChild(k);
                requestAnimationFrame(() => k.classList.add('is-on'));
                setTimeout(() => S.drop(k), ms);
            },
            // Puts a card's centre over an element of the bar.
            anchor(card, sel) {
                const box = stage.getBoundingClientRect();
                const r = stage.querySelector(sel).getBoundingClientRect();
                card.style.left = `${((r.left + r.width / 2 - box.left) / box.width) * 100}%`;
            },
            group(name) {
                stage.querySelectorAll('.st-group').forEach((g) => g.classList.toggle('is-active', g.dataset.group === name));
            }
        };
        return S;
    };

    // ── The four stories. Each returns { duration, steps: [[ms, fn]], reset(), tick(dt), live() }.
    const STORIES = {};

    STORIES.focus = (S) => {
        const focus = focusItem(S.$('[data-item="focus"]'), S);
        const WINDOWS = [
            { key: 'xcode', app: 'xcode', title: 'Xcode — LandingView.swift', body: 'code', rect: [3, 9, 58, 70], dark: true },
            { key: 'safari', app: 'safari', title: 'Safari', body: 'web', rect: [63, 9, 34, 38] },
            { key: 'term', app: 'terminal', title: 'Terminal', body: 'code', rect: [63, 50, 34, 29], dark: true }
        ];
        let menu = null;
        focus.onDone = () => {
            S.card(`<b>Focus done</b><span>25 min in Code</span><em>Again</em>`, 3000);
        };
        const openMenu = () => {
            menu = S.card(`<ul class="st-menu">
                <li>5 min</li><li>15 min</li><li data-m="25">✓&ensp;25 min</li><li>45 min</li><li>90 min</li><hr>
                <li class="is-music">♪&ensp;Rain</li></ul>`);
            menu.classList.add('st-card--menu');
            S.anchor(menu, '[data-item="focus"]');
        };
        return {
            duration: 14500,
            reset() {
                S.windows(WINDOWS);
                S.group('Code');
                S.clearLayer();
                focus.speed = 60;
                focus.total = 25 * 60;
                focus.idle(false);
            },
            steps: [
                [500, () => S.caption('Right-click Focus: pick a length, pick the music.')],
                [700, () => S.point('[data-item="focus"] .st-ctl')],
                [1500, () => {
                    S.click();
                    openMenu();
                }],
                [2300, () => S.point('.st-menu [data-m]', 500)],
                [3100, () => {
                    S.click();
                    S.drop(menu);
                    focus.speed = 200;
                    focus.start(25);
                    S.caption('The ring fills while you work. Rain fades in.');
                }],
                [6000, () => {
                    S.point('[data-item="focus"] .st-ctl', 400);
                }],
                [6500, () => {
                    S.click();
                    focus.pause();
                    S.caption('Paused. The ring breathes until you’re back.');
                }],
                [8000, () => {
                    S.click();
                    focus.speed = 340;
                    focus.start();
                    S.caption('Hover for stop. Nothing else in the bar moves.');
                }],
                [8500, () => S.point('[data-item="focus"] .st-label', 500)],
                [9000, () => S.$('[data-item="focus"]').classList.add('is-hover')],
                [9900, () => {
                    S.$('[data-item="focus"]').classList.remove('is-hover');
                    S.point([50, 60], 900);
                }],
                [10200, () => S.caption('Done: a green check, a chime, a card.')],
                [13600, () => {
                    S.caption('');
                    focus.idle(true);
                }]
            ],
            tick: (dt) => focus.tick(dt),
            live() {
                focus.speed = 30;
                const item = S.$('[data-item="focus"]');
                item.addEventListener('click', (event) => {
                    if (event.target.closest('.st-stop')) {
                        if (focus.state !== 'idle') {
                            focus.stop();
                        }
                        return;
                    }
                    if (focus.state === 'done') {
                        focus.idle(true);
                        return;
                    }
                    // On touch there is no hover: a tap on the time shows the stop button first.
                    if (event.target.closest('.st-label') && focus.state !== 'idle' && !item.classList.contains('is-hover') && matchMedia('(hover: none)').matches) {
                        item.classList.add('is-hover');
                        setTimeout(() => item.classList.remove('is-hover'), 2500);
                        return;
                    }
                    focus.toggle();
                });
                S.caption('Your turn: click Focus. Shown 30× faster.', 3500);
            }
        };
    };

    STORIES.awake = (S) => {
        const awake = awakeItem(S.$('[data-item="awake"]'), S);
        const sleep = S.$('.st-sleep');
        const clock = S.$('.st-clock');
        const st = { pct: 38, rate: 0, minutes: 0, clockRate: 0, asleep: false };
        const WINDOWS = [
            { key: 'export', app: 'freeform', title: 'Exporting “Launch film”', body: '<div class="st-export"><b>Exporting…</b><span class="st-export__bar"><i></i></span><em>38%</em></div>', rect: [16, 14, 52, 40] },
            { key: 'music', app: 'music', title: 'Music', body: 'notes', rect: [58, 40, 36, 38] }
        ];
        const paint = () => {
            const w = S.win('export');
            if (!w) {
                return;
            }
            w.querySelector('.st-export__bar i').style.width = `${st.pct}%`;
            w.querySelector('em').textContent = st.pct >= 100 ? 'Done ✓' : `${Math.floor(st.pct)}%`;
            w.querySelector('b').textContent = st.pct >= 100 ? 'Exported' : st.asleep ? 'Paused while asleep' : 'Exporting…';
            const m = 41 + Math.floor(st.minutes);
            clock.textContent = `Thu ${9 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
        };
        const doze = (on) => {
            st.asleep = on;
            sleep.classList.toggle('is-on', on);
            sleep.querySelector('span').textContent = on ? 'zzz… display asleep' : '';
            paint();
        };
        return {
            duration: 13000,
            reset() {
                S.windows(WINDOWS);
                S.group('Design');
                S.clearLayer();
                Object.assign(st, { pct: 38, rate: 0, minutes: 0, clockRate: 0 });
                doze(false);
                awake.set(false, { silent: true });
            },
            steps: [
                [300, () => {
                    st.rate = 2;
                    paint();
                }],
                [600, () => S.caption('An export, and you step away for coffee…')],
                [1500, () => {
                    st.clockRate = 6;
                }],
                [3000, () => {
                    st.clockRate = 0;
                    st.rate = 0;
                    doze(true);
                    S.caption('Without Awake, the Mac dozes off. The export stalls.');
                }],
                [5000, () => {
                    doze(false);
                    S.caption('With Awake: one click.');
                    S.point('[data-item="awake"] .st-ctl');
                }],
                [5800, () => {
                    S.click();
                    awake.set(true);
                }],
                [6600, () => {
                    S.point([62, 30], 900);
                    S.caption('Step away. It stays up and the export finishes.');
                    st.clockRate = 9;
                    st.rate = 26;
                }],
                [9200, () => {
                    st.clockRate = 0;
                    S.caption('Turn it off when you’re done. It lets go by itself at 10% battery.');
                    S.point('[data-item="awake"] .st-ctl', 700);
                }],
                [10800, () => {
                    S.click();
                    awake.set(false);
                }],
                [12400, () => S.caption('')]
            ],
            tick(dt) {
                st.minutes += st.clockRate * dt;
                if (!st.asleep && st.rate) {
                    st.pct = Math.min(100, st.pct + st.rate * dt);
                }
                paint();
            },
            live() {
                S.$('[data-item="awake"]').addEventListener('click', () => {
                    awake.set(!awake.on);
                    st.rate = awake.on ? 8 : 2;
                    if (awake.on) {
                        doze(false);
                    }
                });
                S.caption('Your turn: click Awake.', 3000);
            }
        };
    };

    STORIES.tidy = (S) => {
        const tidy = tidyItem(S.$('[data-item="tidy"]'), S);
        const MESSY = { xcode: [7, 11, 60, 58], safari: [44, 20, 48, 46], notes: [-6, 47, 30, 40], term: [72, 52, 34, 36] };
        const NEAT = { xcode: [1.2, 7.4, 56, 45], notes: [1.2, 54.3, 56, 27], safari: [58.4, 7.4, 40.4, 36], term: [58.4, 45.3, 40.4, 36] };
        const WINDOWS = [
            { key: 'xcode', app: 'xcode', title: 'Xcode', body: 'code', rect: MESSY.xcode, dark: true },
            { key: 'notes', app: 'notes', title: 'Notes', body: 'notes', rect: MESSY.notes },
            { key: 'safari', app: 'safari', title: 'Safari', body: 'web', rect: MESSY.safari },
            { key: 'term', app: 'terminal', title: 'Terminal', body: 'code', rect: MESSY.term, dark: true }
        ];
        const seams = () => `<i class="st-seam" style="left:57.2%;top:7.4%;width:1.2%;height:73.9%"></i>
            <i class="st-seam" style="left:1.2%;top:52.4%;width:56%;height:1.9%"></i>
            <i class="st-seam" style="left:58.4%;top:43.4%;width:40.4%;height:1.9%"></i>
            <span class="st-seam__tag" style="left:57.8%;top:30%">16 pt</span>`;
        const arrange = (layout, slow) => {
            S.desk.classList.toggle('is-gliding', true);
            S.desk.classList.toggle('is-slow', !!slow);
            Object.entries(layout).forEach(([key, rect]) => place(S.win(key), rect));
        };
        const doTidy = () => {
            arrange(NEAT);
            tidy.flash();
            const g = document.createElement('div');
            g.className = 'st-seams';
            g.innerHTML = seams();
            S.layer.appendChild(g);
            setTimeout(() => g.classList.add('is-on'), 260);
            setTimeout(() => S.drop(g), 2600);
        };
        return {
            duration: 11000,
            reset() {
                S.windows(WINDOWS);
                S.desk.classList.remove('is-gliding');
                S.group('Code');
                S.clearLayer();
                tidy.reset();
            },
            steps: [
                [500, () => S.caption('A group gets messy: overlaps, a window off the edge.')],
                [1300, () => S.point('[data-item="tidy"] .st-ctl')],
                [2100, () => {
                    S.click();
                    doTidy();
                    S.caption('One click. 16 points at every edge and seam.');
                }],
                [5000, () => {
                    S.point([70, 10], 600);
                    S.caption('Keep working…');
                }],
                [5700, () => {
                    S.desk.classList.add('is-gliding', 'is-slow');
                    place(S.win('safari'), [40, 16, 50, 44]);
                    place(S.win('term'), [70, 50, 34, 36]);
                    S.point([66, 24], 900);
                }],
                [7600, () => {
                    S.hideCursor();
                    S.keys('Hyper + T');
                    S.caption('…then Hyper+T, and it’s calm again.');
                }],
                [8100, () => doTidy()],
                [10600, () => S.caption('')]
            ],
            tick() {},
            live() {
                const shuffle = document.createElement('button');
                shuffle.type = 'button';
                shuffle.className = 'st-shuffle';
                shuffle.textContent = 'Mess it up';
                shuffle.addEventListener('click', () => arrange(MESSY, true));
                S.stage.appendChild(shuffle);
                S.$('[data-item="tidy"]').addEventListener('click', doTidy);
                S.caption('Your turn: click Tidy, then mess it up again.', 3500);
            }
        };
    };

    STORIES.bookmarks = (S) => {
        const SETS = {
            Design: [
                { key: 'freeform', app: 'freeform', title: 'Freeform', body: 'canvas', rect: [3, 9, 58, 70] },
                { key: 'safari', app: 'safari', title: 'Safari', body: 'web', rect: [63, 9, 34, 70] }
            ],
            Code: [
                { key: 'xcode', app: 'xcode', title: 'Xcode', body: 'code', rect: [3, 9, 58, 70], dark: true },
                { key: 'term', app: 'terminal', title: 'Terminal', body: 'code', rect: [63, 9, 34, 70], dark: true }
            ]
        };
        const PAGES = {
            'Landing v3': ['figma.com', 'linear-gradient(135deg,#a259ff,#ff7262)'],
            Moodboard: ['dribbble.com', 'linear-gradient(135deg,#ea4c89,#ffb36b)'],
            'PR #482': ['github.com', 'linear-gradient(135deg,#24292f,#57606a)'],
            'Sprint board': ['linear.app', 'linear-gradient(135deg,#5e6ad2,#9aa3ff)'],
            Staging: ['staging.app', 'linear-gradient(135deg,#f38020,#ffd27a)']
        };
        let tip = null;
        const show = (group) => {
            S.group(group);
            S.windows(SETS[group]);
            S.desk.classList.remove('is-gliding');
            S.desk.querySelectorAll('.st-win').forEach((w, i) => {
                w.classList.add('is-in');
                w.style.animationDelay = `${i * 50}ms`;
            });
        };
        const open = (name) => {
            const [site, art] = PAGES[name];
            S.desk.querySelectorAll('[data-win="page"]').forEach((w) => w.remove());
            S.desk.insertAdjacentHTML('beforeend', win(S.root, {
                key: 'page', app: 'safari', title: `${name} — ${site}`, rect: [20, 13, 60, 62],
                body: `<i class="st-url"></i><i class="st-art" style="background:${art}"></i><i class="st-l" style="width:60%"></i><i class="st-l" style="width:80%"></i>`
            }));
            S.win('page').classList.add('is-pop');
            if (!S.quiet()) {
                sound.sfx.key();
            }
        };
        const hover = (chip) => {
            S.drop(tip);
            if (!chip) {
                return;
            }
            tip = S.card(`<b>${chip.dataset.name}</b><span>${chip.dataset.site}</span>`);
            tip.classList.add('st-card--tip');
            const box = S.stage.getBoundingClientRect();
            const r = chip.getBoundingClientRect();
            tip.style.left = `${((r.left + r.width / 2 - box.left) / box.width) * 100}%`;
        };
        const chip = (group, i) => S.$(`.st-group[data-group="${group}"] .st-chip:nth-child(${i + 1})`);
        return {
            duration: 12500,
            reset() {
                S.clearLayer();
                S.stage.querySelectorAll('.st-chip.is-new').forEach((c) => c.remove());
                show('Design');
            },
            steps: [
                [500, () => S.caption('Each group carries its own links, files and folders.')],
                [900, () => S.point('.st-group[data-group="Design"] .st-chip:nth-child(1)')],
                [1500, () => hover(chip('Design', 0))],
                [2400, () => {
                    S.click();
                    hover(null);
                    open('Landing v3');
                    S.caption('One click opens it, in this group.');
                }],
                [4300, () => S.point('.st-group[data-group="Code"] b')],
                [5000, () => {
                    S.click();
                    show('Code');
                    S.caption('Switch groups, and the right links come along.');
                }],
                [5800, () => S.point('.st-group[data-group="Code"] .st-chip:nth-child(1)')],
                [6400, () => hover(chip('Code', 0))],
                [7200, () => {
                    S.click();
                    hover(null);
                    open('PR #482');
                }],
                [8600, () => {
                    S.hideCursor();
                    S.keys('Hyper + D');
                    S.caption('Hyper+D saves the tab you’re on.');
                }],
                [9200, () => {
                    const chips = S.$('.st-group[data-group="Code"] .st-chips');
                    chips.insertAdjacentHTML('beforeend', '<span class="st-chip is-new" style="--chip:#f38020" data-name="Staging" data-site="staging.app" role="button" tabindex="-1">S</span>');
                }],
                [12000, () => S.caption('')]
            ],
            tick() {},
            live() {
                S.stage.querySelectorAll('.st-group').forEach((g) => g.addEventListener('click', (event) => {
                    const c = event.target.closest('.st-chip');
                    if (c) {
                        S.group(g.dataset.group);
                        open(c.dataset.name);
                        return;
                    }
                    show(g.dataset.group);
                }));
                S.stage.querySelectorAll('.st-chip').forEach((c) => {
                    c.addEventListener('pointerenter', () => hover(c));
                    c.addEventListener('pointerleave', () => hover(null));
                });
                S.caption('Your turn: switch groups, open a link.', 3500);
            }
        };
    };

    const CONFIG = {
        focus: { groups: ['Design', 'Code'], items: ['focus'] },
        awake: { groups: ['Design', 'Code'], items: ['awake'] },
        tidy: { groups: ['Design', 'Code'], items: ['tidy'] },
        bookmarks: { groups: ['Design', 'Code'], items: [], chips: true }
    };

    // ── Engine: a story clock that only runs while the stage is on screen, and stops for good on the first tap.
    const mount = (stage, key, root, { onLoop, onProgress } = {}) => {
        const S = makeStage(stage, root, CONFIG[key]);
        const story = STORIES[key](S);
        const replay = S.$('.st-replay');
        let t = 0;
        let next = 0;
        let last = 0;
        let raf = 0;
        let visible = false;
        let dead = false;
        stage.dataset.story = key;

        const restart = () => {
            t = 0;
            next = 0;
            story.reset();
            S.caption('');
            S.hideCursor();
        };
        const frame = (now) => {
            const dt = Math.min(now - last, 100) / 1000;
            last = now;
            if (!S.live && !reduceMotion) {
                t += dt * 1000;
                while (next < story.steps.length && story.steps[next][0] <= t) {
                    story.steps[next][1]();
                    next += 1;
                }
                onProgress && onProgress(Math.min(t / story.duration, 1));
                if (t >= story.duration) {
                    if (onLoop && onLoop()) {
                        return;
                    }
                    restart();
                }
            }
            story.tick(dt);
            raf = requestAnimationFrame(frame);
        };
        const run = () => {
            cancelAnimationFrame(raf);
            if (visible && !document.hidden && !dead) {
                last = performance.now();
                raf = requestAnimationFrame(frame);
            }
        };
        const takeOver = () => {
            if (S.live) {
                return;
            }
            S.live = true;
            stage.classList.add('is-live');
            S.hideCursor();
            replay.hidden = false;
            story.live();
            onProgress && onProgress(1);
            stage.dispatchEvent(new CustomEvent('st-live', { bubbles: true }));
        };
        const onDown = (event) => {
            if (!event.target.closest('.st-replay')) {
                takeOver();
            }
        };
        stage.addEventListener('pointerdown', onDown, true);
        replay.addEventListener('click', () => {
            // A fresh mount drops every listener the live mode added.
            api.destroy();
            const again = mount(stage, key, root, { onLoop, onProgress });
            Object.assign(api, again);
            again.show(true);
        });
        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            run();
        }, { threshold: 0.35 });
        io.observe(stage);
        const onVis = () => run();
        document.addEventListener('visibilitychange', onVis);

        restart();
        if (reduceMotion) {
            // No autoplay: start in a state that already says what the plugin does, and hand over control.
            story.steps.forEach(([, fn]) => fn());
            S.hideCursor();
            takeOver();
        }
        const api = {
            show(isVisible) {
                visible = isVisible;
                run();
            },
            destroy() {
                dead = true;
                cancelAnimationFrame(raf);
                stage.removeEventListener('pointerdown', onDown, true);
                io.disconnect();
                document.removeEventListener('visibilitychange', onVis);
            },
            S
        };
        return api;
    };

    // ── Home: tabs on the left, one stage, copy and install below; each story hands over to the next.
    const ICONS = {
        focus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg>',
        awake: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>',
        tidy: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="16" rx="2" fill="currentColor"/><rect x="13" y="4" width="8" height="7" rx="2" fill="currentColor"/><rect x="13" y="13" width="8" height="7" rx="2" fill="currentColor"/></svg>',
        bookmarks: '<svg viewBox="0 0 24 24"><path d="M6 3.5h12v17l-6-4.2-6 4.2z" fill="currentColor"/></svg>'
    };

    const installButton = (key, extra = '') => `<button class="st-install${extra}" type="button" data-install="${PLUGINS[key].id}" data-name="${PLUGINS[key].name}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Add ${PLUGINS[key].name} to DesktopHQ</button>`;

    document.querySelectorAll('.st-player').forEach((host) => {
        const root = host.dataset.root || '';
        host.innerHTML = `
            <div class="st-tabs" role="tablist" aria-label="Plugins">
                ${ORDER.map((key, i) => `<button class="st-tab" type="button" role="tab" aria-selected="${i === 0}" data-key="${key}">
                    <span class="st-tab__icon">${ICONS[key]}</span>
                    <span class="st-tab__text"><b>${PLUGINS[key].name}</b><small>${PLUGINS[key].tab}</small></span>
                    <span class="st-tab__bar"><i></i></span>
                </button>`).join('')}
            </div>
            <div class="st-main">
                <div class="st-stage"></div>
                <div class="st-copy" aria-live="polite"></div>
            </div>`;
        const stage = host.querySelector('.st-stage');
        const copy = host.querySelector('.st-copy');
        const tabs = [...host.querySelectorAll('.st-tab')];
        let current = null;
        let index = 0;
        let pinned = false;
        let inView = false;

        const select = (i) => {
            index = i;
            const key = ORDER[i];
            tabs.forEach((tab, j) => {
                tab.setAttribute('aria-selected', String(j === i));
                tab.querySelector('i').style.transform = 'scaleX(0)';
            });
            // On phones the tabs are a sideways strip: keep the playing one in view (sideways only, never the page).
            const strip = tabs[i].parentElement;
            if (strip.scrollWidth > strip.clientWidth) {
                strip.scrollTo({ left: tabs[i].offsetLeft - 28, behavior: reduceMotion ? 'auto' : 'smooth' });
            }
            copy.innerHTML = `<h3>${PLUGINS[key].headline}</h3><p>${PLUGINS[key].text}</p>
                <div class="st-ctas">${installButton(key)}<a class="st-more" href="${root}plugins/${key}/">How ${PLUGINS[key].name} works →</a></div>`;
            if (current) {
                current.destroy();
            }
            current = mount(stage, key, root, {
                onLoop: () => {
                    if (pinned) {
                        return false;
                    }
                    select((index + 1) % ORDER.length);
                    return true;
                },
                onProgress: (p) => {
                    tabs[index].querySelector('i').style.transform = `scaleX(${p})`;
                }
            });
            current.show(inView);
        };
        tabs.forEach((tab, i) => tab.addEventListener('click', () => {
            pinned = false;
            select(i);
        }));
        host.addEventListener('keydown', (event) => {
            const i = tabs.indexOf(document.activeElement);
            if (i < 0 || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
                return;
            }
            event.preventDefault();
            const n = (i + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : ORDER.length - 1)) % ORDER.length;
            tabs[n].focus();
            pinned = false;
            select(n);
        });
        // Someone playing with a story keeps it: no more auto-advancing until they pick another tab.
        stage.addEventListener('st-live', () => {
            pinned = true;
        });
        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
        }, { threshold: 0.35 }).observe(stage);
        select(0);
    });

    // ── A plugin page: one story on a loop.
    document.querySelectorAll('.st-solo').forEach((stage) => {
        mount(stage, stage.dataset.story, stage.dataset.root || '');
    });

    // ── Plugin pages: each state of a bar item, drawn by the same code, frozen in place.
    const FOLDER = '<svg viewBox="0 0 24 24" class="pp-folder" aria-hidden="true"><path d="M2.5 6.5a2 2 0 0 1 2-2h5l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#5fb2f5"/><path d="M2.5 9h19v8.5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z" fill="#86c7fa"/></svg>';
    document.querySelectorAll('.pp-pill').forEach((pill) => {
        const { kind, state } = pill.dataset;
        const quiet = { quiet: () => true };
        if (kind === 'bookmarks') {
            pill.innerHTML = {
                link: '<span class="st-chip" style="--chip:#a259ff">F</span><span class="st-chip" style="--chip:#24292f">G</span><span class="st-chip" style="--chip:#5e6ad2">L</span>',
                file: `${FOLDER}<span class="pp-faded">${FOLDER}</span>`,
                hover: '<span class="st-chip" style="--chip:#24292f">G</span><span class="pp-tip"><b>PR #482</b> github.com · Work</span>'
            }[state];
            return;
        }
        pill.innerHTML = itemHTML(kind);
        const item = pill.firstElementChild;
        if (kind === 'focus') {
            const focus = focusItem(item, quiet);
            if (state === 'running' || state === 'paused' || state === 'hover') {
                focus.remaining = 19 * 60 + 47;
                focus.start();
                ringOf(item).set(1 - focus.remaining / focus.total, ORANGE, 'snap');
                if (state === 'paused') {
                    focus.pause();
                }
                item.classList.toggle('is-hover', state === 'hover');
            } else if (state === 'done') {
                focus.done();
            }
        } else if (kind === 'awake') {
            const awake = awakeItem(item, quiet);
            if (state !== 'off') {
                awake.set(true, { silent: true });
            }
            if (state === 'while') {
                setTimeout(() => ringOf(item).set(0.7, YELLOW), 700);
                setLabel(item, '0:42:10');
            }
            if (state === 'group') {
                item.classList.add('is-dim');
                setLabel(item, 'G2');
            }
        } else if (kind === 'tidy' && state === 'done') {
            const ring = ringOf(item);
            morpher(item.querySelector('.st-glyph'), 'check');
            item.querySelector('.st-glyph').style.fill = GREEN;
            ring.set(1, GREEN, 'snap');
        } else if (kind === 'tidy') {
            morpher(item.querySelector('.st-glyph'), 'tiles');
            item.querySelector('.st-glyph').style.fill = INK;
        }
    });

    window.DHQStories = { PLUGINS, installButton };
})();
