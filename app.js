// --- CHAVES DO BANCO DE DADOS ---
const STORAGE_DATA = 'MEU_FIN_BANCO_V1';
const STORAGE_CATS = 'MEU_FIN_CATS_V1';
const STORAGE_METH = 'MEU_FIN_METH_V1';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// --- CARREGAMENTO INICIAL ---
let db = JSON.parse(localStorage.getItem(STORAGE_DATA)) || [];
let myCats = JSON.parse(localStorage.getItem(STORAGE_CATS)) || ['Alimentação', 'Contas', 'Lazer'];
let myMeths = JSON.parse(localStorage.getItem(STORAGE_METH)) || ['Dinheiro', 'Cartão'];

function autoSave() {
    localStorage.setItem(STORAGE_DATA, JSON.stringify(db));
    localStorage.setItem(STORAGE_CATS, JSON.stringify(myCats));
    localStorage.setItem(STORAGE_METH, JSON.stringify(myMeths));
}

// --- SISTEMA DE BACKUP ---
function exportarBackup() {
    const backup = { db, myCats, myMeths, version: '1.0' };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financeiro_${new Date().toLocaleDateString()}.json`;
    a.click();
}

function importarBackup(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if(confirm("Deseja restaurar este backup? Isso apagará os dados atuais.")) {
                db = json.db || [];
                myCats = json.myCats || [];
                myMeths = json.myMeths || [];
                autoSave();
                location.reload();
            }
        } catch(err) { alert("Arquivo inválido."); }
    };
    reader.readAsText(event.target.files[0]);
}

// --- GESTÃO DE CATEGORIAS ---
function addCat() { 
    let n = prompt("Nome da nova Categoria:"); 
    if(n && !myCats.includes(n)) { 
        myCats.push(n); 
        autoSave(); 
        renderSettings(); 
    } 
}
function deleteCat(index) {
    if(confirm(`Apagar categoria "${myCats[index]}"?`)) {
        myCats.splice(index, 1);
        autoSave();
        renderSettings();
    }
}

// --- GESTÃO DE MÉTODOS ---
function addMeth() { 
    let n = prompt("Novo Cartão ou Banco:"); 
    if(n && !myMeths.includes(n)) { 
        myMeths.push(n); 
        autoSave(); 
        renderSettings(); 
    } 
}
function deleteMeth(index) {
    if(confirm(`Apagar cartão/banco "${myMeths[index]}"?`)) {
        myMeths.splice(index, 1);
        autoSave();
        renderSettings();
    }
}

// --- LANÇAMENTOS ---
function saveEntry() {
    const type = document.getElementById('inType').value;
    const desc = document.getElementById('inDesc').value.trim();
    const val = Math.abs(parseFloat(document.getElementById('inVal').value));
    const inst = parseInt(document.getElementById('inInst').value) || 1;
    const cat = document.getElementById('inCat').value;
    const meth = document.getElementById('inMeth').value;
    const mName = document.getElementById('inMonth').value;
    const year = parseInt(document.getElementById('inYear').value);

    if(!desc || isNaN(val)) return alert("Preencha descrição e valor.");

    const startIdx = MONTHS.indexOf(mName);

    for(let i=0; i<inst; i++) {
        const curIdx = startIdx + i;
        db.push({
            id: Date.now() + i,
            type, desc, cat, meth,
            val: val / inst,
            label: inst > 1 ? `(${i+1}/${inst})` : '',
            mIdx: curIdx % 12,
            year: year + Math.floor(curIdx / 12)
        });
    }
    autoSave();
    refresh();
    document.getElementById('inDesc').value = "";
    document.getElementById('inVal').value = "";
}

function deleteRow(id) {
    if(confirm("Excluir este registro?")) { 
        db = db.filter(i => i.id !== id); 
        autoSave(); 
        refresh(); 
    }
}

// --- ATUALIZAÇÃO DA TELA ---
function renderSettings() {
    // Atualiza Dropdowns
    document.getElementById('inCat').innerHTML = myCats.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('inMeth').innerHTML = myMeths.map(m => `<option value="${m}">${m}</option>`).join('');
    
    // Atualiza Listas de Gestão
    document.getElementById('listCats').innerHTML = myCats.map((c, i) => `
        <div class="flex justify-between items-center bg-slate-50 p-2 rounded-xl border text-[10px] font-bold">
            <span class="text-slate-600 uppercase tracking-tighter">${c}</span>
            <button onclick="deleteCat(${i})" class="text-rose-400 hover:text-rose-600">APAGAR</button>
        </div>`).join('');

    document.getElementById('listMeths').innerHTML = myMeths.map((m, i) => `
        <div class="flex justify-between items-center bg-blue-50 p-2 rounded-xl border border-blue-100 text-[10px] font-bold">
            <span class="text-blue-700 uppercase tracking-tighter">${m}</span>
            <button onclick="deleteMeth(${i})" class="text-rose-400 hover:text-rose-600">APAGAR</button>
        </div>`).join('');
}

function refresh() {
    const selM = MONTHS.indexOf(document.getElementById('filterM').value);
    const selY = parseInt(document.getElementById('filterY').value);
    const filtered = db.filter(i => i.mIdx === selM && i.year === selY);
    
    const inc = filtered.filter(i => i.type === 'income').reduce((s, i) => s + i.val, 0);
    const exp = filtered.filter(i => i.type === 'expense').reduce((s, i) => s + i.val, 0);

    document.getElementById('displayIncome').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('displayExpense').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('displayBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('tableBody').innerHTML = filtered.map(item => `
        <tr class="text-sm">
            <td class="py-4">
                <div class="font-bold text-slate-800">${item.desc} <span class="text-[10px] text-slate-400 font-normal">${item.label}</span></div>
                <div class="flex gap-1 mt-1">
                    <span class="text-[9px] bg-slate-100 px-1 rounded font-bold text-slate-500 border uppercase">${item.cat}</span>
                    <span class="text-[9px] bg-blue-50 text-blue-600 px-1 rounded font-bold border border-blue-100 uppercase">${item.meth}</span>
                </div>
            </td>
            <td class="text-right font-bold ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${item.val.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right">
                <button onclick="deleteRow(${item.id})" class="text-slate-200 hover:text-rose-500 px-2 font-bold transition">✕</button>
            </td>
        </tr>`).join('');
}

// INICIALIZAÇÃO AUTOMÁTICA
(function init() {
    const now = new Date();
    ['inMonth', 'filterM'].forEach(id => {
        const el = document.getElementById(id);
        MONTHS.forEach(m => { el.innerHTML += `<option value="${m}">${m}</option>`; });
        el.value = MONTHS[now.getMonth()];
    });
    ['inYear', 'filterY'].forEach(id => document.getElementById(id).value = now.getFullYear());
    renderSettings();
    refresh();
})();