// ... (mantenha todo o código anterior de login, sync e render)

// --- LÓGICA DE MODO ESCURO ---
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Verificar tema ao carregar
if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

// --- AJUSTE NO RENDER PARA CORES DARK ---
function render() {
    const mIdx = MESES.indexOf(document.getElementById('fMonth').value);
    const yVal = parseInt(document.getElementById('fYear').value);
    const filtrados = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === yVal);

    const inc = filtrados.filter(t => t.tipo === 'income').reduce((s, t) => s + t.valor, 0);
    const exp = filtrados.filter(t => t.tipo === 'expense').reduce((s, t) => s + t.valor, 0);

    document.getElementById('totalIncome').innerText = inc.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalExpense').innerText = exp.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
    document.getElementById('totalBalance').innerText = (inc - exp).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});

    document.getElementById('tableBody').innerHTML = filtrados.map(t => `
        <tr class="transition-all ${t.pago ? 'opacity-30' : ''}">
            <td class="py-4 text-center w-12">
                <button onclick="togglePago(${t.id})" class="w-6 h-6 rounded-full border-2 flex items-center justify-center ${t.pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent'}">✓</button>
            </td>
            <td class="py-4">
                <div class="font-bold text-sm ${t.pago ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}">${t.desc} <span class="text-[9px] font-normal opacity-40">${t.parc}</span></div>
                <div class="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase mt-1">${t.metodo} • ${t.categoria}</div>
            </td>
            <td class="text-right font-black text-sm ${t.tipo === 'income' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}">
                ${t.valor.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}
            </td>
            <td class="text-right"><button onclick="excluir(${t.id})" class="text-slate-200 dark:text-slate-700 hover:text-rose-500 px-2 font-bold text-lg">✕</button></td>
        </tr>`).join('');

    const renderTag = (item, tipo) => `<span class="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg text-[9px] font-black uppercase border dark:border-slate-700 flex items-center gap-1">${item}<button onclick="removerItemLista('${tipo}', '${item}')" class="text-rose-400">✕</button></span>`;
    document.getElementById('catListUI').innerHTML = dados.categorias.map(c => renderTag(c, 'categorias')).join('');
    document.getElementById('methListUI').innerHTML = dados.metodos.map(m => renderTag(m, 'metodos')).join('');
    
    const fillSelect = (id, list) => {
        const el = document.getElementById(id);
        const val = el.value;
        el.innerHTML = list.map(i => `<option value="${i}">${i}</option>`).join('');
        if(list.includes(val)) el.value = val;
    };
    fillSelect('inCat', dados.categorias);
    fillSelect('inMeth', dados.metodos);
}
// ... (mantenha o restante do código original)
