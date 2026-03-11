const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let dados = { transacoes: [], categorias: ['ALIMENTAÇÃO', 'CONTAS'], metodos: ['DINHEIRO'] };

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
    catch (err) { alert("Ative E-mail/Senha no console do Firebase!"); }
}

async function handleSignup() {
    const e = document.getElementById('authEmail').value;
    const p = document.getElementById('authPass').value;
    try { 
        const res = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, e, p);
        await window.fb_funcs.setDoc(window.fb_funcs.doc(window.db, "users", res.user.uid), dados);
    } catch (err) { alert("Erro ao cadastrar."); }
}

function handleLogout() { window.fb_funcs.signOut(window.auth); }

// --- DADOS ---
async function loadFromCloud() {
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    const snap = await window.fb_funcs.getDoc(docRef);
    if (snap.exists()) { dados = snap.data(); render(); }
}

async function syncToCloud() {
    if (!currentUser) return;
    const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
    await window.fb_funcs.setDoc(docRef, dados);
    render();
}

// --- LÓGICA DE EXCLUSÃO (INDIVIDUAL) ---
function excluir(id) {
    if (confirm("Deseja apagar apenas esta parcela?")) {
        // Remove apenas o item que tem o ID exato clicado
        dados.transacoes = dados.transacoes.filter(t => t.id !== id);
        syncToCloud();
    }
}

function adicionar() {
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return;

    const startIdx = MESES.indexOf(mes);
    for (let i = 0; i < parc; i++) {
        const curIdx = startIdx + i;
        dados.transacoes.push({
            id: Date.now() + i + Math.random(), // Gera um ID único para cada parcela
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
}

function render() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);

    // Totais
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="${t.pago ? 'opacity-30' : ''}">
            <td class="py-4 px-2">
                <div class="font-bold text-sm dark:text-slate-200">${t.desc} <span class="text-[9px] opacity-50">${t.parc}</span></div>
                <div class="text-[8px] text-blue-500 uppercase">${t.metodo}</div>
            </td>
            <td class="text-right font-bold ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right">
                <button onclick="excluir(${t.id})" class="text-slate-300 hover:text-rose-500 font-bold px-2">✕</button>
            </td>
        </tr>`).join('');
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
