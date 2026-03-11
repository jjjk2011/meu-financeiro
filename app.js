const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let dados = { transacoes: [], categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER'], metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX'] };

// --- TEMA ---
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- CONTROLE DE LOGIN ---
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('userDisplay').innerText = user.email;
            loadFromCloud();
        } else {
            currentUser = null;
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
        }
    });
    initDateFilters();
});

async function handleLogin() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    if(!e || !p) return alert("Digite e-mail e senha.");
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); }
    catch (err) { alert("Erro: Verifique se ativou 'E-mail/Senha' no Firebase."); }
}

async function handleSignup() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    if(!e || !p) return alert("Digite e-mail e senha.");
    try { 
        const res = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, e, p);
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", res.user.uid), dados);
    } catch (err) { alert("Erro ao criar conta."); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// --- NUVEM ---
async function loadFromCloud() {
    if(!currentUser) return;
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        if (snap.exists()) {
            const cloudData = snap.data();
            dados.transacoes = cloudData.transacoes || [];
            if(cloudData.categorias) dados.categorias = cloudData.categorias;
            if(cloudData.metodos) dados.metodos = cloudData.metodos;
            render();
        }
    } catch (err) { console.error("Erro ao ler banco:", err); }
}

async function syncToCloud() {
    if (!currentUser) return;
    document.getElementById('btnSave').classList.add('loading-btn');
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        await window.fb_funcs.setDoc(docRef, dados);
    } catch (err) { alert("Erro de permissão no banco de dados."); }
    document.getElementById('btnSave').classList.remove('loading-btn');
    render();
}

// --- LÓGICA DE REGISTROS ---
function adicionar() {
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha descrição e valor.");

    const startIdx = MESES.indexOf(mes);
    for (let i = 0; i < parc; i++) {
        const curIdx = startIdx + i;
        dados.transacoes.push({
            id: Date.now() + i + Math.random(), // ID único para cada parcela
            tipo: document.getElementById('inType').value,
            desc, 
            valor: val / parc,
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

function excluir(id) {
    if (confirm("Apagar esta parcela específica?")) {
        dados.transacoes = dados.transacoes.filter(t => t.id !== id);
        syncToCloud();
    }
}

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) {
        t.pago = !t.pago;
        syncToCloud();
    }
}

// --- IMPORTAÇÃO ---
function importarParaNuvem(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (json && json.db) {
                const novas = json.db.map(t => ({
                    id: t.id || Math.random(),
                    tipo: t.type,
                    desc: t.desc,
                    valor: parseFloat(t.val) || 0,
                    categoria: (t.cat || 'GERAL').toUpperCase(),
                    metodo: (t.meth || 'DINHEIRO').toUpperCase(),
                    parc: t.label || '',
                    mesIdx: parseInt(t.mIdx) || 0,
                    ano: parseInt(t.year) || 2026,
                    pago: t.pago || false
                }));
                dados.transacoes = [...dados.transacoes, ...novas];
                await syncToCloud();
                alert("Importado!");
            }
        } catch (err) { alert("Erro no JSON."); }
    };
    reader.readAsText(file);
}

// --- PDF ---
function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const mes = document.getElementById('fMonth').value;
    const ano = document.getElementById('fYear').value;
    const filtrados = dados.transacoes.filter(t => t.mesIdx === MESES.indexOf(mes) && t.ano === parseInt(ano));

    doc.text(`Relatório - ${mes}/${ano}`, 14, 20);
    const linhas = filtrados.map(t => [t.pago ? "OK" : "..", t.desc, t.categoria, `R$ ${t.valor.toFixed(2)}`]);
    doc.autoTable({ startY: 30, head: [["Status", "Descrição", "Cat", "Valor"]], body: linhas });
    doc.save(`financeiro_${mes}.pdf`);
}

// --- RENDER ---
function render() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);

    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);

    document.getElementById('totalIncome').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpense').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="${t.pago ? 'opacity-30' : ''} border-b dark:border-slate-800">
            <td class="py-4 px-2 w-10">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm dark:text-slate-200">${t.desc} <span class="text-[9px] opacity-40">${t.parc}</span></div>
                <div class="text-[8px] text-blue-500 font-bold uppercase">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-black ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right">
                <button onclick="excluir(${t.id})" class="text-slate-300 hover:text-rose-500 px-2 font-bold">✕</button>
            </td>
        </tr>`).join('');

    const fillSelect = (id, list) => {
        const el = document.getElementById(id);
        const val = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        if(list.includes(val)) el.value = val;
    };
    fillSelect('inCat', dados.categorias);
    fillSelect('inMeth', dados.metodos);
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
