const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let filtroBusca = '';
let toastTimeout = null;
let activeTab = 'transacoes'; // 'transacoes' ou 'investimentos'

// Valores padrão caso o banco esteja vazio
let dados = { 
    transacoes: [], 
    investimentos: [],
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER', 'TRANSPORTE', 'EDUCAÇÃO'], 
    metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX', 'TRANSFERÊNCIA'],
    tiposInvestimento: ['AÇÕES', 'FIIs', 'CRIPTO', 'RENDA FIXA', 'TESOURO DIRETO', 'FUNDOS', 'PREVIDÊNCIA'],
    corretoras: ['NU INVEST', 'XP INC', 'RICO', 'CLEAR', 'INTER', 'SANTANDER', 'BRADESCO', 'OUTROS']
};

// --- TEMA ---
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    showToast(`Modo ${isDark ? 'escuro' : 'claro'} ativado`, 'info');
}

// --- TOAST ---
function showToast(message, type = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    
    const bgColor = type === 'success' ? 'bg-emerald-500' : 
                   type === 'error' ? 'bg-rose-500' : 'bg-blue-500';
    
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-xl 
                       text-sm font-bold shadow-2xl transform transition-all duration-500 
                       translate-y-0 opacity-100 z-50 max-w-sm`;
    toast.textContent = message;
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- CONTROLE DE TELAS ---
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

// --- CONTROLE DE ABAS ---
function mudarAba(aba) {
    activeTab = aba;
    
    // Atualiza visual das abas
    document.getElementById('tabTransacoes').classList.remove('bg-emerald-600', 'text-white');
    document.getElementById('tabInvestimentos').classList.remove('bg-emerald-600', 'text-white');
    document.getElementById('tabTransacoes').classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
    document.getElementById('tabInvestimentos').classList.add('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
    
    if (aba === 'transacoes') {
        document.getElementById('tabTransacoes').classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
        document.getElementById('tabTransacoes').classList.add('bg-emerald-600', 'text-white');
        document.getElementById('areaTransacoes').style.display = 'block';
        document.getElementById('areaInvestimentos').style.display = 'none';
        document.getElementById('formTitle').innerText = "➕ NOVO REGISTRO";
        resetForm();
    } else {
        document.getElementById('tabInvestimentos').classList.remove('bg-slate-200', 'dark:bg-slate-700', 'text-slate-700', 'dark:text-slate-300');
        document.getElementById('tabInvestimentos').classList.add('bg-emerald-600', 'text-white');
        document.getElementById('areaTransacoes').style.display = 'none';
        document.getElementById('areaInvestimentos').style.display = 'block';
        document.getElementById('formTitleInvest').innerText = "💰 NOVO INVESTIMENTO";
        resetFormInvest();
    }
    
    render();
}

// --- LOGIN ---
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            
            carregarNomeUsuario(user);
            loadFromCloud();
        } else {
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
            mostrarLogin();
        }
    });
    initDateFilters();
    initKeyboardShortcuts();
});

// --- CARREGAR NOME DO USUÁRIO ---
async function carregarNomeUsuario(user) {
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", user.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        
        let nomeExibido = '';
        
        if (snap.exists() && snap.data().nome) {
            nomeExibido = snap.data().nome;
        } else if (user.displayName) {
            nomeExibido = user.displayName;
        } else {
            nomeExibido = user.email.split('@')[0];
        }
        
        if (!user.displayName && nomeExibido) {
            await window.fb_funcs.updateProfile(user, {
                displayName: nomeExibido
            });
        }
        
        document.getElementById('userDisplay').innerHTML = `
            <span class="text-emerald-400">👤 ${nomeExibido}</span>
            <span class="ml-2 text-[8px] opacity-50">● ONLINE</span>
        `;
        
        showToast(`Bem-vindo, ${nomeExibido}!`, 'success');
        
    } catch (err) {
        console.error("Erro ao carregar nome:", err);
        const nomeFallback = user.email.split('@')[0];
        document.getElementById('userDisplay').innerHTML = `
            <span class="text-emerald-400">👤 ${nomeFallback}</span>
            <span class="ml-2 text-[8px] opacity-50">● ONLINE</span>
        `;
    }
}

async function handleLogin() {
    const e = document.getElementById('authEmail').value.trim();
    const p = document.getElementById('authPass').value;
    
    if (!e || !p) {
        showToast('Preencha e-mail e senha', 'error');
        return;
    }
    
    try { 
        await window.fb_funcs.signInWithEmailAndPassword(window.auth, e, p); 
    } catch (err) { 
        showToast('Erro no login: ' + (err.message || 'credenciais inválidas'), 'error'); 
    }
}

// --- CADASTRO COM NOME ---
async function handleSignup() {
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const pass = document.getElementById('cadastroPass').value;
    
    if (!nome) {
        showToast('Digite seu nome', 'error');
        return;
    }
    
    if (!email || !pass) {
        showToast('Preencha e-mail e senha', 'error');
        return;
    }
    
    if (pass.length < 6) {
        showToast('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const userCredential = await window.fb_funcs.createUserWithEmailAndPassword(window.auth, email, pass);
        const user = userCredential.user;
        
        await window.fb_funcs.updateProfile(user, {
            displayName: nome
        });
        
        const docRef = window.fb_funcs.doc(window.db, "users", user.uid);
        await window.fb_funcs.setDoc(docRef, {
            ...dados,
            nome: nome,
            email: email,
            criadoEm: new Date().toISOString()
        });
        
        showToast('Cadastro realizado com sucesso!', 'success');
        mostrarLogin();
        
        document.getElementById('cadastroNome').value = '';
        document.getElementById('cadastroEmail').value = '';
        document.getElementById('cadastroPass').value = '';
        
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            showToast('E-mail já cadastrado', 'error');
        } else {
            showToast('Erro ao cadastrar: ' + err.message, 'error');
        }
    }
}

function handleLogout() { 
    window.fb_funcs.signOut(window.auth);
    showToast('Até logo! 👋', 'info');
}

// --- NUVEM ---
async function loadFromCloud() {
    if(!currentUser) return;
    
    showLoading(true);
    
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        const snap = await window.fb_funcs.getDoc(docRef);
        if (snap.exists()) {
            const d = snap.data();
            dados.transacoes = d.transacoes || [];
            dados.investimentos = d.investimentos || [];
            if(d.categorias && d.categorias.length > 0) dados.categorias = d.categorias;
            if(d.metodos && d.metodos.length > 0) dados.metodos = d.metodos;
            if(d.tiposInvestimento && d.tiposInvestimento.length > 0) dados.tiposInvestimento = d.tiposInvestimento;
            if(d.corretoras && d.corretoras.length > 0) dados.corretoras = d.corretoras;
            
            render();
            showToast('Dados carregados da nuvem', 'success');
        } else {
            await syncToCloud();
            showToast('Bem-vindo! Comece adicionando suas transações', 'info');
        }
    } catch (err) { 
        console.error("Erro ao carregar nuvem:", err);
        showToast('Erro ao carregar dados', 'error');
    } finally {
        showLoading(false);
    }
}

async function syncToCloud() {
    if (!currentUser) return;
    
    const btn = document.getElementById('btnSave');
    const btnInvest = document.getElementById('btnSaveInvest');
    
    if (btn) {
        btn.classList.add('loading-btn');
        btn.textContent = 'SALVANDO...';
    }
    if (btnInvest) {
        btnInvest.classList.add('loading-btn');
        btnInvest.textContent = 'SALVANDO...';
    }
    
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        await window.fb_funcs.setDoc(docRef, dados);
        render();
        showToast('Dados salvos na nuvem ☁️', 'success');
    } catch (err) {
        showToast('Erro ao salvar', 'error');
    } finally {
        if (btn) {
            btn.classList.remove('loading-btn');
            btn.textContent = document.getElementById('editId').value ? 'ATUALIZAR' : '💾 SALVAR NA NUVEM';
        }
        if (btnInvest) {
            btnInvest.classList.remove('loading-btn');
            btnInvest.textContent = '💾 SALVAR INVESTIMENTO';
        }
    }
}

// --- LOADING ---
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

// --- CATEGORIAS E MÉTODOS ---
async function addItemLista(tipo, inputId) {
    const input = document.getElementById(inputId);
    const valor = input.value.trim().toUpperCase();
    
    if (!valor) {
        showToast('Digite um valor', 'error');
        return;
    }
    
    if (dados[tipo].includes(valor)) {
        showToast('Item já existe', 'error');
        return;
    }
    
    dados[tipo].push(valor);
    input.value = '';
    await syncToCloud();
    
    let nomeTipo = tipo;
    if (tipo === 'categorias') nomeTipo = 'Categoria';
    if (tipo === 'metodos') nomeTipo = 'Método';
    if (tipo === 'tiposInvestimento') nomeTipo = 'Tipo de investimento';
    if (tipo === 'corretoras') nomeTipo = 'Corretora';
    
    showToast(`${nomeTipo} adicionado`, 'success');
}

// --- LÓGICA DE INVESTIMENTOS ---
function adicionarInvestimento() {
    const editId = document.getElementById('editIdInvest').value;
    const ativo = document.getElementById('inAtivo').value.trim();
    const tipo = document.getElementById('inTipoInvest').value;
    const corretora = document.getElementById('inCorretora').value;
    const quantidade = parseFloat(document.getElementById('inQuantidade').value);
    const precoMedio = parseFloat(document.getElementById('inPrecoMedio').value);
    const precoAtual = parseFloat(document.getElementById('inPrecoAtual').value) || precoMedio;
    const dataCompra = document.getElementById('inDataCompra').value;
    
    if (!ativo || ativo.length < 2) {
        showToast('Digite o nome do ativo', 'error');
        return;
    }
    if (isNaN(quantidade) || quantidade <= 0) {
        showToast('Quantidade deve ser maior que zero', 'error');
        return;
    }
    if (isNaN(precoMedio) || precoMedio <= 0) {
        showToast('Preço médio deve ser maior que zero', 'error');
        return;
    }
    if (!tipo || !corretora) {
        showToast('Selecione tipo e corretora', 'error');
        return;
    }

    const valorTotal = quantidade * precoMedio;
    const valorAtual = quantidade * precoAtual;
    const lucroPrejuizo = valorAtual - valorTotal;
    const rentabilidade = ((precoAtual / precoMedio) - 1) * 100;

    if (editId) {
        // MODO EDIÇÃO
        const index = dados.investimentos.findIndex(t => String(t.id) === String(editId));
        if (index !== -1) {
            dados.investimentos[index] = {
                ...dados.investimentos[index],
                ativo: ativo.toUpperCase(),
                tipo: tipo,
                corretora: corretora,
                quantidade: quantidade,
                precoMedio: precoMedio,
                precoAtual: precoAtual,
                dataCompra: dataCompra,
                valorTotal: valorTotal,
                valorAtual: valorAtual,
                lucroPrejuizo: lucroPrejuizo,
                rentabilidade: rentabilidade,
                atualizadoEm: new Date().toISOString()
            };
            showToast('Investimento atualizado', 'success');
            resetFormInvest();
            syncToCloud();
        }
    } else {
        // MODO NOVO INVESTIMENTO
        dados.investimentos.push({
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            ativo: ativo.toUpperCase(),
            tipo: tipo,
            corretora: corretora,
            quantidade: quantidade,
            precoMedio: precoMedio,
            precoAtual: precoAtual,
            dataCompra: dataCompra,
            valorTotal: valorTotal,
            valorAtual: valorAtual,
            lucroPrejuizo: lucroPrejuizo,
            rentabilidade: rentabilidade,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        });
        
        document.getElementById('inAtivo').value = '';
        document.getElementById('inQuantidade').value = '';
        document.getElementById('inPrecoMedio').value = '';
        document.getElementById('inPrecoAtual').value = '';
        document.getElementById('inDataCompra').value = new Date().toISOString().split('T')[0];
        
        showToast('Investimento adicionado', 'success');
        syncToCloud();
    }
}

// --- ATUALIZAR PREÇO ATUAL ---
function atualizarPrecoAtual(id, novoPreco) {
    const invest = dados.investimentos.find(x => String(x.id) === String(id));
    if (invest) {
        invest.precoAtual = novoPreco;
        invest.valorAtual = invest.quantidade * novoPreco;
        invest.lucroPrejuizo = invest.valorAtual - invest.valorTotal;
        invest.rentabilidade = ((novoPreco / invest.precoMedio) - 1) * 100;
        invest.atualizadoEm = new Date().toISOString();
        syncToCloud();
        showToast('Preço atualizado', 'success');
    }
}

// --- EXCLUIR INVESTIMENTO ---
function excluirInvestimento(id) {
    if (confirm("Tem certeza que deseja excluir este investimento?")) { 
        dados.investimentos = dados.investimentos.filter(t => String(t.id) !== String(id)); 
        syncToCloud();
        showToast('Investimento excluído', 'success');
    }
}

// --- LÓGICA DE TRANSAÇÕES (existente) ---
function adicionar() {
    const editId = document.getElementById('editId').value;
    const desc = document.getElementById('inDesc').value.trim();
    const val = parseFloat(document.getElementById('inVal').value);
    const tipo = document.getElementById('inType').value;
    const categoria = document.getElementById('inCat').value;
    const metodo = document.getElementById('inMeth').value;
    const mesNome = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);
    
    if (!desc || desc.length < 3) {
        showToast('Descrição deve ter pelo menos 3 caracteres', 'error');
        return;
    }
    if (isNaN(val) || val <= 0) {
        showToast('Valor deve ser maior que zero', 'error');
        return;
    }
    if (val > 1000000) {
        showToast('Valor muito alto (máx: R$ 1.000.000)', 'error');
        return;
    }
    if (!categoria || !metodo) {
        showToast('Selecione categoria e método', 'error');
        return;
    }

    if (editId) {
        // MODO EDIÇÃO
        const index = dados.transacoes.findIndex(t => String(t.id) === String(editId));
        if (index !== -1) {
            dados.transacoes[index] = {
                ...dados.transacoes[index],
                tipo: tipo,
                desc: desc,
                valor: val,
                categoria: categoria,
                metodo: metodo,
                mesIdx: MESES.indexOf(mesNome),
                ano: ano
            };
            showToast('Registro atualizado', 'success');
            resetForm();
            syncToCloud();
        }
    } else {
        // MODO NOVO REGISTRO
        const parc = parseInt(document.getElementById('inParc').value) || 1;
        if (parc > 24) {
            showToast('Máximo de 24 parcelas', 'error');
            return;
        }
        
        const startIdx = MESES.indexOf(mesNome);
        const anoBase = ano;

        for (let i = 0; i < parc; i++) {
            const curIdx = startIdx + i;
            dados.transacoes.push({
                id: Date.now() + i + Math.random().toString(36).substr(2, 9),
                tipo: tipo,
                desc: desc,
                valor: val / parc,
                categoria: categoria,
                metodo: metodo,
                parc: parc > 1 ? `${i + 1}/${parc}` : '',
                parcTotal: parc > 1 ? parc : null,
                parcAtual: parc > 1 ? i + 1 : null,
                descOriginal: parc > 1 ? desc : null,
                mesIdx: curIdx % 12,
                ano: anoBase + Math.floor(curIdx / 12),
                pago: false,
                criadoEm: new Date().toISOString()
            });
        }
        
        document.getElementById('inDesc').value = '';
        document.getElementById('inVal').value = '';
        document.getElementById('inParc').value = '';
        
        showToast(`${parc} registro(s) adicionado(s)`, 'success');
        syncToCloud();
    }
}

// --- EXCLUIR TODAS AS PARCELAS ---
function excluirTodasParcelas(descOriginal, parcTotal) {
    const transacoesParaExcluir = dados.transacoes.filter(t => 
        t.descOriginal === descOriginal && t.parcTotal === parcTotal
    );
    
    if (transacoesParaExcluir.length === 0) return false;
    
    const mensagem = `Deseja excluir TODAS as ${transacoesParaExcluir.length} parcelas?`;
    
    if (confirm(mensagem)) {
        dados.transacoes = dados.transacoes.filter(t => 
            !(t.descOriginal === descOriginal && t.parcTotal === parcTotal)
        );
        syncToCloud();
        showToast(`${transacoesParaExcluir.length} parcelas excluídas`, 'success');
        return true;
    }
    return false;
}

// --- RENDER ---
function render() {
    if (activeTab === 'transacoes') {
        renderTransacoes();
    } else {
        renderInvestimentos();
    }
    
    // Atualiza selects (comuns)
    const updateSelect = (id, list) => {
        const el = document.getElementById(id);
        if (el) {
            const valorAtual = el.value;
            el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
            if(list.includes(valorAtual)) el.value = valorAtual;
        }
    };
    updateSelect('inCat', dados.categorias);
    updateSelect('inMeth', dados.metodos);
    updateSelect('inTipoInvest', dados.tiposInvestimento);
    updateSelect('inCorretora', dados.corretoras);
}

// --- RENDER TRANSAÇÕES ---
function renderTransacoes() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const searchTerm = filtroBusca.toLowerCase();
    
    let filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);
    
    if (searchTerm) {
        filtrados = filtrados.filter(t => 
            t.desc.toLowerCase().includes(searchTerm) ||
            t.categoria.toLowerCase().includes(searchTerm) ||
            t.metodo.toLowerCase().includes(searchTerm)
        );
    }

    // Separa receitas e despesas
    const receitas = filtrados.filter(t => t.tipo === 'income');
    const despesas = filtrados.filter(t => t.tipo === 'expense');
    
    const inc = receitas.reduce((s, t) => s + t.valor, 0);
    const exp = despesas.reduce((s, t) => s + t.valor, 0);
    const saldo = inc - exp;

    // Atualiza saldo
    const saldoEl = document.getElementById('totalBalance');
    if (saldoEl) {
        saldoEl.innerText = saldo.toLocaleString('pt-BR', {
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2
        });

        saldoEl.className = `text-4xl font-black tracking-tighter ${
            saldo > 0 ? 'text-emerald-500' : 
            saldo < 0 ? 'text-rose-500' : 
            'text-slate-900 dark:text-white'
        }`;
    }

    // Atualiza cards
    const totalReceitasEl = document.getElementById('totalReceitas');
    const totalDespesasEl = document.getElementById('totalDespesas');
    
    if (totalReceitasEl) {
        totalReceitasEl.innerText = inc.toLocaleString('pt-BR', {
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2
        });
    }
    
    if (totalDespesasEl) {
        totalDespesasEl.innerText = exp.toLocaleString('pt-BR', {
            style: 'currency', 
            currency: 'BRL',
            minimumFractionDigits: 2
        });
    }

    const contadorEl = document.getElementById('contadorRegistros');
    if (contadorEl) {
        contadorEl.innerText = filtrados.length;
    }

    // TABELA DE TRANSAÇÕES
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    if (filtrados.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-12 opacity-50">
                    <span class="text-4xl block mb-2">📭</span>
                    Nenhuma transação encontrada
                </td>
            </tr>`;
    } else {
        let html = '';
        let gruposParcelas = {};
        
        // RECEITAS
        if (receitas.length > 0) {
            html += `
            <tr class="bg-emerald-50 dark:bg-emerald-900/20">
                <td colspan="5" class="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    💰 RECEITAS
                </td>
            </tr>`;
            
            receitas.forEach(t => {
                const idSeguro = String(t.id).replace(/'/g, "\\'");
                const descSegura = t.desc.replace(/'/g, "\\'");
                const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
                
                html += `
                <tr class="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="py-4 px-2 w-8">
                        <button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 transition-all transform hover:scale-110 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-500'}"></button>
                    </td>
                    <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')">
                        <div class="font-bold text-sm dark:text-slate-200">
                            ${descSegura} 
                            ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}
                        </div>
                        <div class="text-[8px] text-emerald-600 font-bold uppercase flex gap-2">
                            <span>${t.metodo}</span>
                            <span>•</span>
                            <span>${t.categoria}</span>
                        </div>
                    </td>
                    <td class="text-right font-black text-emerald-500">
                        ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                    </td>
                    <td class="text-right px-2">
                        ${chaveGrupo && !gruposParcelas[chaveGrupo] ? 
                            `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" 
                                    class="text-slate-300 hover:text-amber-500 hover:scale-110 transition-all text-xs font-bold mr-2" 
                                    title="Excluir todas as parcelas">
                                📦
                             </button>` 
                            : ''}
                        <button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500 hover:scale-110 transition-all text-xs font-bold">
                            ✕
                        </button>
                    </td>
                </tr>`;
                
                if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
            });
        }
        
        // DESPESAS
        if (despesas.length > 0) {
            html += `
            <tr class="bg-rose-50 dark:bg-rose-900/20">
                <td colspan="5" class="py-2 px-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                    📉 DESPESAS
                </td>
            </tr>`;
            
            gruposParcelas = {};
            
            despesas.forEach(t => {
                const idSeguro = String(t.id).replace(/'/g, "\\'");
                const descSegura = t.desc.replace(/'/g, "\\'");
                const chaveGrupo = t.descOriginal ? `${t.descOriginal}-${t.parcTotal}` : null;
                
                html += `
                <tr class="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="py-4 px-2 w-8">
                        <button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 transition-all transform hover:scale-110 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-500'}"></button>
                    </td>
                    <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')">
                        <div class="font-bold text-sm dark:text-slate-200">
                            ${descSegura} 
                            ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}
                        </div>
                        <div class="text-[8px] text-rose-500 font-bold uppercase flex gap-2">
                            <span>${t.metodo}</span>
                            <span>•</span>
                            <span>${t.categoria}</span>
                        </div>
                    </td>
                    <td class="text-right font-black text-rose-500">
                        ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                    </td>
                    <td class="text-right px-2">
                        ${chaveGrupo && !gruposParcelas[chaveGrupo] ? 
                            `<button onclick="excluirTodasParcelas('${t.descOriginal}', ${t.parcTotal})" 
                                    class="text-slate-300 hover:text-amber-500 hover:scale-110 transition-all text-xs font-bold mr-2" 
                                    title="Excluir todas as parcelas">
                                📦
                             </button>` 
                            : ''}
                        <button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500 hover:scale-110 transition-all text-xs font-bold">
                            ✕
                        </button>
                    </td>
                </tr>`;
                
                if (chaveGrupo) gruposParcelas[chaveGrupo] = true;
            });
        }
        
        tableBody.innerHTML = html;
    }
}

// --- RENDER INVESTIMENTOS ---
function renderInvestimentos() {
    const investimentos = dados.investimentos || [];
    
    // Calcula totais
    const totalInvestido = investimentos.reduce((s, t) => s + t.valorTotal, 0);
    const totalAtual = investimentos.reduce((s, t) => s + t.valorAtual, 0);
    const totalLucro = totalAtual - totalInvestido;
    const rentabilidadeTotal = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;
    
    // Atualiza cards de resumo
    document.getElementById('totalInvestido').innerText = totalInvestido.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
    });
    
    document.getElementById('totalAtual').innerText = totalAtual.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
    });
    
    const lucroEl = document.getElementById('totalLucro');
    lucroEl.innerText = totalLucro.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL'
    });
    lucroEl.className = `font-bold ${totalLucro >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    
    const rentEl = document.getElementById('rentabilidadeTotal');
    rentEl.innerText = `${rentabilidadeTotal >= 0 ? '+' : ''}${rentabilidadeTotal.toFixed(2)}%`;
    rentEl.className = `font-bold ${rentabilidadeTotal >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
    
    // Tabela de investimentos
    const tableBody = document.getElementById('investTableBody');
    if (!tableBody) return;
    
    if (investimentos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 opacity-50">
                    <span class="text-4xl block mb-2">📈</span>
                    Nenhum investimento cadastrado
                </td>
            </tr>`;
    } else {
        // Ordena por data (mais recentes primeiro)
        investimentos.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
        
        tableBody.innerHTML = investimentos.map(t => {
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const rentColor = t.rentabilidade >= 0 ? 'text-emerald-500' : 'text-rose-500';
            const lucroColor = t.lucroPrejuizo >= 0 ? 'text-emerald-500' : 'text-rose-500';
            
            return `
            <tr class="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-3 px-2 cursor-pointer" onclick="prepararEdicaoInvest('${idSeguro}')">
                    <div class="font-bold text-sm dark:text-slate-200">${t.ativo}</div>
                    <div class="text-[8px] text-blue-500">${t.tipo}</div>
                </td>
                <td class="py-3 text-xs">${t.corretora}</td>
                <td class="py-3 text-right">${t.quantidade}</td>
                <td class="py-3 text-right">${t.precoMedio.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                <td class="py-3 text-right">
                    <div class="flex items-center justify-end gap-1">
                        <span class="${rentColor}">${t.precoAtual.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</span>
                        <button onclick="atualizarPrecoDialog('${idSeguro}', ${t.precoAtual})" 
                                class="text-slate-300 hover:text-blue-500 hover:scale-110 transition-all text-xs">
                            ✏️
                        </button>
                    </div>
                </td>
                <td class="py-3 text-right ${lucroColor}">
                    ${t.lucroPrejuizo.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </td>
                <td class="py-3 text-right ${rentColor}">
                    ${t.rentabilidade >= 0 ? '+' : ''}${t.rentabilidade.toFixed(2)}%
                </td>
                <td class="text-right px-2">
                    <button onclick="excluirInvestimento('${idSeguro}')" class="text-slate-300 hover:text-rose-500 hover:scale-110 transition-all text-xs font-bold">
                        ✕
                    </button>
                </td>
            </tr>`;
        }).join('');
    }
}

// --- DIÁLOGO PARA ATUALIZAR PREÇO ---
function atualizarPrecoDialog(id, precoAtual) {
    const novoPreco = prompt("Digite o novo preço atual:", precoAtual);
    if (novoPreco !== null) {
        const preco = parseFloat(novoPreco.replace(',', '.'));
        if (!isNaN(preco) && preco > 0) {
            atualizarPrecoAtual(id, preco);
        } else {
            showToast('Valor inválido', 'error');
        }
    }
}

// --- CRUD OPERATIONS TRANSAÇÕES ---
function excluir(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) { 
        dados.transacoes = dados.transacoes.filter(t => String(t.id) !== String(id)); 
        syncToCloud();
        showToast('Registro excluído', 'success');
    }
}

function togglePago(id) {
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (t) { 
        t.pago = !t.pago; 
        syncToCloud();
        showToast(t.pago ? '✅ Marcado como pago' : '⏳ Marcado como pendente', 'info');
    }
}

// --- FILTROS ---
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
    
    const fYearEl = document.getElementById('fYear');
    const inYearEl = document.getElementById('inYear');
    if (fYearEl) fYearEl.value = now.getFullYear();
    if (inYearEl) inYearEl.value = now.getFullYear();
    
    // Data padrão para investimentos
    const dataCompraEl = document.getElementById('inDataCompra');
    if (dataCompraEl) {
        dataCompraEl.value = now.toISOString().split('T')[0];
    }
}

function filtrarTabela(texto) {
    filtroBusca = texto;
    render();
}

// --- FORM TRANSAÇÕES ---
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
    if (!t) {
        showToast('Erro ao carregar registro', 'error');
        return;
    }
    
    document.getElementById('editId').value = t.id;
    document.getElementById('inType').value = t.tipo;
    document.getElementById('inDesc').value = t.desc;
    document.getElementById('inVal').value = t.valor;
    document.getElementById('inParc').disabled = true;
    document.getElementById('inParc').value = '';
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

// --- FORM INVESTIMENTOS ---
function resetFormInvest() {
    document.getElementById('editIdInvest').value = '';
    document.getElementById('inAtivo').value = '';
    document.getElementById('inQuantidade').value = '';
    document.getElementById('inPrecoMedio').value = '';
    document.getElementById('inPrecoAtual').value = '';
    document.getElementById('inDataCompra').value = new Date().toISOString().split('T')[0];
    document.getElementById('btnCancelEditInvest').classList.add('hidden');
    document.getElementById('formTitleInvest').innerText = "💰 NOVO INVESTIMENTO";
    document.getElementById('btnSaveInvest').innerText = "💾 SALVAR INVESTIMENTO";
}

function prepararEdicaoInvest(id) {
    const t = dados.investimentos.find(x => String(x.id) === String(id));
    if (!t) {
        showToast('Erro ao carregar investimento', 'error');
        return;
    }
    
    document.getElementById('editIdInvest').value = t.id;
    document.getElementById('inAtivo').value = t.ativo;
    document.getElementById('inTipoInvest').value = t.tipo;
    document.getElementById('inCorretora').value = t.corretora;
    document.getElementById('inQuantidade').value = t.quantidade;
    document.getElementById('inPrecoMedio').value = t.precoMedio;
    document.getElementById('inPrecoAtual').value = t.precoAtual;
    document.getElementById('inDataCompra').value = t.dataCompra;
    document.getElementById('formTitleInvest').innerText = "✏️ EDITANDO INVESTIMENTO";
    document.getElementById('btnSaveInvest').innerText = "🔄 ATUALIZAR";
    document.getElementById('btnCancelEditInvest').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('✏️ Modo edição ativado', 'info');
}

// --- PDF EXPORT (atualizado para incluir investimentos) ---
function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    if (activeTab === 'transacoes') {
        exportarPDFTransacoes(doc);
    } else {
        exportarPDFInvestimentos(doc);
    }
}

function exportarPDFTransacoes(doc) {
    const mes = document.getElementById('fMonth').value;
    const ano = document.getElementById('fYear').value;
    const mIdx = MESES.indexOf(mes);
    
    const transacoes = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === parseInt(ano));
    const receitas = transacoes.filter(t => t.tipo === 'income');
    const despesas = transacoes.filter(t => t.tipo === 'expense');
    
    const totalRec = receitas.reduce((s, t) => s + t.valor, 0);
    const totalDes = despesas.reduce((s, t) => s + t.valor, 0);
    
    doc.setFontSize(20);
    doc.setTextColor(0, 150, 100);
    doc.text('Relatório de Transações', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`${mes} ${ano}`, 20, 30);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumo do Período', 20, 45);
    
    doc.autoTable({
        startY: 50,
        head: [['Descrição', 'Valor']],
        body: [
            ['Total de Receitas', `R$ ${totalRec.toFixed(2)}`],
            ['Total de Despesas', `R$ ${totalDes.toFixed(2)}`],
            ['Saldo', `R$ ${(totalRec - totalDes).toFixed(2)}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
    });
    
    doc.text('Detalhamento', 20, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Descrição', 'Categoria', 'Método', 'Valor', 'Status']],
        body: transacoes.map(t => [
            t.desc + (t.parc ? ` (${t.parc})` : ''),
            t.categoria,
            t.metodo,
            `R$ ${t.valor.toFixed(2)}`,
            t.pago ? 'Pago' : 'Pendente'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`transacoes-${mes}-${ano}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
}

function exportarPDFInvestimentos(doc) {
    const investimentos = dados.investimentos || [];
    
    const totalInvestido = investimentos.reduce((s, t) => s + t.valorTotal, 0);
    const totalAtual = investimentos.reduce((s, t) => s + t.valorAtual, 0);
    const totalLucro = totalAtual - totalInvestido;
    const rentabilidadeTotal = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;
    
    doc.setFontSize(20);
    doc.setTextColor(0, 150, 100);
    doc.text('Relatório de Investimentos', 20, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumo da Carteira', 20, 35);
    
    doc.autoTable({
        startY: 40,
        head: [['Descrição', 'Valor']],
        body: [
            ['Total Investido', `R$ ${totalInvestido.toFixed(2)}`],
            ['Valor Atual', `R$ ${totalAtual.toFixed(2)}`],
            ['Lucro/Prejuízo', `R$ ${totalLucro.toFixed(2)}`],
            ['Rentabilidade', `${rentabilidadeTotal >= 0 ? '+' : ''}${rentabilidadeTotal.toFixed(2)}%`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }
    });
    
    doc.text('Detalhamento', 20, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Ativo', 'Tipo', 'Corretora', 'Quant.', 'P.Médio', 'P.Atual', 'Total', 'Lucro', 'Rent.']],
        body: investimentos.map(t => [
            t.ativo,
            t.tipo,
            t.corretora,
            t.quantidade.toString(),
            `R$ ${t.precoMedio.toFixed(2)}`,
            `R$ ${t.precoAtual.toFixed(2)}`,
            `R$ ${t.valorAtual.toFixed(2)}`,
            `R$ ${t.lucroPrejuizo.toFixed(2)}`,
            `${t.rentabilidade >= 0 ? '+' : ''}${t.rentabilidade.toFixed(2)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`investimentos-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
}

// --- KEYBOARD SHORTCUTS ---
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (activeTab === 'transacoes') {
                resetForm();
                document.getElementById('inDesc').focus();
            } else {
                resetFormInvest();
                document.getElementById('inAtivo').focus();
            }
            showToast('Novo registro', 'info');
        }
        
        if (e.key === 'Escape') {
            if (activeTab === 'transacoes') {
                const editId = document.getElementById('editId').value;
                if (editId) {
                    resetForm();
                    showToast('Edição cancelada', 'info');
                }
            } else {
                const editId = document.getElementById('editIdInvest').value;
                if (editId) {
                    resetFormInvest();
                    showToast('Edição cancelada', 'info');
                }
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentUser) {
                syncToCloud();
            }
        }
        
        // Atalhos para abas: Alt+1 (Transações), Alt+2 (Investimentos)
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            mudarAba('transacoes');
        }
        if (e.altKey && e.key === '2') {
            e.preventDefault();
            mudarAba('investimentos');
        }
    });
}

// --- EXPORTS PARA O HTML ---
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.toggleDarkMode = toggleDarkMode;
window.adicionar = adicionar;
window.adicionarInvestimento = adicionarInvestimento;
window.excluir = excluir;
window.excluirInvestimento = excluirInvestimento;
window.excluirTodasParcelas = excluirTodasParcelas;
window.togglePago = togglePago;
window.prepararEdicao = prepararEdicao;
window.prepararEdicaoInvest = prepararEdicaoInvest;
window.resetForm = resetForm;
window.resetFormInvest = resetFormInvest;
window.render = render;
window.exportarPDF = exportarPDF;
window.filtrarTabela = filtrarTabela;
window.addItemLista = addItemLista;
window.mostrarCadastro = mostrarCadastro;
window.mostrarLogin = mostrarLogin;
window.mudarAba = mudarAba;
window.atualizarPrecoDialog = atualizarPrecoDialog;
