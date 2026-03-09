// --- CONFIGURAÇÃO DE CHAVES PADRONIZADAS ---
const DB_NAME = 'financas_main_db_v1';
const DB_METHODS = 'financas_methods_db_v1';
const DB_CATS = 'financas_cats_db_v1';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// --- CARREGAMENTO INICIAL COM TRATAMENTO DE ERROS ---
let transactions = JSON.parse(localStorage.getItem(DB_NAME)) || [];
let methods = JSON.parse(localStorage.getItem(DB_METHODS)) || ['Dinheiro', 'MERCADO PAGO', 'NOVUCARD'];
let categories = JSON.parse(localStorage.getItem(DB_CATS)) || ['Alimentação', 'Contas', 'Lazer'];

function saveAll() {
    localStorage.setItem(DB_NAME, JSON.stringify(transactions));
    localStorage.setItem(DB_METHODS, JSON.stringify(methods));
    localStorage.setItem(DB_CATS, JSON.stringify(categories));
}

// --- FUNÇÃO DE IMPORTAÇÃO CORRIGIDA PARA O SEU BACKUP ---
function importarBanco(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Verifica se o backup veio do formato antigo (que você me enviou)
            if (data.db && Array.isArray(data.db)) {
                // Traduz o formato "curto" (val, meth) para o formato "extenso" (value, method)
                transactions = data.db.map(t => ({
                    id: t.id || Date.now() + Math.random(),
                    type: t.type,
                    desc: t.desc,
                    category: t.cat || 'Geral',
                    method: t.meth || 'Dinheiro',
                    value: t.val || 0,
                    installment: t.label || '1/1',
                    monthIndex: t.mIdx,
                    year: t.year,
                    pago: t.pago || false
                }));
                methods = data.myMeths || methods;
                categories = data.myCats || categories;
            } else {
                // Formato novo
                transactions = data.transactions || [];
                methods = data.methods || [];
                categories = data.categories || [];
            }
            
            saveAll();
            alert("Backup carregado com sucesso!");
            location.reload();
        } catch (err) { 
            alert("Erro ao ler o arquivo. Verifique se é o arquivo .json correto."); 
        }
    };
    reader.readAsText(file);
}

function exportarBanco() {
    const backup = { transactions, methods, categories, date: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_financeiro_atualizado.json`;
    link.click();
}

// --- GESTÃO DE INTERFACE ---
function renderSettings() {
    const catSelect = document.getElementById('entryCategory');
    const methSelect = document.getElementById('entryMethod');
    
    if(catSelect) catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if(methSelect) methSelect.innerHTML = methods.map(m => `<option value="${m}">${m}</option>`).join('');
    
    const catList = document.getElementById('categoryListUI');
    const methList = document.getElementById('methodListUI');

    if(catList) catList.innerHTML = categories.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border mb-2 text-[10px]">
            <span>${c}</span>
            <button onclick="deleteCategory(${i})" class="text-red-500 font-bold">X</button>
        </div>`).join('');
        
    if(methList) methList.innerHTML = methods.map((m, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border mb-2 text-[10px]">
            <span>${m}</span>
            <button onclick="deleteMethod(${i})" class="text-red-500 font-bold">X</button>
        </div>`).join('');
}

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
    saveAll();
    updateUI();
    document.getElementById('entryDesc').value = '';
    document.getElementById('entryValue').value = '';
}

function togglePago(id) {
    const t = transactions.find(x => x.id === id);
    if(t) { t.pago = !t.pago; saveAll(); updateUI(); }
}

function deleteTransaction(id) {
    if(confirm("Excluir?")) {
        transactions = transactions.filter(t => t.id !== id);
        saveAll();
        updateUI();
    }
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
        <tr class="text-xs ${t.pago ? 'opacity-40' : ''}">
            <td class="py-3 text-center">
                <button onclick="togglePago(${t.id})" class="w-5 h-5 rounded-full border flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}">✓</button>
            </td>
            <td class="py-2">
                <div class="font-bold ${t.pago ? 'line-through' : ''}">${t.desc} <span class="text-[9px] font-normal">${t.installment || ''}</span></div>
                <div class="text-[8px] uppercase text-blue-500 font-bold">${t.method} | ${t.category}</div>
            </td>
            <td class="text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right px-2">
                <button onclick="deleteTransaction(${t.id})" class="text-slate-300 hover:text-red-500">✕</button>
            </td>
        </tr>`).join('');
}

function addNewCategory() {
    const n = prompt("Nova categoria:");
    if(n) { categories.push(n); saveAll(); renderSettings(); }
}

function addNewMethod() {
    const n = prompt("Novo Cartão/Banco:");
    if(n) { methods.push(n); saveAll(); renderSettings(); }
}

function deleteCategory(i) { if(confirm("Apagar?")) { categories.splice(i, 1); saveAll(); renderSettings(); } }
function deleteMethod(i) { if(confirm("Apagar?")) { methods.splice(i, 1); saveAll(); renderSettings(); } }

// --- INICIALIZAÇÃO ---
window.onload = function() {
    const now = new Date();
    const selMon = document.getElementById('entryMonth');
    const filMon = document.getElementById('filterMonth');
    
    MONTHS.forEach(m => {
        selMon.innerHTML += `<option value="${m}">${m}</option>`;
        filMon.innerHTML += `<option value="${m}">${m}</option>`;
    });

    selMon.value = filMon.value = MONTHS[now.getMonth()];
    document.getElementById('entryYear').value = document.getElementById('filterYear').value = now.getFullYear();

    renderSettings();
    updateUI();
};
