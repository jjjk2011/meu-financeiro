// CHAVES OFICIAIS DO BANCO
const DB_NAME = 'financas_main_db_v2';
const DB_METHODS = 'financas_methods_db_v2';
const DB_CATS = 'financas_cats_db_v2';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Carregar dados iniciais
let transactions = JSON.parse(localStorage.getItem(DB_NAME)) || [];
let methods = JSON.parse(localStorage.getItem(DB_METHODS)) || ['Dinheiro'];
let categories = JSON.parse(localStorage.getItem(DB_CATS)) || ['Geral'];

function saveAll() {
    localStorage.setItem(DB_NAME, JSON.stringify(transactions));
    localStorage.setItem(DB_METHODS, JSON.stringify(methods));
    localStorage.setItem(DB_CATS, JSON.stringify(categories));
}

// IMPORTAÇÃO ESPECIAL PARA O SEU BACKUP (Lê 'val', 'meth', 'cat')
function importarBanco(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Detecta se é o seu backup específico (com campo 'db')
            if (data.db && Array.isArray(data.db)) {
                transactions = data.db.map(t => ({
                    id: t.id || Date.now() + Math.random(),
                    type: t.type,
                    desc: t.desc,
                    category: t.cat || 'Geral',
                    method: t.meth || 'Dinheiro',
                    value: t.val || 0,
                    installment: t.label || '(1/1)',
                    monthIndex: t.mIdx,
                    year: t.year,
                    pago: t.pago || false
                }));
                methods = data.myMeths || methods;
                categories = data.myCats || categories;
            } else {
                // Formato padrão
                transactions = data.transactions || [];
                methods = data.methods || [];
                categories = data.categories || [];
            }
            
            saveAll();
            alert("Backup do seu arquivo carregado com sucesso!");
            location.reload();
        } catch (err) { alert("Erro ao ler o arquivo de backup."); }
    };
    reader.readAsText(file);
}

function exportarBanco() {
    const backup = { transactions, methods, categories };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meu_financeiro_atualizado.json`;
    link.click();
}

// LANÇAMENTOS
function addEntry() {
    const type = document.getElementById('entryType').value;
    const desc = document.getElementById('entryDesc').value.trim();
    const value = Math.abs(parseFloat(document.getElementById('entryValue').value));
    const installments = parseInt(document.getElementById('entryInstallments').value) || 1;
    const cat = document.getElementById('entryCategory').value;
    const met = document.getElementById('entryMethod').value;
    const mon = document.getElementById('entryMonth').value;
    const yea = parseInt(document.getElementById('entryYear').value);

    if(!desc || isNaN(value)) return alert("Preencha descrição e valor.");

    const startIdx = MONTHS.indexOf(mon);

    for(let i=0; i < installments; i++) {
        const absIdx = startIdx + i;
        transactions.push({
            id: Date.now() + i + Math.random(),
            type, desc, category: cat, method: met,
            value: value / installments,
            installment: `(${i+1}/${installments})`,
            monthIndex: absIdx % 12,
            year: yea + Math.floor(absIdx / 12),
            pago: false
        });
    }
    saveAll(); updateUI();
    document.getElementById('entryDesc').value = '';
    document.getElementById('entryValue').value = '';
}

function togglePago(id) {
    const t = transactions.find(x => x.id === id);
    if(t) { t.pago = !t.pago; saveAll(); updateUI(); }
}

function deleteTransaction(id) {
    if(confirm("Excluir?")) { transactions = transactions.filter(t => t.id !== id); saveAll(); updateUI(); }
}

// RENDERIZAÇÃO
function renderSettings() {
    document.getElementById('entryCategory').innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('entryMethod').innerHTML = methods.map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('categoryListUI').innerHTML = categories.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border text-[10px] mb-1">
            <span>${c}</span>
            <button onclick="deleteCategory(${i})" class="text-red-500">X</button>
        </div>`).join('');
        
    document.getElementById('methodListUI').innerHTML = methods.map((m, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border text-[10px] mb-1">
            <span>${m}</span>
            <button onclick="deleteMethod(${i})" class="text-red-500">X</button>
        </div>`).join('');
}

function updateUI() {
    const filterM = document.getElementById('filterMonth').value;
    const filterY = parseInt(document.getElementById('filterYear').value);
    const mIdx = MONTHS.indexOf(filterM);

    const filtered = transactions.filter(t => t.monthIndex === mIdx && t.year === filterY);
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);

    document.getElementById('totalIncomeDisplay').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpenseDisplay').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('balanceDisplay').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('transactionTableUI').innerHTML = filtered.sort((a,b) => a.pago - b.pago).map(t => `
        <tr class="text-xs transition-all ${t.pago ? 'opacity-40 bg-slate-50/50' : ''}">
            <td class="py-4 text-center">
                <button onclick="togglePago(${t.id})" 
                    class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">
                    ✓
                </button>
            </td>
            <td class="py-4 pl-2">
                <div class="font-bold ${t.pago ? 'line-through' : ''}">${t.desc} <span class="text-[8px] font-normal text-slate-400">${t.installment}</span></div>
                <div class="text-[8px] uppercase font-bold text-blue-500">${t.method} | ${t.category}</div>
            </td>
            <td class="text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right pr-2">
                <button onclick="deleteTransaction(${t.id})" class="text-slate-300 hover:text-red-500 text-lg font-bold">✕</button>
            </td>
        </tr>`).join('');
}

function addNewCategory() { const n = prompt("Nova categoria:"); if(n) { categories.push(n); saveAll(); renderSettings(); } }
function addNewMethod() { const n = prompt("Novo Banco:"); if(n) { methods.push(n); saveAll(); renderSettings(); } }
function deleteCategory(i) { if(confirm("Apagar?")) { categories.splice(i,1); saveAll(); renderSettings(); } }
function deleteMethod(i) { if(confirm("Apagar?")) { methods.splice(i,1); saveAll(); renderSettings(); } }

window.onload = function() {
    const now = new Date();
    ['entryMonth', 'filterMonth'].forEach(id => {
        const el = document.getElementById(id);
        MONTHS.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
        el.value = MONTHS[now.getMonth()];
    });
    document.getElementById('entryYear').value = document.getElementById('filterYear').value = now.getFullYear();
    renderSettings();
    updateUI();
};
