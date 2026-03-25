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
        setTimeout(() => renderInvestimentosMP(), 100);
    }
}

window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            carregarNomeUsuario(user);
            loadFromCloud();
        } else {
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
        const novoDoc = { ...dadosPadrao, nome: nome, email: email, criadoEm: new Date().toISOString() };
        const docRef = window.fb_funcs.doc(window.db, "users", userCred.user.uid);
        await window.fb_funcs.setDoc(docRef, novoDoc);
        showToast('Cadastro realizado!', 'success');
        mostrarLogin();
    } catch (err) { showToast('Erro ao cadastrar', 'error'); }
}

function handleLogout() {
    dados = JSON.parse(JSON.stringify(dadosPadrao));
    window.fb_funcs.signOut(window.auth);
    showToast('Até logo!', 'info');
}

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
            dados.tiposInvestimento = d.tiposInvestimento || dadosPadrao.tiposInvestimento;
            updateSelects();
            if (activeTab === 'transacoes') renderTransacoes();
            else renderInvestimentosMP();
        } else {
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
        if (activeTab === 'transacoes') renderTransacoes();
        else renderInvestimentosMP();
        showToast('Dados salvos ☁️', 'success');
    } catch (err) { showToast('Erro ao salvar', 'error'); } finally { if (btn) btn.classList.remove('loading-btn'); }
}

function showLoading(show) {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'fixed top-0 left-0 w-full h-1 bg-emerald-500 transform transition-transform duration-300 z-50';
        loader.style.transform = 'translateX(-100%)';
        document.body.appendChild(loader);
    }
    loader.style.transform = show ? 'translateX(0)' : 'translateX(-100%)';
}

function updateSelects() {
    const updateSelect = (id, list) => {
        const el = document.getElementById(id);
        if (el) {
            const val = el.value;
            el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
            if (list.includes(val)) el.value = val;
        }
    };
    updateSelect('inCat', dados.categorias);
    updateSelect('inMeth', dados.metodos);
    updateSelect('inTipoInvestMP', dados.tiposInvestimento);
}

async function addItemLista(tipo, inputId) {
    const input = document.getElementById(inputId);
    const valor = input.value.trim().toUpperCase();
    if (!valor) return showToast('Digite um valor', 'error');
    if (dados[tipo].includes(valor)) return showToast('Item já existe', 'error');
    dados[tipo].push(valor);
    input.value = '';
    await syncToCloud();
    showToast(`${tipo === 'categorias' ? 'Categoria' : 'Método'} adicionado`, 'success');
}

function adicionar() {
    const editId = document.getElementById('editId').value;
    const desc = document.getElementById('inDesc').value.trim();
    const val = parseFloat(document.getElementById('inVal').value);
    const tipo = document.getElementById('inType').value;
    const cat = document.getElementById('inCat').value;
    const met = document.getElementById('inMeth').value;
    const mesNome = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);
    if (!desc || desc.length < 3) return showToast('Descrição deve ter 3+ caracteres', 'error');
    if (isNaN(val) || val <= 0) return showToast('Valor inválido', 'error');
    if (!cat || !met) return showToast('Selecione categoria e método', 'error');

    if (editId) {
        const idx = dados.transacoes.findIndex(t => String(t.id) === String(editId));
        if (idx !== -1) {
            dados.transacoes[idx] = { ...dados.transacoes[idx], tipo, desc, valor: val, categoria: cat, metodo: met, mesIdx: MESES.indexOf(mesNome), ano };
            showToast('Atualizado', 'success');
            resetForm();
            syncToCloud();
        }
    } else {
        const parc = parseInt(document.getElementById('inParc').value) || 1;
        if (parc > 24) return showToast('Máx 24 parcelas', 'error');
        const startIdx = MESES.indexOf(mesNome);
        for (let i = 0; i < parc; i++) {
            const curIdx = startIdx + i;
            dados.transacoes.push({
                id: Date.now() + i + Math.random().toString(36).substr(2, 9),
                tipo, desc, valor: val / parc, categoria: cat, metodo: met,
                parc: parc > 1 ? `${i+1}/${parc}` : '', parcTotal: parc > 1 ? parc : null,
                parcAtual: parc > 1 ? i+1 : null, descOriginal: parc > 1 ? desc : null,
                mesIdx: curIdx % 12, ano: ano + Math.floor(curIdx / 12), pago: false, criadoEm: new Date().toISOString()
            });
        }
        document.getElementById('inDesc').value = '';
        document.getElementById('inVal').value = '';
        document.getElementById('inParc').value = '';
        showToast(`${parc} registro(s) adicionado(s)`, 'success');
        syncToCloud();
    }
}

function excluir(id) {
    if (confirm("Excluir este registro?")) {
        dados.transacoes = dados.transacoes.filter(t => String(t.id) !== String(id));
        syncToCloud();
        showToast('Excluído', 'success');
    }
}
function togglePago(id) {
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (t) { t.pago = !t.pago; syncToCloud(); showToast(t.pago ? '✅ Pago' : '⏳ Pendente', 'info'); }
}
function excluirTodasParcelas(descOriginal, parcTotal) {
    const toDelete = dados.transacoes.filter(t => t.descOriginal === descOriginal && t.parcTotal === parcTotal);
    if (toDelete.length === 0) return;
    if (confirm(`Excluir TODAS as ${toDelete.length} parcelas da despesa "${descOriginal}"?`)) {
        dados.transacoes = dados.transacoes.filter(t => !(t.descOriginal === descOriginal && t.parcTotal === parcTotal));
        syncToCloud();
        showToast(`${toDelete.length} parcelas excluídas`, 'success');
    }
}

function renderTransacoes() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const search = filtroBusca.toLowerCase();
    let filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);
    if (search) filtrados = filtrados.filter(t => t.desc.toLowerCase().includes(search) || t.categoria.toLowerCase().includes(search) || t.metodo.toLowerCase().includes(search));
    const receitas = filtrados.filter(t => t.tipo === 'income');
    const despesas = filtrados.filter(t => t.tipo === 'expense');
    const inc = receitas.reduce((s, t) => s + t.valor, 0);
    const exp = despesas.reduce((s, t) => s + t.valor, 0);
    const saldo = inc - exp;
    document.getElementById('totalBalance').innerText = saldo.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    document.getElementById('totalBalance').className = `text-4xl font-black ${saldo>0?'text-emerald-500':saldo<0?'text-rose-500':'text-slate-900 dark:text-white'}`;
    document.getElementById('totalReceitas').innerText = inc.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    document.getElementById('totalDespesas').innerText = exp.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    document.getElementById('contadorRegistros').innerText = filtrados.length;
    const tbody = document.getElementById('tableBody');
    if (filtrados.length === 0) {
        tbody.innerHTML = 'stein<td colspan="5" class="text-center py-12 opacity-50">📭 Nenhuma transação encontrada<\/td>stein';
        return;
    }
    let html = '';
    let gruposParcelas = {};
    if (receitas.length) {
        html += `<tr class="bg-emerald-50 dark:bg-emerald-900/20"><td colspan="5" class="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">💰 RECEITAS<\/td><\/tr>`;
        receitas.forEach(t => {
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
            html += `<tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 px-2 w-8"><button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}"><\/button><\/td>
                <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')"><div class="font-bold">${t.desc} ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}<\/div><div class="text-[8px] text-emerald-600">${t.metodo} • ${t.categoria}<\/div><\/td>
                <td class="text-right font-black text-emerald-500">${t.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}<\/td>
                <td class="text-right px-2">${chaveGrupo && !gruposParcelas[chaveGrupo] ? `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" class="text-slate-300 hover:text-amber-500 mr-2">📦<\/button>` : ''}<button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕<\/button><\/td>
              <\/tr>`;
            if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
        });
    }
    if (despesas.length) {
        html += `<tr class="bg-rose-50 dark:bg-rose-900/20"><td colspan="5" class="py-2 px-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">📉 DESPESAS<\/td><\/tr>`;
        gruposParcelas = {};
        despesas.forEach(t => {
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
            html += `<tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 px-2 w-8"><button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}"><\/button><\/td>
                <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')"><div class="font-bold">${t.desc} ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}<\/div><div class="text-[8px] text-rose-500">${t.metodo} • ${t.categoria}<\/div><\/td>
                <td class="text-right font-black text-rose-500">${t.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}<\/td>
                <td class="text-right px-2">${chaveGrupo && !gruposParcelas[chaveGrupo] ? `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" class="text-slate-300 hover:text-amber-500 mr-2">📦<\/button>` : ''}<button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕<\/button><\/td>
              <\/tr>`;
            if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
        });
    }
    tbody.innerHTML = html;
}

// ==================== FUNÇÕES DE INVESTIMENTO ====================

// Função auxiliar para criar data sem fuso horário
function criarDataSemFuso(ano, mes, dia) {
    return new Date(ano, mes, dia);
}

// Função para formatar data YYYY-MM-DD sem fuso
function formatarDataLocal(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Função para calcular alíquota do IOF (regressivo para CDB)
function calcularIOF(diasDecorridos) {
    // IOF regressivo: 96% no primeiro dia, reduz 4% ao dia
    // Após 30 dias, IOF = 0%
    if (diasDecorridos <= 0) return 0;
    if (diasDecorridos >= 30) return 0;
    
    // Para dias entre 1 e 29
    // Fórmula: 96 - (dias - 1) * 4
    const aliquotaPercentual = Math.max(0, 96 - (diasDecorridos - 1) * 4);
    return aliquotaPercentual / 100;
}

// Função para calcular alíquota do Imposto de Renda (regressivo)
function calcularIR(diasDecorridos) {
    // IR regressivo para investimentos de renda fixa
    // Até 180 dias: 22.5%
    // 181 a 360 dias: 20%
    // 361 a 720 dias: 17.5%
    // Acima de 720 dias: 15%
    if (diasDecorridos <= 180) return 0.225;
    if (diasDecorridos <= 360) return 0.20;
    if (diasDecorridos <= 720) return 0.175;
    return 0.15;
}

// Função de cálculo completa igual ao Mercado Pago
function calcularRendimentoMPCompleto(valorAplicado, rendimentoPercentual, dataAplicacaoStr, dataVencimentoStr) {
    const [anoAplic, mesAplic, diaAplic] = dataAplicacaoStr.split('-').map(Number);
    const dataAplic = new Date(anoAplic, mesAplic - 1, diaAplic);
    
    const hoje = new Date();
    const hojeSemFuso = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    let dataVenc = null;
    if (dataVencimentoStr) {
        const [anoVenc, mesVenc, diaVenc] = dataVencimentoStr.split('-').map(Number);
        dataVenc = new Date(anoVenc, mesVenc - 1, diaVenc);
    }
    
    if (!dataVenc || hojeSemFuso <= dataAplic) {
        return {
            valorAplicado: valorAplicado,
            valorAtualBruto: valorAplicado,
            rendimentoBruto: 0,
            iof: 0,
            impostoRenda: 0,
            valorAtualLiquido: valorAplicado,
            rentabilidadeBruta: 0,
            rentabilidadeLiquida: 0,
            diasDecorridos: 0,
            diasTotais: 0,
            aliquotaIOF: 0,
            aliquotaIR: 0
        };
    }
    
    const diffTime = dataVenc - dataAplic;
    const diasTotais = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let diasDecorridos = 0;
    if (hojeSemFuso > dataAplic) {
        const diffDecorrido = hojeSemFuso - dataAplic;
        diasDecorridos = Math.min(Math.ceil(diffDecorrido / (1000 * 60 * 60 * 24)), diasTotais);
    }
    
    const cdiAnual = 0.1315;
    const cdiDiario = Math.pow(1 + cdiAnual, 1 / 252) - 1;
    const rendimentoDiario = cdiDiario * (rendimentoPercentual / 100);
    const fator = Math.pow(1 + rendimentoDiario, diasDecorridos);
    const valorAtualBruto = valorAplicado * fator;
    const rendimentoBruto = valorAtualBruto - valorAplicado;
    
    const aliquotaIOF = calcularIOF(diasDecorridos);
    let iof = rendimentoBruto * aliquotaIOF;
    iof = Math.max(0, iof);
    
    const rendimentoAposIOF = rendimentoBruto - iof;
    const aliquotaIR = calcularIR(diasDecorridos);
    const impostoRenda = rendimentoAposIOF * aliquotaIR;
    const valorAtualLiquido = valorAplicado + rendimentoBruto - iof - impostoRenda;
    const rentabilidadeBruta = (rendimentoBruto / valorAplicado) * 100;
    const rentabilidadeLiquida = ((valorAtualLiquido - valorAplicado) / valorAplicado) * 100;
    
    return {
        valorAplicado: valorAplicado,
        valorAtualBruto: valorAtualBruto,
        rendimentoBruto: rendimentoBruto,
        iof: iof,
        impostoRenda: impostoRenda,
        valorAtualLiquido: valorAtualLiquido,
        rentabilidadeBruta: rentabilidadeBruta,
        rentabilidadeLiquida: rentabilidadeLiquida,
        diasDecorridos: diasDecorridos,
        diasTotais: diasTotais,
        aliquotaIOF: aliquotaIOF * 100,
        aliquotaIR: aliquotaIR * 100
    };
}

// Função para adicionar investimento
function adicionarInvestimentoMP() {
    const editId = document.getElementById('editIdInvestMP').value;
    const nome = document.getElementById('inNomeInvest').value.trim();
    const tipo = document.getElementById('inTipoInvestMP').value;
    const valorAplicado = parseFloat(document.getElementById('inValorAplicado').value);
    const rendimentoPercentual = parseFloat(document.getElementById('inRendimentoPercentual').value);
    let dataAplicacao = document.getElementById('inDataAplicacao').value;
    let dataVencimento = document.getElementById('inDataVencimento').value;
    const resgate = document.getElementById('inResgate').value;
    const resgateImediato = document.getElementById('inResgateImediato').checked;
    const garantiaFGC = document.getElementById('inGarantiaFGC').checked;

    if (!nome || nome.length < 3) return showToast('Nome do investimento inválido', 'error');
    if (isNaN(valorAplicado) || valorAplicado <= 0) return showToast('Valor aplicado inválido', 'error');
    if (isNaN(rendimentoPercentual) || rendimentoPercentual <= 0) return showToast('Rendimento inválido', 'error');
    
    if (!dataAplicacao) {
        const hoje = new Date();
        dataAplicacao = formatarDataLocal(hoje);
    }

    const resultado = calcularRendimentoMPCompleto(valorAplicado, rendimentoPercentual, dataAplicacao, dataVencimento);

    const invest = {
        id: editId || (Date.now() + Math.random().toString(36).substr(2, 9)),
        nome: nome.toUpperCase(),
        tipo: tipo,
        valorAplicado: valorAplicado,
        valorAtualBruto: resultado.valorAtualBruto,
        valorAtualLiquido: resultado.valorAtualLiquido,
        rendimentoBruto: resultado.rendimentoBruto,
        iof: resultado.iof,
        impostoRenda: resultado.impostoRenda,
        rendimentoPercentual: rendimentoPercentual,
        dataAplicacao: dataAplicacao,
        dataVencimento: dataVencimento || null,
        resgate: resgate,
        resgateImediato: resgateImediato,
        garantiaFGC: garantiaFGC,
        rentabilidadeBruta: resultado.rentabilidadeBruta,
        rentabilidadeLiquida: resultado.rentabilidadeLiquida,
        diasDecorridos: resultado.diasDecorridos,
        diasTotais: resultado.diasTotais,
        aliquotaIOF: resultado.aliquotaIOF,
        aliquotaIR: resultado.aliquotaIR,
        criadoEm: new Date().toISOString(),
        ultimaAtualizacao: new Date().toISOString()
    };

    if (editId) {
        const idx = dados.investimentosMP.findIndex(t => String(t.id) === String(editId));
        if (idx !== -1) dados.investimentosMP[idx] = { ...dados.investimentosMP[idx], ...invest };
        showToast('Investimento atualizado', 'success');
    } else {
        dados.investimentosMP.push(invest);
        showToast('Investimento adicionado', 'success');
    }
    syncToCloud();
    fecharModalInvestimento();
    renderInvestimentosMP();
}

// Função para atualizar rendimentos diários
function atualizarRendimentosDiarios() {
    let atualizado = false;
    
    (dados.investimentosMP || []).forEach(inv => {
        if (inv.dataVencimento) {
            const resultado = calcularRendimentoMPCompleto(
                inv.valorAplicado, 
                inv.rendimentoPercentual, 
                inv.dataAplicacao, 
                inv.dataVencimento
            );
            
            if (Math.abs(resultado.valorAtualLiquido - inv.valorAtualLiquido) > 0.01) {
                inv.valorAtualBruto = resultado.valorAtualBruto;
                inv.valorAtualLiquido = resultado.valorAtualLiquido;
                inv.rendimentoBruto = resultado.rendimentoBruto;
                inv.iof = resultado.iof;
                inv.impostoRenda = resultado.impostoRenda;
                inv.rentabilidadeBruta = resultado.rentabilidadeBruta;
                inv.rentabilidadeLiquida = resultado.rentabilidadeLiquida;
                inv.diasDecorridos = resultado.diasDecorridos;
                inv.aliquotaIOF = resultado.aliquotaIOF;
                inv.aliquotaIR = resultado.aliquotaIR;
                inv.ultimaAtualizacao = new Date().toISOString();
                atualizado = true;
            }
        }
    });
    
    if (atualizado) {
        syncToCloud();
        renderInvestimentosMP();
        showToast('💰 Rendimentos atualizados!', 'success');
    }
}

// Função para renderizar investimentos
function renderInvestimentosMP() {
    const investimentos = dados.investimentosMP || [];
    
    const totalInvestido = investimentos.reduce((s, t) => s + t.valorAplicado, 0);
    const totalAtualLiquido = investimentos.reduce((s, t) => s + t.valorAtualLiquido, 0);
    const totalRendLiquido = totalAtualLiquido - totalInvestido;
    const rentTotal = totalInvestido > 0 ? (totalRendLiquido / totalInvestido) * 100 : 0;

    const totalInvestidoEl = document.getElementById('totalInvestidoMP');
    const totalAtualEl = document.getElementById('totalAtualMP');
    const totalRendimentoEl = document.getElementById('totalRendimentoMP');
    const rentabilidadeTotalEl = document.getElementById('rentabilidadeTotalMP');
    const contadorEl = document.getElementById('contadorInvestimentosMP');
    
    if (totalInvestidoEl) totalInvestidoEl.innerText = totalInvestido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalAtualEl) totalAtualEl.innerText = totalAtualLiquido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalRendimentoEl) {
        totalRendimentoEl.innerText = totalRendLiquido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
        totalRendimentoEl.className = `font-bold ${totalRendLiquido>=0?'text-emerald-500':'text-rose-500'}`;
    }
    if (rentabilidadeTotalEl) rentabilidadeTotalEl.innerHTML = `${rentTotal>=0?'+':''}${rentTotal.toFixed(2)}%`;
    if (contadorEl) contadorEl.innerText = investimentos.length;

    const tbody = document.getElementById('investTableBodyMP');
    if (!tbody) return;
    
    if (investimentos.length === 0) {
        tbody.innerHTML = 'stein<td colspan="5" class="text-center py-12 opacity-50">📈 Nenhum investimento cadastrado<\/td>stein';
        return;
    }
    
    tbody.innerHTML = investimentos.map(t => {
        const idSeguro = String(t.id).replace(/'/g, "\\'");
        
        const [anoAplic, mesAplic, diaAplic] = t.dataAplicacao.split('-').map(Number);
        const dataAplicFormatada = `${diaAplic.toString().padStart(2, '0')}/${mesAplic.toString().padStart(2, '0')}/${anoAplic}`;
        
        let dataVencFormatada = 'Sem vencimento';
        let diasRestantes = '';
        
        if (t.dataVencimento) {
            const [anoVenc, mesVenc, diaVenc] = t.dataVencimento.split('-').map(Number);
            dataVencFormatada = `${diaVenc.toString().padStart(2, '0')}/${mesVenc.toString().padStart(2, '0')}/${anoVenc}`;
            
            const hoje = new Date();
            const hojeSemFuso = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const dataVenc = new Date(anoVenc, mesVenc - 1, diaVenc);
            
            if (hojeSemFuso < dataVenc) {
                const diffDias = Math.ceil((dataVenc - hojeSemFuso) / (1000 * 60 * 60 * 24));
                diasRestantes = ` (${diffDias} dias restantes)`;
            }
        }
        
        const resgateInfo = t.resgateImediato ? '🔓 Resgate imediato' : `⏳ ${t.resgate || 'Prazo'}`;
        const rendColor = t.rentabilidadeLiquida >= 0 ? 'text-emerald-500' : 'text-rose-500';
        
        // Mostra o IOF apenas se for > 0
        const iofDisplay = t.aliquotaIOF > 0 ? `IOF: ${t.aliquotaIOF.toFixed(0)}% | ` : '';
        
        return `
        <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="prepararEdicaoInvestMP('${idSeguro}')">
            <td class="py-4 px-3">
                <div class="font-bold text-sm">${t.nome}</div>
                <div class="text-[10px] text-slate-400">${t.tipo} ${t.garantiaFGC ? '• ✓ FGC' : ''}</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="font-bold">${t.valorAtualLiquido.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="text-[10px] ${rendColor}">${t.rentabilidadeLiquida >= 0 ? '+' : ''}${t.rentabilidadeLiquida.toFixed(2)}%</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="text-xs font-medium text-emerald-500">${t.rendimentoPercentual}% do CDI</div>
                <div class="text-[9px] text-slate-400">${resgateInfo}</div>
                <div class="text-[8px] text-slate-500 mt-1">${iofDisplay}IR: ${t.aliquotaIR.toFixed(1)}%</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="text-[10px] text-slate-400">Aplic: ${dataAplicFormatada}</div>
                <div class="text-[10px] text-slate-400">Venc: ${dataVencFormatada}${diasRestantes}</div>
               <\/td>
            <td class="text-right px-2">
                <button onclick="event.stopPropagation(); excluirInvestimentoMP('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕<\/button>
               <\/td>
           <\/tr>`;
    }).join('');
}

function abrirModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        resetFormInvestMP();
    }
}

function fecharModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function resetFormInvestMP() {
    document.getElementById('editIdInvestMP').value = '';
    document.getElementById('inNomeInvest').value = '';
    document.getElementById('inTipoInvestMP').value = 'Renda Fixa';
    document.getElementById('inValorAplicado').value = '';
    document.getElementById('inRendimentoPercentual').value = '';
    
    const hoje = new Date();
    const dataAtual = formatarDataLocal(hoje);
    document.getElementById('inDataAplicacao').value = dataAtual;
    
    document.getElementById('inDataVencimento').value = '';
    document.getElementById('inResgate').value = '';
    document.getElementById('inResgateImediato').checked = false;
    document.getElementById('inGarantiaFGC').checked = true;
    document.getElementById('btnSaveInvestMP').innerText = '💾 SALVAR INVESTIMENTO';
    document.getElementById('btnCancelEditInvestMP').classList.add('hidden');
}

function prepararEdicaoInvestMP(id) {
    const t = dados.investimentosMP.find(x => String(x.id) === String(id));
    if (!t) return showToast('Erro ao carregar investimento', 'error');
    
    document.getElementById('editIdInvestMP').value = t.id;
    document.getElementById('inNomeInvest').value = t.nome;
    document.getElementById('inTipoInvestMP').value = t.tipo;
    document.getElementById('inValorAplicado').value = t.valorAplicado;
    document.getElementById('inRendimentoPercentual').value = t.rendimentoPercentual;
    document.getElementById('inDataAplicacao').value = t.dataAplicacao;
    document.getElementById('inDataVencimento').value = t.dataVencimento || '';
    document.getElementById('inResgate').value = t.resgate || '';
    document.getElementById('inResgateImediato').checked = t.resgateImediato || false;
    document.getElementById('inGarantiaFGC').checked = t.garantiaFGC !== false;
    document.getElementById('btnSaveInvestMP').innerText = '🔄 ATUALIZAR';
    document.getElementById('btnCancelEditInvestMP').classList.remove('hidden');
    abrirModalInvestimento();
}

function excluirInvestimentoMP(id) {
    if (confirm("Excluir este investimento?")) {
        dados.investimentosMP = dados.investimentosMP.filter(t => String(t.id) !== String(id));
        syncToCloud();
        renderInvestimentosMP();
        showToast('Investimento excluído', 'success');
    }
}

// ==================== FUNÇÕES GERAIS ====================

function render() {
    if (activeTab === 'transacoes') renderTransacoes();
    else renderInvestimentosMP();
    updateSelects();
}

function initDateFilters() {
    const now = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
            el.value = MESES[now.getMonth()];
        }
    });
    document.getElementById('fYear').value = document.getElementById('inYear').value = now.getFullYear();
    const dataCompra = document.getElementById('inDataAplicacao');
    if (dataCompra) dataCompra.value = formatarDataLocal(now);
}
function filtrarTabela(texto) { filtroBusca = texto; render(); }

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('inDesc').value = '';
    document.getElementById('inVal').value = '';
    document.getElementById('inParc').value = '';
    document.getElementById('inParc').disabled = false;
    document.getElementById('formTitle').innerText = "➕ NOVO REGISTRO";
    document.getElementById('btnSave').innerText = "💾 SALVAR NA NUVEM";
    document.getElementById('btnCancelEdit').classList.add('hidden');
    document.getElementById('inType').value = 'expense';
    const now = new Date();
    document.getElementById('inMonth').value = MESES[now.getMonth()];
    document.getElementById('inYear').value = now.getFullYear();
}
function prepararEdicao(id) {
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (!t) return showToast('Erro ao carregar', 'error');
    document.getElementById('editId').value = t.id;
    document.getElementById('inType').value = t.tipo;
    document.getElementById('inDesc').value = t.desc;
    document.getElementById('inVal').value = t.valor;
    document.getElementById('inParc').disabled = true;
    document.getElementById('inCat').value = t.categoria;
    document.getElementById('inMeth').value = t.metodo;
    document.getElementById('inMonth').value = MESES[t.mesIdx];
    document.getElementById('inYear').value = t.ano;
    document.getElementById('formTitle').innerText = "✏️ EDITANDO REGISTRO";
    document.getElementById('btnSave').innerText = "🔄 ATUALIZAR";
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('✏️ Modo edição ativado', 'info');
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (activeTab === 'transacoes') {
        const mes = document.getElementById('fMonth').value;
        const ano = document.getElementById('fYear').value;
        const mIdx = MESES.indexOf(mes);
        const transacoes = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === parseInt(ano));
        const receitas = transacoes.filter(t => t.tipo === 'income');
        const despesas = transacoes.filter(t => t.tipo === 'expense');
        const totalRec = receitas.reduce((s,t)=>s+t.valor,0);
        const totalDes = despesas.reduce((s,t)=>s+t.valor,0);
        doc.setFontSize(20); doc.setTextColor(0,150,100); doc.text('Relatório de Transações',20,20);
        doc.setFontSize(12); doc.setTextColor(100); doc.text(`${mes} ${ano}`,20,30);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('Resumo do Período',20,45);
        doc.autoTable({ startY:50, head:[['Descrição','Valor']], body:[['Total Receitas',`R$ ${totalRec.toFixed(2)}`],['Total Despesas',`R$ ${totalDes.toFixed(2)}`],['Saldo',`R$ ${(totalRec-totalDes).toFixed(2)}`]], theme:'striped', headStyles:{fillColor:[16,185,129]} });
        doc.text('Detalhamento',20,doc.lastAutoTable.finalY+15);
        doc.autoTable({ startY:doc.lastAutoTable.finalY+20, head:[['Descrição','Categoria','Método','Valor','Status']], body:transacoes.map(t=>[t.desc+(t.parc?` (${t.parc})`:''),t.categoria,t.metodo,`R$ ${t.valor.toFixed(2)}`,t.pago?'Pago':'Pendente']), theme:'striped', headStyles:{fillColor:[59,130,246]} });
        doc.save(`transacoes-${mes}-${ano}.pdf`);
    } else {
        const inv = dados.investimentosMP || [];
        const totalInv = inv.reduce((s,t)=>s+t.valorAplicado,0);
        const totalAtual = inv.reduce((s,t)=>s+t.valorAtualLiquido,0);
        const totalLucro = totalAtual - totalInv;
        const rent = totalInv>0?(totalLucro/totalInv)*100:0;
        doc.setFontSize(20); doc.setTextColor(0,150,100); doc.text('Relatório de Investimentos',20,20);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('Resumo da Carteira',20,35);
        doc.autoTable({ startY:40, head:[['Descrição','Valor']], body:[['Total Investido',`R$ ${totalInv.toFixed(2)}`],['Valor Atual',`R$ ${totalAtual.toFixed(2)}`],['Lucro/Prejuízo',`R$ ${totalLucro.toFixed(2)}`],['Rentabilidade',`${rent>=0?'+':''}${rent.toFixed(2)}%`]], theme:'striped', headStyles:{fillColor:[16,185,129]} });
        doc.text('Detalhamento',20,doc.lastAutoTable.finalY+15);
        doc.autoTable({ startY:doc.lastAutoTable.finalY+20, head:[['Ativo','Tipo','Corretora','Quant.','P.Médio','P.Atual','Total','Lucro','Rent.']], body:inv.map(t=>[t.nome,t.tipo,'Mercado Pago','1',`R$ ${t.valorAplicado.toFixed(2)}`,`R$ ${t.valorAtualLiquido.toFixed(2)}`,`R$ ${t.valorAtualLiquido.toFixed(2)}`,`R$ ${(t.valorAtualLiquido-t.valorAplicado).toFixed(2)}`,`${t.rentabilidadeLiquida>=0?'+':''}${t.rentabilidadeLiquida.toFixed(2)}%`]), theme:'striped', headStyles:{fillColor:[59,130,246]} });
        doc.save(`investimentos-${new Date().toISOString().split('T')[0]}.pdf`);
    }
    showToast('PDF gerado!', 'success');
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey||e.metaKey) && e.key === 'n') { e.preventDefault(); if(activeTab==='transacoes'){ resetForm(); document.getElementById('inDesc').focus(); } else { resetFormInvestMP(); document.getElementById('inNomeInvest').focus(); abrirModalInvestimento(); } showToast('Novo registro','info'); }
        if (e.key === 'Escape') { if(activeTab==='transacoes' && document.getElementById('editId').value) resetForm(); else if(activeTab!=='transacoes' && document.getElementById('editIdInvestMP').value) resetFormInvestMP(); showToast('Edição cancelada','info'); }
        if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); if(currentUser) syncToCloud(); }
        if (e.altKey && e.key === '1') { e.preventDefault(); mudarAba('transacoes'); }
        if (e.altKey && e.key === '2') { e.preventDefault(); mudarAba('investimentos'); }
    });
}

function iniciarAtualizacaoAutomatica() {
    setTimeout(() => atualizarRendimentosDiarios(), 1000);
    setInterval(atualizarRendimentosDiarios, 6*60*60*1000);
}

// Exportações para o HTML
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.toggleDarkMode = toggleDarkMode;
window.adicionar = adicionar;
window.excluir = excluir;
window.togglePago = togglePago;
window.prepararEdicao = prepararEdicao;
window.resetForm = resetForm;
window.render = render;
window.exportarPDF = exportarPDF;
window.filtrarTabela = filtrarTabela;
window.addItemLista = addItemLista;
window.mostrarCadastro = mostrarCadastro;
window.mostrarLogin = mostrarLogin;
window.mudarAba = mudarAba;
window.adicionarInvestimentoMP = adicionarInvestimentoMP;
window.atualizarRendimentosDiarios = atualizarRendimentosDiarios;
window.abrirModalInvestimento = abrirModalInvestimento;
window.fecharModalInvestimento = fecharModalInvestimento;
window.resetFormInvestMP = resetFormInvestMP;
window.prepararEdicaoInvestMP = prepararEdicaoInvestMP;
window.excluirInvestimentoMP = excluirInvestimentoMP;
window.excluirTodasParcelas = excluirTodasParcelas;

setTimeout(() => { if (currentUser) iniciarAtualizacaoAutomatica(); }, 2000);
