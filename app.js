/**
 * SISTEMA FINANCEIRO PADRONIZADO v2.0
 * Chaves de armazenamento fixas para evitar perda de dados
 */
const DB_NAME = 'financas_main_db_v1';
const DB_METHODS = 'financas_methods_db_v1';
const DB_CATS = 'financas_cats_db_v1';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// --- CARREGAMENTO INICIAL ---
let transactions = JSON.parse(localStorage.getItem(DB_NAME)) || [];
let methods = JSON.parse(localStorage.getItem(DB_METHODS)) || ['Dinheiro', 'Nubank', 'Itaú'];
let categories = JSON.parse(localStorage.getItem(DB_CATS)) || ['Alimentação', 'Moradia', 'Lazer', 'Saúde', 'Salário'];

function saveAll() {
    localStorage.setItem(DB_NAME, JSON.stringify(transactions));
    localStorage.setItem(DB_METHODS, JSON.stringify(methods));
    localStorage.setItem(DB_CATS, JSON.stringify(categories));
}

// --- BACKUP E SINCRONIZAÇÃO ---
function exportarBanco() {
    const backup = { transactions, methods, categories, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meu_financeiro_backup.json`;
    link.click();
}

function importarBanco(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(confirm("ATENÇÃO: Isso substituirá todos os dados atuais. Deseja continuar?")) {
                transactions = data.transactions || [];
                methods = data.methods || [];
                categories = data.categories || [];
                saveAll();
                location.reload();
            }
        } catch (err) { alert("Arquivo de backup inválido."); }
    };
    reader.readAsText(event.target.files[0]);
}

// --- GESTÃO DE MÉTODOS E CATEGORIAS ---
function addNewCategory() {
    const n = prompt("Nome da nova categoria:");
    if(n && !categories.includes(n)) { categories.push(n); saveAll(); renderSettings(); }
}
function editCategory(i) {
    const old = categories[i];
    const n = prompt("Editar categoria:", old);
    if(n && n !== old) {
        categories[i] = n;
        transactions.forEach(t => { if(t.category === old) t.category = n; });
        saveAll(); renderSettings(); updateUI();
    }
}
function deleteCategory(i) {
    if(confirm(`Excluir categoria "${categories[i]}"?`)) { categories.splice(i, 1); saveAll(); renderSettings(); }
}

function addNewMethod() {
    const n = prompt("Nome do novo Cartão ou Banco:");
    if(n && !methods.includes(n)) { methods.push(n); saveAll(); renderSettings(); }
}
function editMethod(i) {
    const old = methods[i];
    const n = prompt("Editar Cartão/Banco:", old);
    if(n && n !== old) {
        methods[i] = n;
        transactions.forEach(t => { if(t.method === old) t.method = n; });
        saveAll(); renderSettings(); updateUI();
    }
}
function deleteMethod(i) {
    if(confirm(`Excluir "${methods[i]}"?`)) { methods.splice(i, 1); saveAll(); renderSettings(); }
}

// --- LÓGICA DE LANÇAMENTOS ---
function addEntry() {
    const type = document.getElementById('entryType').value;
    const desc = document.getElementById('entryDesc').value.trim();
    const value = Math.abs(parseFloat(document.getElementById('entryValue').value));
    const installments = parseInt(document.getElementById('entryInstallments').value) || 1;
    const cat = document.getElementById('entryCategory').value;
    const met = document.getElementById('entryMethod').value;
    const mon = document.getElementById('entryMonth').value;
    const yea = parseInt(document.getElementById('entryYear').value);

    if(!desc || isNaN(value)) return alert("Por favor, preencha descrição e valor.");

    const startIdx = MONTHS.indexOf(mon);

    for(let i=0; i < installments; i++) {
        const absIdx = startIdx + i;
        transactions.push({
            id: Date.now() + i + Math.random(),
            type, desc, category: cat, method: met,
            value: value / installments,
            installment: `${i+1}/${installments}`,
            monthIndex: absIdx % 12,
            year: yea + Math.floor(absIdx / 12),
            pago: false
        });
    }
    saveAll();
    updateUI();
    document.getElementById('entryDesc').value = '';
    document.getElementById('entryValue').value = '';
}

function togglePago(id) {
    const item = transactions.find(t => t.id === id);
    if(item) { item.pago = !item.pago; saveAll(); updateUI(); }
}

function deleteTransaction(id) {
    if(confirm("Excluir este lançamento permanentemente?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveAll();
        updateUI();
    }
}

// --- RENDERIZAÇÃO DE TELA ---
function renderSettings() {
    // Dropdowns
    document.getElementById('entryCategory').innerHTML = categories.sort().map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('entryMethod').innerHTML = methods.sort().map(m => `<option value="${m}">${m}</option>`).join('');
    
    // Listas de Gerenciamento
    document.getElementById('categoryListUI').innerHTML = categories.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-xl border border-slate-100 text-[11px]">
            <span class="font-medium text-slate-700">${c}</span>
            <div class="flex gap-3">
                <button onclick="editCategory(${i})" class="text-blue-500 font-bold">EDIT</button>
                <button onclick="deleteCategory(${i})" class="text-red-400 font-bold">SAIR</button>
            </div>
        </div>`).join('');
        
    document.getElementById('methodListUI').innerHTML = methods.map((m, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-xl border border-slate-100 text-[11px]">
            <span class="font-medium text-slate-700">${m}</span>
            <div class="flex gap-3">
                <button onclick="editMethod(${i})" class="text-blue-500 font-bold">EDIT</button>
                <button onclick="deleteMethod(${i})" class="text-red-400 font-bold">SAIR</button>
            </div>
        </div>`).join('');
}

function updateUI() {
    const filterM = document.getElementById('filterMonth').value;
    const filterY = parseInt(document.getElementById('filterYear').value);
    const mIdx = MONTHS.indexOf(filterM);

    const filtered = transactions.filter(t => t.monthIndex === mIdx && t.year === filterY);
    
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
    const balance = inc - exp;

    document.getElementById('totalIncomeDisplay').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpenseDisplay').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('balanceDisplay').innerText = balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    // Estilo do card de saldo
    const bCard = document.getElementById('balanceCard');
    bCard.className = `bg-white p-6 rounded-3xl shadow-lg border-2 ${balance >= 0 ? 'border-emerald-100 text-emerald-600' : 'border-rose-100 text-rose-600'}`;

    document.getElementById('transactionTableUI').innerHTML = filtered.sort((a,b) => a.pago - b.pago).map(t => `
        <tr class="text-xs transition-all ${t.pago ? 'opacity-40 bg-slate-50/50' : ''}">
            <td class="py-4 text-center">
                <button onclick="togglePago(${t.id})" 
                    class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white shadow-inner' : 'border-slate-300 text-transparent hover:border-emerald-400'}">
                    <span class="text-[10px]">✓</span>
                </button>
            </td>
            <td class="py-4 pl-2">
                <div class="font-bold text-slate-800 ${t.pago ? 'line-through' : ''}">${t.desc}</div>
                <div class="flex items-center gap-1 mt-1">
                    <span class="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">${t.category}</span>
                    <span class="text-[8px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-600 font-bold uppercase">${t.method}</span>
                    <span class="text-[8px] text-slate-400 font-medium ml-1">${t.installment}</span>
                </div>
            </td>
            <td class="text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right pr-2">
                <button onclick="deleteTransaction(${t.id})" class="text-slate-300 hover:text-red-500 transition-colors font-bold text-lg">✕</button>
            </td>
        </tr>`).join('');
}

// --- INICIALIZAÇÃO ---
(function init() {
    const now = new Date();
    ['entryMonth', 'filterMonth'].forEach(id => {
        const el = document.getElementById(id);
        MONTHS.forEach(m => {
            const opt = document.createElement('option');
            opt.value = opt.innerText = m;
            el.appendChild(opt);
        });
        el.value = MONTHS[now.getMonth()];
    });
    
    document.getElementById('entryYear').value = now.getFullYear();
    document.getElementById('filterYear').value = now.getFullYear();

    renderSettings();
    updateUI();
})();
