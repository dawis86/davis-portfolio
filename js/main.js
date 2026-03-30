/**
 * File: main.js
 * Project: Dāvis Strazds Portfolio
 * Purpose: Central logic engine managing i18n orchestration, asynchronous component injection, and sensory UI feedback.
 * (Mērķis: Centrālais loģikas dzinējs, kas pārvalda i18n koordināciju, komponentu injicēšanu un sensoru UI atsauksmes.)
 * Author: Dāvis Strazds
 * Dependencies: AOS (Animations), Leaflet (Mapping), VanillaTilt (Interactive depth).
 */

/* --- GLOBAL CONFIGURATION (Globālā konfigurācija) --- */
/** 
 * @constant {string} TESTIMONIALS_API - Serverless bridge to Google Sheets. 
 * Used for data persistence without server overhead. (Serverless tilts uz Google Sheets datu saglabāšanai bez servera izmaksām.)
 */
const TESTIMONIALS_API = 'https://script.google.com/macros/s/AKfycbywFOinUTBz29y3djPJk7iCf4gFEqnTuY4_JMKiODl1GK63NX1AOurI2usKrsgjSV9SwQ/exec';

/**
 * State Management for Language and UI (Stāvokļa vadība valodai un UI)
 * Centralizes application state to prevent race conditions during async loads.
 * (Centralizē aplikācijas stāvokli, lai novērstu race conditions asinhronās ielādes laikā.)
 * @namespace AppState
 */
const AppState = {
    /** @property {string} lang - Current active language locale (Pašreizējā aktīvā valodas lokāle) */
    lang: localStorage.getItem('preferredLang') || (navigator.language.startsWith('lv') ? 'lv' : 'en'),
    /** @property {boolean} isNavigating - Navigation lock state (Navigācijas bloķēšanas stāvoklis) */
    isNavigating: false
};

/** @type {AudioContext} audioCtx - Global audio context for UI synthesis (Globālais audio konteksts UI sintēzei) */
let audioCtx; 

/**
 * Programmatic Audio Engine: UI feedback synthesis to avoid large asset overhead.
 * Uses Web Audio API to generate real-time feedback, reducing page load size.
 * (Izmanto Web Audio API, lai ģenerētu reāllaika atsauksmes, samazinot lapas ielādes izmēru.)
 * @param {'success'|'error'} type - Feedback category mapped to specific frequency ramps.
 * @returns {void}
 */
function playUISound(type) {
    try {
        /* Resumed on interaction to bypass browser auto-play policies.
           (Atsākts pie interakcijas, lai apietu pārlūku automātiskās atskaņošanas politikas.) */
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        // Global gain normalization (Globālā skaņas līmeņa normalizācija)
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'success') {
            oscillator.type = 'sine'; 
            /* 880Hz (A5) to 1320Hz (E6) - Harmonic upward ramp signifying positive completion.
               (880Hz līdz 1320Hz - Augšupejoša skaņa, kas norāda uz veiksmīgu pabeigšanu.) */
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); /* Lower gain to prevent audio clipping (Zemāks gain, lai novērstu audio kropļojumus) */
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'error') {
            oscillator.type = 'sawtooth';
            /* 110Hz to 55Hz - Dissonant drop representing a system warning/error.
               (110Hz līdz 55Hz - Disonējošs kritums, kas reprezentē sistēmas kļūdu.) */
            oscillator.frequency.setValueAtTime(110, audioCtx.currentTime); 
            oscillator.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.2); 
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.3);
        }
    } catch (e) { console.warn("Audio Context failed:", e); }
}

/**
 * Entry point for UI component orchestration.
 * (UI komponentu koordinācijas sākuma punkts.)
 * @listens document:DOMContentLoaded
 */
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Main application bootstrap engine. 
 * Orchestrates parallel asset loading and visual state initialization.
 * (Galvenais aplikācijas ielādes dzinējs. Koordinē paralēlu resursu ielādi.)
 * @async @returns {Promise<void>}
 */
async function initApp() {
    const preloader = document.getElementById('preloader');

    /* Load fragments before translation to ensure DOM nodes exist (Ielādēt fragmentus pirms tulkošanas) */
    await Promise.all([
        loadComponent('header', 'header.html'),
        loadComponent('footer', 'footer.html')
    ]);

    // Sync language and translate (Sinhronizēt valodu un tulkot)
    localStorage.setItem('preferredLang', AppState.lang);
    document.documentElement.lang = AppState.lang;
    translatePage();
    updateLangButtons();

    /* Preloader cleanup after assets are ready (Ielādes ekrāna noņemšana) */
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.style.visibility = 'hidden', 800);
    }

    initHeader();
    initFooter();
    initScrollToTop();
    initTypewriter();
    initLaboratory();
    initExcelSimulation();
    initCardEffects();
    initParallax();
    initSkillBars();
    initProjectModals();
    initLeafletMap();
    initScrollSpy();
    optimizeMediaLoading(); // Initialize speed optimizations (Inicializēt ātruma optimizācijas)

    if (window.location.pathname.includes('atsauksmes.html')) {
        fetchDynamicTestimonials();
    }

    if (typeof AOS !== 'undefined') {
        AOS.init({ once: true, duration: 800 });
    }
}

/**
 * Media Loading Optimizer: Enhances performance by applying lazy loading and async decoding.
 * (Mediju ielādes optimizētājs: Uzlabo veiktspēju, lietojot lazy loading un asinhronu dekodēšanu.)
 * Why: Reduces main thread blocking and improves First Contentful Paint.
 * (Kāpēc: Mazina galvenās pavediena bloķēšanu un uzlabo FCP rādītājus.)
 */
function optimizeMediaLoading() {
    // 1. Process all images (Apstrādāt visus attēlus)
    document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
    });

    // 2. Optimize background videos (Optimizēt fona video)
    // Setting preload to metadata prevents full video download on initial page load.
    // (Iestatot preload uz metadata, novērš pilna video lejupielādi pie lapas ielādes.)
    document.querySelectorAll('video.video-background').forEach(video => {
        video.setAttribute('preload', 'metadata');
        // Ensure autoplay still works after metadata is fetched (Nodrošina autoplay darbību)
        video.addEventListener('loadedmetadata', () => video.play(), { once: true });
    });
}

/**
 * Modular Component Injector: Fetches HTML fragments asynchronously.
 * Enables DRY (Don't Repeat Yourself) principle for headers and footers.
 * (Nodrošina DRY principu galvenēm un kājenēm.)
 * @async 
 * @param {string} id - Target DOM element ID for injection.
 * @param {string} file - Path to the HTML fragment.
 * @returns {Promise<void>}
 */
async function loadComponent(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
        const res = await fetch(file);
        const data = await res.text();
        el.innerHTML = data;
    } catch (err) {
        console.error(`Error loading ${file}:`, err);
    }
}

/**
 * Switches application language and persists preference.
 * Uses opacity transitions to mitigate Flash of Un-translated Content (FOTC).
 * (Izmanto caurspīdības pārejas, lai mazinātu netulkotā satura pavīdēšanu.)
 * @param {'lv'|'en'} lang - Targeted language locale.
 * @returns {void}
 */
function switchLanguage(lang) {
    if (AppState.lang === lang || AppState.isNavigating) return;

    AppState.isNavigating = true;
    const wrapper = document.querySelector('.main-wrapper');
    if (wrapper) wrapper.style.opacity = '0';
    
    setTimeout(() => {
        AppState.lang = lang;
        localStorage.setItem('preferredLang', lang);
        document.documentElement.lang = lang;
        
        translatePage();
        updateLangButtons();
        initTypewriter(); 
        
        if (wrapper) wrapper.style.opacity = '1';
        playUISound('success');
        AppState.isNavigating = false;
    }, 400);
}

/**
 * Maps translation dictionary to DOM elements based on data attributes.
 * Traverses DOM and updates nodes with data-i18n attributes.
 * (Meklē DOM un atjaunina mezglus ar data-i18n atribūtiem.)
 * @returns {void}
 */
function translatePage() {
    const lang = localStorage.getItem('preferredLang') || 'lv';
    if (typeof translations === 'undefined') return;

    // Tulkojam teksta saturu un placeholderus
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        const translation = translations[lang] ? translations[lang][key] : null;
        
        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else {
                const icon = el.querySelector('i');
                // Preserves icons while updating text (Saglabā ikonas, atjauninot tekstu)
                if (icon && el.childNodes.length > 0) {
                    const textNode = Array.from(el.childNodes).find(node => node.nodeType === 3);
                    if (textNode) textNode.textContent = ' ' + translation; else el.innerHTML = icon.outerHTML + ' ' + translation;
                } else {
                    el.innerHTML = translation;
                }
            }
        }
    });

    document.querySelectorAll('[data-full-desc-i18n]').forEach(el => {
        const key = el.getAttribute('data-full-desc-i18n');
        const translation = translations[lang] ? translations[lang][key] : null;
        if (translation) {
            el.setAttribute('data-full-desc', translation);
        }
    });
}

/**
 * Integrates with Google Apps Script to fetch live client testimonials.
 * Fetches JSON payload and generates semantic cards dynamically.
 * (Iegūst JSON datus un dinamiski ģenerē semantiskas kartītes.)
 * @async 
 * @returns {Promise<void>}
 */
async function fetchDynamicTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container || AppState.isNavigating) return;
    
    AppState.isNavigating = true; // Lock process (Bloķēt procesu)
    const lang = localStorage.getItem('preferredLang') || 'lv'; 

    try {
        const response = await fetch(TESTIMONIALS_API);
        let reviews = await response.json();
        AppState.isNavigating = false; // Unlock (Atbloķēt)

        if (reviews && reviews.data) reviews = reviews.data;
        
        if (!Array.isArray(reviews) || reviews.length === 0) {
            container.innerHTML = `<p style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 3rem;" data-i18n="testimonials.empty">Pašlaik atsauksmju vēl nav. Esi pirmais!</p>`;
            translatePage();
            return;
        }

        container.innerHTML = reviews.map((rev, idx) => {
            const name = rev.Name || rev.name || "Anonymous";
            const message = rev.Message || rev.message || "";
            const dateRaw = rev.Timestamp || rev.date || new Date();

            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
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
        
        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".testimonial-card"), { max: 10, speed: 400 });
        }
        initCardEffects(); // Re-initialize glow for dynamic elements (Reinicializēt spīdumu dinamiskajiem elementiem)
        translatePage(); // Ensure dynamic content is translated (Nodrošināt dinamiskā satura tulkošanu)
    } catch (err) {
        console.error("Neizdevās ielādēt atsauksmes:", err);
        AppState.isNavigating = false;
    }
}

/**
 * Handles contact form submission with UI feedback and validation.
 * @param {Event} e - Form submission event.
 * @async
 * @returns {Promise<void>}
 */
async function handleFeedbackSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.submit-btn');
    const successMsg = document.getElementById('success-message');

    const nameInput = form.querySelector('[name="name"]');
    const emailInput = form.querySelector('[name="email"]');
    const msgInput = form.querySelector('[name="message"]');
    const gdprInput = form.querySelector('[name="gdpr"]');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = msgInput.value.trim();

    [nameInput, emailInput, msgInput].forEach(el => el.classList.remove('input-error'));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let hasError = false;

    if (!name) { nameInput.classList.add('input-error'); hasError = true; }
    if (!email || !emailRegex.test(email)) { emailInput.classList.add('input-error'); hasError = true; }
    if (!message) { msgInput.classList.add('input-error'); hasError = true; }
    
    if (gdprInput && !gdprInput.checked) {
        gdprInput.parentElement.classList.add('input-error');
        hasError = true;
    }

    if (hasError) { /* Trigger haptic sound and reset error styles (Izsaukt skaņu un atiestatīt kļūdu stilus) */
        playUISound('error');
        setTimeout(() => {
            [nameInput, emailInput, msgInput].forEach(el => el.classList.remove('input-error'));
        }, 500);
        return; 
    }

    const data = { name, email, message };
    const originalBtnHTML = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch(TESTIMONIALS_API, {
            method: 'POST',
            /* Full CORS handling enabled for real confirmation (Pilna CORS apstrāde reālam apstiprinājumam) */
            mode: 'cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok || response.type === 'opaque') { 
            playUISound('success');
            successMsg.classList.add('visible');
            form.reset();
            
            setTimeout(() => {
                successMsg.classList.remove('visible');
                btn.innerHTML = originalBtnHTML;
                btn.disabled = false;
            }, 5000);
        }
        form.reset();
    } catch (err) {
        console.error("Saziņas kļūda:", err);
    } finally {
        btn.disabled = false;
    }
}

/**
 * Syncs language switcher UI buttons with the current active locale.
 * (Sinhronizē valodu slēdža UI pogas ar pašreizējo aktīvo lokāli.)
 * @returns {void}
 */
function updateLangButtons() {
    const lang = localStorage.getItem('preferredLang') || 'lv';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(lang));
    });
}

/**
 * Excel Data Transformation Simulation: Visualizes the power of Java-SQL integration.
 * (Excel datu transformācijas simulācija: Vizualizē Java-SQL integrācijas jaudu.)
 */
function initExcelSimulation() {
    const btn = document.getElementById('btn-run-excel-sim');
    const out = document.getElementById('excel-sim-output');
    if (!btn) return;

    /* Illustrates complex Range-to-Object mapping (Ilustrē sarežģītu Range-to-Object kartēšanu) */
    btn.onclick = () => {
        const lang = localStorage.getItem('preferredLang') || 'lv';
        const t = translations[lang];
        playUISound('success');

        const lines = [
            t["excel.log_open"],
            t["excel.log_handshake"],
            t["excel.log_map"],
            t["excel.log_poi"],
            t["excel.log_heap"],
            t["excel.log_sql"],
            t["excel.log_impact"],
            t["excel.log_success"]
        ];

        let i = 0; out.innerHTML = "";
        const run = () => {
            if (i < lines.length) {
                out.innerHTML += lines[i++] + "<br>";
                out.scrollTop = out.scrollHeight; // Auto-scroll to latest log (Automātiska ritināšana uz jaunāko ierakstu)
                setTimeout(run, 800);
            }
        };
        run();
    };
}

/**
 * UI Utility: Scroll behavior and Navigation spies.
 * (UI palīgrīki: Ritrināšanas uzvedība un navigācijas izsekošana.)
 * Why: Enhances interactivity by dynamically tracking user focus areas.
 * (Kāpēc: Uzlabo interaktivitāti, dinamiski izsekojot lietotāja fokusa zonas.)
 */
function initScrollToTop() {
    const btn = document.createElement('button');
    btn.className = 'scroll-to-top';
    btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 500);
    });

    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Typewriter Engine: Rotates defined professional roles.
 * (Rakstāmmašīnas dzinējs: Rotē definētās profesionālās lomas.)
 */
let typewriterTimeout;
function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    
    clearTimeout(typewriterTimeout);
    const lang = localStorage.getItem('preferredLang') || 'lv';
    const roles = translations[lang] ? translations[lang].hero_roles : ["AI Architect"];
    let roleIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function type() {
        const currentRole = roles[roleIdx] || "";
        if (isDeleting) {
            el.textContent = currentRole.substring(0, charIdx - 1);
            charIdx--;
        } else {
            el.textContent = currentRole.substring(0, charIdx + 1);
            charIdx++;
        }

        let typeSpeed = isDeleting ? 50 : 150;

        if (!isDeleting && charIdx === currentRole.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            roleIdx = (roleIdx + 1) % roles.length;
            typeSpeed = 500;
        }

        typewriterTimeout = setTimeout(type, typeSpeed);
    }
    type();
}

/**
 * ScrollSpy Implementation: Updates active navigation links based on scroll position.
 * Also dynamically updates the navbar background color theme based on section metadata.
 * (Atjaunina aktīvās saites un dinamiski maina navigācijas joslas krāsu tēmu.)
 */
function initScrollSpy() {
    const options = { threshold: 0.3, rootMargin: "-10px" };
    const navbar = document.querySelector('.navbar'); // Navbar reference for theme updates (Atsauce uz navigāciju tēmu maiņai)

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                
                /* Only update links that point to specific anchors (#) on the current page to avoid stripping file-based active states.
                   (Atjaunina tikai enkura saites (#), lai neietekmētu failu bāzēto navigāciju.) */
                document.querySelectorAll('.navbar-menu a[href*="#"]').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href').includes('#' + id));
                });

                /* Update Navbar Theme based on section data attribute (Atjaunina navigācijas tēmu, balstoties uz sekcijas datiem) */
                if (navbar) {
                    const theme = entry.target.getAttribute('data-nav-theme');
                    // Remove all previous theme classes (Noņem visas iepriekšējās tēmu klases)
                    navbar.classList.forEach(className => {
                        if (className.startsWith('nav-theme-')) navbar.classList.remove(className);
                    });
                    // Add new theme class if present (Pievieno jauno tēmu, ja tāda ir definēta)
                    if (theme) navbar.classList.add(`nav-theme-${theme}`);
                }
            }
        });
    }, options);

    document.querySelectorAll('section[id]').forEach(section => observer.observe(section));
}

/**
 * Calculates and updates the top reading progress bar.
 * (Aprēķina un atjaunina augšējo lasīšanas progresa joslu.)
 * @returns {void}
 */
function updateReadingProgress() {
    const progressFill = document.getElementById('reading-progress-fill');
    if (!progressFill) return;

    /* Calculate scroll percentage (Aprēķina ritināšanas procentu) */
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;

    progressFill.style.width = scrolled + "%";
}

/**
 * Header Logic: Handles mobile menu toggles and dynamic background scrolling effects.
 * (Galvenes loģika: Pārvalda mobilo izvēlni un dinamiskos fona ritināšanas efektus.)
 */
function initHeader() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('nav-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('active'));
        
        // Close menu when clicking links
        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => menu.classList.remove('active'));
        });
    }

    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
        updateReadingProgress(); // Sync progress bar (Sinhronizē progresa joslu)
    });

    // Correctly identify the active page even if the path is the root (Pareizi identificē aktīvo lapu arī pie saknes ceļa)
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    document.querySelectorAll('.navbar-menu a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === 'index.html' && href === './')) {
            link.classList.add('active');
        }
    });
}

/**
 * Mouse Tracking Engine: Powers the glow effect for glassmorphism cards.
 * (Peles izsekošanas dzinējs: Nodrošina spīduma efektu glassmorphism kartītēm.)
 */
function initCardEffects() {
    document.querySelectorAll('.project-card, .testimonial-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
    });
}

/**
 * AI Laboratory UI: Simulates agent logic flows and code generation sequences.
 * (MI Laboratorijas UI: Simulē aģentu loģikas plūsmas un koda ģenerēšanas sekvences.)
 */
function initLaboratory() {
    const labBtn = document.getElementById('btn-analyze');
    const taskBtn = document.getElementById('btn-execute');
    const copyBtn = document.getElementById('btn-copy');

    if (labBtn) {
        labBtn.addEventListener('click', () => {
            const prompt = document.getElementById('ai-prompt').value.trim();
            const output = document.getElementById('prompt-output');
            const lang = localStorage.getItem('preferredLang') || 'lv';
            const t = translations[lang];

            if (!prompt) { output.innerHTML = t["coding.error_no_prompt"]; return; }
            playUISound('success');

            const personalities = [t["coding.p_arch"], t["coding.p_sec"], t["coding.p_ux"], t["coding.p_ds"], t["coding.p_cloud"]];
            const randomP = personalities[Math.floor(Math.random() * personalities.length)];
            const sequence = [t["coding.log_neural"], t["coding.log_agent"] + `<span style="color:var(--accent-gold)">${randomP}</span>`, t["coding.log_intent"] + `'${prompt.substring(0, 30)}...'`, t["coding.log_map"], t["coding.log_query"]]; /* Orchestrate visual delay for realism (Koordinē vizuālo aizturi reālismam) */

            let i = 0; output.innerHTML = "";
            const run = () => {
                if (i < sequence.length) {
                    output.innerHTML += sequence[i++] + "<br>";
                    output.scrollTop = output.scrollHeight;
                    setTimeout(run, 600);
                } else {
                    output.innerHTML += `> <span style="color:var(--accent-gold)">${t["coding.generated"]}</span> Risinājums sagatavots.<br>> <span class="blink">_</span>`;
                }
            };
            run();
        });
    }

    if (taskBtn) {
        taskBtn.addEventListener('click', () => {
            const topic = document.getElementById('topic').value.trim();
            const result = document.getElementById('result');
            const lang = localStorage.getItem('preferredLang') || 'lv';
            const t = translations[lang];

            if (!topic) { result.innerHTML = t["coding.error_no_input"]; return; }
            playUISound('success');

            let uzdevums = topic.includes("cikli") ? "Izveido 'for' ciklu Fibonači skaitļiem." : `Integrē '${topic}' loģiku jaunā API galapunktā.`;
            const lines = [t["coding.log_init"], t["coding.log_analyze"] + topic, t["coding.log_kb"], t["coding.log_gen"]];
            
            let i = 0; result.innerHTML = "";
            const printLines = () => {
                if (i < lines.length) {
                    result.innerHTML += lines[i++] + "<br>";
                    setTimeout(printLines, 300);
                } else {
                    result.innerHTML += `<br><span style="color:var(--accent-gold)">${t["coding.success"]}</span> ${uzdevums}<span class="blink">_</span>`;
                }
            };
            printLines();
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const output = document.getElementById('prompt-output').innerText;
            navigator.clipboard.writeText(output).then(() => alert(translations[localStorage.getItem('preferredLang') || 'lv']["coding.alert_copied"]));
        });
    }
}

/**
 * Subtle Background Parallax: Enhances depth by scaling video background on scroll.
 * (Smalks fona paralakse: Uzlabo dziļumu, mērogojot video fonu pie ritināšanas.)
 */
function initParallax() { 
    window.addEventListener('scroll', () => {
        const scroll = window.pageYOffset;
        const video = document.querySelector('.video-background');
        if (video) video.style.transform = `scale(${1 + scroll * 0.0005})`;
    });
}

/**
 * Intersection-based animation for skill visualization bars.
 * (Uz Intersection bāzēta animācija prasmju vizualizācijas joslām.)
 */
function initSkillBars() {
    const bars = document.querySelectorAll('.progress-bar-fill');
    if (bars.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.width = entry.target.getAttribute('data-width');
                }
            });
        }, { threshold: 0.5 });
        bars.forEach(bar => observer.observe(bar));
    }

    document.querySelectorAll('.skill-card').forEach(card => {
        card.addEventListener('click', () => card.classList.toggle('active'));
    });
}

/**
 * Modal Controller: Handles project detail overlays and scroll locks.
 * (Modālā loga kontrolieris: Apstrādā projektu detaļu pārklājumus un ritināšanas bloķēšanu.)
 */
function initProjectModals() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;

    const modalTitle = document.getElementById('modal-title');
    const modalDesc = document.getElementById('modal-desc');
    const modalTech = document.getElementById('modal-tech');
    const closeModalBtn = modal.querySelector('.close-modal');

    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            
            const title = card.querySelector('.card-title').innerText;
            const fullDesc = card.getAttribute('data-full-desc');
            const techBadges = card.querySelector('.badges').innerHTML;

            modalTitle.innerText = title;
            modalDesc.innerHTML = fullDesc;
            modalTech.innerHTML = techBadges;

            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    const close = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    closeModalBtn.onclick = close;
    modal.onclick = (e) => { if(e.target === modal) close(); };
}

/**
 * Map Integration: Renders Dark-Mode Leaflet map with custom markers.
 * (Kartes integrācija: Renderē Dark-Mode Leaflet karti ar pielāgotiem marķieriem.)
 */
function initLeafletMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map('map', { scrollWheelZoom: false }).setView([56.8796, 24.6032], 7);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const lang = localStorage.getItem('preferredLang') || 'lv';
    const popupText = typeof translations !== 'undefined' ? translations[lang]["contact.map_popup"] : "Dāvis Strazds";
    L.marker([56.9496, 24.1052]).addTo(map).bindPopup(popupText);
}

/**
 * Controls the visibility of the scroll-to-top utility.
 * (Kontrolē "ritināt uz augšu" rīka redzamību.)
 */
function initFooter() { 
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear(); 
}