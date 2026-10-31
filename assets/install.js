// One-click plugin install. Any `[data-install="<plugin id>"][data-name]` button tries the app's deep link; if the page
// still has focus 1.5 s later, nothing took it, so DesktopHQ is probably not installed and a sheet says what to do.
// Phones and other non-Macs skip the attempt and get "Available on Mac".
(function () {
    // Keep in step with the home page's Download button.
    const DOWNLOAD = 'https://github.com/DesktopHQ/DesktopHQ2-Release/releases/latest/download/DesktopHQ2-arm64.zip';
    const link = (id) => `desktophq2://plugin/install?id=${encodeURIComponent(id)}`;

    const isMac = () => {
        const platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
        // iPads report a Mac platform; touch points give them away.
        return /mac/i.test(platform) && !(navigator.maxTouchPoints > 1);
    };

    let dialog = null;
    const sheet = (html) => {
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.className = 'in-sheet';
            dialog.addEventListener('click', (event) => {
                // A click on the backdrop (outside the panel) closes it.
                if (event.target === dialog || event.target.closest('[data-close]')) {
                    dialog.close();
                }
            });
            document.body.appendChild(dialog);
        }
        dialog.innerHTML = `<div class="in-sheet__panel">${html}<button class="in-sheet__x" type="button" data-close aria-label="Close">×</button></div>`;
        if (dialog.showModal) {
            dialog.showModal();
        } else {
            dialog.setAttribute('open', '');
        }
        return dialog;
    };

    const ICON = '<div class="in-sheet__icon" aria-hidden="true">D</div>';

    const missing = (name, button) => {
        const d = sheet(`${ICON}
            <h2>Install DesktopHQ first</h2>
            <p>${name} lives in DesktopHQ’s bar, and DesktopHQ didn’t open on this Mac.</p>
            <ol><li>Download DesktopHQ and drag it to Applications.</li><li>Open it once.</li><li>Come back and click <b>Add ${name}</b> again.</li></ol>
            <div class="in-sheet__actions">
                <a class="in-sheet__primary" href="${DOWNLOAD}" rel="noopener">Download DesktopHQ2</a>
                <button type="button" class="in-sheet__ghost" data-retry>I have it, try again</button>
            </div>
            <p class="in-sheet__fine">One-click Add arrives in DesktopHQ2 0.1.8, coming soon. Until then, ${name} is already on in Settings → Plugins.</p>`);
        d.querySelector('[data-retry]').addEventListener('click', () => {
            d.close();
            attempt(button);
        });
    };

    const notMac = (name) => {
        const page = location.href.split('#')[0];
        const d = sheet(`${ICON}
            <h2>Available on Mac</h2>
            <p>${name} is a plugin for DesktopHQ, a Mac app. Send yourself the link and add it from your Mac.</p>
            <div class="in-sheet__actions">
                <a class="in-sheet__primary" href="mailto:?subject=${encodeURIComponent(`DesktopHQ: add ${name}`)}&body=${encodeURIComponent(`Open this on your Mac: ${page}`)}">Email me the link</a>
                <button type="button" class="in-sheet__ghost" data-copy>Copy link</button>
            </div>`);
        d.querySelector('[data-copy]').addEventListener('click', (event) => {
            const done = () => {
                event.target.textContent = 'Copied ✓';
            };
            if (navigator.clipboard) {
                navigator.clipboard.writeText(page).then(done, () => {});
            }
        });
    };

    const attempt = (button) => {
        const name = button.dataset.name || 'this plugin';
        if (!isMac()) {
            notMac(name);
            return;
        }
        let left = false;
        const away = () => {
            left = true;
        };
        const onVis = () => {
            if (document.hidden) {
                away();
            }
        };
        window.addEventListener('blur', away);
        document.addEventListener('visibilitychange', onVis);
        button.classList.add('is-trying');
        // Firefox replaces the page with an error for an unknown scheme, so it gets a hidden frame instead.
        if (/firefox/i.test(navigator.userAgent)) {
            const frame = document.createElement('iframe');
            frame.hidden = true;
            frame.src = link(button.dataset.install);
            document.body.appendChild(frame);
            setTimeout(() => frame.remove(), 2000);
        } else {
            window.location.href = link(button.dataset.install);
        }
        setTimeout(() => {
            window.removeEventListener('blur', away);
            document.removeEventListener('visibilitychange', onVis);
            button.classList.remove('is-trying');
            if (!left && !document.hidden && document.hasFocus()) {
                missing(name, button);
            }
        }, 1500);
    };

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-install]');
        if (button) {
            event.preventDefault();
            attempt(button);
        }
    });

    window.DHQInstall = { link, DOWNLOAD };
})();
