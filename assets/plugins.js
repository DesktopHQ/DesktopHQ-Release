// Playable plugin cards: Focus (with focus music) and Awake.
// Renders into every `.pl-showcase`; `data-root` is the path back to the site root for links and `data-cards`
// picks which cards (timer, awake; both by default). Also shares sound and glyph morphs as `window.DHQ`.
(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Sound: tiny WebAudio blips and generated ambience. Nothing plays before the first tap.
    const sound = (() => {
        let ctx = null;
        let master = null;
        let on = true;
        const ensure = () => {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) {
                return null;
            }
            if (!ctx) {
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.9;
                master.connect(ctx.destination);
            }
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            return ctx;
        };
        // Notes: [frequency, start offset s, length s].
        const play = (notes, type = 'sine', level = 0.125) => {
            if (!on || !ensure()) {
                return;
            }
            const t0 = ctx.currentTime + 0.01;
            notes.forEach(([f, at, len]) => {
                const env = ctx.createGain();
                env.gain.setValueAtTime(0, t0 + at);
                env.gain.linearRampToValueAtTime(level, t0 + at + 0.004);
                env.gain.exponentialRampToValueAtTime(0.001, t0 + at + len);
                env.connect(master);
                [[f, 1], [f * 2, 0.25]].forEach(([freq, amount]) => {
                    const osc = ctx.createOscillator();
                    const mix = ctx.createGain();
                    osc.type = type;
                    osc.frequency.value = freq;
                    mix.gain.value = amount;
                    osc.connect(mix).connect(env);
                    osc.start(t0 + at);
                    osc.stop(t0 + at + len + 0.02);
                });
            });
        };
        const noiseBuffer = (kind) => {
            const length = ctx.sampleRate * 4;
            const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            let last = 0;
            for (let i = 0; i < length; i++) {
                const white = Math.random() * 2 - 1;
                if (kind === 'brown') {
                    last = (last + 0.02 * white) / 1.02;
                    data[i] = last * 3.5;
                } else {
                    data[i] = white;
                }
            }
            return buffer;
        };
        const sfx = {
            start: () => play([[660, 0, 0.09], [990, 0.07, 0.14]]),
            pause: () => play([[520, 0, 0.07]]),
            stop: () => play([[660, 0, 0.09], [440, 0.07, 0.16]]),
            wake: () => play([[1047, 0, 0.1], [1319, 0.06, 0.1], [1568, 0.12, 0.18]], 'sine', 0.094),
            sleep: () => play([[330, 0, 0.18]]),
            key: () => play([[1800, 0, 0.025]], 'square', 0.03),
            chime: () => play([[784, 0, 0.12], [1175, 0.09, 0.24]], 'sine', 0.1)
        };

        // Focus music: rain, ocean and fire, generated from noise so no audio files ship.
        let ambience = null;
        const stopAmbience = () => {
            if (!ambience) {
                return;
            }
            const { gain, nodes, timer } = ambience;
            clearInterval(timer);
            gain.gain.cancelScheduledValues(ctx.currentTime);
            gain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
            setTimeout(() => nodes.forEach((n) => n.stop && n.stop()), 1200);
            ambience = null;
        };
        const startAmbience = (kind) => {
            stopAmbience();
            if (!on || kind === 'off' || !ensure()) {
                return;
            }
            const gain = ctx.createGain();
            gain.gain.value = 0;
            gain.connect(master);
            const src = ctx.createBufferSource();
            src.buffer = noiseBuffer(kind === 'rain' ? 'white' : 'brown');
            src.loop = true;
            const nodes = [src];
            let timer = 0;
            if (kind === 'rain') {
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 900;
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 5200;
                src.connect(hp).connect(lp).connect(gain);
                gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.5);
            } else if (kind === 'ocean') {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 650;
                const swell = ctx.createGain();
                swell.gain.value = 0.5;
                const lfo = ctx.createOscillator();
                lfo.frequency.value = 0.11;
                const depth = ctx.createGain();
                depth.gain.value = 0.42;
                lfo.connect(depth).connect(swell.gain);
                lfo.start();
                nodes.push(lfo);
                src.connect(lp).connect(swell).connect(gain);
                gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.5);
            } else {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 320;
                src.connect(lp).connect(gain);
                gain.gain.setTargetAtTime(0.35, ctx.currentTime, 0.5);
                // Crackles: short bright pops at random moments.
                timer = setInterval(() => {
                    if (Math.random() < 0.55) {
                        const at = ctx.currentTime + Math.random() * 0.2;
                        const pop = ctx.createOscillator();
                        const env = ctx.createGain();
                        pop.type = 'square';
                        pop.frequency.value = 1200 + Math.random() * 2400;
                        env.gain.setValueAtTime(0.018 + Math.random() * 0.03, at);
                        env.gain.exponentialRampToValueAtTime(0.0001, at + 0.012);
                        pop.connect(env).connect(gain);
                        pop.start(at);
                        pop.stop(at + 0.02);
                    }
                }, 140);
            }
            src.start();
            ambience = { gain, nodes, timer };
        };

        return {
            sfx,
            startAmbience,
            stopAmbience,
            get on() {
                return on;
            },
            set on(value) {
                on = value;
                if (!on) {
                    stopAmbience();
                }
            }
        };
    })();

    // ── Morphing glyph: two 4-point polygons that become ▶, ‖ or ■.
    const GLYPHS = {
        play: [[[7.5, 4.5], [12.6, 7.7], [12.6, 16.3], [7.5, 19.5]], [[12.6, 7.7], [19.5, 12], [19.5, 12], [12.6, 16.3]]],
        pause: [[[6.5, 5], [10.3, 5], [10.3, 19], [6.5, 19]], [[13.7, 5], [17.5, 5], [17.5, 19], [13.7, 19]]],
        stop: [[[6, 6], [12, 6], [12, 18], [6, 18]], [[12, 6], [18, 6], [18, 18], [12, 18]]]
    };
    const stroke = ([ax, ay], [bx, by], width) => {
        const len = Math.hypot(bx - ax, by - ay);
        const nx = (-(by - ay) / len) * (width / 2);
        const ny = ((bx - ax) / len) * (width / 2);
        return [[ax - nx, ay - ny], [ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny]]
            .map(([x, y]) => [x * 24, (1 - y) * 24]);
    };
    GLYPHS.check = [stroke([0.1, 0.52], [0.38, 0.2], 0.2), stroke([0.3, 0.2], [0.92, 0.86], 0.2)];
    const toPath = (shape) => shape.map((poly) => 'M' + poly.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z').join('');
    // The app's shared spring (mass 1, stiffness 320, damping 24: ratio ≈ 0.67, settles in ≈ 0.45 s), so web and app move alike.
    const SPRING = { w: Math.sqrt(320), z: 24 / (2 * Math.sqrt(320)) };
    const springEase = (seconds) => {
        const { w, z } = SPRING;
        const wd = w * Math.sqrt(1 - z * z);
        return 1 - Math.exp(-z * w * seconds) * (Math.cos(wd * seconds) + ((z * w) / wd) * Math.sin(wd * seconds));
    };
    const morpher = (path, initial) => {
        let current = GLYPHS[initial].map((poly) => poly.map((p) => p.slice()));
        let frame = 0;
        path.setAttribute('d', toPath(current));
        return (name, duration = 450) => new Promise((resolve) => {
            cancelAnimationFrame(frame);
            const from = current.map((poly) => poly.map((p) => p.slice()));
            const to = GLYPHS[name];
            if (reduceMotion || duration === 0) {
                current = to.map((poly) => poly.map((p) => p.slice()));
                path.setAttribute('d', toPath(current));
                resolve();
                return;
            }
            const start = performance.now();
            const step = (now) => {
                const t = Math.min((now - start) / duration, 1);
                const k = t < 1 ? springEase((now - start) / 1000) : 1;
                current = from.map((poly, i) => poly.map(([x, y], j) => [x + (to[i][j][0] - x) * k, y + (to[i][j][1] - y) * k]));
                path.setAttribute('d', toPath(current));
                if (t < 1) {
                    frame = requestAnimationFrame(step);
                } else {
                    resolve();
                }
            };
            frame = requestAnimationFrame(step);
        });
    };

    const fmt = (seconds) => {
        const s = Math.max(0, Math.ceil(seconds));
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const r = String(s % 60).padStart(2, '0');
        return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
    };

    const render = (root, allLink, cards) => [`
        <article class="pl-card pl-timer" data-state="idle">
            <header class="pl-card__head">
                <div>
                    <h3 class="pl-card__name">Focus</h3>
                    <p class="pl-card__blurb">A countdown that lives in your bar, with focus music to keep you in the zone.</p>
                </div>
                <button class="pl-sound" type="button" aria-pressed="true" aria-label="Sound">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl-sound__body" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="pl-sound__waves" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="pl-sound__off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>
                </button>
            </header>
            <div class="pl-timer__body">
                <div class="pl-pill" aria-hidden="true">
                    <svg class="pl-pill__ring" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><circle class="pl-pill__fill" cx="10" cy="10" r="7.5" pathLength="100"/></svg>
                    <span class="pl-pill__label">Focus</span>
                </div>
                <div class="pl-dial">
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                        <circle class="pl-dial__track" cx="100" cy="100" r="88"/>
                        <circle class="pl-dial__arc" cx="100" cy="100" r="88" pathLength="1000"/>
                    </svg>
                    <div class="pl-dial__face">
                        <span class="pl-dial__time" role="timer" aria-live="off">25:00</span>
                        <span class="pl-dial__status">Ready</span>
                    </div>
                </div>
                <div class="pl-controls">
                    <button class="pl-btn pl-btn--stop" type="button" aria-label="Stop" tabindex="-1">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>
                    </button>
                    <button class="pl-btn pl-btn--main" type="button" aria-label="Start">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="pl-btn__glyph"/></svg>
                    </button>
                </div>
                <div class="pl-chips" role="group" aria-label="Length">
                    <button type="button" data-min="5">5 min</button>
                    <button type="button" data-min="25" aria-pressed="true">25 min</button>
                    <button type="button" data-min="50">50 min</button>
                </div>
                <div class="pl-music" role="group" aria-label="Focus music">
                    <span class="pl-music__label">Focus music</span>
                    <button type="button" data-music="rain" aria-pressed="true"><span aria-hidden="true">🌧</span> Rain</button>
                    <button type="button" data-music="ocean"><span aria-hidden="true">🌊</span> Ocean</button>
                    <button type="button" data-music="fire"><span aria-hidden="true">🔥</span> Fireplace</button>
                    <button type="button" data-music="off">Off</button>
                </div>
            </div>
            <a class="pl-card__more" href="${root}plugins/focus/">Focus details →</a>
        </article>`, `
        <article class="pl-card pl-awake" data-on="false">
            <div class="pl-awake__sky" aria-hidden="true">
                <i style="left:84%;top:12%"></i><i style="left:90%;top:40%"></i><i style="left:12%;top:62%"></i><i style="left:80%;top:66%"></i><i style="left:20%;top:86%"></i>
            </div>
            <header class="pl-card__head">
                <div>
                    <h3 class="pl-card__name">Keep Awake</h3>
                    <p class="pl-card__blurb">Your Mac won't doze off mid-download. It switches itself off at 10% battery.</p>
                </div>
            </header>
            <button class="pl-awake__toggle" type="button" role="switch" aria-checked="false" aria-label="Keep Awake">
                <svg viewBox="-60 -60 120 120" aria-hidden="true">
                    <defs>
                        <mask id="pl-moon-mask" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120">
                            <rect x="-60" y="-60" width="120" height="120" fill="#fff"/>
                            <circle class="pl-awake__shadow" cx="13" cy="-11" r="21" fill="#000"/>
                        </mask>
                    </defs>
                    <g class="pl-awake__rays">
                        ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="-34" x2="0" y2="-44" transform="rotate(${i * 45})" style="--i:${i}"/>`).join('')}
                    </g>
                    <circle class="pl-awake__disc" r="24" mask="url(#pl-moon-mask)"/>
                </svg>
            </button>
            <p class="pl-awake__status" aria-live="polite"><strong>Sleeping normally</strong><span>Tap to stay awake</span></p>
        </article>`].filter((_, i) => cards.includes(['timer', 'awake'][i])).join('')
        + (allLink ? `<a class="pl-all" href="${root}plugins/">All plugins →</a>` : '');

    const focusTimer = (card) => {
        const main = card.querySelector('.pl-btn--main');
        const stopBtn = card.querySelector('.pl-btn--stop');
        const glyph = morpher(card.querySelector('.pl-btn__glyph'), 'play');
        const time = card.querySelector('.pl-dial__time');
        const status = card.querySelector('.pl-dial__status');
        const arc = card.querySelector('.pl-dial__arc');
        const pillLabel = card.querySelector('.pl-pill__label');
        const pillFill = card.querySelector('.pl-pill__fill');
        const chips = card.querySelectorAll('.pl-chips button');
        const music = card.querySelectorAll('.pl-music button[data-music]');
        const soundBtn = card.querySelector('.pl-sound');
        let total = 25 * 60;
        let remaining = total;
        let endsAt = 0;
        let tick = 0;
        let state = 'idle';
        let track = 'rain';

        const paint = () => {
            const progress = remaining / total;
            arc.style.strokeDashoffset = String(1000 * (1 - progress));
            pillFill.style.strokeDashoffset = String(100 * progress);
            time.textContent = fmt(remaining);
            pillLabel.textContent = state === 'idle' ? 'Focus' : fmt(remaining);
        };
        const setState = (next) => {
            state = next;
            card.dataset.state = next;
            status.textContent = { idle: 'Ready', running: 'Focusing', paused: 'Paused' }[next];
            main.setAttribute('aria-label', next === 'running' ? 'Pause' : next === 'paused' ? 'Resume' : 'Start');
            stopBtn.tabIndex = next === 'idle' ? -1 : 0;
            chips.forEach((chip) => {
                chip.disabled = next !== 'idle';
            });
        };
        const loop = () => {
            remaining = (endsAt - Date.now()) / 1000;
            if (remaining <= 0) {
                remaining = 0;
                finish(true);
                return;
            }
            paint();
        };
        const start = () => {
            endsAt = Date.now() + remaining * 1000;
            clearInterval(tick);
            tick = setInterval(loop, 250);
            setState('running');
            glyph('pause');
            sound.sfx.start();
            sound.startAmbience(track);
            paint();
        };
        const pause = () => {
            clearInterval(tick);
            remaining = (endsAt - Date.now()) / 1000;
            setState('paused');
            glyph('play');
            sound.sfx.pause();
            sound.stopAmbience();
            paint();
        };
        const finish = async (done) => {
            clearInterval(tick);
            sound.stopAmbience();
            if (done) {
                sound.sfx.chime();
            } else {
                sound.sfx.stop();
            }
            card.classList.add('is-draining');
            setState('idle');
            await glyph('stop', 220);
            remaining = total;
            paint();
            await glyph('play');
            setTimeout(() => card.classList.remove('is-draining'), reduceMotion ? 0 : 420);
        };

        main.addEventListener('click', () => (state === 'running' ? pause() : start()));
        stopBtn.addEventListener('click', () => state !== 'idle' && finish(false));
        chips.forEach((chip) => chip.addEventListener('click', () => {
            chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
            total = Number(chip.dataset.min) * 60;
            remaining = total;
            sound.sfx.key();
            paint();
        }));
        music.forEach((button) => button.addEventListener('click', () => {
            music.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
            track = button.dataset.music;
            if (state === 'running') {
                sound.startAmbience(track);
            } else {
                sound.sfx.key();
            }
        }));
        soundBtn.addEventListener('click', () => {
            sound.on = !sound.on;
            document.querySelectorAll('.pl-sound').forEach((b) => b.setAttribute('aria-pressed', String(sound.on)));
            if (sound.on && state === 'running') {
                sound.startAmbience(track);
            }
        });
        // Leaving the page silences the music; the countdown itself keeps true time.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                sound.stopAmbience();
            } else if (state === 'running') {
                sound.startAmbience(track);
            }
        });
        paint();
    };

    const keepAwake = (card) => {
        const toggle = card.querySelector('.pl-awake__toggle');
        const title = card.querySelector('.pl-awake__status strong');
        const sub = card.querySelector('.pl-awake__status span');
        let since = 0;
        let tick = 0;
        const update = () => {
            sub.textContent = `Awake for ${fmt((Date.now() - since) / 1000)}`;
        };
        toggle.addEventListener('click', () => {
            const on = card.dataset.on !== 'true';
            card.dataset.on = String(on);
            toggle.setAttribute('aria-checked', String(on));
            clearInterval(tick);
            if (on) {
                since = Date.now();
                title.textContent = 'Staying awake';
                update();
                tick = setInterval(update, 1000);
                sound.sfx.wake();
            } else {
                title.textContent = 'Sleeping normally';
                sub.textContent = 'Tap to stay awake';
                sound.sfx.sleep();
            }
        });
    };

    window.DHQ = { sound, morpher, GLYPHS, springEase, reduceMotion, fmt };

    document.querySelectorAll('.pl-showcase').forEach((host) => {
        const cards = (host.dataset.cards || 'timer awake').split(/[\s,]+/);
        host.innerHTML = render(host.dataset.root || '', !host.hasAttribute('data-no-index'), cards);
        host.classList.toggle('pl-showcase--single', cards.length === 1);
        host.classList.toggle('pl-showcase--pair', cards.length === 2);
        [['.pl-timer', focusTimer], ['.pl-awake', keepAwake]].forEach(([sel, init]) => {
            const card = host.querySelector(sel);
            if (card) {
                init(card);
            }
        });
    });
})();
