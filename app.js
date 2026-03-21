const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let filtroBusca = '';
let toastTimeout = null;
let activeTab = 'transacoes';

// Dados padrão iniciais (vazios)
const dadosPadrao = {
    transacoes: [],
    investimentosMP: [],
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER', 'TRANSPORTE', 'EDUCAÇÃO'],
    metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX', 'TRANSFERÊNCIA'],
    tiposInvestimento: ['RENDA FIXA', 'FUNDOS', 'AÇÕES'],
    corretoras: ['MERCADO PAGO', 'NU INVEST', 'XP INC']
};

// Dados atuais em memória
let dados = JSON.parse(JSON.stringify(dadosPadrao)); // clona o padrão

// ==================== FUNÇÕES GLOBAIS ====================
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    showToast(`Modo ${isDark ? 'escuro' : 'claro'} ativado`, 'info');
}

function showToast(message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-rose-500' : 'bg-blue-500';
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-xl text-sm font-bold shadow-2xl transform transition-all duration-500 translate-y-0 opacity-100 z-50 max-w-sm`;
    toast.textContent = message;
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function mostrarCadastro() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('cadastroForm').style.display = 'block';
    document.getElementById('authSubtitle').innerText = 'Crie sua conta';
}
function mostrarLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('cadastroForm').style.display = 'none';
    document.getElementById('authSubtitle').innerText = 'Acesse sua conta';
}

function mudarAba(aba) {
    activeTab = aba;
    const tabTrans = document.getElementById('tabTransacoes');
    const tabInv = document.getElementById('tabInvestimentos');
    tabTrans.classList.remove('bg-emerald-600', 'text-white');
    tabInv.classList.remove('bg-emerald-600', 'text-white');
    tabTrans.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
    tabInv.classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
    if (aba === 'transacoes') {
        tabTrans.classList.add('bg-emerald-600', 'text-white');
        document.getElementById('areaTransacoes').style.display = 'block';
        document.getElementById('areaInvestimentos').style.display = 'none';
        resetForm();
        render();
    } else {
        tabInv.classList.add('bg-emerald-600', 'text-white');
        document.getElementById('areaTransacoes').style.display = 'none';
        document.getElementById('areaInvestimentos').style.display = 'block';
        resetFormInvestMP();
        render();
    }
}

// ==================== AUTENTICAÇÃO ====================
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            carregarNomeUsuario(user);
            loadFromCloud(); // carrega os dados do usuário atual
        } else {
            // Reset dados globais ao fazer logout
            dados = JSON.parse(JSON.stringify(dadosPadrao));
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
            mostrarLogin();
        }
    });
    initDateFilters();
    initKeyboardShortcuts();
});

async function carregarNomeUsuario(user) {
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", user.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        let nome = snap.exists() && snap.data().nome ? snap.data().nome : (user.displayName || user.email.split('@')[0]);
        if (!user.displayName && nome) await window.fb_funcs.updateProfile(user, { displayName: nome });
        document.getElementById('userDisplay').innerHTML = `<span class="text-emerald-400">👤 ${nome}</span><span class="ml-2 text-[8px] opacity-50">● ONLINE</span>`;
        showToast(`Bem-vindo, ${nome}!`, 'success');
    } catch (err) { console.error(err); }
}

async function handleLogin() {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    if (!email || !pass) return showToast('Preencha e-mail e senha', 'error');
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, email, pass); } catch (err) { showToast('Erro no login', 'error'); }
}

async function handleSignup() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const pass = document.getElementById('cadastroPass').value;
    if (!nome) return showToast('Digite seu nome', 'error');
    if (pass.length < 6) return showToast('Senha deve ter 6+ caracteres', 'error');
    try {
        const userCred = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, email, pass);
        await window.fb_funcs.updateProfile(userCred.user, { displayName: nome });
        
        // Cria o documento do novo usuário com dados PADRÃO (não copia do usuário atual)
        const novoDoc = {
            ...dadosPadrao,          // usa os padrões limpos
            nome: nome,
            email: email,
            criadoEm: new Date().toISOString()
        };
        const docRef = window.fb_funcs.doc(window.db, "users", userCred.user.uid);
        await window.fb_funcs.setDoc(docRef, novoDoc);
        
        showToast('Cadastro realizado!', 'success');
        mostrarLogin();
    } catch (err) { showToast('Erro ao cadastrar', 'error'); }
}

function handleLogout() {
    // Limpa os dados em memória antes de sair
    dados = JSON.parse(JSON.stringify(dadosPadrao));
    window.fb_funcs.signOut(window.auth);
    showToast('Até logo!', 'info');
}

// ==================== SINC. NUVEM ====================
async function loadFromCloud() {
    if (!currentUser) return;
    showLoading(true);
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        if (snap.exists()) {
            const d = snap.data();
            dados.transacoes = d.transacoes || [];
            dados.investimentosMP = d.investimentosMP || [];
            dados.categorias = d.categorias || dadosPadrao.categorias;
            dados.metodos = d.metodos || dadosPadrao.metodos;
            render();
        } else {
            // Se não existir, cria com dados padrão
            await syncToCloud();
        }
    } catch (err) { console.error(err); } finally { showLoading(false); }
}

async function syncToCloud() {
    if (!currentUser) return;
    const btn = document.getElementById('btnSave');
    if (btn) btn.classList.add('loading-btn');
    try {
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", currentUser.uid), dados);
        render();
        showToast('Dados salvos ☁️', 'success');
    } catch (err) { showToast('Erro ao salvar', 'error'); } finally { if (btn) btn.classList.remove('loading-btn'); }
}

// ... (restante do código permanece igual, apenas as funções de autenticação foram alteradas)
