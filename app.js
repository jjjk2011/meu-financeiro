const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let dados = { transacoes: [], categorias: ['ALIMENTAÇÃO', 'CONTAS'], metodos: ['DINHEIRO'] };

// LOGIN MONITOR
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

// AUTH FUNCTIONS
async function handleLogin() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); }
    catch (err) { alert("Erro ao entrar: " + err.message); }
}

async function handleSignup() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { 
        const res = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, e, p);
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", res.user.uid), dados);
    } catch (err) { alert("Erro ao cadastrar: " + err.message); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// CLOUD SYNC
async function loadFromCloud() {
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    const snap = await window.fb_funcs.getDoc(docRef);
    if (snap.exists()) { dados = snap.data(); render(); }
}

async function syncToCloud() {
    if (!currentUser) return;
    document.getElementById('btnSave').classList.add('loading');
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    await window.fb_funcs.setDoc(docRef, dados);
    document.getElementById('btnSave').classList.remove('loading');
    render();
}

// IMPORT JSON
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
                    valor: parseFloat(t.val) || 0,
                    categoria: (t.cat || 'GERAL').toUpperCase(),
                    metodo: (t.meth || 'DINHEIRO').toUpperCase(),
                    parc: t.label || '',
                    mesIdx: parseInt(t.mIdx),
                    ano: parseInt(t.year),
                    pago: t.pago || false
                }));
                if(json.myCats) dados.categorias = json.myCats.map(c => c.toUpperCase());
                if(json.myMeths) dados.metodos = json.myMeths.map(m => m.toUpperCase());
                await syncToCloud();
                alert("Importado!");
            }
        } catch (err) { alert("Erro no arquivo."); }
    };
    reader.readAsText(file);
}

// PDF EXPORT
function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const mes = document.getElementById('fMonth').value;
    const ano = document.getElementById('fYear').value;
    const filtrados = dados.transacoes.filter(t => t.mesIdx === MESES.indexOf(mes) && t.ano === parseInt(ano));

    doc.setFontSize(18);
    doc.text(`Relatório Financeiro - ${mes}/${ano}`, 14, 20);
    
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
    
    doc.setFontSize(10);
    doc.text(`Entradas: R$ ${inc.toFixed(2)} | Saídas: R$ ${exp.toFixed(2)} | Saldo: R$ ${(inc-exp).toFixed(2)}`, 14, 30);

    const linhas = filtrados.map(t => [t.pago ? "Sim" : "Não", t.desc, t.categoria, t.metodo, `R$ ${t.valor.toFixed(2)}`]);
    doc.autoTable({ startY: 40, head: [["Pago", "Descrição", "Cat", "Banco", "Valor"]], body: linhas, theme: 'grid' });
    doc.save(`financeiro_${mes}_${ano}.pdf`);
}

// APP LOGIC
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
    if (confirm("Excluir?")) {
        dados.transacoes = dados.transacoes.filter(x => x.id !== id);
        syncToCloud();
    }
}

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
    if (confirm(`Remover ${item}?`)) {
        dados[tipo] = dados[tipo].filter(i => i !== item);
        await syncToCloud();
    }
}

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
        <tr class="transition-all ${t.pago ? 'opacity-30' : ''}">
            <td class="py-4 text-center w-12">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400' : 'text-slate-800'}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="text-[8px] font-black text-blue-500 uppercase mt-1">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-black text-sm ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right"><button onclick="excluir(${t.id})" class="text-slate-200 hover:text-rose-500 px-2 font-bold text-lg">✕</button></td>
        </tr>`).join('');

    const renderTag = (item, tipo) => `<span class="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase border flex items-center gap-1">${item}<button onclick="removerItemLista('${tipo}', '${item}')" class="text-rose-400">✕</button></span>`;
    document.getElementById('catListUI').innerHTML = dados.categorias.map(c => renderTag(c, 'categorias')).join('');
    document.getElementById('methListUI').innerHTML = dados.metodos.map(m => renderTag(m, 'metodos')).join('');
    
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
