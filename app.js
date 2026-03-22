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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 opacity-50">📭 Nenhuma transação encontrada</td></tr>';
        return;
    }
    let html = '';
    let gruposParcelas = {};
    if (receitas.length) {
        html += `<tr class="bg-emerald-50 dark:bg-emerald-900/20"><td colspan="5" class="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">💰 RECEITAS</td></tr>`;
        receitas.forEach(t => {
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
            html += `<tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 px-2 w-8"><button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}"></button></td>
                <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')"><div class="font-bold">${t.desc} ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}</div><div class="text-[8px] text-emerald-600">${t.metodo} • ${t.categoria}</div></td>
                <td class="text-right font-black text-emerald-500">${t.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td class="text-right px-2">${chaveGrupo && !gruposParcelas[chaveGrupo] ? `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" class="text-slate-300 hover:text-amber-500 mr-2">📦</button>` : ''}<button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕</button></td>
             </tr>`;
            if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
        });
    }
    if (despesas.length) {
        html += `<tr class="bg-rose-50 dark:bg-rose-900/20"><td colspan="5" class="py-2 px-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">📉 DESPESAS</td></tr>`;
        gruposParcelas = {};
        despesas.forEach(t => {
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
            html += `<tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 px-2 w-8"><button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}"></button></td>
                <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')"><div class="font-bold">${t.desc} ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}</div><div class="text-[8px] text-rose-500">${t.metodo} • ${t.categoria}</div></td>
                <td class="text-right font-black text-rose-500">${t.valor.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</td>
                <td class="text-right px-2">${chaveGrupo && !gruposParcelas[chaveGrupo] ? `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" class="text-slate-300 hover:text-amber-500 mr-2">📦</button>` : ''}<button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕</button></td>
             </tr>`;
            if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
        });
    }
    tbody.innerHTML = html;
}

function calcularRendimentoMP(valorAplicado, rendimentoPercentual, dataAplicacao, dataVencimento) {
    const hoje = new Date();
    const dataAplic = new Date(dataAplicacao);
    const dataVenc = dataVencimento ? new Date(dataVencimento) : null;
    
    // Se não tem vencimento ou já venceu, retorna o valor aplicado
    if (!dataVenc || hoje <= dataAplic) {
        return { valorAtual: valorAplicado, rentabilidadeAtual: 0, diasDecorridos: 0 };
    }
    
    // Calcula dias corridos desde a aplicação
    const diffTime = Math.abs(hoje - dataAplic);
    const diasDecorridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Limita aos dias totais até o vencimento
    const diasTotais = Math.ceil((dataVenc - dataAplic) / (1000 * 60 * 60 * 24));
    const diasUteisDecorridos = Math.min(diasDecorridos, diasTotais);
    
    // Taxa CDI anual (13,15% = 0.1315)
    const cdiAnual = 0.1315;
    
    // Taxa diária do CDI (base 252 dias úteis)
    const cdiDiario = Math.pow(1 + cdiAnual, 1 / 252) - 1;
    
    // Rendimento diário do investimento (% do CDI)
    const rendimentoDiario = cdiDiario * (rendimentoPercentual / 100);
    
    // Cálculo do valor atual com juros compostos diários
    const fator = Math.pow(1 + rendimentoDiario, diasUteisDecorridos);
    const valorAtual = valorAplicado * fator;
    const rentabilidadeAtual = ((valorAtual / valorAplicado) - 1) * 100;
    
    return {
        valorAtual: valorAtual,
        rentabilidadeAtual: rentabilidadeAtual,
        diasDecorridos: diasUteisDecorridos,
        diasTotais: diasTotais
    };
}

// ==================== INVESTIMENTOS CORRIGIDOS ====================
function adicionarInvestimentoMP() {
    const editId = document.getElementById('editIdInvestMP').value;
    const nome = document.getElementById('inNomeInvest').value.trim();
    const tipo = document.getElementById('inTipoInvestMP').value;
    const valorAplicado = parseFloat(document.getElementById('inValorAplicado').value);
    const rendimentoPercentual = parseFloat(document.getElementById('inRendimentoPercentual').value);
    const dataAplicacao = document.getElementById('inDataAplicacao').value;
    const dataVencimento = document.getElementById('inDataVencimento').value;
    const resgate = document.getElementById('inResgate').value;
    const resgateImediato = document.getElementById('inResgateImediato').checked;
    const garantiaFGC = document.getElementById('inGarantiaFGC').checked;

    if (!nome || nome.length < 3) return showToast('Nome do investimento inválido', 'error');
    if (isNaN(valorAplicado) || valorAplicado <= 0) return showToast('Valor aplicado inválido', 'error');
    if (isNaN(rendimentoPercentual) || rendimentoPercentual <= 0) return showToast('Rendimento inválido', 'error');

    // Usa a função de cálculo corrigida
    const resultado = calcularRendimentoMP(valorAplicado, rendimentoPercentual, dataAplicacao, dataVencimento);

    const invest = {
        id: editId || (Date.now() + Math.random().toString(36).substr(2, 9)),
        nome: nome.toUpperCase(),
        tipo: tipo,
        valorAplicado: valorAplicado,
        valorAtual: resultado.valorAtual,
        rendimentoPercentual: rendimentoPercentual,
        dataAplicacao: dataAplicacao,
        dataVencimento: dataVencimento || null,
        resgate: resgate,
        resgateImediato: resgateImediato,
        garantiaFGC: garantiaFGC,
        rentabilidadeAtual: resultado.rentabilidadeAtual,
        diasDecorridos: resultado.diasDecorridos,
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

function atualizarRendimentosDiarios() {
    let atualizado = false;
    const hoje = new Date();
    
    (dados.investimentosMP || []).forEach(inv => {
        const dataAplic = new Date(inv.dataAplicacao);
        const dataVenc = inv.dataVencimento ? new Date(inv.dataVencimento) : null;
        
        if (dataVenc && hoje > dataAplic && hoje < dataVenc) {
            const resultado = calcularRendimentoMP(
                inv.valorAplicado, 
                inv.rendimentoPercentual, 
                inv.dataAplicacao, 
                inv.dataVencimento
            );
            
            if (Math.abs(resultado.valorAtual - inv.valorAtual) > 0.01) {
                inv.valorAtual = resultado.valorAtual;
                inv.rentabilidadeAtual = resultado.rentabilidadeAtual;
                inv.diasDecorridos = resultado.diasDecorridos;
                inv.ultimaAtualizacao = hoje.toISOString();
                atualizado = true;
            }
        } else if (dataVenc && hoje >= dataVenc) {
            // Se já venceu, mantém o valor do vencimento
            const resultadoVencimento = calcularRendimentoMP(
                inv.valorAplicado,
                inv.rendimentoPercentual,
                inv.dataAplicacao,
                inv.dataVencimento
            );
            if (Math.abs(resultadoVencimento.valorAtual - inv.valorAtual) > 0.01) {
                inv.valorAtual = resultadoVencimento.valorAtual;
                inv.rentabilidadeAtual = resultadoVencimento.rentabilidadeAtual;
                atualizado = true;
            }
        }
    });
    
    if (atualizado) {
        syncToCloud();
        renderInvestimentosMP();
        showToast('💰 Rendimentos atualizados!', 'success');
    } else {
        showToast('Nenhuma atualização necessária', 'info');
    }
}

function renderInvestimentosMP() {
    const investimentos = dados.investimentosMP || [];
    console.log('Renderizando investimentos:', investimentos.length);
    
    const totalInvestido = investimentos.reduce((s, t) => s + t.valorAplicado, 0);
    const totalAtual = investimentos.reduce((s, t) => s + t.valorAtual, 0);
    const totalRend = totalAtual - totalInvestido;
    const rentTotal = totalInvestido > 0 ? (totalRend / totalInvestido) * 100 : 0;

    const totalInvestidoEl = document.getElementById('totalInvestidoMP');
    const totalAtualEl = document.getElementById('totalAtualMP');
    const totalRendimentoEl = document.getElementById('totalRendimentoMP');
    const rentabilidadeTotalEl = document.getElementById('rentabilidadeTotalMP');
    const contadorEl = document.getElementById('contadorInvestimentosMP');
    
    if (totalInvestidoEl) totalInvestidoEl.innerText = totalInvestido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalAtualEl) totalAtualEl.innerText = totalAtual.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalRendimentoEl) {
        totalRendimentoEl.innerText = totalRend.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
        totalRendimentoEl.className = `font-bold ${totalRend>=0?'text-emerald-500':'text-rose-500'}`;
    }
    if (rentabilidadeTotalEl) rentabilidadeTotalEl.innerHTML = `${rentTotal>=0?'+':''}${rentTotal.toFixed(2)}%`;
    if (contadorEl) contadorEl.innerText = investimentos.length;

    const tbody = document.getElementById('investTableBodyMP');
    if (!tbody) return;
    
    if (investimentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-12 opacity-50">📈 Nenhum investimento cadastrado</td></tr>';
        return;
    }
    
        tbody.innerHTML = investimentos.map(t => {
        const idSeguro = String(t.id).replace(/'/g, "\\'");
        
        // Formata a data de vencimento corretamente
        let dataVencFormatada = 'Sem vencimento';
        let diasRestantes = '';
        
        if (t.dataVencimento) {
            const dataVenc = new Date(t.dataVencimento);
            dataVencFormatada = dataVenc.toLocaleDateString('pt-BR');
            
            const hoje = new Date();
            if (hoje < dataVenc) {
                const diffDias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));
                diasRestantes = ` (${diffDias} dias restantes)`;
            }
        }
        
        const resgateInfo = t.resgateImediato ? '🔓 Resgate imediato' : `⏳ ${t.resgate || 'Prazo'}`;
        const rendColor = t.rentabilidadeAtual >= 0 ? 'text-emerald-500' : 'text-rose-500';
        
        return `
        <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="prepararEdicaoInvestMP('${idSeguro}')">
            <td class="py-4 px-3">
                <div class="font-bold text-sm">${t.nome}</div>
                <div class="text-[10px] text-slate-400">${t.tipo} ${t.garantiaFGC ? '• ✓ FGC' : ''}</div>
            </td>
            <td class="py-4 text-right">
                <div class="font-bold">${t.valorAtual.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="text-[10px] ${rendColor}">${t.rentabilidadeAtual >= 0 ? '+' : ''}${t.rentabilidadeAtual.toFixed(2)}%</div>
            </td>
            <td class="py-4 text-right">
                <div class="text-xs font-medium text-emerald-500">${t.rendimentoPercentual}% do CDI</div>
                <div class="text-[9px] text-slate-400">${resgateInfo}</div>
            </td>
            <td class="py-4 text-right">
                <div class="text-[10px] text-slate-400">Aplic: ${new Date(t.dataAplicacao).toLocaleDateString('pt-BR')}</div>
                <div class="text-[10px] text-slate-400">Venc: ${dataVencFormatada}${diasRestantes}</div>
            </td>
            <td class="text-right px-2">
                <button onclick="event.stopPropagation(); excluirInvestimentoMP('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕</button>
            </td>
        </tr>`;
    }).join('');
}

function abrirModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); resetFormInvestMP(); }
}
function fecharModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}
function resetFormInvestMP() {
    document.getElementById('editIdInvestMP').value = '';
    document.getElementById('inNomeInvest').value = '';
    document.getElementById('inTipoInvestMP').value = 'Renda Fixa';
    document.getElementById('inValorAplicado').value = '';
    document.getElementById('inRendimentoPercentual').value = '';
    document.getElementById('inDataAplicacao').value = new Date().toISOString().split('T')[0];
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
    if (dataCompra) dataCompra.value = now.toISOString().split('T')[0];
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
        const totalAtual = inv.reduce((s,t)=>s+t.valorAtual,0);
        const totalLucro = totalAtual - totalInv;
        const rent = totalInv>0?(totalLucro/totalInv)*100:0;
        doc.setFontSize(20); doc.setTextColor(0,150,100); doc.text('Relatório de Investimentos',20,20);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('Resumo da Carteira',20,35);
        doc.autoTable({ startY:40, head:[['Descrição','Valor']], body:[['Total Investido',`R$ ${totalInv.toFixed(2)}`],['Valor Atual',`R$ ${totalAtual.toFixed(2)}`],['Lucro/Prejuízo',`R$ ${totalLucro.toFixed(2)}`],['Rentabilidade',`${rent>=0?'+':''}${rent.toFixed(2)}%`]], theme:'striped', headStyles:{fillColor:[16,185,129]} });
        doc.text('Detalhamento',20,doc.lastAutoTable.finalY+15);
        doc.autoTable({ startY:doc.lastAutoTable.finalY+20, head:[['Ativo','Tipo','Corretora','Quant.','P.Médio','P.Atual','Total','Lucro','Rent.']], body:inv.map(t=>[t.nome,t.tipo,'Mercado Pago','1',`R$ ${t.valorAplicado.toFixed(2)}`,`R$ ${t.valorAtual.toFixed(2)}`,`R$ ${t.valorAtual.toFixed(2)}`,`R$ ${(t.valorAtual-t.valorAplicado).toFixed(2)}`,`${t.rentabilidadeAtual>=0?'+':''}${t.rentabilidadeAtual.toFixed(2)}%`]), theme:'striped', headStyles:{fillColor:[59,130,246]} });
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
