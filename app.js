const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
// Valores padrão caso o banco esteja vazio
let dados = { 
    transacoes: [], 
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER'], 
    metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX'] 
};

// --- TEMA ---
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- LOGIN ---
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('userDisplay').innerText = user.email;
            loadFromCloud();
        } else {
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
        }
    });
    initDateFilters();
});

async function handleLogin() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); }
    catch (err) { alert("Erro de login."); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// --- NUVEM (Ajustado para sincronizar categorias e métodos) ---
async function loadFromCloud() {
    if(!currentUser) return;
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        if (snap.exists()) {
            const d = snap.data();
            // Sincroniza tudo que vier do banco
            dados.transacoes = d.transacoes || [];
            if(d.categorias && d.categorias.length > 0) dados.categorias = d.categorias;
            if(d.metodos && d.metodos.length > 0) dados.metodos = d.metodos;
            
            // Atualiza a interface
            render();
        }
    } catch (err) { console.error("Erro ao carregar nuvem:", err); }
}

async function syncToCloud() {
    if (!currentUser) return;
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    // Salva o objeto 'dados' completo (transações + listas)
    await window.fb_funcs.setDoc(docRef, dados);
    render();
}

// --- CATEGORIAS E MÉTODOS (Adicionar novo) ---
async function addItemLista(tipo, inputId) {
    const input = document.getElementById(inputId);
    const valor = input.value.trim().toUpperCase();
    if (valor && !dados[tipo].includes(valor)) {
        dados[tipo].push(valor);
        input.value = '';
        await syncToCloud(); // Salva a nova lista no Firebase
    }
}

// --- LÓGICA DE REGISTROS ---
function adicionar() {
    const editId = document.getElementById('editId').value;
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    
    if (!desc || isNaN(val)) return alert("Preencha descrição e valor.");

    if (editId) {
        const index = dados.transacoes.findIndex(t => t.id == editId);
        if (index !== -1) {
            dados.transacoes[index] = {
                ...dados.transacoes[index],
                tipo: document.getElementById('inType').value,
                desc, valor: val,
                categoria: document.getElementById('inCat').value,
                metodo: document.getElementById('inMeth').value,
                mesIdx: MESES.indexOf(document.getElementById('inMonth').value),
                ano: parseInt(document.getElementById('inYear').value)
            };
        }
        resetForm();
    } else {
        const parc = parseInt(document.getElementById('inParc').value) || 1;
        const startIdx = MESES.indexOf(document.getElementById('inMonth').value);
        const anoBase = parseInt(document.getElementById('inYear').value);

        for (let i = 0; i < parc; i++) {
            const curIdx = startIdx + i;
            dados.transacoes.push({
                id: Date.now() + i + Math.random(),
                tipo: document.getElementById('inType').value,
                desc, 
                valor: val / parc,
                categoria: document.getElementById('inCat').value,
                metodo: document.getElementById('inMeth').value,
                parc: parc > 1 ? `(${i + 1}/${parc})` : '',
                mesIdx: curIdx % 12,
                ano: anoBase + Math.floor(curIdx / 12),
                pago: false
            });
        }
        document.getElementById('inDesc').value = '';
        document.getElementById('inVal').value = '';
    }
    syncToCloud();
}

// --- RENDER (Atualiza os campos Select dinamicamente) ---
function render() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);

    // Saldo
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    // Tabela
    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="${t.pago ? 'opacity-30' : ''} border-b dark:border-slate-800">
            <td class="py-4 px-2 w-8">
                <button onclick="togglePago(${t.id})" class="w-5 h-5 rounded-full border-2 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}"></button>
            </td>
            <td class="py-4 cursor-pointer" onclick="prepararEdicao(${t.id})">
                <div class="font-bold text-sm dark:text-slate-200">${t.desc} <span class="text-[9px] opacity-40">${t.parc}</span></div>
                <div class="text-[8px] text-blue-500 font-bold uppercase">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-black ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right px-2">
                <button onclick="excluir(${t.id})" class="text-slate-300 hover:text-rose-500 text-xs">✕</button>
            </td>
        </tr>`).join('');

    // --- ATUALIZAÇÃO DOS SELECTS ---
    const updateSelect = (id, list) => {
        const el = document.getElementById(id);
        const valorAtual = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        // Mantém selecionado o que o usuário já tinha escolhido, se ainda existir na lista
        if(list.includes(valorAtual)) el.value = valorAtual;
    };
    updateSelect('inCat', dados.categorias);
    updateSelect('inMeth', dados.metodos);
}

function excluir(id) {
    if (confirm("Excluir?")) { dados.transacoes = dados.transacoes.filter(t => t.id !== id); syncToCloud(); }
}

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) { t.pago = !t.pago; syncToCloud(); }
}

function initDateFilters() {
    const now = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
        el.value = MESES[now.getMonth()];
    });
    document.getElementById('fYear').value = document.getElementById('inYear').value = now.getFullYear();
}

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('inDesc').value = '';
    document.getElementById('inVal').value = '';
    document.getElementById('inParc').value = '';
    document.getElementById('inParc').disabled = false;
    document.getElementById('formTitle').innerText = "Novo Registro";
    document.getElementById('btnSave').innerText = "Salvar na Nuvem";
}

function prepararEdicao(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (!t) return;
    document.getElementById('editId').value = t.id;
    document.getElementById('inType').value = t.tipo;
    document.getElementById('inDesc').value = t.desc;
    document.getElementById('inVal').value = t.valor;
    document.getElementById('inParc').disabled = true;
    document.getElementById('inCat').value = t.categoria;
    document.getElementById('inMeth').value = t.metodo;
    document.getElementById('inMonth').value = MESES[t.mesIdx];
    document.getElementById('inYear').value = t.ano;
    document.getElementById('formTitle').innerText = "Editando";
    document.getElementById('btnSave').innerText = "Atualizar";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
