// API ENDPOINT: Google Apps Script for cloud-side data processing (API GALAPUNKTS: Google Apps Script mākoņpakalpojuma datu apstrādei)
const TESTIMONIALS_API = 'https://script.google.com/macros/s/AKfycbwq4yatKjJC2aCIlh13f4jubsj9omrnpJ9MeprymaIOjca4SEaqXliWhyLeHyNG8z9e/exec';

// Programmatic Audio Engine: Real-time UI feedback synthesis (Programmatiskais audio dzinējs: Reāllaika saskarnes atsauksmju sintēze)
let audioCtx;
function playUISound(type) {
    try {
        // Initialize AudioContext on user interaction (Inicializēt AudioContext pie lietotāja mijiedarbības)
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'success') {
            oscillator.type = 'sine'; // Harmonic feedback (Harmoniskā atgriezeniskā saite)
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'error') {
            oscillator.type = 'sawtooth'; // Alert feedback (Brīdinājuma atgriezeniskā saite)
            oscillator.frequency.setValueAtTime(110, audioCtx.currentTime); 
            oscillator.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.2); 
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) { console.warn("Audio Context failed:", e); }
}

document.addEventListener('DOMContentLoaded', () => {
    // Core Init: Persistent language state management (Galvenā inicializācija: Pastāvīga valodas stāvokļa pārvaldība)
    if (!localStorage.getItem('preferredLang')) {
        localStorage.setItem('preferredLang', 'lv');
    }
    const currentLang = localStorage.getItem('preferredLang');
    document.documentElement.lang = currentLang;

    // Modular UI: Asynchronous component injection (Modulāra saskarne: Asinhrona komponentu injicēšana)
    const loadComponent = (id, file, callback) => {
        const el = document.getElementById(id);
        if (el) {
            fetch(file)
                .then(res => res.text())
                .then(data => {
                    el.innerHTML = data;
                    translatePage(); // Ensure dynamic content is localized (Nodrošināt dinamiskā satura lokalizāciju)
                    if (callback) callback();
                })
                .catch(err => console.error(`Kļūda ielādējot ${file}:`, err));
        }
    };

    loadComponent('header', 'header.html', () => { 
        initHeader(); 
        updateLangButtons(); 
    });
    loadComponent('footer', 'footer.html', initFooter);

    // Initial page translation (Lapas sākotnējā tulkošana)
    translatePage();

    // Conditional execution for testimonials page (Nosacījuma izpilde atsauksmju lapai)
    if (window.location.pathname.includes('atsauksmes.html')) {
        fetchDynamicTestimonials();
    }

    // Animate On Scroll (AOS) framework initialization (Animate On Scroll (AOS) ietvara inicializācija)
    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, duration: 800 });
    }
});

function switchLanguage(lang) {
    // Persistence: Save user language preference (Ilgstoša saglabāšana: Saglabāt lietotāja valodas izvēli)
    localStorage.setItem('preferredLang', lang);
    document.documentElement.lang = lang;
    translatePage();
    updateLangButtons();
    // Refresh context: Reload to ensure all third-party scripts re-initialize (Konteksta atsvaidzināšana: Pārlādēt, lai nodrošinātu trešo pušu skriptu inicializāciju)
    window.location.reload();
}

function translatePage() {
    // i18n Core: Map translation dictionary to DOM elements (i18n kodols: Kartēt tulkojumu vārdnīcu uz DOM elementiem)
    const lang = localStorage.getItem('preferredLang') || 'lv';
    if (typeof translations === 'undefined') return;

    // Tulkojam teksta saturu un placeholderus
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = translations[lang] ? translations[lang][key] : null;
        
        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                const icon = el.querySelector('i');
                if (icon) {
                    el.innerHTML = icon.outerHTML + ' ' + translation;
                } else {
                    el.innerHTML = translation;
                }
            }
        }
    });

    // ARIA Compliance: Update dynamic attributes for accessibility (ARIA atbilstība: Atjaunināt dinamiskos atribūtus piekļūstamībai)
    document.querySelectorAll('[data-full-desc-i18n]').forEach(el => {
        const key = el.getAttribute('data-full-desc-i18n');
        const translation = translations[lang] ? translations[lang][key] : null;
        if (translation) {
            el.setAttribute('data-full-desc', translation);
        }
    });
}

async function fetchDynamicTestimonials() {
    // Asynchronously fetch reviews from Google Sheets backend (Asinhroni iegūt atsauksmes no Google Sheets aizmugursistēmas)
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    const lang = localStorage.getItem('preferredLang') || 'lv'; // Detect active language (Noteikt aktīvo valodu)

    try {
        const response = await fetch(TESTIMONIALS_API);
        let reviews = await response.json();

        // Handle cases where API returns an object with a data array (Apstrādāt gadījumus, ja API atgriež objektu ar datu masīvu)
        if (reviews && reviews.data) reviews = reviews.data;
        
        if (!reviews || reviews.length === 0) {
            container.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 3rem;" data-i18n="testimonials.empty">Pašlaik atsauksmju vēl nav. Esi pirmais!</p>`;
            translatePage();
            return;
        }

        // Filter for approved reviews if the script doesn't do it server-side (Filtrēt apstiprinātās atsauksmes, ja skripts to nedara servera pusē)
        const approvedReviews = reviews.filter(rev => rev.Approved === true || rev.Approved === "TRUE" || rev.Approved === 1);

        container.innerHTML = approvedReviews.map((rev, idx) => {
            // Normalize keys to match Spreadsheet headers (Normalizēt atslēgas, lai tās atbilstu tabulas galvenēm)
            const name = rev.Name || rev.name || "Anonymous";
            const message = rev.Message || rev.message || "";
            const dateRaw = rev.Timestamp || rev.date || new Date();

            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            // Safe date parsing to prevent UI crashes (Droša datuma apstrāde, lai novērstu saskarnes kļūdas)
            const revDate = new Date(dateRaw);
            const formattedDate = isNaN(revDate) ? new Date().toLocaleDateString() : revDate.toLocaleDateString(lang === 'lv' ? 'lv-LV' : 'en-US');

            return `
            <div class="testimonial-card" data-tilt data-aos="fade-up" data-aos-delay="${idx * 100}">
                <div class="card-content">
                    <i class="fas fa-quote-left"></i>
                    <p class="testimonial-text">"${message}"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">${initials}</div>
                        <h3>${name}</h3>
                        <p>${formattedDate}</p>
                        <div class="rating">
                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        // Apply 3D effects to new elements (Lietot 3D efektus jaunajiem elementiem)
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".testimonial-card"), { max: 10, speed: 400 });
        }
    } catch (err) {
        console.error("Neizdevās ielādēt atsauksmes:", err);
    }
}

async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.submit-btn');
    const successMsg = document.getElementById('success-message');
    const originalText = btn.innerHTML;
    const lang = localStorage.getItem('preferredLang') || 'lv';

    const nameInput = form.querySelector('[name="name"]');
    const emailInput = form.querySelector('[name="email"]');
    const msgInput = form.querySelector('[name="message"]');
    const gdprInput = form.querySelector('[name="gdpr"]');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();

    // Reset styles (Atiestatīt stilus)
    [nameInput, emailInput, msgInput].forEach(el => el.classList.remove('input-error'));

    // Validation logic with visual feedback (Validācijas loģika ar vizuālu atgriezenisko saiti)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasError = false;

    if (!name) { nameInput.classList.add('input-error'); hasError = true; }
    if (!email || !emailRegex.test(email)) { emailInput.classList.add('input-error'); hasError = true; }
    if (!message) { msgInput.classList.add('input-error'); hasError = true; }
    
    // Validate GDPR consent (Validēt GDPR piekrišanu)
    if (gdprInput && !gdprInput.checked) {
        gdprInput.parentElement.classList.add('input-error');
        hasError = true;
    }

    if (hasError) {
        playUISound('error'); // Trigger programmatic error buzz (Izsaukt programmatisko kļūdas skaņu)

        // Auto-remove error class after animation (Automātiski noņemt kļūdas klasi pēc animācijas)
        setTimeout(() => {
            [nameInput, emailInput, msgInput].forEach(el => el.classList.remove('input-error'));
        }, 500);
        return; 
    }

    const data = { name, email, message };

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const response = await fetch(TESTIMONIALS_API, {
            method: 'POST',
            mode: 'no-cors', // Security Policy: Opaque request for public endpoints (Drošības politika: Necaurredzams pieprasījums publiskiem galapunktiem)
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        // Note: With no-cors, we can't check response.ok, so we assume success if no error is thrown
        if (successMsg) { 
            playUISound('success'); // Trigger programmatic success chime (Izsaukt programmatisko veiksmes skaņu)

            successMsg.classList.add('visible');
            btn.innerHTML = '<i class="fas fa-check"></i> OK';
            btn.style.background = 'linear-gradient(135deg, #00b09b, #96c93d)';
            
            setTimeout(() => {
                successMsg.classList.remove('visible');
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.style.opacity = '1';
                }, 500); // Wait for fade out animation (Pagaidīt līdz animācija beidzas)
            }, 5000);
        }
        form.reset();
    } catch (err) {
        console.error("Saziņas kļūda:", err);
    } finally {
        btn.disabled = false;
    }
}

function updateLangButtons() {
    const lang = localStorage.getItem('preferredLang') || 'lv';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(lang));
    });
}

function initHeader() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('nav-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('active'));
    }

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // Active link iestatīšana
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-menu a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

function initFooter() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}