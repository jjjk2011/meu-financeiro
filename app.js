const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentUser = null;
let filtroBusca = '';
let toastTimeout = null;

// Valores padrão caso o banco esteja vazio
let dados = { 
    transacoes: [], 
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'SAÚDE', 'LAZER', 'TRANSPORTE', 'EDUCAÇÃO'], 
    metodos: ['DINHEIRO', 'CRÉDITO', 'DÉBITO', 'PIX', 'TRANSFERÊNCIA'] 
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

// --- LOGIN ---
window.addEventListener('load', () => {
    window.fb_funcs.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('appScreen').style.display = 'block';
            document.getElementById('userDisplay').innerHTML = `
                <span class="text-emerald-400">${user.email}</span>
                <span class="ml-2 text-[8px] opacity-50">● ONLINE</span>
            `;
            loadFromCloud();
            showToast(`Bem-vindo, ${user.email.split('@')[0]}!`, 'success');
        } else {
            document.getElementById('authScreen').style.display = 'flex';
            document.getElementById('appScreen').style.display = 'none';
        }
    });
    initDateFilters();
    initKeyboardShortcuts();
});

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

async function handleSignup() {
    const email = document.getElementById('authEmail').value.trim();
    const pass = document.getElementById('authPass').value;
    
    if (!email || !pass) {
        showToast('Preencha e-mail e senha', 'error');
        return;
    }
    
    if (pass.length < 6) {
        showToast('Senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }
    
    try {
        await window.fb_funcs.createUserWithEmailAndPassword(window.auth, email, pass);
        showToast('Cadastro realizado com sucesso!', 'success');
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
            if(d.categorias && d.categorias.length > 0) dados.categorias = d.categorias;
            if(d.metodos && d.metodos.length > 0) dados.metodos = d.metodos;
            
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
    btn.classList.add('loading-btn');
    const originalText = btn.textContent;
    btn.textContent = 'SALVANDO...';
    
    try {
        const docRef = window.fb_funcs.doc(window.db, "users", currentUser.uid);
        await window.fb_funcs.setDoc(docRef, dados);
        render();
        showToast('Dados salvos na nuvem ☁️', 'success');
    } catch (err) {
        showToast('Erro ao salvar', 'error');
    } finally {
        btn.classList.remove('loading-btn');
        btn.textContent = document.getElementById('editId').value ? 'ATUALIZAR' : 'SALVAR NA NUVEM';
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
    showToast(`${tipo === 'categorias' ? 'Categoria' : 'Método'} adicionado`, 'success');
}

// --- LÓGICA DE REGISTROS ---
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
        // MODO EDIÇÃO - CORRIGIDO
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

// --- RENDER ---
function render() {
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

    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);
    const saldo = inc - exp;

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

    // TABELA - CORRIGIDA com escapes corretos para as strings
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    if (filtrados.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-12 opacity-50">
                    <span class="text-4xl block mb-2">📭</span>
                    Nenhuma transação encontrada
                </td>
            </tr>`;
    } else {
        let html = '';
        filtrados.forEach(t => {
            // Escapa aspas simples no ID e descrição
            const idSeguro = String(t.id).replace(/'/g, "\\'");
            const descSegura = t.desc.replace(/'/g, "\\'");
            
            html += `
            <tr class="${t.pago ? 'opacity-30' : ''} border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td class="py-4 px-2 w-8">
                    <button onclick="togglePago('${idSeguro}')" class="w-5 h-5 rounded-full border-2 transition-all transform hover:scale-110 ${t.pago ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-500'}"></button>
                </td>
                <td class="py-4 cursor-pointer" onclick="prepararEdicao('${idSeguro}')">
                    <div class="font-bold text-sm dark:text-slate-200">
                        ${descSegura} 
                        ${t.parc ? `<span class="text-[9px] opacity-40 ml-1">${t.parc}</span>` : ''}
                    </div>
                    <div class="text-[8px] text-blue-500 font-bold uppercase flex gap-2">
                        <span>${t.metodo}</span>
                        <span>•</span>
                        <span>${t.categoria}</span>
                    </div>
                </td>
                <td class="text-right font-black ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                    ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
                </td>
                <td class="text-right px-2">
                    <button onclick="excluir('${idSeguro}')" class="text-slate-300 hover:text-rose-500 hover:scale-110 transition-all text-xs font-bold">
                        ✕
                    </button>
                </td>
            </tr>`;
        });
        tableBody.innerHTML = html;
    }

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
}

// --- CRUD OPERATIONS - CORRIGIDAS ---
function excluir(id) {
    if (confirm("Tem certeza que deseja excluir este registro?")) { 
        // Converte para string para garantir comparação
        dados.transacoes = dados.transacoes.filter(t => String(t.id) !== String(id)); 
        syncToCloud();
        showToast('Registro excluído', 'success');
    }
}

function togglePago(id) {
    // Converte para string para garantir comparação
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (t) { 
        t.pago = !t.pago; 
        syncToCloud();
        showToast(t.pago ? '✅ Marcado como pago' : '⏳ Marcado como pendente', 'info');
    } else {
        console.log('Transação não encontrada:', id);
        showToast('Erro ao alterar status', 'error');
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
}

function filtrarTabela(texto) {
    filtroBusca = texto;
    render();
}

// --- FORM ---
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
    // Converte para string para garantir comparação
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (!t) {
        console.log('Transação não encontrada para edição:', id);
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

// --- PDF EXPORT ---
function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
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
    doc.text('Relatório Financeiro', 20, 20);
    
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
            t.desc,
            t.categoria,
            t.metodo,
            `R$ ${t.valor.toFixed(2)}`,
            t.pago ? 'Pago' : 'Pendente'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`relatorio-${mes}-${ano}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
}

// --- KEYBOARD SHORTCUTS ---
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            resetForm();
            document.getElementById('inDesc').focus();
            showToast('Novo registro', 'info');
        }
        
        if (e.key === 'Escape') {
            const editId = document.getElementById('editId').value;
            if (editId) {
                resetForm();
                showToast('Edição cancelada', 'info');
            }
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentUser) {
                syncToCloud();
            }
        }
    });
}

// --- EXPORTS PARA O HTML ---
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
