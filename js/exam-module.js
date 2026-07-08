/* ── EXAM MODULE (request-management | results-view) ── */

function renderExamModule(mode, rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;
  if (mode === 'request-management') renderExamModuleSolicitacoes(root);
  else if (mode === 'results-view') renderExamModuleResultados(root);
}

function setExamSolicFiltroStatus(v) {
  examSolicFiltroStatus = v;
  renderExamModule('request-management', 'examesSolicitacoesPage');
}

function setExamSolicFiltroPaciente(val) {
  examSolicFiltroPacienteId = val === '' || val == null ? null : val;
  renderExamModule('request-management', 'examesSolicitacoesPage');
}

function setExamSolicFiltroPrioridade(v) {
  examSolicFiltroPrioridade = v;
  renderExamModule('request-management', 'examesSolicitacoesPage');
}

function setExamResFiltroPaciente(val) {
  examResFiltroPacienteId = val === '' || val == null ? null : val;
  renderExamModule('results-view', 'examesResultadosPage');
}

function setExamResFiltroTipo(v) {
  examResFiltroTipo = v;
  renderExamModule('results-view', 'examesResultadosPage');
}

function setExamResPeriodoPreset(v) {
  examResPeriodoPreset = v;
  renderExamModule('results-view', 'examesResultadosPage');
}

function aplicarExamResDatasCustom() {
  const di = document.getElementById('examResDataInicio');
  const df = document.getElementById('examResDataFim');
  if (di) examResDataInicio = di.value || '';
  if (df) examResDataFim = df.value || '';
  examResPeriodoPreset = 'custom';
  renderExamModule('results-view', 'examesResultadosPage');
}

let exameSolicModalEdicaoId = null;

function renderExamModuleSolicitacoes(root) {
  const base = examesSolicitacoesLista();
  const lista = aplicarFiltrosSolicitacoes(base);
  const urgentes = base.filter(e => e.prioridade === 'urgente' && e.statusFluxo !== 'concluido').length;
  const pendentes = base.filter(e => !['concluido', 'resultado_recebido'].includes(e.statusFluxo)).length;
  const concluidos = base.filter(e => e.statusFluxo === 'concluido').length;

  const optsPac = `<option value="">Todos os pacientes</option>${[...pacientesDaSessao()]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(p => {
      const sel = examSolicFiltroPacienteId != null && String(examSolicFiltroPacienteId) === String(p.id) ? ' selected' : '';
      return `<option value="${p.id}"${sel}>${p.nome}</option>`;
    }).join('')}`;

  const fa = f => (examSolicFiltroStatus === f ? 'filter-active' : '');

  const rows = lista.length
    ? lista.map(e => {
      const priLabel = e.prioridade === 'urgente' ? 'Urgente' : 'Normal';
      const priClass = e.prioridade === 'urgente' ? 'urgente' : 'normal';
      const stClass = e.statusFluxo === 'concluido' ? 'concluido'
        : (e.statusFluxo === 'resultado_recebido' ? 'resultado' : 'pendente');
      const stLabel = EXAME_STATUS_FLUXO_LABEL[e.statusFluxo] || e.statusFluxo;
      const anexosN = (e.anexos && e.anexos.length) || 0;
      return `
    <div class="exam-row exam-row--solicit">
      <div><div class="exam-name">${e.nome}</div><div class="exam-pat">${e.paciente}</div></div>
      <div style="font-size:11px;color:var(--muted)">${e.tipo}</div>
      <div style="font-size:11px;color:var(--muted)">${e.data}</div>
      <div><span class="exam-status-badge ${priClass}">${priLabel}</span></div>
      <div><span class="exam-status-badge ${stClass}">${stLabel}</span></div>
      <div class="exam-row-actions">
        <button type="button" class="action-btn" onclick="event.stopPropagation();openDetalheExamesTab(${e.pacienteId})">Ficha</button>
        <button type="button" class="action-btn" onclick="event.stopPropagation();abrirModalExameSolicitacao(${e.id})">Editar</button>
        ${anexosN ? `<button type="button" class="action-btn" onclick="event.stopPropagation();navigateTo('examesResultados')">Resultado</button>` : ''}
      </div>
    </div>`;
    }).join('')
    : '<p class="empty-state" style="padding:24px 16px">Nenhuma solicitação neste filtro.</p>';

  root.innerHTML = `
    <div class="exam-module-head">
      <p class="exam-module-hint">Gestão de solicitações — cadastro, prioridade e acompanhamento do fluxo até o laudo. Resultados com anexo ficam em <button type="button" class="btn-link" onclick="navigateTo('examesResultados')">Resultados de Exames</button>.</p>
      <button type="button" class="btn-primary" onclick="abrirModalExameSolicitacao(null)">+ Nova solicitação</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div class="metric-card"><div class="metric-accent" style="background:var(--red)"></div>
        <div class="metric-label">Urgentes</div>
        <div class="metric-value" style="color:var(--red)">${urgentes}</div>
        <div class="metric-sub">Prioridade máxima</div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--amber)"></div>
        <div class="metric-label">Em andamento</div>
        <div class="metric-value" style="color:var(--amber)">${pendentes}</div>
        <div class="metric-sub">Aguardando conclusão</div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--green)"></div>
        <div class="metric-label">Concluídos</div>
        <div class="metric-value" style="color:var(--green)">${concluidos}</div>
        <div class="metric-sub">Fluxo encerrado</div></div>
    </div>
    <div class="exam-filters-bar">
      <div class="exam-filter-chips">
        <button type="button" class="filter-chip ${fa('todos')}" onclick="setExamSolicFiltroStatus('todos')">Todos</button>
        <button type="button" class="filter-chip ${fa('pendentes')}" onclick="setExamSolicFiltroStatus('pendentes')">Pendentes</button>
        <button type="button" class="filter-chip ${fa('urgentes')}" onclick="setExamSolicFiltroStatus('urgentes')">Urgentes</button>
        ${EXAME_STATUS_FLUXO_LISTA.map(s => `<button type="button" class="filter-chip ${fa(s)}" onclick="setExamSolicFiltroStatus('${s}')">${EXAME_STATUS_FLUXO_LABEL[s]}</button>`).join('')}
      </div>
      <div class="exam-filter-row">
        <label>Paciente <select class="med-form-select" onchange="setExamSolicFiltroPaciente(this.value)">${optsPac}</select></label>
        <label>Prioridade <select class="med-form-select" onchange="setExamSolicFiltroPrioridade(this.value)">
          <option value="todos"${examSolicFiltroPrioridade === 'todos' ? ' selected' : ''}>Todas</option>
          <option value="normal"${examSolicFiltroPrioridade === 'normal' ? ' selected' : ''}>Normal</option>
          <option value="urgente"${examSolicFiltroPrioridade === 'urgente' ? ' selected' : ''}>Urgente</option>
        </select></label>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><div class="panel-title">Solicitações — ${lista.length} de ${base.length}</div></div>
      <div class="exam-row exam-row--solicit header">
        <div class="col-label">Exame / Paciente</div>
        <div class="col-label">Tipo</div>
        <div class="col-label">Data</div>
        <div class="col-label">Prioridade</div>
        <div class="col-label">Status</div>
        <div></div>
      </div>
      ${rows}
    </div>`;
}



function renderExamModuleResultados(root) {
  const base = aplicarFiltrosResultados(examesResultadosLista());
  const total = examesResultadosLista().length;
  const appN = base.filter(r => r.origem.indexOf('App') >= 0).length;
  const clinN = base.length - appN;

  const optsPac = `<option value="">Todos os pacientes</option>${[...pacientesDaSessao()]
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(p => {
      const sel = examResFiltroPacienteId != null && String(examResFiltroPacienteId) === String(p.id) ? ' selected' : '';
      return `<option value="${p.id}"${sel}>${p.nome}</option>`;
    }).join('')}`;

  const optsTipo = ['todos', ...EXAME_TIPOS_LISTA, 'Anexo'].map(t => {
    const v = t === 'todos' ? 'todos' : t;
    const sel = examResFiltroTipo === v ? ' selected' : '';
    return `<option value="${v}"${sel}>${t === 'todos' ? 'Todos os tipos' : t}</option>`;
  }).join('');

  const selPer = v => (examResPeriodoPreset === v ? ' selected' : '');

  const rows = base.length
    ? base.map(r => {
      const ax = r.anexo;
      const tipoArq = ax.mime === 'application/pdf' ? 'PDF' : 'Imagem';
      return `
    <div class="exam-row exam-row--result">
      <div><div class="exam-name">${r.nome}</div><div class="exam-pat">${r.paciente}</div></div>
      <div style="font-size:11px;color:var(--muted)">${r.tipo}</div>
      <div style="font-size:11px;color:var(--muted)">${r.data}</div>
      <div style="font-size:11px;color:var(--muted)">${r.origem}</div>
      <div style="font-size:11px;color:var(--muted)">${tipoArq}</div>
      <div class="exam-row-actions">
        <button type="button" class="action-btn" onclick="event.stopPropagation();abrirExameResultadoViewer('${r.key}')">Abrir →</button>
        <button type="button" class="action-btn" onclick="event.stopPropagation();openDetalheExamesTab(${r.pacienteId})">Ficha</button>
      </div>
    </div>`;
    }).join('')
    : '<p class="empty-state" style="padding:24px 16px">Nenhum resultado com anexo neste filtro. Laudos do app aparecem após o paciente autorizar o compartilhamento.</p>';

  root.innerHTML = `
    <div class="exam-module-head">
      <p class="exam-module-hint">${sessaoEhMedico() ? 'Exames compartilhados com você pelo paciente (após autorização no app) ou anexados pela clínica.' : 'Consulta e análise de laudos — app do paciente, clínica e solicitações com anexo.'}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div class="metric-card"><div class="metric-accent" style="background:var(--purple)"></div>
        <div class="metric-label">Com anexo</div>
        <div class="metric-value" style="color:var(--purple)">${base.length}</div>
        <div class="metric-sub">Nesta visão filtrada</div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--blue)"></div>
        <div class="metric-label">Via app</div>
        <div class="metric-value" style="color:var(--blue)">${appN}</div>
        <div class="metric-sub">Paciente / autorizado</div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--green)"></div>
        <div class="metric-label">Total anexos</div>
        <div class="metric-value" style="color:var(--green)">${total}</div>
        <div class="metric-sub">Carteira visível</div></div>
    </div>
    <div class="exam-filters-bar">
      <div class="exam-filter-row">
        <label>Paciente <select class="med-form-select" onchange="setExamResFiltroPaciente(this.value)">${optsPac}</select></label>
        <label>Tipo <select class="med-form-select" onchange="setExamResFiltroTipo(this.value)">${optsTipo}</select></label>
        <label>Período <select class="med-form-select" onchange="setExamResPeriodoPreset(this.value)">
          <option value="none"${selPer('none')}>Qualquer data</option>
          <option value="30"${selPer('30')}>Últimos 30 dias</option>
          <option value="90"${selPer('90')}>Últimos 90 dias</option>
          <option value="custom"${selPer('custom')}>Personalizado</option>
        </select></label>
      </div>
      <div class="exam-filter-row" style="margin-top:8px">
        <label>De <input type="date" class="med-form-input" id="examResDataInicio" value="${examResDataInicio}" /></label>
        <label>Até <input type="date" class="med-form-input" id="examResDataFim" value="${examResDataFim}" /></label>
        <button type="button" class="btn-outline" onclick="aplicarExamResDatasCustom()">Aplicar período</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><div class="panel-title">Resultados — ${base.length} de ${total} anexos</div></div>
      <div class="exam-row exam-row--result header">
        <div class="col-label">Exame / Paciente</div>
        <div class="col-label">Tipo</div>
        <div class="col-label">Data</div>
        <div class="col-label">Origem</div>
        <div class="col-label">Arquivo</div>
        <div></div>
      </div>
      ${rows}
    </div>`;
}

function abrirExameResultadoViewer(key) {
  const row = examesResultadosLista().find(r => r.key === key);
  if (!row || !row.anexo || !row.anexo.dataUrl) {
    alert('Anexo não disponível nesta demonstração.');
    return;
  }
  const ax = row.anexo;
  const overlay = document.getElementById('exameResultOverlay');
  const root = document.getElementById('exameResultModalRoot');
  if (!overlay || !root) {
    window.open(ax.dataUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const isPdf = ax.mime === 'application/pdf';
  const urlAttr = typeof escAttrDataUrl === 'function' ? escAttrDataUrl(ax.dataUrl) : String(ax.dataUrl).replace(/"/g, '&quot;');
  const prev = isPdf
    ? `<div class="exame-perfil-pdf">📄 ${esc(ax.nomeArquivo || 'PDF')}<br><button type="button" class="btn-primary" style="margin-top:12px" onclick="window.open('${urlAttr}','_blank')">Abrir em nova aba</button></div>`
    : `<div class="exame-perfil-preview"><img src="${urlAttr}" alt="" style="max-width:100%;max-height:360px" /></div>`;
  root.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${esc(row.nome)}</div>
      <button type="button" class="modal-close" onclick="fecharModalExameResultado()" aria-label="Fechar"></button>
    </div>
    <div style="padding:16px 20px;font-size:13px;line-height:1.5">
      <p style="margin:0 0 8px"><strong>Paciente:</strong> ${esc(row.paciente)} · <strong>Origem:</strong> ${esc(row.origem)}</p>
      <p style="margin:0 0 14px;color:var(--muted);font-size:12px">${esc(row.data)} · ${esc(ax.nomeArquivo || '')}</p>
      ${prev}
      <div style="margin-top:14px">
        <button type="button" class="btn-outline" style="font-size:12px" id="btnInterpretarExame_${row.solicitacaoId || 0}"
          onclick="interpretarExameIA(${row.solicitacaoId || 0}, ${row.pacienteId || 0})"
          title="IA analisa o contexto do exame e compara com o histórico do paciente">✨ Interpretar com IA</button>
        <div id="iaExameResultadoTexto_${row.solicitacaoId || 0}" style="display:none;margin-top:10px;padding:12px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border);font-size:13px;line-height:1.6;color:var(--text)"></div>
      </div>
    </div>`;
  overlay.classList.add('open');
}

function fecharModalExameResultado() {
  const overlay = document.getElementById('exameResultOverlay');
  if (overlay) overlay.classList.remove('open');
}

function abrirModalExameSolicitacao(exameId, pacienteIdFixo) {
  const pidFix = pacienteIdFixo != null ? Number(pacienteIdFixo) : null;
  if (!sessaoEhClinica() && pidFix == null) return;
  exameSolicModalEdicaoId = exameId;
  const e = exameId != null ? exames.find(x => x.id === exameId) : null;
  const overlay = document.getElementById('exameSolicOverlay');
  const root = document.getElementById('exameSolicModalRoot');
  if (!overlay || !root) return;
  const pacSel = pidFix != null ? pidFix : (e && e.pacienteId);
  const optsPac = pacientes.map(pac => {
    const sel = pacSel != null && String(pacSel) === String(pac.id) ? ' selected' : '';
    return `<option value="${pac.id}"${sel}>${pac.nome}</option>`;
  }).join('');
  const blocoPac = pidFix != null
    ? `<input type="hidden" id="exSolPac" value="${pidFix}" />`
    : `<div class="cad-pac-field cad-pac-field--full">
          <label for="exSolPac">Paciente *</label>
          <select id="exSolPac" required>${optsPac}</select>
        </div>`;
  const optsTipo = EXAME_TIPOS_LISTA.map(t => `<option${e && e.tipo === t ? ' selected' : ''}>${t}</option>`).join('');
  const optsSt = EXAME_STATUS_FLUXO_LISTA.map(st => `<option value="${st}"${e && e.statusFluxo === st ? ' selected' : ''}>${EXAME_STATUS_FLUXO_LABEL[st]}</option>`).join('');
  const blocoSt = sessaoEhClinica()
    ? `<div class="cad-pac-field">
          <label for="exSolSt">Status do fluxo</label>
          <select id="exSolSt">${optsSt}</select>
        </div>`
    : `<input type="hidden" id="exSolSt" value="solicitado" />`;
  root.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${e ? 'Editar solicitação' : 'Nova solicitação de exame'}</div>
      <button type="button" class="modal-close" onclick="fecharModalExameSolicitacao()" aria-label="Fechar"></button>
    </div>
    <form class="cad-pac-form" style="padding:16px 20px" onsubmit="event.preventDefault();salvarExameSolicitacaoForm();">
      <div class="cad-pac-grid">
        ${blocoPac}
        <div class="cad-pac-field cad-pac-field--full">
          <label for="exSolNome">Exame *</label>
          <input type="text" id="exSolNome" required value="${e ? String(e.nome).replace(/"/g, '&quot;') : ''}" placeholder="Ex.: Hemograma, Ecocardiograma…" />
        </div>
        <div class="cad-pac-field">
          <label for="exSolTipo">Tipo</label>
          <select id="exSolTipo">${optsTipo}</select>
        </div>
        <div class="cad-pac-field">
          <label for="exSolData">Data solicitação</label>
          <input type="date" id="exSolData" value="${e && e.dataIso ? e.dataIso : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="exSolPri">Prioridade</label>
          <select id="exSolPri">
            <option value="normal"${!e || e.prioridade === 'normal' ? ' selected' : ''}>Normal</option>
            <option value="urgente"${e && e.prioridade === 'urgente' ? ' selected' : ''}>Urgente</option>
          </select>
        </div>
        ${blocoSt}
      </div>
      <div class="cad-pac-footer" style="border-top:none;padding-top:12px">
        <button type="button" class="btn-outline" onclick="fecharModalExameSolicitacao()">Cancelar</button>
        <button type="submit" class="btn-primary">Registrar solicitação</button>
      </div>
    </form>`;
  if (!e) {
    const d = document.getElementById('exSolData');
    if (d && !d.value) {
      const n = new Date();
      d.value = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }
  }
  overlay.classList.add('open');
}

function fecharModalExameSolicitacao() {
  const overlay = document.getElementById('exameSolicOverlay');
  if (overlay) overlay.classList.remove('open');
  exameSolicModalEdicaoId = null;
}

function salvarExameSolicitacaoForm() {
  const pid = parseInt(document.getElementById('exSolPac') && document.getElementById('exSolPac').value, 10);
  const nome = (document.getElementById('exSolNome') && document.getElementById('exSolNome').value || '').trim();
  const tipo = document.getElementById('exSolTipo') && document.getElementById('exSolTipo').value;
  const dataIso = document.getElementById('exSolData') && document.getElementById('exSolData').value;
  const prioridade = document.getElementById('exSolPri') && document.getElementById('exSolPri').value;
  const statusFluxo = document.getElementById('exSolSt') && document.getElementById('exSolSt').value;
  if (!pid || !nome) {
    alert('Informe paciente e nome do exame.');
    return;
  }
  const p = pacientes.find(x => x.id === pid);
  if (!p) return;
  let dataFmt = dataIso || '';
  if (dataIso) {
    const parts = dataIso.split('-');
    if (parts.length === 3) dataFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const meds = new Set();
  [...agendaHoje, ...agendaAmanha].forEach(s => {
    if (s.pacienteId === pid && s.medicoId) meds.add(s.medicoId);
  });
  const payload = {
    nome,
    pacienteId: pid,
    paciente: p.nome,
    tipo: tipo || 'Outro',
    data: dataFmt || new Date().toLocaleDateString('pt-BR'),
    dataIso: dataIso || null,
    prioridade: prioridade || 'normal',
    statusFluxo: statusFluxo || 'solicitado',
    origem: 'clinica',
    anexos: [],
    compartilhadoMedicoIds: [...meds],
    autorizadoPaciente: true,
  };
  if (exameSolicModalEdicaoId != null) {
    const ex = exames.find(x => x.id === exameSolicModalEdicaoId);
    if (ex) Object.assign(ex, payload, { anexos: ex.anexos || [] });
  } else {
    exames.push({ id: exameSolicitacaoNextId++, ...payload });
  }
  fecharModalExameSolicitacao();
  detalheExamesSub = 'salvos';
  if (typeof refreshExamesPacienteUI === 'function') refreshExamesPacienteUI(pid);
  else {
    renderSidebar();
    if (paginaAtiva === 'examesSolicitacoes') renderExamModule('request-management', 'examesSolicitacoesPage');
  }
}
