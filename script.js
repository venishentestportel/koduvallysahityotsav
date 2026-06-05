if (!window.WA_BACKEND_URL) {
    const hn = window.location.hostname;
    const isLocal = hn === 'localhost' || 
                    hn === '127.0.0.1' || 
                    hn === '[::1]' ||
                    hn.startsWith('192.168.') || 
                    hn.startsWith('10.') || 
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hn) ||
                    hn.endsWith('.local') ||
                    window.location.protocol === 'file:';
    
    if (isLocal) {
        const host = (window.location.protocol === 'file:' || hn === 'localhost' || hn === '127.0.0.1') ? 'localhost' : hn;
        window.WA_BACKEND_URL = `http://${host}:3001`;
    } else {
        window.WA_BACKEND_URL = 'https://koduvelly-backend.onrender.com';
    }
}

// Supabase SDK Client Setup
const SUPABASE_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Data Management Logic
const DEFAULT_DATA = {
    markList: [],
    categories: [],
    programs: [],
    posters: {},
    gallery: [],
    schedule: [],
    contenttext: [],
    categoryPrograms: {},
    stages: [
        { id: 1, stage: 'stage 1' },
        { id: 2, stage: 'stage 2' },
        { id: 3, stage: 'stage 3' },
        { id: 4, stage: 'stage 4' },
        { id: 5, stage: 'stage 5' },
        { id: 6, stage: 'stage 6' },
        { id: 7, stage: 'stage 7' },
        { id: 8, stage: 'stage 8' }
    ],
    stageStatuses: {}
};

let appData = { ...DEFAULT_DATA };
let isDataLoaded = false;

// Notification State (Persistent)
let previousStageIds = JSON.parse(localStorage.getItem('koduvelly_notif_stages') || '{}');
let previousMarkListHash = localStorage.getItem('koduvelly_notif_marks') || '';

function checkAndSendNotification(title, body) {
    // 1. Native OS Notification (if supported & allowed)
    try {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { 
                body: body, 
                icon: 'https://lxbvadjjboavxwidxsnl.supabase.co/storage/v1/object/public/contect%20image/logo.png' 
            });
        }
    } catch(e) { console.warn("Native push failed", e); }

    // 2. Custom In-App Toast Notification (Works on ALL devices)
    let toastContainer = document.getElementById('koduvelly-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'koduvelly-toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.zIndex = '999999';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        // Adjust for mobile screens
        if (window.innerWidth <= 600) {
            toastContainer.style.left = '20px';
            toastContainer.style.right = '20px';
        }
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.style.background = 'rgba(255, 255, 255, 0.98)';
    toast.style.backdropFilter = 'blur(10px)';
    toast.style.borderLeft = '5px solid #1a921a';
    toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
    toast.style.padding = '15px 20px';
    toast.style.borderRadius = '8px';
    toast.style.transform = 'translateX(150%)';
    toast.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    toast.style.cursor = 'pointer';

    toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
            <strong style="color: #2d3748; font-size: 1.05rem;"><i class="fa fa-bell" style="color: #e67e22; margin-right: 5px;"></i> ${title}</strong>
        </div>
        <div style="color: #4a5568; font-size: 0.9rem; line-height: 1.4; margin-top: 4px;">${body}</div>
    `;

    toast.onclick = () => {
        toast.style.transform = 'translateX(150%)';
        setTimeout(() => toast.remove(), 400);
    };

    toastContainer.appendChild(toast);

    // Animate In
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 50);

    // Auto remove after 7 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(150%)';
            setTimeout(() => toast.remove(), 400);
        }
    }, 7000);
}

function getData() {
    return appData;
}

// ================= FETCH =================
async function fetchSupabaseData() {
    // 1. Immediately load from cache to prevent showing loaders if already visited
    const cachedData = sessionStorage.getItem('koduvelly_app_data');
    if (cachedData) {
        try {
            appData = JSON.parse(cachedData);
            isDataLoaded = true;
            window.dispatchEvent(new Event('dataUpdated')); // Instantly hide loaders and show cached data
        } catch (e) {
            console.error("Cache parsing error", e);
        }
    }

    try {
        // Run all global queries concurrently to massively increase speed
        const [
            { data: markData, error: markErr },
            { data: schedData, error: schedErr },
            { data: postersData, error: posterErr },
            { data: galleryData, error: galErr },
            { data: contentData, error: contentErr },
            { data: sData, error: sErr }
        ] = await Promise.all([
            supabaseClient.from('Mark Management').select('*').order('id'),
            supabaseClient.from('Schedule Manager').select('*').order('id'),
            supabaseClient.storage.from('Design Studio').list(),
            supabaseClient.storage.from('Gallery Manager').list(),
            supabaseClient.from('contenttext').select('*').order('id'),
            supabaseClient.from('shediul').select('*').order('id')
        ]);

        if (markErr) throw markErr;
        if (schedErr) throw schedErr;
        if (posterErr) throw posterErr;
        if (galErr) throw galErr;
        if (contentErr) throw contentErr;

        // 1. Categories & Programs (Preset)
        appData.categories = ['UP', 'LP', 'HS', 'HSS', 'JR', 'SR', 'GEN', 'General Category-A', 'General Category-b'];
        appData.programs = []; 
        appData.categoryPrograms = {};

        // Fetch category programs concurrently
        const catPromises = appData.categories.map(async (cat) => {
            try {
                const { data: catData, error: catErr } = await supabaseClient
                    .from(cat)
                    .select('Programs')
                    .neq('Programs', null)
                    .neq('Programs', '');
                
                if (!catErr && catData) {
                    appData.categoryPrograms[cat] = catData.map(d => d.Programs).filter(Boolean);
                }
            } catch(e) {
                console.warn(`Failed to fetch programs for category ${cat}`, e);
            }
        });
        await Promise.all(catPromises);

        // 2. Mark Management
        appData.markList = (markData || []).map(r => ({
            rank: parseInt(r.mark) || 0,
            name: r["House Name"] || '',
            points: parseInt(r.Points) || 0
        }));

        const newMarkListHash = JSON.stringify(appData.markList);
        if (previousMarkListHash !== '' && previousMarkListHash !== newMarkListHash) {
            checkAndSendNotification("Points Updated! 🏆", "The House Mark List has just been updated. Check out the new scores!");
        }
        previousMarkListHash = newMarkListHash;
        localStorage.setItem('koduvelly_notif_marks', previousMarkListHash);

        // 3. Schedule
        appData.schedule = (schedData || []).map(r => ({
            stage: r["Stage Name"] || '',
            current: r["Current Program"] || '',
            upcoming: r["Upcoming Program"] || ''
        }));

        // 4. Posters (Design Studio)
        appData.posters = {};
        if (postersData) {
            for (const file of postersData) {
                if (!file.name || file.name.startsWith('.')) continue;
                const { data } = supabaseClient.storage.from('Design Studio').getPublicUrl(file.name);
                const key = file.name.replace(/\.[^/.]+$/, "");
                appData.posters[key] = data.publicUrl;
            }
        }

        // 5. Gallery
        appData.gallery = [];
        if (galleryData) {
            const origs = galleryData.filter(f => f.name.startsWith('orig_'));
            for (const orig of origs) {
                const ts = orig.name.split('_')[1]?.split('.')[0];
                const { data: origUrl } = supabaseClient.storage.from('Gallery Manager').getPublicUrl(orig.name);
                const thumbName = `thumb_${ts}.jpg`;
                const thumbExists = galleryData.find(f => f.name === thumbName);
                
                let thumbUrl = origUrl.publicUrl;
                if (thumbExists) {
                    const { data: tUrl } = supabaseClient.storage.from('Gallery Manager').getPublicUrl(thumbName);
                    thumbUrl = tUrl.publicUrl;
                }
                
                appData.gallery.push({
                    original: origUrl.publicUrl,
                    thumb: thumbUrl,
                    ts
                });
            }
            appData.gallery.sort((a, b) => b.ts.localeCompare(a.ts));
        }

        // 6. Content Text
        appData.contenttext = (contentData || []).map(r => ({
            id: parseInt(r.id),
            content: r.content || ''
        }));

        // 7. Stages (Registration Manager)
        if (!sErr && sData && sData.length > 0) {
            appData.stages = sData.map(r => ({ id: r.id, stage: r.stage || '' }));
        } else {
            console.warn("Notice: 'shediul' table not found or error. Using default stages.");
            appData.stages = [...DEFAULT_DATA.stages];
        }

        // 8. Stage Statuses and Passwords (Run concurrently)
        appData.stageStatuses = {};
        appData.stageHistory = {};
        appData.stagePasswords = {};
        appData.stageCategories = {};
        appData.stagePrograms = {};

        const stagePromises = appData.stages.filter(s => s.stage).map(async s => {
            const tableName = s.stage.toLowerCase().trim();
            
            // Single query to fetch all data for this stage, drastically reducing network requests!
            const { data: allData, error } = await supabaseClient.from(tableName).select('*').order('id', { ascending: false });
            if (error || !allData) return;

            // In-memory filtering instead of multiple network requests
            const stData = allData.filter(r => r.situation != null).slice(0, 5);
            const passData = allData.filter(r => r.pass != null).sort((a,b) => new Date(b.time || 0) - new Date(a.time || 0));
            const catData = allData.filter(r => r.cat != null);
            const progData = allData.filter(r => r.prog != null);

            if (stData && stData.length > 0) {
                const latestSt = stData[0];
                appData.stageStatuses[s.stage] = latestSt;
                appData.stageHistory[s.stage] = stData;

                if (previousStageIds[s.stage] && previousStageIds[s.stage] < latestSt.id) {
                    const stageDisplay = s.stage.toUpperCase();
                    const catProg = [latestSt.Categories, latestSt.Programs].filter(Boolean).join(' - ');
                    checkAndSendNotification(`🔔 ${stageDisplay}: ${latestSt.situation}`, `${catProg ? catProg : 'Status updated'}`);
                }
                previousStageIds[s.stage] = latestSt.id;
            }

            if (passData && passData.length > 0) {
                appData.stagePasswords[s.stage] = passData[0].pass;
            }

            if (catData && catData.length > 0) {
                appData.stageCategories[s.stage] = catData.map(c => c.cat).filter(Boolean);
            }

            if (progData && progData.length > 0) {
                appData.stagePrograms[s.stage] = progData.map(p => p.prog).filter(Boolean);
            }
        });

        await Promise.all(stagePromises);

        // Save notification state persistently
        localStorage.setItem('koduvelly_notif_stages', JSON.stringify(previousStageIds));

        // Save the freshly fetched data to cache for the next page load
        sessionStorage.setItem('koduvelly_app_data', JSON.stringify(appData));
        
        isDataLoaded = true;
        window.dispatchEvent(new Event('dataUpdated'));

    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// ================= SAVE =================
async function saveData(data) {
    try {
        appData = data;

        // 1. Mark Management
        await supabaseClient.from('Mark Management').delete().gt('id', -1);

        if (appData.markList.length) {
            const { error } = await supabaseClient
                .from('Mark Management')
                .insert(appData.markList.map(m => ({
                    mark: m.rank,
                    "House Name": m.name,
                    Points: m.points
                })));

            if (error) throw error;
        }

        // 2. Schedule
        await supabaseClient.from('Schedule Manager').delete().gt('id', -1);

        if (appData.schedule.length) {
            const { error } = await supabaseClient
                .from('Schedule Manager')
                .insert(appData.schedule.map(s => ({
                    "Stage Name": s.stage,
                    "Current Program": s.current,
                    "Upcoming Program": s.upcoming
                })));

            if (error) throw error;
        }

        // 3. Categories & Programs
        // Preset categories are handled separately now, so no global save needed here.

        // 4. Content Text
        await supabaseClient.from('contenttext').delete().gt('id', -1);

        if (appData.contenttext.length) {
            const { error } = await supabaseClient
                .from('contenttext')
                .insert(appData.contenttext.map((c, i) => ({
                    id: c.id || (i + 1),
                    content: c.content || c
                })));

            if (error) throw error;
        }

        // 5. Stages (Registration Manager)
        const { error: delErr } = await supabaseClient.from('shediul').delete().gt('id', -1);
        
        if (!delErr && appData.stages && appData.stages.length) {
            await supabaseClient
                .from('shediul')
                .insert(appData.stages.map((s, i) => ({
                    id: s.id || (i + 1),
                    stage: s.stage
                })));
        }

        window.dispatchEvent(new Event('dataUpdated'));
        alert("✅ Saved successfully!");

    } catch (error) {
        console.error("Save Error:", error);
        alert("❌ Save failed: " + error.message);
    }
}

// ================= STAGE SITUATIONS =================
async function setStageSituation(stageName, situation, category, program) {
    if (!stageName) return;
    const tableName = stageName.toLowerCase().trim();
    
    try {
        const payload = {
            situation: situation,
            time: new Date().toISOString(),
            Categories: category || '',
            Programs: program || ''
        };
        
        const { error } = await supabaseClient.from(tableName).insert([payload]);
        if (error) throw error;
        
        // Update local state instantly for UI
        if (!appData.stageStatuses) appData.stageStatuses = {};
        appData.stageStatuses[stageName] = payload;
        window.dispatchEvent(new Event('dataUpdated'));
        alert(`Successfully updated ${stageName} to: ${situation}`);
        
        // --- WHATSAPP NOTIFICATION LOGIC ---
        let targetIds = [];
        const checkboxes = document.querySelectorAll('.wa-target-checkbox:checked');
        if (checkboxes && checkboxes.length > 0) {
            targetIds = Array.from(checkboxes).map(cb => cb.value);
        } else {
            try {
                const res = await fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/whatsapp-targets`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) targetIds = data.targets;
                }
            } catch(e) {}
        }
        
        if (targetIds && targetIds.length > 0) {
            const message = `${stageName}\nCategorie : ${category || 'None'}\nProgram : ${program || 'None'}\naction : ${situation}`;
            
            targetIds.forEach(async (chatId) => {
                try {
                    await fetch(`${window.WA_BACKEND_URL || 'https://koduvelly-backend.onrender.com'}/send-message`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chatId: chatId, message: message })
                    });
                } catch (e) {
                    console.error('Failed to send WhatsApp message to', chatId, e);
                }
            });
        }
        
    } catch (err) {
        console.error('Error updating stage situation:', err);
        alert(`Failed to update ${stageName}. Error: ${err.message}. Make sure table '${tableName}' exists.`);
    }
}
window.setStageSituation = setStageSituation;

window.setStagePassword = async function(stageName, password) {
    if (!stageName) return;
    const tableName = stageName.toLowerCase().trim();

    try {
        const { error } = await supabaseClient.from(tableName).insert([{
            pass: password,
            time: new Date().toISOString()
        }]);
        
        if (error) {
            console.error("Supabase Error:", error);
            throw new Error(error.message || JSON.stringify(error));
        }

        if (!appData.stagePasswords) appData.stagePasswords = {};
        appData.stagePasswords[stageName] = password;
        
        window.dispatchEvent(new Event('dataUpdated'));
        return true;
    } catch (error) {
        console.error("Error setting password:", error);
        alert("Database Error: " + error.message + "\n\nMake sure the table '" + tableName + "' exists and has a 'pass' column of type text.");
        throw error;
    }
};

// ================= UI =================
document.addEventListener('DOMContentLoaded', () => {



    fetchSupabaseData();
    
    // Auto-refresh every 10 seconds on the main page to provide a real-time experience
    const isMainPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('koduvellisahitholsv/');
    if (isMainPage) {
        setInterval(() => {
            // Only fetch if tab is visible to save battery/bandwidth
            if (!document.hidden) {
                fetchSupabaseData();
            }
        }, 10000);
    }

    function renderGallery() {
        const data = getData();
        const gallerySection = document.getElementById('gallery-grid');

        if (!gallerySection) return;

        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('koduvellisahitholsv/');
        let displayImages = data.gallery;

        if (isHomePage) {
            displayImages = data.gallery.slice(0, 3);
            const viewAllBtn = document.querySelector('.content-section a[href="gallery.html"]');
            if (viewAllBtn) {
                viewAllBtn.parentElement.style.display = data.gallery.length > 3 ? 'block' : 'none';
            }
        }

        gallerySection.innerHTML = displayImages.map((img, index) => {
            const displayUrl = isHomePage ? img.original : img.original;
            const clickAction = isHomePage ? '' : `onclick="openLightbox(${index}, event)"`;

            return `
                <div class="gallery-item" data-aos="zoom-in" ${clickAction}>
                    <img src="${displayUrl}" alt="Event Image">
                </div>
            `;
        }).join('');
    }

    function renderMarkList() {
        const topContainer = document.getElementById('top-ranks-container');
        const remContainer = document.getElementById('remaining-ranks-container');
        
        // Return if not on the main page where these containers exist
        if (!topContainer && !remContainer) return;

        const list = appData.markList || [];
        
        // Sort by rank ascending, and points descending as secondary key
        const sorted = [...list].sort((a, b) => {
            const rankA = parseInt(a.rank) || 0;
            const rankB = parseInt(b.rank) || 0;
            
            if (rankA > 0 && rankB > 0) {
                if (rankA !== rankB) return rankA - rankB;
            } else if (rankA > 0) {
                return -1;
            } else if (rankB > 0) {
                return 1;
            }
            
            return (b.points || 0) - (a.points || 0);
        });

        // 1. Render Top 2 Cards
        if (topContainer) {
            if (sorted.length === 0) {
                topContainer.innerHTML = `
                    <div style="padding: 3rem 1.5rem; text-align: center; color: #a8a29e; font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif;">
                        <i class="fa fa-trophy" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
                        No team scores recorded yet.
                    </div>
                `;
            } else {
                const DIVISION_MAP = {
                    'Calicut Elite Guild': 'Literature & Arts',
                    'Malappuram Pioneers': 'General Arts',
                    'Kannur Cultural Wings': 'Cultural Club',
                    'Ernakulam Arts club': 'Arts Club',
                    'Thrissur Literary League': 'Literary League'
                };

                const getDivision = (name) => {
                    if (!name) return 'Arts & Culture';
                    const trimmed = name.trim();
                    if (DIVISION_MAP[trimmed]) return DIVISION_MAP[trimmed];
                    
                    const lower = trimmed.toLowerCase();
                    if (lower.includes('lit') || lower.includes('book') || lower.includes('read')) {
                        return 'Literature & Arts';
                    }
                    if (lower.includes('gen') || lower.includes('pioneer') || lower.includes('main')) {
                        return 'General Arts';
                    }
                    if (lower.includes('cult') || lower.includes('wing') || lower.includes('drama')) {
                        return 'Cultural Club';
                    }
                    if (lower.includes('sport') || lower.includes('athlet') || lower.includes('play')) {
                        return 'Sports & Games';
                    }
                    return 'Arts & Culture';
                };

                const champ = sorted[0];
                const champDiv = getDivision(champ.name);
                let topHtml = `
                    <div class="top-rank-card champion-card">
                        <span class="badge-champ">Champion</span>
                        <h3 class="club-name">${champ.name}</h3>
                        <span class="club-division">Division: ${champDiv}</span>
                        <div class="points-display">
                            ${champ.points} <span class="points-label">Points</span>
                        </div>
                        <span class="watermark-num">1</span>
                    </div>
                `;

                if (sorted.length > 1) {
                    const runner = sorted[1];
                    const runnerDiv = getDivision(runner.name);
                    topHtml += `
                        <div class="top-rank-card runnerup-card">
                            <span class="badge-runner">Runner Up</span>
                            <h3 class="club-name">${runner.name}</h3>
                            <span class="club-division">Division: ${runnerDiv}</span>
                            <div class="points-display">
                                ${runner.points} <span class="points-label">Points</span>
                            </div>
                            <span class="watermark-num">2</span>
                        </div>
                    `;
                }
                topContainer.innerHTML = topHtml;
            }
        }

        // 2. Render Remaining Ranks (#03+)
        if (remContainer) {
            if (sorted.length <= 2) {
                remContainer.innerHTML = `
                    <div style="padding: 3rem 1.5rem; text-align: center; color: #a8a29e; font-weight: 500; font-family: 'Plus Jakarta Sans', sans-serif;">
                        <i class="fa fa-list-ol" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
                        No further standings available.
                    </div>
                `;
            } else {
                const remaining = sorted.slice(2);
                remContainer.innerHTML = `
                    <div style="overflow-x: auto;">
                        <table class="remaining-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Participant Club</th>
                                    <th class="th-points">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${remaining.map((item, index) => {
                                    const rankNum = item.rank || (index + 3);
                                    const rankStr = '#' + String(rankNum).padStart(2, '0');
                                    return `
                                        <tr>
                                            <td class="rank-cell">${rankStr}</td>
                                            <td class="club-cell">${item.name}</td>
                                            <td class="points-cell">${item.points}<span>pts</span></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
        }
    }


    function renderStagesList() {
        const table = document.getElementById('hero-stages-table-body');
        if (!table) return;

        function getStageDisplayName(stageName) {
            if (window.getStageDisplayName) return window.getStageDisplayName(stageName);
            if (!stageName) return '';
            return stageName.toLowerCase().trim().replace(/\b\w/g, c => c.toUpperCase());
        }

        if (!appData.stages || appData.stages.length === 0) {
            table.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #666666; padding: 3rem 1.5rem;">No stages created yet.</td></tr>`;
            return;
        }

        table.innerHTML = appData.stages.map(s => {
            const historyList = (appData.stageHistory && appData.stageHistory[s.stage]) || [];
            const currentStatus = historyList.length > 0 ? historyList[0] : null;
            
            const isActive = currentStatus && currentStatus.situation && !currentStatus.situation.toLowerCase().includes('end');
            
            let sessionHtml = '';
            if (isActive) {
                const cat = currentStatus.Categories || '';
                const prog = currentStatus.Programs || '';
                if (prog && cat) {
                    sessionHtml = `<span class="session-cell">${prog} (${cat})</span>`;
                } else {
                    sessionHtml = `<span class="session-cell">${prog || cat || 'Ongoing Session'}</span>`;
                }
            } else {
                sessionHtml = `<span class="session-cell idle">Idle / End of Program</span>`;
            }

            const stageTitle = getStageDisplayName(s.stage);
            const dotClass = isActive ? 'status-dot active' : 'status-dot';
            const badgeClass = isActive ? 'status-badge active' : 'status-badge idle';
            const badgeText = isActive ? 'ACTIVE' : 'IDLE';
            const safeStageParam = s.stage.replace(/'/g, "\\'");

            return `
                <tr>
                    <td>
                        <div class="stage-name-cell">
                            <span class="${dotClass}"></span>
                            <span>${stageTitle}</span>
                        </div>
                    </td>
                    <td>
                        ${sessionHtml}
                    </td>
                    <td>
                        <span class="${badgeClass}">${badgeText}</span>
                    </td>
                    <td style="text-align: right; padding-right: 0.5rem;">
                        <button class="btn-timeline" onclick="openTimelineModal('${safeStageParam}')">Timeline</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderDynamicText() {
        const data = getData();
        const texts = data.contenttext || [];

        const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('koduvellisahitholsv/');
        if (!isHomePage) return;

        const isEditMode = window.location.search.includes('mode=edit');

        // 1. Render all existing content
        texts.forEach(item => {
            const el = document.querySelector(`[data-edit-id="${item.id}"]`);
            if (el) {
                // Statically bound structural elements
                let parsedHTML = item.content;
                try {
                    const payload = JSON.parse(item.content);
                    if (payload && typeof payload.html !== 'undefined') {
                        parsedHTML = payload.html;
                        if (payload.color) el.style.color = payload.color;
                        if (payload.size) el.style.fontSize = payload.size;
                        if (payload.weight) el.style.fontWeight = payload.weight;
                        if (payload.style) el.style.fontStyle = payload.style;
                    }
                } catch(e) {}
                el.innerHTML = parsedHTML;
            } else if (item.id > 100) {
                // Floating textbox JSON payload
                try {
                    const payload = JSON.parse(item.content);
                    if (payload.type === 'image') {
                        createFloatingImageBox(item.id, payload.url, payload.x, payload.y, payload.width, !isEditMode);
                    } else {
                        createFloatingTextBox(item.id, payload.html || payload.text, payload.x, payload.y, payload.color, payload.size, payload.weight, payload.style, !isEditMode);
                    }
                } catch(e) {}
            }
        });

        // 2. Setup Editing if active
        if (isEditMode) {
            let selectedVisualText = null;

            function rgbToHex(rgb) {
                if (!rgb) return "#000000";
                if (rgb.startsWith('#')) return rgb;
                const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                if (!match) return "#000000";
                function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
                return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
            }

            function attachFocusEvents(el, isImage = false) {
                if (el._focusAttached) return;
                el._focusAttached = true;
                el.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    
                    // Clear all others
                    document.querySelectorAll('[data-edit-id]').forEach(node => {
                        node.style.backgroundColor = "transparent";
                    });
                    document.querySelectorAll('.floating-edit-box, .floating-image-box').forEach(node => {
                        node.style.outline = "none";
                    });

                    selectedVisualText = el;
                    let style = window.getComputedStyle(el);
                    
                    let isFloating = !el.hasAttribute('data-edit-id');

                    if (el.hasAttribute('data-edit-id')) {
                        el.style.backgroundColor = "rgba(49, 130, 206, 0.1)";
                    } else {
                        let wrp = el.closest('.floating-edit-box') || el.closest('.floating-image-box');
                        if (wrp) wrp.style.outline = "3px solid #3182ce";
                    }

                    if (isImage) {
                        window.parent.postMessage({
                            action: 'selectionChanged',
                            type: 'image',
                            width: style.width,
                            isFloating: isFloating
                        }, '*');
                    } else {
                        window.parent.postMessage({
                            action: 'selectionChanged',
                            type: 'text',
                            color: rgbToHex(style.color),
                            size: parseInt(style.fontSize),
                            weight: style.fontWeight,
                            style: style.fontStyle,
                            isFloating: isFloating
                        }, '*');
                    }
                });
            }

            document.querySelectorAll('[data-edit-id]').forEach(el => {
                el.contentEditable = "true";
                el.style.border = "2px dashed #3182ce";
                el.style.padding = "4px";
                el.style.cursor = "text";
                el.style.outline = "none";
                attachFocusEvents(el);
            });
            document.body.style.position = 'relative';

            if (!window._editorEventsBound) {
                window._editorEventsBound = true;
                
                // Global deselection
                document.body.addEventListener('mousedown', () => {
                    document.querySelectorAll('[data-edit-id]').forEach(node => {
                        node.style.backgroundColor = "transparent";
                    });
                    document.querySelectorAll('.floating-edit-box, .floating-image-box').forEach(node => {
                        node.style.outline = "none";
                    });
                    selectedVisualText = null;
                });
                
                window.attachFocusEvents = attachFocusEvents;

                // Handle incoming messages from Admin Panel
                window.addEventListener('message', (event) => {
                    const data = event.data;
                    if (!data) return;

                    if (data.action === 'addFloatingText') {
                        let maxId = 100;
                        document.querySelectorAll('.floating-edit-box, .floating-display-box, .floating-image-box').forEach(el => {
                            const id = parseInt(el.getAttribute('data-floating-id'));
                            if (id >= maxId) maxId = id;
                        });
                        createFloatingTextBox(maxId + 1, 'New Text Block', '10%', '20%', '#2d3436', '24px', 'bold', 'normal', false);
                    }

                    if (data.action === 'addFloatingImage') {
                        let maxId = 100;
                        document.querySelectorAll('.floating-edit-box, .floating-display-box, .floating-image-box').forEach(el => {
                            const id = parseInt(el.getAttribute('data-floating-id'));
                            if (id >= maxId) maxId = id;
                        });
                        createFloatingImageBox(maxId + 1, data.url, '20%', '20%', '300px', false);
                    }

                    if (data.action === 'formatText' && selectedVisualText) {
                        selectedVisualText.style[data.prop] = data.value;
                    }
                    
                    if (data.action === 'toggleFormatText' && selectedVisualText) {
                        let styleObj = window.getComputedStyle(selectedVisualText);
                        let current = styleObj[data.prop];
                        
                        if (data.prop === 'fontWeight') {
                            let isBold = current === 'bold' || parseInt(current) >= 700;
                            selectedVisualText.style.fontWeight = isBold ? data.inactiveValue : data.activeValue;
                        } else {
                            selectedVisualText.style[data.prop] = current === data.activeValue ? data.inactiveValue : data.activeValue;
                        }
                        
                        let newStyle = window.getComputedStyle(selectedVisualText);
                        window.parent.postMessage({
                            action: 'selectionChanged',
                            color: rgbToHex(newStyle.color),
                            size: parseInt(newStyle.fontSize),
                            weight: newStyle.fontWeight,
                            style: newStyle.fontStyle,
                            isFloating: !selectedVisualText.hasAttribute('data-edit-id')
                        }, '*');
                    }

                    if (data.action === 'clearAllFloatingElements') {
                        document.querySelectorAll('.floating-edit-box, .floating-image-box').forEach(el => el.remove());
                        selectedVisualText = null;
                        window.parent.postMessage({ action: 'selectionCleared' }, '*');
                    }

                    if (data.action === 'deleteSelectedVisualElement' && selectedVisualText) {
                        let isFloating = !selectedVisualText.hasAttribute('data-edit-id');
                        if (isFloating) {
                            let wrp = selectedVisualText.closest('.floating-edit-box') || selectedVisualText.closest('.floating-image-box');
                            if (wrp) wrp.remove();
                            selectedVisualText = null;
                        }
                    }

                    if (data.action === 'requestPayload') {
                        const payload = [];
                        document.querySelectorAll('[data-edit-id]').forEach(el => {
                            payload.push({ id: parseInt(el.getAttribute('data-edit-id')), content: JSON.stringify({
                                html: el.innerHTML,
                                color: window.getComputedStyle(el).color,
                                size: parseInt(window.getComputedStyle(el).fontSize) + 'px',
                                weight: window.getComputedStyle(el).fontWeight,
                                style: window.getComputedStyle(el).fontStyle
                            })});
                        });
                        document.querySelectorAll('.floating-edit-box').forEach(el => {
                            const id = parseInt(el.getAttribute('data-floating-id'));
                            const textEl = el.querySelector('.float-text-content');
                            payload.push({ id: id, content: JSON.stringify({
                                html: textEl.innerHTML,
                                x: el.style.left,
                                y: el.style.top,
                                color: window.getComputedStyle(textEl).color,
                                size: parseInt(window.getComputedStyle(textEl).fontSize) + 'px',
                                weight: window.getComputedStyle(textEl).fontWeight,
                                style: window.getComputedStyle(textEl).fontStyle
                            })});
                        });
                        document.querySelectorAll('.floating-image-box').forEach(el => {
                            const id = parseInt(el.getAttribute('data-floating-id'));
                            const imgEl = el.querySelector('.float-image-content');
                            payload.push({ id: id, content: JSON.stringify({
                                type: 'image',
                                url: imgEl.src,
                                x: el.style.left,
                                y: el.style.top,
                                width: window.getComputedStyle(imgEl).width
                            })});
                        });
                        window.parent.postMessage({ action: 'editorPayloadResponse', payload: payload }, '*');
                    }
                });
            }
        }
    }

    function createFloatingImageBox(id, url, x, y, width, isReadOnly) {
        if (document.querySelector(`[data-floating-id="${id}"]`)) return;

        const wrapper = document.createElement('div');
        wrapper.className = isReadOnly ? 'floating-display-box' : 'floating-image-box';
        wrapper.setAttribute('data-floating-id', id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = x;
        wrapper.style.top = y;
        wrapper.style.zIndex = "990";

        const imgEl = document.createElement('img');
        imgEl.className = 'float-image-content';
        imgEl.src = url;
        imgEl.style.width = width || '300px';
        imgEl.style.height = 'auto';
        imgEl.style.display = 'block';
        imgEl.style.boxShadow = isReadOnly ? "none" : "0 4px 6px rgba(0,0,0,0.1)";
        imgEl.style.borderRadius = "4px";

        if (!isReadOnly) {
            imgEl.style.cursor = "pointer";
            imgEl.draggable = false;
            if (typeof window.attachFocusEvents === 'function') {
                window.attachFocusEvents(imgEl, true);
            }
            
            const handle = document.createElement('div');
            handle.innerHTML = 'M';
            handle.style.position = 'absolute';
            handle.style.top = '-25px';
            handle.style.left = '0';
            handle.style.background = '#2b6cb0';
            handle.style.color = 'white';
            handle.style.padding = '2px 6px';
            handle.style.borderRadius = '4px';
            handle.style.fontSize = '12px';
            handle.style.cursor = 'move';
            handle.style.userSelect = 'none';

            const delBtn = document.createElement('div');
            delBtn.innerHTML = 'X';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '-25px';
            delBtn.style.right = '0';
            delBtn.style.background = '#e53e3e';
            delBtn.style.color = 'white';
            delBtn.style.padding = '2px 6px';
            delBtn.style.borderRadius = '4px';
            delBtn.style.fontSize = '12px';
            delBtn.style.cursor = 'pointer';
            delBtn.style.userSelect = 'none';
            delBtn.onclick = () => wrapper.remove();

            const resizeBtn = document.createElement('div');
            resizeBtn.innerHTML = '⤡';
            resizeBtn.style.position = 'absolute';
            resizeBtn.style.bottom = '-12px';
            resizeBtn.style.right = '-12px';
            resizeBtn.style.background = '#38a169'; // Green resize
            resizeBtn.style.color = 'white';
            resizeBtn.style.width = '24px';
            resizeBtn.style.height = '24px';
            resizeBtn.style.borderRadius = '50%';
            resizeBtn.style.display = 'flex';
            resizeBtn.style.alignItems = 'center';
            resizeBtn.style.justifyContent = 'center';
            resizeBtn.style.fontSize = '14px';
            resizeBtn.style.cursor = 'nwse-resize';
            resizeBtn.style.userSelect = 'none';

            wrapper.appendChild(handle);
            wrapper.appendChild(delBtn);
            wrapper.appendChild(resizeBtn);

            let isDragging = false, startX, startY, initialX, initialY;
            handle.onmousedown = function(e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = wrapper.offsetLeft;
                initialY = wrapper.offsetTop;
                document.onmousemove = function(e) {
                    if (!isDragging) return;
                    e.preventDefault();
                    wrapper.style.left = (initialX + (e.clientX - startX)) + 'px';
                    wrapper.style.top = (initialY + (e.clientY - startY)) + 'px';
                };
                document.onmouseup = function() {
                    isDragging = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };

            let isResizing = false, rStartX, startW;
            resizeBtn.onmousedown = function(e) {
                isResizing = true;
                e.stopPropagation();
                rStartX = e.clientX;
                startW = imgEl.offsetWidth;
                document.onmousemove = function(e) {
                    if (!isResizing) return;
                    e.preventDefault();
                    let dx = e.clientX - rStartX;
                    let nw = Math.max(50, startW + dx);
                    imgEl.style.width = nw + 'px';
                    
                    if (selectedVisualText === imgEl) {
                        window.parent.postMessage({
                            action: 'selectionChanged',
                            type: 'image',
                            width: nw + 'px'
                        }, '*');
                    }
                };
                document.onmouseup = function() {
                    isResizing = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        }

        wrapper.appendChild(imgEl);
        document.body.appendChild(wrapper);
    }

    function createFloatingTextBox(id, htmlStr, x, y, color, size, weight, fontStyle, isReadOnly) {
        // Prevent dupes on re-render
        if (document.querySelector(`[data-floating-id="${id}"]`)) return;

        const wrapper = document.createElement('div');
        wrapper.className = isReadOnly ? 'floating-display-box' : 'floating-edit-box';
        wrapper.setAttribute('data-floating-id', id);
        wrapper.style.position = 'absolute';
        wrapper.style.left = x;
        wrapper.style.top = y;
        wrapper.style.zIndex = "1000";

        const textEl = document.createElement('div');
        textEl.className = 'float-text-content';
        textEl.innerHTML = htmlStr;
        textEl.style.color = color || '#000000';
        textEl.style.fontSize = size || '24px';
        textEl.style.fontFamily = "'Outfit', sans-serif";
        textEl.style.fontWeight = weight || "bold";
        textEl.style.fontStyle = fontStyle || "normal";

        if (!isReadOnly) {
            textEl.contentEditable = "true";
            textEl.style.border = "2px dashed #38a169";
            textEl.style.padding = "4px";
            textEl.style.cursor = "text";
            textEl.style.outline = "none";
            textEl.style.minWidth = "100px";
            textEl.style.minHeight = "30px";
            
            
            if (typeof window.attachFocusEvents === 'function') {
                window.attachFocusEvents(textEl);
            }
            
            const handle = document.createElement('div');
            handle.innerHTML = 'Move';
            handle.style.position = 'absolute';
            handle.style.top = '-25px';
            handle.style.left = '0';
            handle.style.background = '#38a169';
            handle.style.color = 'white';
            handle.style.padding = '2px 6px';
            handle.style.borderRadius = '4px';
            handle.style.fontSize = '12px';
            handle.style.cursor = 'move';
            handle.style.userSelect = 'none';

            const delBtn = document.createElement('div');
            delBtn.innerHTML = 'X';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '-25px';
            delBtn.style.right = '0';
            delBtn.style.background = '#e53e3e';
            delBtn.style.color = 'white';
            delBtn.style.padding = '2px 6px';
            delBtn.style.borderRadius = '4px';
            delBtn.style.fontSize = '12px';
            delBtn.style.cursor = 'pointer';
            delBtn.style.userSelect = 'none';
            delBtn.onclick = () => wrapper.remove();

            wrapper.appendChild(handle);
            wrapper.appendChild(delBtn);

            let isDragging = false, startX, startY, initialX, initialY;
            handle.onmousedown = function(e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                initialX = wrapper.offsetLeft;
                initialY = wrapper.offsetTop;
                document.onmousemove = function(e) {
                    if (!isDragging) return;
                    e.preventDefault();
                    wrapper.style.left = (initialX + (e.clientX - startX)) + 'px';
                    wrapper.style.top = (initialY + (e.clientY - startY)) + 'px';
                };
                document.onmouseup = function() {
                    isDragging = false;
                    document.onmousemove = null;
                    document.onmouseup = null;
                };
            };
        }

        wrapper.appendChild(textEl);
        document.body.appendChild(wrapper);
    }

    window.addEventListener('dataUpdated', () => {
        renderGallery();
        renderMarkList();
        renderStagesList();
        renderDynamicText();
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    });


    console.log("✅ App loaded with Supabase");
});