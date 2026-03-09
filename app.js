const DB_KEY = 'financeiro_v4_data';
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let db = JSON.parse(localStorage.getItem(DB_KEY)) || {
    transactions: [],
    methods: ['Dinheiro', 'MERCADO PAGO'],
    categories: ['Alimentação', 'Contas']
};

function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function exportarBanco() {
    const blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup_financeiro.json';
    a.click();
}

function importarBanco(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            // Lógica para aceitar o backup do usuário que usa 'db' e 'val'
            if (data.db && Array.isArray(data.db)) {
                db.transactions = data.db.map(t => ({
                    id: t.id || Math.random(),
                    type: t.type,
                    desc: t.desc,
                    category: t.cat || 'Geral',
                    method: t.meth || 'Dinheiro',
                    value: t.val || 0,
                    label: t.label || '',
                    mIdx: t.mIdx,
                    year: t.year,
                    pago: t.pago || false
                }));
                if(data.myMeths) db.methods = data.myMeths;
                if(data.myCats) db.categories = data.myCats;
            } else {
                db = data;
            }
            
            save();
            alert("Backup carregado com sucesso!");
            location.reload();
        } catch (err) { alert("Erro no arquivo."); }
    };
    reader.readAsText(file);
}

function addEntry() {
    const type = document.getElementById('entryType').value;
    const desc = document.getElementById('entryDesc').value;
    const val = parseFloat(document.getElementById('entryValue').value);
    const inst = parseInt(document.getElementById('entryInstallments').value) || 1;
    const cat = document.getElementById('entryCategory').value;
    const meth = document.getElementById('entryMethod').value;
    const mon = document.getElementById('entryMonth').value;
    const year = parseInt(document.getElementById('entryYear').value);

    if(!desc || isNaN(val)) return alert("Preencha tudo.");

    const startIdx = MONTHS.indexOf(mon);
    for(let i=0; i<inst; i++) {
        const currentIdx = startIdx + i;
        db.transactions.push({
            id: Date.now() + i,
            type, desc, category: cat, method: meth,
            value: val / inst,
            label: inst > 1 ? `(${i+1}/${inst})` : '',
            mIdx: currentIdx % 12,
            year: year + Math.floor(currentIdx / 12),
            pago: false
        });
    }
    save(); updateUI();
}

function togglePago(id) {
    const t = db.transactions.find(x => x.id === id);
    if(t) t.pago = !t.pago;
    save(); updateUI();
}

function deleteItem(id) {
    if(confirm("Excluir?")) {
        db.transactions = db.transactions.filter(x => x.id !== id);
        save(); updateUI();
    }
}

function limparTodoOBanco() {
    if(confirm("Apagar TUDO?")) {
        db.transactions = [];
        save(); updateUI();
    }
}

function updateUI() {
    const m = MONTHS.indexOf(document.getElementById('filterMonth').value);
    const y = parseInt(document.getElementById('filterYear').value);

    const filtered = db.transactions.filter(t => t.mIdx === m && t.year === y);
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);

    document.getElementById('totalIncomeDisplay').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpenseDisplay').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('balanceDisplay').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('transactionTableUI').innerHTML = filtered.map(t => `
        <tr class="${t.pago ? 'opacity-40' : ''}">
            <td class="py-3 text-center">
                <button onclick="togglePago(${t.id})" class="w-5 h-5 rounded-full border ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td>
                <div class="font-bold ${t.pago ? 'line-through' : ''}">${t.desc} <span class="text-[9px] font-normal opacity-50">${t.label}</span></div>
                <div class="text-[8px] uppercase font-bold text-blue-500">${t.method} | ${t.category}</div>
            </td>
            <td class="text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right"><button onclick="deleteItem(${t.id})" class="text-slate-300 px-2">✕</button></td>
        </tr>`).join('');

    renderSettings();
}

function renderSettings() {
    document.getElementById('entryCategory').innerHTML = db.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('entryMethod').innerHTML = db.methods.map(m => `<option value="${m}">${m}</option>`).join('');
    document.getElementById('categoryListUI').innerHTML = db.categories.map(c => `<div class="text-[9px] bg-slate-100 p-1 px-2 rounded uppercase font-bold">${c}</div>`).join('');
    document.getElementById('methodListUI').innerHTML = db.methods.map(m => `<div class="text-[9px] bg-slate-100 p-1 px-2 rounded uppercase font-bold">${m}</div>`).join('');
}

function addNewCategory() { const n = prompt("Nova:"); if(n) { db.categories.push(n); save(); updateUI(); } }
function addNewMethod() { const n = prompt("Novo:"); if(n) { db.methods.push(n); save(); updateUI(); } }

window.onload = () => {
    const now = new Date();
    ['entryMonth', 'filterMonth'].forEach(id => {
        const el = document.getElementById(id);
        MONTHS.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
        el.value = MONTHS[now.getMonth()];
    });
    document.getElementById('entryYear').value = document.getElementById('filterYear').value = now.getFullYear();
    updateUI();
};
