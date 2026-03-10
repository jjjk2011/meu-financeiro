const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let dados = { 
    transacoes: [], 
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'LAZER'], 
    metodos: ['DINHEIRO', 'MERCADO PAGO'] 
};

// --- MONITOR DE AUTENTICAÇÃO ---
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('userDisplay').innerText = `Usuário: ${user.email}`;
            loadFromCloud();
        } else {
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
        }
    });
    initDateFilters();
});

// --- FUNÇÕES DE LOGIN/LOGOUT ---
async function handleLogin() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    if(!e || !p) return alert("Preencha e-mail e senha.");
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); }
    catch (err) { alert("Erro ao entrar: " + err.message); }
}

async function handleSignup() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    if(!e || !p) return alert("Preencha e-mail e senha.");
    try { 
        const res = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, e, p);
        // Cria o documento inicial vazio para o novo usuário
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", res.user.uid), dados);
    } catch (err) { alert("Erro ao cadastrar: " + err.message); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// --- NUVEM: CARREGAR E SINCRONIZAR ---
async function loadFromCloud() {
    if (!currentUser) return;
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        if (snap.exists()) {
            dados = snap.data();
            render();
        }
    } catch (err) { console.error("Erro ao carregar:", err); }
}

async function syncToCloud() {
    if (!currentUser) return;
    document.getElementById('btnSave').classList.add('loading');
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        await window.fb_funcs.setDoc(docRef, dados);
    } catch (err) { alert("Erro ao salvar na nuvem: " + err.message); }
    document.getElementById('btnSave').classList.remove('loading');
    render();
}

// --- IMPORTAÇÃO DO BACKUP JSON ---
function importarParaNuvem(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (json.db) {
                dados.transacoes = json.db.map(t => ({
                    id: t.id || Math.random(),
                    tipo: t.type,
                    desc: t.desc,
                    valor: t.val || 0,
                    categoria: (t.cat || 'GERAL').toUpperCase(),
                    metodo: (t.meth || 'DINHEIRO').toUpperCase(),
                    parc: t.label || '',
                    mesIdx: t.mIdx,
                    ano: t.year,
                    pago: t.pago || false
                }));
                if(json.myCats) dados.categorias = json.myCats.map(c => c.toUpperCase());
                if(json.myMeths) dados.metodos = json.myMeths.map(m => m.toUpperCase());
                
                await syncToCloud();
                alert("Backup importado com sucesso para a nuvem!");
            }
        } catch (err) { alert("Arquivo JSON inválido."); }
    };
    reader.readAsText(file);
}

// --- GESTÃO DE LANÇAMENTOS ---
function adicionar() {
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha Descrição e Valor!");

    const startIdx = MESES.indexOf(mes);
    for (let i = 0; i < parc; i++) {
        const curIdx = startIdx + i;
        dados.transacoes.push({
            id: Date.now() + i + Math.random(),
            tipo: document.getElementById('inType').value,
            desc, valor: val / parc,
            categoria: document.getElementById('inCat').value,
            metodo: document.getElementById('inMeth').value,
            parc: parc > 1 ? `(${i + 1}/${parc})` : '',
            mesIdx: curIdx % 12,
            ano: ano + Math.floor(curIdx / 12),
            pago: false
        });
    }
    syncToCloud();
    document.getElementById('inDesc').value = '';
    document.getElementById('inVal').value = '';
}

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) t.pago = !t.pago;
    syncToCloud();
}

function excluir(id) {
    if (confirm("Excluir este lançamento permanentemente?")) {
        dados.transacoes = dados.transacoes.filter(x => x.id !== id);
        syncToCloud();
    }
}

// --- GESTÃO DINÂMICA DE LISTAS ---
async function addItemLista(tipo, inputId) {
    const input = document.getElementById(inputId);
    const valor = input.value.trim().toUpperCase();
    if (valor && !dados[tipo].includes(valor)) {
        dados[tipo].push(valor);
        input.value = '';
        await syncToCloud();
    }
}

async function removerItemLista(tipo, item) {
    if (confirm(`Remover "${item}" das opções?`)) {
        dados[tipo] = dados[tipo].filter(i => i !== item);
        await syncToCloud();
    }
}

// --- RENDERIZAÇÃO DA INTERFACE ---
function render() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);

    // Cálculos de Saldo
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);

    document.getElementById('totalIncome').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpense').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    // Histórico de Tabela
    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="transition-all ${t.pago ? 'opacity-30' : ''}">
            <td class="py-4 text-center">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400' : 'text-slate-800'}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="flex gap-2 mt-1">
                    <span class="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded uppercase">${t.metodo}</span>
                    <span class="text-[7px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">${t.categoria}</span>
                </div>
            </td>
            <td class="text-right font-black text-sm ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right">
                <button onclick="excluir(${t.id})" class="text-slate-200 hover:text-rose-500 transition px-2 text-lg font-bold">✕</button>
            </td>
        </tr>`).join('');

    // Tags de Gestão (Categorias e Métodos)
    const renderTag = (item, tipo) => `
        <span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black border border-slate-200 uppercase">
            ${item}
            <button onclick="removerItemLista('${tipo}', '${item}')" class="text-rose-400 hover:text-rose-600">✕</button>
        </span>`;

    document.getElementById('catListUI').innerHTML = dados.categorias.map(c => renderTag(c, 'categorias')).join('');
    document.getElementById('methListUI').innerHTML = dados.metodos.map(m => renderTag(m, 'metodos')).join('');
    
    // Atualizar Selects
    const fillSelect = (id, list) => {
        const el = document.getElementById(id);
        const atual = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        if(list.includes(atual)) el.value = atual;
    };
    fillSelect('inCat', dados.categorias);
    fillSelect('inMeth', dados.metodos);
}

function initDateFilters() {
    const now = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
        el.value = MESES[now.getMonth()];
    });
    document.getElementById('fYear').value = document.getElementById('inYear').value = now.getFullYear();
}
