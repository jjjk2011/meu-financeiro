// --- CONFIGURAÇÃO DE CHAVES (PADRONIZAÇÃO DEFINITIVA) ---
const DB_NAME = 'financas_main_db_v1';
const DB_METHODS = 'financas_methods_db_v1';
const DB_CATS = 'financas_cats_db_v1';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/**
 * FUNÇÃO DE RESGATE: 
 * Procura dados nas chaves antigas (do seu GitHub original) e migra para o novo formato.
 */
function resgatarDadosAntigos() {
    const antigasDespesas = JSON.parse(localStorage.getItem('expenses')) || [];
    const antigasReceitas = JSON.parse(localStorage.getItem('incomes')) || [];
    const antigosCartoes = JSON.parse(localStorage.getItem('cards')) || [];

    // Se o banco novo estiver vazio e acharmos dados no antigo, fazemos a migração
    if (localStorage.getItem(DB_NAME) === null && (antigasDespesas.length > 0 || antigasReceitas.length > 0)) {
        console.log("Resgatando dados antigos...");
        
        let novasTransacoes = [];

        // Converte Receitas antigas
        antigasReceitas.forEach(inc => {
            novasTransacoes.push({
                id: Date.now() + Math.random(),
                type: 'income',
                desc: inc.desc,
                value: inc.value,
                category: 'Salário',
                method: 'Dinheiro',
                monthIndex: MONTHS.indexOf(inc.month),
                year: inc.year,
                pago: true,
                installment: '1/1'
            });
        });

        // Converte Despesas antigas
        antigasDespesas.forEach(exp => {
            novasTransacoes.push({
                id: Date.now() + Math.random(),
                type: 'expense',
                desc: exp.desc,
                value: exp.value,
                category: 'Outros',
                method: exp.card || 'Dinheiro',
                monthIndex: MONTHS.indexOf(exp.month),
                year: exp.year,
                pago: false,
                installment: exp.installment || '1/1'
            });
        });

        localStorage.setItem(DB_NAME, JSON.stringify(novasTransacoes));
        if (antigosCartoes.length > 0) localStorage.setItem(DB_METHODS, JSON.stringify(antigosCartoes));
        
        alert("Dados antigos recuperados com sucesso!");
    }
}

// Executa o resgate antes de carregar o app
resgatarDadosAntigos();

// Carregamento dos dados (já migrados ou novos)
let transactions = JSON.parse(localStorage.getItem(DB_NAME)) || [];
let methods = JSON.parse(localStorage.getItem(DB_METHODS)) || ['Dinheiro', 'Nubank', 'Itaú'];
let categories = JSON.parse(localStorage.getItem(DB_CATS)) || ['Alimentação', 'Moradia', 'Lazer', 'Saúde', 'Salário'];

function saveAll() {
    localStorage.setItem(DB_NAME, JSON.stringify(transactions));
    localStorage.setItem(DB_METHODS, JSON.stringify(methods));
    localStorage.setItem(DB_CATS, JSON.stringify(categories));
}

// --- FUNÇÕES DE BACKUP ---
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
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(confirm("Substituir tudo pelos dados do arquivo?")) {
                transactions = data.transactions || [];
                methods = data.methods || [];
                categories = data.categories || [];
                saveAll();
                location.reload();
            }
        } catch (err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(file);
}

// --- GESTÃO DE MÉTODOS E CATEGORIAS ---
function addNewCategory() {
    const n = prompt("Nova categoria:");
    if(n && !categories.includes(n)) { categories.push(n); saveAll(); renderSettings(); }
}
function editCategory(i) {
    const old = categories[i];
    const n = prompt("Editar:", old);
    if(n) { categories[i] = n; transactions.forEach(t => { if(t.category === old) t.category = n; }); saveAll(); renderSettings(); updateUI(); }
}
function deleteCategory(i) { if(confirm("Excluir?")) { categories.splice(i, 1); saveAll(); renderSettings(); } }

function addNewMethod() {
    const n = prompt("Novo Cartão/Banco:");
    if(n && !methods.includes(n)) { methods.push(n); saveAll(); renderSettings(); }
}
function editMethod(i) {
    const old = methods[i];
    const n = prompt("Editar:", old);
    if(n) { methods[i] = n; transactions.forEach(t => { if(t.method === old) t.method = n; }); saveAll(); renderSettings(); updateUI(); }
}
function deleteMethod(i) { if(confirm("Excluir?")) { methods.splice(i, 1); saveAll(); renderSettings(); } }

// --- LANÇAMENTOS ---
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
            installment: `${i+1}/${installments}`,
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
    const item = transactions.find(t => t.id === id);
    if(item) { item.pago = !item.pago; saveAll(); updateUI(); }
}

function deleteTransaction(id) {
    if(confirm("Excluir permanentemente?")) { transactions = transactions.filter(t => t.id !== id); saveAll(); updateUI(); }
}

// --- RENDERIZAÇÃO ---
function renderSettings() {
    document.getElementById('entryCategory').innerHTML = categories.sort().map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('entryMethod').innerHTML = methods.sort().map(m => `<option value="${m}">${m}</option>`).join('');
    
    document.getElementById('categoryListUI').innerHTML = categories.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border text-[10px]">
            <span>${c}</span>
            <div class="flex gap-2"><button onclick="editCategory(${i})" class="text-blue-500 font-bold">ED</button><button onclick="deleteCategory(${i})" class="text-red-400 font-bold">X</button></div>
        </div>`).join('');
        
    document.getElementById('methodListUI').innerHTML = methods.map((m, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border text-[10px]">
            <span>${m}</span>
            <div class="flex gap-2"><button onclick="editMethod(${i})" class="text-blue-500 font-bold">ED</button><button onclick="deleteMethod(${i})" class="text-red-400 font-bold">X</button></div>
        </div>`).join('');
}

function updateUI() {
    const fM = document.getElementById('filterMonth').value;
    const fY = parseInt(document.getElementById('filterYear').value);
    const mIdx = MONTHS.indexOf(fM);

    const filtered = transactions.filter(t => t.monthIndex === mIdx && t.year === fY);
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
            <td>
                <div class="font-bold ${t.pago ? 'line-through text-slate-400' : ''}">${t.desc} <span class="text-[9px] font-normal text-slate-400">${t.installment}</span></div>
                <div class="text-[8px] uppercase font-bold text-blue-500">${t.method} | ${t.category}</div>
            </td>
            <td class="text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right"><button onclick="deleteTransaction(${t.id})" class="text-slate-300 hover:text-red-500 px-1 text-lg">✕</button></td>
        </tr>`).join('');
}

(function init() {
    const now = new Date();
    ['entryMonth', 'filterMonth'].forEach(id => {
        const el = document.getElementById(id);
        MONTHS.forEach(m => { el.innerHTML += `<option value="${m}">${m}</option>`; });
        el.value = MONTHS[now.getMonth()];
    });
    document.getElementById('entryYear').value = document.getElementById('filterYear').value = now.getFullYear();
    renderSettings();
    updateUI();
})();
