const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let filtroBusca = '';
let toastTimeout = null;
let activeTab = 'transacoes';

const dadosPadrao = {
    transacoes: [],
    investimentosMP: [],
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER', 'TRANSPORTE', 'EDUCAÇÃO'],
    metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX', 'TRANSFERÊNCIA'],
    tiposInvestimento: ['RENDA FIXA', 'FUNDOS', 'AÇÕES'],
    corretoras: ['MERCADO PAGO', 'NU INVEST', 'XP INC']
};

let dados = JSON.parse(JSON.stringify(dadosPadrao));

// ==================== FUNÇÕES DE RENDERIZAÇÃO (Mantenha no topo) ====================

function render() {
    const corpo = document.getElementById('corpoTabela');
    if (!corpo) return;
    corpo.innerHTML = '';

    const filtradas = dados.transacoes.filter(t => 
        t.descricao.toLowerCase().includes(filtroBusca.toLowerCase()) ||
        t.categoria.toLowerCase().includes(filtroBusca.toLowerCase())
    );

    filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));

    filtradas.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer';
        tr.onclick = () => prepararEdicao(t.id);
        
        const valorClasse = t.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const prefixo = t.tipo === 'receita' ? '+' : '-';

        tr.innerHTML = `
            <td class="p-4 text-sm">${new Date(t.data).toLocaleDateString('pt-BR')}</td>
            <td class="p-4 text-sm font-medium">${t.descricao}</td>
            <td class="p-4 text-sm"><span class="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-[10px] font-bold">${t.categoria}</span></td>
            <td class="p-4 text-sm font-bold ${valorClasse}">${prefixo} R$ ${parseFloat(t.valor).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td class="p-4 text-center">
                <span class="status-badge ${t.pago ? 'pago' : 'pendente'}" onclick="event.stopPropagation(); togglePago('${t.id}')">
                    ${t.pago ? 'PAGO' : 'PENDENTE'}
                </span>
            </td>
        `;
        corpo.appendChild(tr);
    });
    atualizarCards();
}

function renderInvestimentosMP() {
    const corpo = document.getElementById('tabelaInvestimentosMP');
    if (!corpo) return;
    corpo.innerHTML = '';

    dados.investimentosMP.forEach(inv => {
        const rendimento = ((inv.precoAtual - inv.precoMedio) / inv.precoMedio) * 100;
        const total = inv.quantidade * inv.precoAtual;
        const corRendimento = rendimento >= 0 ? 'text-emerald-500' : 'text-rose-500';

        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors';
        tr.innerHTML = `
            <td class="p-3 text-sm font-bold">${inv.ativo}</td>
            <td class="p-3 text-sm text-gray-500 dark:text-slate-400">${inv.corretora}</td>
            <td class="p-3 text-sm font-medium text-right">${inv.quantidade}</td>
            <td class="p-3 text-sm font-medium text-right">R$ ${inv.precoMedio.toFixed(2)}</td>
            <td class="p-3 text-sm font-bold text-right">R$ ${inv.precoAtual.toFixed(2)}</td>
            <td class="p-3 text-sm font-bold text-right ${corRendimento}">${rendimento.toFixed(2)}%</td>
            <td class="p-3 text-sm font-bold text-right">R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
            <td class="p-3 text-right">
                <button onclick="prepararEdicaoInvestMP('${inv.id}')" class="p-1 hover:text-blue-500"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                <button onclick="excluirInvestimentoMP('${inv.id}')" class="p-1 hover:text-rose-500 ml-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </td>
        `;
        corpo.appendChild(tr);
    });
}

// ==================== NÚCLEO DO FIREBASE ====================

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
            
            // Força a renderização inicial de ambas as abas
            render();
            renderInvestimentosMP();
            console.log("✅ Dados carregados e tabelas atualizadas");
        } else {
            // Se for usuário novo, cria o documento inicial
            await window.fb_funcs.setDoc(docRef, dadosPadrao);
            render();
            renderInvestimentosMP();
        }
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        showToast("Erro ao sincronizar dados", "error");
    } finally {
        showLoading(false);
    }
}

// ==================== GESTÃO DE ABAS ====================

function mudarAba(aba) {
    activeTab = aba;
    const tabTrans = document.getElementById('tabTransacoes');
    const tabInv = document.getElementById('tabInvestimentos');
    const areaTrans = document.getElementById('areaTransacoes');
    const areaInv = document.getElementById('areaInvestimentos');

    // Reset visual
    [tabTrans, tabInv].forEach(t => t.className = 'px-6 py-2 rounded-lg font-bold transition-all duration-300 text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800');

    if (aba === 'transacoes') {
        tabTrans.classList.add('bg-emerald-600', 'text-white');
        areaTrans.style.display = 'block';
        areaInv.style.display = 'none';
        render();
    } else {
        tabInv.classList.add('bg-emerald-600', 'text-white');
        areaTrans.style.display = 'none';
        areaInv.style.display = 'block';
        renderInvestimentosMP();
    }
}

// ==================== RESTANTE DAS FUNÇÕES (Auxiliares) ====================

function showToast(msg, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    const bg = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';
    toast.className = `fixed bottom-4 right-4 ${bg} text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-bounce-short`;
    toast.innerText = msg;
    toastTimeout = setTimeout(() => toast.remove(), 3000);
}

function showLoading(show) {
    const btn = document.getElementById('btnSalvar');
    if (btn) show ? btn.classList.add('loading-btn') : btn.classList.remove('loading-btn');
}

// Verifique se o seu index.html chama o onAuthStateChanged corretamente para setar o currentUser
window.onAuthSuccess = (user) => {
    currentUser = user;
    loadFromCloud();
};

// Exponha as funções para o HTML
window.mudarAba = mudarAba;
window.renderInvestimentosMP = renderInvestimentosMP;
window.render = render;
window.loadFromCloud = loadFromCloud;
