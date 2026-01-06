const { useState, useEffect, useRef } = React;

const STORAGE_KEY = 'family_quest_v7_fallback';

const ICON_LIBRARY = [
    "🧹", "👕", "🍽️", "🚽", "🌿", "🗑️", "🐕", "🐈", "📚", "🛌", 
    "🥣", "🚿", "🧸", "👟", "📦", "🍎", "💦", "🚲", "🚗", "🔋",
    "⚔️", "🛡️", "👑", "💎", "📜", "🧪", "🔥", "❄️", "⚡", "✨"
];

const AVATAR_LIBRARY = [
    "🙂", "😎", "🤠", "🤡", "👻", "👽", "🤖", "💩", "🐱", "🐶", 
    "🦁", "🐯", "🐻", "🐨", "🐼", "🐸", "🦄", "🐲", "🦸", "🦹",
    "🧙", "🧚", "🧛", "🧜", "🧝", "🧞", "🧟", "🧠", "🧡", "✨"
];

const THEME_COLORS = [
    { name: 'yellow', hex: '#eab308', label: 'Gold' },
    { name: 'blue', hex: '#3b82f6', label: 'Royal' },
    { name: 'red', hex: '#ef4444', label: 'Crimson' },
    { name: 'green', hex: '#22c55e', label: 'Emerald' },
    { name: 'purple', hex: '#a855f7', label: 'Amethyst' },
    { name: 'pink', hex: '#ec4899', label: 'Rose' },
    { name: 'orange', hex: '#f97316', label: 'Amber' },
    { name: 'cyan', hex: '#06b6d4', label: 'Sky' },
];

const WEEKLY_BONUS = 100;

// type: 'global' (competitive) or 'personal' (individual)
// days: array of integers 0-6 (Sun-Sat), empty = every day
const DEFAULT_QUESTS = [
    { id: 1, task: "Slay the Dust Bunnies", xp: 10, gems: 5, icon: "🧹", repeatable: true, cooldown: 1, assignedTo: null, type: 'personal', days: [], loot: "", lootRarity: "common", lootValue: 0 },
    { id: 2, task: "The Great Laundry Fold", xp: 20, gems: 10, icon: "👕", repeatable: false, cooldown: 0, assignedTo: null, type: 'global', days: [], loot: "Lost Sock", lootRarity: "common", lootValue: 5 },
];

const DEFAULT_REWARDS = [
    { id: 1, title: "Pick the Friday Movie", level: 2, type: "primary", interval: 0 },
    { id: 2, title: "Extra 15m Screen Time", level: 2, type: "secondary", interval: 0 },
    { id: 3, title: "Stay Up 30m Late", level: 3, type: "primary", interval: 0 },
    { id: 4, title: "Small Toy Chest Visit", level: 4, type: "interval", interval: 2 },
    { id: 5, title: "Ice Cream Treat", type: "shop", cost: 50, quantity: 10, shopCooldown: 1, shopScope: 'global' },
];

const DEFAULT_USERS = [
    
    { id: 'u1', name: "Player 1", avatar: "🙂", themeColor: "yellow", passcode: "0000", totalXP: 0, level: 1, gems: 0, completedIds: [], pendingIds: [], cooldowns: {}, claimedRewards: [], fulfilledRewards: [], forceActiveIds: [], history: [], notifications: [], streak: 0, lastQuestDate: null, weeklyProgress: 0, lastWeeklyReset: null, lastLoginBonusDate: null, inventory: [], shopCooldowns: {}, dailyPurchases: {} }
];

// Safe Lucide Icon Component
const Icon = ({ name, size = 20, className = "" }) => {
    useEffect(() => {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    });
    return <i data-lucide={name} className={className} style={{width: size, height: size, display: 'inline-block'}}></i>;
};

const VirtualKeyboard = ({ type = 'text', onInput, onDelete, onSubmit, soundEnabled = true }) => {
    const [isShifted, setIsShifted] = useState(false);

    const playClickSound = () => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {}
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                playClickSound();
                onSubmit();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                playClickSound();
                onDelete();
            } else if (e.key === ' ') {
                e.preventDefault();
                playClickSound();
                onInput(' ');
            } else if (e.key.length === 1) {
                if (type === 'numeric' && !/[0-9]/.test(e.key)) return;
                e.preventDefault();
                playClickSound();
                onInput(e.key);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onInput, onDelete, onSubmit, soundEnabled, type]);

    const numericLayout = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['Backspace', '0', 'Enter']
    ];
    const textLayout = [
        isShifted ? ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(k => isShifted ? k.toUpperCase() : k),
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(k => isShifted ? k.toUpperCase() : k),
        ['Shift', ...['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(k => isShifted ? k.toUpperCase() : k)],
        ['Space', 'Backspace', 'Enter']
    ];
    const layout = type === 'numeric' ? numericLayout : textLayout;

    return (
        <div className="flex flex-col gap-1.5 p-2 bg-slate-800/50 rounded-xl w-full select-none">
            {layout.map((row, i) => (
                <div key={i} className="flex justify-center gap-1">
                    {row.map(key => {
                        const isAction = ['Enter', 'Backspace', 'Space', 'Shift'].includes(key);
                        let label = key;
                        if(key === 'Backspace') label = <Icon name="delete" size={20}/>;
                        if(key === 'Enter') label = <Icon name="corner-down-left" size={20}/>;
                        if(key === 'Shift') label = <Icon name="arrow-up" size={20} className={isShifted ? "text-yellow-500" : ""}/>;
                        if(key === 'Space') label = 'Space';
                        
                        return (
                            <button key={key} type="button" onClick={(e) => { e.preventDefault(); playClickSound(); if (key === 'Backspace') onDelete(); else if (key === 'Enter') onSubmit(); else if (key === 'Space') onInput(' '); else if (key === 'Shift') setIsShifted(!isShifted); else onInput(key); }}
                                className={`${key === 'Space' ? 'flex-[4]' : 'flex-1'} ${isAction ? 'bg-slate-600 border-slate-500' : 'bg-slate-700 border-slate-600'} border-b-4 active:border-b-0 active:translate-y-1 hover:bg-slate-600 active:bg-slate-500 text-white font-bold py-3 rounded-lg flex items-center justify-center text-lg shadow-md transition-all min-w-[32px]`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

const Confetti = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const colors = ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#a855f7'];
        
        for(let i=0; i<150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.y > canvas.height) p.y = -20;
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        animate();
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[60]" />;
};

const App = () => {
    const [sdkReady, setSdkReady] = useState(false);
    const [isLocalMode, setIsLocalMode] = useState(false);
    const [user, setUser] = useState(null);
    
    const [users, setUsers] = useState(DEFAULT_USERS);
    const [quests, setQuests] = useState(DEFAULT_QUESTS);
    const [rewards, setRewards] = useState(DEFAULT_REWARDS);
    const [activeUserId, setActiveUserId] = useState(null);
    const [parentPin, setParentPin] = useState('1234');
    
    const [isParentMode, setIsParentMode] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showPlayerUnlockModal, setShowPlayerUnlockModal] = useState(false);
    const [pendingUserId, setPendingUserId] = useState(null);
    const [pinInput, setPinInput] = useState("");
    const [pinError, setPinError] = useState(false);
    const [isSettingNewPin, setIsSettingNewPin] = useState(false);
    const [keyboardState, setKeyboardState] = useState({ isOpen: false, value: "", type: "text", title: "", onConfirm: null });
    const [actionModalMode, setActionModalMode] = useState(null); // 'edit', 'deactivate', 'reactivate'
    const [keyboardPos, setKeyboardPos] = useState({ x: 0, y: 0 });
    const [soundEnabled, setSoundEnabled] = useState(true);
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [isIdle, setIsIdle] = useState(true);
    const [vacationMode, setVacationMode] = useState(false);
    const [vacationStartTime, setVacationStartTime] = useState(null);
    const idleTimerRef = useRef(null);
    const [isCompactMode, setIsCompactMode] = useState(() => localStorage.getItem('chore_quest_compact') === 'true');
    const [weeklyGoal, setWeeklyGoal] = useState(10);
    const [xpAnimating, setXpAnimating] = useState(false);

    const [newQuest, setNewQuest] = useState({ task: "", xp: 20, gems: 5, cooldown: 1, repeatable: false, assignedTo: null, icon: "✨", type: 'personal', days: [], rotatingIds: [], loot: "", lootRarity: "common", lootValue: 0 });
    const [editingQuestId, setEditingQuestId] = useState(null);
    const [newReward, setNewReward] = useState({ title: "", level: 2, type: "primary", interval: 2, cost: 0, quantity: -1, shopCooldown: 1, shopScope: 'personal' });
    const [editingRewardId, setEditingRewardId] = useState(null);
    const [questFilter, setQuestFilter] = useState('today'); // 'today', 'all', 'history'
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [confirmUndoQuestId, setConfirmUndoQuestId] = useState(null);
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
    const [wishlist, setWishlist] = useState([]);
    const [shopState, setShopState] = useState({});
    
    const [showCelebration, setShowCelebration] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [isSyncing, setIsSyncing] = useState(false);

    const questsFileInputRef = useRef(null);
    const rewardsFileInputRef = useRef(null);
    const fullBackupInputRef = useRef(null);
    const DAILY_PURCHASE_LIMIT = 3; // Daily shop purchase limit per player

    const xpToLevel = 100;

    // Wait for SDK or Fallback
    useEffect(() => {
        const checkStatus = setInterval(() => {
            if (window.FirebaseSDK) {
                setSdkReady(true);
                setIsLocalMode(false);
                clearInterval(checkStatus);
            } else if (window.FirebaseFallback) {
                setSdkReady(true);
                setIsLocalMode(true);
                clearInterval(checkStatus);
            }
        }, 100);
        return () => clearInterval(checkStatus);
    }, []);

    // 1. Initial Auth (Cloud Only)
    useEffect(() => {
        if (!sdkReady || isLocalMode) return;
        const { auth, authToken, signInWithCustomToken, signInAnonymously, onAuthStateChanged } = window.FirebaseSDK;
        
        const initAuth = async () => {
            try {
                if (authToken) {
                    await signInWithCustomToken(auth, authToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (e) { console.error("Auth failed:", e); }
        };
        initAuth();
        return onAuthStateChanged(auth, setUser);
    }, [sdkReady, isLocalMode]);

    // 2. Data Sync with Auto-Migration
    useEffect(() => {
        if (!sdkReady) return;

        if (isLocalMode) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                const migrationUsers = (data.users || DEFAULT_USERS).map(u => ({
                    ...u,
                    
                    forceActiveIds: u.forceActiveIds || [],
                    streak: u.streak || 0,
                    lastQuestDate: u.lastQuestDate || null,
                    weeklyProgress: u.weeklyProgress || 0,
                    lastWeeklyReset: u.lastWeeklyReset || null,
                    lastLoginBonusDate: u.lastLoginBonusDate || null,                           
                    inventory: u.inventory || [],
                    gems: u.gems || 0,
                    shopCooldowns: u.shopCooldowns || {},
                    dailyPurchases: u.dailyPurchases || {}
                }));
                setUsers(migrationUsers);
                setQuests(data.quests || DEFAULT_QUESTS);
                setRewards(data.rewards || DEFAULT_REWARDS);
                setParentPin(data.parentPin || '1234');
                setVacationMode(data.vacationMode || false);
                setVacationStartTime(data.vacationStartTime || null);
                setWeeklyGoal(data.weeklyGoal || 10);
                setWishlist(data.wishlist || []);
                setShopState(data.shopState || {});
            }
        } else if (user) {
            const { db, appId, doc, onSnapshot } = window.FirebaseSDK;
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'gameState', 'current');
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const migrationUsers = (data.users || DEFAULT_USERS).map(u => ({
                        ...u,
                        
                        forceActiveIds: u.forceActiveIds || [],
                        streak: u.streak || 0,
                        lastQuestDate: u.lastQuestDate || null,
                        weeklyProgress: u.weeklyProgress || 0,
                        lastWeeklyReset: u.lastWeeklyReset || null,
                        lastLoginBonusDate: u.lastLoginBonusDate || null,
                        inventory: u.inventory || [],
                        gems: u.gems || 0,
                        shopCooldowns: u.shopCooldowns || {},
                        dailyPurchases: u.dailyPurchases || {}
                    }));
                    setUsers(migrationUsers);
                    setQuests(data.quests || DEFAULT_QUESTS);

                    setRewards(data.rewards || DEFAULT_REWARDS);
                    setParentPin(data.parentPin || '1234');
                    setVacationMode(data.vacationMode || false);
                    setVacationStartTime(data.vacationStartTime || null);
                    setWeeklyGoal(data.weeklyGoal || 10);
                    setWishlist(data.wishlist || []);
                    setShopState(data.shopState || {});
                } else {
                    // Migration Logic: Check for local data first
                    const localBackup = localStorage.getItem(STORAGE_KEY);

                    if (localBackup) {
                        console.log("Migrating local data to cloud...");
                        const data = JSON.parse(localBackup);
                        saveGameState(data.users || DEFAULT_USERS, data.quests || DEFAULT_QUESTS, data.rewards || DEFAULT_REWARDS, data.parentPin || '1234');
                    } else {
                        saveGameState(DEFAULT_USERS, DEFAULT_QUESTS, DEFAULT_REWARDS, '1234');
                    }
                }
            }, (err) => console.error("Sync Error:", err));
            return () => unsubscribe();
        }
    }, [sdkReady, isLocalMode, user]);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (activeUser?.totalXP) {
            setXpAnimating(true);
            const t = setTimeout(() => setXpAnimating(false), 800);
            return () => clearTimeout(t);
        }
    }, [activeUser?.totalXP]);

    useEffect(() => {
        localStorage.setItem('chore_quest_compact', isCompactMode);
    }, [isCompactMode]);

    const saveGameState = async (u, q, r, p, vm = vacationMode, vst = vacationStartTime, wg = weeklyGoal, wl = wishlist, ss = shopState) => {
        if (!sdkReady) return;
        
        if (isLocalMode) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                users: u, quests: q, rewards: r, parentPin: p, vacationMode: vm, vacationStartTime: vst, weeklyGoal: wg, wishlist: wl, shopState: ss, lastUpdated: Date.now()
            }));
        } else if (user) {
            const { db, appId, doc, setDoc } = window.FirebaseSDK;
            setIsSyncing(true);
            try {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gameState', 'current'), {
                    users: u, quests: q, rewards: r, parentPin: p, vacationMode: vm, vacationStartTime: vst, weeklyGoal: wg, wishlist: wl, shopState: ss, lastUpdated: Date.now()
                });
            } catch (err) {
                console.error("Save Error:", err);
            } finally {
                setIsSyncing(false);
            }
        }
    };

    const activeUser = users.find(u => u.id === activeUserId);
    const activeUsersList = users.filter(u => !u.isDeactivated);
    const deactivatedUsersList = users.filter(u => u.isDeactivated);
    const theme = activeUser?.themeColor || 'yellow';

    // --- CSV Handlers ---
    const downloadCSV = (content, filename) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportQuestsCSV = () => {
        const headers = ["id", "task", "xp", "gems", "icon", "repeatable", "cooldown", "assignedTo", "type", "days", "rotatingIds", "loot", "lootRarity", "lootValue"];
        const rows = quests.map(q => [
            q.id, `"${q.task}"`, q.xp, q.gems || 0, q.icon, q.repeatable, q.cooldown, q.assignedTo || "", q.type || "personal", `"${(q.days || []).join(',')}"`, `"${(q.rotatingIds || []).join(',')}"`, `"${(q.loot || "").replace(/"/g, '""')}"`, q.lootRarity || "common", q.lootValue || 0
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadCSV(csvContent, 'quests_export.csv');
    };

    const exportRewardsCSV = () => {
        const headers = ["id", "title", "level", "type", "interval", "cost", "quantity", "shopCooldown", "shopScope"];
        const rows = rewards.map(r => [
            r.id, `"${r.title}"`, r.level, r.type, r.interval, r.cost || 0, r.quantity ?? -1, r.shopCooldown ?? 0, r.shopScope ?? 'personal'
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        downloadCSV(csvContent, 'rewards_export.csv');
    };

    const importQuestsCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n').slice(1); // Skip header
            const newQuests = lines.filter(l => l.trim()).map(line => {
                // Simple CSV parse handling commas in quotes
                const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
                // Fallback parsing if regex fails on simple split
                const simpleParts = line.split(',');
                const p = cleanParts.length >= 13 ? cleanParts : simpleParts;
                
                return {
                    id: Number(p[0]) || Date.now(),
                    task: p[1],
                    xp: Number(p[2]),
                    gems: Number(p[3]) || 0,
                    icon: p[4],
                    repeatable: p[5] === 'true',
                    cooldown: Number(p[6]),
                    assignedTo: p[7] === "" ? null : p[7],
                    type: p[8] || 'personal',
                    days: p[9] ? p[9].split(',').map(Number).filter(n => !isNaN(n)) : [],
                    rotatingIds: p[10] ? p[10].split(',').map(s => s.trim()).filter(s => s) : [],
                    loot: p[11] ? p[11].replace(/^"|"$/g, '').trim() : "",
                    lootRarity: p[12] || "common",
                    lootValue: Number(p[13]) || 0
                };
            });
            setQuests(newQuests);
            saveGameState(users, newQuests, rewards, parentPin);
        };
        reader.readAsText(file);
    };

    const importRewardsCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.split('\n').slice(1);
            const newRewards = lines.filter(l => l.trim()).map(line => {
                const parts = line.split(',');
                return {
                    id: Number(parts[0]) || Date.now(),
                    title: parts[1].replace(/"/g, ''),
                    level: Number(parts[2]),
                    type: parts[3],
                    interval: Number(parts[4]),
                    cost: Number(parts[5]) || 0,
                    quantity: parts[6] ? Number(parts[6]) : -1,
                    shopCooldown: parts[7] ? Number(parts[7]) : 0,
                    shopScope: parts[8] || 'personal'
                };
            });
            setRewards(newRewards);
            saveGameState(users, quests, newRewards, parentPin);
        };
        reader.readAsText(file);
    };
    
    // --- Full System Backup Handlers ---
    const exportFullBackup = () => {
        const data = {
            users,
            quests,
            rewards,
            parentPin,
            vacationMode,
            vacationStartTime,
            wishlist,
            shopState,
            version: "v7"
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `chore_quest_full_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importFullBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                                        if (data.users && data.quests && data.rewards) {
                    if (confirm("This will overwrite all current data. Are you sure?")) {
                        setUsers(data.users);
                        setQuests(data.quests);
                        setRewards(data.rewards);
                        if (data.parentPin) setParentPin(data.parentPin);
                        setVacationMode(data.vacationMode || false);
                        setVacationStartTime(data.vacationStartTime || null);
                        setWishlist(data.wishlist || []);
                        setShopState(data.shopState || {});
                        saveGameState(data.users, data.quests, data.rewards, data.parentPin || parentPin, data.vacationMode, data.vacationStartTime, data.weeklyGoal || 10, data.wishlist || [], data.shopState || {});
                        alert("System restored successfully.");
                    }
                } else {

                    alert("Invalid backup file format.");
                }
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to parse backup file.");
            }
        };
        reader.readAsText(file);
    };

    const openKeyboard = (type, value, title, onConfirm) => {
        setKeyboardPos({ x: 0, y: 0 });
        setKeyboardState({ isOpen: true, value: value || "", type, title, onConfirm });
    };
    const closeKeyboard = () => setKeyboardState({ ...keyboardState, isOpen: false });

    const handleDragStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        isDragging.current = true;
        dragOffset.current = { x: clientX - keyboardPos.x, y: clientY - keyboardPos.y };
    };

    useEffect(() => {
        const handleMove = (e) => {
            if (!isDragging.current) return;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            setKeyboardPos({ x: clientX - dragOffset.current.x, y: clientY - dragOffset.current.y });
        };
        const handleEnd = () => { isDragging.current = false; };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        return () => {
            window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleEnd);
        };
    }, []);

    // --- Idle Timer ---
    const resetIdleTimer = () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            setIsIdle(true);
            setIsParentMode(false);
            setActiveUserId(null);
            setKeyboardState(prev => ({ ...prev, isOpen: false }));
            setShowPinModal(false);
            setShowPlayerUnlockModal(false);
        }, 300000); // 5 minutes
    };

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const handleActivity = () => {
            if (isIdle) setIsIdle(false);
            resetIdleTimer();
        };
        events.forEach(e => window.addEventListener(e, handleActivity));
        resetIdleTimer();
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            events.forEach(e => window.removeEventListener(e, handleActivity));
        };
    }, [isIdle]);

    // --- Auto-Submit PIN ---
    useEffect(() => {
        if (pinInput.length === 4) {
            const timer = setTimeout(() => {
                if (showPinModal) verifyPin();
                if (showPlayerUnlockModal) verifyPlayerPasscode();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pinInput, showPinModal, showPlayerUnlockModal]);

    // --- Handlers ---
    const addOrUpdateQuest = (e) => {
        e.preventDefault();
        if (!newQuest.task.trim()) return;
        
        let questToSave = { ...newQuest };
        if (questToSave.type === 'rotating') {
            if (!questToSave.rotatingIds || questToSave.rotatingIds.length === 0) {
                questToSave.rotatingIds = users.filter(u => !u.isDeactivated).map(u => u.id);
            }
            if (!questToSave.assignedTo || !questToSave.rotatingIds.includes(questToSave.assignedTo)) {
                questToSave.assignedTo = questToSave.rotatingIds[0];
            }
        } else {
            questToSave.rotatingIds = [];
        }

        let updatedQuests;
        if (editingQuestId) {
            updatedQuests = quests.map(q => q.id === editingQuestId ? { ...questToSave, id: q.id } : q);
            setEditingQuestId(null);
        } else {
            updatedQuests = [...quests, { ...questToSave, id: Date.now() }];
        }
        setQuests(updatedQuests);
        setNewQuest({ task: "", xp: 20, gems: 5, cooldown: 1, repeatable: false, assignedTo: null, icon: "✨", type: 'personal', days: [], rotatingIds: [], loot: "", lootRarity: "common", lootValue: 0 });
        saveGameState(users, updatedQuests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const editQuest = (quest) => {
        setEditingQuestId(quest.id);
        setNewQuest({ ...quest });
    };

    const addOrUpdateReward = (e) => {
        e.preventDefault();
        if (!newReward.title.trim()) return;
        let updatedRewards;
        if (editingRewardId) {
            updatedRewards = rewards.map(r => r.id === editingRewardId ? { ...newReward, id: r.id } : r);
            setEditingRewardId(null);
        } else {
            updatedRewards = [...rewards, { ...newReward, id: Date.now() }];
        }
        setRewards(updatedRewards);
        setNewReward({ title: "", level: 2, type: "primary", interval: 2, cost: 0, quantity: -1, shopCooldown: 1, shopScope: 'personal' });
        saveGameState(users, quests, updatedRewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const playCoinSound = () => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    };

    const getRewardStatus = (reward) => {
        if (!activeUser || reward.type !== 'shop') return {};

        let isSoldOut = false;
        let isOnCooldown = false;
        let cooldownTime = 0;
        let remaining = reward.quantity;

        if (reward.shopScope === 'global') {
            const globalState = shopState[reward.id];
            if (globalState) {
                if (globalState.quantity === 0) isSoldOut = true;
                if (now < globalState.cooldownUntil) {
                    isOnCooldown = true;
                    cooldownTime = globalState.cooldownUntil;
                }
                remaining = globalState.quantity;
            }
        } else { // personal scope
            if (reward.quantity !== -1) {
                const purchasedCount = (activeUser.claimedRewards || []).filter(id => id === reward.id).length;
                if (purchasedCount >= reward.quantity) isSoldOut = true;
                remaining = reward.quantity - purchasedCount;
            }
            const personalCooldown = activeUser.shopCooldowns?.[reward.id];
            if (now < personalCooldown) {
                isOnCooldown = true;
                cooldownTime = personalCooldown;
            }
        }
        
        return { isSoldOut, isOnCooldown, cooldownTime, remaining };
    };

    const buyReward = (reward) => {
        const todayStr = new Date().toDateString();
        const dailyPurchases = activeUser.dailyPurchases?.[todayStr] || 0;
        const status = getRewardStatus(reward);
        let errorMsg = null;

        if ((activeUser.gems || 0) < reward.cost) errorMsg = `Not enough Gems! Need ${reward.cost}`;
        else if (dailyPurchases >= DAILY_PURCHASE_LIMIT) errorMsg = `Daily purchase limit of ${DAILY_PURCHASE_LIMIT} reached.`;
        else if (status.isSoldOut) errorMsg = "This item is sold out!";
        else if (status.isOnCooldown) errorMsg = `Item on cooldown for ${formatCooldown(status.cooldownTime)}.`;

        if (errorMsg) {
            const updated = users.map(u => u.id === activeUser.id ? { ...u, notifications: [{ id: Date.now(), message: errorMsg, type: 'error', timestamp: Date.now() }, ...(u.notifications || [])].slice(0, 20) } : u);
            setUsers(updated);
            saveGameState(updated, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
            return;
        }

        let newShopState = { ...shopState };
        if (reward.shopScope === 'global') {
            const currentGlobalState = newShopState[reward.id] || { quantity: reward.quantity, cooldownUntil: 0 };
            const newQuantity = reward.quantity !== -1 ? currentGlobalState.quantity - 1 : -1;
            const newCooldown = reward.shopCooldown > 0 ? now + reward.shopCooldown * 86400000 : 0;
            newShopState[reward.id] = { quantity: newQuantity, cooldownUntil: newCooldown };
            setShopState(newShopState);
        }

        const updatedUsers = users.map(u => {
            if (u.id === activeUser.id) {
                const newDailyPurchases = { ...(u.dailyPurchases || {}), [todayStr]: dailyPurchases + 1 };
                const newShopCooldowns = { ...(u.shopCooldowns || {}) };
                if (reward.shopScope === 'personal' && reward.shopCooldown > 0) newShopCooldowns[reward.id] = now + reward.shopCooldown * 86400000;
                return { ...u, gems: (u.gems || 0) - reward.cost, claimedRewards: [...(u.claimedRewards || []), reward.id], dailyPurchases: newDailyPurchases, shopCooldowns: newShopCooldowns, notifications: [{ id: Date.now(), message: `Purchased: ${reward.title}`, type: 'success', timestamp: Date.now() }, ...(u.notifications || [])].slice(0, 20) };
            }
            return u;
        });
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, newShopState);
        playCoinSound();
    };

    const editReward = (reward) => {
        setEditingRewardId(reward.id);
        setNewReward({ ...reward });
    };

    const addWishlistItem = (text) => {
        if (!text.trim() || !activeUser) return;
        const newItem = {
            id: Date.now(),
            text: text.trim(),
            requestedById: activeUser.id,
            requestedByName: activeUser.name,
            timestamp: Date.now()
        };
        const newWishlist = [newItem, ...wishlist];
        setWishlist(newWishlist);
        saveGameState(users, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, newWishlist, shopState);
    };

    const deleteWishlistItem = (itemId) => {
        const newWishlist = wishlist.filter(item => item.id !== itemId);
        setWishlist(newWishlist);
        saveGameState(users, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, newWishlist, shopState);
    };

    const promoteToReward = (item) => {
        setNewReward({ title: item.text, type: 'shop', cost: 100, level: 1, interval: 0, quantity: 1, shopCooldown: 7, shopScope: 'global' });
        deleteWishlistItem(item.id);
        document.getElementById('reward-editor')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleParentModeToggle = () => {
        if (isParentMode) {
            setIsParentMode(false);
            setIsSettingNewPin(false);
            setEditingQuestId(null);
            setEditingRewardId(null);
        } else {
            setShowPinModal(true);
            setPinInput("");
        }
    };

    const verifyPin = (e) => {
        if (e) e.preventDefault();
        if (pinInput === parentPin) {
            setIsParentMode(true);
            setShowPinModal(false);
            setPinInput("");
            if (!activeUserId && users.length > 0) {
                setActiveUserId(users[0].id);
            }
        } else {
            setPinError(true);
            setTimeout(() => { setPinError(false); setPinInput(""); }, 500);
        }
    };

    const handlePlayerSwitchRequest = (targetId) => {
        if (targetId === activeUserId) return;
        if (isParentMode) {
            setActiveUserId(targetId);
            return;
        }
        setPendingUserId(targetId);
        setShowPlayerUnlockModal(true);
        setPinInput("");
    };

    const verifyPlayerPasscode = (e) => {
        if (e) e.preventDefault();
        const target = users.find(u => u.id === pendingUserId);
        if (target && pinInput === (target.passcode || "0000")) {
            setActiveUserId(pendingUserId);
            setShowPlayerUnlockModal(false);
            setPinInput("");
        } else {
            setPinError(true);
            setTimeout(() => { setPinError(false); setPinInput(""); }, 500);
        }
    };

    const changePin = (e) => {
        if (e) e.preventDefault();
        const newPin = pinInput;
        setParentPin(newPin);
        setIsSettingNewPin(false);
        setPinInput("");
        saveGameState(users, quests, rewards, newPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const changeUserPasscode = (userId, newCode) => {
        if (newCode.length < 1) return;
        const updated = users.map(u => u.id === userId ? { ...u, passcode: newCode } : u);
        setUsers(updated);
        saveGameState(updated, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const updatePlayerStats = (userId, field, value) => {
        const numVal = parseInt(value) || 0;
        const updated = users.map(u => u.id === userId ? { ...u, [field]: numVal } : u);
        setUsers(updated);
        saveGameState(updated, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const clearNotifications = (userId) => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, notifications: [] } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const submitForApproval = (questId) => {
        const updatedUsers = users.map(u => u.id === activeUserId ? {
            ...u, pendingIds: [...(u.pendingIds || []), questId]
        } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const undoSubmission = (questId) => {
        setConfirmUndoQuestId(questId);
    };

    const confirmUndo = () => {
        if (!confirmUndoQuestId) return;
        const updatedUsers = users.map(u => u.id === activeUserId ? {
            ...u, pendingIds: (u.pendingIds || []).filter(id => id !== confirmUndoQuestId)
        } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
        setConfirmUndoQuestId(null);
    };

    const playLevelUpSound = () => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            // Play a celebratory C Major arpeggio (C5, E5, G5, C6)
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = freq;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.05, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.5);
            });
        } catch (e) {}
    };

    const playLoginSound = () => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(659.25, now);
            osc.frequency.setValueAtTime(830.61, now + 0.15);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc.start(now);
            osc.stop(now + 0.8);
        } catch (e) {}
    };

    useEffect(() => {
        if (!activeUserId || isParentMode) return;
        const userIndex = users.findIndex(u => u.id === activeUserId);
        if (userIndex === -1) return;
        
        const currentUser = users[userIndex];
        const nowObj = new Date();
        const todayStr = nowObj.toDateString();
        const lastBonusDate = currentUser.lastLoginBonusDate ? new Date(currentUser.lastLoginBonusDate).toDateString() : null;
        
        if (lastBonusDate !== todayStr) {
            const LOGIN_BONUS = 50;
            const newXP = currentUser.totalXP + LOGIN_BONUS;
            const newLevel = Math.floor(newXP / xpToLevel) + 1;
            
            const newNotifications = [
                { id: Date.now(), message: `Daily Login Bonus! +${LOGIN_BONUS} XP`, type: 'celebration', timestamp: Date.now() },
                ...(currentUser.notifications || [])
            ].slice(0, 20);

            if (newLevel > currentUser.level) {
                newNotifications.unshift({ id: Date.now() + 1, message: `LEVEL UP! You reached Level ${newLevel}!`, type: 'celebration', timestamp: Date.now() });
                playLevelUpSound();
            } else {
                playLoginSound();
            }

            const updatedUsers = [...users];
            updatedUsers[userIndex] = {
                ...currentUser,
                totalXP: newXP,
                level: newLevel,
                lastLoginBonusDate: Date.now(),
                notifications: newNotifications
            };
            
            setUsers(updatedUsers);
            saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
            if (newLevel > currentUser.level) setShowCelebration(true);
        }
    }, [activeUserId]);

    const approveQuest = (userId, questId) => {
        const targetUser = users.find(u => u.id === userId);
        const quest = quests.find(q => q.id === questId);
        if (!targetUser || !quest) return;
        
        let updatedQuests = quests;
        // Rotating Logic: Advance to next player
        if (quest.type === 'rotating' && quest.rotatingIds && quest.rotatingIds.length > 0) {
            const currentIdx = quest.rotatingIds.indexOf(userId);
            const nextIdx = (currentIdx + 1) % quest.rotatingIds.length;
            const nextUserId = quest.rotatingIds[nextIdx];
            
            updatedQuests = quests.map(q => q.id === questId ? { ...q, assignedTo: nextUserId } : q);
        }

        // Streak Logic
        const nowObj = new Date();
        const todayStr = nowObj.toDateString();
        const lastDate = targetUser.lastQuestDate ? new Date(targetUser.lastQuestDate) : null;
        const lastDateStr = lastDate ? lastDate.toDateString() : null;
        
        let newStreak = targetUser.streak || 0;
        let streakNotification = null;

        if (lastDateStr !== todayStr) {
            const yesterday = new Date(nowObj);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            if (lastDateStr === yesterdayStr) {
                newStreak += 1;
                streakNotification = { id: Date.now() + 2, message: `🔥 Streak Increased: ${newStreak} Days!`, type: 'celebration', timestamp: Date.now() };
            } else {
                newStreak = 1;
                streakNotification = { id: Date.now() + 2, message: `🔥 Daily Streak Started!`, type: 'success', timestamp: Date.now() };
            }
        }

        // Weekly Goal Logic
        const startOfWeek = new Date(nowObj);
        const day = startOfWeek.getDay(); // 0 is Sunday
        const diff = startOfWeek.getDate() - day;
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        const startOfWeekTs = startOfWeek.getTime();

        let weeklyProgress = targetUser.weeklyProgress || 0;
        let lastWeeklyReset = targetUser.lastWeeklyReset || 0;

        if (startOfWeekTs > lastWeeklyReset) {
            weeklyProgress = 0;
            lastWeeklyReset = startOfWeekTs;
        }

        weeklyProgress += 1;
        const isWeeklyGoalReached = weeklyProgress === weeklyGoal;
        const bonusXP = isWeeklyGoalReached ? WEEKLY_BONUS : 0;
        
        const newXP = targetUser.totalXP + quest.xp + bonusXP;
        const newGems = (targetUser.gems || 0) + (quest.gems || 0);
        const newLevel = Math.floor(newXP / xpToLevel) + 1;

        const historyEntry = {
            id: Date.now(),
            questId: quest.id,
            task: quest.task,
            xp: quest.xp,
            timestamp: Date.now()
        };

        const newNotifications = [
            { id: Date.now(), message: `Approved: ${quest.task} (+${quest.xp} XP, +${quest.gems || 0} Gems)`, type: 'success', timestamp: Date.now() }
        ];
        
        if (newLevel > targetUser.level) {
            newNotifications.unshift({ id: Date.now() + 1, message: `LEVEL UP! You reached Level ${newLevel}!`, type: 'celebration', timestamp: Date.now() });
            playLevelUpSound();
        }
        if (quest.loot) newNotifications.unshift({ id: Date.now() + 2, message: `Loot Found: ${quest.loot}`, type: 'celebration', timestamp: Date.now() });
        if (isWeeklyGoalReached) newNotifications.unshift({ id: Date.now() + 3, message: `Weekly Goal Met! +${WEEKLY_BONUS} XP Bonus!`, type: 'celebration', timestamp: Date.now() });
        if (streakNotification) newNotifications.unshift(streakNotification);

        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const cds = { ...u.cooldowns };
                if (quest.repeatable) cds[questId] = Date.now() + (quest.cooldown * 86400000);
                
                const newInventory = quest.loot ? [{ 
                    id: Date.now(), 
                    text: quest.loot, 
                    rarity: quest.lootRarity || 'common', 
                    value: quest.lootValue || 0, 
                    timestamp: Date.now() 
                }, ...(u.inventory || [])] : (u.inventory || []);

                return {
                    ...u, totalXP: newXP, gems: newGems, level: newLevel,
                    pendingIds: (u.pendingIds || []).filter(id => id !== questId),
                    completedIds: quest.repeatable ? u.completedIds : [...(u.completedIds || []), questId],
                    cooldowns: cds,
                    history: [historyEntry, ...(u.history || [])].slice(0, 50),
                    notifications: [...newNotifications, ...(u.notifications || [])].slice(0, 20),
                    
                    streak: newStreak,
                    lastQuestDate: Date.now(),
                    weeklyProgress: weeklyProgress,
                    lastWeeklyReset: lastWeeklyReset,
                    inventory: newInventory
                };
            }
            
            // For rotating quests, apply cooldown to the NEXT user so they don't see it immediately if there is a cooldown
            if (quest.type === 'rotating' && quest.rotatingIds && quest.rotatingIds.length > 0 && quest.cooldown > 0) {
                const currentIdx = quest.rotatingIds.indexOf(userId);
                const nextIdx = (currentIdx + 1) % quest.rotatingIds.length;
                if (u.id === quest.rotatingIds[nextIdx]) {
                    const cds = { ...u.cooldowns, [questId]: Date.now() + (quest.cooldown * 86400000) };
                    return { ...u, cooldowns: cds };
                }
            }

            return u;
        });
        setUsers(updatedUsers);
        if (updatedQuests !== quests) setQuests(updatedQuests);
        saveGameState(updatedUsers, updatedQuests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
        if (newLevel > targetUser.level && userId === activeUserId) setShowCelebration(true);
    };

    const denyQuest = (userId, questId) => {
        const quest = quests.find(q => q.id === questId);
        const taskName = quest ? quest.task : "Mission";
        const updatedUsers = users.map(u => u.id === userId ? {
            ...u, pendingIds: (u.pendingIds || []).filter(id => id !== questId),
            notifications: [{ id: Date.now(), message: `Mission Denied: ${taskName}`, type: 'error', timestamp: Date.now() }, ...(u.notifications || [])].slice(0, 20)
        } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const reactivateQuest = (userId, questId) => {
        const updatedUsers = users.map(u => u.id === userId ? {
            ...u, completedIds: (u.completedIds || []).filter(id => id !== questId)
        } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const resetCooldown = (userId, questId) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const cds = { ...u.cooldowns };
                delete cds[questId];
                return { ...u, cooldowns: cds };
            }
            return u;
        });
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    // Toggle "Force Show" for a quest for the active user (Parent Mode only)
    const toggleForceActive = (userId, questId) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const currentForces = u.forceActiveIds || [];
                const newForces = currentForces.includes(questId) 
                    ? currentForces.filter(id => id !== questId) 
                    : [...currentForces, questId];
                return { ...u, forceActiveIds: newForces };
            }
            return u;
        });
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const claimReward = (rewardId) => {
        const updatedUsers = users.map(u => u.id === activeUserId ? {
            ...u, claimedRewards: [...(u.claimedRewards || []), rewardId]
        } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const fulfillReward = (userId, rewardId) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const currentClaimed = u.claimedRewards || [];
                const index = currentClaimed.indexOf(rewardId);
                if (index > -1) {
                    const newClaimed = [...currentClaimed];
                    newClaimed.splice(index, 1);
                    return { ...u, claimedRewards: newClaimed, fulfilledRewards: [...(u.fulfilledRewards || []), rewardId] };
                }
            }
            return u;
        });
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const deleteQuest = (id) => {
        const qList = quests.filter(x=>x.id !== id);
        setQuests(qList); saveGameState(users, qList, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const deleteReward = (id) => {
        const rList = rewards.filter(x=>x.id !== id);
        setRewards(rList); saveGameState(users, quests, rList, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const addUser = (name) => {
        if (!name || !name.trim()) return;
        const id = 'u' + Date.now();
        
        const u = [...users, { id, name: name.trim(), avatar: "🙂", themeColor: "yellow", passcode: "0000", totalXP: 0, level: 1, gems: 0, completedIds: [], pendingIds: [], cooldowns: {}, claimedRewards: [], fulfilledRewards: [], forceActiveIds: [], isDeactivated: false, history: [], notifications: [], streak: 0, lastQuestDate: null, inventory: [], shopCooldowns: {}, dailyPurchases: {} }];
        setUsers(u); saveGameState(u, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const editUser = (userId, currentName) => {
        openKeyboard('text', currentName, 'Edit Player Name', (newName) => {
            if (newName && newName.trim()) {
                const updatedUsers = users.map(u => u.id === userId ? { ...u, name: newName.trim() } : u);
                setUsers(updatedUsers);
                saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
                setActionModalMode(null);
            }
        });
    };

    const updateAvatar = (userId, newAvatar) => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, avatar: newAvatar } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const updateTheme = (userId, newColor) => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, themeColor: newColor } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
    };

    const handleDeactivateUser = (userId) => {
        if (activeUsersList.length <= 1) {
            alert("Cannot deactivate the last active player.");
            return;
        }
        if (confirm("Deactivate this player? They will be hidden from the list but data is preserved.")) {
            const updatedUsers = users.map(u => u.id === userId ? { ...u, isDeactivated: true } : u);
            setUsers(updatedUsers);
            if (activeUserId === userId) setActiveUserId(null);
            saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
            setActionModalMode(null);
        }
    };

    const handleReactivateUser = (userId) => {
        const updatedUsers = users.map(u => u.id === userId ? { ...u, isDeactivated: false } : u);
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
        setActionModalMode(null);
    };

    const toggleVacationMode = () => {
        if (vacationMode) {
            // Turning OFF: Shift cooldowns
            const end = Date.now();
            const start = vacationStartTime || end;
            const diff = end - start;
            
            const updatedUsers = users.map(u => {
                const newCooldowns = {};
                Object.entries(u.cooldowns || {}).forEach(([qid, time]) => {
                    // If cooldown was set to expire after vacation started, extend it
                    if (time > start) {
                        newCooldowns[qid] = time + diff;
                    } else {
                        newCooldowns[qid] = time;
                    }
                });
                return { ...u, cooldowns: newCooldowns };
            });
            setUsers(updatedUsers);
            setVacationMode(false);
            setVacationStartTime(null);
            saveGameState(updatedUsers, quests, rewards, parentPin, false, null, weeklyGoal, wishlist, shopState);
        } else {
            // Turning ON
            const now = Date.now();
            setVacationMode(true);
            setVacationStartTime(now);
            saveGameState(users, quests, rewards, parentPin, true, now, weeklyGoal, wishlist, shopState);
        }
    };

    const handleSellItem = (userId, item) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const newInventory = u.inventory.filter(i => i.id !== item.id);
                const newGems = (u.gems || 0) + (item.value || 0);
                return { ...u, inventory: newInventory, gems: newGems };
            }
            return u;
        });
        setUsers(updatedUsers);
        saveGameState(updatedUsers, quests, rewards, parentPin, vacationMode, vacationStartTime, weeklyGoal, wishlist, shopState);
        setSelectedInventoryItem(null);
        if (item.value > 0) playCoinSound();
    };

    const formatCooldown = (cdTime) => {
        const diff = cdTime - now;
        if (diff <= 0) return null;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.ceil((diff % 3600000) / 60000);
        return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const toggleDay = (dayIndex) => {
        const currentDays = newQuest.days || [];
        if (currentDays.includes(dayIndex)) {
            setNewQuest({...newQuest, days: currentDays.filter(d => d !== dayIndex)});
        } else {
            setNewQuest({...newQuest, days: [...currentDays, dayIndex]});
        }
    };

    if (!sdkReady) return <div className="min-h-screen bg-slate-900 flex items-center justify-center font-black text-slate-700 tracking-[0.2em] uppercase italic text-center px-8">Initializing Kingdom...</div>;
    
    const currentAppId = window.FirebaseSDK?.appId || 'Local-Only-Mode';
    const currentDayIndex = new Date(now).getDay();

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
            {isSyncing && <div className="fixed top-4 right-4 z-[100] animate-spin text-yellow-500"><Icon name="refresh-cw" size={20}/></div>}

            {vacationMode && (
                <div className="fixed top-0 left-0 right-0 bg-teal-600 text-white text-center py-2 z-[90] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                    <Icon name="palmtree" size={20} /> Vacation Mode Active - Cooldowns Paused
                </div>
            )}

            {showCelebration && activeUser && (
                <>
                <Confetti />
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowCelebration(false)}>
                    <div className="bg-yellow-500 text-black p-8 rounded-2xl animate-bounce border-4 border-white flex flex-col items-center shadow-2xl">
                        <Icon name="trophy" size={64} className="mb-4" />
                        <h2 className="text-4xl font-black italic uppercase text-center leading-none tracking-tighter">Level Up!</h2>
                        <p className="text-xl font-bold mt-2 text-center">You reached Level {activeUser.level}</p>
                    </div>
                </div>
                </>
            )}

            {(showPinModal || showPlayerUnlockModal) && (
                <div className="fixed inset-0 flex items-center justify-center z-[70] bg-slate-950/90 backdrop-blur-md">
                    <div className={`bg-slate-800 p-6 rounded-[2rem] border-2 shadow-2xl w-full max-sm:max-w-full max-w-sm modal-enter ${pinError ? 'border-red-500 animate-shake' : 'border-slate-700'}`}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                                <Icon name="lock" size={32} />
                            </div>
                            <h2 className="text-2xl font-black uppercase italic text-white tracking-tight">{showPinModal ? 'Parent Access' : `Unlock ${users.find(u=>u.id===pendingUserId)?.name}`}</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="w-full bg-slate-900 border-2 border-slate-700 rounded-2xl py-4 text-center text-3xl tracking-[1em] font-black text-yellow-500 h-20 flex items-center justify-center">
                                {pinInput.replace(/./g, '•')}
                            </div>
                            <VirtualKeyboard 
                                type="numeric" 
                                onInput={c => setPinInput(prev => (prev + c).slice(0, 4))} 
                                onDelete={() => setPinInput(prev => prev.slice(0, -1))}
                                onSubmit={showPinModal ? verifyPin : verifyPlayerPasscode}
                                soundEnabled={soundEnabled}
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={()=>{setShowPinModal(false); setShowPlayerUnlockModal(false);}} className="flex-1 bg-slate-700 font-bold py-3 rounded-xl hover:bg-slate-600">Back</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {keyboardState.isOpen && (
                <div className="fixed inset-0 z-[80] pointer-events-none flex items-center justify-center">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl flex flex-col gap-4 pointer-events-auto touch-none" style={{ transform: `translate(${keyboardPos.x}px, ${keyboardPos.y}px)` }}>
                        <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg cursor-move" onMouseDown={handleDragStart} onTouchStart={handleDragStart}>
                            <div className="flex items-center gap-2 text-slate-400 select-none">
                                <Icon name="move" size={16}/>
                                <h3 className="text-xl font-black text-white uppercase italic">{keyboardState.title}</h3>
                            </div>
                            <button onClick={closeKeyboard} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white"><Icon name="x" size={24}/></button>
                        </div>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="text-2xl font-bold text-white min-h-[2rem] break-words">
                                {keyboardState.type === 'password' ? '•'.repeat(keyboardState.value.length) : keyboardState.value}
                                <span className="animate-pulse text-yellow-500">|</span>
                            </div>
                        </div>
                        <VirtualKeyboard 
                            type={keyboardState.type === 'numeric' ? 'numeric' : 'text'}
                            onInput={(char) => setKeyboardState(prev => ({ ...prev, value: prev.value + char }))}
                            onDelete={() => setKeyboardState(prev => ({ ...prev, value: prev.value.slice(0, -1) }))}
                            onSubmit={() => {
                                if(keyboardState.onConfirm) keyboardState.onConfirm(keyboardState.value);
                                closeKeyboard();
                            }}
                            soundEnabled={soundEnabled}
                        />
                    </div>
                </div>
            )}

            {selectedInventoryItem && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedInventoryItem(null)}>
                    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h3 className={`text-xl font-black uppercase italic mb-2 text-center ${selectedInventoryItem.rarity === 'legendary' ? 'text-orange-400' : selectedInventoryItem.rarity === 'epic' ? 'text-purple-400' : selectedInventoryItem.rarity === 'rare' ? 'text-blue-400' : 'text-white'}`}>{selectedInventoryItem.text}</h3>
                        <div className="flex justify-center mb-6">
                            <span className="bg-slate-900 px-3 py-1 rounded-lg text-xs font-bold uppercase text-slate-400">{selectedInventoryItem.rarity} Item</span>
                        </div>
                        <p className="text-center text-slate-300 mb-6">Value: <span className="text-emerald-400 font-black">{selectedInventoryItem.value} Gems</span></p>
                        <div className="flex gap-3">
                            <button onClick={() => handleSellItem(activeUser.id, selectedInventoryItem)} className={`flex-1 py-3 rounded-xl font-black uppercase transition-all ${selectedInventoryItem.value > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-red-600 text-white hover:bg-red-500'}`}>
                                {selectedInventoryItem.value > 0 ? 'Sell' : 'Discard'}
                            </button>
                            <button onClick={() => setSelectedInventoryItem(null)} className="flex-1 py-3 bg-slate-700 rounded-xl text-white font-bold uppercase hover:bg-slate-600">Keep</button>
                        </div>
                    </div>
                </div>
            )}

            {actionModalMode && (
                <div className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setActionModalMode(null)}>
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white uppercase italic mb-6 text-center">
                            {actionModalMode === 'edit' ? 'Select Player to Edit' : 
                             actionModalMode === 'deactivate' ? 'Select Player to Deactivate' : 
                             'Select Player to Reactivate'}
                        </h3>
                        <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                            {(actionModalMode === 'reactivate' ? deactivatedUsersList : activeUsersList).map(u => (
                                <button key={u.id} onClick={() => {
                                    if (actionModalMode === 'edit') editUser(u.id, u.name);
                                    else if (actionModalMode === 'deactivate') handleDeactivateUser(u.id);
                                    else handleReactivateUser(u.id);
                                }} className="p-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white transition-all border border-slate-600 hover:border-yellow-500">
                                    {u.name}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setActionModalMode(null)} className="w-full mt-6 py-3 bg-slate-900 rounded-xl text-slate-500 font-bold uppercase hover:text-white transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {confirmUndoQuestId && (
                <div className="fixed inset-0 z-[90] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setConfirmUndoQuestId(null)}>
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white uppercase italic mb-4 text-center">Undo Submission?</h3>
                        <p className="text-slate-400 text-center mb-6">Are you sure you want to retract this quest submission?</p>
                        <div className="flex gap-3">
                            <button onClick={confirmUndo} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold uppercase hover:bg-red-500 transition-colors">Yes, Undo</button>
                            <button onClick={() => setConfirmUndoQuestId(null)} className="flex-1 py-3 bg-slate-700 rounded-xl text-white font-bold uppercase hover:bg-slate-600 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedQuest && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedQuest(null)}>
                    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 w-full max-w-lg shadow-2xl animate-in zoom-in-95 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedQuest(null)} className="absolute top-4 right-4 p-2 bg-slate-700 rounded-full text-slate-400 hover:text-white"><Icon name="x" size={20}/></button>
                        
                        <div className="flex flex-col items-center mb-6">
                            <div className="text-6xl mb-4 filter drop-shadow-lg animate-bounce">{selectedQuest.icon}</div>
                            <h2 className="text-2xl font-black text-white uppercase italic text-center leading-tight">{selectedQuest.task}</h2>
                            <div className="flex gap-2 mt-3">
                                <span className="bg-yellow-500 text-slate-900 px-3 py-1 rounded-lg font-black uppercase text-xs">+{selectedQuest.xp} XP</span>
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black uppercase text-xs">+{selectedQuest.gems || 0} Gems</span>
                                <span className={`px-3 py-1 rounded-lg font-black uppercase text-xs ${selectedQuest.type === 'global' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>{selectedQuest.type === 'global' ? 'Competitive' : 'Personal'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Frequency</label>
                                <p className="font-bold text-white text-sm">{selectedQuest.repeatable ? 'Repeatable' : 'One-Time Mission'}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Cooldown</label>
                                <p className="font-bold text-white text-sm">{selectedQuest.cooldown} Days</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 col-span-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Schedule</label>
                                <div className="flex gap-1 mt-1">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                                        <div key={d} className={`flex-1 py-1 rounded text-[10px] font-black uppercase text-center ${(!selectedQuest.days || selectedQuest.days.length === 0 || selectedQuest.days.includes(i)) ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                            {d.charAt(0)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isIdle ? (
                <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center p-8 overflow-y-auto animate-in fade-in duration-500" onClick={() => setIsIdle(false)}>
                    <h1 className="text-4xl md:text-6xl font-black text-yellow-500 uppercase italic mb-12 tracking-tighter animate-pulse text-center">
                        <Icon name="sword" size={48} className="inline-block mr-4 mb-2"/>
                        Competitive Chores
                    </h1>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
                        {quests.filter(q => q.type === 'global').map(quest => (
                            <div key={quest.id} className="bg-slate-900/80 border-2 border-orange-500/50 p-6 rounded-3xl flex items-center gap-6 shadow-2xl backdrop-blur-sm">
                                <div className="text-5xl filter drop-shadow-lg animate-bounce">{quest.icon}</div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{quest.task}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <span className="bg-yellow-500 text-slate-900 px-3 py-1 rounded-lg font-black uppercase text-xs">+{quest.xp} XP</span>
                                        <span className="bg-orange-500 text-white px-3 py-1 rounded-lg font-black uppercase text-xs">First to Finish</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {quests.filter(q => q.type === 'global').length === 0 && (
                            <div className="col-span-full text-center text-slate-500 font-bold uppercase tracking-widest">No active competitive quests</div>
                        )}
                    </div>
                    <p className="mt-16 text-slate-500 font-black uppercase tracking-[0.5em] animate-pulse">Tap anywhere to wake</p>
                </div>
            ) : !activeUser ? (
                <div className="fixed inset-0 overflow-y-auto bg-slate-900 z-50">
                    <div className="min-h-full flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300">
                        <h1 className="text-4xl font-black text-white uppercase italic mb-8 tracking-tighter text-center">Who is playing?</h1>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full max-w-6xl">
                        {activeUsersList.map(u => (
                            <button key={u.id} onClick={() => handlePlayerSwitchRequest(u.id)} className="group bg-slate-800 hover:bg-slate-700 p-6 rounded-[2rem] border-2 border-slate-700 hover:border-yellow-500 flex flex-col items-center gap-4 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/20">
                                <div className="w-20 h-20 bg-slate-700 group-hover:bg-yellow-500 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-900 font-black text-3xl transition-colors">
                                    {u.avatar || u.name.charAt(0)}
                                </div>
                                <span className="font-bold text-xl text-slate-300 group-hover:text-white">{u.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-12">
                        <button onClick={handleParentModeToggle} className="p-4 bg-slate-800 rounded-full text-slate-600 hover:text-white hover:bg-slate-700 transition-all shadow-lg"><Icon name="lock" size={24}/></button>
                    </div>
                    </div>
                </div>
            ) : (