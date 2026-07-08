/* ═══════════════════════════════════════════════════════════════
   LICENSE MODULE — TeepSaude
   Controla quais módulos estão ativos para esta instalação.

   Módulo MONITORAMENTO  → sempre ativo (core do produto)
   Módulo CONSULTA       → ativado via chave de licença pelo admin

   Chave salva em: localStorage['teep_licenca_consulta']
   Formato aceito: TEEP-XXXX-XXXX-XXXX (maiúsculas ou não)
   ═══════════════════════════════════════════════════════════════ */

const LICENSE_STORAGE_KEY = 'teep_licenca_consulta';

/**
 * Chaves válidas na demo.
 * Em produção: substituir por validação server-side.
 */
const DEMO_CHAVES_VALIDAS = [
  'TEEP-CONS-2024-DEMO',
  'TEEP-CONS-2025-FULL',
  'TEEP-CONS-PRO1-ATIV',
];

/* ── Leitura / escrita ─────────────────────────────────────── */

function licencaConsultaAtiva() {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && obj.ativa === true && !!obj.chave;
  } catch (_) {
    return false;
  }
}

function licencaConsultaChave() {
  try {
    const raw = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return (obj && obj.chave) || null;
  } catch (_) {
    return null;
  }
}

function normalizarChave(raw) {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '-');
}

function ativarModuloConsulta(chaveRaw) {
  const chave = normalizarChave(chaveRaw);
  if (!chave) return { ok: false, msg: 'Informe a chave de licença.' };

  /* Validação demo — em produção: chamada para API/backend */
  if (!DEMO_CHAVES_VALIDAS.includes(chave)) {
    return {
      ok: false,
      msg: 'Chave inválida.\n\nChaves de demonstração:\n• TEEP-CONS-2024-DEMO\n• TEEP-CONS-2025-FULL\n• TEEP-CONS-PRO1-ATIV',
    };
  }

  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({
    ativa: true,
    chave,
    ativadaEm: new Date().toISOString(),
  }));
  return { ok: true, chave };
}

function desativarModuloConsulta() {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

/* ── Helpers de acesso por tela ────────────────────────────── */

/**
 * Retorna true se a página/funcionalidade requer o módulo Consulta.
 * Usado em navigateTo() e renderSidebar() para bloquear/ocultar.
 */
function paginaRequerModuloConsulta(page) {
  return [
    'agenda',
    'painel',
    'consulta',
    'examesSolicitacoes',
    'examesResultados',
    'medicacoes',
  ].includes(page);
}

/**
 * Retorna true se uma ação clínica dentro do perfil do paciente
 * requer o módulo Consulta (atestado, receita, triagem, exames, anotação).
 */
function acaoRequerModuloConsulta(acao) {
  return [
    'atestado',
    'receita',
    'triagem',
    'consulta',
    'exames_solicitar',
    'anotacao',
  ].includes(acao);
}

/* ── UI helpers ────────────────────────────────────────────── */

/**
 * Chama antes de qualquer ação que exige o módulo Consulta.
 * Se inativo, exibe aviso e retorna false.
 */
function exigirModuloConsulta(mensagemContexto) {
  if (licencaConsultaAtiva()) return true;
  const ctx = mensagemContexto
    ? `\n\n(${mensagemContexto})`
    : '';
  alert(
    `⚠️ Módulo de Consulta Clínica não está ativo.${ctx}\n\nAcesse Configurações → Módulos para ativar com sua chave de licença.`
  );
  return false;
}

/**
 * Badge/tag usada na sidebar e em botões bloqueados.
 */
function htmlModuloInativoTag() {
  return `<span style="
    margin-left:auto;
    background:#e5e7eb;
    color:#6b7280;
    font-size:9px;
    font-weight:600;
    padding:2px 6px;
    border-radius:10px;
    letter-spacing:.03em;
  ">INATIVO</span>`;
}

/**
 * Bloco de aviso exibido no lugar de páginas bloqueadas.
 */
function htmlModuloConsultaBloqueado() {
  return `
    <div style="
      max-width:420px;
      margin:48px auto;
      background:var(--white);
      border:1px solid var(--border);
      border-radius:var(--radius);
      padding:32px 28px;
      text-align:center;
    ">
      <div style="font-size:36px;margin-bottom:14px">🔒</div>
      <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:8px">
        Módulo de Consulta Clínica
      </div>
      <p style="font-size:13px;color:var(--muted);line-height:1.6;margin-bottom:20px">
        Esta funcionalidade faz parte do módulo de consulta clínica,
        que inclui agenda, triagem, atendimento, receita, atestado e exames.
        Ative com sua chave de licença.
      </p>
      <button type="button" class="btn-primary"
        onclick="navigateTo('configuracoes')">
        Ir para Configurações → Módulos
      </button>
    </div>`;
}
