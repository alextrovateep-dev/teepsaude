/* ═══════════════════════════════════════════════════════
   AI MODULE — TeepSaude
   A chave de API fica em sessionStorage['teep_ai_key'].
   Configure em: Configurações → IA / API Key.
   ═══════════════════════════════════════════════════════ */

function getAIKey() {
  return sessionStorage.getItem('teep_ai_key') || '';
}

async function chamarIA(systemPrompt, userContent) {
  const apiKey = getAIKey();
  if (!apiKey) {
    throw new Error('Chave de API não configurada. Acesse Configurações → IA / API Key.');
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${resp.status}`);
  }
  const data = await resp.json();
  return data.content.find(b => b.type === 'text')?.text || '';
}

/* Histórico multi-turn do chat por paciente */
const _chatHistorico = {};

/* ── Feature 1: Estruturação SOAP ── */
async function organizarSOAP(pacienteId) {
  const ta  = document.getElementById('novaAnotacaoConsultaTexto');
  const btn = document.getElementById('btnSoapIA_' + pacienteId);
  if (!ta || !btn) return;
  const texto = ta.value.trim();
  if (!texto) { alert('Escreva a anotação antes de organizar.'); return; }

  const p = pacientes.find(x => x.id === pacienteId);
  const ctx = p
    ? `Paciente: ${p.nome}, ${p.idade} anos, ${p.sexo === 'F' ? 'feminino' : 'masculino'}. Condições: ${p.condicoes}. Medicações: ${(p.meds || []).join(', ') || 'nenhuma'}.`
    : '';

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente clínico. Reorganize anotações médicas brutas no formato SOAP em português brasileiro.
Retorne APENAS o texto com os cabeçalhos: "S — Subjetivo:", "O — Objetivo:", "A — Avaliação:", "P — Plano:".
Sem introdução, comentários ou texto fora do SOAP. Se uma seção não tiver dados, escreva "Não informado."`,
      `Contexto: ${ctx}\n\nAnotação bruta:\n${texto}`
    );
    ta.value = res.trim();
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Organizar em SOAP';
  }
}

/* ── Feature 2: Geração de texto do atestado ── */
async function gerarTextoAtestadoIA() {
  const ta  = document.getElementById('atestadoCorpo');
  const btn = document.getElementById('btnAtestadoIA');
  if (!ta || !btn) return;
  const pid = atestadoPacienteId;
  const p   = pid != null ? pacientes.find(x => x.id === pid) : null;
  if (!p) { alert('Paciente não encontrado.'); return; }

  const ultimaAnotacao = (p.anotacoesConsultas && p.anotacoesConsultas[0] && p.anotacoesConsultas[0].texto) || '';

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente médico. Gere o corpo de um atestado médico em português brasileiro.
O texto deve ser curto (2-4 linhas), objetivo, linguagem clínica formal.
NÃO inclua cabeçalho, assinatura, CRM, dados da clínica nem campos de formulário.
Retorne apenas o texto que vai no campo "Atesto que:".`,
      `Paciente: ${p.nome}, ${p.idade} anos, ${p.sexo === 'F' ? 'feminino' : 'masculino'}.
Condições: ${p.condicoes}. Medicações: ${(p.meds || []).join(', ') || 'nenhuma'}.
Anotação clínica mais recente: ${ultimaAnotacao || 'não disponível'}.
Gere o texto do atestado.`
    );
    ta.value = res.trim();
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Sugerir texto com IA';
  }
}

/* ── Feature 3: Sugestão de medicamentos na receita ── */
async function sugerirReceitaIA() {
  const btn = document.getElementById('btnReceitaIA');
  if (!btn) return;
  const p = receitaPacienteId != null ? pacientes.find(x => x.id === receitaPacienteId) : null;
  if (!p) return;

  const ultimaAnotacao = (p.anotacoesConsultas && p.anotacoesConsultas[0] && p.anotacoesConsultas[0].texto) || '';

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente médico. Sugira medicamentos para uma receita médica brasileira.
Retorne APENAS um array JSON válido, sem markdown, sem explicações, no formato exato:
[{"med":"Nome DCB e concentração","dos":"Dosagem","freq":"Frequência","dias":30,"inst":"Instruções opcionais"}]
Máximo 4 itens. Use nomes genéricos (DCB). Se não houver dados suficientes, retorne [].`,
      `Paciente: ${p.nome}, ${p.idade} anos, ${p.sexo === 'F' ? 'feminino' : 'masculino'}.
Condições: ${p.condicoes}. Medicações atuais: ${(p.meds || []).join(', ') || 'nenhuma'}.
Anotação desta consulta: ${ultimaAnotacao || 'não disponível'}.`
    );

    let sugestoes = [];
    try {
      const clean = res.replace(/```json|```/g, '').trim();
      sugestoes = JSON.parse(clean);
    } catch (_) {
      alert('A IA retornou formato inesperado. Preencha manualmente.'); return;
    }

    if (!Array.isArray(sugestoes) || !sugestoes.length) {
      alert('A IA não encontrou sugestões suficientes. Preencha manualmente.'); return;
    }

    const dosOpts  = dosagensCatalogoOpts  || [];
    const freqOpts = frequenciasCatalogoOpts || [];
    function matchOpt(opts, val) {
      if (!val) return '';
      const v = val.trim().toLowerCase();
      return opts.find(o => o && o.trim().toLowerCase() === v) || '';
    }

    receitaRowsState = sugestoes.map(s => ({
      med:  s.med  || '',
      dos:  matchOpt(dosOpts, s.dos),
      freq: matchOpt(freqOpts, s.freq),
      dias: Number(s.dias) > 0 ? Number(s.dias) : 30,
      inst: s.inst || '',
    }));
    renderReceitaModalForm();
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    /* btn pode ter sido destruído pelo renderReceitaModalForm — reobtenha */
    const b2 = document.getElementById('btnReceitaIA');
    if (b2) { b2.disabled = false; b2.textContent = '✨ Sugerir medicações com IA'; }
  }
}

/* ── Feature 4: Interpretação de resultado de exame ── */
async function interpretarExameIA(exameId, pacienteId) {
  const btn = document.getElementById('btnInterpretarExame_' + exameId);
  const div = document.getElementById('iaExameResultadoTexto_' + exameId);
  if (!btn || !div) return;

  const exame = exames.find(x => x.id === exameId);
  const p = pacientes.find(x => x.id === pacienteId);
  if (!exame || !p) return;

  const anteriores = exames
    .filter(x => x.pacienteId === pacienteId && x.id !== exameId && x.nome === exame.nome)
    .slice(0, 3)
    .map(x => `${x.nome} em ${x.data}: status ${x.statusFluxo}`)
    .join('; ') || 'nenhum anterior registrado';

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente de apoio clínico. Dado um exame e o contexto do paciente, produza um parágrafo (3-5 linhas) de interpretação contextual em português.
Não faça diagnóstico definitivo. Use linguagem clínica acessível ao médico.
Mencione se o resultado está dentro ou fora do esperado dadas as condições. Compare com anteriores se houver.
Finalize sugerindo ação de acompanhamento se pertinente.`,
      `Exame: ${exame.nome} (${exame.tipo}). Data: ${exame.data}. Prioridade: ${exame.prioridade}. Status: ${exame.statusFluxo}.
Paciente: ${p.nome}, ${p.idade} anos. Condições: ${p.condicoes}. Medicações: ${(p.meds || []).join(', ') || 'nenhuma'}.
Sinais vitais: PA ${p.pressao}, FC ${p.fc || '—'}, SpO₂ ${p.saturacao || '—'}, Glicemia ${p.glicemia || '—'}.
Exames anteriores do mesmo tipo: ${anteriores}.`
    );
    div.style.display = 'block';
    div.innerHTML = res.trim().replace(/\n/g, '<br>');
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Interpretar com IA';
  }
}

/* ── Feature 5: Chat com histórico do paciente ── */
function htmlChatPacienteWidget(p) {
  const primeiroNome = p.nome.split(' ')[0];
  return `<div class="ia-chat-widget" id="iaChatWidget_${p.id}">
    <div class="ia-chat-header" onclick="toggleChatWidget(${p.id})">
      <div class="ia-chat-header-left">
        <div class="ia-chat-header-icon">🤖</div>
        <div>
          <div>Assistente IA</div>
          <div class="ia-chat-header-sub">Perguntas sobre ${primeiroNome}</div>
        </div>
      </div>
      <span class="ia-chat-toggle" id="iaChatToggle_${p.id}">▲</span>
    </div>
    <div class="ia-chat-body" id="iaChatBody_${p.id}">
      <div class="ia-chat-msgs" id="iaChatMsgs_${p.id}">
        <div class="ia-chat-msg ia-chat-msg--bot">Olá! Posso responder perguntas sobre o histórico, medicações, exames e sinais vitais de <strong>${primeiroNome}</strong>. O que deseja saber?</div>
      </div>
      <div class="ia-chat-input-row">
        <input type="text" class="ia-chat-input" id="iaChatInput_${p.id}"
          placeholder="Ex.: Qual foi a última pressão acima de 140?"
          onkeydown="if(event.key==='Enter')enviarMensagemChatPaciente(${p.id})">
        <button type="button" class="mic-btn mic-btn--chat" id="micBtnChat_${p.id}"
          title="Clique para falar" onclick="iniciarTranscricao('iaChatInput_${p.id}','micBtnChat_${p.id}')">🎤</button>
        <button type="button" class="btn-primary ia-chat-send" id="iaChatSend_${p.id}"
          onclick="enviarMensagemChatPaciente(${p.id})">Enviar</button>
      </div>
    </div>
  </div>`;
}

function toggleChatWidget(pacienteId) {
  const body   = document.getElementById('iaChatBody_'   + pacienteId);
  const toggle = document.getElementById('iaChatToggle_' + pacienteId);
  if (!body || !toggle) return;
  const aberto = body.style.display !== 'none';
  body.style.display = aberto ? 'none' : 'block';
  toggle.textContent  = aberto ? '▼' : '▲';
}

async function enviarMensagemChatPaciente(pacienteId) {
  const input  = document.getElementById('iaChatInput_' + pacienteId);
  const msgsEl = document.getElementById('iaChatMsgs_'  + pacienteId);
  const btn    = document.getElementById('iaChatSend_'  + pacienteId);
  if (!input || !msgsEl || !btn) return;
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;

  const ctx = JSON.stringify({
    nome: p.nome, idade: p.idade, sexo: p.sexo, condicoes: p.condicoes,
    pressao: p.pressao, fc: p.fc, glicemia: p.glicemia, saturacao: p.saturacao,
    peso: p.peso, altura: p.altura, imc: p.imc, temperatura: p.temperatura,
    sono: p.sono, hrv: p.hrv, passos: p.passos,
    medicacoes: p.meds,
    historico: (p.historico || []).slice(0, 20),
    anotacoesConsultas: (p.anotacoesConsultas || []).slice(0, 5),
    exames: exames.filter(e => e.pacienteId === pacienteId).map(e => ({
      nome: e.nome, tipo: e.tipo, data: e.data, status: e.statusFluxo, prioridade: e.prioridade,
    })),
  });

  const esc = s => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  msgsEl.innerHTML += `<div class="ia-chat-msg ia-chat-msg--user">${esc(pergunta)}</div>`;
  input.value = '';
  btn.disabled = true; input.disabled = true;
  const loadingId = 'iaChatLoading_' + pacienteId + '_' + Date.now();
  msgsEl.innerHTML += `<div class="ia-chat-msg ia-chat-msg--bot ia-chat-loading" id="${loadingId}">Consultando dados…</div>`;
  msgsEl.scrollTop = msgsEl.scrollHeight;

  if (!_chatHistorico[pacienteId]) _chatHistorico[pacienteId] = [];
  _chatHistorico[pacienteId].push({ role: 'user', content: pergunta });

  try {
    const apiKey = getAIKey();
    if (!apiKey) throw new Error('Chave de API não configurada. Acesse Configurações → IA / API Key.');
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `Você é um assistente clínico de apoio ao médico. Responda perguntas sobre o paciente com base nos dados abaixo.
Seja direto e use linguagem médica. Nunca faça diagnóstico definitivo.
Se a informação não estiver nos dados, diga explicitamente.
DADOS DO PACIENTE (JSON):\n${ctx}`,
        messages: _chatHistorico[pacienteId],
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${resp.status}`);
    }
    const data = await resp.json();
    const resposta = data.content?.find(b => b.type === 'text')?.text || 'Sem resposta.';
    _chatHistorico[pacienteId].push({ role: 'assistant', content: resposta });

    const loading = document.getElementById(loadingId);
    if (loading) {
      loading.classList.remove('ia-chat-loading');
      loading.innerHTML = resposta.replace(/</g, '&lt;').replace(/\n/g, '<br>');
    }
  } catch (e) {
    const loading = document.getElementById(loadingId);
    if (loading) loading.textContent = 'Erro: ' + e.message;
  } finally {
    btn.disabled = false; input.disabled = false;
    msgsEl.scrollTop = msgsEl.scrollHeight;
    input.focus();
  }
}

/* ── Feature 6: Sugestão de risco na triagem ── */
async function sugerirRiscoTriagemIA() {
  const btn  = document.getElementById('btnTriagemRiscoIA');
  const wrap = document.getElementById('triagemIARiscoWrap');
  const div  = document.getElementById('triagemIARiscoTexto');
  if (!btn || !wrap || !div) return;

  const pressao = (document.getElementById('triagemPressao')?.value || '').trim();
  const fc   = (document.getElementById('triagemFc')      ?.value || '').trim();
  const sat  = (document.getElementById('triagemSat')     ?.value || '').trim();
  const temp = (document.getElementById('triagemTemp')    ?.value || '').trim();
  const sint = (document.getElementById('triagemSintomas')?.value || '').trim();

  if (!pressao && !fc && !sat && !temp) {
    alert('Preencha ao menos um sinal vital antes de solicitar a avaliação.'); return;
  }

  const pid = triagemModalPacienteId;
  const p   = pid != null ? pacientes.find(x => x.id === pid) : null;

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente de triagem clínica. Com base nos sinais vitais e sintomas, classifique o risco:
- "✅ Estável" — sinais dentro do esperado, sem urgência
- "⚠️ Em observação" — sinais limítrofes ou sintomas que requerem atenção
- "🚨 Crítico" — sinais fora de faixa ou sintomas de urgência imediata

Responda em 2-4 linhas: comece com a classificação em negrito, depois explique o motivo considerando as condições preexistentes.
Não faça diagnóstico definitivo. Orientação de apoio ao profissional.`,
      `Sinais vitais: PA: ${pressao || 'não informado'} | FC: ${fc || 'não informado'} | SpO₂: ${sat || 'não informado'} | Temperatura: ${temp || 'não informado'}.
Sintomas: ${sint || 'não informado'}.
Condições preexistentes: ${p ? p.condicoes : 'não disponível'}.
Medicações: ${p ? (p.meds || []).join(', ') || 'nenhuma' : 'não disponível'}.`
    );
    div.innerHTML = res.replace(/\n/g, '<br>');
    wrap.style.display = 'block';
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Sugerir nível de risco';
  }
}

/* ── Feature 7: Alertas preditivos / análise de tendências ── */
async function analisarTendenciasIA(pacienteId) {
  const btn = document.getElementById('btnAnalisarTendencias_' + pacienteId);
  const div = document.getElementById('tendenciasIAResult_'   + pacienteId);
  if (!btn || !div) return;

  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;

  const historico = (p.historico || []).slice(0, 30);
  if (!historico.length) { alert('Nenhum dado no histórico para analisar.'); return; }

  btn.disabled = true; btn.textContent = '⏳ Aguarde…';
  try {
    const res = await chamarIA(
      `Você é um assistente de análise clínica. Analise os registros do histórico de saúde e identifique padrões preocupantes.
Responda com no máximo 5 bullet points (use "•"). Seja específico (cite dados, datas ou frequências). Priorize eventos críticos e padrões repetitivos.
Se não houver tendência preocupante, diga explicitamente que os dados recentes estão dentro do esperado.
Não faça diagnóstico. Esta análise é de apoio ao médico.`,
      `Paciente: ${p.nome}, ${p.idade} anos. Condições: ${p.condicoes}.
Registros (mais recentes primeiro):
${historico.map(h => `[${h.data}] ${h.tipo === 'red' ? '🔴' : h.tipo === 'amber' ? '🟡' : '🟢'} ${h.msg}`).join('\n')}`
    );

    div.style.display = 'block';
    div.innerHTML = `<div class="ia-tendencias-box">
      <strong style="display:block;margin-bottom:6px;color:var(--purple)">🤖 Análise de tendências (IA)</strong>
      ${res.replace(/\n/g, '<br>')}
    </div>`;

    /* Adiciona como notificação */
    const primeiraLinha = res.split('\n').find(l => l.trim()) || res;
    notificacoes.unshift({
      icon: '🤖',
      msg: `IA · ${p.nome.split(' ')[0]}: ${primeiraLinha.replace(/^•\s*/, '').slice(0, 80)}…`,
      time: 'Agora',
    });
    renderSidebar();
  } catch (e) {
    alert('Erro de IA: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '✨ Analisar tendências';
  }
}

/* ── Reconhecimento de voz (Web Speech API — demo, Chrome) ── */
const _micAtivo = {};

function iniciarTranscricao(targetId, btnId) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Reconhecimento de voz não suportado neste navegador.\nUse o Google Chrome para esta funcionalidade.');
    return;
  }

  /* Se já está gravando neste campo, para */
  if (_micAtivo[targetId]) {
    _micAtivo[targetId].stop();
    return;
  }

  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;
  _micAtivo[targetId] = rec;

  const btn = document.getElementById(btnId);
  const target = document.getElementById(targetId);
  const baseText = target ? target.value : '';
  let interim = '';

  rec.onstart = () => {
    if (btn) { btn.innerHTML = '🔴'; btn.title = 'Gravando… clique para parar'; btn.classList.add('mic-ativo'); }
  };

  rec.onresult = (e) => {
    interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    if (target) {
      const novo = baseText + (baseText && final ? ' ' : '') + final;
      target.value = novo + interim;
      target.style.height = 'auto';
      target.style.height = target.scrollHeight + 'px';
    }
  };

  rec.onend = () => {
    delete _micAtivo[targetId];
    if (btn) { btn.innerHTML = '🎤'; btn.title = 'Clique para falar'; btn.classList.remove('mic-ativo'); }
  };

  rec.onerror = (e) => {
    delete _micAtivo[targetId];
    if (btn) { btn.innerHTML = '🎤'; btn.title = 'Clique para falar'; btn.classList.remove('mic-ativo'); }
    if (e.error !== 'aborted' && e.error !== 'no-speech') alert('Microfone: ' + e.error);
  };

  rec.start();
}

function htmlMicBtn(targetId, btnId) {
  return `<button type="button" class="mic-btn" id="${btnId}" title="Clique para falar" onclick="iniciarTranscricao('${targetId}','${btnId}')">🎤</button>`;
}

/* ══════════════════════════════════════════════════════════ */

/* -- UTILS -- */
function dateString() {
  const d = new Date();
  const wd  = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = d.toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  return wd.charAt(0).toUpperCase() + wd.slice(1) + ', ' + day;
}
function timeString() {
  return new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}
/** Rótulo de data para hoje + N (ex.: amanhã no painel Agenda) */
function dateStringOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const wd  = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = d.toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  return wd.charAt(0).toUpperCase() + wd.slice(1) + ', ' + day;
}
function toIsoDateLocal(d) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function isoHoje() { return toIsoDateLocal(new Date()); }
function isoAmanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDateLocal(d);
}
function formatAgendaDataIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
  const day = dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  return wd.charAt(0).toUpperCase() + wd.slice(1) + ', ' + day;
}
function destinoAgendaPorDataIso(dataIso) {
  if (dataIso === isoHoje()) return { lista: agendaHoje, rotulo: 'hoje' };
  if (dataIso === isoAmanha()) return { lista: agendaAmanha, rotulo: 'amanhã' };
  return { lista: agendaFutura, rotulo: formatAgendaDataIso(dataIso) };
}
function calcMetricas() {
  const base = pacientesDaSessao();
  const total    = base.length;
  const criticos = base.filter(p => p.status === 'critico').length;
  const atencao  = base.filter(p => p.status === 'atencao').length;
  const estaveis = base.filter(p => p.status === 'estavel').length;
  const pct = total ? Math.round(estaveis / total * 100) : 0;
  return { total, criticos, atencao, estaveis, pct };
}

/* -- NAVIGATION -- */
let paginaAtiva = 'pacientes';
let paginaAnterior = null;
let pacienteDetalheId = null;
let agendaModalPrefillPacienteId = null;
/** Filtro da página Agenda: todos | hoje | amanha | andamento */
let agendaPageFiltro = 'todos';
/** Consultas em atendimento agora (painel)  ligadas a slots da agenda quando existirem */
let painelAtendimentos = [];
let painelNextId = 1;
let painelAgendaSeeded = false;
/** Sub-aba do Histórico no perfil: timeline | consultas | mensagens */
let detalheHistoricoSub = 'timeline';
/** Sub-aba Exames no perfil/consulta: salvos | solicitar */
let detalheExamesSub = 'salvos';
let atestadoPacienteId = null;
let receitaPacienteId = null;
let medicoModalEdicaoId = null;
/** Página dedicada «Consulta em andamento» (clínica e médico) */
let consultaAtivaPacienteId = null;
/** Paciente com consulta aberta (mantém contexto ao ir ao perfil / exames / medicação) */
let consultaContextoPacienteId = null;
/** Etapa atual do fluxo: anotacao | receita | atestado | exames | medicacao | perfil */
let consultaEtapaAtiva = 'anotacao';
/** Ao abrir perfil durante consulta, permite voltar à tela de consulta */
let consultaRetornoPacienteId = null;
/** Modal de triagem (agenda / painel) */
let triagemModalPacienteId = null;
let triagemModalAgendaId = null;

const CONSULTA_ETAPAS_FLUXO = [
  { key: 'anotacao', icon: '🩺', label: 'Anotação clínica', title: 'Registrar queixa, exame físico e conduta deste atendimento' },
  { key: 'receita', icon: '💊', label: 'Receita', title: 'Emitir prescrição sem encerrar o atendimento' },
  { key: 'atestado', icon: '📄', label: 'Atestado', title: 'Gerar atestado médico' },
  { key: 'exames', icon: '🧪', label: 'Exames', title: 'Solicitar ou registrar exames' },
  { key: 'medicacao', icon: '💉', label: 'Medicação', title: 'Adicionar medicação que o paciente tomará' },
];

const SESSAO_STORAGE_KEY = 'teepsaude_session';

function listaMedicosAtivos() {
  return medicos.filter(m => m.ativo !== false);
}

function getSessao() {
  try {
    const raw = sessionStorage.getItem(SESSAO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/** Normaliza `sess.tipo` (evita divergência com sidebar quando o valor não é exatamente 'medico'/'clinica'). */
function sessaoTipoLower() {
  const s = getSessao();
  if (!s || s.tipo == null || s.tipo === '') return '';
  return String(s.tipo).toLowerCase().trim();
}

function sessaoEhClinica() {
  return sessaoTipoLower() === 'clinica';
}

function sessaoEhMedico() {
  return sessaoTipoLower() === 'medico';
}

function sessaoMedicoId() {
  const s = getSessao();
  if (!s || !sessaoEhMedico()) return null;
  const id = Number(s.medicoId);
  if (Number.isFinite(id)) return id;
  if (s.medicoNome) {
    const m = medicos.find(x => x.nome === s.medicoNome && x.ativo !== false);
    if (m) return m.id;
  }
  return null;
}

function idsPacientesComAgendaParaMedico(medId) {
  const ids = new Set();
  [...agendaHoje, ...agendaAmanha].forEach(slot => {
    if (slot.medicoId === medId && slot.pacienteId) ids.add(slot.pacienteId);
  });
  return ids;
}

function pacientesPermitidosIdsSessao() {
  const mid = sessaoMedicoId();
  if (mid == null) return null;
  return idsPacientesComAgendaParaMedico(mid);
}

function pacientesDaSessao() {
  const ids = pacientesPermitidosIdsSessao();
  if (!ids) return pacientes;
  return pacientes.filter(p => ids.has(p.id));
}

function filtrarSlotsAgenda(lista) {
  const mid = sessaoMedicoId();
  if (mid == null) return lista;
  return lista.filter(s => s.medicoId === mid);
}

function painelEntradasVisiveis() {
  const mid = sessaoMedicoId();
  if (mid == null) return painelAtendimentos;
  return painelAtendimentos.filter(e => {
    if (e.medicoId != null) return e.medicoId === mid;
    const slot = e.agendaId != null ? encontrarSlotAgenda(e.agendaId) : null;
    return slot && slot.medicoId === mid;
  });
}

const pageTitles = {
  pacientes:'Carteira de pacientes',
  detalhe:'Perfil do paciente', alertas:'Análise de alertas',
  agenda:'Agenda', painel:'Painel de atendimento', consulta:'Consulta em andamento',  examesSolicitacoes:'Solicitações de Exames',
  examesResultados:'Resultados de Exames',
  medicacoes:'Medicações', medicos:'Equipe médica', configuracoes:'Configurações',
};

function navigateTo(page, extra) {
  if (page === 'alertas') page = 'pacientes';
  const pidNav = extra != null ? Number(extra) : NaN;
  if (page === 'consulta' && Number.isFinite(pidNav)) {
    consultaRetornoPacienteId = null;
    const pNav = pacientes.find(x => x.id === pidNav);
    if (pNav && consultaSessaoIniciada(pNav)) {
      consultaContextoPacienteId = pidNav;
      consultaAtivaPacienteId = pidNav;
      let etapaNav = pNav.consultaSessao.etapaAtual || 'anotacao';
      if (etapaNav === 'perfil') etapaNav = 'anotacao';
      consultaEtapaAtiva = etapaNav;
      if (pNav.consultaSessao.etapaAtual === 'perfil') pNav.consultaSessao.etapaAtual = 'anotacao';
    }
  } else if (page === 'detalhe' && Number.isFinite(pidNav) && consultaRetornoPacienteId === pidNav) {
    consultaContextoPacienteId = pidNav;
    consultaAtivaPacienteId = null;
  } else if (page !== 'detalhe') {
    consultaAtivaPacienteId = null;
    consultaContextoPacienteId = null;
    consultaRetornoPacienteId = null;
    consultaEtapaAtiva = 'anotacao';
  }
  // Reset filter when changing main pages (not detalhe)
  if (page !== 'detalhe' && page !== paginaAtiva) filtroAtivo = 'todos';
  paginaAnterior = paginaAtiva;
  let pageEfetiva = page;
  if (page === 'medicos' && sessaoMedicoId() != null) pageEfetiva = 'pacientes';
  if (page === 'painel' && sessaoMedicoId() != null) pageEfetiva = 'agenda';
  if (page === 'examesSolicitacoes' && sessaoMedicoId() != null) pageEfetiva = 'examesResultados';
  if (page === 'exames' && sessaoMedicoId() != null) pageEfetiva = 'examesResultados';
  if (page === 'exames' && sessaoEhClinica()) pageEfetiva = 'examesSolicitacoes';
  if (pageEfetiva === 'consulta') {
    const pid = extra != null ? Number(extra) : NaN;
    const pCons = pacientes.find(x => x.id === pid);
    if (!Number.isFinite(pid) || !consultaSessaoIniciada(pCons)) {
      pageEfetiva = Number.isFinite(pid) ? 'detalhe' : (sessaoMedicoId() != null ? 'agenda' : 'pacientes');
      if (Number.isFinite(pid)) extra = pid;
    } else {
      consultaAtivaPacienteId = pid;
    }
  }
  paginaAtiva = pageEfetiva;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageEfetiva);
  if (target) target.classList.add('active');
  document.getElementById('topbarTitle').textContent = pageTitles[pageEfetiva] || pageEfetiva;
  const showSearch = pageEfetiva === 'pacientes';
  document.getElementById('searchBoxWrap').style.display = showSearch ? 'flex' : 'none';
  const searchInp = document.getElementById('searchInput');
  if (searchInp && pageEfetiva === 'pacientes') searchInp.placeholder = 'Buscar na carteira';
  renderSidebar();
  if (pageEfetiva === 'pacientes')   renderPacientesPage();
  if (pageEfetiva === 'detalhe') {
    pacienteDetalheId = extra;
    renderDetalhePage(extra);
  }
  if (pageEfetiva === 'agenda') {
    if (!licencaConsultaAtiva()) document.getElementById('agendaPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderAgendaPage();
  }
  if (pageEfetiva === 'painel') {
    if (!licencaConsultaAtiva()) document.getElementById('painelPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderPainelPage();
  }
  if (pageEfetiva === 'examesSolicitacoes') {
    if (!licencaConsultaAtiva()) document.getElementById('examesSolicitacoesPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderExamModule('request-management', 'examesSolicitacoesPage');
  }
  if (pageEfetiva === 'examesResultados') {
    if (!licencaConsultaAtiva()) document.getElementById('examesResultadosPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderExamModule('results-view', 'examesResultadosPage');
  }
  if (pageEfetiva === 'medicacoes') {
    if (!licencaConsultaAtiva()) document.getElementById('medicacoesPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderMedicacoesPage();
  }
  if (pageEfetiva === 'medicos')     renderMedicosPage();
  if (pageEfetiva === 'configuracoes') renderConfiguracoesPage();
  if (pageEfetiva === 'consulta') {
    if (!licencaConsultaAtiva()) document.getElementById('consultaAtivaPage').innerHTML = htmlModuloConsultaBloqueado();
    else renderConsultaAtivaPage(consultaAtivaPacienteId);
  }
}

/** Logo na pasta do index: logo.png ou logo.svg */
function tryLogoFallback(img) {
  if (!img.dataset.logoStep) {
    img.dataset.logoStep = '1';
    img.src = 'logo.svg';
    return;
  }
  img.style.display = 'none';
  const banner = img.closest('.sidebar-logo-banner');
  if (banner) banner.style.display = 'none';
}

/* -- SIDEBAR -- */
function resolveNavBadge(item) {
  if (item.page === 'pacientes') return pacientesDaSessao().filter(p => p.status === 'critico').length;
  if (item.page === 'painel') return painelEntradasVisiveis().length;
  if (item.page === 'examesSolicitacoes') {
    return examesSolicitacoesLista().filter(e => e.prioridade === 'urgente' && e.statusFluxo !== 'concluido').length;
  }
  if (item.page === 'examesResultados') {
    return examesResultadosLista().length;
  }
  if (item.page === 'medicacoes') return medicacoes.filter(m => m.status === 'critico').length;
  return item.badge;
}

function renderSidebar() {
  const el = document.getElementById('sidebar');
  const sess = getSessao();
  const navClinicaVisivel = sess && sessaoEhMedico()
    ? navClinica.filter(x => x.page !== 'medicos')
    : navClinica;
  const navPrincipalVisivel = (() => {
    let nav = navPrincipal;
    if (sess && sessaoEhMedico()) nav = nav.filter(x => x.page !== 'painel');
    if (!licencaConsultaAtiva()) nav = nav.filter(x => x.page !== 'painel' && x.page !== 'agenda');
    return nav;
  })();
  const navItem = item => {
    const b = resolveNavBadge(item);
    const badge = b
      ? `<span class="nav-badge ${item.badgeColor||''}">${b}</span>` : '';
    const isActive = paginaAtiva === item.page
      || (paginaAtiva === 'detalhe' && item.page === 'pacientes')
      || (paginaAtiva === 'consulta' && (item.page === 'agenda' || item.page === 'painel'))
      || (paginaAtiva === 'examesSolicitacoes' && item.page === 'examesSolicitacoes')
      || (paginaAtiva === 'examesResultados' && item.page === 'examesResultados');
    return `<button class="nav-link ${isActive?'active':''}" onclick="navigateTo('${item.page}')">
      <span class="nav-icon">${item.icon}</span> ${item.label}${badge}
    </button>`;
  };
  let perfilAvatar = medico.avatar;
  let perfilNome = medico.nome;
  let perfilSub = `${medico.crm} · ${medico.especialidade}`;
  if (sess && sessaoEhClinica()) {
    perfilAvatar = '🏥';
    perfilNome = dadosClinica.nome;
    perfilSub = 'Admin';
  } else if (sess && sessaoEhMedico()) {
    const mid = sessaoMedicoId();
    const mm = mid != null ? medicos.find(m => m.id === mid) : medicos.find(m => m.nome === sess.medicoNome);
    if (mm) {
      perfilAvatar = mm.avatar || '👨‍⚕️';
      perfilNome = mm.nome;
      perfilSub = `${mm.crm} · ${mm.especialidade}`;
    }
  }
  el.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-banner">
        <img class="brand-logo-img" src="logo.png" alt="${dadosClinica.nome}" onerror="tryLogoFallback(this)">
      </div>
      <div class="sidebar-logo-text">
        <div class="logo-name">${dadosClinica.nome}</div>
        <div class="logo-sub">Painel Clínico</div>
      </div>
    </div>
    <div class="nav-section-label">Principal</div>
    ${navPrincipalVisivel.map(navItem).join('')}
    <div class="nav-section-label">Análise</div>
    ${navAnaliseParaSessao().map(navItem).join('')}
    <div class="nav-section-label">Clínica</div>
    ${navClinicaVisivel.map(navItem).join('')}
    <div class="sidebar-profile">
      <div class="profile-avatar">${perfilAvatar}</div>
      <div>
        <div class="profile-name">${perfilNome}</div>
        <div class="profile-crm">${perfilSub}</div>
      </div>
    </div>
    <div class="sidebar-logout-wrap">
      <button type="button" class="btn-outline sidebar-logout-btn" onclick="fazerLogout()">Sair</button>
    </div>`;
}

function renderTopbarDate() {
  document.getElementById('topbarDate').textContent =
    `${dateString()} · Atualizado às ${timeString()}`;
}

/* -- METRICS -- */
function metricsHtml(el) {
  if (!el) return;
  const m = calcMetricas();
  const isActive = f => filtroAtivo === f ? 'filter-active' : '';
  el.innerHTML = `
    <div class="metric-card ${isActive('todos')}" onclick="setFiltroCard('todos')">
      <div class="metric-accent" style="background:var(--purple)"></div>
      <div class="metric-label">Total pacientes</div>
      <div class="metric-value">${m.total}</div>
      <div class="metric-sub">? <span class="up">+5</span> este mês</div>
    </div>
    <div class="metric-card ${isActive('critico')}" onclick="setFiltroCard('critico')">
      <div class="metric-accent" style="background:var(--red)"></div>
      <div class="metric-label">Críticos agora</div>
      <div class="metric-value" style="color:var(--red)">${m.criticos}</div>
      <div class="metric-sub"><span class="up">Requerem atenção</span></div>
    </div>
    <div class="metric-card ${isActive('atencao')}" onclick="setFiltroCard('atencao')">
      <div class="metric-accent" style="background:var(--amber)"></div>
      <div class="metric-label">Em observação</div>
      <div class="metric-value" style="color:var(--amber)">${m.atencao}</div>
      <div class="metric-sub">Parâmetro fora do ideal</div>
    </div>
    <div class="metric-card ${isActive('estavel')}" onclick="setFiltroCard('estavel')">
      <div class="metric-accent" style="background:var(--green)"></div>
      <div class="metric-label">Estáveis</div>
      <div class="metric-value" style="color:var(--green)">${m.estaveis}</div>
      <div class="metric-sub"><span class="down">${m.pct}%</span> da carteira</div>
    </div>`;
}

function setFiltroCard(filtro) {
  filtroAtivo = filtroAtivo === filtro ? 'todos' : filtro;
  renderPacientesPage();
}

/* -- PATIENT TABLE HELPERS -- */
const dotClass  = s => ({ critico:'red', atencao:'amber', estavel:'green' }[s]||'green');
const pillClass = s => ({ critico:'critico', atencao:'atencao', estavel:'estavel' }[s]||'estavel');
const pillLabel = s => ({ critico:'Crítico', atencao:'Atenção', estavel:'Estável' }[s]||s);
const orderMap  = { critico:0, atencao:1, estavel:2 };

/* paleta de cores para avatar por ID */
const avatarPalette = [
  ['#7c3aed','#f5f3ff'],['#dc2626','#fef2f2'],['#d97706','#fffbeb'],
  ['#16a34a','#f0fdf4'],['#2563eb','#eff6ff'],['#0891b2','#ecfeff'],
  ['#7c3aed','#ede9fe'],['#be185d','#fdf2f8'],['#065f46','#d1fae5'],
  ['#1e3a8a','#dbeafe'],['#92400e','#fef3c7'],['#6b21a8','#f3e8ff'],
  ['#155e75','#cffafe'],['#14532d','#dcfce7'],['#7f1d1d','#fee2e2'],
  ['#1e40af','#dbeafe'],['#4a044e','#fae8ff'],['#0c4a6e','#e0f2fe'],
];

function patientInitials(nome) {
  const parts = nome.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0,2).toUpperCase();
}

/** Escape para uso em atributo HTML (ex.: data URL de imagem) */
function escAttrDataUrl(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

let cadPacFotoDataUrl = null;
let examePacienteNextId = 9000;

function patientAvatarHtml(p, size=34, fontSize=12) {
  const pal = avatarPalette[(p.id - 1) % avatarPalette.length];
  const ring = dotClass(p.status);
  const foto = p.fotoUrl && String(p.fotoUrl).indexOf('data:image') === 0;
  if (foto) {
    return `<div class="pat-avatar pat-avatar--photo ring-${ring}" style="width:${size}px;height:${size}px;font-size:${fontSize}px">
      <div class="status-ring"></div>
      <img src="${escAttrDataUrl(p.fotoUrl)}" alt="" />
    </div>`;
  }
  return `<div class="pat-avatar ring-${ring}" style="width:${size}px;height:${size}px;background:${pal[0]};font-size:${fontSize}px">
    <div class="status-ring"></div>
    ${patientInitials(p.nome)}
  </div>`;
}

function onCadPacFotoFileChange(ev) {
  const f = ev.target && ev.target.files && ev.target.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) {
    alert('Selecione um arquivo de imagem (JPG, PNG, WebP ou GIF).');
    return;
  }
  if (f.size > 1.5 * 1024 * 1024) {
    alert('Imagem muito grande. Use até 1,5 MB nesta demonstração.');
    limparFotoCadastroPaciente();
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    cadPacFotoDataUrl = String(reader.result || '');
    const prev = document.getElementById('cadPacFotoPreview');
    const rm = document.getElementById('cadPacFotoRemoveBtn');
    if (prev) {
      prev.src = cadPacFotoDataUrl;
      prev.style.display = 'block';
    }
    if (rm) rm.style.display = 'inline-block';
  };
  reader.readAsDataURL(f);
}

function limparFotoCadastroPaciente() {
  cadPacFotoDataUrl = null;
  const inp = document.getElementById('cadPacFotoInput');
  const prev = document.getElementById('cadPacFotoPreview');
  const rm = document.getElementById('cadPacFotoRemoveBtn');
  if (inp) inp.value = '';
  if (prev) {
    prev.removeAttribute('src');
    prev.style.display = 'none';
  }
  if (rm) rm.style.display = 'none';
}

function onPerfilFotoSelecionada(pacienteId, ev) {
  const f = ev.target && ev.target.files && ev.target.files[0];
  if (!f) return;
  if (!f.type.startsWith('image/')) {
    alert('Selecione uma imagem.');
    return;
  }
  if (f.size > 1.5 * 1024 * 1024) {
    alert('Imagem muito grande (máx. 1,5 MB nesta demo).');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const p = pacientes.find(x => x.id === pacienteId);
    if (!p) return;
    p.fotoUrl = String(reader.result || '');
    if (paginaAtiva === 'pacientes') renderPacientesPage();
    if (paginaAtiva === 'agenda') renderAgendaPage();
    if (paginaAtiva === 'painel') renderPainelPage();
    renderSideCol();
    renderDetalhePage(pacienteId);
  };
  reader.readAsDataURL(f);
}

function removerFotoPaciente(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  delete p.fotoUrl;
  if (paginaAtiva === 'pacientes') renderPacientesPage();
  if (paginaAtiva === 'agenda') renderAgendaPage();
  if (paginaAtiva === 'painel') renderPainelPage();
  renderSideCol();
  renderDetalhePage(pacienteId);
}

function adicionarExamePerfilPaciente(pacienteId) {
  const tituloInp = document.getElementById(`exameTitulo_${pacienteId}`);
  const origInp = document.getElementById(`exameOrigem_${pacienteId}`);
  const fileInp = document.getElementById(`exameFile_${pacienteId}`);
  const titulo = (tituloInp && tituloInp.value ? tituloInp.value : '').trim() || 'Exame';
  const origem = (origInp && origInp.value) || 'clinica';
  const f = fileInp && fileInp.files && fileInp.files[0];
  if (!f) {
    alert('Escolha um arquivo (foto ou PDF).');
    return;
  }
  const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const isImg = f.type.startsWith('image/');
  if (!isPdf && !isImg) {
    alert('Envie uma imagem ou um arquivo PDF.');
    return;
  }
  if (f.size > 2.5 * 1024 * 1024) {
    alert('Arquivo muito grande (máx. 2,5 MB nesta demonstração).');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const p = pacientes.find(x => x.id === pacienteId);
    if (!p) return;
    garantirModeloPaciente(p);
    const dataHist = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const mime = isPdf ? 'application/pdf' : (f.type || 'image/jpeg');
    const novoArq = {
      id: examePacienteNextId++,
      titulo,
      nomeArquivo: f.name,
      mime,
      dataUrl: reader.result,
      origem,
      dataRegistro: dataHist,
      autorizadoApp: true,
      visivelClinica: true,
    };
    garantirExameArquivoCompartilhamento(novoArq, pacienteId);
    p.examesArquivos.unshift(novoArq);
    const quem = origem === 'paciente' ? 'Paciente (app/recepção)' : 'Clínica';
    p.historico.unshift({
      data: dataHist,
      tipo: 'green',
      msg: `Exame registrado (${quem}): ${titulo}`,
    });
    if (fileInp) fileInp.value = '';
    if (tituloInp) tituloInp.value = '';
    detalheExamesSub = 'salvos';
    if (typeof refreshExamesPacienteUI === 'function') refreshExamesPacienteUI(pacienteId);
    else renderDetalhePage(pacienteId);
  };
  reader.onerror = () => alert('Não foi possível ler o arquivo.');
  reader.readAsDataURL(f);
}

function removerExamePerfilPaciente(pacienteId, exameId) {
  if (!confirm('Remover este exame da ficha?')) return;
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  garantirModeloPaciente(p);
  p.examesArquivos = p.examesArquivos.filter(x => x.id !== exameId);
  if (typeof refreshExamesPacienteUI === 'function') refreshExamesPacienteUI(pacienteId);
  else renderDetalhePage(pacienteId);
}

function abrirExamePacienteNovaAba(pacienteId, exameId) {
  const p = pacientes.find(x => x.id === pacienteId);
  const ex = p && p.examesArquivos && p.examesArquivos.find(x => x.id === exameId);
  if (!ex || !ex.dataUrl) return;
  window.open(ex.dataUrl, '_blank', 'noopener,noreferrer');
}

let filtroAtivo = 'todos';
let termoBusca  = '';
/** Filtro da coluna de alertas em Pacientes: todos | critico | aviso */
let alertasSideFiltro = 'todos';

/** ExamModule  filtros solicitações (clínica) */
let examSolicFiltroStatus = 'todos';
let examSolicFiltroPacienteId = null;
let examSolicFiltroPrioridade = 'todos';

/** ExamModule  filtros resultados (clínica + médico) */
let examResFiltroPacienteId = null;
let examResFiltroTipo = 'todos';
let examResPeriodoPreset = 'none';
let examResDataInicio = '';
let examResDataFim = '';

function navAnaliseParaSessao() {
  // Medicações e Exames só aparecem com módulo Consulta ativo
  if (!licencaConsultaAtiva()) return [];
  const examesNav = sessaoEhClinica()
    ? [
        { icon:'📋', label:'Solicitações de Exames', page:'examesSolicitacoes', badgeColor:'' },
        { icon:'🧪', label:'Resultados de Exames', page:'examesResultados', badgeColor:'' },
      ]
    : [{ icon:'🧪', label:'Resultados de Exames', page:'examesResultados', badgeColor:'' }];
  return [
    ...navAnalise,
    ...examesNav,
  ];
}

function pacienteIdPorNomeExame(nome) {
  const p = pacientes.find(x => x.nome === nome);
  return p ? p.id : null;
}

function garantirModeloExameSolicitacao(e) {
  if (!e) return;
  if (!e.pacienteId && e.paciente) e.pacienteId = pacienteIdPorNomeExame(e.paciente);
  if (!e.prioridade) e.prioridade = e.status === 'urgente' ? 'urgente' : 'normal';
  if (!e.statusFluxo) {
    if (e.status === 'concluido') e.statusFluxo = 'concluido';
    else if (e.status === 'urgente' || e.status === 'pendente') e.statusFluxo = 'solicitado';
    else e.statusFluxo = 'solicitado';
  }
  if (!Array.isArray(e.anexos)) e.anexos = [];
  if (!Array.isArray(e.compartilhadoMedicoIds)) e.compartilhadoMedicoIds = [];
  if (e.autorizadoPaciente == null) e.autorizadoPaciente = true;
  if (!e.origem) e.origem = 'clinica';
  if (!e.dataIso && e.data) {
    const m = String(e.data).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) e.dataIso = `${m[3]}-${m[2]}-${m[1]}`;
  }
}

function garantirExameArquivoCompartilhamento(arq, pacienteId) {
  if (!arq) return;
  if (arq.autorizadoApp == null) arq.autorizadoApp = true;
  if (arq.visivelClinica == null) arq.visivelClinica = true;
  if (!Array.isArray(arq.compartilhadoMedicoIds)) {
    const meds = new Set();
    [...agendaHoje, ...agendaAmanha].forEach(s => {
      if (s.pacienteId === pacienteId && s.medicoId) meds.add(s.medicoId);
    });
    arq.compartilhadoMedicoIds = [...meds];
  }
}

function exameCompartilhadoComMedicoSessao(e) {
  const mid = sessaoMedicoId();
  if (mid == null) return true;
  return Array.isArray(e.compartilhadoMedicoIds) && e.compartilhadoMedicoIds.includes(mid);
}

function pacienteVisivelExameSessao(pacienteId) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (!permitidos) return true;
  return pacienteId != null && permitidos.has(pacienteId);
}

function examesSolicitacoesLista() {
  exames.forEach(garantirModeloExameSolicitacao);
  return exames.filter(e => pacienteVisivelExameSessao(e.pacienteId));
}

function examesResultadosLista() {
  const mid = sessaoMedicoId();
  const out = [];
  const vistos = new Set();

  exames.forEach(e => {
    garantirModeloExameSolicitacao(e);
    if (!pacienteVisivelExameSessao(e.pacienteId)) return;
    if (!e.anexos || !e.anexos.length) return;
    if (mid != null && !exameCompartilhadoComMedicoSessao(e)) return;
    if (e.autorizadoPaciente === false) return;
    e.anexos.forEach(ax => {
      const key = `s-${e.id}-${ax.id}`;
      if (vistos.has(key)) return;
      vistos.add(key);
      out.push({
        key,
        fonte: 'solicitacao',
        solicitacaoId: e.id,
        anexoId: ax.id,
        nome: e.nome,
        pacienteId: e.pacienteId,
        paciente: e.paciente,
        tipo: e.tipo,
        data: ax.dataRegistro || e.data,
        dataIso: e.dataIso,
        origem: e.origem === 'paciente' ? 'App do paciente' : 'Clínica',
        anexo: ax,
      });
    });
  });

  pacientesDaSessao().forEach(p => {
    garantirModeloPaciente(p);
    (p.examesArquivos || []).forEach(arq => {
      garantirExameArquivoCompartilhamento(arq, p.id);
      if (mid != null && !arq.compartilhadoMedicoIds.includes(mid)) return;
      if (arq.autorizadoApp === false) return;
      if (sessaoEhClinica() && arq.visivelClinica === false) return;
      const key = `f-${p.id}-${arq.id}`;
      if (vistos.has(key)) return;
      vistos.add(key);
      out.push({
        key,
        fonte: 'ficha',
        pacienteId: p.id,
        paciente: p.nome,
        nome: arq.titulo,
        tipo: 'Anexo',
        data: arq.dataRegistro,
        dataIso: null,
        origem: arq.origem === 'paciente' ? 'App do paciente' : 'Clínica / ficha',
        anexo: arq,
      });
    });
  });

  return out.sort((a, b) => String(b.data).localeCompare(String(a.data), 'pt-BR'));
}

function examResultadoTimestamp(row) {
  if (row.dataIso) {
    const d = new Date(row.dataIso + 'T12:00:00');
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  const m = String(row.data || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`).getTime();
  return 0;
}

function examResultadosIntervalo() {
  const now = Date.now();
  if (examResPeriodoPreset === 'none') return null;
  if (examResPeriodoPreset === '30') return { ini: now - 30 * 86400000, fim: now };
  if (examResPeriodoPreset === '90') return { ini: now - 90 * 86400000, fim: now };
  if (examResPeriodoPreset === 'custom') {
    let ini = -Infinity;
    let fim = Infinity;
    const di = parseYmdLocal(examResDataInicio);
    const df = parseYmdLocal(examResDataFim);
    if (di) ini = inicioDoDiaLocal(di);
    if (df) fim = fimDoDiaLocal(df);
    return { ini, fim };
  }
  return null;
}

function aplicarFiltrosResultados(lista) {
  let x = lista;
  if (examResFiltroPacienteId != null && examResFiltroPacienteId !== '') {
    const pid = Number(examResFiltroPacienteId);
    x = x.filter(r => r.pacienteId === pid);
  }
  if (examResFiltroTipo !== 'todos') {
    x = x.filter(r => r.tipo === examResFiltroTipo);
  }
  const iv = examResultadosIntervalo();
  if (iv) {
    x = x.filter(r => {
      const t = examResultadoTimestamp(r);
      return t >= iv.ini && t <= iv.fim;
    });
  }
  return x;
}

function aplicarFiltrosSolicitacoes(lista) {
  let x = lista;
  if (examSolicFiltroPacienteId != null && examSolicFiltroPacienteId !== '') {
    const pid = Number(examSolicFiltroPacienteId);
    x = x.filter(e => e.pacienteId === pid);
  }
  if (examSolicFiltroPrioridade !== 'todos') {
    x = x.filter(e => e.prioridade === examSolicFiltroPrioridade);
  }
  if (examSolicFiltroStatus === 'pendentes') {
    x = x.filter(e => e.statusFluxo !== 'concluido' && e.statusFluxo !== 'resultado_recebido');
  } else if (examSolicFiltroStatus === 'urgentes') {
    x = x.filter(e => e.prioridade === 'urgente' && e.statusFluxo !== 'concluido');
  } else if (examSolicFiltroStatus !== 'todos') {
    x = x.filter(e => e.statusFluxo === examSolicFiltroStatus);
  }
  return x;
}

function patientRowHtml(p, showMsg) {
  const pend = pacienteVinculoPendente(p);
  const nomeHtml = pend
    ? `<div class="patient-name">${p.nome}<span class="vinculo-list-badge">App</span></div>`
    : `<div class="patient-name">${p.nome}</div>`;
  const idadeHtml = pend
    ? `<div class="patient-age">Vínculo pendente · aguardando titular no app</div>`
    : `<div class="patient-age">${p.idade} anos · ${p.condicoes}</div>`;
  const pressaoHtml = pend
    ? `<span class="vital-badge muted-pa"></span>`
    : `<span class="vital-badge ${p.paColor}">${p.pressao}</span>`;
  const actions = showMsg
    ? `<div class="row-actions">
        <button class="msg-btn" onclick="event.stopPropagation();openMsgModal(${p.id})" title="Enviar mensagem ao paciente">Mensagem</button>
        <button class="action-btn" onclick="event.stopPropagation();openDetalhe(${p.id})" title="Ver dados e histórico — não inicia atendimento">Analisar ficha</button>
       </div>`
    : `<button class="action-btn" onclick="event.stopPropagation();openDetalhe(${p.id})" title="Ver dados e histórico — não inicia atendimento">Analisar ficha</button>`;
  return `
    <div class="patient-row" onclick="openDetalhe(${p.id})">
      ${patientAvatarHtml(p)}
      <div>
        ${nomeHtml}
        ${idadeHtml}
      </div>
      <div>${pressaoHtml}</div>
      <div class="med-status col-med">${p.medicacao}</div>
      <div class="col-last" style="font-size:11px;color:var(--muted)">${p.ultimoReg}</div>
      <div><span class="risk-pill ${pillClass(p.status)}">${pillLabel(p.status)}</span></div>
      <div>${actions}</div>
    </div>`;
}

function tableHeaderHtml() {
  return `<div class="patient-row header-row">
    <div></div>
    <div class="col-label">Paciente</div>
    <div class="col-label">Pressão</div>
    <div class="col-label col-med">Medicação</div>
    <div class="col-label col-last">Último reg.</div>
    <div class="col-label">Risco</div>
    <div class="col-label">Ações</div>
  </div>`;
}

function getList() {
  let lista = [...pacientesDaSessao()].sort((a, b) => {
    const ap = pacienteVinculoPendente(a) ? 0 : 1;
    const bp = pacienteVinculoPendente(b) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return orderMap[a.status] - orderMap[b.status];
  });
  if (filtroAtivo !== 'todos') lista = lista.filter(p => p.status === filtroAtivo);
  if (termoBusca.trim()) {
    const t = termoBusca.toLowerCase();
    lista = lista.filter(p =>
      p.nome.toLowerCase().includes(t) ||
      p.condicoes.toLowerCase().includes(t) ||
      String(p.telefone || '').toLowerCase().includes(t) ||
      String(p.email || '').toLowerCase().includes(t));
  }
  return lista;
}

function paColorFromSysDia(sys, dia) {
  if (sys >= 160 || dia >= 100) return 'red';
  if (sys >= 140 || dia >= 90) return 'amber';
  return 'green';
}

let cadPacUltimoCadastrado = null;

function setCadPacModo(modo) {
  cadPacModo = modo === 'vinculo' ? 'vinculo' : 'cadastro';
  const tabC = document.getElementById('cadPacTabCadastro');
  const tabV = document.getElementById('cadPacTabVinculo');
  const blocoC = document.getElementById('cadPacBlocoCadastro');
  const blocoV = document.getElementById('cadPacBlocoVinculo');
  const btn = document.getElementById('cadPacSubmitBtn');
  if (tabC && tabV) {
    tabC.classList.toggle('active', cadPacModo === 'cadastro');
    tabV.classList.toggle('active', cadPacModo === 'vinculo');
    tabC.setAttribute('aria-selected', cadPacModo === 'cadastro' ? 'true' : 'false');
    tabV.setAttribute('aria-selected', cadPacModo === 'vinculo' ? 'true' : 'false');
  }
  if (blocoC && blocoV) {
    blocoC.style.display = cadPacModo === 'cadastro' ? 'grid' : 'none';
    blocoV.style.display = cadPacModo === 'vinculo' ? 'grid' : 'none';
  }
  if (btn) btn.textContent = cadPacModo === 'vinculo' ? 'Solicitar vínculo' : 'Cadastrar paciente';
  const focusId = cadPacModo === 'vinculo' ? 'cadPacCodigoVinculo' : 'cadPacNome';
  const fe = document.getElementById(focusId);
  if (fe && document.getElementById('cadPacOverlay')?.classList.contains('open')) fe.focus();
}

function handleCadPacFormSubmit() {
  if (cadPacModo === 'vinculo') submitVinculoTitular();
  else submitCadastroPaciente();
}

function mostrarTelaSucessoVinculo(novo) {
  const formEl = document.getElementById('cadPacForm');
  const okEl = document.getElementById('cadPacSucesso');
  const body = document.getElementById('cadPacSucessoBody');
  document.getElementById('cadPacModalTitle').textContent = 'Pedido enviado ao app';
  document.getElementById('cadPacModalSub').textContent =
    'O titular recebe uma notificação para aprovar ou recusar. Até lá, a clínica não vê dados pessoais do app.';
  formEl.style.display = 'none';
  okEl.style.display = 'flex';
  okEl.style.flexDirection = 'column';
  okEl.style.flex = '1';
  okEl.style.minHeight = '0';
  const v = novo.vinculoApp;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  body.innerHTML = `
    <p style="font-size:14px;line-height:1.55;padding:4px 0">
      Incluímos <strong>${esc(novo.nome)}</strong> na carteira com status <strong>vínculo pendente</strong>.
    </p>
    <div class="cad-pac-sucesso-box">
      <div><strong>Código usado:</strong> <code>${esc(v.codigoInformado)}</code></div>
      <div style="margin-top:10px;font-size:12px;color:var(--muted)">
        Abra o perfil deste paciente e use <strong>Simular aceite no app (demo)</strong> para liberar nome, contato e sinais  como se o titular tivesse aprovado no celular.
      </div>
    </div>`;
}

function submitVinculoTitular() {
  const raw = document.getElementById('cadPacCodigoVinculo').value;
  const code = normalizeCodigoVinculo(raw);
  if (!code) {
    alert('Informe o código de vínculo gerado pelo titular no app.');
    return;
  }
  const entry = DEMO_CODIGOS_VINCULO[code];
  if (!entry) {
    alert(
      'Código não reconhecido nesta demo. Peça um código novo ao titular no app.\n\nExemplos válidos: TS-7K2M-X9 ou TS-3N8P-Q1.',
    );
    return;
  }
  if (codigoVinculoJaUsadoNaCarteira(code)) {
    alert('Este código já foi usado nesta carteira (demo). Use outro titular ou outro código.');
    return;
  }
  const nota = document.getElementById('cadPacNotaVinculo').value.trim();
  const novoId = pacienteNextId++;
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const novo = {
    id: novoId,
    nome: 'Titular  aguardando app',
    idade: 0,
    sexo: 'F',
    condicoes: 'Vínculo solicitado · aguardando confirmação do titular no app',
    pressao: '',
    paColor: 'green',
    medicacao: '',
    ultimoReg: '',
    status: 'estavel',
    peso: '',
    altura: '',
    glicemia: '',
    saturacao: '',
    fc: '',
    imc: '',
    sono: '',
    passos: '',
    hrv: '',
    temperatura: '',
    telefone: '',
    email: '',
    meds: [],
    ultimaConsulta: '',
    proximaConsulta: '',
    historico: [
      {
        data: dataHist,
        tipo: 'amber',
        msg: `Vínculo: pedido enviado com código ${code}. Titular deve aprovar no app  dados do SaaS não visíveis até lá.${nota ? ` Obs.: ${nota}.` : ''}`,
      },
    ],
    msgs: [],
    anotacoesConsultas: [],
    examesArquivos: [],
    vinculoApp: {
      estado: 'pendente',
      codigoInformado: code,
      idTitularSaaS: entry.idTitularSaaS,
      solicitadoEm: dataHist,
      notaClinica: nota || null,
    },
  };

  pacientes.push(novo);
  cadPacUltimoCadastrado = null;
  renderSidebar();
  if (paginaAtiva === 'pacientes') renderPacientesPage();

  mostrarTelaSucessoVinculo(novo);
}

function simularAceiteVinculoApp(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p || !pacienteVinculoPendente(p)) return;
  const code = p.vinculoApp.codigoInformado;
  const entry = DEMO_CODIGOS_VINCULO[code];
  if (!entry) {
    alert('Código de demo não encontrado para este paciente.');
    return;
  }
  const patch = entry.dadosPosAceite();
  Object.assign(p, patch);
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  p.vinculoApp = {
    ...p.vinculoApp,
    estado: 'ativo',
    ativadoEm: dataHist,
  };
  p.historico.push({
    data: dataHist,
    tipo: 'green',
    msg: 'Vínculo aprovado pelo titular no app (simulado na demo). Dados do SaaS liberados para a carteira da clínica.',
  });
  renderSidebar();
  if (paginaAtiva === 'pacientes') renderPacientesPage();
  if (paginaAtiva === 'detalhe' && pacienteDetalheId === pacienteId) renderDetalhePage(pacienteId);
}

function gerarSenhaProvisoriaApp() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function definirUsuarioAppPaciente(emailRaw, telefoneRaw, idPaciente) {
  const em = String(emailRaw || '').trim().toLowerCase();
  if (em && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return em;
  const d = String(telefoneRaw || '').replace(/\D/g, '');
  if (d.length >= 10) return `pac_${d.slice(-11)}`;
  return `paciente_${idPaciente}`;
}

function montarAppPacienteClinica(idPaciente, email, telefone) {
  return {
    usuario: definirUsuarioAppPaciente(email, telefone, idPaciente),
    senhaProvisoria: gerarSenhaProvisoriaApp(),
    primeiroAcessoPendente: true,
    linkDownload: APP_PACIENTE_DOWNLOAD_URL,
    cadastradoEm: new Date().toISOString(),
  };
}

function textoConviteWhatsAppPaciente(p) {
  const a = p.app;
  const primeiro = p.nome.trim().split(/\s+/)[0] || 'Olá';
  return (
    `Olá, ${primeiro}! Aqui é da equipe ${medico.clinica}.\n\n` +
    `Baixe o aplicativo para acompanhar sua saúde e ficar sincronizado com nosso acompanhamento:\n${a.linkDownload}\n\n` +
    `Seu acesso provisório:\nUsuário: ${a.usuario}\nSenha: ${a.senhaProvisoria}\n\n` +
    `No primeiro acesso o app vai pedir para você criar uma nova senha pessoal.\n\n` +
    `Dúvidas? Responda por aqui.`
  );
}

function telefoneSoDigitosWhatsApp(telefone) {
  let d = String(telefone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) d = '55' + d;
  return d;
}

function abrirWhatsAppConvitePaciente(p) {
  if (!p || !p.app) return;
  const d = telefoneSoDigitosWhatsApp(p.telefone === '' ? '' : p.telefone);
  if (d.length < 12) {
    alert('Cadastre um telefone com DDD (10 ou 11 dígitos) para enviar pelo WhatsApp.');
    return;
  }
  const url = `https://wa.me/${d}?text=${encodeURIComponent(textoConviteWhatsAppPaciente(p))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function abrirWhatsAppConvitePacienteById(id) {
  const p = pacientes.find(x => x.id === id);
  if (p) abrirWhatsAppConvitePaciente(p);
}

function copiarTextoCadPac() {
  if (!cadPacUltimoCadastrado || !cadPacUltimoCadastrado.app) return;
  const t = textoConviteWhatsAppPaciente(cadPacUltimoCadastrado);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(
      () => alert('Mensagem copiada. Cole no WhatsApp ou em outro canal.'),
      () => alert('Não foi possível copiar automaticamente.')
    );
  } else {
    alert('Copie manualmente o texto da mensagem de convite.');
  }
}

function mostrarTelaSucessoCadastroPaciente(novo, syncApp) {
  const formEl = document.getElementById('cadPacForm');
  const okEl = document.getElementById('cadPacSucesso');
  const body = document.getElementById('cadPacSucessoBody');
  document.getElementById('cadPacModalTitle').textContent = 'Paciente cadastrado';
  document.getElementById('cadPacModalSub').textContent = syncApp && novo.app
    ? 'Usuário do app criado na clínica  senha provisória e troca obrigatória no 1º acesso.'
    : 'Registro salvo na carteira.';
  formEl.style.display = 'none';
  okEl.style.display = 'flex';
  okEl.style.flexDirection = 'column';
  okEl.style.flex = '1';
  okEl.style.minHeight = '0';

  if (!syncApp || !novo.app) {
    body.innerHTML = `<p style="font-size:14px;line-height:1.55;padding:4px 0">${novo.nome} foi adicionado à carteira.</p>`;
    return;
  }
  const a = novo.app;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  body.innerHTML = `
    <p style="font-size:14px;line-height:1.5;margin-bottom:12px"><strong>${esc(novo.nome)}</strong> pode entrar no app com:</p>
    <div class="cad-pac-sucesso-box">
      <div><strong>Usuário:</strong> <code>${esc(a.usuario)}</code></div>
      <div style="margin-top:8px"><strong>Senha provisória:</strong> <code>${esc(a.senhaProvisoria)}</code></div>
      <div style="margin-top:10px;font-size:12px;color:var(--muted)">No primeiro login o app exige nova senha. Este cadastro fica sincronizado com a carteira da clínica.</div>
      <div style="margin-top:10px;font-size:12px;color:var(--muted)">Download: <a href="${esc(a.linkDownload)}" target="_blank" rel="noopener noreferrer">${esc(a.linkDownload)}</a></div>
    </div>
    <div class="cad-pac-sucesso-actions">
      <button type="button" class="btn-outline" onclick="copiarTextoCadPac()" style="padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--white);cursor:pointer;font-weight:600;font-size:13px;font-family:'DM Sans',sans-serif">Copiar mensagem (WhatsApp)</button>
      <button type="button" class="btn-primary" onclick="abrirWhatsAppConvitePaciente(cadPacUltimoCadastrado)" style="padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:13px;font-family:'DM Sans',sans-serif">Abrir WhatsApp de novo</button>
    </div>`;
}

function openCadastroPacienteModal() {
  const formEl = document.getElementById('cadPacForm');
  const okEl = document.getElementById('cadPacSucesso');
  document.getElementById('cadPacModalTitle').textContent = 'Incluir paciente';
  document.getElementById('cadPacModalSub').textContent =
    'Cadastre na clínica ou vincule um titular que já usa o app (demonstração  dados só neste navegador).';
  formEl.style.display = 'flex';
  formEl.style.flexDirection = 'column';
  formEl.style.flex = '1';
  formEl.style.minHeight = '0';
  okEl.style.display = 'none';
  const f = document.getElementById('cadPacForm');
  if (f) f.reset();
  limparFotoCadastroPaciente();
  const cv = document.getElementById('cadPacCodigoVinculo');
  const nv = document.getElementById('cadPacNotaVinculo');
  if (cv) cv.value = '';
  if (nv) nv.value = '';
  const sApp = document.getElementById('cadPacSyncApp');
  const sWa = document.getElementById('cadPacWaConvite');
  if (sApp) sApp.checked = true;
  if (sWa) sWa.checked = true;
  setCadPacModo('cadastro');
  document.getElementById('cadPacOverlay').classList.add('open');
  const el = document.getElementById('cadPacNome');
  if (el) el.focus();
}

function closeCadastroPacienteModal() {
  document.getElementById('cadPacOverlay').classList.remove('open');
  const formEl = document.getElementById('cadPacForm');
  const okEl = document.getElementById('cadPacSucesso');
  formEl.style.display = 'flex';
  formEl.style.flexDirection = 'column';
  okEl.style.display = 'none';
  formEl.reset();
  limparFotoCadastroPaciente();
  const cv = document.getElementById('cadPacCodigoVinculo');
  const nv = document.getElementById('cadPacNotaVinculo');
  if (cv) cv.value = '';
  if (nv) nv.value = '';
  const sApp = document.getElementById('cadPacSyncApp');
  const sWa = document.getElementById('cadPacWaConvite');
  if (sApp) sApp.checked = true;
  if (sWa) sWa.checked = true;
  setCadPacModo('cadastro');
  cadPacUltimoCadastrado = null;
}

function submitCadastroPaciente() {
  const nome = document.getElementById('cadPacNome').value.trim();
  const idade = parseInt(document.getElementById('cadPacIdade').value, 10);
  if (!nome) return;
  if (!Number.isFinite(idade) || idade < 0 || idade > 130) {
    alert('Informe uma idade válida (0 a 130).');
    return;
  }
  const sexo = document.getElementById('cadPacSexo').value || 'F';
  const condicoes = document.getElementById('cadPacCondicoes').value.trim() || 'Sem condições registradas';
  const telefone = document.getElementById('cadPacTelefone').value.trim();
  const email = document.getElementById('cadPacEmail').value.trim();
  let kg = parseNumLoose(document.getElementById('cadPacPeso').value);
  if (kg == null || kg <= 0) kg = 70;
  let altM = parseNumLoose(document.getElementById('cadPacAltura').value);
  if (altM == null || altM <= 0) altM = 1.7;
  if (altM > 2.5) altM = altM / 100;
  const pressaoIn = document.getElementById('cadPacPressao').value.trim();
  const pr = parsePressaoStr(pressaoIn || '120/80');
  const pressaoStr = `${pr.sys}/${pr.dia}`;
  const paColor = paColorFromSysDia(pr.sys, pr.dia);
  const status = document.getElementById('cadPacStatus').value || 'estavel';
  const imcNum = Math.round((kg / (altM * altM)) * 10) / 10;
  const imcStr = String(imcNum).replace('.', ',');
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const syncApp = document.getElementById('cadPacSyncApp').checked;
  const waConvite = document.getElementById('cadPacWaConvite').checked;

  const novoId = pacienteNextId++;
  const novo = {
    id: novoId,
    nome,
    idade,
    sexo,
    condicoes,
    pressao: pressaoStr,
    paColor,
    medicacao: 'Sem medicação cadastrada',
    ultimoReg: 'Agora',
    status,
    peso: `${String(kg).replace('.', ',')}kg`,
    altura: `${String(altM).replace('.', ',')}m`,
    glicemia: '92 mg/dL',
    saturacao: '98%',
    fc: '72 bpm',
    imc: imcStr,
    sono: '7h',
    passos: '0',
    hrv: '35ms',
    temperatura: '36,5°C',
    telefone: telefone || '',
    email: email || '',
    meds: [],
    ultimaConsulta: '',
    proximaConsulta: '',
    historico: [
      { data: dataHist, tipo: 'green', msg: 'Paciente cadastrado na carteira.' },
    ],
    msgs: [],
    anotacoesConsultas: [],
    examesArquivos: [],
  };

  if (cadPacFotoDataUrl) novo.fotoUrl = cadPacFotoDataUrl;

  if (syncApp) {
    novo.app = montarAppPacienteClinica(novoId, email, telefone);
    novo.historico.push({
      data: dataHist,
      tipo: 'green',
      msg: `App: usuário ${novo.app.usuario} criado com senha provisória  1º acesso exige nova senha (sincronizado com a clínica).`,
    });
  }

  pacientes.push(novo);
  cadPacUltimoCadastrado = novo;
  limparFotoCadastroPaciente();
  renderSidebar();
  if (paginaAtiva === 'pacientes') renderPacientesPage();

  if (syncApp && waConvite && telefone) {
    abrirWhatsAppConvitePaciente(novo);
  }

  mostrarTelaSucessoCadastroPaciente(novo, syncApp);
}

function renderSideCol() {
  const sideRoot = document.getElementById('sideCol');
  if (!sideRoot) return;
  const permitidos = pacientesPermitidosIdsSessao();
  let alertasBase = alertas.filter(a => a.ativo);
  if (permitidos) alertasBase = alertasBase.filter(a => permitidos.has(a.pacienteId));
  if (alertasSideFiltro === 'critico') alertasBase = alertasBase.filter(a => a.severity === 'red');
  if (alertasSideFiltro === 'aviso') alertasBase = alertasBase.filter(a => a.severity === 'amber');
  alertasBase.sort((a, b) => alertaTimestamp(b) - alertaTimestamp(a));
  const totalAtivos = alertas.filter(a => a.ativo && (!permitidos || permitidos.has(a.pacienteId))).length;
  const criticosN = alertas.filter(a => a.ativo && (!permitidos || permitidos.has(a.pacienteId)) && a.severity === 'red').length;
  const avisosN = alertas.filter(a => a.ativo && (!permitidos || permitidos.has(a.pacienteId)) && a.severity === 'amber').length;
  const chip = (f, label, n) => {
    const on = alertasSideFiltro === f ? ' alertas-side-chip--on' : '';
    return `<button type="button" class="alertas-side-chip${on}" onclick="setAlertasSideFiltro('${f}')">${label}${n != null ? ` (${n})` : ''}</button>`;
  };
  const alertasHtml = alertasBase.length
    ? alertasBase.map(sideAlertItemHtml).join('')
    : '<div class="alertas-side-empty">Nenhum alerta neste filtro.</div>';

  const agendaSlice = filtrarSlotsAgenda([...agendaHoje].sort((a, b) => a.hora.localeCompare(b.hora))).slice(0, 5);
  const agendaHtml = agendaSlice.map(c => {
    const pac = (c.pacienteId && pacientes.find(x => x.id === c.pacienteId)) || pacientes.find(x => x.nome === c.paciente);
    const avatarEl = pac
      ? `<div style="flex-shrink:0">${patientAvatarHtml(pac, 28, 10)}</div>`
      : `<div class="schedule-time">${c.hora}</div>`;
    const med = c.medico || medico.nome;
    const open = pac ? `onclick="openDetalhe(${pac.id})"` : '';
    return `
    <div class="schedule-item" ${open} style="${pac ? 'cursor:pointer' : ''}">
      ${avatarEl}
      <div style="flex:1;min-width:0">
        <div class="schedule-name">${c.paciente}</div>
        <div class="schedule-type">${c.hora} · ${med}</div>
        <div class="schedule-kind">${c.tipo}</div>
      </div>
      <div class="schedule-dot" style="background:${c.dotColor}"></div>
    </div>`;
  }).join('');

  sideRoot.innerHTML = `
    <div class="panel panel-alertas-side">
      <div class="panel-header">
        <div>
          <div class="panel-title">Alertas</div>
          <div style="font-size:10px;color:var(--muted)">${totalAtivos} ativo(s) · clique na linha para o perfil</div>
        </div>
      </div>
      <div class="alertas-side-chips">${chip('todos', 'Todos', totalAtivos)}${chip('critico', 'Críticos', criticosN)}${chip('aviso', 'Avisos', avisosN)}</div>
      <div class="alertas-side-list">${alertasHtml}</div>
    </div>
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title">Agenda de hoje</div>
        <div style="font-size:10px;color:var(--purple);font-weight:500;cursor:pointer" onclick="navigateTo('agenda')">Ver completa ?</div>
      </div>
      ${agendaHtml}
    </div>`;
}

/* -- PÁGINA PACIENTES (lista completa) -- */
function renderPacientesPage() {
  metricsHtml(document.getElementById('metricsRowPac'));
  const lista = getList();
  const rows = lista.length
    ? lista.map(p => patientRowHtml(p, false)).join('')
    : `<div class="empty-state">Nenhum paciente encontrado.</div>`;
  document.getElementById('patientPanelFull').innerHTML = `
    <div class="panel-header">
      <div class="pacientes-header-actions" style="width:100%;justify-content:space-between">
        <div style="min-width:0">
          <div class="panel-title">Carteira  ${pacientesDaSessao().length} paciente(s) nesta visão</div>
          <div class="pacientes-page-hint">Pressão, medicação e risco na lista. À direita: todos os alertas (com filtros) e a agenda de hoje.</div>
        </div>
        <button type="button" class="btn-primary" style="white-space:nowrap;flex-shrink:0" onclick="openCadastroPacienteModal()" title="Cadastrar na clínica ou vincular titular do app">+ Incluir paciente</button>
      </div>
    </div>
    <div class="patient-table">
      ${tableHeaderHtml()}
      ${rows}
    </div>`;
  renderSideCol();
}

/* -- PÁGINA DETALHE (perfil completo do paciente) -- */
let detalheCategoria = 'saude';

/* -- Modal: histórico de medições (demo  série sintética estável por paciente + chave) -- */
const MEDICAO_META_SAUDE = {
  pressao:    { title: 'Pressão arterial', kind: 'pa' },
  fc:         { title: 'Frequência cardíaca', kind: 'num', suffix: ' bpm' },
  glicemia:   { title: 'Glicemia', kind: 'num', suffix: ' mg/dL' },
  saturacao:  { title: 'Saturação O2', kind: 'num', suffix: '%' },
  temperatura:{ title: 'Temperatura', kind: 'num', suffix: ' °C' },
  sono:       { title: 'Sono', kind: 'num', suffix: ' h' },
  passos:     { title: 'Passos (dia)', kind: 'num', suffix: '' },
  hrv:        { title: 'HRV', kind: 'num', suffix: ' ms' },
  imc:        { title: 'IMC', kind: 'num', suffix: ' kg/m²' },
};
const MEDICAO_META_CORPO = {
  peso:     { title: 'Peso', kind: 'num', suffix: ' kg' },
  imc:      { title: 'IMC', kind: 'num', suffix: ' kg/m²' },
  gordura:  { title: 'Percentual de gordura', kind: 'num', suffix: ' %' },
  massaMusc:{ title: 'Massa muscular', kind: 'num', suffix: ' kg' },
  cintura:  { title: 'Circunferência de cintura', kind: 'num', suffix: ' cm' },
  altura:   { title: 'Altura', kind: 'num', suffix: ' m' },
};

let histMedState = { pacienteId: null, aba: 'saude', key: null, medIndex: null, periodo: '30', fonte: 'todos' };

function hashSeed(a, b, c) {
  let h = (a | 0) * 374761393 + (String(b).split('').reduce((x, ch) => x + ch.charCodeAt(0) * 31, 0) | 0);
  h = (h + (c || 0) * 668265263) >>> 0;
  return h || 1;
}
function mulberry32(a) {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parsePressaoStr(s) {
  const m = String(s || '').match(/(\d+)\s*\/\s*(\d+)/);
  return m ? { sys: +m[1], dia: +m[2] } : { sys: 128, dia: 82 };
}
function parseNumLoose(s) {
  if (s == null || s === '') return null;
  let t = String(s).replace(/[^\d.,-]/g, '').trim();
  if (!t) return null;
  const lastC = t.lastIndexOf(',');
  const lastD = t.lastIndexOf('.');
  if (lastC > lastD) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(/,/g, '');
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function valorBaseSaude(p, key) {
  switch (key) {
    case 'pressao': return parsePressaoStr(p.pressao);
    case 'fc': return { v: parseNumLoose(p.fc) ?? 72 };
    case 'glicemia': return { v: parseNumLoose(p.glicemia) ?? 100 };
    case 'saturacao': return { v: parseNumLoose(p.saturacao) ?? 98 };
    case 'temperatura': return { v: parseNumLoose(p.temperatura) ?? 36.5 };
    case 'sono': return { v: parseNumLoose(p.sono) ?? 7 };
    case 'passos': {
      const raw = String(p.passos || '0').replace(/\D/g, '');
      return { v: parseInt(raw, 10) || 5000 };
    }
    case 'hrv': return { v: parseNumLoose(p.hrv) ?? 40 };
    case 'imc': return { v: parseNumLoose(p.imc) ?? 24 };
    default: return { v: 0 };
  }
}

function valorBaseCorpo(p, key) {
  const d = dadosCorpoParaPainel(p);
  const rnd = mulberry32(hashSeed(p.id, key, 2));
  switch (key) {
    case 'peso': return { v: d.peso.kg ?? (60 + rnd() * 30) };
    case 'imc': return { v: d.imc.val ?? 24 };
    case 'gordura': return { v: d.gordura.pct ?? (20 + rnd() * 10) };
    case 'massaMusc': return { v: d.massaMusc.kg ?? (50 + rnd() * 15) };
    case 'cintura': return { v: parseNumLoose(d.cintura.text) ?? 90 };
    case 'altura': return { v: d.altura.m ?? 1.7 };
    default: return { v: 0 };
  }
}

function gerarSerieSaudeCorpo(p, aba, key) {
  const meta = aba === 'corpo' ? MEDICAO_META_CORPO[key] : MEDICAO_META_SAUDE[key];
  if (!meta) return [];
  const rnd = mulberry32(hashSeed(p.id, key, aba === 'corpo' ? 3 : 1));
  const base = aba === 'corpo' ? valorBaseCorpo(p, key) : valorBaseSaude(p, key);
  const n = 56;
  const now = Date.now();
  const dayMs = 86400000;
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const wave = Math.sin(i / 5 + p.id * 0.2) * 0.35 + Math.sin(i / 13) * 0.2;
    const noise = (rnd() - 0.5) * 2;
    const fonte = rnd() < 0.68 ? 'app' : 'consultorio';
    const h = 7 + Math.floor(rnd() * 10);
    const min = Math.floor(rnd() * 50);
    const t = now - i * dayMs - min * 60000 - h * 3600000;
    if (meta.kind === 'pa') {
      const b = base.sys != null ? base : { sys: 128, dia: 82 };
      const sys = Math.round(Math.max(90, Math.min(195, b.sys + wave * 14 + noise * 8)));
      const dia = Math.round(Math.max(55, Math.min(115, b.dia + wave * 9 + noise * 5)));
      out.push({ t, fonte, display: `${sys}/${dia}`, sys, dia });
    } else {
      let v = base.v;
      const spread = key === 'passos' ? 2200 : key === 'glicemia' ? 35 : key === 'hrv' ? 12 : key === 'temperatura' ? 0.6 : key === 'imc' || key === 'altura' ? 0.15 : key === 'gordura' ? 1.2 : 4;
      v = v + wave * spread + noise * (spread * 0.45);
      if (key === 'passos') v = Math.max(0, Math.round(v));
      else if (key === 'imc' || key === 'gordura' || key === 'peso' || key === 'massaMusc' || key === 'cintura') v = Math.round(v * 10) / 10;
      else if (key === 'temperatura') v = Math.round(v * 10) / 10;
      else if (key === 'sono') v = Math.round(Math.max(3, Math.min(11, v)) * 10) / 10;
      else v = Math.round(v);
      const suf = meta.suffix || '';
      out.push({ t, fonte, display: `${String(v).replace('.', ',')}${suf}`, v });
    }
  }
  return out;
}

function gerarSerieMedicacao(p, medIndex) {
  const nome = (p.meds && p.meds[medIndex]) || 'Medicação';
  const rnd = mulberry32(hashSeed(p.id, nome, 99));
  const n = 45;
  const now = Date.now();
  const dayMs = 86400000;
  const out = [];
  const situacoes = ['tomou', 'tomou', 'tomou', 'atraso', 'falta'];
  for (let i = n - 1; i >= 0; i--) {
    const fonte = rnd() < 0.75 ? 'app' : 'consultorio';
    const sit = situacoes[Math.floor(rnd() * situacoes.length)];
    const h = 6 + Math.floor(rnd() * 12);
    const min = [0, 15, 30, 45][Math.floor(rnd() * 4)];
    const t = now - i * dayMs - h * 3600000 - min * 60000;
    const hora = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    let label = 'Dose registrada';
    let css = 'hist-med-status-ok';
    if (sit === 'atraso') { label = 'Registro com atraso'; css = 'hist-med-status-warn'; }
    if (sit === 'falta') { label = 'Dose não registrada'; css = 'hist-med-status-bad'; }
    out.push({ t, fonte, hora, situacao: sit, display: label, css, med: nome });
  }
  return out;
}

function filtrarPontosPorPeriodo(pontos, periodo) {
  if (periodo === 'all') return pontos;
  const dias = periodo === '7' ? 7 : periodo === '30' ? 30 : periodo === '90' ? 90 : 365;
  const cut = Date.now() - dias * 86400000;
  return pontos.filter(pt => pt.t >= cut);
}

function filtrarPorFonte(pontos, fonte) {
  if (fonte === 'todos') return pontos;
  return pontos.filter(pt => pt.fonte === fonte);
}

function formatDataHora(ts) {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildSvgChartSaudeCorpo(pontos, meta) {
  if (!pontos.length) return '<div class="hist-med-empty">Nenhum ponto no intervalo e fonte selecionados.</div>';
  const W = 800;
  const H = 200;
  const pad = { l: 48, r: 16, t: 12, b: 28 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  if (meta.kind === 'pa') {
    const sys = pontos.map(p => p.sys);
    const dia = pontos.map(p => p.dia);
    const vmin = Math.min(...dia) - 5;
    const vmax = Math.max(...sys) + 8;
    const n = pontos.length;
    const xAt = i => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const yAt = val => pad.t + ih - ((val - vmin) / (vmax - vmin || 1)) * ih;
    const polySys = pontos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.sys).toFixed(1)}`).join(' ');
    const polyDia = pontos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.dia).toFixed(1)}`).join(' ');
    const dots = pontos.map((p, i) =>
      `<circle class="dot" cx="${xAt(i).toFixed(1)}" cy="${yAt(p.sys).toFixed(1)}" r="3.5"/>` +
      `<circle class="dot-dia" cx="${xAt(i).toFixed(1)}" cy="${yAt(p.dia).toFixed(1)}" r="3"/>`).join('');
    return `<svg class="hist-med-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line class="grid-line" x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}"/>
      <polyline class="line-main" points="${polySys}"/>
      <polyline class="line-sec" points="${polyDia}"/>
      ${dots}
    </svg>
    <div class="hist-med-legend">
      <span><i style="background:var(--purple)"></i> Sistólica</span>
      <span><i style="background:#64748b"></i> Diastólica</span>
    </div>`;
  }
  const vals = pontos.map(p => p.v);
  const vmin = Math.min(...vals);
  const vmax = Math.max(...vals);
  const padY = (vmax - vmin) * 0.12 || 1;
  const lo = vmin - padY;
  const hi = vmax + padY;
  const n = pontos.length;
  const xAt = i => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const yAt = val => pad.t + ih - ((val - lo) / (hi - lo || 1)) * ih;
  const poly = pontos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(' ');
  const dots = pontos.map((p, i) => `<circle class="dot" cx="${xAt(i).toFixed(1)}" cy="${yAt(p.v).toFixed(1)}" r="3.5"/>`).join('');
  return `<svg class="hist-med-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <line class="grid-line" x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}"/>
    <polyline class="line-main" points="${poly}"/>
    ${dots}
  </svg>`;
}

function buildSvgChartMedicacao(pontos) {
  if (!pontos.length) return '<div class="hist-med-empty">Nenhum registro no filtro atual.</div>';
  const W = 800;
  const H = 160;
  const pad = { l: 36, r: 12, t: 16, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const bucket = 7;
  const now = Date.now();
  const weeks = Math.min(8, Math.ceil(pontos.length / 7));
  const data = [];
  for (let w = 0; w < weeks; w++) {
    const end = now - w * bucket * 86400000;
    const start = end - bucket * 86400000;
    const slice = pontos.filter(p => p.t >= start && p.t < end);
    const ok = slice.filter(p => p.situacao === 'tomou').length;
    const tot = slice.length || 1;
    data.push({ ok, tot, pct: ok / tot });
  }
  data.reverse();
  const n = data.length;
  const bw = iw / n - 4;
  const rects = data.map((d, i) => {
    const x = pad.l + i * (iw / n) + 2;
    const h = d.pct * ih;
    const y = pad.t + ih - h;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="var(--purple)" opacity="0.85"/>`;
  }).join('');
  return `<svg class="hist-med-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:160px">
    <text x="${pad.l}" y="12" font-size="11" fill="var(--muted)">Aderência por período de ~7 dias (mais recente à direita)</text>
    ${rects}
  </svg>`;
}

function openMedicaoHistoricoModal(pacienteId, aba, key) {
  histMedState = { pacienteId, aba, key, medIndex: null, periodo: '30', fonte: 'todos' };
  renderMedicaoHistoricoModal();
  document.getElementById('histMedOverlay').classList.add('open');
}

function openMedicacaoHistoricoModal(pacienteId, medIndex) {
  histMedState = { pacienteId, aba: 'medicacao', key: null, medIndex, periodo: '30', fonte: 'todos' };
  renderMedicaoHistoricoModal();
  document.getElementById('histMedOverlay').classList.add('open');
}

function closeMedicaoHistoricoModal() {
  document.getElementById('histMedOverlay').classList.remove('open');
}

function setHistMedFiltro(campo, valor) {
  histMedState[campo] = valor;
  renderMedicaoHistoricoModal();
}

function chipClass(active, valor) {
  return `hist-med-chip${active === valor ? ' active' : ''}`;
}

function renderMedicaoHistoricoModal() {
  const root = document.getElementById('histMedModalRoot');
  const p = pacientes.find(x => x.id === histMedState.pacienteId);
  if (!root || !p) return;

  let titulo = 'Histórico';
  let subtitulo = p.nome;
  let meta = { kind: 'num' };
  let pontosBrutos = [];

  if (histMedState.aba === 'medicacao') {
    const idx = histMedState.medIndex | 0;
    titulo = (p.meds && p.meds[idx]) ? `Adesão  ${p.meds[idx]}` : 'Histórico de medicação';
    subtitulo = `${p.nome} · registros de dose`;
    pontosBrutos = gerarSerieMedicacao(p, idx);
  } else {
    const key = histMedState.key;
    meta = histMedState.aba === 'corpo' ? MEDICAO_META_CORPO[key] : MEDICAO_META_SAUDE[key];
    titulo = meta ? meta.title : 'Medição';
    subtitulo = `${p.nome} · ${histMedState.aba === 'corpo' ? 'composição corporal' : 'sinais e hábitos'}`;
    pontosBrutos = gerarSerieSaudeCorpo(p, histMedState.aba, key);
  }

  let filtrados = filtrarPontosPorPeriodo(pontosBrutos, histMedState.periodo);
  filtrados = filtrarPorFonte(filtrados, histMedState.fonte);
  const ord = [...filtrados].sort((a, b) => b.t - a.t);

  const chartBlock = histMedState.aba === 'medicacao'
    ? buildSvgChartMedicacao(filtrados)
    : buildSvgChartSaudeCorpo(filtrados, meta);

  const tableRows = histMedState.aba === 'medicacao'
    ? ord.map(row => `
      <tr>
        <td>${formatDataHora(row.t)}</td>
        <td>${row.hora}</td>
        <td class="${row.css}">${row.display}</td>
        <td><span class="hist-med-badge ${row.fonte}">${row.fonte === 'app' ? 'App' : 'Consultório'}</span></td>
      </tr>`).join('')
    : meta.kind === 'pa'
      ? ord.map(row => `
      <tr>
        <td>${formatDataHora(row.t)}</td>
        <td><strong>${row.display}</strong> mmHg</td>
        <td><span class="hist-med-badge ${row.fonte}">${row.fonte === 'app' ? 'App' : 'Consultório'}</span></td>
      </tr>`).join('')
      : ord.map(row => `
      <tr>
        <td>${formatDataHora(row.t)}</td>
        <td><strong>${row.display}</strong></td>
        <td><span class="hist-med-badge ${row.fonte}">${row.fonte === 'app' ? 'App' : 'Consultório'}</span></td>
      </tr>`).join('');

  const thMed = `<tr><th>Data</th><th>Horário</th><th>Situação</th><th>Fonte</th></tr>`;
  const thVal = meta.kind === 'pa'
    ? `<tr><th>Data / hora</th><th>Valor</th><th>Fonte</th></tr>`
    : `<tr><th>Data / hora</th><th>Valor</th><th>Fonte</th></tr>`;

  root.innerHTML = `
    <div class="hist-med-head">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <div class="hist-med-title">${titulo}</div>
          <div class="hist-med-sub">${subtitulo}</div>
        </div>
        <button type="button" class="modal-close" onclick="closeMedicaoHistoricoModal()" aria-label="Fechar"></button>
      </div>
    </div>
    <div class="hist-med-filters">
      <div class="hist-med-filter-group">
        <span class="hist-med-filter-label">Período</span>
        <div class="hist-med-chips">
          <button type="button" class="${chipClass(histMedState.periodo, '7')}" onclick="setHistMedFiltro('periodo','7')">7 dias</button>
          <button type="button" class="${chipClass(histMedState.periodo, '30')}" onclick="setHistMedFiltro('periodo','30')">30 dias</button>
          <button type="button" class="${chipClass(histMedState.periodo, '90')}" onclick="setHistMedFiltro('periodo','90')">90 dias</button>
          <button type="button" class="${chipClass(histMedState.periodo, '365')}" onclick="setHistMedFiltro('periodo','365')">1 ano</button>
          <button type="button" class="${chipClass(histMedState.periodo, 'all')}" onclick="setHistMedFiltro('periodo','all')">Tudo</button>
        </div>
      </div>
      <div class="hist-med-filter-group">
        <span class="hist-med-filter-label">Fonte</span>
        <div class="hist-med-chips">
          <button type="button" class="${chipClass(histMedState.fonte, 'todos')}" onclick="setHistMedFiltro('fonte','todos')">Todas</button>
          <button type="button" class="${chipClass(histMedState.fonte, 'app')}" onclick="setHistMedFiltro('fonte','app')">App</button>
          <button type="button" class="${chipClass(histMedState.fonte, 'consultorio')}" onclick="setHistMedFiltro('fonte','consultorio')">Consultório</button>
        </div>
      </div>
    </div>
    <div class="hist-med-body">
      <div class="hist-med-chart-wrap">
        <div class="hist-med-chart-title">Visão gráfica</div>
        ${chartBlock}
      </div>
      <div class="hist-med-chart-title" style="margin-bottom:8px">Registros (${ord.length})</div>
      <div class="hist-med-table-wrap">
        <table class="hist-med-table">
          <thead>${histMedState.aba === 'medicacao' ? thMed : thVal}</thead>
          <tbody>${tableRows || `<tr><td colspan="${histMedState.aba === 'medicacao' ? 4 : 3}" class="hist-med-empty">Nenhuma linha.</td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

/** Mesmo padrão visual da aba Saúde: grid 3 colunas, detail-card + faixa lateral */
function renderCorpoHtml(p) {
  const d = dadosCorpoParaPainel(p);

  function accentValue(sev) {
    if (sev === 'bad') return { accent:'var(--red)', color:'var(--red)' };
    if (sev === 'warn') return { accent:'var(--amber)', color:'var(--amber)' };
    if (sev === 'muted') return { accent:'var(--border)', color:'var(--muted)' };
    return { accent:'var(--green)', color:'var(--green)' };
  }

  function subLinha(idealTxt, data, fonte) {
    const parts = [`Ideal: ${idealTxt}`];
    if (data && data !== '') parts.push(data);
    if (fonte && fonte !== '') parts.push(fonte);
    return parts.join(' · ');
  }

  function card(label, value, idealTxt, sev, data, fonte, metricKey) {
    const { accent, color } = accentValue(sev);
    return `<div class="detail-card detail-card--interactive" role="button" tabindex="0"
      onclick="openMedicaoHistoricoModal(${p.id},'corpo','${metricKey}')"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMedicaoHistoricoModal(${p.id},'corpo','${metricKey}');}">
      <div class="detail-card-accent" style="background:${accent}"></div>
      <div class="detail-card-label">${label}</div>
      <div class="detail-card-value" style="color:${color}">${value}</div>
      <div class="detail-card-sub">${subLinha(idealTxt, data, fonte)} · Toque para histórico</div>
    </div>`;
  }

  const idealPeso = d.peso.ideal != null ? `${String(d.peso.ideal).replace('.', ',')} kg` : '';
  const imcVal = d.imc.val != null ? `${String(d.imc.val).replace('.', ',')} kg/m²` : '';
  const altIdeal = d.altura.m != null ? `${String(d.altura.m).replace('.', ',')} m` : '';

  const cards = [
    card('Peso', d.peso.text, idealPeso, d.peso.sev, d.peso.data, d.peso.fonte, 'peso'),
    card('IMC', imcVal, '18,524,9 kg/m²', d.imc.sev, d.imc.data, d.imc.fonte, 'imc'),
    card('Percentual de gordura', d.gordura.text, `${d.gordura.idealLabel} %`, d.gordura.sev, d.gordura.data, d.gordura.fonte, 'gordura'),
    card('Massa muscular', d.massaMusc.text, `${d.massaMusc.mmMin}${d.massaMusc.mmMax} kg`, d.massaMusc.sev, d.massaMusc.data, d.massaMusc.fonte, 'massaMusc'),
    card('Circunferência cintura', d.cintura.text, `menor que ${d.cintura.lim} cm`, d.cintura.sev, d.cintura.data, d.cintura.fonte, 'cintura'),
    card('Altura', d.altura.text, altIdeal, d.altura.sev, d.altura.data, d.altura.fonte, 'altura'),
  ];

  return `<div class="cards-grid">${cards.join('')}</div>`;
}

function openDetalhe(id) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(id)) {
    alert('Nesta sessão você só acessa pacientes da sua agenda.');
    return;
  }
  if (consultaContextoPacienteId !== id) {
    consultaRetornoPacienteId = null;
    consultaContextoPacienteId = null;
  }
  detalheCategoria = 'saude';
  detalheHistoricoSub = 'timeline';
  navigateTo('detalhe', id);
}

/** Abre o perfil na aba Exames (solicitação / upload na demo). */
function openDetalheExamesTab(id) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(id)) {
    alert('Nesta sessão você só acessa pacientes da sua agenda.');
    return;
  }
  detalheCategoria = 'examesPaciente';
  detalheExamesSub = 'salvos';
  detalheHistoricoSub = 'timeline';
  navigateTo('detalhe', id);
}

function openDetalheEmConsulta(pacienteId, categoria) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(pacienteId)) {
    alert('Nesta sessão você só acessa pacientes da sua agenda.');
    return;
  }
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p || !consultaSessaoIniciada(p)) {
    openDetalhe(pacienteId);
    return;
  }
  consultaContextoPacienteId = pacienteId;
  consultaRetornoPacienteId = pacienteId;
  if (categoria === 'examesPaciente') consultaEtapaAtiva = 'exames';
  else if (categoria === 'medicacao') consultaEtapaAtiva = 'medicacao';
  else consultaEtapaAtiva = 'perfil';
  if (p) {
    p.consultaSessao.etapaAtual = consultaEtapaAtiva;
    registrarEventoConsulta(p, consultaEtapaAtiva);
  }
  detalheCategoria = categoria || 'saude';
  detalheHistoricoSub = 'timeline';
  navigateTo('detalhe', pacienteId);
}

function voltarParaConsultaAtiva() {
  const pid = consultaContextoPacienteId || consultaRetornoPacienteId;
  const p = pid != null ? pacientes.find(x => x.id === pid) : null;
  if (p && consultaSessaoIniciada(p)) {
    consultaRetornoPacienteId = null;
    consultaEtapaAtiva = 'anotacao';
    if (p.consultaSessao) p.consultaSessao.etapaAtual = 'anotacao';
    navigateTo('consulta', pid);
    return;
  }
  voltarDeConsultaAtiva();
}

function renderDetalhePage(id) {
  const p = pacientes.find(x => x.id === id);
  if (!p) return;
  garantirModeloPaciente(p);

  const cats = [
    { key:'saude',      icon:'❤️', label:'Saúde' },
    { key:'corpo',      icon:'🏃', label:'Corpo' },
    { key:'medicacao',  icon:'💊', label:'Medicação' },
    { key:'historico',  icon:'📋', label:'Histórico' },
    { key:'examesPaciente', icon:'🧪', label:'Exames' },
    { key:'contato',    icon:'📞', label:'Contato' },
  ];

  const catBtns = cats.map(c =>
    `<button class="detail-filter-btn ${detalheCategoria===c.key?'active':''}"
      onclick="setDetalheCategoria(${p.id},'${c.key}')">
      ${c.icon} ${c.label}
    </button>`
  ).join('');

  const voltarPage = paginaAnterior || 'pacientes';

  let bodyHtml = '';
  const vPendBody = pacienteVinculoPendente(p);

  if (detalheCategoria === 'saude') {
    if (vPendBody) {
      bodyHtml = `<div class="empty-state" style="max-width:420px;margin:0 auto;text-align:center;line-height:1.55">
        Os sinais vitais do titular ficam no app até a aprovação do vínculo. Depois, sincronizam com esta ficha.
        <div style="margin-top:14px"><button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button></div>
      </div>`;
    } else {
    const cards = [
      { key:'pressao', label:'Pressão Arterial', value: p.pressao, sub:'mmHg', color: p.paColor==='red'?'var(--red)':p.paColor==='amber'?'var(--amber)':'var(--green)', accent: p.paColor==='red'?'var(--red)':p.paColor==='amber'?'var(--amber)':'var(--green)' },
      { key:'fc', label:'Frequência Cardíaca', value: p.fc, sub:'Ideal: 60100 bpm', color:'var(--text)', accent:'var(--purple)' },
      { key:'glicemia', label:'Glicemia', value: p.glicemia, sub:'Ideal: 70100 mg/dL', color: (parseNumLoose(p.glicemia) ?? 0)>140?'var(--red)':'var(--text)', accent: (parseNumLoose(p.glicemia) ?? 0)>140?'var(--red)':'var(--green)' },
      { key:'saturacao', label:'Saturação O2', value: p.saturacao, sub:'Ideal: = 95%', color: (parseNumLoose(p.saturacao) ?? 100)<95?'var(--red)':'var(--text)', accent: (parseNumLoose(p.saturacao) ?? 100)<95?'var(--red)':'var(--green)' },
      { key:'temperatura', label:'Temperatura', value: p.temperatura, sub:'Ideal: 3637,5°C', color:'var(--text)', accent:'var(--amber)' },
      { key:'sono', label:'Sono', value: p.sono, sub:'Ideal: 79h/noite', color: (parseNumLoose(p.sono) ?? 7)<6?'var(--amber)':'var(--text)', accent: (parseNumLoose(p.sono) ?? 7)<6?'var(--amber)':'var(--green)' },
      { key:'passos', label:'Passos hoje', value: p.passos, sub:'Meta: 6.00010.000', color:'var(--text)', accent:'var(--blue)' },
      { key:'hrv', label:'HRV', value: p.hrv, sub:'Variabilidade cardíaca', color:'var(--text)', accent:'var(--purple)' },
      { key:'imc', label:'IMC', value: p.imc, sub:'Peso/altura', color:'var(--text)', accent:'var(--amber)' },
    ];
    bodyHtml = `<div class="cards-grid">
      ${cards.map(c => `
        <div class="detail-card detail-card--interactive" role="button" tabindex="0"
          onclick="openMedicaoHistoricoModal(${p.id},'saude','${c.key}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMedicaoHistoricoModal(${p.id},'saude','${c.key}');}">
          <div class="detail-card-accent" style="background:${c.accent}"></div>
          <div class="detail-card-label">${c.label}</div>
          <div class="detail-card-value" style="color:${c.color}">${c.value}</div>
          <div class="detail-card-sub">${c.sub} · Toque para histórico</div>
        </div>`).join('')}
    </div>`;
    }
  }

  if (detalheCategoria === 'corpo') {
    bodyHtml = vPendBody
      ? `<div class="empty-state" style="max-width:420px;margin:0 auto;text-align:center;line-height:1.55">
          Composição corporal e medidas do app aparecem aqui após o titular aprovar o vínculo.
          <div style="margin-top:14px"><button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button></div>
        </div>`
      : renderCorpoHtml(p);
  }

  if (detalheCategoria === 'medicacao') {
    if (vPendBody) {
      bodyHtml = `<div class="empty-state" style="max-width:420px;margin:0 auto;text-align:center;line-height:1.55">
          Medicações informadas pelo titular no app só entram na ficha da clínica depois da aprovação do vínculo.
          <div style="margin-top:14px"><button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button></div>
        </div>`;
    } else {
    const medsDoP = medicacoes.filter(m => m.paciente === p.nome);
    const medCards = (p.meds || []).map((nome, idx) => {
      const reg = medsDoP.find(m => m.nome.startsWith(nome.split(' ')[0]));
      const pct = reg ? Math.round(reg.estoque/reg.total*100) : null;
      const sc  = reg ? reg.status : 'ok';
      const accentColor = sc==='critico'?'var(--red)':sc==='baixo'?'var(--amber)':'var(--green)';
      const estoqueInfo = reg
        ? `<div style="margin-top:8px">
            <div style="font-size:10px;color:var(--muted);margin-bottom:3px">${reg.estoque}/${reg.total} comp. · Renovar em ${reg.proxRenovacao}</div>
            <div class="estoque-bar" style="width:100%"><div class="estoque-fill ${sc}" style="width:${pct}%"></div></div>
           </div>`
        : '';
      return `<div class="detail-card detail-card--interactive" role="button" tabindex="0"
        onclick="openMedicacaoHistoricoModal(${p.id},${idx})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMedicacaoHistoricoModal(${p.id},${idx});}">
        <div class="detail-card-accent" style="background:${accentColor}"></div>
        <div class="detail-card-label">Medicamento</div>
        <div class="detail-card-value" style="font-size:15px">${nome}</div>
        ${estoqueInfo}
        <div class="detail-card-sub" style="margin-top:8px">Toque para histórico de adesão</div>
      </div>`;
    });
    const gridBlock = medCards.length
      ? `<div class="cards-grid">${medCards.join('')}</div>`
      : `<div class="empty-state">Nenhuma medicação cadastrada.</div>`;
    bodyHtml = `
      <div class="med-tab-actions">
        <button type="button" class="btn-primary med-add-med-btn" onclick="openAddMedModal(${p.id})">+ Adicionar medicação</button>
      </div>
      ${gridBlock}`;
    }
  }

  if (detalheCategoria === 'historico') {
    const escH = t =>
      String(t == null ? '' : t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;');
    const items = p.historico.map(h => `
      <li class="hist-item">
        <div class="hist-dot ${h.tipo}"></div>
        <span class="hist-time">${escH(h.data)}</span>
        <span class="hist-msg">${escH(h.msg)}</span>
      </li>`).join('');
    const chatItems = p.msgs.length
      ? p.msgs.map(m => {
          const isCli = m.de === 'clinica';
          return `<div class="chat-bubble-wrap ${isCli?'from-clinica':'from-paciente'}">
            <div class="chat-bubble ${m.de}">${escH(m.texto)}</div>
            <div class="chat-bubble-time ${isCli?'right':''}">${isCli?'Clínica':escH(p.nome.split(' ')[0])} · ${escH(m.hora)}</div>
          </div>`;
        }).join('')
      : `<div style="text-align:center;color:var(--muted);font-size:12px;padding:16px">Nenhuma mensagem enviada.</div>`;

    const anotacoesHtml =
      p.anotacoesConsultas.length === 0
        ? '<p class="cad-pac-hint" style="margin:0 0 8px">Nenhuma anotação de consulta ainda.</p>'
        : p.anotacoesConsultas.map(a => `
      <div class="hist-consulta-item">
        <div class="hist-consulta-data">${escH(a.data)}</div>
        <div class="hist-consulta-medico">${escH(a.medicoNome || '')} · ${escH(a.medicoCrm || '')}</div>
        <div class="hist-consulta-texto">${escH(a.texto)}</div>
      </div>`).join('');

    const subBar = `
      <div class="detail-hist-sub-bar">
        <button type="button" class="detail-hist-sub-btn ${detalheHistoricoSub === 'timeline' ? 'active' : ''}" onclick="setDetalheHistoricoSub(${p.id},'timeline')">Linha do tempo</button>
        <button type="button" class="detail-hist-sub-btn ${detalheHistoricoSub === 'consultas' ? 'active' : ''}" onclick="setDetalheHistoricoSub(${p.id},'consultas')">Anotações de consulta</button>
        <button type="button" class="detail-hist-sub-btn ${detalheHistoricoSub === 'mensagens' ? 'active' : ''}" onclick="setDetalheHistoricoSub(${p.id},'mensagens')">Mensagens</button>
      </div>`;

    let mainContent = '';
    if (detalheHistoricoSub === 'timeline') {
      mainContent = `
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Linha do tempo</div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="font-size:11px;color:var(--muted);font-weight:500">Alertas do app, medições e eventos da ficha</div>
              <button type="button" class="btn-outline" style="font-size:11px;padding:4px 10px" id="btnAnalisarTendencias_${p.id}" onclick="analisarTendenciasIA(${p.id})" title="IA analisa padrões no histórico">✨ Analisar tendências</button>
            </div>
          </div>
          <div id="tendenciasIAResult_${p.id}" style="display:none;padding:0 16px 4px"></div>
          <ul class="hist-list">${items}</ul>
        </div>`;
    } else if (detalheHistoricoSub === 'consultas') {
      mainContent = `
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title">Anotações de consulta</div>
            <div style="font-size:11px;color:var(--muted);font-weight:500">Texto do médico para próximos atendimentos</div>
          </div>
            <div style="padding:12px 16px 18px">
            <p class="cad-pac-hint" style="margin:0 0 12px">
              <button type="button" class="btn-outline" style="margin-right:8px" onclick="abrirReceitaModal(${p.id})">Receita médica</button>
              <button type="button" class="btn-outline" onclick="openAtestadoModal(${p.id})">Atestado médico</button>
            </p>
            ${anotacoesHtml}
            <div class="nova-anotacao-box" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
              ${htmlCampoProfissionalAnotacaoConsulta(escH)}
              <div class="textarea-label-row" style="margin-top:10px">
                <label class="med-form-label" for="novaAnotacaoConsultaTexto">Nova anotação</label>
                ${htmlMicBtn('novaAnotacaoConsultaTexto', 'micBtnAnotacaoDetalhe')}
              </div>
              <textarea id="novaAnotacaoConsultaTexto" placeholder="Conduta, hipóteses, exames solicitados, orientações…"></textarea>
              <button type="button" class="btn-primary" style="margin-top:10px" onclick="salvarAnotacaoConsulta(${p.id})">Salvar anotação</button>
              <button type="button" class="btn-outline" style="margin-top:10px" id="btnSoapIA_${p.id}" onclick="organizarSOAP(${p.id})" title="Reorganiza em SOAP com IA">✨ Organizar em SOAP</button>
            </div>
          </div>
        </div>`;
    } else {
      mainContent = `
        <div class="panel" style="display:flex;flex-direction:column">
          <div class="panel-header">
            <div class="panel-title">Mensagens</div>
            <button class="msg-btn" onclick="openMsgModal(${p.id})">? Abrir chat</button>
          </div>
          <div class="chat-thread" style="flex:1;background:var(--bg);padding:14px 16px;display:flex;flex-direction:column;gap:8px;min-height:280px;max-height:420px;overflow-y:auto">${chatItems}</div>
        </div>`;
    }

    bodyHtml = subBar + mainContent;
  }

  if (detalheCategoria === 'examesPaciente') {
    if (vPendBody) {
      bodyHtml = `<div class="empty-state" style="max-width:440px;margin:0 auto;text-align:center;line-height:1.55">
        Exames e laudos do titular ficam disponíveis nesta aba após a aprovação do vínculo no app.
        <div style="margin-top:14px"><button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button></div>
      </div>`;
    } else {
      garantirModeloPaciente(p);
      bodyHtml = htmlExamesPacienteView(p, {});
    }
  }

  if (detalheCategoria === 'contato') {
    if (pacienteVinculoPendente(p)) {
      const v = p.vinculoApp;
      bodyHtml = `
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-header">
            <div class="panel-title">Vínculo com o app · privacidade</div>
          </div>
          <div style="padding:14px 16px;font-size:13px;line-height:1.55;color:var(--text)">
            <p style="margin:0 0 10px">Enquanto o titular não aprovar no app, a clínica <strong>não acessa</strong> telefone, e-mail nem registros de saúde vindos do SaaS  só este placeholder na carteira.</p>
            <p style="margin:0;font-size:12px;color:var(--muted)">
              Código: <code style="font-family:'DM Mono',monospace">${v.codigoInformado}</code>
              · ID titular (demo): ${v.idTitularSaaS}
              ${v.notaClinica ? `<br>Obs. interna: ${v.notaClinica}` : ''}
            </p>
            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button>
            </div>
          </div>
        </div>`;
    } else {
    const infoCards = [
      { label:'Telefone',         value: p.telefone },
      { label:'E-mail',           value: p.email },
      { label:'Sexo',             value: p.sexo === 'F' ? 'Feminino' : 'Masculino' },
      { label:'Peso / Altura',    value: `${p.peso} / ${p.altura}` },
      { label:'Última consulta',  value: p.ultimaConsulta },
      { label:'Próxima consulta', value: p.proximaConsulta },
    ];
    const app = p.app;
    const appBlock = app
      ? `<div class="panel" style="margin-bottom:14px">
          <div class="panel-header">
            <div class="panel-title">App do paciente · sincronizado com a clínica</div>
          </div>
          <div style="padding:14px 16px;font-size:13px;line-height:1.55">
            <div><strong>Usuário:</strong> ${app.usuario}</div>
            <div style="margin-top:6px"><strong>Senha provisória:</strong> ${
              app.primeiroAcessoPendente
                ? `<code style="font-family:'DM Mono',monospace;background:var(--bg);padding:2px 8px;border-radius:4px">${app.senhaProvisoria}</code>`
                : '<span style="color:var(--muted)">Já alterada pelo paciente no 1º acesso ao app</span>'
            }</div>
            <div style="margin-top:10px;font-size:11px;color:var(--muted)">
              Mesmo cadastro usado na carteira e no celular. Link do app: <a href="${app.linkDownload}" target="_blank" rel="noopener noreferrer">${app.linkDownload}</a>
            </div>
            <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn-outline" onclick="abrirWhatsAppConvitePacienteById(${p.id})">?? Reenviar convite no WhatsApp</button>
            </div>
          </div>
        </div>`
      : '';
    const fotoCarteiraPanel = `
      <div class="panel" style="margin-bottom:14px">
        <div class="panel-header">
          <div class="panel-title">Foto na carteira</div>
          <div style="font-size:11px;color:var(--muted);font-weight:500">Aparece na lista de pacientes e na agenda</div>
        </div>
        <div style="padding:14px 16px;display:flex;flex-wrap:wrap;gap:16px;align-items:center">
          <div style="flex-shrink:0">${patientAvatarHtml(p, 80, 22)}</div>
          <div style="min-width:200px;flex:1">
            <input type="file" id="perfilFotoInput_${p.id}" accept="image/*" style="display:none" onchange="onPerfilFotoSelecionada(${p.id},event)" />
            <button type="button" class="btn-outline" onclick="document.getElementById('perfilFotoInput_${p.id}').click()">Trocar foto</button>
            ${p.fotoUrl && String(p.fotoUrl).indexOf('data:image') === 0 ? `<button type="button" class="btn-outline" onclick="removerFotoPaciente(${p.id})">Remover foto</button>` : ''}
            <p class="cad-pac-hint" style="margin-top:8px;margin-bottom:0">Ajuda o médico a reconhecer o paciente nos cards (demo: arquivo só neste navegador).</p>
          </div>
        </div>
      </div>`;
    bodyHtml = `
      ${fotoCarteiraPanel}
      ${appBlock}
      <div class="cards-grid">
        ${infoCards.map(c => `
          <div class="detail-card">
            <div class="detail-card-accent" style="background:var(--purple-mid)"></div>
            <div class="detail-card-label">${c.label}</div>
            <div class="detail-card-value" style="font-size:16px">${c.value}</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-primary" onclick="openMsgModal(${p.id})">? Enviar mensagem</button>
        <button type="button" class="btn-outline" onclick="openAgendaModal(${p.id})">?← Agendar consulta</button>
      </div>`;
    }
  }

  const vinculoBanner = vPendBody
    ? `<div class="vinculo-pendente-banner">
        <strong>Vínculo pendente.</strong> O titular ainda não aprovou no app. Nome e sinais vitais completos ficam ocultos até lá (modelo de privacidade TeepSaude).
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn-primary" onclick="simularAceiteVinculoApp(${p.id})">Simular aceite no app (demo)</button>
        </div>
      </div>`
    : '';

  const escDetalhe = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  document.getElementById('detalheContent').innerHTML = `
    ${htmlPacienteCabecalhoPadrao(p, {
      esc: escDetalhe,
      voltarOnclick: `navigateTo('${voltarPage}')`,
      voltarLabel: '← Voltar',
    })}
    ${vinculoBanner}
    ${htmlBannerConsultaPerfil(p)}
    <div class="detail-filter-bar">${catBtns}</div>
    ${bodyHtml}
    ${!vPendBody ? htmlChatPacienteWidget(p) : ''}`;
}

function setDetalheCategoria(id, cat) {
  detalheCategoria = cat;
  renderDetalhePage(id);
}

/* -- MENSAGENS (CHAT) -- */
let msgTargetId = null;

function avatarColorFor(id) {
  return avatarPalette[(id - 1) % avatarPalette.length][0];
}

function renderChatModal(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;

  const bubbles = p.msgs.map(m => {
    const isCli = m.de === 'clinica';
    return `<div class="chat-bubble-wrap ${isCli ? 'from-clinica' : 'from-paciente'}">
      <div class="chat-bubble ${m.de}">${m.texto}</div>
      <div class="chat-bubble-time ${isCli ? 'right' : ''}">${isCli ? 'Clínica' : p.nome.split(' ')[0]} · ${m.hora}</div>
    </div>`;
  }).join('');

  const emptyHtml = p.msgs.length === 0
    ? `<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px">Nenhuma mensagem ainda. Inicie a conversa abaixo.</div>`
    : '';

  const tpls = msgTemplates.map((t,i) =>
    `<button class="chat-tpl-btn" onclick="applyTemplate(${i})">${t}</button>`
  ).join('');

  document.getElementById('msgModal').innerHTML = `
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="chat-modal-avatar" style="background:${avatarColorFor(p.id)}">${patientInitials(p.nome)}</div>
        <div>
          <div class="modal-title">${p.nome}</div>
          <div class="chat-modal-status">Online · App móvel</div>
        </div>
      </div>
      <button type="button" class="modal-close" onclick="closeMsgModal()" aria-label="Fechar"></button>
    </div>
    <div class="chat-messages" id="chatMsgArea">
      <div class="chat-day-divider">Hoje</div>
      ${emptyHtml}
      ${bubbles}
    </div>
    <div class="chat-templates" id="chatTpls">${tpls}</div>
    <div class="chat-input-area">
      <textarea class="chat-input" id="chatInputText" rows="1" placeholder="Escreva uma mensagem..."
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMsg(${p.id})}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
      <button class="chat-send-btn" onclick="sendChatMsg(${p.id})" title="Enviar">?</button>
    </div>`;

  document.getElementById('msgOverlay').classList.add('open');
  scrollChatToBottom();
}

function applyTemplate(i) {
  const ta = document.getElementById('chatInputText');
  if (!ta) return;
  ta.value = msgTemplates[i];
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 100) + 'px';
  ta.focus();
}

function scrollChatToBottom() {
  setTimeout(() => {
    const area = document.getElementById('chatMsgArea');
    if (area) area.scrollTop = area.scrollHeight;
  }, 30);
}

function sendChatMsg(pacienteId) {
  const ta = document.getElementById('chatInputText');
  if (!ta) return;
  const texto = ta.value.trim();
  if (!texto) return;
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;

  p.msgs.push({ de: 'clinica', texto, hora: timeString() });
  ta.value = '';
  ta.style.height = 'auto';

  // append bubble without re-rendering entire modal
  const area = document.getElementById('chatMsgArea');
  const wrap = document.createElement('div');
  wrap.className = 'chat-bubble-wrap from-clinica';
  wrap.innerHTML = `<div class="chat-bubble clinica">${texto}</div>
    <div class="chat-bubble-time right">Clínica · ${timeString()}</div>`;
  area.appendChild(wrap);
  scrollChatToBottom();

  // simulate patient reply after random delay (only for critical patients, to demo)
  if (p.status === 'critico' && Math.random() > 0.4) {
    const respostas = [
      'Entendido, obrigado(a).',
      'Certo, vou fazer isso agora.',
      'Ok, já estou tomando a medicação.',
      'Obrigado pelo aviso, doutor.',
      'Entendido. Estarei lá na hora marcada.',
    ];
    setTimeout(() => {
      const resp = respostas[Math.floor(Math.random() * respostas.length)];
      p.msgs.push({ de: 'paciente', texto: resp, hora: timeString() });
      const area2 = document.getElementById('chatMsgArea');
      if (!area2) return;
      const w = document.createElement('div');
      w.className = 'chat-bubble-wrap from-paciente';
      w.innerHTML = `<div class="chat-bubble paciente">${resp}</div>
        <div class="chat-bubble-time">${p.nome.split(' ')[0]} · ${timeString()}</div>`;
      area2.appendChild(w);
      scrollChatToBottom();
    }, 1800 + Math.random() * 2000);
  }
}

function openMsgModal(pacienteId) {
  msgTargetId = pacienteId;
  renderChatModal(pacienteId);
}

function selectTemplate(i) {
  applyTemplate(i);
}

function closeMsgModal() {
  document.getElementById('msgOverlay').classList.remove('open');
}

/* -- ADICIONAR MEDICAÇÃO (modal estilo app mobile) -- */
let addMedPatientId = null;
let addMedPhotoUrl = null;

function medTodayInputValue() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function openAddMedModal(pacienteId) {
  addMedPatientId = pacienteId;
  const hoje = medTodayInputValue();
  const dosOpts = dosagensCatalogoOpts;
  const freqOpts = frequenciasCatalogoOpts.concat([
    'A cada 6 horas', 'A cada 8 horas', 'A cada 12 horas', 'SOS (se necessário)', 'Conforme prescrição médica',
  ]);
  const antecOpts = ['5 minutos antes', '10 minutos antes', '15 minutos antes', '30 minutos antes', '1 hora antes'];

  document.getElementById('medModalRoot').innerHTML = `
    <div class="modal-header">
      <div class="med-modal-title">Adicionar medicação</div>
      <button type="button" class="modal-close" onclick="closeAddMedModal()" aria-label="Fechar"></button>
    </div>
    <div class="med-form-body" id="medFormBody">
      <div class="med-form-field" style="margin-top:0">
        <label class="med-form-label" for="medSearchInput">Medicamento</label>
        <p class="med-form-hint" style="margin-top:0;margin-bottom:8px">Adicione um remédio por vez: busque na lista e toque no nome para confirmar.</p>
        <div class="med-search-wrap">
          <input type="text" class="med-form-input" id="medSearchInput" autocomplete="off"
            placeholder="Digite para buscar (ex.: Dipirona, Losartana)"
            oninput="filterMedCatalog(this.value)" onfocus="filterMedCatalog(this.value)">
          <input type="hidden" id="medSelectedNome" value="">
          <div class="med-search-results" id="medSearchResults"></div>
        </div>
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medDosagem">Dosagem</label>
        <select class="med-form-select" id="medDosagem">
          <option value="">Selecione a dosagem</option>
          ${dosOpts.filter(Boolean).map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medFrequencia">Frequência</label>
        <select class="med-form-select" id="medFrequencia">
          <option value="">Selecione</option>
          ${freqOpts.filter(Boolean).map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>
      </div>
      <div class="med-form-field">
        <span class="med-form-label">Foto do medicamento (opcional)</span>
        <input type="file" id="medPhotoInput" accept="image/*" style="display:none"
          onchange="onMedPhotoPick(event)">
        <label class="med-photo-box" id="medPhotoBox" for="medPhotoInput">
          <span id="medPhotoPlaceholder">?? Toque para adicionar foto do remédio</span>
          <img class="med-photo-preview" id="medPhotoPreview" alt="" style="display:none">
        </label>
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medInicio">Quando começa</label>
        <input type="date" class="med-form-input" id="medInicio" value="${hoje}">
      </div>
      <div class="med-row-toggle">
        <div>
          <span class="med-toggle-label">Uso contínuo <span class="med-toggle-sub">(sem período previsto)</span></span>
        </div>
        <label class="med-switch">
          <input type="checkbox" id="medUsoContinuo" onchange="toggleMedUsoContinuo()">
          <span class="med-switch-slider"></span>
        </label>
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medDias">Por quantos dias será tomado</label>
        <input type="number" class="med-form-input" id="medDias" min="1" max="365" placeholder="Ex: 10, 20">
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medEstoque">Estoque atual</label>
        <input type="number" class="med-form-input" id="medEstoque" min="0" placeholder="Ex: 30" value="30">
      </div>
      <div class="med-form-field">
        <label class="med-form-label" for="medEstoqueMin">Estoque mínimo para aviso</label>
        <input type="number" class="med-form-input" id="medEstoqueMin" min="0" placeholder="Ex: 7" value="7">
      </div>
      <div class="med-row-toggle">
        <div>
          <span class="med-toggle-label">Exibir no dashboard? <span class="med-toggle-sub">Mostrar card no dashboard</span></span>
        </div>
        <label class="med-switch">
          <input type="checkbox" id="medShowDash" checked>
          <span class="med-switch-slider"></span>
        </label>
      </div>
      <div class="med-form-field">
        <div class="med-alerts-box">
          <div class="med-alerts-title">?? Alertas</div>
          <div class="med-alert-block">
            <div class="med-alert-label">Lembrete antes do horário</div>
            <div class="med-row-toggle" style="padding:8px 0;border:none">
              <span class="med-toggle-label" style="font-size:13px;font-weight:400">Avisar com antecedência</span>
              <label class="med-switch">
                <input type="checkbox" id="medAlertAntes" checked>
                <span class="med-switch-slider"></span>
              </label>
            </div>
            <label class="med-form-label" for="medAntecedencia" style="margin-top:4px">Antecedência</label>
            <select class="med-form-select" id="medAntecedencia">
              ${antecOpts.map(o => `<option value="${o}"${o === '10 minutos antes' ? ' selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>
          <div class="med-alert-block">
            <div class="med-row-toggle" style="padding:8px 0;border:none;border-top:1px solid var(--border);margin-top:8px;padding-top:12px">
              <span class="med-toggle-label" style="font-size:13px">Alertar dose atrasada</span>
              <label class="med-switch">
                <input type="checkbox" id="medAlertAtraso" checked>
                <span class="med-switch-slider"></span>
              </label>
            </div>
          </div>
          <div class="med-alert-block">
            <div class="med-row-toggle" style="padding:8px 0;border:none">
              <span class="med-toggle-label" style="font-size:13px">Alertar estoque baixo</span>
              <label class="med-switch">
                <input type="checkbox" id="medAlertEstoque" checked>
                <span class="med-switch-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="med-form-footer">
      <button type="button" class="btn-outline" onclick="closeAddMedModal()">Cancelar</button>
      <button type="button" class="btn-primary" onclick="submitAddMedForm()">Adicionar</button>
    </div>`;

  document.getElementById('medOverlay').classList.add('open');
  toggleMedUsoContinuo();
  document.getElementById('medSearchInput').addEventListener('blur', function() {
    setTimeout(() => { const el = document.getElementById('medSearchResults'); if (el) el.classList.remove('open'); }, 180);
  });
}

function closeAddMedModal() {
  const pid = addMedPatientId;
  document.getElementById('medOverlay').classList.remove('open');
  addMedPatientId = null;
  if (addMedPhotoUrl) {
    URL.revokeObjectURL(addMedPhotoUrl);
    addMedPhotoUrl = null;
  }
  const root = document.getElementById('medModalRoot');
  if (root) root.innerHTML = '';
  if (pid != null) {
    const p = pacientes.find(x => x.id === pid);
    if (p && consultaFaseClinica(p) && p.consultaSessao) {
      consultaEtapaAtiva = 'medicacao';
      p.consultaSessao.etapaAtual = 'medicacao';
      if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pid) renderConsultaAtivaPage(pid);
    }
  }
}

function filterMedCatalog(q) {
  const list = document.getElementById('medSearchResults');
  const hidden = document.getElementById('medSelectedNome');
  const input = document.getElementById('medSearchInput');
  if (!list || !input) return;
  const t = (q || '').trim().toLowerCase();
  if (hidden && input.value.trim() && hidden.value && input.value.trim().toLowerCase() !== hidden.value.toLowerCase()) {
    hidden.value = '';
  }
  if (!t) {
    list.innerHTML = '';
    list.classList.remove('open');
    return;
  }
  const hits = catalogoMedicamentos.filter(n => n.toLowerCase().includes(t)).slice(0, 8);
  if (!hits.length) {
    list.innerHTML = '<div class="med-form-hint" style="padding:12px 14px;margin:0">Nenhum resultado. Tente outro nome.</div>';
    list.classList.add('open');
    return;
  }
  const indexed = hits.map(n => ({ n, i: catalogoMedicamentos.indexOf(n) })).filter(x => x.i >= 0);
  list.innerHTML = indexed.map(x =>
    `<button type="button" class="med-search-item" onclick="selectMedFromCatalogIdx(${x.i})">${x.n}</button>`
  ).join('');
  list.classList.add('open');
}

function selectMedFromCatalogIdx(idx) {
  const nome = catalogoMedicamentos[idx];
  if (!nome) return;
  const input = document.getElementById('medSearchInput');
  const hidden = document.getElementById('medSelectedNome');
  const list = document.getElementById('medSearchResults');
  if (input) input.value = nome;
  if (hidden) hidden.value = nome;
  if (list) { list.innerHTML = ''; list.classList.remove('open'); }
}

function onMedPhotoPick(ev) {
  const f = ev.target.files && ev.target.files[0];
  const box = document.getElementById('medPhotoBox');
  const prev = document.getElementById('medPhotoPreview');
  const ph = document.getElementById('medPhotoPlaceholder');
  if (addMedPhotoUrl) {
    URL.revokeObjectURL(addMedPhotoUrl);
    addMedPhotoUrl = null;
  }
  if (!f || !box || !prev || !ph) return;
  addMedPhotoUrl = URL.createObjectURL(f);
  prev.src = addMedPhotoUrl;
  prev.style.display = 'block';
  ph.style.display = 'none';
  box.classList.add('has-img');
}

function toggleMedUsoContinuo() {
  const chk = document.getElementById('medUsoContinuo');
  const dias = document.getElementById('medDias');
  if (!chk || !dias) return;
  const on = chk.checked;
  dias.disabled = on;
  if (on) dias.value = '';
}

function submitAddMedForm() {
  const pid = addMedPatientId;
  const p = pacientes.find(x => x.id === pid);
  if (!p) return;

  const nome = ((document.getElementById('medSelectedNome') || {}).value || '').trim();
  const dos = (document.getElementById('medDosagem') || {}).value || '';
  const freq = (document.getElementById('medFrequencia') || {}).value || '';

  if (!nome) {
    alert('Toque no nome do medicamento na lista para confirmar.');
    return;
  }
  if (!dos) {
    alert('Selecione a dosagem.');
    return;
  }
  if (!freq) {
    alert('Selecione a frequência.');
    return;
  }

  const usoCont = document.getElementById('medUsoContinuo').checked;
  const diasVal = parseInt(document.getElementById('medDias').value, 10);
  if (!usoCont && (!diasVal || diasVal < 1)) {
    alert('Informe por quantos dias será tomado, ou marque uso contínuo.');
    return;
  }

  let est = parseInt(document.getElementById('medEstoque').value, 10);
  let minE = parseInt(document.getElementById('medEstoqueMin').value, 10);
  if (Number.isNaN(est) || est < 0) est = 0;
  if (Number.isNaN(minE) || minE < 0) minE = 0;

  const label = `${nome} ${dos}`.replace(/\s+/g, ' ').trim();
  if (!p.meds.includes(label)) p.meds.push(label);

  const totalCap = Math.max(est, minE, 30);
  let status = 'ok';
  if (est <= minE) status = est === 0 ? 'critico' : 'baixo';
  const prox = new Date();
  prox.setDate(prox.getDate() + 28);
  const proxRenovacao = prox.toLocaleDateString('pt-BR');

  const dupe = medicacoes.find(m => m.paciente === p.nome && m.nome === label);
  if (!dupe) {
    medicacoes.push({
      nome: label,
      paciente: p.nome,
      estoque: est,
      total: totalCap,
      status,
      proxRenovacao,
    });
  } else {
    dupe.estoque = est;
    dupe.total = totalCap;
    dupe.status = status;
    dupe.proxRenovacao = proxRenovacao;
  }

  const inicio = document.getElementById('medInicio').value;
  const showDash = document.getElementById('medShowDash').checked;
  const alertAntes = document.getElementById('medAlertAntes').checked;
  const antec = document.getElementById('medAntecedencia').value;
  const alertAtraso = document.getElementById('medAlertAtraso').checked;
  const alertEst = document.getElementById('medAlertEstoque').checked;

  const agora = new Date();
  const dataStr = agora.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }).replace(',', '');

  let msgExtra = `Início ${inicio.split('-').reverse().join('/')} · ${freq}`;
  if (usoCont) msgExtra += ' · Uso contínuo';
  else msgExtra += ` · ${diasVal} dia(s)`;
  if (showDash) msgExtra += ' · No dashboard';
  msgExtra += ` · Alertas: ${alertAntes ? antec : 'sem lembrete'}`;
  msgExtra += alertAtraso ? ', dose atrasada' : '';
  msgExtra += alertEst ? ', estoque baixo' : '';

  p.historico.unshift({
    data: dataStr,
    tipo: 'green',
    msg: `Medicação adicionada: ${label}  ${msgExtra}`,
  });

  closeAddMedModal();
  if (paginaAtiva === 'detalhe') renderDetalhePage(pid);
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pid) renderConsultaAtivaPage(pid);
  renderSidebar();
  if (paginaAtiva === 'medicacoes') renderMedicacoesPage();
}

/* -- ALERTAS (coluna em Pacientes) -- */
function alertaTimestamp(a) {
  if (a.criadoEm) return new Date(a.criadoEm).getTime();
  return 0;
}

function setAlertasSideFiltro(f) {
  if (f !== 'todos' && f !== 'critico' && f !== 'aviso') return;
  alertasSideFiltro = f;
  renderSideCol();
}

function sideAlertItemHtml(a) {
  const pac = pacientes.find(p => p.id === a.pacienteId);
  const pillClass = a.severity === 'red' ? 'alert-sev-pill--crit' : 'alert-sev-pill--warn';
  const pillLabel = a.severity === 'red' ? 'Crítico' : 'Aviso';
  const avatarEl = pac
    ? patientAvatarHtml(pac, 32, 11)
    : `<div class="alert-icon ${a.severity}">${a.icon}</div>`;
  return `
    <div class="alert-item alert-item--acao">
      ${avatarEl}
      <div class="alert-item-body" onclick="openDetalhe(${a.pacienteId})" title="Abrir ficha">
        <div class="alert-item-top">
          <span class="alert-sev-pill ${pillClass}">${pillLabel}</span>
          <span class="alert-msg">${a.msg}</span>
        </div>
        <div class="alert-patient">${a.paciente}</div>
        <div class="alert-time">${a.detalhe}</div>
      </div>
      <div class="alert-item-actions">
        <button type="button" class="msg-btn" title="Mensagem" onclick="event.stopPropagation();openMsgModal(${a.pacienteId})">?</button>
        <button type="button" class="dismiss-btn" onclick="event.stopPropagation();dismissAlert(${a.id})">Dispensar</button>
      </div>
    </div>`;
}

function dismissAlert(id) {
  const a = alertas.find(x => x.id === id);
  if (a) a.ativo = false;
  renderSideCol();
  renderSidebar();
}

/* -- PAINEL + ATESTADO + ANOTAÇÕES DE CONSULTA -- */
function garantirModeloPaciente(p) {
  if (!p) return;
  if (!Array.isArray(p.anotacoesConsultas)) p.anotacoesConsultas = [];
  if (!Array.isArray(p.examesArquivos)) p.examesArquivos = [];
}

function encontrarSlotAgenda(agendaId) {
  return agendaHoje.find(x => x.id === agendaId)
    || agendaAmanha.find(x => x.id === agendaId)
    || agendaFutura.find(x => x.id === agendaId);
}

/** Zera atendimentos em curso (agenda, painel e sessões clínicas) para simular o dia do zero. */
function resetDemoAtendimentos() {
  [...agendaHoje, ...agendaAmanha].forEach(slot => {
    if (slot.badge === 'andamento') slot.badge = 'agendado';
  });
  painelAtendimentos = [];
  painelAgendaSeeded = false;
  consultaAtivaPacienteId = null;
  consultaContextoPacienteId = null;
  consultaRetornoPacienteId = null;
  consultaEtapaAtiva = 'anotacao';
  pacientes.forEach(p => {
    if (p && p.consultaSessao) p.consultaSessao = null;
  });
}

function painelJaTemAgendaId(agendaId) {
  return painelAtendimentos.some(x => x.agendaId === agendaId);
}

function adicionarAoPainelDesdeAgenda(c) {
  if (!c || !c.pacienteId || painelJaTemAgendaId(c.id)) return;
  painelAtendimentos.push({
    id: painelNextId++,
    pacienteId: c.pacienteId,
    agendaId: c.id,
    hora: c.hora,
    tipo: c.tipo,
    medico: c.medico || medico.nome,
    medicoId: c.medicoId,
  });
  renderSidebar();
  if (paginaAtiva === 'painel') renderPainelPage();
}

function adicionarAoPainelDesdeAgendaById(agendaId) {
  const c = encontrarSlotAgenda(agendaId);
  if (c) adicionarAoPainelDesdeAgenda(c);
}

function ensurePainelSeedFromAgenda() {
  if (painelAgendaSeeded) return;
  painelAgendaSeeded = true;
  const mid = sessaoMedicoId();
  agendaHoje
    .filter(x => x.badge === 'andamento' && x.pacienteId && (mid == null || x.medicoId === mid))
    .forEach(c => adicionarAoPainelDesdeAgenda(c));
}

function iniciarAtendimentoDesdeAgenda(agendaId) {
  const c = encontrarSlotAgenda(agendaId);
  if (!c || !c.pacienteId) return;
  const p = pacientes.find(x => x.id === c.pacienteId);
  if (p && consultaFaseClinica(p)) {
    navigateTo('consulta', c.pacienteId);
    return;
  }
  abrirModalTriagem(c.pacienteId, agendaId);
}

function pacienteNoPainel(pacienteId) {
  return painelEntradasVisiveis().find(x => x.pacienteId === pacienteId) || null;
}

function podeAbrirConsultaAtiva(pacienteId) {
  if (pacienteNoPainel(pacienteId)) return true;
  const mid = sessaoMedicoId();
  return [...agendaHoje, ...agendaAmanha].some(
    s => s.pacienteId === pacienteId && s.badge === 'andamento' && (mid == null || s.medicoId === mid),
  );
}

function consultasAtivasNaSessao() {
  const mid = sessaoMedicoId();
  const ids = new Set();
  painelEntradasVisiveis().forEach(e => { if (e.pacienteId) ids.add(e.pacienteId); });
  [...agendaHoje, ...agendaAmanha].forEach(s => {
    if (s.badge === 'andamento' && s.pacienteId && (mid == null || s.medicoId === mid)) ids.add(s.pacienteId);
  });
  return [...ids];
}

function horaConsultaLabel() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function consultaSessaoIniciada(p) {
  return !!(p && p.consultaSessao && p.consultaSessao.ativa);
}

function consultaEmTriagem(p) {
  return consultaSessaoIniciada(p) && p.consultaSessao.fase === 'triagem';
}

function consultaFaseClinica(p) {
  return consultaSessaoIniciada(p) && p.consultaSessao.fase === 'clinica';
}

function labelHoraIso(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function labelInicioConsulta(p) {
  if (!consultaSessaoIniciada(p)) return '';
  const clin = p.consultaSessao.clinica;
  if (clin && clin.iniciadaEmLabel) return clin.iniciadaEmLabel;
  if (clin && clin.iniciadaEm) return labelHoraIso(clin.iniciadaEm);
  if (p.consultaSessao.iniciadaEmLabel) return p.consultaSessao.iniciadaEmLabel;
  if (p.consultaSessao.iniciadaEm) return labelHoraIso(p.consultaSessao.iniciadaEm);
  return horaConsultaLabel();
}

function garantirSessaoTriagem(p, agendaId) {
  if (consultaFaseClinica(p)) return;
  if (consultaEmTriagem(p)) return;
  const agora = new Date();
  const hora = horaConsultaLabel();
  garantirModeloPaciente(p);
  p.consultaSessao = {
    ativa: true,
    fase: 'triagem',
    agendaId: agendaId != null ? agendaId : null,
    etapaAtual: 'triagem',
    triagem: {
      iniciadaEm: agora.toISOString(),
      iniciadaEmLabel: hora,
      finalizadaEm: null,
      finalizadaEmLabel: null,
      dados: null,
    },
    clinica: null,
    eventos: [{ etapa: 'triagem_inicio', label: 'Triagem iniciada', hora }],
  };
  if (agendaId != null) {
    const c = encontrarSlotAgenda(agendaId);
    if (c) {
      if (c.badge === 'agendado') c.badge = 'andamento';
      adicionarAoPainelDesdeAgenda(c);
    }
  }
}

function iniciarAtendimentoClinicoAposTriagem(p, dadosTriagem) {
  const agora = new Date();
  const hora = horaConsultaLabel();
  const tri = p.consultaSessao.triagem || {};
  tri.finalizadaEm = agora.toISOString();
  tri.finalizadaEmLabel = hora;
  tri.dados = dadosTriagem;
  p.consultaSessao.triagem = tri;
  p.consultaSessao.fase = 'clinica';
  p.consultaSessao.etapaAtual = 'anotacao';
  p.consultaSessao.clinica = {
    iniciadaEm: agora.toISOString(),
    iniciadaEmLabel: hora,
    finalizadaEm: null,
    finalizadaEmLabel: null,
  };
  p.consultaSessao.iniciadaEm = agora.toISOString();
  p.consultaSessao.iniciadaEmLabel = hora;
  const resumo = [
    dadosTriagem.fc ? `FC ${dadosTriagem.fc}` : '',
    dadosTriagem.saturacao ? `SpO₂ ${dadosTriagem.saturacao}` : '',
    dadosTriagem.temperatura ? `Temp. ${dadosTriagem.temperatura}` : '',
  ].filter(Boolean).join(' · ');
  registrarEventoConsulta(p, 'triagem_fim', resumo ? `Triagem finalizada (${resumo})` : 'Triagem finalizada');
  registrarEventoConsulta(p, 'clinica_inicio', 'Atendimento clínico iniciado');
  consultaContextoPacienteId = p.id;
  consultaEtapaAtiva = 'anotacao';
}

function abrirModalTriagem(pacienteId, agendaId) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(pacienteId)) {
    alert('Nesta sessão você só atende pacientes da sua agenda.');
    return;
  }
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  if (consultaFaseClinica(p)) {
    navigateTo('consulta', pacienteId);
    return;
  }
  let agId = agendaId;
  if (agId == null) {
    const slot = [...agendaHoje, ...agendaAmanha].find(
      s => s.pacienteId === pacienteId && (s.badge === 'agendado' || s.badge === 'andamento'),
    );
    if (slot) agId = slot.id;
  }
  garantirSessaoTriagem(p, agId);
  triagemModalPacienteId = pacienteId;
  triagemModalAgendaId = agId;
  const root = document.getElementById('triagemModalRoot');
  const overlay = document.getElementById('triagemOverlay');
  if (!root || !overlay) return;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const d = p.consultaSessao.triagem && p.consultaSessao.triagem.dados;
  const fcVal = d && d.fc ? esc(d.fc) : esc((p.fc || '').replace(/\s*bpm/i, '').trim());
  const satVal = d && d.saturacao ? esc(d.saturacao) : esc((p.saturacao || '').replace(/%/g, '').trim());
  const tempVal = d && d.temperatura ? esc(d.temperatura) : esc((p.temperatura || '').replace(/°C/i, '').trim());
  const sintVal = d && d.sintomas ? esc(d.sintomas) : '';
  const horaTri = p.consultaSessao.triagem && p.consultaSessao.triagem.iniciadaEmLabel
    ? p.consultaSessao.triagem.iniciadaEmLabel
    : horaConsultaLabel();
  const pressaoVal = d && d.pressao ? esc(d.pressao) : esc((p.pressao || '').trim());
  root.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Triagem · ${esc(p.nome)}</div>
      <button type="button" class="modal-close" onclick="fecharModalTriagem()" aria-label="Fechar"></button>
    </div>
    <form class="cad-pac-form triagem-form" style="padding:16px 20px" onsubmit="event.preventDefault();salvarTriagemForm();">
      <p class="cad-pac-hint" style="margin:0 0 14px">Triagem iniciada às <strong>${horaTri}</strong>. Preencha os sinais e sintomas; ao salvar, o atendimento clínico abre automaticamente.</p>
      <div class="cad-pac-grid triagem-form-grid">
        <div class="cad-pac-field">
          <label for="triagemPressao">Pressão Arterial (PA)</label>
          <input type="text" id="triagemPressao" class="med-form-input" placeholder="Ex.: 120/80" value="${pressaoVal}" maxlength="16" />
        </div>
        <div class="cad-pac-field">
          <label for="triagemFc">Batimentos (FC)</label>
          <input type="text" id="triagemFc" class="med-form-input" placeholder="Ex.: 72 bpm" value="${fcVal}" maxlength="24" />
        </div>
        <div class="cad-pac-field">
          <label for="triagemSat">Saturação (SpO₂)</label>
          <input type="text" id="triagemSat" class="med-form-input" placeholder="Ex.: 98%" value="${satVal}" maxlength="16" />
        </div>
        <div class="cad-pac-field">
          <label for="triagemTemp">Temperatura</label>
          <input type="text" id="triagemTemp" class="med-form-input" placeholder="Ex.: 36,5°C" value="${tempVal}" maxlength="16" />
        </div>
        <div class="cad-pac-field cad-pac-field--full">
          <div class="textarea-label-row">
            <label for="triagemSintomas">Sintomas relatados pelo paciente</label>
            ${htmlMicBtn('triagemSintomas', 'micBtnTriagem')}
          </div>
          <textarea id="triagemSintomas" class="med-form-input" rows="4" placeholder="Queixa principal, duração, intensidade…">${sintVal}</textarea>
        </div>
      </div>
      <div class="cad-pac-footer" style="border-top:none;padding-top:12px;flex-direction:column;align-items:stretch;gap:10px">
        <div id="triagemIARiscoWrap" style="display:none">
          <div id="triagemIARiscoTexto" style="padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;font-size:13px;line-height:1.5"></div>
        </div>
        <button type="button" class="btn-outline" id="btnTriagemRiscoIA" onclick="sugerirRiscoTriagemIA()" title="IA avalia o nível de risco com base nos sinais vitais">✨ Sugerir nível de risco</button>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn-outline" onclick="fecharModalTriagem()">Cancelar</button>
          <button type="submit" class="btn-primary" style="flex:1">Salvar triagem e iniciar atendimento</button>
        </div>
      </div>
    </form>`;
  overlay.classList.add('open');
  if (paginaAtiva === 'agenda') renderAgendaPage();
  renderSidebar();
}

function fecharModalTriagem() {
  const overlay = document.getElementById('triagemOverlay');
  if (overlay) overlay.classList.remove('open');
  triagemModalPacienteId = null;
  triagemModalAgendaId = null;
}

function salvarTriagemForm() {
  const pid = triagemModalPacienteId;
  if (pid == null) return;
  const p = pacientes.find(x => x.id === pid);
  if (!p || !consultaEmTriagem(p)) {
    fecharModalTriagem();
    return;
  }
  const pressao = (document.getElementById('triagemPressao') && document.getElementById('triagemPressao').value || '').trim();
  const fc = (document.getElementById('triagemFc') && document.getElementById('triagemFc').value || '').trim();
  const saturacao = (document.getElementById('triagemSat') && document.getElementById('triagemSat').value || '').trim();
  const temperatura = (document.getElementById('triagemTemp') && document.getElementById('triagemTemp').value || '').trim();
  const sintomas = (document.getElementById('triagemSintomas') && document.getElementById('triagemSintomas').value || '').trim();
  if (!pressao && !fc && !saturacao && !temperatura) {
    alert('Informe ao menos um sinal vital (pressão, batimentos, saturação ou temperatura).');
    return;
  }
  if (!sintomas) {
    alert('Descreva os sintomas relatados pelo paciente.');
    return;
  }
  const normPressao = pressao;
  const normFc = fc && !/bpm/i.test(fc) ? `${fc} bpm` : fc;
  const normSat = saturacao && !/%/.test(saturacao) ? `${saturacao}%` : saturacao;
  const normTemp = temperatura && !/°/i.test(temperatura) ? `${temperatura}°C` : temperatura;
  if (normPressao) p.pressao = normPressao;
  if (normFc) p.fc = normFc;
  if (normSat) p.saturacao = normSat;
  if (normTemp) p.temperatura = normTemp;
  const dadosTriagem = { pressao: normPressao, fc: normFc, saturacao: normSat, temperatura: normTemp, sintomas };
  iniciarAtendimentoClinicoAposTriagem(p, dadosTriagem);
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  p.historico.unshift({
    data: dataHist,
    tipo: 'green',
    msg: `Triagem: PA ${normPressao || '—'} · FC ${normFc || '—'} · SpO₂ ${normSat || '—'} · Temp ${normTemp || '—'}. Sintomas: ${sintomas.slice(0, 80)}${sintomas.length > 80 ? '…' : ''}`,
  });
  fecharModalTriagem();
  navigateTo('consulta', pid);
  renderSidebar();
}

function iniciarConsultaPaciente(pacienteId) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(pacienteId)) {
    alert('Nesta sessão você só atende pacientes da sua agenda.');
    return;
  }
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  if (consultaFaseClinica(p)) {
    navigateTo('consulta', pacienteId);
    return;
  }
  if (consultaEmTriagem(p)) {
    abrirModalTriagem(pacienteId, p.consultaSessao.agendaId);
    return;
  }
  const slot = [...agendaHoje, ...agendaAmanha].find(
    s => s.pacienteId === pacienteId && (s.badge === 'agendado' || s.badge === 'andamento'),
  );
  abrirModalTriagem(pacienteId, slot ? slot.id : null);
}

function registrarEventoConsulta(p, etapa, label) {
  if (!p || !consultaSessaoIniciada(p)) return;
  if (!Array.isArray(p.consultaSessao.eventos)) p.consultaSessao.eventos = [];
  const defs = CONSULTA_ETAPAS_FLUXO.find(x => x.key === etapa);
  const texto = label || (defs ? defs.label : etapa);
  const ev = p.consultaSessao.eventos;
  const ult = ev[ev.length - 1];
  if (ult && ult.etapa === etapa && ult.label === texto) return;
  ev.push({ etapa, label: texto, hora: horaConsultaLabel() });
}

function etapaFluxoConsultaAtual(pacienteId) {
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    return consultaEtapaAtiva || 'anotacao';
  }
  if ((paginaAtiva === 'detalhe' && pacienteDetalheId === pacienteId)
    && (consultaContextoPacienteId === pacienteId || consultaRetornoPacienteId === pacienteId)) {
    if (detalheCategoria === 'medicacao') return 'medicacao';
    if (detalheCategoria === 'examesPaciente') return 'exames';
    return 'perfil';
  }
  return consultaEtapaAtiva || 'anotacao';
}

function setEtapaConsulta(pacienteId, etapa) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  if (!consultaSessaoIniciada(p) || !consultaFaseClinica(p)) {
    if (consultaEmTriagem(p)) {
      abrirModalTriagem(pacienteId, p.consultaSessao.agendaId);
    } else {
      iniciarConsultaPaciente(pacienteId);
    }
    return;
  }
  consultaEtapaAtiva = etapa;
  consultaContextoPacienteId = pacienteId;
  p.consultaSessao.etapaAtual = etapa;
  registrarEventoConsulta(p, etapa);
  if (etapa === 'perfil') {
    openDetalheEmConsulta(pacienteId, 'saude');
    return;
  }
  if (etapa === 'medicacao') {
    openAddMedModal(pacienteId);
    if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
      renderConsultaAtivaPage(pacienteId);
    }
    return;
  }
  if (etapa === 'exames') {
    if (paginaAtiva === 'detalhe' && pacienteDetalheId === pacienteId) {
      detalheCategoria = 'examesPaciente';
      renderDetalhePage(pacienteId);
      return;
    }
    if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
      renderConsultaAtivaPage(pacienteId);
      return;
    }
    navigateTo('consulta', pacienteId);
    return;
  }
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    renderConsultaAtivaPage(pacienteId);
  } else {
    navigateTo('consulta', pacienteId);
  }
}

function irEtapaConsulta(pacienteId, etapa) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!consultaSessaoIniciada(p)) {
    if (etapa === 'anotacao') {
      iniciarConsultaPaciente(pacienteId);
      return;
    }
    if (etapa === 'receita') { iniciarConsultaPaciente(pacienteId); return; }
    if (etapa === 'atestado') { iniciarConsultaPaciente(pacienteId); return; }
    if (etapa === 'exames' || etapa === 'medicacao' || etapa === 'perfil') {
      openDetalhe(pacienteId);
      return;
    }
    return;
  }
  if (etapa === 'receita') {
    setEtapaConsulta(pacienteId, 'receita');
    abrirReceitaModal(pacienteId);
    return;
  }
  if (etapa === 'atestado') {
    setEtapaConsulta(pacienteId, 'atestado');
    openAtestadoModal(pacienteId);
    return;
  }
  if (etapa === 'medicacao') {
    setEtapaConsulta(pacienteId, 'medicacao');
    return;
  }
  setEtapaConsulta(pacienteId, etapa);
}

function textoStatusConsultaAtiva(p) {
  if (!consultaSessaoIniciada(p)) return '';
  if (consultaEmTriagem(p)) {
    const t = p.consultaSessao.triagem;
    const hi = t && t.iniciadaEmLabel ? t.iniciadaEmLabel : '—';
    return `Triagem em andamento desde <strong>${hi}</strong>. Conclua a triagem para abrir o atendimento clínico.`;
  }
  const dur = duracaoConsultaMinutos(p);
  const durTxt = dur != null ? ` · <strong>${dur} min</strong> decorridos` : '';
  const tri = p.consultaSessao.triagem;
  let triTxt = '';
  if (tri && tri.iniciadaEmLabel && tri.finalizadaEmLabel) {
    triTxt = ` Triagem: <strong>${tri.iniciadaEmLabel}</strong>–<strong>${tri.finalizadaEmLabel}</strong>.`;
  }
  return `Atendimento clínico desde <strong>${labelInicioConsulta(p)}</strong>${durTxt}.${triTxt} Use <strong>Encerrar atendimento</strong> ao finalizar.`;
}

function duracaoConsultaMinutos(p) {
  if (!consultaFaseClinica(p)) return null;
  const inicio = p.consultaSessao.clinica && p.consultaSessao.clinica.iniciadaEm;
  if (!inicio) return null;
  const ms = Date.now() - new Date(inicio).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

function resumoLinhaTempoConsulta(p) {
  if (!consultaSessaoIniciada(p)) return '';
  const parts = [];
  const tri = p.consultaSessao.triagem;
  if (tri && tri.iniciadaEmLabel) {
    parts.push(`Triagem: ${tri.iniciadaEmLabel}${tri.finalizadaEmLabel ? ` – ${tri.finalizadaEmLabel}` : ''}`);
  }
  if (consultaFaseClinica(p)) {
    parts.push(`Atendimento clínico desde ${labelInicioConsulta(p)}`);
    const dur = duracaoConsultaMinutos(p);
    if (dur != null) parts.push(`${dur} min decorridos`);
  } else if (consultaEmTriagem(p)) {
    parts.push('Triagem em andamento');
  }
  return parts.join(' · ');
}

function htmlConsultaEventosTimeline(p) {
  if (!consultaSessaoIniciada(p) || !Array.isArray(p.consultaSessao.eventos) || !p.consultaSessao.eventos.length) {
    return '<p class="cad-pac-hint" style="margin:0">Nenhum evento registrado ainda.</p>';
  }
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const items = p.consultaSessao.eventos.map(ev => {
    const et = ev.etapa || '';
    const cls = et.includes('triagem') ? 'triagem' : (et.includes('clinica') || et === 'fim' ? 'clinica' : 'outro');
    return `<li class="consulta-eventos-tl__item consulta-eventos-tl__item--${cls}">
      <span class="consulta-eventos-tl__hora">${esc(ev.hora)}</span>
      <span class="consulta-eventos-tl__label">${esc(ev.label)}</span>
    </li>`;
  }).join('');
  return `<div class="consulta-eventos-tl-wrap">
    <div class="consulta-eventos-tl-title">Linha do tempo do atendimento</div>
    <ol class="consulta-eventos-tl">${items}</ol>
  </div>`;
}

function abrirModalLinhaTempoConsulta(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p || !consultaSessaoIniciada(p)) {
    alert('Nenhum atendimento em curso para exibir a linha do tempo.');
    return;
  }
  const overlay = document.getElementById('consultaTimelineOverlay');
  const root = document.getElementById('consultaTimelineModalRoot');
  if (!overlay || !root) return;
  const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const resumo = resumoLinhaTempoConsulta(p);
  root.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Linha do tempo · ${esc(p.nome)}</div>
      <button type="button" class="modal-close" onclick="fecharModalLinhaTempoConsulta()" aria-label="Fechar"></button>
    </div>
    <div class="consulta-tl-modal-body" id="consultaTimelinePrintBox">
      <p class="consulta-tl-modal-resumo">${esc(resumo)}</p>
      ${htmlConsultaEventosTimeline(p)}
    </div>
    <div class="cad-pac-footer consulta-tl-modal-footer">
      <button type="button" class="btn-outline" onclick="fecharModalLinhaTempoConsulta()">Fechar</button>
      <button type="button" class="btn-primary" onclick="imprimirLinhaTempoConsulta()">Imprimir</button>
    </div>`;
  overlay.classList.add('open');
}

function fecharModalLinhaTempoConsulta() {
  const overlay = document.getElementById('consultaTimelineOverlay');
  if (overlay) overlay.classList.remove('open');
  const root = document.getElementById('consultaTimelineModalRoot');
  if (root) root.innerHTML = '';
}

function imprimirLinhaTempoConsulta() {
  const box = document.getElementById('consultaTimelinePrintBox');
  if (!box) return;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    alert('Permita pop-ups para imprimir a linha do tempo.');
    return;
  }
  const titulo = 'Linha do tempo do atendimento — TeepSaude';
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px; color: #1e1b4b; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      .consulta-tl-modal-resumo { font-size: 13px; color: #64748b; margin: 0 0 16px; }
      .consulta-eventos-tl-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin: 0 0 8px; }
      .consulta-eventos-tl { list-style: none; margin: 0; padding: 0; }
      .consulta-eventos-tl__item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      .consulta-eventos-tl__hora { font-weight: 700; min-width: 48px; color: #7c3aed; }
      .consulta-eventos-tl__item--triagem { border-left: 3px solid #f59e0b; padding-left: 8px; }
      .consulta-eventos-tl__item--clinica { border-left: 3px solid #7c3aed; padding-left: 8px; }
    </style></head><body>
    <h1>${titulo}</h1>
    ${box.innerHTML}
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}

function htmlBannerConsultaPerfil(p) {
  if (!licencaConsultaAtiva()) {
    return `<div class="perfil-consulta-banner" style="background:var(--bg)">
      <p class="perfil-consulta-banner__info" style="color:var(--muted)">
        🔒 Módulo de Consulta Clínica inativo.
        <button type="button" class="btn-link" onclick="navigateTo('configuracoes')" style="font-size:13px;color:var(--purple);background:none;border:none;cursor:pointer;padding:0;text-decoration:underline">Ativar em Configurações → Módulos</button>
      </p>
    </div>`;
  }
  const pid = p.id;
  if (consultaEmTriagem(p)) {
    const agId = p.consultaSessao.agendaId != null ? p.consultaSessao.agendaId : 'null';
    return `<div class="perfil-consulta-banner perfil-consulta-banner--ativa">
      <div class="perfil-consulta-banner__text">
        <strong>Triagem em andamento</strong> · conclua para iniciar o atendimento clínico
      </div>
      <div class="perfil-consulta-banner__actions">
        <button type="button" class="btn-primary" onclick="abrirModalTriagem(${pid},${agId})" title="Preencher sinais vitais e sintomas">Continuar triagem</button>
      </div>
    </div>`;
  }
  if (consultaFaseClinica(p)) {
    const dur = duracaoConsultaMinutos(p);
    return `<div class="perfil-consulta-banner perfil-consulta-banner--ativa">
      <div class="perfil-consulta-banner__text">
        <strong>Atendimento clínico em curso</strong> · início ${labelInicioConsulta(p)}${dur != null ? ` · ${dur} min decorridos` : ''}
      </div>
      <div class="perfil-consulta-banner__actions">
        <button type="button" class="btn-primary" onclick="voltarParaConsultaAtiva()" title="Voltar à anotação clínica do atendimento">Retomar atendimento</button>
        <button type="button" class="btn-outline" onclick="finalizarConsultaPaciente(${pid})" title="Encerra o atendimento e registra o tempo total">Encerrar e registrar tempo</button>
      </div>
    </div>`;
  }
  const hintAgenda = podeAbrirConsultaAtiva(pid)
    ? '<p class="perfil-consulta-banner__hint">Há horário na agenda. Use <strong>Iniciar atendimento</strong> na agenda para abrir a triagem.</p>'
    : '';
  return `<div class="perfil-consulta-banner">
    <p class="perfil-consulta-banner__info">Você está na <strong>análise da ficha</strong>. O atendimento começa pela <strong>triagem</strong> e, ao salvar, abre o registro clínico.</p>
    ${hintAgenda}
    <button type="button" class="btn-primary" onclick="iniciarConsultaPaciente(${pid})" title="Abre a triagem; ao salvar, inicia o atendimento clínico">Iniciar atendimento (triagem)</button>
  </div>`;
}

function htmlLinhaTempoConsulta(p, etapaAtual) {
  if (!consultaFaseClinica(p)) return '';
  const etapa = etapaAtual || etapaFluxoConsultaAtual(p.id);
  const pid = p.id;
  const mkEtapa = s => {
    const cur = s.key === etapa;
    const cls = `consulta-ativa-btn${cur ? ' consulta-ativa-btn--current' : ''}`;
    const tit = s.title ? ` title="${s.title.replace(/"/g, '&quot;')}"` : '';
    if (cur) {
      return `<button type="button" class="${cls}" disabled aria-current="step"${tit}>
        <span class="consulta-ativa-btn__icon" aria-hidden="true">${s.icon}</span>${s.label}</button>`;
    }
    return `<button type="button" class="${cls}" onclick="irEtapaConsulta(${pid},'${s.key}')"${tit}>
      <span class="consulta-ativa-btn__icon" aria-hidden="true">${s.icon}</span>${s.label}</button>`;
  };
  const btnPerfil = etapa === 'perfil'
    ? `<button type="button" class="consulta-ativa-btn consulta-ativa-btn--current" disabled aria-current="page" title="Ficha completa do paciente (análise)">
        <span class="consulta-ativa-btn__icon" aria-hidden="true">👤</span>Ficha completa</button>`
    : `<button type="button" class="consulta-ativa-btn" onclick="irEtapaConsulta(${pid},'perfil')" title="Abrir ficha completa sem encerrar o atendimento">
        <span class="consulta-ativa-btn__icon" aria-hidden="true">👤</span>Ficha completa</button>`;
  const btnTimeline = `<button type="button" class="consulta-ativa-btn" onclick="abrirModalLinhaTempoConsulta(${pid})" title="Ver histórico do atendimento e imprimir">
    <span class="consulta-ativa-btn__icon" aria-hidden="true">🕐</span>Linha do tempo</button>`;
  const btnFinalizar = `<button type="button" class="consulta-ativa-btn consulta-ativa-btn--primary" onclick="finalizarConsultaPaciente(${pid})" title="Encerra o atendimento e salva a duração no prontuário">
    <span class="consulta-ativa-btn__icon" aria-hidden="true">✓</span>Encerrar atendimento</button>`;
  const acoesFim = `<div class="consulta-ativa-toolbar__fim">${btnTimeline}${btnFinalizar}</div>`;
  return `<nav class="consulta-ativa-toolbar" aria-label="Etapas da consulta">
    ${CONSULTA_ETAPAS_FLUXO.map(mkEtapa).join('')}
    ${btnPerfil}
    ${acoesFim}
  </nav>`;
}

function htmlPacienteCabecalhoPadrao(p, opts) {
  const esc = opts.esc || (s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'));
  const voltarOnclick = opts.voltarOnclick || "navigateTo('pacientes')";
  const voltarLabel = opts.voltarLabel || '← Voltar';
  const showRisk = opts.showRisk !== false;
  const showSideActions = opts.showSideActions !== false;
  const vPendBody = pacienteVinculoPendente(p);
  const metaLinha1 = vPendBody
    ? 'Identidade e dados clínicos serão liberados após aprovação no app do titular'
    : `${p.idade} anos · ${p.sexo === 'F' ? 'Feminino' : 'Masculino'} · ${p.condicoes}`;
  const metaLinha2 = vPendBody
    ? `Código ${p.vinculoApp.codigoInformado} · solicitado em ${p.vinculoApp.solicitadoEm}`
    : `Último registro: ${p.ultimoReg} · Próxima consulta: ${p.proximaConsulta}`;
  const sideActions = showSideActions
    ? `<div class="patient-detail-header-actions">
        <button type="button" class="btn-primary" style="white-space:nowrap" onclick="openAgendaModal(${p.id})">📅 Agendar</button>
        <button class="msg-btn" onclick="openMsgModal(${p.id})">✉ Mensagem</button>
      </div>`
    : '';
  return `
    <div class="paciente-contexto-topo">
      <div class="patient-detail-bar">
        <button type="button" class="back-btn" onclick="${voltarOnclick}">${esc(voltarLabel)}</button>
        ${showRisk ? `<span class="risk-pill ${pillClass(p.status)}" style="font-size:11px">${pillLabel(p.status)}</span>` : ''}
      </div>
      <div class="patient-detail-header">
        ${patientAvatarHtml(p, 56, 20)}
        <div class="patient-detail-header-main">
          <div class="patient-detail-name">${esc(p.nome)}</div>
          <div class="patient-detail-meta">${metaLinha1}</div>
          <div class="patient-detail-meta patient-detail-meta--sub">${metaLinha2}</div>
        </div>
        ${sideActions}
      </div>
    </div>`;
}

function htmlBlocoConsultaAtiva(p) {
  if (!consultaSessaoIniciada(p)) return '';
  const etapa = etapaFluxoConsultaAtual(p.id);
  const badge = consultaEmTriagem(p) ? 'Triagem em curso' : 'Atendimento clínico';
  const btnTriagem = consultaEmTriagem(p)
    ? `<button type="button" class="btn-primary" style="margin-top:10px" onclick="abrirModalTriagem(${p.id},${p.consultaSessao.agendaId != null ? p.consultaSessao.agendaId : 'null'})">Concluir triagem</button>`
    : '';
  return `<div class="consulta-ativa-bar">
    <div class="consulta-ativa-bar__head">
      <span class="consulta-ativa-bar__badge">${badge}</span>
      <p class="consulta-ativa-bar__text">${textoStatusConsultaAtiva(p)}</p>
      ${btnTriagem}
    </div>
    ${htmlLinhaTempoConsulta(p, etapa)}
  </div>`;
}

function setDetalheExamesSub(pacienteId, sub) {
  if (!['salvos', 'solicitar'].includes(sub)) return;
  detalheExamesSub = sub;
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    renderConsultaAtivaPage(pacienteId);
  } else {
    renderDetalhePage(pacienteId);
  }
}

function pushExameSolicitacaoPaciente(pacienteId, payload, edicaoId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return false;
  const meds = new Set();
  [...agendaHoje, ...agendaAmanha].forEach(slot => {
    if (slot.pacienteId === pacienteId && slot.medicoId) meds.add(slot.medicoId);
  });
  const full = {
    ...payload,
    pacienteId,
    paciente: p.nome,
    origem: 'clinica',
    anexos: [],
    compartilhadoMedicoIds: [...meds],
    autorizadoPaciente: true,
  };
  if (edicaoId != null) {
    const ex = exames.find(x => x.id === edicaoId);
    if (ex) Object.assign(ex, full, { anexos: ex.anexos || [] });
  } else {
    exames.push({ id: exameSolicitacaoNextId++, ...full });
  }
  return true;
}

function refreshExamesPacienteUI(pacienteId) {
  renderSidebar();
  if (paginaAtiva === 'examesSolicitacoes') renderExamModule('request-management', 'examesSolicitacoesPage');
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    renderConsultaAtivaPage(pacienteId);
  } else if (paginaAtiva === 'detalhe' && pacienteDetalheId === pacienteId && detalheCategoria === 'examesPaciente') {
    renderDetalhePage(pacienteId);
  }
}

function salvarSolicitacaoExameInline(pacienteId) {
  const nome = (document.getElementById('exSolInlineNome_' + pacienteId) && document.getElementById('exSolInlineNome_' + pacienteId).value || '').trim();
  const tipo = document.getElementById('exSolInlineTipo_' + pacienteId) && document.getElementById('exSolInlineTipo_' + pacienteId).value;
  const dataIso = document.getElementById('exSolInlineData_' + pacienteId) && document.getElementById('exSolInlineData_' + pacienteId).value;
  const prioridade = document.getElementById('exSolInlinePri_' + pacienteId) && document.getElementById('exSolInlinePri_' + pacienteId).value;
  const statusFluxo = document.getElementById('exSolInlineSt_' + pacienteId) && document.getElementById('exSolInlineSt_' + pacienteId).value;
  if (!nome) {
    alert('Informe o nome do exame.');
    return;
  }
  let dataFmt = dataIso || '';
  if (dataIso) {
    const parts = dataIso.split('-');
    if (parts.length === 3) dataFmt = parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  const ok = pushExameSolicitacaoPaciente(pacienteId, {
    nome,
    tipo: tipo || 'Outro',
    data: dataFmt || new Date().toLocaleDateString('pt-BR'),
    dataIso: dataIso || null,
    prioridade: prioridade || 'normal',
    statusFluxo: statusFluxo || 'solicitado',
  }, null);
  if (!ok) return;
  detalheExamesSub = 'salvos';
  refreshExamesPacienteUI(pacienteId);
}

function htmlExamesPacienteView(p, opts) {
  opts = opts || {};
  const pid = p.id;
  const sub = detalheExamesSub === 'solicitar' ? 'solicitar' : 'salvos';
  const escE = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
  const subBar = `
    <p class="cad-pac-hint exames-paciente-intro" style="margin:0 0 12px">
      <strong>Exames salvos</strong> reúne solicitações e laudos já registrados. Use <strong>Solicitar exame</strong> para pedir um novo exame nesta consulta.
    </p>
    <div class="detail-hist-sub-bar">
      <button type="button" class="detail-hist-sub-btn ${sub === 'salvos' ? 'active' : ''}" onclick="setDetalheExamesSub(${pid},'salvos')">Exames salvos</button>
      <button type="button" class="detail-hist-sub-btn ${sub === 'solicitar' ? 'active' : ''}" onclick="setDetalheExamesSub(${pid},'solicitar')">Solicitar exame</button>
    </div>`;

  if (sub === 'solicitar') {
    const optsTipo = EXAME_TIPOS_LISTA.map(t => '<option>' + t + '</option>').join('');
    const optsSt = EXAME_STATUS_FLUXO_LISTA.map(st =>
      '<option value="' + st + '">' + EXAME_STATUS_FLUXO_LABEL[st] + '</option>',
    ).join('');
    const n = new Date();
    const hojeIso = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    const blocoSt = sessaoEhClinica()
      ? '<div class="med-form-field"><label class="med-form-label" for="exSolInlineSt_' + pid + '">Status</label><select class="med-form-select" id="exSolInlineSt_' + pid + '">' + optsSt + '</select></div>'
      : '<input type="hidden" id="exSolInlineSt_' + pid + '" value="solicitado" />';
    const formPanel = `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Solicitar exame</div>
          <div style="font-size:11px;color:var(--muted);font-weight:500">Registro do pedido para este paciente</div>
        </div>
        <div style="padding:14px 16px 18px">
          <div class="med-form-field">
            <label class="med-form-label" for="exSolInlineNome_${pid}">Exame *</label>
            <input class="med-form-input" type="text" id="exSolInlineNome_${pid}" placeholder="Ex.: Hemograma, Ecocardiograma…" maxlength="120" />
          </div>
          <div class="med-form-field">
            <label class="med-form-label" for="exSolInlineTipo_${pid}">Tipo</label>
            <select class="med-form-select" id="exSolInlineTipo_${pid}">${optsTipo}</select>
          </div>
          <div class="med-form-field">
            <label class="med-form-label" for="exSolInlineData_${pid}">Data da solicitação</label>
            <input class="med-form-input" type="date" id="exSolInlineData_${pid}" value="${hojeIso}" />
          </div>
          <div class="med-form-field">
            <label class="med-form-label" for="exSolInlinePri_${pid}">Prioridade</label>
            <select class="med-form-select" id="exSolInlinePri_${pid}">
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          ${blocoSt}
          <button type="button" class="btn-primary" onclick="salvarSolicitacaoExameInline(${pid})">Registrar solicitação</button>
        </div>
      </div>`;
    const rodape = opts.consulta
      ? '<div class="consulta-etapa-panel__actions" style="margin-top:14px"><button type="button" class="btn-outline consulta-etapa-voltar" onclick="irEtapaConsulta(' + pid + ',\'anotacao\')">← Voltar à consulta</button></div>'
      : '';
    return subBar + formPanel + rodape;
  }

  const solicPac = exames.filter(e => e.pacienteId === pid);
  const rowsSolic = solicPac.length
    ? solicPac.map(e => {
      const priClass = e.prioridade === 'urgente' ? 'urgente' : 'normal';
      const priLabel = e.prioridade === 'urgente' ? 'Urgente' : 'Normal';
      const stClass = e.statusFluxo === 'concluido' ? 'concluido'
        : (e.statusFluxo === 'resultado_recebido' ? 'resultado' : 'pendente');
      const stLabel = EXAME_STATUS_FLUXO_LABEL[e.statusFluxo] || e.statusFluxo;
      const anexosN = (e.anexos && e.anexos.length) || 0;
      const btnEdit = sessaoEhClinica()
        ? '<button type="button" class="btn-outline" style="font-size:12px;padding:6px 10px" onclick="abrirModalExameSolicitacao(' + e.id + ',' + pid + ')">Editar</button>'
        : '';
      return '<div class="exame-solic-item">' +
        '<div class="exame-solic-item__head"><strong>' + escE(e.nome) + '</strong>' +
        '<span class="exam-status-badge ' + priClass + '">' + priLabel + '</span>' +
        '<span class="exam-status-badge ' + stClass + '">' + stLabel + '</span></div>' +
        '<div class="exame-solic-item__meta">' + escE(e.tipo) + ' · ' + escE(e.data) +
        (anexosN ? ' · ' + anexosN + ' anexo(s)' : '') + '</div>' +
        '<div class="exame-solic-item__actions">' + btnEdit + '</div></div>';
    }).join('')
    : '<div class="empty-state" style="padding:16px">Nenhuma solicitação registrada para este paciente.</div>';

  const cardsEx = p.examesArquivos.map(ex => {
    const isPdf = ex.mime === 'application/pdf';
    const prev = isPdf
      ? '<div class="exame-perfil-pdf">PDF<br><a href="' + escAttrDataUrl(ex.dataUrl) + '" download="' + escE(ex.nomeArquivo) + '">Baixar</a>' +
        '<br><button type="button" class="btn-outline" style="margin-top:8px;font-size:12px;padding:6px 10px" onclick="abrirExamePacienteNovaAba(' + pid + ',' + ex.id + ')">Abrir em nova aba</button></div>'
      : '<div class="exame-perfil-preview"><img src="' + escAttrDataUrl(ex.dataUrl) + '" alt="" onclick="abrirExamePacienteNovaAba(' + pid + ',' + ex.id + ')" title="Abrir"/></div>';
    const origLabel = ex.origem === 'paciente' ? 'Paciente (app/recepção)' : 'Clínica / médico';
    return '<div class="exame-perfil-card">' +
      '<div class="exame-perfil-card-head">' + escE(ex.titulo) +
      '<div class="exame-perfil-card-meta">' + escE(ex.dataRegistro) + ' · ' + origLabel + ' · ' + escE(ex.nomeArquivo) + '</div></div>' +
      prev +
      '<div class="exame-perfil-actions"><button type="button" class="btn-outline" onclick="removerExamePerfilPaciente(' + pid + ',' + ex.id + ')">Remover</button></div></div>';
  }).join('');

  const uploadPanel = `
    <div class="panel" style="margin-top:14px">
      <div class="panel-header">
        <div class="panel-title">Anexar laudo ou imagem</div>
        <div style="font-size:11px;color:var(--muted);font-weight:500">Resultado recebido — PDF ou foto</div>
      </div>
      <div style="padding:14px 16px 18px">
        <div class="med-form-field">
          <label class="med-form-label" for="exameTitulo_${pid}">Título ou tipo</label>
          <input class="med-form-input" type="text" id="exameTitulo_${pid}" placeholder="Ex.: Hemograma, Raio-X…" maxlength="120" />
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="exameOrigem_${pid}">Origem</label>
          <select class="med-form-select" id="exameOrigem_${pid}">
            <option value="clinica">Clínica / médico</option>
            <option value="paciente">Paciente (app ou recepção)</option>
          </select>
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="exameFile_${pid}">Arquivo</label>
          <input class="med-form-input" type="file" id="exameFile_${pid}" accept="image/*,application/pdf" />
        </div>
        <button type="button" class="btn-primary" onclick="adicionarExamePerfilPaciente(${pid})">Anexar à ficha</button>
      </div>
    </div>`;

  const rodape = opts.consulta
    ? '<div class="consulta-etapa-panel__actions" style="margin-top:14px"><button type="button" class="btn-outline consulta-etapa-voltar" onclick="irEtapaConsulta(' + pid + ',\'anotacao\')">← Voltar à consulta</button></div>'
    : '';

  return subBar +
    '<div class="panel" style="margin-bottom:14px">' +
    '<div class="panel-header"><div class="panel-title">Solicitações registradas (' + solicPac.length + ')</div></div>' +
    '<div style="padding:14px 16px 18px">' + rowsSolic + '</div></div>' +
    '<div class="panel">' +
    '<div class="panel-header"><div class="panel-title">Laudos na ficha (' + p.examesArquivos.length + ')</div></div>' +
    '<div style="padding:14px 16px 18px">' +
    (p.examesArquivos.length ? '<div class="exame-perfil-grid">' + cardsEx + '</div>' : '<div class="empty-state" style="padding:16px">Nenhum laudo anexado ainda.</div>') +
    '</div></div>' +
    uploadPanel + rodape;
}

function htmlConsultaEtapaPainel(p, etapa, escH) {
  const pid = p.id;
  const voltarBtn = `<button type="button" class="btn-outline consulta-etapa-voltar" onclick="irEtapaConsulta(${pid},'anotacao')">← Voltar à consulta</button>`;
  if (etapa === 'receita') {
    return `<div class="consulta-etapa-panel panel">
      <div class="panel-header"><div class="panel-title">Receita médica</div></div>
      <div class="consulta-etapa-panel__body">
        <p class="cad-pac-hint">Emita a receita sem encerrar o atendimento. Ao fechar o formulário, você volta a esta etapa.</p>
        <div class="consulta-etapa-panel__actions">
          <button type="button" class="btn-primary" onclick="abrirReceitaModal(${pid})">Abrir formulário de receita</button>
          ${voltarBtn}
        </div>
      </div>`;
  }
  if (etapa === 'atestado') {
    return `<div class="consulta-etapa-panel panel">
      <div class="panel-header"><div class="panel-title">Atestado médico</div></div>
      <div class="consulta-etapa-panel__body">
        <p class="cad-pac-hint">Gere o atestado durante a mesma consulta. A sessão só encerra em <strong>Finalizar consulta</strong>.</p>
        <div class="consulta-etapa-panel__actions">
          <button type="button" class="btn-primary" onclick="openAtestadoModal(${pid})">Abrir formulário de atestado</button>
          ${voltarBtn}
        </div>
      </div>`;
  }
  if (etapa === 'exames') {
    garantirModeloPaciente(p);
    return `<div class="consulta-etapa-panel">${htmlExamesPacienteView(p, { consulta: true })}</div>`;
  }
  return '';
}

function slotsAndamentoParaPacienteSessao(pacienteId) {
  const mid = sessaoMedicoId();
  return [...agendaHoje, ...agendaAmanha].filter(
    s => s.pacienteId === pacienteId && s.badge === 'andamento' && (mid == null || s.medicoId === mid),
  );
}

function finalizarConsultaPaciente(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p || !consultaFaseClinica(p)) {
    if (p && consultaEmTriagem(p)) {
      alert('Conclua a triagem antes de encerrar o atendimento clínico.');
      abrirModalTriagem(pacienteId, p.consultaSessao.agendaId);
    } else {
      alert('Nenhum atendimento clínico foi iniciado. Faça a triagem e salve para abrir o atendimento.');
    }
    return;
  }
  if (!confirm('Encerrar o atendimento clínico e registrar o tempo total no prontuário?')) return;
  const agora = new Date();
  const horaFim = horaConsultaLabel();
  if (p.consultaSessao.clinica) {
    p.consultaSessao.clinica.finalizadaEm = agora.toISOString();
    p.consultaSessao.clinica.finalizadaEmLabel = horaFim;
  }
  const inicio = p.consultaSessao.clinica && p.consultaSessao.clinica.iniciadaEm
    ? new Date(p.consultaSessao.clinica.iniciadaEm)
    : null;
  const duracaoMin = inicio ? Math.max(1, Math.round((Date.now() - inicio.getTime()) / 60000)) : null;
  const horaInicio = labelInicioConsulta(p);
  const mid = sessaoMedicoId();
  let entradas = painelAtendimentos.filter(x => x.pacienteId === pacienteId);
  if (mid != null) {
    entradas = entradas.filter(x => {
      if (x.medicoId != null) return x.medicoId === mid;
      const slot = x.agendaId != null ? encontrarSlotAgenda(x.agendaId) : null;
      return slot && slot.medicoId === mid;
    });
  }
  const slotsDiretos = slotsAndamentoParaPacienteSessao(pacienteId);
  if (entradas.length) {
    entradas.forEach(entry => {
      const slot = entry.agendaId != null ? encontrarSlotAgenda(entry.agendaId) : null;
      if (slot) slot.badge = 'realizado';
    });
    const idsRemover = new Set(entradas.map(e => e.id));
    painelAtendimentos = painelAtendimentos.filter(x => !idsRemover.has(x.id));
  } else if (slotsDiretos.length) {
    slotsDiretos.forEach(s => { s.badge = 'realizado'; });
  }
  garantirModeloPaciente(p);
  const tri = p.consultaSessao.triagem;
  registrarEventoConsulta(p, 'clinica_fim', `Atendimento clínico finalizado (${horaFim})`);
  p.consultaSessao = null;
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const durTxt = duracaoMin != null ? ` · duração clínica ${duracaoMin} min` : '';
  let triTxt = '';
  if (tri && tri.iniciadaEmLabel && tri.finalizadaEmLabel) {
    triTxt = ` · triagem ${tri.iniciadaEmLabel}–${tri.finalizadaEmLabel}`;
  }
  p.historico.unshift({
    data: dataHist,
    tipo: 'green',
    msg: `Atendimento encerrado · clínico ${horaInicio}–${horaFim}${durTxt}${triTxt} (demo).`,
  });
  if (consultaContextoPacienteId === pacienteId) {
    consultaContextoPacienteId = null;
    consultaRetornoPacienteId = null;
    consultaEtapaAtiva = 'anotacao';
  }
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    navigateTo(sessaoMedicoId() != null ? 'agenda' : 'painel');
    return;
  }
  renderSidebar();
  if (paginaAtiva === 'agenda') renderAgendaPage();
  if (paginaAtiva === 'painel') renderPainelPage();
  if (paginaAtiva === 'detalhe' && pacienteDetalheId === pacienteId) renderDetalhePage(pacienteId);
}

function setDetalheHistoricoSub(pacienteId, sub) {
  if (!['timeline', 'consultas', 'mensagens'].includes(sub)) return;
  detalheHistoricoSub = sub;
  renderDetalhePage(pacienteId);
}

function proximoIdAnotacaoConsulta(p) {
  garantirModeloPaciente(p);
  if (!p.anotacoesConsultas.length) return 1;
  return p.anotacoesConsultas.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
}

/** Campo Profissional na anotação: select só com login da clínica (admin); qualquer outro caso = médico da sessão (hidden). */
function htmlCampoProfissionalAnotacaoConsulta(escFn) {
  if (!sessaoEhClinica()) {
    let vid = sessaoMedicoId();
    if (vid == null) {
      const s = getSessao();
      if (s && s.medicoNome) {
        const mm = medicos.find(x => x.nome === s.medicoNome && x.ativo !== false);
        if (mm) vid = mm.id;
      }
    }
    if (vid == null) {
      const mm = medicos.find(x => x.nome === medico.nome && x.ativo !== false);
      if (mm) vid = mm.id;
    }
    const v = vid != null && Number.isFinite(Number(vid)) ? Number(vid) : '';
    return `<input type="hidden" id="anotacaoConsultaProfHidden" value="${v}" />`;
  }
  const opts = listaMedicosAtivos().map(m =>
    `<option value="${m.id}"${m.nome === medico.nome ? ' selected' : ''}>${escFn(m.nome)}</option>`,
  ).join('');
  return `<div class="atestado-field">
        <label for="anotacaoConsultaProf">Profissional</label>
        <select id="anotacaoConsultaProf" class="med-form-select">${opts}</select>
      </div>`;
}

function salvarAnotacaoConsulta(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  const ta = document.getElementById('novaAnotacaoConsultaTexto');
  const texto = (ta && ta.value ? ta.value : '').trim();
  if (!texto) {
    alert('Digite o texto da anotação clínica.');
    return;
  }
  garantirModeloPaciente(p);
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const profHid = document.getElementById('anotacaoConsultaProfHidden');
  const profSel = document.getElementById('anotacaoConsultaProf');
  let medicoNome = medico.nome;
  let medicoCrm = medico.crm;
  const idProf = profHid ? profHid.value : (profSel && profSel.value);
  if (idProf) {
    const pr = listaMedicosAtivos().find(x => String(x.id) === String(idProf))
      || medicos.find(x => String(x.id) === String(idProf));
    if (pr) {
      medicoNome = pr.nome;
      medicoCrm = pr.crm || medico.crm;
    }
  }
  p.anotacoesConsultas.unshift({
    id: proximoIdAnotacaoConsulta(p),
    data: dataHist,
    texto,
    medicoNome,
    medicoCrm,
  });
  p.historico.unshift({
    data: dataHist,
    tipo: 'green',
    msg: 'Anotação de consulta registrada no prontuário.',
  });
  if (p.consultaSessao && p.consultaSessao.ativa) registrarEventoConsulta(p, 'anotacao', 'Anotação clínica salva');
  if (ta) ta.value = '';
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pacienteId) {
    renderConsultaAtivaPage(pacienteId);
  } else {
    renderDetalhePage(pacienteId);
  }
}

function openAtestadoModal(pacienteId) {
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  atestadoPacienteId = pacienteId;
  renderAtestadoModalForm();
  document.getElementById('atestadoOverlay').classList.add('open');
}

function closeAtestadoModal() {
  const pid = atestadoPacienteId;
  const ov = document.getElementById('atestadoOverlay');
  if (ov) {
    ov.classList.remove('open');
    ov.classList.remove('modal-doc-somente-ficha');
  }
  atestadoPacienteId = null;
  if (pid != null && podeAbrirConsultaAtiva(pid)) {
    const p = pacientes.find(x => x.id === pid);
    if (p && p.consultaSessao) {
      consultaEtapaAtiva = 'atestado';
      p.consultaSessao.etapaAtual = 'atestado';
      if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pid) renderConsultaAtivaPage(pid);
    }
  }
}

function atestadoProfissionalAssinatura() {
  const hid = document.getElementById('atestadoProfSelectHidden');
  const sel = document.getElementById('atestadoProfSelect');
  const idVal = hid ? hid.value : (sel && sel.value);
  const fromLista = listaMedicosAtivos().find(x => String(x.id) === String(idVal));
  if (fromLista) return fromLista;
  const fromTodos = medicos.find(x => String(x.id) === String(idVal));
  if (fromTodos) return fromTodos;
  const mid = sessaoMedicoId();
  if (mid != null) {
    const m = medicos.find(x => x.id === mid);
    if (m) return m;
  }
  return medicos[0];
}

function renderAtestadoModalForm() {
  const p = pacientes.find(x => x.id === atestadoPacienteId);
  const root = document.getElementById('atestadoModalRoot');
  if (!p || !root) return;
  const hoje = new Date().toLocaleDateString('pt-BR');
  const midSess = sessaoMedicoId();
  const medLog = midSess != null ? medicos.find(x => x.id === midSess) : null;
  const optsProf = listaMedicosAtivos().map(m => {
    const sel = (midSess != null && m.id === midSess) || (midSess == null && m.nome === medico.nome);
    return `<option value="${m.id}"${sel ? ' selected' : ''}>${m.nome}  ${m.crm || ''}</option>`;
  }).join('');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const blocoProfissional = midSess != null
    ? `<div class="atestado-prof-bloco">
        <strong>Profissional (assinatura)</strong><br>
        <span>${medLog
      ? esc(`${medLog.nome} · ${medLog.crm || ''} · ${medLog.especialidade || ''}`)
      : 'Médico logado (perfil da sessão)'}</span><br>
        <span style="color:var(--muted);font-size:12px">${esc(dadosClinica.nome)}  ${esc(dadosClinica.cidade || '')}</span>
        <input type="hidden" id="atestadoProfSelectHidden" value="${medLog ? medLog.id : midSess}" />
      </div>`
    : `<div class="atestado-field">
        <label for="atestadoProfSelect">Profissional que assina</label>
        <select id="atestadoProfSelect" class="med-form-select">${optsProf}</select>
      </div>`;
  const hintProf = midSess != null
    ? 'Preencha o atestado. A assinatura será do médico logado nesta sessão.'
    : 'Preencha o atestado. Selecione o profissional que assina (acesso clínica).';
  root.innerHTML = `
    <div class="modal-header atestado-no-print">
      <div class="agenda-modal-title">Atestado médico</div>
      <button type="button" class="modal-close" onclick="closeAtestadoModal()" aria-label="Fechar"></button>
    </div>
    <div class="atestado-form">
      <p class="cad-pac-hint" style="margin-bottom:12px">${hintProf}</p>
      ${blocoProfissional}
      <div class="atestado-field">
        <label for="atestadoData">Data</label>
        <input type="text" id="atestadoData" value="${esc(hoje)}" />
      </div>
      <div class="atestado-field">
        <label for="atestadoPacienteNome">Paciente</label>
        <input type="text" id="atestadoPacienteNome" readonly value="${esc(p.nome)}" />
      </div>
      <div class="atestado-field">
        <label for="atestadoDias">Dias de afastamento (opcional)</label>
        <input type="number" id="atestadoDias" min="0" max="365" placeholder="Ex.: 3" />
      </div>
      <div class="atestado-field">
        <label for="atestadoCID">CID-10 (opcional)</label>
        <input type="text" id="atestadoCID" placeholder="Ex.: I10" maxlength="12" />
      </div>
      <div class="atestado-field">
        <label for="atestadoCorpo">Texto do atestado *</label>
        <textarea id="atestadoCorpo" required placeholder="Atesto para os devidos fins que o(a) paciente acima identificado(a) necessita de repouso / comparecimento médico…"></textarea>
        <button type="button" class="btn-outline" id="btnAtestadoIA" style="margin-top:8px;font-size:12px" onclick="gerarTextoAtestadoIA()" title="IA gera o texto com base no histórico do paciente">✨ Sugerir texto com IA</button>
      </div>
      <div class="atestado-preview" id="atestadoPreviewBox" style="display:none"></div>
    </div>
    <div class="med-form-footer atestado-no-print">
      <button type="button" class="btn-outline" onclick="closeAtestadoModal()">Fechar</button>
      <button type="button" class="btn-outline" onclick="gerarPreviewAtestado()">Pré-visualizar</button>
      <button type="button" class="btn-primary" onclick="imprimirAtestadoMedico()">Imprimir</button>
    </div>`;
}

function gerarPreviewAtestado() {
  const box = document.getElementById('atestadoPreviewBox');
  if (!box) return;
  box.style.display = 'block';
  box.innerHTML = montarHtmlAtestadoDocumento();
  const ov = document.getElementById('atestadoOverlay');
  if (ov) ov.classList.add('modal-doc-somente-ficha');
}

function montarHtmlAtestadoDocumento() {
  const p = pacientes.find(x => x.id === atestadoPacienteId);
  if (!p) return '';
  const m = atestadoProfissionalAssinatura();
  const data = (document.getElementById('atestadoData') && document.getElementById('atestadoData').value) || '';
  const dias = document.getElementById('atestadoDias') && document.getElementById('atestadoDias').value;
  const cid = (document.getElementById('atestadoCID') && document.getElementById('atestadoCID').value.trim()) || '';
  const corpo = (document.getElementById('atestadoCorpo') && document.getElementById('atestadoCorpo').value.trim()) || '';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  let extra = '';
  if (dias && Number(dias) > 0) extra += `<p><strong>Afastamento:</strong> ${esc(dias)} dia(s).</p>`;
  if (cid) extra += `<p><strong>CID-10:</strong> ${esc(cid)}</p>`;
  return `
    <div style="text-align:center;margin-bottom:16px">
      <strong style="font-size:15px">${esc(dadosClinica.nome)}</strong><br>
      <span style="font-size:12px;color:#64748b">${esc(dadosClinica.endereco || '')}</span>
    </div>
    <p style="text-align:center;font-weight:700;margin-bottom:16px">ATESTADO MÉDICO</p>
    <p><strong>Paciente:</strong> ${esc(p.nome)}</p>
    <p><strong>Data:</strong> ${esc(data)}</p>
    ${extra}
    <p style="margin-top:14px;line-height:1.6">${esc(corpo).replace(/\n/g, '<br>')}</p>
    <p style="margin-top:28px">${esc(m.nome)}<br><span style="font-size:13px">${esc(m.crm || '')} · ${esc(m.especialidade)}</span></p>`;
}

function imprimirAtestadoMedico() {
  const corpo = document.getElementById('atestadoCorpo');
  if (!corpo || !corpo.value.trim()) {
    alert('Preencha o texto do atestado antes de imprimir.');
    return;
  }
  gerarPreviewAtestado();
  imprimirDocumentoModal('atestadoOverlay', 'atestadoPreviewBox');
}

let receitaRowsState = [];

function abrirReceitaModal(pacienteId) {
  const permitidos = pacientesPermitidosIdsSessao();
  if (permitidos && !permitidos.has(pacienteId)) {
    alert('Nesta sessão você só emite receita para pacientes da sua agenda.');
    return;
  }
  const p = pacientes.find(x => x.id === pacienteId);
  if (!p) return;
  receitaPacienteId = pacienteId;
  receitaRowsState = [{ med: '', dos: '', freq: '', dias: 30, inst: '' }];
  renderReceitaModalForm();
  document.getElementById('receitaOverlay').classList.add('open');
}

function fecharReceitaModal() {
  const pid = receitaPacienteId;
  document.querySelectorAll('[id^="receitaMedSearchResults_"]').forEach(el => {
    el.innerHTML = '';
    el.classList.remove('open');
  });
  const rov = document.getElementById('receitaOverlay');
  if (rov) {
    rov.classList.remove('open');
    rov.classList.remove('receita-modal-mostrar-ficha');
    rov.classList.remove('modal-doc-somente-ficha');
  }
  receitaPacienteId = null;
  receitaRowsState = [];
  if (pid != null && podeAbrirConsultaAtiva(pid)) {
    const p = pacientes.find(x => x.id === pid);
    if (p && p.consultaSessao) {
      consultaEtapaAtiva = 'receita';
      p.consultaSessao.etapaAtual = 'receita';
      if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === pid) renderConsultaAtivaPage(pid);
    }
  }
}

function filterMedCatalogReceita(q, rowIdx) {
  const list = document.getElementById(`receitaMedSearchResults_${rowIdx}`);
  const input = document.getElementById(`receitaMed_${rowIdx}`);
  if (!list || !input) return;
  document.querySelectorAll('[id^="receitaMedSearchResults_"]').forEach(el => {
    if (el.id !== list.id) {
      el.innerHTML = '';
      el.classList.remove('open');
    }
  });
  const t = (q || '').trim().toLowerCase();
  if (!t) {
    list.innerHTML = '';
    list.classList.remove('open');
    return;
  }
  const hits = catalogoMedicamentos.filter(n => n.toLowerCase().includes(t)).slice(0, 8);
  if (!hits.length) {
    list.innerHTML = '<div class="med-form-hint" style="padding:10px 12px;margin:0">Nenhum resultado. Continue digitando ou use o nome livre.</div>';
    list.classList.add('open');
    return;
  }
  list.innerHTML = hits.map(nome => {
    const catIdx = catalogoMedicamentos.indexOf(nome);
    return `<button type="button" class="med-search-item" onmousedown="event.preventDefault();selectMedReceitaCatalog(${catIdx},${rowIdx})">${nome}</button>`;
  }).join('');
  list.classList.add('open');
}

function selectMedReceitaCatalog(catalogIdx, rowIdx) {
  const nome = catalogoMedicamentos[catalogIdx];
  if (!nome || !receitaRowsState[rowIdx]) return;
  receitaRowsState[rowIdx].med = nome;
  const input = document.getElementById(`receitaMed_${rowIdx}`);
  if (input) input.value = nome;
  const list = document.getElementById(`receitaMedSearchResults_${rowIdx}`);
  if (list) {
    list.innerHTML = '';
    list.classList.remove('open');
  }
}

function receitaMedInputBlur(rowIdx) {
  setTimeout(() => {
    const list = document.getElementById(`receitaMedSearchResults_${rowIdx}`);
    if (list) {
      list.innerHTML = '';
      list.classList.remove('open');
    }
  }, 280);
}

function receitaProfissionalAssinatura() {
  const hid = document.getElementById('receitaProfSelectHidden');
  const sel = document.getElementById('receitaProfSelect');
  const idVal = hid ? hid.value : (sel && sel.value);
  const fromLista = listaMedicosAtivos().find(x => String(x.id) === String(idVal));
  if (fromLista) return fromLista;
  const fromTodos = medicos.find(x => String(x.id) === String(idVal));
  if (fromTodos) return fromTodos;
  return medicos[0];
}

function registrarReceitaNoProntuario() {
  sincronizarReceitaRowsDoDom();
  if (!receitaRowsState.some(r => r.med && String(r.med).trim())) {
    alert('Informe ao menos um medicamento antes de registrar.');
    return;
  }
  const p = pacientes.find(x => x.id === receitaPacienteId);
  if (!p) return;
  const m = receitaProfissionalAssinatura();
  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const resumo = receitaRowsState
    .filter(r => r.med && String(r.med).trim())
    .map(r => {
      let s = r.med.trim();
      if (r.dos) s += ` (${r.dos})`;
      if (r.freq) s += ` · ${r.freq}`;
      if (r.dias) s += ` · ${r.dias} dias`;
      return s;
    })
    .join('; ');
  garantirModeloPaciente(p);
  p.historico.unshift({
    data: dataHist,
    tipo: 'green',
    msg: `Receita médica registrada por ${m.nome}: ${resumo}.`,
  });
  if (p.consultaSessao && p.consultaSessao.ativa) registrarEventoConsulta(p, 'receita', 'Receita registrada no prontuário');
  if (paginaAtiva === 'detalhe' && pacienteDetalheId === p.id) renderDetalhePage(p.id);
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId === p.id) renderConsultaAtivaPage(p.id);
  alert('Receita registrada na linha do tempo do paciente (demonstração).');
}

function receitaAdicionarMedicamento() {
  receitaRowsState.push({ med: '', dos: '', freq: '', dias: 30, inst: '' });
  renderReceitaModalForm();
}

function receitaRemoverMedicamento(idx) {
  if (receitaRowsState.length <= 1) return;
  receitaRowsState.splice(idx, 1);
  renderReceitaModalForm();
}

function renderReceitaModalForm() {
  const p = pacientes.find(x => x.id === receitaPacienteId);
  const root = document.getElementById('receitaModalRoot');
  if (!p || !root) return;
  const rov = document.getElementById('receitaOverlay');
  if (rov) rov.classList.remove('receita-modal-mostrar-ficha');
  const hoje = new Date().toLocaleDateString('pt-BR');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const midSess = sessaoMedicoId();
  const medLog = midSess != null ? medicos.find(x => x.id === midSess) : null;
  const optsProfSel = listaMedicosAtivos().map(m => {
    const sel = (midSess != null && m.id === midSess) || (midSess == null && m.nome === medico.nome);
    return `<option value="${m.id}"${sel ? ' selected' : ''}>${esc(m.nome)}  ${esc(m.crm || '')}</option>`;
  }).join('');
  const blocoProfissional = midSess != null
    ? `<div class="atestado-field">
        <label>Profissional (assinatura)</label>
        <p class="cad-pac-hint" style="margin:0;font-size:13px;line-height:1.45">
          ${medLog
      ? `<strong>${esc(medLog.nome)}</strong>  ${esc(medLog.crm || '')} · ${esc(medLog.especialidade || '')}`
      : '<strong>Médico logado</strong> (perfil da sessão)'}
        </p>
        <input type="hidden" id="receitaProfSelectHidden" value="${medLog ? medLog.id : midSess}" />
      </div>`
    : `<div class="atestado-field">
        <label for="receitaProfSelect">Profissional (assinatura)</label>
        <select id="receitaProfSelect" class="med-form-select">${optsProfSel}</select>
      </div>`;
  const dosOpts = dosagensCatalogoOpts;
  const freqOpts = frequenciasCatalogoOpts;
  const rowsHtml = receitaRowsState.map((row, idx) => `
    <div class="receita-med-bloco" data-receita-idx="${idx}">
      <div class="receita-med-head">
        <strong>Medicamento ${idx + 1}</strong>
        ${receitaRowsState.length > 1 ? `<button type="button" class="btn-link receita-remove-btn" onclick="receitaRemoverMedicamento(${idx})">Remover</button>` : ''}
      </div>
      <div class="atestado-field">
        <label>Medicamento</label>
        <p class="med-form-hint" style="margin:0 0 6px;font-size:12px">Digite para buscar no catálogo ou informe o nome manualmente.</p>
        <div class="med-search-wrap">
          <input type="text" class="med-form-input" id="receitaMed_${idx}" autocomplete="off" value="${esc(row.med)}"
            placeholder="Ex.: Losartana, Metformina"
            oninput="receitaRowsState[${idx}].med=this.value;filterMedCatalogReceita(this.value,${idx})"
            onfocus="filterMedCatalogReceita(this.value,${idx})"
            onblur="receitaMedInputBlur(${idx})" />
          <div id="receitaMedSearchResults_${idx}" class="med-search-results"></div>
        </div>
      </div>
      <div class="atestado-field" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label>Dosagem</label>
          <select class="med-form-select" id="receitaDos_${idx}" onchange="receitaRowsState[${idx}].dos=this.value">
            <option value="">Selecione</option>
            ${dosOpts.filter(Boolean).map(o => `<option value="${esc(o)}"${row.dos === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Frequência</label>
          <select class="med-form-select" id="receitaFreq_${idx}" onchange="receitaRowsState[${idx}].freq=this.value">
            <option value="">Selecione</option>
            ${freqOpts.filter(Boolean).map(o => `<option value="${esc(o)}"${row.freq === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="atestado-field" style="display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:end">
        <div>
          <label>Duração (dias)</label>
          <input type="number" class="med-form-input" id="receitaDias_${idx}" min="1" max="365" value="${Number(row.dias) || 30}" onchange="receitaRowsState[${idx}].dias=parseInt(this.value,10)||30" />
        </div>
        <div>
          <label>Instruções</label>
          <input type="text" class="med-form-input" id="receitaInst_${idx}" value="${esc(row.inst)}" placeholder="Ex.: após as refeições" onchange="receitaRowsState[${idx}].inst=this.value" />
        </div>
      </div>
    </div>`).join('');

  root.innerHTML = `
    <div class="modal-header atestado-no-print">
      <div class="agenda-modal-title">Receita médica</div>
      <button type="button" class="modal-close" onclick="fecharReceitaModal()" aria-label="Fechar"></button>
    </div>
    <div class="atestado-form">
      <div class="receita-form-editor atestado-no-print">
      ${midSess != null ? '<p class="cad-pac-hint" style="margin:0 0 12px;font-size:12px">Você está emitindo como <strong>médico logado</strong>. A assinatura da receita é sempre a sua.</p>' : ''}
      ${blocoProfissional}
      <div class="atestado-field">
        <label for="receitaPacienteNome">Paciente</label>
        <input type="text" id="receitaPacienteNome" readonly value="${esc(p.nome)}" />
      </div>
      <div class="atestado-field">
        <label for="receitaData">Data</label>
        <input type="text" id="receitaData" value="${esc(hoje)}" />
      </div>
      <div class="receita-meds-wrap">${rowsHtml}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button type="button" class="btn-outline atestado-no-print" onclick="receitaAdicionarMedicamento()">+ Adicionar medicamento</button>
        <button type="button" class="btn-outline atestado-no-print" id="btnReceitaIA" onclick="sugerirReceitaIA()" title="IA sugere medicações com base no histórico do paciente">✨ Sugerir medicações com IA</button>
      </div>
      <div class="atestado-field">
        <label for="receitaObsGeral">Observações gerais</label>
        <textarea id="receitaObsGeral" rows="2" placeholder="Orientações adicionais"></textarea>
      </div>
      </div>
      <div class="atestado-preview modal-receita-doc receita-doc-impressao" id="receitaPreviewBox" style="display:none"></div>
    </div>
    <div class="med-form-footer atestado-no-print">
      <button type="button" class="btn-outline" onclick="fecharReceitaModal()">Cancelar</button>
      <button type="button" class="btn-outline" id="receitaBtnVoltarEdicao" style="display:none" onclick="receitaVoltarEdicao()">Voltar a editar</button>
      <button type="button" class="btn-outline" onclick="gerarPreviewReceita()">Pré-visualizar</button>
      <button type="button" class="btn-outline" onclick="registrarReceitaNoProntuario()">Registrar na ficha</button>
      <button type="button" class="btn-primary" onclick="imprimirReceita()">Imprimir</button>
    </div>`;
}

function sincronizarReceitaRowsDoDom() {
  receitaRowsState.forEach((row, idx) => {
    const m = document.getElementById(`receitaMed_${idx}`);
    const d = document.getElementById(`receitaDos_${idx}`);
    const f = document.getElementById(`receitaFreq_${idx}`);
    const di = document.getElementById(`receitaDias_${idx}`);
    const ins = document.getElementById(`receitaInst_${idx}`);
    if (m) row.med = m.value.trim();
    if (d) row.dos = d.value;
    if (f) row.freq = f.value;
    if (di) row.dias = parseInt(di.value, 10) || 30;
    if (ins) row.inst = ins.value.trim();
  });
}

function montarHtmlReceitaDocumento() {
  sincronizarReceitaRowsDoDom();
  const p = pacientes.find(x => x.id === receitaPacienteId);
  if (!p) return '';
  const m = receitaProfissionalAssinatura();
  const data = (document.getElementById('receitaData') && document.getElementById('receitaData').value) || '';
  const obs = (document.getElementById('receitaObsGeral') && document.getElementById('receitaObsGeral').value.trim()) || '';
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const itens = receitaRowsState
    .filter(r => r.med)
    .map((r, i) => `
      <p style="margin-top:12px"><strong>${i + 1}.</strong> ${esc(r.med)}${r.dos ? `  <em>${esc(r.dos)}</em>` : ''}</p>
      <p style="margin-left:12px;font-size:13px;line-height:1.5">
        ${r.freq ? `${esc(r.freq)} · ` : ''}${r.dias ? `${esc(String(r.dias))} dias` : ''}
        ${r.inst ? `<br>Instruções: ${esc(r.inst)}` : ''}
      </p>`)
    .join('');
  if (!itens.trim()) return '<p>Preencha ao menos um medicamento.</p>';
  return `
    <div style="text-align:center;margin-bottom:16px">
      <strong style="font-size:15px">${esc(dadosClinica.nome)}</strong><br>
      <span style="font-size:12px;color:#64748b">${esc(dadosClinica.endereco)} · Tel. ${esc(dadosClinica.telefone)}</span>
    </div>
    <p style="text-align:center;font-weight:700;margin-bottom:16px">RECEITA MÉDICA</p>
    <p><strong>Paciente:</strong> ${esc(p.nome)} &nbsp;&nbsp; <strong>Data:</strong> ${esc(data)}</p>
    <hr style="margin:16px 0;border:none;border-top:1px solid #ccc" />
    ${itens}
    <hr style="margin:16px 0;border:none;border-top:1px solid #ccc" />
    ${obs ? `<p><strong>Observações:</strong> ${esc(obs).replace(/\n/g, '<br>')}</p>` : ''}
    <p style="margin-top:28px">${esc(dadosClinica.cidade)}, ${esc(data)}</p>
    <p style="margin-top:36px;border-top:1px solid #333;padding-top:8px;max-width:320px">
      ${esc(m.nome)}<br>
      <span style="font-size:13px">${esc(m.crm || '')} · ${esc(m.especialidade)}</span>
    </p>
    <p style="margin-top:20px;font-size:11px;color:#64748b">Válida por 6 meses  Art. 35 da Lei 5.991/73</p>`;
}

function gerarPreviewReceita() {
  sincronizarReceitaRowsDoDom();
  const box = document.getElementById('receitaPreviewBox');
  if (!box) return;
  box.style.display = 'block';
  box.innerHTML = montarHtmlReceitaDocumento();
  const rov = document.getElementById('receitaOverlay');
  if (rov) {
    rov.classList.add('receita-modal-mostrar-ficha');
    rov.classList.add('modal-doc-somente-ficha');
  }
  const vb = document.getElementById('receitaBtnVoltarEdicao');
  if (vb) vb.style.display = '';
}

function receitaVoltarEdicao() {
  const rov = document.getElementById('receitaOverlay');
  if (rov) {
    rov.classList.remove('receita-modal-mostrar-ficha');
    rov.classList.remove('modal-doc-somente-ficha');
  }
  const box = document.getElementById('receitaPreviewBox');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
  const vb = document.getElementById('receitaBtnVoltarEdicao');
  if (vb) vb.style.display = 'none';
}

/** Impressão de documentos no modal: só #previewId (atestado, receita). */
function modalDocumentoOcultarEditor(overlayId, previewId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.add('modal-doc-somente-ficha');
  overlay.querySelectorAll('.atestado-form > *').forEach(el => {
    if (el.id === previewId) return;
    el.setAttribute('data-print-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
  });
}

function modalDocumentoRestaurarEditor(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.remove('modal-doc-somente-ficha');
  overlay.querySelectorAll('[data-print-hidden]').forEach(el => {
    el.removeAttribute('data-print-hidden');
    el.style.removeProperty('display');
  });
}

function imprimirDocumentoModal(overlayId, previewId) {
  const preview = document.getElementById(previewId);
  if (!preview || !preview.innerHTML.trim()) return;
  modalDocumentoOcultarEditor(overlayId, previewId);
  let restored = false;
  const cleanup = () => {
    if (restored) return;
    restored = true;
    modalDocumentoRestaurarEditor(overlayId);
    window.removeEventListener('afterprint', cleanup);
    mq.removeEventListener('change', onMql);
  };
  const mq = window.matchMedia('print');
  const onMql = () => {
    if (!mq.matches) cleanup();
  };
  mq.addEventListener('change', onMql);
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
}

function imprimirReceita() {
  sincronizarReceitaRowsDoDom();
  if (!receitaRowsState.some(r => r.med && String(r.med).trim())) {
    alert('Informe ao menos um medicamento.');
    return;
  }
  gerarPreviewReceita();
  imprimirDocumentoModal('receitaOverlay', 'receitaPreviewBox');
}

function abrirConsultaAtiva(pacienteId) {
  iniciarConsultaPaciente(pacienteId);
}

function voltarDeConsultaAtiva() {
  if (sessaoMedicoId() != null) navigateTo('agenda');
  else navigateTo('painel');
}

function renderConsultaAtivaPage(pacienteId) {
  const root = document.getElementById('consultaAtivaPage');
  if (!root) return;
  const p = pacientes.find(x => x.id === pacienteId);
  if (!consultaSessaoIniciada(p)) {
    root.innerHTML = `
      <div class="paciente-contexto-topo">
        <div class="patient-detail-bar">
          <button type="button" class="back-btn" onclick="voltarDeConsultaAtiva()">← Voltar</button>
        </div>
      </div>
      <div class="panel" style="padding:20px;text-align:center">
        <p class="cad-pac-hint">Nenhum atendimento iniciado. Comece pela triagem na agenda.</p>
        <button type="button" class="btn-primary" style="margin-top:14px" onclick="iniciarConsultaPaciente(${pacienteId})" title="Abre triagem e, ao salvar, o atendimento clínico">Iniciar triagem</button>
        <button type="button" class="btn-outline" style="margin-top:8px;margin-left:8px" onclick="openDetalhe(${pacienteId})" title="Somente análise da ficha">Analisar ficha</button>
      </div>
    `;
    return;
  }
  if (consultaEmTriagem(p)) {
    const agId = p.consultaSessao.agendaId != null ? p.consultaSessao.agendaId : 'null';
    root.innerHTML = `
      ${htmlPacienteCabecalhoPadrao(p, {
        esc: t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
        voltarOnclick: 'voltarDeConsultaAtiva()',
        voltarLabel: sessaoMedicoId() != null ? '← Agenda' : '← Painel',
        showSideActions: false,
      })}
      ${htmlBlocoConsultaAtiva(p)}
      <div class="panel" style="padding:20px;text-align:center;margin-top:14px">
        <p class="cad-pac-hint">Conclua a triagem para abrir anotação, receita e exames.</p>
        <button type="button" class="btn-primary" style="margin-top:12px" onclick="abrirModalTriagem(${pacienteId},${agId})">Abrir formulário de triagem</button>
      </div>`;
    return;
  }
  garantirModeloPaciente(p);
  consultaContextoPacienteId = pacienteId;
  const etapa = etapaFluxoConsultaAtual(pacienteId);
  const escH = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const voltarLabel = sessaoMedicoId() != null ? '← Agenda' : '← Painel';
  const ult3 = p.anotacoesConsultas.slice(0, 3);
  const hist3 = ult3.length
    ? ult3.map(a => `
        <div class="hist-consulta-item painel-consulta-hist-item">
          <div class="hist-consulta-data">${escH(a.data)}</div>
          <div class="hist-consulta-medico">${escH(a.medicoNome || '—')} · ${escH(a.medicoCrm || '')}</div>
          <div class="hist-consulta-texto">${escH(a.texto)}</div>
        </div>`).join('')
    : '<p class="cad-pac-hint" style="margin:0">Nenhuma anotação anterior nesta ficha.</p>';

  root.innerHTML = `
    ${htmlPacienteCabecalhoPadrao(p, {
      esc: escH,
      voltarOnclick: 'voltarDeConsultaAtiva()',
      voltarLabel: voltarLabel,
      showSideActions: false,
    })}
    ${htmlBlocoConsultaAtiva(p)}
    ${etapa !== 'anotacao' ? htmlConsultaEtapaPainel(p, etapa, escH) : `
    <div class="painel-consulta-grid">
      <div class="painel-consulta-col">
        <div class="panel" style="margin-bottom:14px">
          <div class="panel-header"><div class="panel-title">Sinais vitais</div><span style="font-size:11px;color:var(--muted);font-weight:400">Aferidos na triagem</span></div>
          <div style="padding:12px 16px 14px;display:flex;flex-wrap:wrap;gap:8px">
            <span class="triagem-obs-chip" style="${p.paColor === 'red' ? 'background:var(--red-light);border-color:#fca5a5;color:var(--red)' : p.paColor === 'amber' ? 'background:var(--amber-light);border-color:#fcd34d;color:var(--amber)' : ''}">PA: ${escH(p.pressao)}</span>
            <span class="triagem-obs-chip">FC: ${escH(p.fc || '—')}</span>
            <span class="triagem-obs-chip" style="${(() => { const v = parseFloat((p.glicemia||'').replace(/[^\d.]/g,'')); return v > 140 ? 'background:var(--red-light);border-color:#fca5a5;color:var(--red)' : ''; })()}">Glicemia: ${escH(p.glicemia || '—')}</span>
            <span class="triagem-obs-chip" style="${(() => { const v = parseFloat((p.saturacao||'').replace(/[^\d.]/g,'')); return v < 95 ? 'background:var(--red-light);border-color:#fca5a5;color:var(--red)' : ''; })()}">SpO₂: ${escH(p.saturacao || '—')}</span>
            ${p.temperatura ? `<span class="triagem-obs-chip">Temp: ${escH(p.temperatura)}</span>` : ''}
          </div>
        </div>
        ${(() => {
          const tri = p.consultaSessao && p.consultaSessao.triagem;
          const d = tri && tri.dados;
          if (!d || (!d.sintomas && !d.pressao)) return '';
          const horaLabel = tri.iniciadaEmLabel ? `${tri.iniciadaEmLabel}${tri.finalizadaEmLabel ? '–' + tri.finalizadaEmLabel : ''}` : '';
          return `<div class="panel" style="margin-bottom:14px">
            <div class="panel-header">
              <div class="panel-title">📋 Observações da triagem</div>
              ${horaLabel ? `<span style="font-size:11px;color:var(--muted);font-weight:400">${escH(horaLabel)}</span>` : ''}
            </div>
            <div style="padding:12px 16px 16px;display:flex;flex-direction:column;gap:10px">
              ${d.sintomas ? `
                <div>
                  <div style="font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Sintomas relatados</div>
                  <div style="font-size:13px;line-height:1.6;color:var(--text);background:var(--bg);border-radius:8px;padding:10px 12px;border:1px solid var(--border)">${escH(d.sintomas)}</div>
                </div>` : '<div style="font-size:13px;color:var(--muted)">Nenhum sintoma registrado na triagem.</div>'}
            </div>
          </div>`;
        })()}
        <div class="panel">
          <div class="panel-header"><div class="panel-title">Últimas anotações</div></div>
          <div style="padding:12px 16px 16px">${hist3}</div>
        </div>
      </div>
      <div class="painel-consulta-col">
        <div class="panel painel-consulta-anotacao-panel">
          <div class="panel-header"><div class="panel-title">Anotação desta consulta</div></div>
          <div class="painel-consulta-anotacao-body">
            ${htmlCampoProfissionalAnotacaoConsulta(escH)}
            <div class="painel-consulta-anotacao-field">
              <div class="textarea-label-row">
                <label class="med-form-label" for="novaAnotacaoConsultaTexto">Texto clínico</label>
                ${htmlMicBtn('novaAnotacaoConsultaTexto', 'micBtnAnotacaoConsulta')}
              </div>
              <textarea id="novaAnotacaoConsultaTexto" class="painel-consulta-textarea" rows="10" placeholder="Queixa, exame físico, hipótese, conduta…"></textarea>
            </div>
            <div class="painel-consulta-anotacao-foot">
              <button type="button" class="btn-outline" id="btnSoapIA_${p.id}" onclick="organizarSOAP(${p.id})" title="A IA reorganiza o texto no formato SOAP — Subjetivo, Objetivo, Avaliação, Plano">✨ Organizar em SOAP</button>
              <button type="button" class="btn-primary" onclick="salvarAnotacaoConsulta(${p.id})">Salvar anotação</button>
            </div>
          </div>
        </div>
      </div>
    </div>`}`;
}

function renderPainelPage() {
  ensurePainelSeedFromAgenda();
  const root = document.getElementById('painelPage');
  if (!root) return;

  const vis = painelEntradasVisiveis();
  const cards = vis.length
    ? vis.map(entry => {
        const p = pacientes.find(x => x.id === entry.pacienteId);
        if (!p) return '';
        return `
          <div class="painel-atend-card">
            ${patientAvatarHtml(p, 44, 14)}
            <div class="painel-atend-main">
              <div class="painel-atend-name">${p.nome}</div>
              <div class="painel-atend-meta">
                Horário agenda: <strong>${entry.hora}</strong> · ${entry.medico || ''}<br>
                ${entry.tipo || ''}
              </div>
            </div>
            <div class="painel-atend-actions">
              <button type="button" class="btn-primary" onclick="abrirConsultaAtiva(${p.id})" title="Inicia ou retoma o atendimento clínico">Iniciar / retomar atendimento</button>
              <button type="button" class="btn-outline" onclick="openDetalhe(${p.id})" title="Ver ficha sem iniciar atendimento">Analisar ficha</button>
              <button type="button" class="btn-outline" onclick="openAtestadoModal(${p.id})" title="Emitir atestado">Atestado</button>
              <button type="button" class="btn-outline" onclick="finalizarConsultaPaciente(${p.id})" title="Encerra e registra o tempo">Encerrar atendimento</button>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty-state" style="padding:28px">Ninguém no painel agora. Use <strong>Iniciar atendimento</strong> na agenda ou aguarde a sincronização da fila (demo).</div>';

  root.innerHTML = `
    <p class="painel-intro">
      Pacientes na fila de atendimento. Use <strong>Iniciar / retomar atendimento</strong> para registrar a consulta (anotação, receita, exames).
      <strong>Analisar ficha</strong> apenas visualiza dados. Ao <strong>encerrar</strong>, registra o tempo e marca o horário como realizado (demo).
    </p>
    <div class="panel agenda-main-panel dash-queue-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">Em atendimento agora (${vis.length})</div>
          <div class="dash-queue-hint">Integrado à <strong>Agenda</strong> · mesma experiência no fluxo consultório ? prontuário.</div>
        </div>
        <button type="button" class="btn-outline" onclick="navigateTo('agenda')">Ir à agenda</button>
      </div>
      ${cards}
    </div>`;
}

/* -- AGENDA PAGE -- */
function setAgendaPageFiltro(f) {
  if (!['todos', 'hoje', 'amanha', 'andamento'].includes(f)) return;
  agendaPageFiltro = f;
  renderAgendaPage();
}

function htmlAgendaBtnContinuar(c) {
  if (!c.pacienteId) return '';
  const p = pacientes.find(x => x.id === c.pacienteId);
  const btnCls = 'agenda-action-btn agenda-action-btn--em-atendimento';
  if (p && consultaFaseClinica(p)) {
    return `<button type="button" class="${btnCls}" onclick="event.stopPropagation();navigateTo('consulta',${c.pacienteId})" title="Retomar atendimento clínico">Continuar atendimento</button>`;
  }
  if (p && consultaEmTriagem(p)) {
    return `<button type="button" class="${btnCls}" onclick="event.stopPropagation();abrirModalTriagem(${c.pacienteId},${c.id})" title="Concluir triagem e abrir atendimento">Continuar triagem</button>`;
  }
  return `<button type="button" class="${btnCls}" onclick="event.stopPropagation();abrirModalTriagem(${c.pacienteId},${c.id})" title="Triagem e atendimento clínico">Triagem / atendimento</button>`;
}

function agendaCardHtml(c) {
  const badgeLabel = { realizado:'Realizado', andamento:'Em andamento', agendado:'Agendado' };
  const pac = (c.pacienteId && pacientes.find(x => x.id === c.pacienteId)) || pacientes.find(x => x.nome === c.paciente);
  const badge = `<span class="agenda-card-badge ${c.badge}">${badgeLabel[c.badge] || c.badge}</span>`;
  const appChip = c.syncApp !== false ? '<span class="agenda-inline-app">?? App</span>' : '';
  const meta = `${c.medico || medico.nome} · ${c.tipo}`;
  const rowOpen = pac ? `onclick="openDetalhe(${pac.id})"` : '';
  const avatarEl = pac ? patientAvatarHtml(pac, 36, 12) : '';
  const verBtn = pac
    ? `<button type="button" class="action-btn" onclick="event.stopPropagation();openDetalhe(${pac.id})">Perfil</button>`
    : '';
  const noPainel = c.pacienteId && !painelJaTemAgendaId(c.id);
  const ocultarFilaPainel = sessaoMedicoId() != null;
  const consultaBtn = htmlAgendaBtnContinuar(c);
  let acoesAgenda = '';
  if (!licencaConsultaAtiva()) {
    // Módulo Consulta inativo: agenda só exibe "Ver perfil"
    acoesAgenda = '';
  } else if (c.badge === 'agendado' && c.pacienteId) {
    acoesAgenda = `<button type="button" class="agenda-action-btn agenda-action-btn--primary" onclick="event.stopPropagation();iniciarAtendimentoDesdeAgenda(${c.id})">Iniciar atendimento</button>`;
  } else if (c.badge === 'andamento' && c.pacienteId) {
    if (ocultarFilaPainel) {
      acoesAgenda = consultaBtn;
    } else if (noPainel) {
      acoesAgenda = `<button type="button" class="agenda-action-btn" onclick="event.stopPropagation();adicionarAoPainelDesdeAgendaById(${c.id})">Incluir no painel</button>${consultaBtn}`;
    } else {
      acoesAgenda = `<span class="agenda-action-btn muted">No painel</span>${consultaBtn}`;
    }
  }
  return `
    <div class="dash-queue-item${c.badge === 'andamento' ? ' dash-queue-item--andamento' : ''}" ${rowOpen}>
      <div class="agenda-row-time">${c.hora}</div>
      ${avatarEl}
      <div class="dash-queue-main">
        <div class="dash-queue-line">
          <span class="dash-queue-name">${c.paciente}</span>
          ${badge}
          <span class="dash-queue-meta-text">${meta}</span>
          ${appChip}
        </div>
      </div>
      <div class="dash-queue-actions">${acoesAgenda}${verBtn}</div>
    </div>`;
}

function renderAgendaPage() {
  ensurePainelSeedFromAgenda();
  const hoje = filtrarSlotsAgenda([...agendaHoje].sort((a, b) => a.hora.localeCompare(b.hora)));
  const amanha = filtrarSlotsAgenda([...agendaAmanha].sort((a, b) => a.hora.localeCompare(b.hora)));
  const futurosRaw = filtrarSlotsAgenda([...agendaFutura]);
  const futurosPorData = {};
  futurosRaw.forEach(s => {
    const k = s.dataIso || isoAmanha();
    (futurosPorData[k] ||= []).push(s);
  });
  const realizadas = hoje.filter(c => c.badge === 'realizado').length;
  const andamentoN = hoje.filter(c => c.badge === 'andamento').length;
  const totalLista = hoje.length + amanha.length + futurosRaw.length;

  const hojeFiltrado = agendaPageFiltro === 'andamento'
    ? hoje.filter(c => c.badge === 'andamento')
    : hoje;

  const showBlocoHoje = agendaPageFiltro === 'todos' || agendaPageFiltro === 'hoje' || agendaPageFiltro === 'andamento';
  const showBlocoAmanha = agendaPageFiltro === 'todos' || agendaPageFiltro === 'amanha';

  const fa = f => (agendaPageFiltro === f ? 'filter-active' : '');

  const labelHoje = agendaPageFiltro === 'andamento'
    ? `Em andamento  ${dateString()}`
    : `Hoje  ${dateString()}`;

  const blocoHoje = showBlocoHoje
    ? `<div class="agenda-day-section">
        <div class="agenda-day-label">${labelHoje}</div>
        <div class="dash-queue-list">
          ${hojeFiltrado.length
            ? hojeFiltrado.map(agendaCardHtml).join('')
            : `<div class="empty-state" style="padding:20px">${agendaPageFiltro === 'andamento' ? 'Nenhuma consulta em andamento neste momento.' : 'Nenhum horário para hoje.'}</div>`}
        </div>
      </div>`
    : '';

  const blocoAmanha = showBlocoAmanha
    ? `<div class="agenda-day-section">
        <div class="agenda-day-label">Amanhã  ${dateStringOffset(1)}</div>
        <div class="dash-queue-list">
          ${amanha.length
            ? amanha.map(agendaCardHtml).join('')
            : '<div class="empty-state" style="padding:20px">Nenhum horário para amanhã.</div>'}
        </div>
      </div>`
    : '';

  const blocoFuturos = agendaPageFiltro === 'todos' && Object.keys(futurosPorData).length
    ? Object.keys(futurosPorData).sort().map(dataIso => {
        const slots = futurosPorData[dataIso].sort((a, b) => a.hora.localeCompare(b.hora));
        return `<div class="agenda-day-section">
          <div class="agenda-day-label">${formatAgendaDataIso(dataIso)}</div>
          <div class="dash-queue-list">${slots.map(agendaCardHtml).join('')}</div>
        </div>`;
      }).join('')
    : '';

  const hintAgenda = sessaoMedicoId() != null
    ? 'Lista em linhas como a <strong>fila do dia</strong>. <strong>Iniciar atendimento</strong> abre a <strong>triagem</strong> (sinais vitais e sintomas); ao salvar, inicia o atendimento clínico.'
    : 'Lista em linhas como a <strong>fila do dia</strong>. <strong>Iniciar atendimento</strong> abre a triagem e, ao salvar, o atendimento clínico.';
  document.getElementById('agendaPage').innerHTML = `
    <div class="agenda-sync-banner">
      <span class="agenda-sync-icon">??</span>
      <div>
        <strong>Mesma agenda no celular do paciente.</strong>
        O que você agenda aqui (ou pelo perfil) reflete no app TeepSaude do paciente: lembretes, confirmação e aviso de alterações  quando a sincronização estiver ligada no ambiente real.
      </div>
    </div>
    <div class="metrics-row metrics-row--agenda">
      <button type="button" class="metric-card ${fa('todos')}" data-agenda-filter="todos">
        <div class="metric-accent" style="background:var(--green)"></div>
        <div class="metric-label">Ver tudo</div>
        <div class="metric-value">${totalLista}</div>
        <div class="metric-sub">Hoje + amanhã</div>
      </button>
      <button type="button" class="metric-card ${fa('hoje')}" data-agenda-filter="hoje">
        <div class="metric-accent" style="background:var(--purple)"></div>
        <div class="metric-label">Hoje</div>
        <div class="metric-value">${hoje.length}</div>
        <div class="metric-sub">${realizadas} realizadas</div>
      </button>
      <button type="button" class="metric-card ${fa('amanha')}" data-agenda-filter="amanha">
        <div class="metric-accent" style="background:var(--blue)"></div>
        <div class="metric-label">Amanhã</div>
        <div class="metric-value">${amanha.length}</div>
        <div class="metric-sub">Pré-agendadas</div>
      </button>
      <button type="button" class="metric-card ${fa('andamento')}" data-agenda-filter="andamento">
        <div class="metric-accent" style="background:var(--green)"></div>
        <div class="metric-label">Em andamento</div>
        <div class="metric-value" style="color:var(--green)">${andamentoN}</div>
        <div class="metric-sub">Agora (hoje)</div>
      </button>
    </div>
    <div class="panel agenda-main-panel dash-queue-panel">
      <div class="panel-header">
        <div>
          <div class="panel-title">${sessaoMedicoId() != null ? 'Minha agenda' : 'Agenda da clínica'}</div>
          <div class="dash-queue-hint">${hintAgenda}</div>
        </div>
        <button type="button" class="btn-primary" onclick="openAgendaModal()">+ Novo agendamento</button>
      </div>
      ${blocoHoje}${blocoAmanha}${blocoFuturos}
    </div>`;
}

function closeAgendaModal() {
  document.getElementById('agendaOverlay').classList.remove('open');
  agendaModalPrefillPacienteId = null;
}

function openAgendaModal(pacienteId) {
  agendaModalPrefillPacienteId = pacienteId != null && pacienteId !== '' ? Number(pacienteId) : null;
  if (Number.isNaN(agendaModalPrefillPacienteId)) agendaModalPrefillPacienteId = null;
  renderAgendaModalForm();
  document.getElementById('agendaOverlay').classList.add('open');
}

function renderAgendaModalForm() {
  const pid = agendaModalPrefillPacienteId;
  const optsPac = pacientesDaSessao().map(p =>
    `<option value="${p.id}"${pid === p.id ? ' selected' : ''}>${p.nome} · ${p.idade} a.</option>`
  ).join('');
  const optsMed = listaMedicosAtivos().map(m =>
    `<option value="${m.id}">${m.nome}  ${m.especialidade}</option>`
  ).join('');
  const motivoOpts = [
    ['retorno', 'Retorno'],
    ['primeira', 'Primeira consulta'],
    ['urgencia', 'Urgência'],
    ['exame', 'Exame / resultado'],
    ['ajuste', 'Ajuste de medicação'],
    ['checkup', 'Check-up'],
    ['outro', 'Outro'],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  document.getElementById('agendaModalRoot').innerHTML = `
    <div class="modal-header">
      <div class="agenda-modal-title">Novo agendamento</div>
      <button type="button" class="modal-close" onclick="closeAgendaModal()" aria-label="Fechar"></button>
    </div>
    <form style="display:flex;flex-direction:column;flex:1;min-height:0" onsubmit="submitAgendaForm(event)">
      <div class="med-form-body">
        <p class="med-form-hint" style="margin-top:4px">
          O agendamento entra na agenda da clínica e fica disponível para o paciente no app (lembrete e confirmação), no fluxo integrado.
        </p>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormDia">Dia</label>
          <input class="med-form-input med-form-input--date" type="date" id="agendaFormDia" min="${isoHoje()}" value="${isoHoje()}" required />
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormHora">Horário</label>
          <input class="med-form-input" type="time" id="agendaFormHora" value="09:00" required />
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormPaciente">Paciente</label>
          <select class="med-form-select" id="agendaFormPaciente" required>${optsPac}</select>
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormMedico">Profissional</label>
          <select class="med-form-select" id="agendaFormMedico" required>${optsMed}</select>
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormMotivo">Tipo de atendimento</label>
          <select class="med-form-select" id="agendaFormMotivo" required>${motivoOpts}</select>
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormModalidade">Modalidade</label>
          <select class="med-form-select" id="agendaFormModalidade" required>
            <option value="presencial">Presencial</option>
            <option value="tele">Teleconsulta</option>
          </select>
        </div>
        <div class="med-form-field">
          <label class="med-form-label" for="agendaFormObs">Observações (opcional)</label>
          <input class="med-form-input" type="text" id="agendaFormObs" placeholder="Ex.: jejum, trazer exames" maxlength="120" />
        </div>
      </div>
      <div class="med-form-footer">
        <button type="button" class="btn-outline" onclick="closeAgendaModal()">Cancelar</button>
        <button type="submit" class="btn-primary">Confirmar agendamento</button>
      </div>
    </form>`;
}

function submitAgendaForm(ev) {
  ev.preventDefault();
  const dataIso = document.getElementById('agendaFormDia').value;
  const horaRaw = document.getElementById('agendaFormHora').value;
  const pid = parseInt(document.getElementById('agendaFormPaciente').value, 10);
  const mid = parseInt(document.getElementById('agendaFormMedico').value, 10);
  const motivo = document.getElementById('agendaFormMotivo').value;
  const mod = document.getElementById('agendaFormModalidade').value;
  const obs = (document.getElementById('agendaFormObs').value || '').trim();

  const p = pacientes.find(x => x.id === pid);
  const m = listaMedicosAtivos().find(x => x.id === mid);
  if (!p || !m || !horaRaw || !dataIso) {
    alert('Preencha dia, paciente, profissional e horário.');
    return;
  }
  if (dataIso < isoHoje()) {
    alert('Escolha a data de hoje em diante.');
    return;
  }

  const hora = horaRaw.length >= 5 ? horaRaw.slice(0, 5) : horaRaw;
  const labelMod = mod === 'tele' ? 'Teleconsulta' : 'Presencial';
  const tipoLabels = {
    retorno: 'Retorno', primeira: 'Primeira consulta', urgencia: 'Urgência', exame: 'Exame / resultado',
    ajuste: 'Ajuste de medicação', checkup: 'Check-up', outro: 'Consulta',
  };
  let tipo = `${tipoLabels[motivo] || 'Consulta'} · ${labelMod}`;
  if (obs) tipo += ` · ${obs}`;

  const { lista: alvo, rotulo: diaTxt } = destinoAgendaPorDataIso(dataIso);
  const item = {
    id: agendaNextId++,
    hora,
    dataIso,
    paciente: p.nome,
    pacienteId: p.id,
    medico: m.nome,
    medicoId: m.id,
    tipo,
    dotColor: 'var(--border)',
    badge: 'agendado',
    syncApp: true,
  };

  alvo.push(item);
  alvo.sort((a, b) => a.hora.localeCompare(b.hora));

  const dataHist = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const diaRotulo = dataIso === isoHoje() ? 'Hoje'
    : dataIso === isoAmanha() ? 'Amanhã'
    : formatAgendaDataIso(dataIso);
  p.historico.unshift({
    data: dataHist,
    tipo: 'green',
    msg: `Consulta agendada: ${tipoLabels[motivo] || 'Consulta'}  ${hora} (${diaTxt}) com ${m.nome}. Sincronizado com o app do paciente.`,
  });
  p.proximaConsulta = `${hora} · ${diaRotulo} · ${labelMod}`;

  closeAgendaModal();
  if (paginaAtiva === 'agenda') renderAgendaPage();
  if (paginaAtiva === 'pacientes') renderSideCol();
  if (paginaAtiva === 'detalhe' && pacienteDetalheId) renderDetalhePage(pacienteDetalheId);
}

/* -- EXAMES (legado ? módulo dividido) -- */
function renderExamesPage() {
  navigateTo(sessaoEhMedico() ? 'examesResultados' : 'examesSolicitacoes');
}

/* -- MEDICAÇÕES PAGE -- */
function renderMedicacoesPage() {
  const statusLabel = { ok:'Normal', baixo:'Baixo', critico:'Crítico' };
  const rows = medicacoes.map(m => {
    const pct = Math.round(m.estoque/m.total*100);
    return `
    <div class="med-row">
      <div><div class="exam-name">${m.nome}</div><div class="exam-pat">${m.paciente}</div></div>
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--text)">${m.estoque}/${m.total} comp.</div>
        <div class="estoque-bar"><div class="estoque-fill ${m.status}" style="width:${pct}%"></div></div>
      </div>
      <div><span class="risk-pill ${m.status==='ok'?'estavel':m.status==='baixo'?'atencao':'critico'}">${statusLabel[m.status]}</span></div>
      <div style="font-size:11px;color:var(--muted)">${m.proxRenovacao}</div>
      <div><button class="action-btn">Renovar ?</button></div>
    </div>`;
  }).join('');

  document.getElementById('medicacoesPage').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div class="metric-card"><div class="metric-accent" style="background:var(--red)"></div>
        <div class="metric-label">Estoque zerado/crítico</div>
        <div class="metric-value" style="color:var(--red)">${medicacoes.filter(m=>m.status==='critico').length}</div>
        <div class="metric-sub"><span class="up">Renovar urgente</span></div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--amber)"></div>
        <div class="metric-label">Estoque baixo</div>
        <div class="metric-value" style="color:var(--amber)">${medicacoes.filter(m=>m.status==='baixo').length}</div>
        <div class="metric-sub">Planejar reposição</div></div>
      <div class="metric-card"><div class="metric-accent" style="background:var(--green)"></div>
        <div class="metric-label">Em dia</div>
        <div class="metric-value" style="color:var(--green)">${medicacoes.filter(m=>m.status==='ok').length}</div>
        <div class="metric-sub"><span class="down">Sem alertas</span></div></div>
    </div>
    <div class="panel">
      <div class="panel-header"><div class="panel-title">Controle de medicamentos  ${medicacoes.length} registros</div></div>
      <div class="med-row header">
        <div class="col-label">Medicamento / Paciente</div>
        <div class="col-label">Estoque</div>
        <div class="col-label">Status</div>
        <div class="col-label">Próx. renovação</div>
        <div></div>
      </div>
      ${rows}
    </div>`;
}

const CORES_MEDICO_PRESET = ['#7c3aed', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#0891b2'];

const DIAS_ATEND_MEDICO_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
const DIAS_ATEND_MEDICO_LABEL = {
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
};

function horarioAtendimentoPadraoMedico() {
  return {
    segunda: ['08:00', '17:00'],
    terca: ['08:00', '17:00'],
    quarta: ['08:00', '17:00'],
    quinta: ['08:00', '17:00'],
    sexta: ['08:00', '16:00'],
  };
}

function horarioMedicoFormHtml(m) {
  const pad = horarioAtendimentoPadraoMedico();
  const h = m && m.horarioAtendimento && typeof m.horarioAtendimento === 'object'
    ? { ...pad, ...m.horarioAtendimento }
    : { ...pad };
  const onch = "var r=this.closest('.medico-dia-atend-row');var t=r.querySelectorAll('input[type=time]');for(var i=0;i<t.length;i++)t[i].disabled=!this.checked";
  return DIAS_ATEND_MEDICO_KEYS.map(key => {
    const slot = Array.isArray(h[key]) && h[key].length >= 2 ? h[key] : null;
    const on = !!slot;
    const ini = on ? String(slot[0]).slice(0, 5) : '08:00';
    const fim = on ? String(slot[1]).slice(0, 5) : '17:00';
    return `
        <div class="medico-dia-atend-row cad-pac-field cad-pac-field--full" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;padding-bottom:10px;margin-bottom:6px;border-bottom:1px solid var(--border)">
          <label style="min-width:108px;display:flex;align-items:center;gap:6px;font-size:13px">
            <input type="checkbox" class="medCadDiaOn" data-dia="${key}" ${on ? 'checked' : ''} onchange="${onch}" />
            ${DIAS_ATEND_MEDICO_LABEL[key]}
          </label>
          <div>
            <label for="medCadIni_${key}" style="font-size:11px;color:var(--muted);display:block">Início</label>
            <input type="time" id="medCadIni_${key}" value="${ini}" ${on ? '' : 'disabled'} />
          </div>
          <div>
            <label for="medCadFim_${key}" style="font-size:11px;color:var(--muted);display:block">Fim</label>
            <input type="time" id="medCadFim_${key}" value="${fim}" ${on ? '' : 'disabled'} />
          </div>
        </div>`;
  }).join('');
}

function lerHorarioAtendimentoDoForm() {
  const out = {};
  DIAS_ATEND_MEDICO_KEYS.forEach(key => {
    const on = document.querySelector(`.medCadDiaOn[data-dia="${key}"]`);
    if (!on || !on.checked) return;
    const ini = document.getElementById(`medCadIni_${key}`);
    const fim = document.getElementById(`medCadFim_${key}`);
    const a = ini && ini.value;
    const b = fim && fim.value;
    if (a && b) out[key] = [a, b];
  });
  return Object.keys(out).length ? out : horarioAtendimentoPadraoMedico();
}

function alternarAtivoMedicoNoCard(medicoId) {
  if (!sessaoEhClinica()) return;
  const med = medicos.find(x => x.id === medicoId);
  if (!med) return;
  med.ativo = med.ativo === false ? true : false;
  renderMedicosPage();
  renderSidebar();
}

function renderMedicosPage() {
  const root = document.getElementById('medicosPage');
  if (!root) return;
  const cards = medicos.map(m => {
    const ini = patientInitials(m.nome);
    const cor = m.cor || '#7c3aed';
    const ativo = m.ativo !== false;
    return `
      <div class="medico-card ${ativo ? '' : 'medico-card--inativo'}">
        <div class="medico-card-avatar" style="background:${cor}22;border-color:${cor}">${m.fotoUrl && String(m.fotoUrl).indexOf('data:image') === 0
      ? `<img src="${escAttrDataUrl(m.fotoUrl)}" alt="" />`
      : (m.avatar || ini)}</div>
        <div class="medico-card-body">
          <div class="medico-card-name">${m.nome}</div>
          <div class="medico-card-meta">${m.crm} · ${m.especialidade}</div>
          <div class="medico-card-tags">
            <span class="risk-pill ${ativo ? 'estavel' : 'atencao'}">${ativo ? 'Ativo' : 'Inativo'}</span>
            <span class="medico-cor-chip" style="background:${cor}"></span>
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            <button type="button" class="btn-outline" style="flex:1;min-width:112px" onclick="abrirModalMedico(${m.id})">Editar</button>
            <button type="button" class="btn-outline" style="flex:1;min-width:112px" onclick="alternarAtivoMedicoNoCard(${m.id})">${ativo ? 'Desativar' : 'Ativar'}</button>
          </div>
        </div>
      </div>`;
  }).join('');
  root.innerHTML = `
    <div class="medicos-page-head">
      <div>
        <h1 class="medicos-page-title">Equipe médica</h1>
        <p class="cad-pac-hint" style="margin:4px 0 0">Cadastro completo usado na agenda, atestados e receitas.</p>
      </div>
      <button type="button" class="btn-primary" onclick="abrirModalMedico(null)">+ Novo médico</button>
    </div>
    <div class="medicos-grid">${cards}</div>`;
}

function abrirModalMedico(medicoId) {
  medicoModalEdicaoId = medicoId;
  const m = medicoId != null ? medicos.find(x => x.id === medicoId) : null;
  const overlay = document.getElementById('medicoCadOverlay');
  const root = document.getElementById('medicoCadModalRoot');
  if (!overlay || !root) return;
  const isNovo = !m;
  const espOpts = ESPECIALIDADES_PADRAO.map(e =>
    `<option value="${e}"${m && m.especialidade === e ? ' selected' : ''}>${e}</option>`,
  ).join('');
  const durOpts = [15, 20, 30, 45, 60].map(d =>
    `<option value="${d}"${m && (m.consultaDuracao || 30) === d ? ' selected' : ''}>${d} min</option>`,
  ).join('');
  const coresHtml = CORES_MEDICO_PRESET.map(c =>
    `<label class="medico-cor-sel"><input type="radio" name="medicoCor" value="${c}"${m && (m.cor || '') === c ? ' checked' : (!m && c === '#7c3aed' ? ' checked' : '')} /><span style="background:${c}"></span></label>`,
  ).join('');
  root.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${isNovo ? 'Novo médico' : 'Editar médico'}</div>
      <button type="button" class="modal-close" onclick="fecharModalMedico()" aria-label="Fechar"></button>
    </div>
    <form class="cad-pac-form" style="padding:16px 20px 20px;max-height:70vh;overflow-y:auto" onsubmit="event.preventDefault();salvarMedicoForm();">
      <div class="cad-pac-grid">
        <div class="cad-pac-field cad-pac-field--full">
          <label for="medCadNome">Nome completo *</label>
          <input type="text" id="medCadNome" required value="${m ? String(m.nome).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="medCadCrm">CRM *</label>
          <input type="text" id="medCadCrm" required value="${m ? String(m.crm).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="medCadEspSelect">Especialidade</label>
          <select id="medCadEspSelect" onchange="document.getElementById('medCadEspOutra').style.display=this.value==='__outra__'?'block':'none'">
            ${espOpts}
            <option value="__outra__"${m && !ESPECIALIDADES_PADRAO.includes(m.especialidade) ? ' selected' : ''}>Outra</option>
          </select>
        </div>
        <div class="cad-pac-field cad-pac-field--full" id="medCadEspOutra" style="display:${m && !ESPECIALIDADES_PADRAO.includes(m.especialidade) ? 'block' : 'none'}">
          <label for="medCadEspLivre">Especialidade (livre)</label>
          <input type="text" id="medCadEspLivre" value="${m && !ESPECIALIDADES_PADRAO.includes(m.especialidade) ? String(m.especialidade).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="medCadEmail">E-mail</label>
          <input type="email" id="medCadEmail" value="${m && m.email ? String(m.email).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="medCadTel">Telefone</label>
          <input type="text" id="medCadTel" value="${m && m.telefone ? String(m.telefone).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field cad-pac-field--full">
          <label>Foto (opcional)</label>
          <input type="file" id="medCadFoto" accept="image/*" />
          <span class="cad-pac-hint">Será convertida para base64 nesta demo.</span>
        </div>
        <div class="cad-pac-field cad-pac-field--full">
          <label>Cor na agenda</label>
          <div class="medico-cor-grid">${coresHtml}</div>
        </div>
        <div class="cad-pac-field">
          <label for="medCadDur">Duração padrão</label>
          <select id="medCadDur">${durOpts}</select>
        </div>
        <div class="cad-pac-field cad-pac-field--full">
          <label for="medCadBio">Bio</label>
          <textarea id="medCadBio" rows="2">${m && m.bio ? String(m.bio).replace(/</g, '&lt;') : ''}</textarea>
        </div>
        <div class="cad-pac-field cad-pac-field--full">
          <label>Horários na clínica (dias úteis)</label>
          <p class="cad-pac-hint" style="margin:0 0 8px">Marque o dia e informe início e fim de atendimento.</p>
          ${horarioMedicoFormHtml(m)}
        </div>
        <div class="cad-pac-field">
          <label class="cad-pac-check"><input type="checkbox" id="medCadAtivo"${!m || m.ativo !== false ? ' checked' : ''} /> Ativo</label>
        </div>
        <div class="cad-pac-field">
          <label for="medCadUser">Usuário (login)</label>
          <input type="text" id="medCadUser" autocomplete="username" value="${m && m.login ? String(m.login.usuario).replace(/"/g, '&quot;') : ''}" />
        </div>
        <div class="cad-pac-field">
          <label for="medCadSenha">Senha (login)</label>
          <input type="text" id="medCadSenha" autocomplete="new-password" value="${m && m.login ? String(m.login.senha).replace(/"/g, '&quot;') : ''}" placeholder="demo em texto" />
        </div>
      </div>
      <div class="cad-pac-footer" style="border-top:none;padding-top:12px">
        <button type="button" class="btn-outline" onclick="fecharModalMedico()">Cancelar</button>
        <button type="submit" class="btn-primary">Salvar</button>
      </div>
    </form>`;
  overlay.classList.add('open');
}

function fecharModalMedico() {
  const overlay = document.getElementById('medicoCadOverlay');
  if (overlay) overlay.classList.remove('open');
  medicoModalEdicaoId = null;
}

function salvarMedicoForm() {
  const nome = (document.getElementById('medCadNome') && document.getElementById('medCadNome').value || '').trim();
  const crm = (document.getElementById('medCadCrm') && document.getElementById('medCadCrm').value || '').trim();
  if (!nome || !crm) {
    alert('Nome e CRM são obrigatórios.');
    return;
  }
  let esp = document.getElementById('medCadEspSelect') && document.getElementById('medCadEspSelect').value;
  if (esp === '__outra__') esp = (document.getElementById('medCadEspLivre') && document.getElementById('medCadEspLivre').value.trim()) || 'Clínica Geral';
  const email = (document.getElementById('medCadEmail') && document.getElementById('medCadEmail').value || '').trim();
  const telefone = (document.getElementById('medCadTel') && document.getElementById('medCadTel').value || '').trim();
  const dur = parseInt(document.getElementById('medCadDur') && document.getElementById('medCadDur').value, 10) || 30;
  const bio = (document.getElementById('medCadBio') && document.getElementById('medCadBio').value || '').trim();
  const ativo = !!(document.getElementById('medCadAtivo') && document.getElementById('medCadAtivo').checked);
  const usuario = (document.getElementById('medCadUser') && document.getElementById('medCadUser').value || '').trim() || nome.toLowerCase().replace(/\s+/g, '.');
  const senha = (document.getElementById('medCadSenha') && document.getElementById('medCadSenha').value || '').trim() || 'medico';
  const corRadio = document.querySelector('input[name="medicoCor"]:checked');
  const cor = corRadio ? corRadio.value : '#7c3aed';

  const montar = (id, fotoUrl) => ({
    id,
    nome,
    crm,
    especialidade: esp,
    email,
    telefone,
    fotoUrl: fotoUrl || null,
    avatar: '?????',
    cor,
    ativo,
    login: { usuario, senha },
    consultaDuracao: dur,
    bio,
    horarioAtendimento: lerHorarioAtendimentoDoForm(),
  });

  const fileInp = document.getElementById('medCadFoto');
  const f = fileInp && fileInp.files && fileInp.files[0];
  const aplicar = fotoDataUrl => {
    if (medicoModalEdicaoId != null) {
      const ex = medicos.find(x => x.id === medicoModalEdicaoId);
      if (ex) Object.assign(ex, montar(ex.id, fotoDataUrl || ex.fotoUrl));
    } else {
      const nid = medicos.reduce((mx, x) => Math.max(mx, x.id), 0) + 1;
      medicos.push(montar(nid, fotoDataUrl));
    }
    fecharModalMedico();
    renderMedicosPage();
    renderSidebar();
  };

  if (f && f.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => aplicar(String(reader.result || ''));
    reader.readAsDataURL(f);
  } else {
    aplicar(null);
  }
}

function renderConfiguracoesPage() {
  const root = document.getElementById('configuracoesPage');
  if (!root) return;
  const sess = getSessao();
  const somenteLeitura = sess && sessaoEhMedico();
  root.innerHTML = `
    <div class="config-grid">
      ${!somenteLeitura ? `
      <div class="panel" style="grid-column:1/-1">
        <div class="panel-header"><div class="panel-title">🔑 Módulos</div></div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:14px;font-size:13px">
          <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
            <span style="font-size:22px">📊</span>
            <div style="flex:1">
              <div style="font-weight:600">Monitoramento</div>
              <div style="color:var(--muted);font-size:12px;margin-top:2px">Sinais vitais, alertas, agenda, medicações — sempre ativo</div>
            </div>
            <span style="background:#16a34a;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;white-space:nowrap">ATIVO</span>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;background:${licencaConsultaAtiva() ? 'var(--purple-light,#f3f0ff)' : 'var(--bg)'};border-radius:8px;border:1px solid ${licencaConsultaAtiva() ? '#c4b5fd' : 'var(--border)'}">
            <span style="font-size:22px;margin-top:2px">🩺</span>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                Consulta Clínica
                <span style="background:${licencaConsultaAtiva() ? 'var(--purple)' : '#e5e7eb'};color:${licencaConsultaAtiva() ? '#fff' : 'var(--muted)'};font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;white-space:nowrap">${licencaConsultaAtiva() ? 'ATIVO' : 'INATIVO'}</span>
              </div>
              <div style="color:var(--muted);font-size:12px;margin-top:2px">Agenda, triagem, atendimento clínico, receita, atestado, exames e painel de fila</div>
              ${licencaConsultaAtiva()
                ? `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    <span style="font-size:12px;color:var(--muted)">Chave: <code style="font-size:11px;background:var(--bg);padding:2px 6px;border-radius:4px;border:1px solid var(--border)">${licencaConsultaChave()}</code></span>
                    <button type="button" class="btn-outline" style="font-size:12px"
                      onclick="if(confirm('Desativar o módulo de Consulta Clínica?')){desativarModuloConsulta();renderConfiguracoesPage();renderSidebar();}">Desativar</button>
                  </div>`
                : `<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <input type="text" id="licencaConsultaInput" placeholder="TEEP-XXXX-XXXX-XXXX"
                      style="flex:1;min-width:200px;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:'DM Mono',monospace;background:var(--white);color:var(--text);outline:none;text-transform:uppercase"
                      oninput="this.value=this.value.toUpperCase()" />
                    <button type="button" class="btn-primary"
                      onclick="var r=ativarModuloConsulta(document.getElementById('licencaConsultaInput').value);if(r.ok){renderConfiguracoesPage();renderSidebar();alert('✅ Módulo Consulta Clínica ativado!');}else{alert(r.msg);}">Ativar</button>
                  </div>
                  <p class="cad-pac-hint" style="margin-top:8px;margin-bottom:0">
                    Demo: use <code style="font-size:11px">TEEP-CONS-2024-DEMO</code>, <code style="font-size:11px">TEEP-CONS-2025-FULL</code> ou <code style="font-size:11px">TEEP-CONS-PRO1-ATIV</code>.
                  </p>`
              }
            </div>
          </div>
        </div>
      </div>` : ''}
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Dados da clínica</div></div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;font-size:13px">
          <div><strong>Nome:</strong> ${dadosClinica.nome}</div>
          <div><strong>Endereço:</strong> ${dadosClinica.endereco}</div>
          <div><strong>CNPJ:</strong> ${dadosClinica.cnpj}</div>
          <div><strong>Telefone:</strong> ${dadosClinica.telefone}</div>
          ${somenteLeitura ? '<p class="cad-pac-hint" style="margin:0">Na visão do médico, estes dados são somente leitura.</p>' : ''}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Gestão</div></div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:10px">
          ${somenteLeitura ? '' : `<button type="button" class="btn-outline" onclick="navigateTo('medicos')">Abrir cadastro de médicos</button>`}
          <p class="cad-pac-hint" style="margin:0">Permissões por perfil e integração avançada ficam para a fase com backend.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Integração com app</div></div>
        <div style="padding:16px;font-size:13px">
          <div><strong>URL de download:</strong> <a href="${APP_PACIENTE_DOWNLOAD_URL}" target="_blank" rel="noopener">${APP_PACIENTE_DOWNLOAD_URL}</a></div>
          <div style="margin-top:8px"><strong>Chave API (placeholder):</strong> ${dadosClinica.apiChavePlaceholder}</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">🤖 IA / API Key</div></div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;font-size:13px">
          <p class="cad-pac-hint" style="margin:0">
            Cole aqui sua chave da API da Anthropic para ativar os recursos de IA (SOAP, atestado, receita, triagem, chat, tendências).
            A chave fica só nesta aba do navegador — some ao fechar ou fazer logout.
            Obtenha em <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>.
          </p>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="password" id="aiKeyInput" placeholder="sk-ant-api…"
              style="flex:1;min-width:220px;border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;font-family:'DM Mono',monospace;background:var(--bg);color:var(--text);outline:none"
              value="${sessionStorage.getItem('teep_ai_key') ? '••••••••••••••••••••••••••' : ''}"
              onfocus="if(this.value.startsWith('•'))this.value=''"
            />
            <button type="button" class="btn-primary" onclick="salvarAIKey()">Salvar</button>
            <button type="button" class="btn-outline" onclick="limparAIKey()">Limpar</button>
          </div>
          <div id="aiKeyStatus" style="font-size:12px;color:var(--green);display:${sessionStorage.getItem('teep_ai_key') ? 'block' : 'none'}">
            ✅ Chave configurada nesta sessão.
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">Demonstração</div></div>
        <div style="padding:16px">
          <p class="cad-pac-hint" style="margin-top:0">Restaura dados de exemplo no navegador (em produção use servidor).</p>
          <button type="button" class="btn-outline" onclick="alert('Na versão com backend, aqui viria o reset. Nesta demo os dados estão apenas em memória; recarregue a página para voltar ao estado inicial do script.')">Resetar dados de demonstração</button>
        </div>
      </div>
    </div>`;
}

function salvarAIKey() {
  const inp = document.getElementById('aiKeyInput');
  const status = document.getElementById('aiKeyStatus');
  if (!inp) return;
  const key = inp.value.trim();
  if (!key || key.startsWith('•')) {
    alert('Cole a chave antes de salvar.');
    return;
  }
  if (!key.startsWith('sk-ant-')) {
    alert('Chave inválida. Deve começar com "sk-ant-".');
    return;
  }
  sessionStorage.setItem('teep_ai_key', key);
  inp.value = '••••••••••••••••••••••••••';
  if (status) { status.style.display = 'block'; }
  alert('Chave salva! Os recursos de IA estão ativos nesta sessão.');
}

function limparAIKey() {
  sessionStorage.removeItem('teep_ai_key');
  const inp = document.getElementById('aiKeyInput');
  const status = document.getElementById('aiKeyStatus');
  if (inp) inp.value = '';
  if (status) status.style.display = 'none';
}

function tentarLogin(tipo) {
  const u = (document.getElementById('loginUsuario') && document.getElementById('loginUsuario').value || '').trim();
  const s = (document.getElementById('loginSenha') && document.getElementById('loginSenha').value) || '';
  const err = document.getElementById('loginErro');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (tipo === 'clinica') {
    if (u === 'clinica' && s === 'admin123') {
      sessionStorage.setItem(SESSAO_STORAGE_KEY, JSON.stringify({
        tipo: 'clinica',
        loginEm: Date.now(),
      }));
      mostrarAppLogado();
      return;
    }
  } else if (tipo === 'medico') {
    const m = medicos.find(x => x.login && x.login.usuario === u && x.login.senha === s && x.ativo !== false);
    if (m) {
      sessionStorage.setItem(SESSAO_STORAGE_KEY, JSON.stringify({
        tipo: 'medico',
        medicoId: m.id,
        medicoNome: m.nome,
        loginEm: Date.now(),
      }));
      mostrarAppLogado();
      return;
    }
  }
  if (err) {
    err.textContent = 'Usuário ou senha incorretos.';
    err.style.display = 'block';
  }
}

function fazerLogout() {
  sessionStorage.removeItem(SESSAO_STORAGE_KEY);
  resetDemoAtendimentos();
  document.getElementById('loginUsuario').value = '';
  document.getElementById('loginSenha').value = '';
  document.getElementById('appLayout').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

function mostrarAppLogado() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appLayout').style.display = 'block';
  resetDemoAtendimentos();
  aplicarPerfilSessao();
  registrarEventosAppSeNecessario();
  renderTopbarDate();
  navigateTo('pacientes');
  if (intervalTopbarId) clearInterval(intervalTopbarId);
  intervalTopbarId = setInterval(renderTopbarDate, 60000);
}

function aplicarPerfilSessao() {
  renderSidebar();
  if (paginaAtiva === 'pacientes') renderPacientesPage();
  if (paginaAtiva === 'agenda') renderAgendaPage();
  if (paginaAtiva === 'painel') renderPainelPage();
  if (paginaAtiva === 'consulta' && consultaAtivaPacienteId != null) {
    renderConsultaAtivaPage(consultaAtivaPacienteId);
  }
}

let eventosAppRegistrados = false;
let intervalTopbarId = null;
function registrarEventosAppSeNecessario() {
  if (eventosAppRegistrados) return;
  eventosAppRegistrados = true;
  document.getElementById('notifBtn').addEventListener('click', toggleNotif);
  document.getElementById('searchInput').addEventListener('input', function() {
    termoBusca = this.value;
    if (paginaAtiva === 'pacientes') renderPacientesPage();
  });
  document.getElementById('agendaPage').addEventListener('click', function(ev) {
    const btn = ev.target.closest('[data-agenda-filter]');
    if (!btn || !this.contains(btn)) return;
    const f = btn.getAttribute('data-agenda-filter');
    if (f === 'todos' || f === 'hoje' || f === 'amanha' || f === 'andamento') {
      ev.preventDefault();
      setAgendaPageFiltro(f);
    }
  });
}

/* -- NOTIFICAÇÕES -- */
function toggleNotif() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    document.getElementById('notifList').innerHTML = notificacoes.map(n => `
      <div class="notif-panel-item">
        <div class="notif-panel-icon">${n.icon}</div>
        <div>
          <div class="notif-panel-msg">${n.msg}</div>
          <div class="notif-panel-time">${n.time}</div>
        </div>
      </div>`).join('');
  }
}

/* -- INIT (login) -- */
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('beforeprint', () => {
    const ov = document.getElementById('receitaOverlay');
    if (!ov || !ov.classList.contains('open')) return;
    receitaOcultarFormParaImpressao();
  });
  window.addEventListener('afterprint', () => {
    const ov = document.getElementById('receitaOverlay');
    if (!ov || !ov.classList.contains('open')) return;
    receitaRestaurarFormAposImpressao();
  });

  const sess = getSessao();
  if (sess && (sessaoEhClinica() || sessaoEhMedico())) {
    mostrarAppLogado();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appLayout').style.display = 'none';
  }
})
