/* ============================================
   QURANIQ - BUG REPORT NUB
   Floating bug report button with screenshot capture
   ============================================ */

const BUG_REPORT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzU3zTnouQtg354xUSUXVaNXwRn2H1i3kt99jVofled3cwPXjZ6vhqUezXhmaY7Fm8i/exec'; // Set this to your Google Apps Script Web App URL

/**
 * Initialize the bug report nub - a tiny floating button on the edge of the screen.
 */
function initBugReport() {
    // Create the floating nub
    const nub = document.createElement('button');
    nub.id = 'bug-nub';
    nub.className = 'bug-nub';
    nub.setAttribute('aria-label', 'Report a bug');
    nub.title = 'Report a bug';
    nub.innerHTML = '🐛';
    nub.addEventListener('click', () => { trackBugReportOpen(); openBugReportModal(); });
    document.body.appendChild(nub);

    // Create the bug report modal
    const modal = document.createElement('div');
    modal.id = 'bug-report-modal';
    modal.className = 'modal hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Report a bug');
    modal.innerHTML = `
        <div class="modal-content bug-report-content">
            <div class="modal-header">
                <h2>🐛 Report a Bug</h2>
                <button class="modal-close" id="bug-report-close" aria-label="Close">&times;</button>
            </div>
            <div class="bug-report-body">
                <div id="bug-screenshot-preview" class="bug-screenshot-preview">
                    <div class="bug-screenshot-loading">📸 Capturing screenshot...</div>
                </div>
                <label for="bug-description" class="bug-label">What went wrong?</label>
                <textarea id="bug-description" class="bug-textarea" placeholder="Describe the issue briefly..." rows="3" maxlength="500"></textarea>
                <div class="bug-char-count"><span id="bug-char-count">0</span>/500</div>
                <button id="bug-submit-btn" class="bug-submit-btn" disabled>
                    Submit Bug Report
                </button>
                <div id="bug-status" class="bug-status"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('bug-report-close').addEventListener('click', closeBugReportModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeBugReportModal();
    });

    const textarea = document.getElementById('bug-description');
    textarea.addEventListener('input', () => {
        const count = textarea.value.length;
        document.getElementById('bug-char-count').textContent = count;
        document.getElementById('bug-submit-btn').disabled = count === 0;
    });

    document.getElementById('bug-submit-btn').addEventListener('click', submitBugReport);
}

/**
 * Capture a screenshot using html2canvas, then open the modal.
 */
async function openBugReportModal() {
    const modal = document.getElementById('bug-report-modal');
    const preview = document.getElementById('bug-screenshot-preview');

    // Hide the nub while modal is open
    document.getElementById('bug-nub').style.display = 'none';

    // Reset form
    document.getElementById('bug-description').value = '';
    document.getElementById('bug-char-count').textContent = '0';
    document.getElementById('bug-submit-btn').disabled = true;
    document.getElementById('bug-status').textContent = '';
    preview.innerHTML = '<div class="bug-screenshot-loading">📸 Capturing screenshot...</div>';

    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Capture screenshot
    try {
        // Dynamically load html2canvas if not already loaded
        if (typeof html2canvas === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        }

        // Hide the modal temporarily for clean screenshot
        modal.style.visibility = 'hidden';
        const canvas = await html2canvas(document.body, {
            scale: 0.5, // Lower res for smaller payload
            useCORS: true,
            logging: false,
            backgroundColor: null
        });
        modal.style.visibility = 'visible';

        // Store the screenshot data
        window._bugScreenshot = canvas.toDataURL('image/jpeg', 0.6);

        // Show preview
        const img = document.createElement('img');
        img.src = window._bugScreenshot;
        img.alt = 'Screenshot preview';
        img.className = 'bug-screenshot-img';
        preview.innerHTML = '';
        preview.appendChild(img);
    } catch (e) {
        preview.innerHTML = '<div class="bug-screenshot-loading">⚠️ Screenshot capture failed (report will still be submitted)</div>';
        modal.style.visibility = 'visible';
        window._bugScreenshot = null;
    }

    // Focus the textarea
    setTimeout(() => document.getElementById('bug-description').focus(), 200);
}

function closeBugReportModal() {
    const modal = document.getElementById('bug-report-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('bug-nub').style.display = '';
    window._bugScreenshot = null;
}

/**
 * Submit the bug report to the Google Apps Script proxy.
 */
async function submitBugReport() {
    const btn = document.getElementById('bug-submit-btn');
    const status = document.getElementById('bug-status');
    const description = document.getElementById('bug-description').value.trim();

    if (!description) return;

    btn.disabled = true;
    btn.textContent = 'Submitting...';
    status.textContent = '';
    status.className = 'bug-status';

    const payload = {
        description: description,
        screenshot: window._bugScreenshot || null,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        gameMode: typeof app !== 'undefined' ? app.currentMode : 'unknown',
        darkMode: document.documentElement.getAttribute('data-theme') === 'dark'
    };

    if (!BUG_REPORT_ENDPOINT) {
        // Fallback: copy to clipboard as JSON
        try {
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            status.textContent = '✅ Bug details copied to clipboard. Please share with the developer.';
            status.className = 'bug-status bug-status-success';
        } catch (e) {
            status.textContent = '⚠️ Bug report endpoint not configured.';
            status.className = 'bug-status bug-status-error';
        }
        btn.textContent = 'Submit Bug Report';
        btn.disabled = false;
        return;
    }

    try {
        const response = await fetch(BUG_REPORT_ENDPOINT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });

        // no-cors means we can't read the response, so assume success
        status.textContent = '✅ Bug report submitted! Thank you for helping improve QuranIQ.';
        status.className = 'bug-status bug-status-success';
        trackBugReportSubmit(true);

        // Close after a delay
        setTimeout(() => closeBugReportModal(), 2500);
    } catch (e) {
        status.textContent = '⚠️ Failed to submit. Please try again later.';
        status.className = 'bug-status bug-status-error';
        trackBugReportSubmit(false);
        btn.textContent = 'Submit Bug Report';
        btn.disabled = false;
    }
}

/**
 * Dynamically load an external script.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
