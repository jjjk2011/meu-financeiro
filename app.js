// CONFIGURAÇÕES GLOBAIS
const STORAGE_KEY = 'MEU_FINANCEIRO_V5';
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// BANCO DE DADOS INICIAL
let dados = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
    transacoes: [],
    categorias: ['Alimentação', 'Contas', 'Lazer', 'Saúde', 'Transporte'],
    metodos: ['Dinheiro', 'MERCADO PAGO', 'NOVUCARD']
};

function salvar() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    render();
}

// IMPORTAÇÃO CRÍTICA (Lê exatamente o seu backup)
function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            
            // Se o arquivo tiver o formato 'db' que você enviou
            if (json.db && Array.isArray(json.db)) {
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
                if (json.myCats) dados.categorias = json.myCats;
                if (json.myMeths) dados.metodos = json.myMeths;
            } else {
                dados = json;
            }

            salvar();
            alert("Backup carregado com sucesso!");
            location.reload();
        } catch (err) {
            alert("Erro ao ler backup. Verifique o arquivo.");
        }
    };
    reader.readAsText(file);
}

function exportarBackup() {
    const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'backup_financeiro_v5.json';
    link.click();
}

// LÓGICA DE INTERFACE
function adicionar() {
    const tipo = document.getElementById('inType').value;
    const desc = document.getElementById('inDesc').value;
    const val = parseFloat(document.getElementById('inVal').value);
    const parc = parseInt(document.getElementById('inParc').value) || 1;
    const cat = document.getElementById('inCat').value;
    const meth = document.getElementById('inMeth').value;
    const mes = document.getElementById('inMonth').value;
    const ano = parseInt(document.getElementById('inYear').value);

    if (!desc || isNaN(val)) return alert("Preencha descrição e valor!");

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

function togglePago(id) {
    const t = dados.transacoes.find(x => x.id === id);
    if (t) t.pago = !t.pago;
    salvar();
}

function excluir(id) {
    if (confirm("Deseja apagar este item?")) {
        dados.transacoes = dados.transacoes.filter(x => x.id !== id);
        salvar();
    }
}

function limparTudo() {
    if (confirm("Apagar TODO o histórico?")) {
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
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400' : 'text-slate-800'}">${t.desc} <span class="text-[10px] font-normal opacity-50">${t.parc}</span></div>
                <div class="text-[9px] uppercase font-bold text-blue-500 tracking-tighter">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-bold text-sm ${t.tipo === 'income' ? 'text-emerald-500' : 'text-rose-500'}">
                ${t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
            <td class="text-right">
                <button onclick="excluir(${t.id})" class="text-slate-300 hover:text-rose-500 px-2 font-bold text-lg">✕</button>
            </td>
        </tr>
    `).join('');

    // Update Dropdowns
    const updateSelect = (id, list) => {
        const el = document.getElementById(id);
        const val = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        if (list.includes(val)) el.value = val;
    };
    updateSelect('inCat', dados.categorias);
    updateSelect('inMeth', dados.metodos);
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
