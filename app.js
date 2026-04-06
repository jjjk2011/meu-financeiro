}

// Função para atualizar rendimentos diários
function atualizarRendimentosDiarios() {
    let atualizado = false;
    
    (dados.investimentosMP || []).forEach(inv => {
        if (inv.dataVencimento) {
            const resultado = calcularRendimentoMPCompleto(
                inv.valorAplicado, 
                inv.rendimentoPercentual, 
                inv.dataAplicacao, 
                inv.dataVencimento
            );
            
            if (Math.abs(resultado.valorAtualLiquido - inv.valorAtualLiquido) > 0.01) {
                inv.valorAtualBruto = resultado.valorAtualBruto;
                inv.valorAtualLiquido = resultado.valorAtualLiquido;
                inv.rendimentoBruto = resultado.rendimentoBruto;
                inv.iof = resultado.iof;
                inv.impostoRenda = resultado.impostoRenda;
                inv.rentabilidadeBruta = resultado.rentabilidadeBruta;
                inv.rentabilidadeLiquida = resultado.rentabilidadeLiquida;
                inv.diasDecorridos = resultado.diasDecorridos;
                inv.aliquotaIOF = resultado.aliquotaIOF;
                inv.aliquotaIR = resultado.aliquotaIR;
                inv.ultimaAtualizacao = new Date().toISOString();
                atualizado = true;
            }
        }
    });
    
    if (atualizado) {
        syncToCloud();
        renderInvestimentosMP();
        showToast('💰 Rendimentos atualizados!', 'success');
    }
}

// Função para renderizar investimentos
function renderInvestimentosMP() {
    const investimentos = dados.investimentosMP || [];
    
    const totalInvestido = investimentos.reduce((s, t) => s + t.valorAplicado, 0);
    const totalAtualLiquido = investimentos.reduce((s, t) => s + t.valorAtualLiquido, 0);
    const totalRendLiquido = totalAtualLiquido - totalInvestido;
    const rentTotal = totalInvestido > 0 ? (totalRendLiquido / totalInvestido) * 100 : 0;

    const totalInvestidoEl = document.getElementById('totalInvestidoMP');
    const totalAtualEl = document.getElementById('totalAtualMP');
    const totalRendimentoEl = document.getElementById('totalRendimentoMP');
    const rentabilidadeTotalEl = document.getElementById('rentabilidadeTotalMP');
    const contadorEl = document.getElementById('contadorInvestimentosMP');
    
    if (totalInvestidoEl) totalInvestidoEl.innerText = totalInvestido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalAtualEl) totalAtualEl.innerText = totalAtualLiquido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
    if (totalRendimentoEl) {
        totalRendimentoEl.innerText = totalRendLiquido.toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
        totalRendimentoEl.className = `font-bold ${totalRendLiquido>=0?'text-emerald-500':'text-rose-500'}`;
    }
    if (rentabilidadeTotalEl) rentabilidadeTotalEl.innerHTML = `${rentTotal>=0?'+':''}${rentTotal.toFixed(2)}%`;
    if (contadorEl) contadorEl.innerText = investimentos.length;

    const tbody = document.getElementById('investTableBodyMP');
    if (!tbody) return;
    
    if (investimentos.length === 0) {
        tbody.innerHTML = 'stein<td colspan="5" class="text-center py-12 opacity-50">📈 Nenhum investimento cadastrado<\/td>stein';
        return;
    }
    
    tbody.innerHTML = investimentos.map(t => {
        const idSeguro = String(t.id).replace(/'/g, "\\'");
        
        const [anoAplic, mesAplic, diaAplic] = t.dataAplicacao.split('-').map(Number);
        const dataAplicFormatada = `${diaAplic.toString().padStart(2, '0')}/${mesAplic.toString().padStart(2, '0')}/${anoAplic}`;
        
        let dataVencFormatada = 'Sem vencimento';
        let diasRestantes = '';
        
        if (t.dataVencimento) {
            const [anoVenc, mesVenc, diaVenc] = t.dataVencimento.split('-').map(Number);
            dataVencFormatada = `${diaVenc.toString().padStart(2, '0')}/${mesVenc.toString().padStart(2, '0')}/${anoVenc}`;
            
            const hoje = new Date();
            const hojeSemFuso = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const dataVenc = new Date(anoVenc, mesVenc - 1, diaVenc);
            
            if (hojeSemFuso < dataVenc) {
                const diffDias = Math.ceil((dataVenc - hojeSemFuso) / (1000 * 60 * 60 * 24));
                diasRestantes = ` (${diffDias} dias restantes)`;
            }
        }
        
        const resgateInfo = t.resgateImediato ? '🔓 Resgate imediato' : `⏳ ${t.resgate || 'Prazo'}`;
        const rendColor = t.rentabilidadeLiquida >= 0 ? 'text-emerald-500' : 'text-rose-500';
        
        // Mostra o IOF apenas se for > 0
        const iofDisplay = t.aliquotaIOF > 0 ? `IOF: ${t.aliquotaIOF.toFixed(0)}% | ` : '';
        
        return `
        <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onclick="prepararEdicaoInvestMP('${idSeguro}')">
            <td class="py-4 px-3">
                <div class="font-bold text-sm">${t.nome}</div>
                <div class="text-[10px] text-slate-400">${t.tipo} ${t.garantiaFGC ? '• ✓ FGC' : ''}</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="font-bold">${t.valorAtualLiquido.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</div>
                <div class="text-[10px] ${rendColor}">${t.rentabilidadeLiquida >= 0 ? '+' : ''}${t.rentabilidadeLiquida.toFixed(2)}%</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="text-xs font-medium text-emerald-500">${t.rendimentoPercentual}% do CDI</div>
                <div class="text-[9px] text-slate-400">${resgateInfo}</div>
                <div class="text-[8px] text-slate-500 mt-1">${iofDisplay}IR: ${t.aliquotaIR.toFixed(1)}%</div>
               <\/td>
            <td class="py-4 text-right">
                <div class="text-[10px] text-slate-400">Aplic: ${dataAplicFormatada}</div>
                <div class="text-[10px] text-slate-400">Venc: ${dataVencFormatada}${diasRestantes}</div>
               <\/td>
            <td class="text-right px-2">
                <button onclick="event.stopPropagation(); excluirInvestimentoMP('${idSeguro}')" class="text-slate-300 hover:text-rose-500">✕<\/button>
               <\/td>
           <\/tr>`;
    }).join('');
}

function abrirModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        resetFormInvestMP();
    }
}

function fecharModalInvestimento() {
    const modal = document.getElementById('modalInvestimento');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function resetFormInvestMP() {
    document.getElementById('editIdInvestMP').value = '';
    document.getElementById('inNomeInvest').value = '';
    document.getElementById('inTipoInvestMP').value = 'Renda Fixa';
    document.getElementById('inValorAplicado').value = '';
    document.getElementById('inRendimentoPercentual').value = '';
    
    const hoje = new Date();
    const dataAtual = formatarDataLocal(hoje);
    document.getElementById('inDataAplicacao').value = dataAtual;
    
    document.getElementById('inDataVencimento').value = '';
    document.getElementById('inResgate').value = '';
    document.getElementById('inResgateImediato').checked = false;
    document.getElementById('inGarantiaFGC').checked = true;
    document.getElementById('btnSaveInvestMP').innerText = '💾 SALVAR INVESTIMENTO';
    document.getElementById('btnCancelEditInvestMP').classList.add('hidden');
}

function prepararEdicaoInvestMP(id) {
    const t = dados.investimentosMP.find(x => String(x.id) === String(id));
    if (!t) return showToast('Erro ao carregar investimento', 'error');
    
    document.getElementById('editIdInvestMP').value = t.id;
    document.getElementById('inNomeInvest').value = t.nome;
    document.getElementById('inTipoInvestMP').value = t.tipo;
    document.getElementById('inValorAplicado').value = t.valorAplicado;
    document.getElementById('inRendimentoPercentual').value = t.rendimentoPercentual;
    document.getElementById('inDataAplicacao').value = t.dataAplicacao;
    document.getElementById('inDataVencimento').value = t.dataVencimento || '';
    document.getElementById('inResgate').value = t.resgate || '';
    document.getElementById('inResgateImediato').checked = t.resgateImediato || false;
    document.getElementById('inGarantiaFGC').checked = t.garantiaFGC !== false;
    document.getElementById('btnSaveInvestMP').innerText = '🔄 ATUALIZAR';
    document.getElementById('btnCancelEditInvestMP').classList.remove('hidden');
    abrirModalInvestimento();
}

function excluirInvestimentoMP(id) {
    if (confirm("Excluir este investimento?")) {
        dados.investimentosMP = dados.investimentosMP.filter(t => String(t.id) !== String(id));
        syncToCloud();
        renderInvestimentosMP();
        showToast('Investimento excluído', 'success');
    }
}

// ==================== FUNÇÕES GERAIS ====================

function render() {
    if (activeTab === 'transacoes') renderTransacoes();
    else renderInvestimentosMP();
    updateSelects();
}

function initDateFilters() {
    const now = new Date();
    ['inMonth', 'fMonth'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = '';
            MESES.forEach(m => el.innerHTML += `<option value="${m}">${m}</option>`);
            el.value = MESES[now.getMonth()];
        }
    });
    document.getElementById('fYear').value = document.getElementById('inYear').value = now.getFullYear();
    const dataCompra = document.getElementById('inDataAplicacao');
    if (dataCompra) dataCompra.value = formatarDataLocal(now);
}
function filtrarTabela(texto) { filtroBusca = texto; render(); }

function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('inDesc').value = '';
    document.getElementById('inVal').value = '';
    document.getElementById('inParc').value = '';
    document.getElementById('inParc').disabled = false;
    document.getElementById('formTitle').innerText = "➕ NOVO REGISTRO";
    document.getElementById('btnSave').innerText = "💾 SALVAR NA NUVEM";
    document.getElementById('btnCancelEdit').classList.add('hidden');
    document.getElementById('inType').value = 'expense';
    const now = new Date();
    document.getElementById('inMonth').value = MESES[now.getMonth()];
    document.getElementById('inYear').value = now.getFullYear();
}
function prepararEdicao(id) {
    const t = dados.transacoes.find(x => String(x.id) === String(id));
    if (!t) return showToast('Erro ao carregar', 'error');
    document.getElementById('editId').value = t.id;
    document.getElementById('inType').value = t.tipo;
    document.getElementById('inDesc').value = t.desc;
    document.getElementById('inVal').value = t.valor;
    document.getElementById('inParc').disabled = true;
    document.getElementById('inCat').value = t.categoria;
    document.getElementById('inMeth').value = t.metodo;
    document.getElementById('inMonth').value = MESES[t.mesIdx];
    document.getElementById('inYear').value = t.ano;
    document.getElementById('formTitle').innerText = "✏️ EDITANDO REGISTRO";
    document.getElementById('btnSave').innerText = "🔄 ATUALIZAR";
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('✏️ Modo edição ativado', 'info');
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    if (activeTab === 'transacoes') {
        const mes = document.getElementById('fMonth').value;
        const ano = document.getElementById('fYear').value;
        const mIdx = MESES.indexOf(mes);
        const transacoes = dados.transacoes.filter(t => t.mesIdx === mIdx && t.ano === parseInt(ano));
        const receitas = transacoes.filter(t => t.tipo === 'income');
        const despesas = transacoes.filter(t => t.tipo === 'expense');
        const totalRec = receitas.reduce((s,t)=>s+t.valor,0);
        const totalDes = despesas.reduce((s,t)=>s+t.valor,0);
        doc.setFontSize(20); doc.setTextColor(0,150,100); doc.text('Relatório de Transações',20,20);
        doc.setFontSize(12); doc.setTextColor(100); doc.text(`${mes} ${ano}`,20,30);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('Resumo do Período',20,45);
        doc.autoTable({ startY:50, head:[['Descrição','Valor']], body:[['Total Receitas',`R$ ${totalRec.toFixed(2)}`],['Total Despesas',`R$ ${totalDes.toFixed(2)}`],['Saldo',`R$ ${(totalRec-totalDes).toFixed(2)}`]], theme:'striped', headStyles:{fillColor:[16,185,129]} });
        doc.text('Detalhamento',20,doc.lastAutoTable.finalY+15);
        doc.autoTable({ startY:doc.lastAutoTable.finalY+20, head:[['Descrição','Categoria','Método','Valor','Status']], body:transacoes.map(t=>[t.desc+(t.parc?` (${t.parc})`:''),t.categoria,t.metodo,`R$ ${t.valor.toFixed(2)}`,t.pago?'Pago':'Pendente']), theme:'striped', headStyles:{fillColor:[59,130,246]} });
        doc.save(`transacoes-${mes}-${ano}.pdf`);
    } else {
        const inv = dados.investimentosMP || [];
        const totalInv = inv.reduce((s,t)=>s+t.valorAplicado,0);
        const totalAtual = inv.reduce((s,t)=>s+t.valorAtualLiquido,0);
        const totalLucro = totalAtual - totalInv;
        const rent = totalInv>0?(totalLucro/totalInv)*100:0;
        doc.setFontSize(20); doc.setTextColor(0,150,100); doc.text('Relatório de Investimentos',20,20);
        doc.setFontSize(14); doc.setTextColor(0); doc.text('Resumo da Carteira',20,35);
        doc.autoTable({ startY:40, head:[['Descrição','Valor']], body:[['Total Investido',`R$ ${totalInv.toFixed(2)}`],['Valor Atual',`R$ ${totalAtual.toFixed(2)}`],['Lucro/Prejuízo',`R$ ${totalLucro.toFixed(2)}`],['Rentabilidade',`${rent>=0?'+':''}${rent.toFixed(2)}%`]], theme:'striped', headStyles:{fillColor:[16,185,129]} });
        doc.text('Detalhamento',20,doc.lastAutoTable.finalY+15);
        doc.autoTable({ startY:doc.lastAutoTable.finalY+20, head:[['Ativo','Tipo','Corretora','Quant.','P.Médio','P.Atual','Total','Lucro','Rent.']], body:inv.map(t=>[t.nome,t.tipo,'Mercado Pago','1',`R$ ${t.valorAplicado.toFixed(2)}`,`R$ ${t.valorAtualLiquido.toFixed(2)}`,`R$ ${t.valorAtualLiquido.toFixed(2)}`,`R$ ${(t.valorAtualLiquido-t.valorAplicado).toFixed(2)}`,`${t.rentabilidadeLiquida>=0?'+':''}${t.rentabilidadeLiquida.toFixed(2)}%`]), theme:'striped', headStyles:{fillColor:[59,130,246]} });
        doc.save(`investimentos-${new Date().toISOString().split('T')[0]}.pdf`);
    }
    showToast('PDF gerado!', 'success');
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey||e.metaKey) && e.key === 'n') { e.preventDefault(); if(activeTab==='transacoes'){ resetForm(); document.getElementById('inDesc').focus(); } else { resetFormInvestMP(); document.getElementById('inNomeInvest').focus(); abrirModalInvestimento(); } showToast('Novo registro','info'); }
        if (e.key === 'Escape') { if(activeTab==='transacoes' && document.getElementById('editId').value) resetForm(); else if(activeTab!=='transacoes' && document.getElementById('editIdInvestMP').value) resetFormInvestMP(); showToast('Edição cancelada','info'); }
        if ((e.ctrlKey||e.metaKey) && e.key === 's') { e.preventDefault(); if(currentUser) syncToCloud(); }
        if (e.altKey && e.key === '1') { e.preventDefault(); mudarAba('transacoes'); }
        if (e.altKey && e.key === '2') { e.preventDefault(); mudarAba('investimentos'); }
    });
}

function iniciarAtualizacaoAutomatica() {
    setTimeout(() => atualizarRendimentosDiarios(), 1000);
    setInterval(atualizarRendimentosDiarios, 6*60*60*1000);
}

// Exportações para o HTML
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleLogout = handleLogout;
window.toggleDarkMode = toggleDarkMode;
window.adicionar = adicionar;
window.excluir = excluir;
window.togglePago = togglePago;
window.prepararEdicao = prepararEdicao;
window.resetForm = resetForm;
window.render = render;
window.exportarPDF = exportarPDF;
window.fil
(Content truncated due to size limit. Use line ranges to read remaining content)
