window.atualizarAnaliseMes = function() {
    const mesSelecionado = document.getElementById('filtroMes').value;
    const anoSelecionado = document.getElementById('filtroAno').value;
    const ehMobile = document.body.classList.contains('modo-mobile');
    
    let totalReceitasMes = 0;
    if (dadosLocais.receitas) {
        dadosLocais.receitas.forEach(r => {
            let tipoR = r.tipo || 'Fixa';
            let atendePeriodoReceita = false;

            if (tipoR === 'Fixa') {
                atendePeriodoReceita = true;
            } else if (tipoR === 'FixaAte' && r.intervaloCompleto) {
                let inicioAbs = r.intervaloCompleto.inicio.ano * 12 + r.intervaloCompleto.inicio.mesIndex;
                let fimAbs = r.intervaloCompleto.fim.ano * 12 + r.intervaloCompleto.fim.mesIndex;
                let mesAtualAbs = parseInt(anoSelecionado) * 12 + mesesOrdem.indexOf(mesSelecionado);
                if (mesAtualAbs >= inicioAbs && mesAtualAbs <= fimAbs) atendePeriodoReceita = true;
            } else if (tipoR === 'Extra' && r.mesesPorAno) {
                if ((r.mesesPorAno[anoSelecionado] || []).includes(mesSelecionado)) atendePeriodoReceita = true;
            }

            if (atendePeriodoReceita) {
                totalReceitasMes += r.valor;
            }
        });
    }

    let totalDespesasMes = 0, totalPagoMes = 0, totalAPagarMes = 0;
    const listaExtratoHtml = document.getElementById('listaExtratoMes');
    if(!listaExtratoHtml) return;
    listaExtratoHtml.innerHTML = '';
    let despesasFiltradas = [];

    if (dadosLocais.despesas) {
        dadosLocais.despesas.forEach((d, indexOriginal) => {
            let atendePeriodo = false, valorMensalCalculado = d.valor;
            let tipoD = d.tipo || 'Fixa';

            if (tipoD === 'Fixa') {
                atendePeriodo = true;
            } else if (tipoD === 'FixaAte' && d.intervaloCompleto) {
                let inicioAbs = d.intervaloCompleto.inicio.ano * 12 + d.intervaloCompleto.inicio.mesIndex;
                let fimAbs = d.intervaloCompleto.fim.ano * 12 + d.intervaloCompleto.fim.mesIndex;
                let mesAtualAbs = parseInt(anoSelecionado) * 12 + mesesOrdem.indexOf(mesSelecionado);
                if (mesAtualAbs >= inicioAbs && mesAtualAbs <= fimAbs) atendePeriodo = true;
            } else if (tipoD === 'Variável' && d.mesesPorAno) {
                if ((d.mesesPorAno[anoSelecionado] || []).includes(mesSelecionado)) atendePeriodo = true;
            }

            if (atendePeriodo) {
                totalDespesasMes += valorMensalCalculado;
                let statusObj = (d.statusPagamento && d.statusPagamento[`${mesSelecionado}_${anoSelecionado}`]) || { situacao: 'Pendente', valorParcial: 0 };
                let sit = typeof statusObj === 'string' ? (statusObj === 'Pago' ? 'Pago' : 'Pendente') : (statusObj.situacao || 'Pendente');
                let valParcial = typeof statusObj === 'object' ? (statusObj.valorParcial || 0) : 0;

                let valorQuitadoCalculado = sit === 'Pago' ? valorMensalCalculado : (sit === 'Parcial' ? valParcial : 0);
                let valorPendenteCalculado = sit === 'Pago' ? 0 : (sit === 'Parcial' ? Math.max(0, valorMensalCalculado - valParcial) : valorMensalCalculado);

                totalPagoMes += valorQuitadoCalculado;
                totalAPagarMes += valorPendenteCalculado;

                if (filtroExtratoAtual === 'Todos' || filtroExtratoAtual === tipoD || (filtroExtratoAtual === 'Fixa' && tipoD === 'FixaAte')) {
                    
                    let rotuloExtrato = "Fixo";
                    if (tipoD === 'FixaAte' && d.intervaloCompleto) {
                        rotuloExtrato = `${d.intervaloCompleto.inicio.mesNome}/${d.intervaloCompleto.inicio.ano} a ${d.intervaloCompleto.fim.mesNome}/${d.intervaloCompleto.fim.ano}`;
                    } else if (tipoD === 'Variável' && d.mesesPorAno) {
                        let mesesAtivos = [];
                        Object.keys(d.mesesPorAno).forEach(ano => {
                            (d.mesesPorAno[ano] || []).forEach(m => mesesAtivos.push(`${m}/${ano}`));
                        });
                        if (mesesAtivos.length > 0) {
                            let primeiro = mesesAtivos[0];
                            rotuloExtrato = mesesAtivos.length > 1 ? `${primeiro} (+${mesesAtivos.length - 1})` : primeiro;
                        } else {
                            rotuloExtrato = "Variável";
                        }
                    }

                    despesasFiltradas.push({ indexOriginal, nome: d.nome, tipo: tipoD === 'FixaAte' ? 'Fixa Até' : tipoD, rotuloTempo: rotuloExtrato, valorParcela: valorMensalCalculado, situacao: sit, valorParcial: valParcial });
                }
            }
        });
    }

    if (despesasFiltradas.length === 0) {
        listaExtratoHtml.innerHTML = '<li style="color: #777; text-align: center; padding: 10px; font-size: 13px;">Nenhuma dívida encontrada.</li>';
    } else {
        despesasFiltradas.forEach(item => {
            let valFormat = item.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            let badgeStatus = item.situacao === 'Pago' ? `<span class="status-pago">Pago</span>` : (item.situacao === 'Parcial' ? `<span class="status-parcial">Parcial (${item.valorParcial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>` : `<span class="status-pendente">Pendente</span>`);
            
            let li = document.createElement('li');
            li.className = 'item-extrato';
            if (ehMobile) {
                li.innerHTML = `
                    <div class="info-linha"><span class="nome">${item.nome}</span><span class="valor" style="color: #dc3545 !important;">${valFormat}</span></div>
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"><span class="tipo-tag">${item.tipo}</span><span class="vezes-tag">${item.rotuloTempo}</span>${badgeStatus}</div>
                        <button class="btn-editar-status" onclick="abrirModalStatusMes(${item.indexOriginal}, '${mesSelecionado}', '${anoSelecionado}')">✏️</button>
                    </div>`;
            } else {
                li.innerHTML = `
                    <div class="info-linha"><span class="nome">${item.nome}</span><span class="tipo-tag">${item.tipo}</span><span class="vezes-tag">${item.rotuloTempo}</span>${badgeStatus}</div>
                    <div style="display: flex; align-items: center; gap: 10px;"><span class="valor" style="color: #dc3545 !important;">${valFormat}</span><button class="btn-editar-status" onclick="abrirModalStatusMes(${item.indexOriginal}, '${mesSelecionado}', '${anoSelecionado}')">✏️</button></div>`;
            }
            listaExtratoHtml.appendChild(li);
        });
    }

    let balancoReal = totalReceitasMes - totalPagoMes;
    let previsaoSobraDéficit = totalReceitasMes - totalDespesasMes;

    document.getElementById('analiseReceita').innerText = totalReceitasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('analiseDespesa').innerText = totalDespesasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('analisePago').innerText = totalPagoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('analiseAPagar').innerText = totalAPagarMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    let elDisponivel = document.getElementById('analiseDisponivel');
    elDisponivel.innerText = previsaoSobraDéficit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    elDisponivel.className = previsaoSobraDéficit >= 0 ? "cor-receita" : "cor-despesa";
    
    let elSaldo = document.getElementById('analiseSaldo');
    elSaldo.innerText = balancoReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    elSaldo.className = balancoReal >= 0 ? "cor-receita" : "cor-despesa";

    let somaTotalGrafico = totalReceitasMes + totalAPagarMes;
    let pctRec = somaTotalGrafico > 0 ? (totalReceitasMes / somaTotalGrafico) * 100 : 50;
    let pctDesp = somaTotalGrafico > 0 ? (totalAPagarMes / somaTotalGrafico) * 100 : 50;
    document.getElementById('barraRecFill').style.width = pctRec + '%';
    document.getElementById('barraDespFill').style.width = pctDesp + '%';
    document.getElementById('txtLegendaBarra').innerText = `Rec: ${pctRec.toFixed(0)}% | A Pagar: ${pctDesp.toFixed(0)}%`;

    let pctComp = totalReceitasMes > 0 ? (totalAPagarMes / totalReceitasMes) * 100 : (totalAPagarMes > 0 ? 100 : 0);
    if (pctComp > 100) pctComp = 100;
    let corCirc = pctComp > 80 ? '#dc3545' : (pctComp > 50 ? '#ffc107' : '#28a745');
    document.getElementById('graficoCirculo').style.background = `conic-gradient(${corCirc} 0% ${pctComp}%, #e9ecef ${pctComp}% 100%)`;
    document.getElementById('txtCirculoPorc').innerText = pctComp.toFixed(0) + '%';

    let badge = document.getElementById('badgeStatus'), txtDesc = document.getElementById('txtDescStatus');
    if (totalReceitasMes === 0 && totalDespesasMes === 0) { badge.innerText = "NEUTRO"; badge.style.backgroundColor = "#6c757d"; txtDesc.innerText = "Sem pendências"; }
    else if (previsaoSobraDéficit < 0) { badge.innerText = "DÉFICIT"; badge.style.backgroundColor = "#dc3545"; txtDesc.innerText = "Gastos maiores que entradas"; }
    else if (pctComp > 80) { badge.innerText = "ALERTA"; badge.style.backgroundColor = "#ffc107"; badge.style.color = "#333"; txtDesc.innerText = "Comprometimento alto"; }
    else { badge.innerText = "SAUDÁVEL"; badge.style.backgroundColor = "#28a745"; badge.style.color = "white"; txtDesc.innerText = "Balanço positivo"; }
};
