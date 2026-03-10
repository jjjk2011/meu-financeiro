const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let dados = { 
    transacoes: [], 
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'LAZER', 'SAÚDE', 'TRANSPORTE'], 
    metodos: ['DINHEIRO', 'MERCADO PAGO', 'CARTÃO'] 
};

// MONITOR DE LOGIN
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

// AUTENTICAÇÃO
async function handleLogin() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); }
    catch (err) { alert("Erro: " + err.message); }
}

async function handleSignup() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { 
        const res = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, e, p);
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", res.user.uid), dados);
    } catch (err) { alert("Erro: " + err.message); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// NUVEM: CARREGAR E SALVAR
async function loadFromCloud() {
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    const snap = await window.fb_funcs.getDoc(docRef);
    if (snap.exists()) {
        dados = snap.data();
        render();
    }
}

async function syncToCloud() {
    if (!currentUser) return;
    document.getElementById('btnSave').classList.add('loading');
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    await window.fb_funcs.setDoc(docRef, dados);
    document.getElementById('btnSave').classList.remove('loading');
    render();
}

// IMPORTAR BACKUP ANTIGO PARA A NUVEM
function importarParaNuvem(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = JSON.parse(e.target.result);
            // Converte o formato 'db' do seu backup antigo para o novo formato
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
                alert("Dados migrados para a nuvem com sucesso!");
            }
        } catch (err) { alert("Erro ao ler backup."); }
    };
    reader.readAsText(file);
}

// LÓGICA DE REGISTRO
function adicionar() {
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha tudo!");

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
            <td class="py-4 text-center w-10">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4 px-2">
                <div class="font-bold ${t.pago ? 'line-through text-slate-400' : ''}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="text-[8px] font-black text-blue-500 uppercase tracking-tighter">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-black ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right"><button onclick="excluir(${t.id})" class="text-slate-200 hover:text-rose-500 px-2 font-bold text-lg">✕</button></td>
        </tr>`).join('');

    document.getElementById('inCat').innerHTML = dados.categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('inMeth').innerHTML = dados.metodos.map(m => `<option value="${m}">${m}</option>`).join('');
}

function initDateFilters() {
    const now = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.innerHTML = '';
            MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
            el.value = MESES[now.getMonth()];
        }
    });
    document.getElementById('fYear').value = document.getElementById('inYear').value = now.getFullYear();
}
