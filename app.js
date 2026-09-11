// State Management
const state = {
    currentUser: 'Guest',
    version: '',
    championsData: {},
    championsArray: [],
    currentRole: 'all', // 'all', 'top', 'jungle', 'mid', 'adc', 'support'
    
    // UI State
    mainView: {
        selectedOpponent: null,
        selectedMyChamp: null,
    },
    dataView: {
        selectedMyChamp: null, // For tier list reference
        modalTarget: null // 'role' or 'myPool'
    },
    
    // User Data (Loaded from localStorage)
    userData: {
        roles: {}, // { champId: ['top', 'mid'] }
        myPool: {},
        matchups: {}, // { myChampId: { oppChampId: { tier: '1', comment: '...', aiSummary: '...' } } }
    }
};

// DOM Elements
const els = {
    // Header
    loginBtn: document.getElementById('login-btn'),
    roleBtns: document.querySelectorAll('.role-btn'),
    resetBtn: document.getElementById('reset-btn'),
    
    // Views
    mainView: document.getElementById('main-view'),
    dataEntryView: document.getElementById('data-entry-view'),
    modeToggleBtn: document.getElementById('mode-toggle-btn'),
    
    // Main View
    selectionMode: document.getElementById('selection-mode'),
    matchupMode: document.getElementById('matchup-mode'),
    backToSelectionBtn: document.getElementById('back-to-selection-btn'),
    oppGrid: document.getElementById('opp-champion-grid'),
    myGrid: document.getElementById('my-champion-grid'),
    
    // Matchup Details View
    matchupOppImg: document.getElementById('matchup-opp-img'),
    matchupOppName: document.getElementById('matchup-opp-name'),
    oppSkillsList: document.getElementById('opp-skills-list'),
    matchupMyImg: document.getElementById('matchup-my-img'),
    matchupMyName: document.getElementById('matchup-my-name'),
    matchupDifficulty: document.getElementById('matchup-difficulty'),
    mySkillsList: document.getElementById('my-skills-list'),
    
    // AI & Comments
    generateAiBtn: document.getElementById('generate-ai-btn'),
    aiLoading: document.getElementById('ai-loading'),
    aiResult: document.getElementById('ai-result'),
    champComment: document.getElementById('champ-comment'),
    saveCommentBtn: document.getElementById('save-comment-btn'),
    oppSearch: document.getElementById('opp-search'),
    
    // Data Entry View
    dataAllChampions: document.getElementById('data-all-champions'),
    dataMyChampions: document.getElementById('data-my-champions'),
    dataAllSearch: document.getElementById('data-all-search'),
    addToRoleBtn: document.getElementById('add-to-role-btn'),
    addToMyPoolBtn: document.getElementById('add-to-my-pool-btn'),
    tierReferenceContainer: document.getElementById('tier-reference-container'),
    tierReferenceName: document.getElementById('tier-reference-name'),
    tierDropzones: document.querySelectorAll('.tier-dropzone'),
    
    // Modal
    modal: document.getElementById('selection-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalGrid: document.getElementById('modal-champion-grid'),
    modalCancelBtn: document.getElementById('modal-cancel-btn'),
    modalConfirmBtn: document.getElementById('modal-confirm-btn'),
    
    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    authCloseBtn: document.getElementById('auth-close-btn'),
    authModalTitle: document.getElementById('auth-modal-title'),
    authUsernameInput: document.getElementById('auth-username'),
    authPasswordInput: document.getElementById('auth-password'),
    authErrorMsg: document.getElementById('auth-error-msg'),
    authSubmitBtn: document.getElementById('auth-submit-btn'),
    authSwitchBtn: document.getElementById('auth-switch-btn'),
    authGuestBtn: document.getElementById('auth-guest-btn'),
};

// Initialize
async function init() {
    loadUserData();
    await fetchRiotData();
    setupEventListeners();
    renderMainView();
}

// Data Loading / Saving
function loadUserData() {
    const savedUser = localStorage.getItem('lol_pick_system_current_user');
    if (savedUser) {
        state.currentUser = savedUser;
    }
    
    if (els.loginBtn) {
        els.loginBtn.textContent = state.currentUser === 'Guest' ? '로그인 (Guest)' : `로그아웃 (${state.currentUser})`;
    }

    const key = state.currentUser === 'Guest' ? 'lol_pick_system_data' : `lol_pick_system_data_${state.currentUser}`;
    const saved = localStorage.getItem(key);
    
    // Reset to defaults first
    state.userData = {
        roles: { top: [], jungle: [], mid: [], adc: [], support: [] },
        myPool: { top: [], jungle: [], mid: [], adc: [], support: [] },
        matchups: {},
        apiKey: ''
    };
    
    if (saved) {
        const parsed = JSON.parse(saved);
        if(parsed.roles) state.userData.roles = parsed.roles;
        if(parsed.myPool) state.userData.myPool = parsed.myPool;
        if(parsed.matchups) state.userData.matchups = parsed.matchups;
        if(parsed.apiKey) state.userData.apiKey = parsed.apiKey;
    }

    // 미리 분류된 기본 라인별 챔피언 데이터 주입 (데이터가 아예 비어있을 경우)
    const isRolesEmpty = Object.values(state.userData.roles).every(arr => arr.length === 0);
    if (isRolesEmpty) {
        state.userData.roles = {
            top: ['Aatrox', 'Akali', 'Camille', 'ChoGath', 'Darius', 'DrMundo', 'Fiora', 'Gangplank', 'Garen', 'Gnar', 'Gragas', 'Gwen', 'Illaoi', 'Irelia', 'Jax', 'Jayce', 'KSante', 'Kayle', 'Kennen', 'Kled', 'Malphite', 'Maokai', 'Mordekaiser', 'Nasus', 'Olaf', 'Ornn', 'Pantheon', 'Poppy', 'Quinn', 'Renekton', 'Rengar', 'Riven', 'Rumble', 'Sett', 'Shen', 'Singed', 'Sion', 'Sylas', 'TahmKench', 'Teemo', 'Trundle', 'Tryndamere', 'Urgot', 'Vayne', 'Volibear', 'Warwick', 'Wukong', 'Yasuo', 'Yone', 'Yorick', 'Zac'],
            jungle: ['Amumu', 'Belveth', 'Briar', 'Diana', 'Ekko', 'Elise', 'Evelynn', 'Fiddlesticks', 'Gragas', 'Graves', 'Hecarim', 'Ivern', 'JarvanIV', 'Karthus', 'Kayn', 'KhaZix', 'Kindred', 'LeeSin', 'Lillia', 'MasterYi', 'Nidalee', 'Nocturne', 'Nunu', 'Pantheon', 'Poppy', 'Rammus', 'RekSai', 'Rengar', 'Sejuani', 'Shaco', 'Shyvana', 'Skarner', 'Sylas', 'Taliyah', 'Talon', 'Trundle', 'Udyr', 'Vi', 'Viego', 'Volibear', 'Warwick', 'Wukong', 'XinZhao', 'Zac', 'Zed'],
            mid: ['Ahri', 'Akali', 'Akshan', 'Anivia', 'Annie', 'AurelionSol', 'Azir', 'Cassiopeia', 'Corki', 'Diana', 'Ekko', 'Fizz', 'Galio', 'Gangplank', 'Gragas', 'Heimerdinger', 'Hwei', 'Irelia', 'Jayce', 'Kassadin', 'Katarina', 'LeBlanc', 'Lissandra', 'Lucian', 'Lux', 'Malzahar', 'Naafiri', 'Neeko', 'Orianna', 'Pantheon', 'Qiyana', 'Ryze', 'Smolder', 'Sylas', 'Syndra', 'Taliyah', 'Talon', 'Tristana', 'TwistedFate', 'Veigar', 'Velkoz', 'Vex', 'Viktor', 'Vladimir', 'Xerath', 'Yasuo', 'Yone', 'Zed', 'Ziggs', 'Zoe'],
            adc: ['Aphelios', 'Ashe', 'Caitlyn', 'Draven', 'Ezreal', 'Jhin', 'Jinx', 'Kaisa', 'Kalista', 'KogMaw', 'Lucian', 'MissFortune', 'Nilah', 'Samira', 'Sivir', 'Smolder', 'Tristana', 'Twitch', 'Varus', 'Vayne', 'Xayah', 'Yasuo', 'Zeri', 'Ziggs'],
            support: ['Alistar', 'Ashe', 'Bard', 'Blitzcrank', 'Braum', 'Camille', 'Galio', 'Heimerdinger', 'Hwei', 'Janna', 'Karma', 'Leona', 'Lulu', 'Lux', 'Maokai', 'Milio', 'Morgana', 'Nami', 'Nautilus', 'Neeko', 'Pantheon', 'Pyke', 'Rakan', 'Rell', 'Renata', 'Senna', 'Seraphine', 'Shaco', 'Sona', 'Soraka', 'Swain', 'TahmKench', 'Taric', 'Thresh', 'Velkoz', 'Xerath', 'Yuumi', 'Zac', 'Zilean', 'Zyra']
        };
        saveUserData(); // 기본값 자동 저장
    }

    // Inject Yorick's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Yorick'] = state.userData.matchups['Yorick'] || {};
    const yorickData = {
        "Yone": {"tier": "3"}, "Nasus": {"tier": "3"}, "Jayce": {"tier": "1"}, "Jax": {"tier": "3"}, 
        "Gangplank": {"tier": "2"}, "Darius": {"tier": "1"}, "Renekton": {"tier": "2"}, "Garen": {"tier": "3"}, 
        "Sett": {"tier": "3"}, "Mordekaiser": {"tier": "1"}, "Irelia": {"tier": "3"}, "Aatrox": {"tier": "1"}, 
        "Chogath": {"tier": "1"}, "Malphite": {"tier": "2"}, "Teemo": {"tier": "3"}, "Shen": {"tier": "3"}, 
        "Gnar": {"tier": "2"}, "KSante": {"tier": "1"}, "Sion": {"tier": "3"}, "Gwen": {"tier": "3"}, 
        "Camille": {"tier": "3"}, "Ambessa": {"tier": "2"}, "Yasuo": {"tier": "3"}, "Singed": {"tier": "3"}, 
        "DrMundo": {"tier": "1"}, "Fiora": {"tier": "3"}, "Tryndamere": {"tier": "3"}, "Ornn": {"tier": "3"}, 
        "Volibear": {"tier": "2"}, "Urgot": {"tier": "2"}, "Illaoi": {"tier": "2"}, "Zaahen": {"tier": "1"}, 
        "Pantheon": {"tier": "1"}, "Olaf": {"tier": "1"}, "Kennen": {"tier": "2"}, "Warwick": {"tier": "3"}, 
        "Trundle": {"tier": "3"}, "Gragas": {"tier": "1"}, "Rumble": {"tier": "1"}, "Kayle": {"tier": "3"}, 
        "Akali": {"tier": "2"}, "Riven": {"tier": "2"}, "Heimerdinger": {"tier": "1"}, "Kled": {"tier": "2"}, 
        "TahmKench": {"tier": "1"}, "Vayne": {"tier": "1"}, "Vladimir": {"tier": "1"}, "MonkeyKing": {"tier": "3"}, 
        "Poppy": {"tier": "2"}, "Quinn": {"tier": "3"}, "Varus": {"tier": "1"}, "Anivia": {"tier": "3"}, 
        "Ryze": {"tier": "1"}, "Zac": {"tier": "3"}, "Swain": {"tier": "1"}, "Cassiopeia": {"tier": "2"}, 
        "Udyr": {"tier": "3"}, "MasterYi": {"tier": "1"}
    };
    for (const champ in yorickData) {
        state.userData.matchups['Yorick'][champ] = { ...state.userData.matchups['Yorick'][champ], ...yorickData[champ] };
    }
    
    // Ensure Zaahen is in top pool
    if (state.userData.roles.top && !state.userData.roles.top.includes('Zaahen')) {
        state.userData.roles.top.push('Zaahen');
        state.userData.roles.top.sort();
    }
    
    // Inject Zac's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Zac'] = state.userData.matchups['Zac'] || {};
    const zacData = {
        "Yone": {"tier": "1"}, "Nasus": {"tier": "2"}, "Darius": {"tier": "2"}, "Malphite": {"tier": "2"},
        "Garen": {"tier": "3"}, "Mordekaiser": {"tier": "3"}, "Renekton": {"tier": "1"}, "Gangplank": {"tier": "2"},
        "Ambessa": {"tier": "1"}, "Aatrox": {"tier": "2"}, "Sett": {"tier": "1"}, "Jax": {"tier": "2"},
        "Irelia": {"tier": "1"}, "Jayce": {"tier": "1"}, "KSante": {"tier": "2"}, "Fiora": {"tier": "1"},
        "Camille": {"tier": "3"}, "Zaahen": {"tier": "2"}, "Olaf": {"tier": "3"}, "Teemo": {"tier": "2"},
        "Sion": {"tier": "1"}, "DrMundo": {"tier": "1"}, "Gwen": {"tier": "2"}, "Ornn": {"tier": "3"},
        "Shen": {"tier": "1"}, "Gnar": {"tier": "1"}, "Singed": {"tier": "3"}, "Pantheon": {"tier": "2"},
        "Yorick": {"tier": "2"}, "Chogath": {"tier": "2"}, "Tryndamere": {"tier": "1"}, "Riven": {"tier": "1"},
        "Volibear": {"tier": "1"}, "Yasuo": {"tier": "3"}, "Kled": {"tier": "3"}, "Gragas": {"tier": "3"},
        "Illaoi": {"tier": "2"}, "Akali": {"tier": "1"}, "Rumble": {"tier": "1"}, "Urgot": {"tier": "1"},
        "Kennen": {"tier": "2"}, "Vayne": {"tier": "1"}, "Anivia": {"tier": "3"}, "Kayle": {"tier": "1"},
        "Trundle": {"tier": "1"}, "Poppy": {"tier": "2"}, "TahmKench": {"tier": "3"}
    };
    for (const champ in zacData) {
        state.userData.matchups['Zac'][champ] = { ...state.userData.matchups['Zac'][champ], ...zacData[champ] };
    }
    
    // Inject Quinn's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Quinn'] = state.userData.matchups['Quinn'] || {};
    const quinnData = {
        "Gangplank": {"tier": "1"}, "Nasus": {"tier": "2"}, "Darius": {"tier": "1"}, "Jayce": {"tier": "1"},
        "Garen": {"tier": "2"}, "Renekton": {"tier": "3"}, "Yone": {"tier": "1"}, "Malphite": {"tier": "3"},
        "Jax": {"tier": "1"}, "Teemo": {"tier": "3"}, "Irelia": {"tier": "3"}, "Sett": {"tier": "1"},
        "Aatrox": {"tier": "2"}, "Fiora": {"tier": "1"}, "Yasuo": {"tier": "2"}, "Ambessa": {"tier": "1"},
        "Camille": {"tier": "2"}, "Gnar": {"tier": "3"}, "Olaf": {"tier": "3"}, "Mordekaiser": {"tier": "3"},
        "DrMundo": {"tier": "2"}, "Sion": {"tier": "2"}, "Riven": {"tier": "2"}, "Akali": {"tier": "1"},
        "Tryndamere": {"tier": "2"}, "Kennen": {"tier": "1"}, "Ornn": {"tier": "3"}, "KSante": {"tier": "1"},
        "Pantheon": {"tier": "1"}, "Yorick": {"tier": "2"}, "Shen": {"tier": "2"}, "Chogath": {"tier": "1"},
        "Singed": {"tier": "1"}, "Urgot": {"tier": "2"}, "Zaahen": {"tier": "1"}, "Gragas": {"tier": "1"},
        "Volibear": {"tier": "1"}, "Kled": {"tier": "3"}, "Vayne": {"tier": "1"}, "Gwen": {"tier": "3"},
        "Illaoi": {"tier": "1"}, "Vladimir": {"tier": "2"}, "Kayle": {"tier": "1"}, "Rumble": {"tier": "2"},
        "Trundle": {"tier": "1"}, "TahmKench": {"tier": "3"}, "Warwick": {"tier": "3"}, "Heimerdinger": {"tier": "3"},
        "Varus": {"tier": "1"}, "Ryze": {"tier": "1"}, "Anivia": {"tier": "1"}
    };
    for (const champ in quinnData) {
        state.userData.matchups['Quinn'][champ] = { ...state.userData.matchups['Quinn'][champ], ...quinnData[champ] };
    }
    
    // Inject Velkoz's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Velkoz'] = state.userData.matchups['Velkoz'] || {};
    const velkozData = {
        "Viktor": {"tier": "2"}, "Ahri": {"tier": "2"}, "Syndra": {"tier": "2"}, "Zed": {"tier": "2"},
        "Yasuo": {"tier": "1"}, "Sylas": {"tier": "3"}, "Locke": {"tier": "2"}, "LeBlanc": {"tier": "3"},
        "Malzahar": {"tier": "2"}, "Hwei": {"tier": "1"}, "Yone": {"tier": "2"}, "Katarina": {"tier": "2"},
        "Fizz": {"tier": "3"}, "Lissandra": {"tier": "2"}, "Xerath": {"tier": "3"}, "Lux": {"tier": "1"},
        "TwistedFate": {"tier": "2"}, "Akali": {"tier": "1"}, "Veigar": {"tier": "1"}, "Kassadin": {"tier": "3"},
        "Galio": {"tier": "1"}, "Vladimir": {"tier": "1"}, "Ryze": {"tier": "1"}, "Qiyana": {"tier": "3"},
        "Anivia": {"tier": "2"}, "Orianna": {"tier": "2"}, "Ekko": {"tier": "2"}, "Vex": {"tier": "3"},
        "Zoe": {"tier": "1"}, "Nasus": {"tier": "1"}, "Akshan": {"tier": "2"}, "Aurora": {"tier": "3"},
        "Diana": {"tier": "2"}, "Irelia": {"tier": "1"}, "AurelionSol": {"tier": "2"}, "Mel": {"tier": "1"},
        "Annie": {"tier": "2"}, "Talon": {"tier": "3"}, "Azir": {"tier": "1"}, "Cassiopeia": {"tier": "1"},
        "Taliyah": {"tier": "2"}, "Tristana": {"tier": "1"}, "Naafiri": {"tier": "1"}, "Gwen": {"tier": "3"}
    };
    for (const champ in velkozData) {
        state.userData.matchups['Velkoz'][champ] = { ...state.userData.matchups['Velkoz'][champ], ...velkozData[champ] };
    }
    
    // Ensure new champions are in mid pool if not already
    ['Locke', 'Mel', 'Aurora', 'Naafiri'].forEach(champ => {
        if (state.userData.roles.mid && !state.userData.roles.mid.includes(champ)) {
            state.userData.roles.mid.push(champ);
            state.userData.roles.mid.sort();
        }
    });

    // Inject Vladimir's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Vladimir'] = state.userData.matchups['Vladimir'] || {};
    const vladimirData = {
        "Yasuo": {"tier": "1"}, "Katarina": {"tier": "1"}, "Yone": {"tier": "1"}, "Veigar": {"tier": "1"},
        "Orianna": {"tier": "1"}, "Ekko": {"tier": "1"}, "Diana": {"tier": "1"}, "Akshan": {"tier": "1"},
        "Talon": {"tier": "1"}, "Azir": {"tier": "1"}, "Mel": {"tier": "1"}, "Taliyah": {"tier": "1"},
        "Naafiri": {"tier": "1"}, "Swain": {"tier": "1"}, "Jayce": {"tier": "1"}, "Gangplank": {"tier": "1"},
        "Malphite": {"tier": "1"}, "Ziggs": {"tier": "1"}, "Sion": {"tier": "1"}, "Smolder": {"tier": "1"},
        "Zed": {"tier": "2"}, "Ahri": {"tier": "2"}, "Viktor": {"tier": "2"}, "Locke": {"tier": "2"},
        "Sylas": {"tier": "2"}, "LeBlanc": {"tier": "2"}, "Fizz": {"tier": "2"}, "Lissandra": {"tier": "2"},
        "Akali": {"tier": "2"}, "TwistedFate": {"tier": "2"}, "Ryze": {"tier": "2"}, "Lux": {"tier": "2"},
        "Xerath": {"tier": "2"}, "Kassadin": {"tier": "2"}, "Qiyana": {"tier": "2"}, "Irelia": {"tier": "2"},
        "Galio": {"tier": "2"}, "Zoe": {"tier": "2"}, "Cassiopeia": {"tier": "2"}, "Anivia": {"tier": "2"},
        "Vex": {"tier": "2"}, "Aurora": {"tier": "2"}, "Annie": {"tier": "2"}, "Tristana": {"tier": "2"},
        "Gwen": {"tier": "2"}, "Pantheon": {"tier": "2"}, "Brand": {"tier": "2"}, "Chogath": {"tier": "2"},
        "Syndra": {"tier": "3"}, "Malzahar": {"tier": "3"}, "Hwei": {"tier": "3"}, "Nasus": {"tier": "3"},
        "AurelionSol": {"tier": "3"}, "Velkoz": {"tier": "3"}, "Garen": {"tier": "3"}, "Riven": {"tier": "3"}
    };
    for (const champ in vladimirData) {
        state.userData.matchups['Vladimir'][champ] = { ...state.userData.matchups['Vladimir'][champ], ...vladimirData[champ] };
    }

    // Inject Viktor's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Viktor'] = state.userData.matchups['Viktor'] || {};
    const viktorData = {
        "Yasuo": {"tier": "1"}, "Sylas": {"tier": "1"}, "Malzahar": {"tier": "1"}, "Orianna": {"tier": "1"},
        "Ryze": {"tier": "1"}, "Vex": {"tier": "1"}, "Cassiopeia": {"tier": "1"}, "Mel": {"tier": "1"},
        "Annie": {"tier": "1"}, "Tristana": {"tier": "1"}, "Naafiri": {"tier": "1"}, "Sion": {"tier": "1"},
        "Smolder": {"tier": "1"}, "Syndra": {"tier": "2"}, "Ahri": {"tier": "2"}, "Yone": {"tier": "2"},
        "Zed": {"tier": "2"}, "LeBlanc": {"tier": "2"}, "Locke": {"tier": "2"}, "TwistedFate": {"tier": "2"},
        "Katarina": {"tier": "2"}, "Hwei": {"tier": "2"}, "Lissandra": {"tier": "2"}, "Lux": {"tier": "2"},
        "Galio": {"tier": "2"}, "Veigar": {"tier": "2"}, "Vladimir": {"tier": "2"}, "Diana": {"tier": "2"},
        "Irelia": {"tier": "2"}, "Ekko": {"tier": "2"}, "Qiyana": {"tier": "2"}, "Zoe": {"tier": "2"},
        "Anivia": {"tier": "2"}, "Kassadin": {"tier": "2"}, "Nasus": {"tier": "2"}, "Akshan": {"tier": "2"},
        "Aurora": {"tier": "2"}, "Azir": {"tier": "2"}, "Talon": {"tier": "2"}, "Taliyah": {"tier": "2"},
        "Velkoz": {"tier": "2"}, "Jayce": {"tier": "2"}, "Ziggs": {"tier": "2"}, "Brand": {"tier": "2"},
        "Chogath": {"tier": "2"}, "Pantheon": {"tier": "2"}, "Malphite": {"tier": "2"}, "Gangplank": {"tier": "2"},
        "Xerath": {"tier": "3"}, "Akali": {"tier": "3"}, "Fizz": {"tier": "3"}, "AurelionSol": {"tier": "3"},
        "Gwen": {"tier": "3"}, "Swain": {"tier": "3"}, "Garen": {"tier": "3"}, "Riven": {"tier": "3"}
    };
    for (const champ in viktorData) {
        state.userData.matchups['Viktor'][champ] = { ...state.userData.matchups['Viktor'][champ], ...viktorData[champ] };
    }

    // Inject Anivia's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Anivia'] = state.userData.matchups['Anivia'] || {};
    const aniviaData = {
        "Yasuo": {"tier": "1"}, "Katarina": {"tier": "1"}, "Lissandra": {"tier": "1"}, "Ryze": {"tier": "1"},
        "Veigar": {"tier": "1"}, "Galio": {"tier": "1"}, "Nasus": {"tier": "1"}, "Cassiopeia": {"tier": "1"},
        "Vex": {"tier": "1"}, "Azir": {"tier": "1"}, "Talon": {"tier": "1"}, "Naafiri": {"tier": "1"},
        "Ziggs": {"tier": "1"}, "Sion": {"tier": "1"}, "Garen": {"tier": "1"}, "Riven": {"tier": "1"},
        "Viktor": {"tier": "2"}, "Syndra": {"tier": "2"}, "Zed": {"tier": "2"}, "Yone": {"tier": "2"},
        "Locke": {"tier": "2"}, "Sylas": {"tier": "2"}, "Malzahar": {"tier": "2"}, "Akali": {"tier": "2"},
        "Fizz": {"tier": "2"}, "Vladimir": {"tier": "2"}, "Qiyana": {"tier": "2"}, "Orianna": {"tier": "2"},
        "Ekko": {"tier": "2"}, "Irelia": {"tier": "2"}, "Kassadin": {"tier": "2"}, "Zoe": {"tier": "2"},
        "Akshan": {"tier": "2"}, "Aurora": {"tier": "2"}, "Mel": {"tier": "2"}, "Annie": {"tier": "2"},
        "Gwen": {"tier": "2"}, "Velkoz": {"tier": "2"}, "Swain": {"tier": "2"}, "Jayce": {"tier": "2"},
        "Chogath": {"tier": "2"}, "Malphite": {"tier": "2"}, "Ahri": {"tier": "3"}, "TwistedFate": {"tier": "3"},
        "LeBlanc": {"tier": "3"}, "Xerath": {"tier": "3"}, "Hwei": {"tier": "3"}, "Lux": {"tier": "3"},
        "Diana": {"tier": "3"}, "AurelionSol": {"tier": "3"}, "Taliyah": {"tier": "3"}, "Tristana": {"tier": "3"},
        "Brand": {"tier": "3"}, "Gangplank": {"tier": "3"}, "Pantheon": {"tier": "3"}
    };
    for (const champ in aniviaData) {
        state.userData.matchups['Anivia'][champ] = { ...state.userData.matchups['Anivia'][champ], ...aniviaData[champ] };
    }

    // Inject Zoe's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Zoe'] = state.userData.matchups['Zoe'] || {};
    const zoeData = {
        "Syndra": {"tier": "1"}, "Sylas": {"tier": "1"}, "Yone": {"tier": "1"}, "Hwei": {"tier": "1"},
        "Mel": {"tier": "1"}, "Orianna": {"tier": "1"}, "Diana": {"tier": "1"}, "Ryze": {"tier": "1"},
        "Azir": {"tier": "1"}, "Taliyah": {"tier": "1"}, "AurelionSol": {"tier": "1"}, "Tristana": {"tier": "1"},
        "Gwen": {"tier": "1"}, "Jayce": {"tier": "1"}, "Swain": {"tier": "1"}, "Gangplank": {"tier": "1"},
        "Chogath": {"tier": "1"}, "Garen": {"tier": "1"}, "Riven": {"tier": "1"}, "Ahri": {"tier": "2"},
        "Zed": {"tier": "2"}, "Viktor": {"tier": "2"}, "Locke": {"tier": "2"}, "LeBlanc": {"tier": "2"},
        "TwistedFate": {"tier": "2"}, "Lissandra": {"tier": "2"}, "Akali": {"tier": "2"}, "Xerath": {"tier": "2"},
        "Lux": {"tier": "2"}, "Vladimir": {"tier": "2"}, "Galio": {"tier": "2"}, "Qiyana": {"tier": "2"},
        "Ekko": {"tier": "2"}, "Anivia": {"tier": "2"}, "Cassiopeia": {"tier": "2"}, "Nasus": {"tier": "2"},
        "Naafiri": {"tier": "2"}, "Pantheon": {"tier": "2"}, "Yasuo": {"tier": "3"}, "Katarina": {"tier": "3"},
        "Fizz": {"tier": "3"}, "Malzahar": {"tier": "3"}, "Veigar": {"tier": "3"}, "Vex": {"tier": "3"},
        "Kassadin": {"tier": "3"}, "Irelia": {"tier": "3"}, "Aurora": {"tier": "3"}, "Akshan": {"tier": "3"},
        "Talon": {"tier": "3"}, "Annie": {"tier": "3"}, "Velkoz": {"tier": "3"}, "Ziggs": {"tier": "3"},
        "Brand": {"tier": "3"}, "Sion": {"tier": "3"}, "Malphite": {"tier": "3"}
    };
    for (const champ in zoeData) {
        state.userData.matchups['Zoe'][champ] = { ...state.userData.matchups['Zoe'][champ], ...zoeData[champ] };
    }

    // Inject Hwei's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Hwei'] = state.userData.matchups['Hwei'] || {};
    const hweiData = {
        "Yone": {"tier": "1"}, "Sylas": {"tier": "1"}, "TwistedFate": {"tier": "1"}, "Lissandra": {"tier": "1"},
        "Malzahar": {"tier": "1"}, "Akali": {"tier": "1"}, "Galio": {"tier": "1"}, "Vladimir": {"tier": "1"},
        "Ryze": {"tier": "1"}, "Orianna": {"tier": "1"}, "Anivia": {"tier": "1"}, "Kassadin": {"tier": "1"},
        "Nasus": {"tier": "1"}, "Irelia": {"tier": "1"}, "Mel": {"tier": "1"}, "Azir": {"tier": "1"},
        "Talon": {"tier": "1"}, "Taliyah": {"tier": "1"}, "Tristana": {"tier": "1"}, "Naafiri": {"tier": "1"},
        "Pantheon": {"tier": "1"}, "Sion": {"tier": "1"}, "Chogath": {"tier": "1"}, "Malphite": {"tier": "1"},
        "Smolder": {"tier": "1"}, "Viktor": {"tier": "2"}, "Syndra": {"tier": "2"}, "Ahri": {"tier": "2"},
        "Yasuo": {"tier": "2"}, "Zed": {"tier": "2"}, "Xerath": {"tier": "2"}, "Locke": {"tier": "2"},
        "Katarina": {"tier": "2"}, "LeBlanc": {"tier": "2"}, "Fizz": {"tier": "2"}, "Lux": {"tier": "2"},
        "Veigar": {"tier": "2"}, "Diana": {"tier": "2"}, "Aurora": {"tier": "2"}, "AurelionSol": {"tier": "2"},
        "Cassiopeia": {"tier": "2"}, "Annie": {"tier": "2"}, "Gwen": {"tier": "2"}, "Jayce": {"tier": "2"},
        "Brand": {"tier": "2"}, "Swain": {"tier": "2"}, "Riven": {"tier": "2"}, "Gangplank": {"tier": "2"},
        "Garen": {"tier": "2"}, "Ekko": {"tier": "3"}, "Qiyana": {"tier": "3"}, "Zoe": {"tier": "3"},
        "Vex": {"tier": "3"}, "Akshan": {"tier": "3"}, "Velkoz": {"tier": "3"}, "Ziggs": {"tier": "3"}
    };
    for (const champ in hweiData) {
        state.userData.matchups['Hwei'][champ] = { ...state.userData.matchups['Hwei'][champ], ...hweiData[champ] };
    }

    // Inject Sion's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Sion'] = state.userData.matchups['Sion'] || {};
    const sionData = {
        "Malzahar": {"tier": "1"}, "Yasuo": {"tier": "1"}, "Katarina": {"tier": "1"}, "Fizz": {"tier": "1"},
        "Lissandra": {"tier": "1"}, "Ryze": {"tier": "1"}, "Vex": {"tier": "1"}, "AurelionSol": {"tier": "1"},
        "Talon": {"tier": "1"}, "Annie": {"tier": "1"}, "Zoe": {"tier": "1"}, "Mel": {"tier": "1"},
        "Zed": {"tier": "2"}, "LeBlanc": {"tier": "2"}, "Sylas": {"tier": "2"}, "Xerath": {"tier": "2"},
        "Akali": {"tier": "2"}, "Galio": {"tier": "2"}, "Lux": {"tier": "2"}, "Ekko": {"tier": "2"},
        "Akshan": {"tier": "2"}, "Aurora": {"tier": "2"}, "Viktor": {"tier": "3"}, "Syndra": {"tier": "3"},
        "Ahri": {"tier": "3"}, "Locke": {"tier": "3"}, "TwistedFate": {"tier": "3"}, "Yone": {"tier": "3"},
        "Qiyana": {"tier": "3"}, "Hwei": {"tier": "3"}, "Veigar": {"tier": "3"}, "Vladimir": {"tier": "3"},
        "Nasus": {"tier": "3"}, "Irelia": {"tier": "3"}, "Diana": {"tier": "3"}, "Orianna": {"tier": "3"},
        "Anivia": {"tier": "3"}, "Cassiopeia": {"tier": "3"}, "Azir": {"tier": "3"}, "Kassadin": {"tier": "3"}
    };
    for (const champ in sionData) {
        state.userData.matchups['Sion'][champ] = { ...state.userData.matchups['Sion'][champ], ...sionData[champ] };
    }

    // Inject Aatrox's match up tiers from user provided OP.GG screenshots
    state.userData.matchups['Aatrox'] = state.userData.matchups['Aatrox'] || {};
    const aatroxData = {
        "DrMundo": {"tier": "1"}, "Yasuo": {"tier": "1"}, "Sion": {"tier": "1"}, "Akali": {"tier": "1"},
        "Gragas": {"tier": "1"}, "Trundle": {"tier": "1"}, "TahmKench": {"tier": "1"}, "Vladimir": {"tier": "1"},
        "Ryze": {"tier": "1"}, "MasterYi": {"tier": "1"}, "Nasus": {"tier": "2"}, "Jayce": {"tier": "2"},
        "Renekton": {"tier": "2"}, "Darius": {"tier": "2"}, "Gangplank": {"tier": "2"}, "Malphite": {"tier": "2"},
        "Sett": {"tier": "2"}, "Garen": {"tier": "2"}, "Jax": {"tier": "2"}, "Mordekaiser": {"tier": "2"},
        "Fiora": {"tier": "2"}, "Camille": {"tier": "2"}, "KSante": {"tier": "2"}, "Teemo": {"tier": "2"},
        "Shen": {"tier": "2"}, "Gnar": {"tier": "2"}, "Tryndamere": {"tier": "2"}, "Ornn": {"tier": "2"},
        "Volibear": {"tier": "2"}, "Zaahen": {"tier": "2"}, "Illaoi": {"tier": "2"}, "Olaf": {"tier": "2"},
        "Gwen": {"tier": "2"}, "Chogath": {"tier": "2"}, "Vayne": {"tier": "2"}, "Rumble": {"tier": "2"},
        "Kayle": {"tier": "2"}, "Quinn": {"tier": "2"}, "Anivia": {"tier": "2"}, "Udyr": {"tier": "2"},
        "Varus": {"tier": "2"}, "Swain": {"tier": "2"}, "Yone": {"tier": "3"}, "Irelia": {"tier": "3"},
        "Ambessa": {"tier": "3"}, "Pantheon": {"tier": "3"}, "Urgot": {"tier": "3"}, "Yorick": {"tier": "3"},
        "Singed": {"tier": "3"}, "Riven": {"tier": "3"}, "Kled": {"tier": "3"}, "Kennen": {"tier": "3"},
        "Warwick": {"tier": "3"}, "MonkeyKing": {"tier": "3"}, "Heimerdinger": {"tier": "3"}, "Poppy": {"tier": "3"},
        "Zac": {"tier": "3"}, "Cassiopeia": {"tier": "3"}
    };
    for (const champ in aatroxData) {
        state.userData.matchups['Aatrox'][champ] = { ...state.userData.matchups['Aatrox'][champ], ...aatroxData[champ] };
    }

    saveUserData();
}

function saveUserData() {
    const key = state.currentUser === 'Guest' ? 'lol_pick_system_data' : `lol_pick_system_data_${state.currentUser}`;
    localStorage.setItem(key, JSON.stringify(state.userData));
}

// OP.GG Data Sync Feature
const OPGG_SERVER = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000' 
    : window.location.origin;

async function startOpggSync() {
    const role = state.currentRole;
    if (role === 'all') {
        alert('먼저 상단에서 라인(TOP/MID 등)을 선택해주세요.');
        return;
    }
    
    // Get ALL champions for the selected role
    const roleChamps = getChampionsForCurrentRole();
    const targetPool = roleChamps.map(c => c.id);
    
    if (targetPool.length === 0) {
        alert(`${role.toUpperCase()} 라인에 해당하는 챔피언이 없습니다.`);
        return;
    }
    
    // Check if server is running
    try {
        const testRes = await fetch(OPGG_SERVER, { mode: 'cors' });
    } catch(e) {
        alert('⚠️ OP.GG 스크래핑 서버가 실행되고 있지 않습니다.\n\nstart_server.bat 파일을 더블클릭해서 서버를 먼저 실행해주세요.');
        return;
    }
    
    // Try to get cached data first
    try {
        const cacheRes = await fetch(`${OPGG_SERVER}/api/cache`);
        if (cacheRes.ok) {
            const cacheData = await cacheRes.json();
            const roleMap = { top: 'top', jungle: 'jungle', mid: 'mid', adc: 'adc', support: 'support' };
            const opggRole = roleMap[role];
            let updatedCount = 0;
            
            for (const champId of targetPool) {
                if (cacheData.matchups[champId] && cacheData.matchups[champId][opggRole]) {
                    if (!state.userData.matchups[champId]) state.userData.matchups[champId] = {};
                    
                    const roleData = cacheData.matchups[champId][opggRole];
                    for (const [oppId, info] of Object.entries(roleData)) {
                        state.userData.matchups[champId][oppId] = {
                            ...state.userData.matchups[champId][oppId],
                            tier: info.tier,
                            opggWinRate: info.winRate,
                            opggGames: info.games,
                            opggUpdated: cacheData.updatedAt
                        };
                    }
                    updatedCount++;
                }
            }
            
            if (updatedCount > 0) {
                saveUserData();
                alert(`✅ 서버에 캐시된 최신 OP.GG 데이터를 즉시 적용했습니다.\n(업데이트된 챔피언 수: ${updatedCount})`);
                if (els.mainView.classList.contains('active')) renderMainView();
                return;
            }
        }
    } catch(e) {
        console.log("Cache fetch failed or no data for this role. Falling back to live scrape.");
    }
    
    // Fallback: Create and show sync modal for live scraping
    showSyncModal(targetPool, role);
}

function showSyncModal(champions, role) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'opgg-sync-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const roleMap = { top: 'TOP', jungle: 'JUNGLE', mid: 'MID', adc: 'ADC', support: 'SUPPORT' };
    
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1a2e;border-radius:12px;padding:24px;min-width:400px;max-width:600px;color:white;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
    
    modal.innerHTML = `
        <h2 style="margin:0 0 8px 0;color:#00a8ff;font-size:18px;">🔄 OP.GG 데이터 최신화</h2>
        <p style="margin:0 0 16px 0;color:#aaa;font-size:13px;">${roleMap[role]} 라인의 모든 챔피언에 대해 카운터 데이터를 OP.GG에서 가져옵니다.</p>
        
        <div id="sync-champ-list" style="max-height:300px;overflow-y:auto;margin-bottom:16px;">
            ${champions.map(champId => {
                const champData = state.championsData[champId];
                const name = champData ? champData.name : champId;
                const imgUrl = champData ? `https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${champId}.png` : '';
                const existingCount = state.userData.matchups[champId] ? Object.keys(state.userData.matchups[champId]).length : 0;
                return `
                    <label style="display:flex;align-items:center;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;background:#16213e;transition:background 0.2s;" 
                           onmouseover="this.style.background='#1a3050'" onmouseout="this.style.background='#16213e'">
                        <input type="checkbox" value="${champId}" checked style="margin-right:10px;width:18px;height:18px;accent-color:#00a8ff;">
                        <img src="${imgUrl}" style="width:36px;height:36px;border-radius:50%;margin-right:10px;">
                        <div>
                            <div style="font-weight:bold;font-size:14px;">${name}</div>
                            <div style="font-size:11px;color:#888;">현재 ${existingCount}개 매치업 데이터</div>
                        </div>
                    </label>
                `;
            }).join('')}
        </div>
        
        <div id="sync-progress" style="display:none;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span id="sync-status" style="color:#00a8ff;font-size:13px;">준비 중...</span>
                <span id="sync-count" style="color:#aaa;font-size:13px;">0 / 0</span>
            </div>
            <div style="height:6px;background:#2a2a4a;border-radius:3px;overflow:hidden;">
                <div id="sync-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00a8ff,#0052cc);transition:width 0.3s;border-radius:3px;"></div>
            </div>
            <div id="sync-log" style="margin-top:10px;max-height:150px;overflow-y:auto;font-size:11px;color:#888;font-family:monospace;"></div>
        </div>
        
        <div id="sync-buttons" style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="sync-select-all-btn" style="padding:8px 16px;border:1px solid #444;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;">전체 선택/해제</button>
            <button id="sync-cancel-btn" style="padding:8px 16px;border:1px solid #444;border-radius:6px;background:transparent;color:#aaa;cursor:pointer;">취소</button>
            <button id="sync-start-btn" style="padding:8px 20px;border:none;border-radius:6px;background:#00a8ff;color:white;cursor:pointer;font-weight:bold;">데이터 가져오기</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Event: Close
    document.getElementById('sync-cancel-btn').addEventListener('click', () => {
        overlay.remove();
    });
    
    // Event: Select All toggle
    let allSelected = true;
    document.getElementById('sync-select-all-btn').addEventListener('click', () => {
        allSelected = !allSelected;
        overlay.querySelectorAll('#sync-champ-list input[type="checkbox"]').forEach(cb => cb.checked = allSelected);
    });
    
    // Event: Start sync
    document.getElementById('sync-start-btn').addEventListener('click', () => {
        const checkboxes = overlay.querySelectorAll('#sync-champ-list input[type="checkbox"]:checked');
        const selectedChamps = Array.from(checkboxes).map(cb => cb.value);
        
        if (selectedChamps.length === 0) {
            alert('최소 한 개의 챔피언을 선택해주세요.');
            return;
        }
        
        executeSyncBatch(selectedChamps, role, overlay);
    });
}

async function executeSyncBatch(champions, role, overlay) {
    const champListDiv = document.getElementById('sync-champ-list');
    const progressDiv = document.getElementById('sync-progress');
    const buttonsDiv = document.getElementById('sync-buttons');
    const statusEl = document.getElementById('sync-status');
    const countEl = document.getElementById('sync-count');
    const barEl = document.getElementById('sync-bar');
    const logEl = document.getElementById('sync-log');
    
    // Hide champion list, show progress
    champListDiv.style.display = 'none';
    progressDiv.style.display = 'block';
    buttonsDiv.innerHTML = '<button id="sync-close-btn" style="padding:8px 20px;border:none;border-radius:6px;background:#444;color:white;cursor:pointer;" disabled>완료 대기 중...</button>';
    
    const roleMap = { top: 'top', jungle: 'jungle', mid: 'mid', adc: 'adc', support: 'support' };
    const opggRole = roleMap[role];
    
    let completed = 0;
    let totalUpdated = 0;
    const total = champions.length;
    
    for (const champId of champions) {
        const champData = state.championsData[champId];
        const champName = champData ? champData.name : champId;
        
        statusEl.textContent = `${champName} 스크래핑 중...`;
        countEl.textContent = `${completed} / ${total}`;
        
        const logLine = (msg, color = '#888') => {
            const line = document.createElement('div');
            line.style.color = color;
            line.textContent = msg;
            logEl.appendChild(line);
            logEl.scrollTop = logEl.scrollHeight;
        };
        
        try {
            logLine(`▶ ${champName} (${champId}) 데이터 요청 중...`);
            
            const res = await fetch(`${OPGG_SERVER}/api/scrape?champion=${champId.toLowerCase()}&role=${opggRole}`);
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }
            
            const data = await res.json();
            const matchupCount = Object.keys(data).length;
            
            // Inject into state
            if (!state.userData.matchups[champId]) state.userData.matchups[champId] = {};
            
            for (const [oppId, info] of Object.entries(data)) {
                state.userData.matchups[champId][oppId] = {
                    ...state.userData.matchups[champId][oppId],
                    tier: info.tier,
                    opggWinRate: info.winRate,
                    opggGames: info.games,
                    opggUpdated: new Date().toISOString()
                };
            }
            
            totalUpdated += matchupCount;
            logLine(`✅ ${champName}: ${matchupCount}개 매치업 업데이트 완료`, '#4caf50');
            
        } catch(err) {
            logLine(`❌ ${champName}: ${err.message}`, '#ff5252');
        }
        
        completed++;
        barEl.style.width = `${(completed / total) * 100}%`;
        countEl.textContent = `${completed} / ${total}`;
    }
    
    // Save and refresh
    saveUserData();
    
    statusEl.textContent = `✅ 완료! 총 ${totalUpdated}개 매치업 데이터 업데이트됨`;
    statusEl.style.color = '#4caf50';
    
    const closeBtn = document.getElementById('sync-close-btn');
    closeBtn.disabled = false;
    closeBtn.textContent = '닫기';
    closeBtn.style.background = '#00a8ff';
    closeBtn.addEventListener('click', () => {
        overlay.remove();
        // Re-render to show updated data
        if (document.getElementById('main-view').classList.contains('active')) {
            renderMainView();
        } else {
            renderDataEntryView();
        }
    });
}

// Riot API
async function fetchRiotData() {
    try {
        const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await versionRes.json();
        state.version = versions[0];
        
        const champsRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${state.version}/data/ko_KR/champion.json`);
        const champsData = await champsRes.json();
        state.championsData = champsData.data;
        state.championsArray = Object.values(state.championsData).sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Failed to fetch Riot Data", e);
        alert("챔피언 데이터를 불러오는데 실패했습니다.");
    }
}

async function fetchChampionDetails(champId) {
    try {
        const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${state.version}/data/ko_KR/champion/${champId}.json`);
        const data = await res.json();
        return data.data[champId];
    } catch (e) {
        console.error("Failed to fetch champion details", e);
        return null;
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    // Auth Mode State
    let authMode = 'login';
    
    els.loginBtn.addEventListener('click', () => {
        if (state.currentUser !== 'Guest') {
            if (confirm(`현재 '${state.currentUser}' 계정으로 로그인되어 있습니다. 로그아웃 하시겠습니까?`)) {
                loginUser('Guest');
            }
            return;
        }
        
        els.authModal.classList.remove('hidden');
        els.authUsernameInput.value = '';
        els.authPasswordInput.value = '';
        els.authErrorMsg.textContent = '';
        authMode = 'login';
        updateAuthModalUI();
    });
    
    els.authCloseBtn.addEventListener('click', () => {
        els.authModal.classList.add('hidden');
    });
    
    function updateAuthModalUI() {
        if (authMode === 'login') {
            els.authModalTitle.textContent = '로그인';
            els.authSubmitBtn.textContent = '로그인';
            els.authSwitchBtn.textContent = '회원가입이 필요하신가요?';
        } else {
            els.authModalTitle.textContent = '회원가입';
            els.authSubmitBtn.textContent = '회원가입';
            els.authSwitchBtn.textContent = '이미 계정이 있으신가요?';
        }
        els.authErrorMsg.textContent = '';
    }
    
    els.authSwitchBtn.addEventListener('click', () => {
        authMode = authMode === 'login' ? 'signup' : 'login';
        updateAuthModalUI();
    });
    
    els.authGuestBtn.addEventListener('click', () => {
        loginUser('Guest');
        els.authModal.classList.add('hidden');
    });
    
    els.authSubmitBtn.addEventListener('click', () => {
        const username = els.authUsernameInput.value.trim();
        const password = els.authPasswordInput.value.trim();
        
        if (!username || !password) {
            els.authErrorMsg.textContent = '아이디와 비밀번호를 모두 입력해주세요.';
            return;
        }
        
        let users = JSON.parse(localStorage.getItem('lol_pick_system_users') || '{}');
        
        if (authMode === 'signup') {
            if (users[username]) {
                els.authErrorMsg.textContent = '이미 존재하는 아이디입니다.';
                return;
            }
            users[username] = password;
            localStorage.setItem('lol_pick_system_users', JSON.stringify(users));
            alert('회원가입이 완료되었습니다! 로그인되었습니다.');
            loginUser(username);
            els.authModal.classList.add('hidden');
        } else {
            if (!users[username]) {
                els.authErrorMsg.textContent = '존재하지 않는 아이디입니다.';
                return;
            }
            if (users[username] !== password) {
                els.authErrorMsg.textContent = '비밀번호가 일치하지 않습니다.';
                return;
            }
            loginUser(username);
            els.authModal.classList.add('hidden');
        }
    });
    
    function loginUser(username) {
        state.currentUser = username;
        localStorage.setItem('lol_pick_system_current_user', state.currentUser);
        els.loginBtn.textContent = state.currentUser === 'Guest' ? '로그인 (Guest)' : `로그아웃 (${state.currentUser})`;
        
        loadUserData();
        if (els.mainView.classList.contains('active')) {
            resetMainSelection();
            renderMainView();
        } else {
            state.dataView.selectedMyChamp = null;
            renderDataEntryView();
        }
    }

    els.modeToggleBtn.addEventListener('click', () => {
        if (els.mainView.classList.contains('active')) {
            switchView('data');
        } else {
            switchView('main');
        }
    });
    
    // Header Role Selection
    els.roleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            els.roleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.currentRole = e.target.dataset.role;
            
            if (els.mainView.classList.contains('active')) {
                resetMainSelection();
                renderMainView();
            } else {
                state.dataView.selectedMyChamp = null;
                renderDataEntryView();
            }
        });
    });
    
    // Reset
    els.resetBtn.addEventListener('click', () => {
        resetMainSelection();
        if (els.mainView.classList.contains('active')) renderMainView();
        else renderDataEntryView();
    });
    
    // Modals
    els.addToRoleBtn.addEventListener('click', () => openSelectionModal('role'));
    els.addToMyPoolBtn.addEventListener('click', () => openSelectionModal('myPool'));
    els.modalCancelBtn.addEventListener('click', closeModal);
    els.modalConfirmBtn.addEventListener('click', confirmModalSelection);
    
    // Search
    els.oppSearch.addEventListener('input', renderMainView);
    els.dataAllSearch.addEventListener('input', renderDataEntryView);
    
    // Drag and Drop for Tier List
    els.tierDropzones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', (e) => {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', handleDrop);
    });
    
    // Save Comment
    els.saveCommentBtn.addEventListener('click', () => {
        const myId = state.mainView.selectedMyChamp;
        const oppId = state.mainView.selectedOpponent;
        if (!myId || !oppId) return;
        
        if (!state.userData.matchups[myId]) state.userData.matchups[myId] = {};
        if (!state.userData.matchups[myId][oppId]) state.userData.matchups[myId][oppId] = { tier: '?' };
        
        state.userData.matchups[myId][oppId].comment = els.champComment.value;
        saveUserData();
        alert("코멘트가 저장되었습니다.");
    });
    
    // Matchup Mode Buttons
    els.backToSelectionBtn.addEventListener('click', resetMainSelection);
    els.generateAiBtn.addEventListener('click', generateAiSummary);
    
    // OP.GG Sync Button
    const opggSyncBtn = document.getElementById('opgg-sync-btn');
    if (opggSyncBtn) {
        opggSyncBtn.addEventListener('click', startOpggSync);
    }
}

function switchView(view) {
    const opggBtn = document.getElementById('opgg-sync-btn');
    if (view === 'main') {
        els.dataEntryView.classList.remove('active');
        els.dataEntryView.classList.add('hidden');
        els.mainView.classList.remove('hidden');
        els.mainView.classList.add('active');
        els.modeToggleBtn.textContent = '데이터 입력 모드';
        els.modeToggleBtn.style.background = 'var(--primary)';
        if (opggBtn) opggBtn.style.display = '';
        if (els.resetBtn) els.resetBtn.style.display = '';
        resetMainSelection();
        renderMainView();
    } else {
        els.mainView.classList.remove('active');
        els.mainView.classList.add('hidden');
        els.dataEntryView.classList.remove('hidden');
        els.dataEntryView.classList.add('active');
        els.modeToggleBtn.textContent = '메인 픽 화면으로';
        els.modeToggleBtn.style.background = '#4caf50';
        if (opggBtn) opggBtn.style.display = 'none';
        if (els.resetBtn) els.resetBtn.style.display = 'none';
        state.dataView.selectedMyChamp = null;
        renderDataEntryView();
    }
}

    // ---------------- MAIN VIEW LOGIC ---------------- //

function resetMainSelection() {
    state.mainView.selectedOpponent = null;
    state.mainView.selectedMyChamp = null;
    els.selectionMode.classList.remove('hidden');
    els.matchupMode.classList.add('hidden');
    renderMainView();
}

function getChampionsForCurrentRole() {
    if (state.currentRole === 'all') return state.championsArray;
    const roleIds = state.userData.roles[state.currentRole] || [];
    return state.championsArray.filter(c => roleIds.includes(c.id));
}

function getMyChampionsForCurrentRole() {
    if (state.currentRole === 'all') {
        // Return unique champions from all my pools
        const allMyChamps = new Set();
        Object.values(state.userData.myPool).forEach(pool => pool.forEach(id => allMyChamps.add(id)));
        return Array.from(allMyChamps).map(id => state.championsData[id]).filter(Boolean);
    }
    const poolIds = state.userData.myPool[state.currentRole] || [];
    return poolIds.map(id => state.championsData[id]).filter(Boolean);
}

function renderMainView() {
    // 1. Render Opponent Grid
    els.oppGrid.innerHTML = '';
    const searchTerm = els.oppSearch.value.toLowerCase();
    const roleChamps = getChampionsForCurrentRole();
    
    roleChamps.forEach(champ => {
        if (searchTerm && !champ.name.toLowerCase().includes(searchTerm)) return;
        
        const el = createChampionCard(champ);
        if (state.mainView.selectedOpponent === champ.id) el.classList.add('selected');
        
        el.addEventListener('click', () => {
            if (state.mainView.selectedOpponent === champ.id) {
                state.mainView.selectedOpponent = null;
                state.mainView.selectedMyChamp = null;
            } else {
                state.mainView.selectedOpponent = champ.id;
                state.mainView.selectedMyChamp = null; // reset my champ on new opponent
            }
            renderMainView();
        });
        els.oppGrid.appendChild(el);
    });
    
    // 2. Render My Champions Grid / Tier List
    els.myGrid.innerHTML = '';
    const myChamps = getMyChampionsForCurrentRole();
    const myChampsIds = new Set(myChamps.map(c => c.id));
    
    // Sort roleChamps: myPool first, then alphabetical
    const sortedRightChamps = [...roleChamps].sort((a, b) => {
        const aIsMine = myChampsIds.has(a.id);
        const bIsMine = myChampsIds.has(b.id);
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;
        return a.name.localeCompare(b.name);
    });
    
    if (state.mainView.selectedOpponent) {
        els.myGrid.classList.remove('champion-grid');
        els.myGrid.classList.add('main-tier-list');
        
        const grouped = { '1': [], '2': [], '3': [], '?': [] };
        sortedRightChamps.forEach(champ => {
            const tier = state.userData.matchups[champ.id]?.[state.mainView.selectedOpponent]?.tier || '?';
            if (grouped[tier]) {
                grouped[tier].push(champ);
            }
        });
        
        ['1', '2', '3', '?'].forEach(tier => {
            if (grouped[tier].length === 0) return;
            
            const row = document.createElement('div');
            row.className = 'tier-row';
            
            const label = document.createElement('div');
            const labelTexts = { '1': '1 (쉬움)', '2': '2 (보통)', '3': '3 (어려움)', '?': '? (정보없음)' };
            label.className = `tier-label tier-${tier === '?' ? 'unknown' : tier}`;
            label.textContent = labelTexts[tier];
            
            const champsContainer = document.createElement('div');
            champsContainer.className = 'tier-dropzone tier-grid';
            
            grouped[tier].forEach(champ => {
                const el = createChampionCard(champ);
                
                // Add bee icon for 54%+ win rate matchups
                const matchData = state.userData.matchups[champ.id]?.[state.mainView.selectedOpponent];
                if (matchData && matchData.opggWinRate > 54) {
                    const bee = document.createElement('img');
                    bee.src = 'bee.png';
                    bee.className = 'bee-icon';
                    bee.title = `승률 ${matchData.opggWinRate}%`;
                    el.appendChild(bee);
                }
                
                // Distinct styling for my pool
                if (myChampsIds.has(champ.id)) {
                    el.style.border = '2px solid var(--primary)';
                } else {
                    el.style.opacity = '0.7';
                }
                
                if (state.mainView.selectedMyChamp === champ.id) el.classList.add('selected');
                el.addEventListener('click', () => {
                    if (state.mainView.selectedMyChamp === champ.id) {
                        state.mainView.selectedMyChamp = null;
                        renderMainView();
                    } else {
                        state.mainView.selectedMyChamp = champ.id;
                        renderMainView();
                    }
                });
                champsContainer.appendChild(el);
            });
            
            row.appendChild(label);
            row.appendChild(champsContainer);
            els.myGrid.appendChild(row);
        });
        
    } else {
        els.myGrid.classList.add('champion-grid');
        els.myGrid.classList.remove('main-tier-list');
        
        sortedRightChamps.forEach(champ => {
            const el = createChampionCard(champ);
            
            // Add a small pin icon or distinct styling for 'my pool' champions
            if (myChampsIds.has(champ.id)) {
                el.style.border = '2px solid var(--primary)';
            } else {
                // Dim down non-pool champions slightly to differentiate
                el.style.opacity = '0.7';
            }
            
            if (state.mainView.selectedMyChamp === champ.id) el.classList.add('selected');
            el.addEventListener('click', () => {
                alert("먼저 상대 챔피언을 선택해주세요.");
            });
            els.myGrid.appendChild(el);
        });
    }
    
    if (state.mainView.selectedOpponent && state.mainView.selectedMyChamp) {
        els.selectionMode.classList.add('hidden');
        els.matchupMode.classList.remove('hidden');
        showMatchupDetails(state.mainView.selectedOpponent, state.mainView.selectedMyChamp);
    } else {
        els.selectionMode.classList.remove('hidden');
        els.matchupMode.classList.add('hidden');
    }
}

async function showMatchupDetails(oppId, myId) {
    const oppChamp = state.championsData[oppId];
    const myChamp = state.championsData[myId];
    
    // Update Headers
    els.matchupOppImg.src = `https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${oppChamp.image.full}`;
    els.matchupOppName.textContent = oppChamp.name;
    
    els.matchupMyImg.src = `https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${myChamp.image.full}`;
    els.matchupMyName.textContent = myChamp.name;
    
    const tier = state.userData.matchups[myId]?.[oppId]?.tier || '?';
    els.matchupDifficulty.textContent = `난이도: ${tier}`;
    els.matchupDifficulty.className = `difficulty-badge tier-label tier-${tier === '?' ? 'unknown' : tier}`;
    
    // Render Cooldowns
    await renderChampionSkills(oppId, els.oppSkillsList);
    await renderChampionSkills(myId, els.mySkillsList);
    
    // Comments
    els.champComment.value = state.userData.matchups[myId]?.[oppId]?.comment || '';
    
    // AI Summary
    const savedAiSummary = state.userData.matchups[myId]?.[oppId]?.aiSummary || '';
    if (savedAiSummary) {
        els.aiResult.innerHTML = savedAiSummary;
    } else {
        els.aiResult.innerHTML = '<p class="text-muted" style="color: var(--text-muted); font-size: 14px;">아직 생성된 요약이 없습니다. \'AI 요약 생성\' 버튼을 눌러주세요.</p>';
    }
}

async function renderChampionSkills(champId, containerEl) {
    containerEl.innerHTML = '로딩중...';
    try {
        const details = await fetchChampionDetails(champId);
        if (!details) {
            containerEl.innerHTML = '스킬 정보를 불러오지 못했습니다.';
            return;
        }
        
        let html = `
            <div class="skill-item">
                <img src="https://ddragon.leagueoflegends.com/cdn/${state.version}/img/passive/${details.passive.image.full}">
                <div class="skill-info">
                    <div class="skill-name">P: ${details.passive.name}</div>
                    <div class="skill-cooldown">재사용 대기시간 없음</div>
                </div>
            </div>
        `;
        
        const keys = ['Q', 'W', 'E', 'R'];
        details.spells.forEach((spell, idx) => {
            let cdText = spell.cooldownBurn;
            html += `
                <div class="skill-item">
                    <img src="https://ddragon.leagueoflegends.com/cdn/${state.version}/img/spell/${spell.image.full}">
                    <div class="skill-info">
                        <div class="skill-name">${keys[idx]}: ${spell.name}</div>
                        <div class="skill-cooldown">쿨타임: ${cdText}초</div>
                    </div>
                </div>
            `;
        });
        
        containerEl.innerHTML = html;
    } catch (e) {
        containerEl.innerHTML = '스킬 정보를 불러오는데 실패했습니다.';
    }
}

// Generate AI Summary
async function generateAiSummary() {
    const oppId = state.mainView.selectedOpponent;
    const myId = state.mainView.selectedMyChamp;
    if (!oppId || !myId) return;
    
    const oppChamp = state.championsData[oppId].name;
    const myChamp = state.championsData[myId].name;
    
    els.aiLoading.classList.remove('hidden');
    els.generateAiBtn.disabled = true;
    
    try {
        const aiPromptText = `리그 오브 레전드 매치업 가이드: 내가 플레이하는 챔피언은 '${myChamp}'이고 상대방은 '${oppChamp}'야. 
다음 내용을 중심으로 짧고 핵심적으로 요약해줘:
1. 1~3레벨 라인전 구도
2. 6레벨 (궁극기) 타이밍 주도권
3. 1코어 아이템 타이밍 강약
4. 중후반 한타 및 운영 역할 차이
결과를 읽기 편하게 HTML 포맷으로 줘 (단, body 태그나 마크다운 블록 없이 <h4>, <ul>, <li> 등 내부 태그만 사용해).`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${state.userData.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: aiPromptText }] }]
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            let errMsg = data.error.message || 'API Error';
            if (errMsg.includes('API key not valid')) {
                const newKey = prompt("API 키가 유효하지 않습니다. 올바른 Gemini API 키를 다시 입력해주세요:", state.userData.apiKey);
                if (newKey) {
                    state.userData.apiKey = newKey;
                    saveUserData();
                    els.aiResult.innerHTML = '<p class="text-muted" style="color: var(--text-muted); font-size: 14px;">API 키가 변경되었습니다. 다시 생성 버튼을 눌러주세요.</p>';
                    return;
                } else {
                    throw new Error('유효하지 않은 API 키입니다.');
                }
            }
            throw new Error(errMsg);
        }
        
        let resultHtml = data.candidates[0].content.parts[0].text;
        resultHtml = resultHtml.replace(/```html/g, '').replace(/```/g, '').trim();
        
        els.aiResult.innerHTML = resultHtml;
        
        if (!state.userData.matchups[myId]) state.userData.matchups[myId] = {};
        if (!state.userData.matchups[myId][oppId]) state.userData.matchups[myId][oppId] = {};
        state.userData.matchups[myId][oppId].aiSummary = resultHtml;
        saveUserData();
        
    } catch (e) {
        console.error(e);
        els.aiResult.innerHTML = `<p style="color: var(--danger);">AI 생성 실패: ${e.message}</p>`;
    } finally {
        els.aiLoading.classList.add('hidden');
        els.generateAiBtn.disabled = false;
    }
}

function createChampionCard(champ) {
    const div = document.createElement('div');
    div.className = 'champion-card';
    div.innerHTML = `
        <img src="https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${champ.image.full}" alt="${champ.name}">
        <span>${champ.name}</span>
    `;
    return div;
}

// ---------------- DATA ENTRY VIEW LOGIC ---------------- //

function renderDataEntryView() {
    if (state.currentRole === 'all') {
        els.addToRoleBtn.style.display = 'none';
        els.addToMyPoolBtn.style.display = 'none';
    } else {
        els.addToRoleBtn.style.display = 'block';
        els.addToRoleBtn.textContent = `'${state.currentRole.toUpperCase()}'에 챔피언 추가`;
        els.addToMyPoolBtn.style.display = 'block';
        els.addToMyPoolBtn.textContent = `'내 챔피언 (${state.currentRole.toUpperCase()})' 추가`;
    }
    
    // 1. All Champions List (Left)
    els.dataAllChampions.innerHTML = '';
    const searchTerm = els.dataAllSearch.value.toLowerCase();
    const roleChamps = getChampionsForCurrentRole();
    
    roleChamps.forEach(champ => {
        if (searchTerm && !champ.name.toLowerCase().includes(searchTerm)) return;
        const div = document.createElement('div');
        div.className = 'champion-card draggable-champ';
        if (state.dataView.selectedMyChamp === champ.id) div.classList.add('selected');
        div.draggable = true;
        div.dataset.id = champ.id;
        
        let removeBtnHtml = '';
        if (state.currentRole !== 'all') {
            removeBtnHtml = `<div class="remove-champ-btn" title="포지션에서 제거">&times;</div>`;
        }
        
        div.innerHTML = `
            ${removeBtnHtml}
            <img src="https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${champ.image.full}">
            <span>${champ.name}</span>
        `;
        
        div.addEventListener('dragstart', handleDragStart);
        
        // Click to enter data entry mode (just like my pool)
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-champ-btn')) {
                e.stopPropagation();
                state.userData.roles[state.currentRole] = state.userData.roles[state.currentRole].filter(id => id !== champ.id);
                saveUserData();
                renderDataEntryView();
                return;
            }
            
            if (state.dataView.selectedMyChamp === champ.id) {
                state.dataView.selectedMyChamp = null;
            } else {
                state.dataView.selectedMyChamp = champ.id;
            }
            renderDataEntryView();
            renderTierList();
        });
        
        // Allow removing from role by double click (if not 'all')
        if (state.currentRole !== 'all') {
            div.title = "우측 상단 X 버튼 또는 더블클릭으로 포지션에서 제거할 수 있습니다.";
            div.addEventListener('dblclick', () => {
                state.userData.roles[state.currentRole] = state.userData.roles[state.currentRole].filter(id => id !== champ.id);
                saveUserData();
                renderDataEntryView();
            });
        }
        
        els.dataAllChampions.appendChild(div);
    });
    
    // 2. My Champions List (Center)
    els.dataMyChampions.innerHTML = '';
    const myChamps = getMyChampionsForCurrentRole();
    
    myChamps.forEach(champ => {
        const div = document.createElement('div');
        div.className = 'champion-card';
        if (state.dataView.selectedMyChamp === champ.id) div.classList.add('selected');
        
        let removeBtnHtml = '';
        if (state.currentRole !== 'all') {
            removeBtnHtml = `<div class="remove-champ-btn" title="제거">&times;</div>`;
        }
        
        div.innerHTML = `
            ${removeBtnHtml}
            <img src="https://ddragon.leagueoflegends.com/cdn/${state.version}/img/champion/${champ.image.full}">
            <span>${champ.name}</span>
        `;
        
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-champ-btn')) {
                e.stopPropagation();
                state.userData.myPool[state.currentRole] = state.userData.myPool[state.currentRole].filter(id => id !== champ.id);
                saveUserData();
                if(state.dataView.selectedMyChamp === champ.id) state.dataView.selectedMyChamp = null;
                renderDataEntryView();
                renderTierList();
                return;
            }
            
            if (state.dataView.selectedMyChamp === champ.id) {
                state.dataView.selectedMyChamp = null;
            } else {
                state.dataView.selectedMyChamp = champ.id;
            }
            renderDataEntryView();
            renderTierList();
        });
        
        if (state.currentRole !== 'all') {
            div.title = "우측 상단 X 버튼 또는 더블클릭으로 제거할 수 있습니다.";
            div.addEventListener('dblclick', () => {
                state.userData.myPool[state.currentRole] = state.userData.myPool[state.currentRole].filter(id => id !== champ.id);
                saveUserData();
                if(state.dataView.selectedMyChamp === champ.id) state.dataView.selectedMyChamp = null;
                renderDataEntryView();
                renderTierList();
            });
        }
        
        els.dataMyChampions.appendChild(div);
    });
    
    renderTierList();
}

// Drag & Drop Tier List

let draggedChampId = null;

function handleDragStart(e) {
    if (!state.dataView.selectedMyChamp) {
        e.preventDefault();
        alert("먼저 '내 챔피언'을 하나 선택해서 기준을 정해주세요.");
        return;
    }
    draggedChampId = e.target.closest('.draggable-champ').dataset.id;
    e.dataTransfer.effectAllowed = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const zone = e.target.closest('.tier-dropzone');
    if (!zone) return;
    
    zone.classList.remove('drag-over');
    if (!draggedChampId || !state.dataView.selectedMyChamp) return;
    
    const tier = zone.dataset.tier;
    const myChamp = state.dataView.selectedMyChamp;
    
    if (!state.userData.matchups[myChamp]) state.userData.matchups[myChamp] = {};
    if (!state.userData.matchups[myChamp][draggedChampId]) state.userData.matchups[myChamp][draggedChampId] = {};
    
    state.userData.matchups[myChamp][draggedChampId].tier = tier;
    saveUserData();
    renderTierList();
}

function renderTierList() {
    // Clear zones
    els.tierDropzones.forEach(zone => zone.innerHTML = '');
    
    if (!state.dataView.selectedMyChamp) {
        els.tierReferenceContainer.classList.add('hidden');
        return;
    }
    
    const myChampName = state.championsData[state.dataView.selectedMyChamp].name;
    els.tierReferenceContainer.classList.remove('hidden');
    els.tierReferenceName.textContent = myChampName;
    
    // We only categorize champions in the current role
    const roleChamps = getChampionsForCurrentRole();
    
    roleChamps.forEach(champ => {
        const matchData = state.userData.matchups[state.dataView.selectedMyChamp]?.[champ.id] || { tier: '?' };
        const tier = matchData.tier;
        
        const div = document.createElement('div');
        div.className = 'tier-item-text draggable-champ';
        div.draggable = true;
        div.dataset.id = champ.id;
        div.innerHTML = `<span>${champ.name}</span>`;
        
        div.addEventListener('dragstart', handleDragStart);
        
        const zone = document.getElementById(tier === '?' ? 'tier-unknown-zone' : `tier-${tier}-zone`);
        if(zone) zone.appendChild(div);
    });
}

// ---------------- MODAL LOGIC ---------------- //

function openSelectionModal(target) {
    state.dataView.modalTarget = target;
    els.modal.classList.remove('hidden');
    els.modalGrid.innerHTML = '';
    
    if (target === 'role') {
        els.modalTitle.textContent = `'${state.currentRole.toUpperCase()}' 포지션에 챔피언 추가`;
        const currentIds = state.userData.roles[state.currentRole] || [];
        // Show all champs NOT in this role
        const available = state.championsArray.filter(c => !currentIds.includes(c.id));
        renderModalGrid(available);
    } else if (target === 'myPool') {
        els.modalTitle.textContent = `'내 챔피언 (${state.currentRole.toUpperCase()})'에 추가`;
        const currentPool = state.userData.myPool[state.currentRole] || [];
        // Show champs in this role that are NOT in my pool
        const roleChamps = getChampionsForCurrentRole();
        const available = roleChamps.filter(c => !currentPool.includes(c.id));
        renderModalGrid(available);
    }
}

function renderModalGrid(champs) {
    champs.forEach(champ => {
        const el = createChampionCard(champ);
        // Toggle selection
        el.addEventListener('click', () => {
            el.classList.toggle('selected');
        });
        els.modalGrid.appendChild(el);
    });
}

function closeModal() {
    els.modal.classList.add('hidden');
}

function confirmModalSelection() {
    const selectedNodes = els.modalGrid.querySelectorAll('.champion-card.selected');
    const selectedNames = Array.from(selectedNodes).map(node => node.querySelector('span').textContent);
    
    // Find IDs from names
    const idsToAdd = selectedNames.map(name => state.championsArray.find(c => c.name === name).id);
    
    if (state.dataView.modalTarget === 'role') {
        if (!state.userData.roles[state.currentRole]) state.userData.roles[state.currentRole] = [];
        state.userData.roles[state.currentRole].push(...idsToAdd);
    } else if (state.dataView.modalTarget === 'myPool') {
        if (!state.userData.myPool[state.currentRole]) state.userData.myPool[state.currentRole] = [];
        state.userData.myPool[state.currentRole].push(...idsToAdd);
    }
    
    saveUserData();
    closeModal();
    renderDataEntryView();
}

// Start app
document.addEventListener('DOMContentLoaded', init);
