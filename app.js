// CHAVE ÚNICA PARA O NOVO SISTEMA
const STORAGE_KEY = 'FINANCEIRO_V7_FINAL';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// BANCO DE DADOS INICIAL
let dados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    transacoes: [],
    categorias: ['ALIMENTAÇÃO', 'CONTAS', 'LAZER'],
    metodos: ['DINHEIRO', 'MERCADO PAGO']
};

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    render();
}

// IMPORTAR BACKUP (COMPATÍVEL COM SEU JSON)
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
                    categoria: (t.cat || 'GERAL').toUpperCase(),
                    metodo: (t.meth || 'DINHEIRO').toUpperCase(),
                    parc: t.label || '',
                    mesIdx: t.mIdx,
                    ano: t.year,
                    pago: t.pago || false
                }));
                dados.categorias = (json.myCats || dados.categorias).map(c => c.toUpperCase());
                dados.metodos = (json.myMeths || dados.metodos).map(m => m.toUpperCase());
            } else {
                dados = json;
            }
            salvar();
            alert("Backup Restaurado!");
            location.reload();
        } catch (err) { alert("Erro ao ler o arquivo."); }
    };
    reader.readAsText(file);
}

function exportarBackup() {
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financeiro_${new Date().toLocaleDateString()}.json`;
    a.click();
}

// GESTÃO DE CATEGORIAS E BANCOS (ADICIONAR E APAGAR)
function addItemLista(tipo, inputId) {
    const input = document.getElementById(inputId);
    const valor = input.value.trim().toUpperCase();
    
    if (valor && !dados[tipo].includes(valor)) {
        dados[tipo].push(valor);
        input.value = '';
        salvar();
    }
}

function removerItemLista(tipo, item) {
    if (confirm(`Remover "${item}" da lista de opções?`)) {
        dados[tipo] = dados[tipo].filter(i => i !== item);
        salvar();
    }
}

// LÓGICA DE LANÇAMENTOS
function adicionar() {
    const tipo = document.getElementById('inType').value;
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const cat = document.getElementById('inCat').value;
    const meth = document.getElementById('inMeth').value;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha Descrição e Valor!");

    const startIdx = MESES.indexOf(mes);
    for (let i = 0; i < parc; i++) {
        const curIdx = startIdx + i;
        dados.transacoes.push({
            id: Date.now() + i + Math.random(),
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

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) t.pago = !t.pago;
    salvar();
}

function excluirTransacao(id) {
    if (confirm("Excluir este lançamento permanentemente?")) {
        dados.transacoes = dados.transacoes.filter(x => x.id !== id);
        salvar();
    }
}

function limparTudo() {
    if (confirm("⚠️ Isso apagará TODOS os dados de todos os meses. Continuar?")) {
        dados.transacoes = [];
        salvar();
    }
}

// RENDERIZAÇÃO DA UI
function render() {
    const mSelect = document.getElementById('fMonth').value;
    const ySelect = parseInt(document.getElementById('fYear').value);
    const mIdx = MESES.indexOf(mSelect);

    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === ySelect);
    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);

    document.getElementById('totalIncome').innerText = inc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('totalExpense').innerText = exp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Render Tabela
    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="transition-all ${t.pago ? 'opacity-30 bg-slate-50' : ''}">
            <td class="py-4 text-center">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400' : 'text-slate-800'}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="flex gap-2 mt-1">
                    <span class="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded uppercase">${t.metodo}</span>
                    <span class="text-[7px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">${t.categoria}</span>
                </div>
            </td>
            <td class="text-right font-black text-sm ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
            <td class="text-right">
                <button onclick="excluirTransacao(${t.id})" class="text-slate-200 hover:text-rose-500 transition px-2 text-lg font-bold">✕</button>
            </td>
        </tr>`).join('');

    // Atualizar Listas Visuais (Tags com botão de apagar)
    const renderTag = (item, tipo) => `
        <span class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[9px] font-black border border-slate-200 uppercase">
            ${item}
            <button onclick="removerItemLista('${tipo}', '${item}')" class="text-rose-400 hover:text-rose-600">✕</button>
        </span>`;

    document.getElementById('catListUI').innerHTML = dados.categorias.map(c => renderTag(c, 'categorias')).join('');
    document.getElementById('methListUI').innerHTML = dados.metodos.map(m => renderTag(m, 'metodos')).join('');

    // Atualizar Dropdowns do Formulário
    const populate = (id, list) => {
        const el = document.getElementById(id);
        const atual = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        if(list.includes(atual)) el.value = atual;
    };
    populate('inCat', dados.categorias);
    populate('inMeth', dados.metodos);
}

// INICIALIZAÇÃO
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
