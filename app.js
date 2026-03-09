const STORAGE_KEY = 'FINANCEIRO_PRO_V6';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// BANCO DE DADOS
let dados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    transacoes: [],
    categorias: ['Alimentação', 'Contas', 'Lazer'],
    metodos: ['Dinheiro', 'MERCADO PAGO']
};

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    render();
}

// IMPORTAR BACKUP (Mantendo compatibilidade com seu arquivo)
function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (json.db) {
                dados.transacoes = json.db.map(t => ({
                    id: t.id || Math.random(),
                    tipo: t.type,
                    desc: t.desc,
                    valor: t.val || 0,
                    categoria: t.cat || 'Geral',
                    metodo: t.meth || 'Dinheiro',
                    parc: t.label || '',
                    mesIdx: t.mIdx,
                    ano: t.year,
                    pago: t.pago || false
                }));
                dados.categorias = json.myCats || dados.categorias;
                dados.metodos = json.myMeths || dados.metodos;
            } else {
                dados = json;
            }
            salvar();
            location.reload();
        } catch (err) { alert("Erro no backup."); }
    };
    reader.readAsText(file);
}

function exportarBackup() {
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financeiro_backup.json';
    a.click();
}

// ADICIONAR REGISTRO
function adicionar() {
    const tipo = document.getElementById('inType').value;
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const cat = document.getElementById('inCat').value;
    const meth = document.getElementById('inMeth').value;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha descrição e valor.");

    const startIdx = MESES.indexOf(mes);
    for (let i = 0; i < parc; i++) {
        const curIdx = startIdx + i;
        dados.transacoes.push({
            id: Date.now() + i,
            tipo, desc, valor: val / parc,
            categoria: cat, metodo: meth,
            parc: parc > 1 ? `(${i + 1}/${parc})` : '',
            mesIdx: curIdx % 12,
            ano: ano + Math.floor(curIdx / 12),
            pago: false
        });
    }
    salvar();
    document.getElementById('inDesc').value = '';
    document.getElementById('inVal').value = '';
}

// GESTÃO DE LISTAS (ADD/REMOVE)
function addList(tipo, inputId) {
    const input = document.getElementById(inputId);
    const nome = input.value.trim().toUpperCase();
    if (nome && !dados[tipo].includes(nome)) {
        dados[tipo].push(nome);
        input.value = '';
        salvar();
    }
}

function removeList(tipo, index) {
    if (confirm("Remover este item?")) {
        dados[tipo].splice(index, 1);
        salvar();
    }
}

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) t.pago = !t.pago;
    salvar();
}

function excluir(id) {
    if (confirm("Excluir?")) {
        dados.transacoes = dados.transacoes.filter(x => x.id !== id);
        salvar();
    }
}

function limparTudo() {
    if (confirm("Apagar TUDO?")) {
        dados.transacoes = [];
        salvar();
    }
}

function render() {
    const m = MESES.indexOf(document.getElementById('fMonth').value);
    const y = parseInt(document.getElementById('fYear').value);

    const filtrados = dados.transacoes.filter(t => t.mesIdx === m && t.ano === y);
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);

    document.getElementById('totalIncome').innerText = inc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('totalExpense').innerText = exp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="transition-all ${t.pago ? 'opacity-30' : ''}">
            <td class="py-4 text-center">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400' : 'text-slate-800'}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="text-[8px] uppercase font-bold text-blue-500 tracking-tighter">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-bold text-sm ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
            <td class="text-right"><button onclick="excluir(${t.id})" class="text-slate-300 hover:text-rose-500 px-2 font-bold">✕</button></td>
        </tr>`).join('');

    // Render Lists
    const uiCat = document.getElementById('catListUI');
    const uiMeth = document.getElementById('methListUI');
    const inCat = document.getElementById('inCat');
    const inMeth = document.getElementById('inMeth');

    uiCat.innerHTML = dados.categorias.map((c, i) => `<span class="bg-slate-100 text-[8px] font-black p-1 px-2 rounded-lg flex items-center gap-1">${c} <button onclick="removeList('categorias', ${i})" class="text-rose-500">✕</button></span>`).join('');
    uiMeth.innerHTML = dados.metodos.map((m, i) => `<span class="bg-slate-100 text-[8px] font-black p-1 px-2 rounded-lg flex items-center gap-1">${m} <button onclick="removeList('metodos', ${i})" class="text-rose-500">✕</button></span>`).join('');
    
    inCat.innerHTML = dados.categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    inMeth.innerHTML = dados.metodos.map(m => `<option value="${m}">${m}</option>`).join('');
}

window.onload = () => {
    const agora = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
        el.value = MESES[agora.getMonth()];
    });
    document.getElementById('inYear').value = document.getElementById('fYear').value = agora.getFullYear();
    render();
};
