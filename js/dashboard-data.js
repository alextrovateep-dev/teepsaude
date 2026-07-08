/** Dados institucionais (receita, atestado, configurações) */
const dadosClinica = {
  nome: 'TeepSaude',
  endereco: 'Av. Paulista, 1000 — Bela Vista, São Paulo — SP',
  cnpj: '12.345.678/0001-90',
  telefone: '(11) 3000-0000',
  cidade: 'São Paulo, SP',
  logoDataUrl: null,
  appDownloadUrl: 'https://teepsaude.app/baixar',
  apiChavePlaceholder: 'demo-api-key-xxxx',
};

const medico = {
  nome: 'Dr. Carlos Mendes', crm: 'CRM 54.321-SP',
  especialidade: 'Cardiologia', avatar: '👨‍⚕️', clinica: dadosClinica.nome,
  cidade: dadosClinica.cidade,
};

/** Link para o paciente baixar o app (troque pela URL real: loja ou landing) */
const APP_PACIENTE_DOWNLOAD_URL = 'https://teepsaude.app/baixar';

const pacientes = [
  // ── CRÍTICOS ──
  {
    id:1, nome:'Maria Aparecida Santos', idade:68, sexo:'F',
    condicoes:'Hipertensão, Diabetes', pressao:'178/102', paColor:'red',
    medicacao:'3 doses perdidas', ultimoReg:'Há 14h', status:'critico',
    peso:'72kg', altura:'1,58m', glicemia:'248 mg/dL', saturacao:'96%', fc:'98 bpm',
    imc:'28,8', sono:'4,5h', passos:'1.200', hrv:'28ms', temperatura:'36,8°C',
    corpo:{
      cintura:'94 cm', quadril:'104 cm', rcq:'0,90', gorduraCorporal:'34,2%', massaMagra:'47,4 kg',
      aguaCorporal:'46%', metabolismoBasal:'1.338 kcal/dia', musculoEsqueletico:'25%', pesoOssos:'2,7 kg',
      atualizado:'06/04/2026 · 08:12 · App + balança bioimpedância',
      pesoIdealKg: 62,
      datas:{ peso:'25/01/2024 00:00', imc:'25/01/2024 00:00', gordura:'20/01/2024 00:00', massaMusc:'20/01/2024 00:00', cintura:'20/01/2024 00:00', altura:'15/01/2024 00:00' },
      fontes:{ peso:'Balança Inteligente', imc:'Calculado', gordura:'Balança Inteligente', massaMusc:'Balança Inteligente', cintura:'Manual', altura:'Manual' },
    },
    telefone:'(11) 99234-5678', email:'m.aparecida@email.com',
    meds:['Losartana 50mg','Metformina 500mg','AAS 100mg'],
    ultimaConsulta:'18/03/2025', proximaConsulta:'07/04/2025',
    historico:[
      { data:'06/04 09:14', tipo:'red',   msg:'Pressão: 178/102 mmHg — muito elevada' },
      { data:'06/04 08:00', tipo:'amber', msg:'Glicemia: 248 mg/dL — acima do ideal' },
      { data:'05/04 22:30', tipo:'amber', msg:'Dose de Losartana não registrada' },
      { data:'05/04 14:00', tipo:'green', msg:'FC: 95 bpm — estável' },
      { data:'04/04 10:00', tipo:'green', msg:'Consulta de retorno — pressão 162/94' },
    ],
    msgs:[
      { de:'clinica', texto:'Olá Maria, notamos que sua pressão está muito alta. Por favor, tome sua medicação e entre em contato.', hora:'08:15' },
      { de:'paciente', texto:'Bom dia. Esqueci ontem. Vou tomar agora.', hora:'09:30' },
    ],
    anotacoesConsultas: [
      { id: 1, data: '18/03/2025 14:20', texto: 'Retorno IC. PA 162/94 mmHg. Mantida medicação. Solicitado ECG. Orientação dietética e retorno em 30 dias.', medicoNome: 'Dr. Carlos Mendes', medicoCrm: 'CRM 54.321-SP' },
      { id: 2, data: '10/02/2025 09:05', texto: 'Primeira avaliação pós-internação. Exame físico sem edema importante. Revisão de Losartana e Metformina.', medicoNome: 'Dr. Carlos Mendes', medicoCrm: 'CRM 54.321-SP' },
    ],
  },
  {
    id:2, nome:'Roberto Ferreira Lima', idade:74, sexo:'M',
    condicoes:'ICC, Fibrilação Atrial', pressao:'162/98', paColor:'red',
    medicacao:'Estoque zerado', ultimoReg:'Há 6h', status:'critico',
    peso:'68kg', altura:'1,72m', glicemia:'112 mg/dL', saturacao:'94%', fc:'104 bpm',
    imc:'23,0', sono:'6h', passos:'800', hrv:'18ms', temperatura:'37,1°C',
    corpo:{
      cintura:'98 cm', quadril:'101 cm', rcq:'0,97', gorduraCorporal:'17,8%', massaMagra:'55,9 kg',
      aguaCorporal:'56%', metabolismoBasal:'1.405 kcal/dia', musculoEsqueletico:'31%', pesoOssos:'3,0 kg',
      atualizado:'05/04/2026 · Consultório',
      pesoIdealKg: 70,
      datas:{ peso:'24/01/2024 08:30', imc:'24/01/2024 08:30', gordura:'22/01/2024 10:00', massaMusc:'22/01/2024 10:00', cintura:'22/01/2024 10:00', altura:'10/01/2024 09:00' },
      fontes:{ peso:'Balança Inteligente', imc:'Calculado', gordura:'Balança Inteligente', massaMusc:'Balança Inteligente', cintura:'Manual', altura:'Manual' },
    },
    telefone:'(11) 98345-6789', email:'r.ferreira@email.com',
    meds:['Furosemida 40mg','Warfarina 5mg','Digoxina 0,25mg'],
    ultimaConsulta:'01/04/2025', proximaConsulta:'08/04/2025',
    historico:[
      { data:'06/04 07:10', tipo:'red',   msg:'Estoque de Furosemida: ZERADO' },
      { data:'06/04 06:50', tipo:'red',   msg:'Saturação O₂: 94% — monitorar' },
      { data:'05/04 20:00', tipo:'amber', msg:'Pressão: 158/94 mmHg' },
      { data:'05/04 08:00', tipo:'green', msg:'Dose de Warfarina tomada' },
    ],
    msgs:[]
  },
  {
    id:3, nome:'Antônia Gonçalves Ramos', idade:81, sexo:'F',
    condicoes:'Diabetes Tipo 2', pressao:'138/88', paColor:'amber',
    medicacao:'Glicemia 310 mg/dL', ultimoReg:'Há 2h', status:'critico',
    peso:'65kg', altura:'1,55m', glicemia:'310 mg/dL', saturacao:'97%', fc:'88 bpm',
    imc:'27,1', sono:'7h', passos:'600', hrv:'22ms', temperatura:'36,6°C',
    telefone:'(11) 97456-7890', email:'a.ramos@email.com',
    meds:['Glibenclamida 5mg','Metformina 850mg'],
    ultimaConsulta:'25/03/2025', proximaConsulta:'10/04/2025',
    historico:[
      { data:'06/04 07:22', tipo:'red',   msg:'Glicemia: 310 mg/dL — fora do controle' },
      { data:'05/04 12:00', tipo:'amber', msg:'Glicemia: 198 mg/dL — acima do ideal' },
      { data:'04/04 08:00', tipo:'green', msg:'Dose de Metformina tomada' },
    ],
    msgs:[]
  },
  {
    id:4, nome:'Severino Costa Filho', idade:77, sexo:'M',
    condicoes:'DPOC, Hipertensão', pressao:'158/96', paColor:'red',
    medicacao:'Broncodilatador em falta', ultimoReg:'Há 9h', status:'critico',
    peso:'61kg', altura:'1,68m', glicemia:'98 mg/dL', saturacao:'91%', fc:'92 bpm',
    imc:'21,6', sono:'5h', passos:'500', hrv:'15ms', temperatura:'37,3°C',
    telefone:'(11) 96567-8901', email:'severino.costa@email.com',
    meds:['Salbutamol','Enalapril 10mg','Ipratrópio'],
    ultimaConsulta:'28/03/2025', proximaConsulta:'06/04/2025',
    historico:[
      { data:'06/04 00:30', tipo:'red',   msg:'Saturação O₂: 91% — crítico' },
      { data:'05/04 18:00', tipo:'red',   msg:'Broncodilatador zerado — sem dose' },
      { data:'05/04 09:00', tipo:'amber', msg:'Frequência respiratória: 22 irpm' },
    ],
    msgs:[]
  },
  // ── ATENÇÃO ──
  {
    id:5, nome:'João da Silva', idade:39, sexo:'M',
    condicoes:'Hipertensão', pressao:'132/88', paColor:'amber',
    medicacao:'Estoque baixo', ultimoReg:'Há 1h', status:'atencao',
    peso:'82kg', altura:'1,75m', glicemia:'95 mg/dL', saturacao:'99%', fc:'76 bpm',
    imc:'26,8', sono:'6,5h', passos:'4.200', hrv:'45ms', temperatura:'36,5°C',
    corpo:{
      cintura:'96 cm', quadril:'99 cm', rcq:'0,97', gorduraCorporal:'24%', massaMagra:'62,3 kg',
      aguaCorporal:'55%', metabolismoBasal:'1.765 kcal/dia', musculoEsqueletico:'34%', pesoOssos:'3,4 kg',
      atualizado:'04/04/2026 · App',
      pesoIdealKg: 78,
      datas:{ peso:'26/01/2024 07:15', imc:'26/01/2024 07:15', gordura:'24/01/2024 07:15', massaMusc:'24/01/2024 07:15', cintura:'24/01/2024 07:15', altura:'18/01/2024 12:00' },
      fontes:{ peso:'Balança Inteligente', imc:'Calculado', gordura:'Balança Inteligente', massaMusc:'Balança Inteligente', cintura:'Manual', altura:'Manual' },
    },
    telefone:'(11) 95678-9012', email:'joao.silva@email.com',
    meds:['Losartana 50mg'],
    ultimaConsulta:'31/03/2025', proximaConsulta:'30/04/2025',
    historico:[
      { data:'06/04 08:40', tipo:'amber', msg:'Losartana: apenas 3 comprimidos restantes' },
      { data:'05/04 10:00', tipo:'amber', msg:'Pressão: 132/88 — acima do ideal' },
      { data:'04/04 08:00', tipo:'green', msg:'Dose tomada corretamente' },
    ],
    msgs:[],
    anotacoesConsultas: [
      { id: 1, data: '31/03/2025 11:00', texto: 'Consulta de rotina. PA 128/82. Reforço adesão à Losartana. Paciente assintomático.', medicoNome: 'Dr. Carlos Mendes', medicoCrm: 'CRM 54.321-SP' },
    ],
  },
  {
    id:6, nome:'Fernanda Lima Costa', idade:55, sexo:'F',
    condicoes:'Hipotireoidismo', pressao:'118/76', paColor:'green',
    medicacao:'1 dose atrasada', ultimoReg:'Há 3h', status:'atencao',
    peso:'64kg', altura:'1,62m', glicemia:'88 mg/dL', saturacao:'99%', fc:'72 bpm',
    imc:'24,4', sono:'4,8h', passos:'3.100', hrv:'50ms', temperatura:'36,4°C',
    telefone:'(11) 94789-0123', email:'fernanda.lima@email.com',
    meds:['Levotiroxina 75mcg'],
    ultimaConsulta:'20/03/2025', proximaConsulta:'20/04/2025',
    historico:[
      { data:'06/04 06:00', tipo:'amber', msg:'Sono: 4,8h — abaixo do ideal (3° dia)' },
      { data:'05/04 08:00', tipo:'amber', msg:'Dose de Levotiroxina não registrada' },
      { data:'04/04 08:00', tipo:'green', msg:'TSH dentro do limite: 2,1 mUI/L' },
    ],
    msgs:[]
  },
  {
    id:7, nome:'Carlos Eduardo Matos', idade:62, sexo:'M',
    condicoes:'Dislipidemia', pressao:'124/80', paColor:'green',
    medicacao:'Colesterol ↑', ultimoReg:'Há 5h', status:'atencao',
    peso:'88kg', altura:'1,78m', glicemia:'102 mg/dL', saturacao:'98%', fc:'68 bpm',
    imc:'27,8', sono:'7h', passos:'5.000', hrv:'52ms', temperatura:'36,3°C',
    telefone:'(11) 93890-1234', email:'carlos.matos@email.com',
    meds:['Atorvastatina 20mg','AAS 100mg'],
    ultimaConsulta:'22/03/2025', proximaConsulta:'22/04/2025',
    historico:[
      { data:'03/04', tipo:'amber', msg:'LDL: 168 mg/dL — acima do alvo (<130)' },
      { data:'02/04', tipo:'green', msg:'Dose de Atorvastatina tomada' },
      { data:'01/04', tipo:'green', msg:'Pressão: 122/78 — estável' },
    ],
    msgs:[]
  },
  {
    id:8, nome:'Benedita Rocha Alves', idade:71, sexo:'F',
    condicoes:'Arritmia, HAS', pressao:'140/90', paColor:'amber',
    medicacao:'Exame pendente', ultimoReg:'Há 8h', status:'atencao',
    peso:'58kg', altura:'1,57m', glicemia:'105 mg/dL', saturacao:'97%', fc:'82 bpm',
    imc:'23,5', sono:'6h', passos:'2.000', hrv:'20ms', temperatura:'36,7°C',
    telefone:'(11) 92901-2345', email:'benedita.alves@email.com',
    meds:['Amiodarona 200mg','Atenolol 25mg','Hidroclorotiazida 25mg'],
    ultimaConsulta:'15/03/2025', proximaConsulta:'15/04/2025',
    historico:[
      { data:'01/04', tipo:'amber', msg:'ECG solicitado — resultado pendente há 5 dias' },
      { data:'30/03', tipo:'amber', msg:'HRV baixo: 20ms — arritmia presente' },
      { data:'29/03', tipo:'green', msg:'Dose de Amiodarona tomada' },
    ],
    msgs:[]
  },
  {
    id:9, nome:'Hélio Nascimento Jr.', idade:48, sexo:'M',
    condicoes:'Diabetes Tipo 1', pressao:'128/84', paColor:'amber',
    medicacao:'Insulina irregular', ultimoReg:'Há 4h', status:'atencao',
    peso:'74kg', altura:'1,80m', glicemia:'187 mg/dL', saturacao:'98%', fc:'80 bpm',
    imc:'22,8', sono:'6,5h', passos:'4.800', hrv:'38ms', temperatura:'36,6°C',
    telefone:'(11) 91012-3456', email:'helio.nascimento@email.com',
    meds:['Insulina Glargina','Insulina Regular','Metformina 500mg'],
    ultimaConsulta:'29/03/2025', proximaConsulta:'12/04/2025',
    historico:[
      { data:'06/04 04:00', tipo:'amber', msg:'Glicemia: 187 mg/dL — irregular' },
      { data:'05/04 22:00', tipo:'amber', msg:'Dose de insulina não aplicada' },
      { data:'05/04 08:00', tipo:'green', msg:'Glicemia em jejum: 112 mg/dL' },
    ],
    msgs:[]
  },
  {
    id:10, nome:'Marlene Souza Barbosa', idade:59, sexo:'F',
    condicoes:'Insuficiência Renal Cr.', pressao:'148/92', paColor:'amber',
    medicacao:'Creatinina ↑', ultimoReg:'Há 6h', status:'atencao',
    peso:'70kg', altura:'1,60m', glicemia:'118 mg/dL', saturacao:'97%', fc:'75 bpm',
    imc:'27,3', sono:'6h', passos:'1.800', hrv:'30ms', temperatura:'36,9°C',
    telefone:'(11) 90123-4567', email:'marlene.barbosa@email.com',
    meds:['Bicarbonato de sódio','Eritropoetina','Furosemida 40mg'],
    ultimaConsulta:'02/04/2025', proximaConsulta:'09/04/2025',
    historico:[
      { data:'03/04', tipo:'red',   msg:'Creatinina: 2,4 mg/dL — acima do limite' },
      { data:'02/04', tipo:'amber', msg:'Hemoglobina: 9,2 g/dL — anemia moderada' },
      { data:'01/04', tipo:'green', msg:'Dose tomada corretamente' },
    ],
    msgs:[]
  },
  // ── ESTÁVEIS ──
  {
    id:11, nome:'Patricia Helena Souza', idade:44, sexo:'F',
    condicoes:'Acompanhamento geral', pressao:'120/79', paColor:'green',
    medicacao:'100% adesão', ultimoReg:'Há 30min', status:'estavel',
    peso:'60kg', altura:'1,65m', glicemia:'88 mg/dL', saturacao:'99%', fc:'66 bpm',
    imc:'22,0', sono:'7,5h', passos:'8.400', hrv:'62ms', temperatura:'36,4°C',
    corpo:{
      cintura:'82 cm', quadril:'96 cm', rcq:'0,85', gorduraCorporal:'22%', massaMagra:'46,7 kg',
      aguaCorporal:'54%', metabolismoBasal:'1.285 kcal/dia', musculoEsqueletico:'28%', pesoOssos:'2,5 kg',
      atualizado:'06/04/2026 · 07:45 · App',
      pesoIdealKg: 60,
      datas:{ peso:'25/01/2024 00:00', imc:'25/01/2024 00:00', gordura:'20/01/2024 00:00', massaMusc:'20/01/2024 00:00', cintura:'20/01/2024 00:00', altura:'15/01/2024 00:00' },
      fontes:{ peso:'Balança Inteligente', imc:'Calculado', gordura:'Balança Inteligente', massaMusc:'Balança Inteligente', cintura:'Manual', altura:'Manual' },
    },
    telefone:'(11) 99234-5001', email:'patricia.souza@email.com',
    meds:['Vitamina D','Ácido fólico'],
    ultimaConsulta:'03/04/2025', proximaConsulta:'03/07/2025',
    historico:[
      { data:'06/04 08:30', tipo:'green', msg:'Pressão: 120/79 — estável' },
      { data:'05/04 08:00', tipo:'green', msg:'Dose tomada corretamente' },
      { data:'04/04 07:00', tipo:'green', msg:'8.400 passos — meta atingida' },
    ],
    msgs:[]
  },
  {
    id:12, nome:'Marcos Vinícius Teixeira', idade:51, sexo:'M',
    condicoes:'Pós-cirúrgico cardíaco', pressao:'116/74', paColor:'green',
    medicacao:'Conforme', ultimoReg:'Há 2h', status:'estavel',
    peso:'78kg', altura:'1,76m', glicemia:'92 mg/dL', saturacao:'99%', fc:'62 bpm',
    imc:'25,2', sono:'7h', passos:'5.200', hrv:'55ms', temperatura:'36,3°C',
    telefone:'(11) 98345-5002', email:'marcos.teixeira@email.com',
    meds:['AAS 100mg','Clopidogrel 75mg','Atenolol 25mg'],
    ultimaConsulta:'01/04/2025', proximaConsulta:'01/05/2025',
    historico:[
      { data:'06/04 07:00', tipo:'green', msg:'Pressão: 116/74 — excelente' },
      { data:'05/04 08:00', tipo:'green', msg:'Doses tomadas corretamente' },
    ],
    msgs:[]
  },
  {
    id:13, nome:'Luísa Cardoso Neves', idade:33, sexo:'F',
    condicoes:'Gestante 28 semanas', pressao:'110/70', paColor:'green',
    medicacao:'Supl. em dia', ultimoReg:'Há 45min', status:'estavel',
    peso:'68kg', altura:'1,63m', glicemia:'82 mg/dL', saturacao:'99%', fc:'78 bpm',
    imc:'25,6', sono:'8h', passos:'4.000', hrv:'48ms', temperatura:'36,5°C',
    telefone:'(11) 97456-5003', email:'luisa.neves@email.com',
    meds:['Ácido fólico','Sulfato ferroso','Vitamina D'],
    ultimaConsulta:'04/04/2025', proximaConsulta:'18/04/2025',
    historico:[
      { data:'06/04 08:00', tipo:'green', msg:'Pressão: 110/70 — ideal para gestante' },
      { data:'05/04 08:00', tipo:'green', msg:'Suplementação tomada' },
    ],
    msgs:[]
  },
  {
    id:14, nome:'Edilson Batista Moreira', idade:57, sexo:'M',
    condicoes:'Cardiopatia leve', pressao:'122/78', paColor:'green',
    medicacao:'Conforme', ultimoReg:'Há 1h', status:'estavel',
    peso:'80kg', altura:'1,73m', glicemia:'98 mg/dL', saturacao:'98%', fc:'70 bpm',
    imc:'26,7', sono:'7h', passos:'6.100', hrv:'50ms', temperatura:'36,4°C',
    telefone:'(11) 96567-5004', email:'edilson.moreira@email.com',
    meds:['Atenolol 25mg','AAS 100mg'],
    ultimaConsulta:'02/04/2025', proximaConsulta:'02/05/2025',
    historico:[
      { data:'06/04 07:30', tipo:'green', msg:'FC: 70 bpm — estável' },
      { data:'05/04 08:00', tipo:'green', msg:'Doses tomadas' },
    ],
    msgs:[]
  },
  {
    id:15, nome:'Raimunda Ferreira Castro', idade:66, sexo:'F',
    condicoes:'Osteoporose', pressao:'118/76', paColor:'green',
    medicacao:'Conforme', ultimoReg:'Há 3h', status:'estavel',
    peso:'55kg', altura:'1,54m', glicemia:'90 mg/dL', saturacao:'98%', fc:'68 bpm',
    imc:'23,2', sono:'7,5h', passos:'3.400', hrv:'44ms', temperatura:'36,2°C',
    telefone:'(11) 95678-5005', email:'raimunda.castro@email.com',
    meds:['Carbonato de cálcio','Vitamina D','Alendronato'],
    ultimaConsulta:'26/03/2025', proximaConsulta:'26/06/2025',
    historico:[
      { data:'02/04', tipo:'green', msg:'Hemoglobina: 9,2 g/dL — monitorar' },
      { data:'01/04', tipo:'green', msg:'Dose tomada corretamente' },
    ],
    msgs:[]
  },
  {
    id:16, nome:'Gilson Pereira Andrade', idade:43, sexo:'M',
    condicoes:'Acompanhamento', pressao:'120/80', paColor:'green',
    medicacao:'100% adesão', ultimoReg:'Há 1h', status:'estavel',
    peso:'75kg', altura:'1,78m', glicemia:'95 mg/dL', saturacao:'99%', fc:'64 bpm',
    imc:'23,7', sono:'7h', passos:'7.800', hrv:'60ms', temperatura:'36,3°C',
    telefone:'(11) 94789-5006', email:'gilson.andrade@email.com',
    meds:['Losartana 25mg'],
    ultimaConsulta:'04/04/2025', proximaConsulta:'04/07/2025',
    historico:[
      { data:'06/04 08:00', tipo:'green', msg:'Pressão: 120/80 — estável' },
      { data:'05/04 08:00', tipo:'green', msg:'Dose tomada corretamente' },
    ],
    msgs:[]
  },
  {
    id:17, nome:'Sueli Aparecida Moura', idade:49, sexo:'F',
    condicoes:'Enxaqueca crônica', pressao:'114/72', paColor:'green',
    medicacao:'Conforme', ultimoReg:'Há 2h', status:'estavel',
    peso:'62kg', altura:'1,61m', glicemia:'87 mg/dL', saturacao:'99%', fc:'69 bpm',
    imc:'23,9', sono:'7,5h', passos:'5.500', hrv:'55ms', temperatura:'36,2°C',
    telefone:'(11) 93890-5007', email:'sueli.moura@email.com',
    meds:['Topiramato 25mg','Naratriptano'],
    ultimaConsulta:'30/03/2025', proximaConsulta:'30/05/2025',
    historico:[
      { data:'06/04 07:30', tipo:'green', msg:'Sem episódio de enxaqueca — 5 dias' },
      { data:'05/04 08:00', tipo:'green', msg:'Dose tomada corretamente' },
    ],
    msgs:[]
  },
  {
    id:18, nome:'Teófilo Braga Martins', idade:38, sexo:'M',
    condicoes:'Asma controlada', pressao:'118/76', paColor:'green',
    medicacao:'Conforme', ultimoReg:'Há 4h', status:'estavel',
    peso:'70kg', altura:'1,74m', glicemia:'91 mg/dL', saturacao:'98%', fc:'71 bpm',
    imc:'23,1', sono:'7h', passos:'6.300', hrv:'58ms', temperatura:'36,4°C',
    telefone:'(11) 92901-5008', email:'teofilo.martins@email.com',
    meds:['Budesonida 200mcg','Salbutamol SOS'],
    ultimaConsulta:'27/03/2025', proximaConsulta:'27/06/2025',
    historico:[
      { data:'06/04 06:00', tipo:'green', msg:'Saturação: 98% — estável' },
      { data:'05/04 08:00', tipo:'green', msg:'Doses tomadas' },
    ],
    msgs:[]
  },
];

/** Próximo id ao cadastrar novos pacientes (demo) */
let pacienteNextId = 19;

/**
 * Códigos de vínculo (demo): titular cadastrado no SaaS/app; a clínica só vê placeholder até o aceite.
 * Após simular aprovação no perfil, os dados abaixo substituem o placeholder.
 */
const DEMO_CODIGOS_VINCULO = {
  'TS-7K2M-X9': {
    idTitularSaaS: 'tt_demo_luciana',
    dadosPosAceite() {
      return {
        nome: 'Luciana Martins Rocha',
        idade: 42,
        sexo: 'F',
        condicoes: 'Hipertensão controlada',
        pressao: '128/82',
        paColor: 'green',
        medicacao: 'Losartana 50 mg',
        telefone: '(11) 98123-4400',
        email: 'luciana.m.rocha@email.com',
        peso: '68kg',
        altura: '1,62m',
        imc: '25,9',
        glicemia: '98 mg/dL',
        saturacao: '99%',
        fc: '68 bpm',
        sono: '6,5h',
        passos: '4521',
        hrv: '42ms',
        temperatura: '36,4°C',
        ultimoReg: 'Sincronizado (app)',
        meds: ['Losartana 50 mg'],
        corpo: {
          gorduraCorporal: '28%',
          massaMagra: '46,2 kg',
          cintura: '82 cm',
          atualizado: 'Hoje (app)',
        },
      };
    },
  },
  'TS-3N8P-Q1': {
    idTitularSaaS: 'tt_demo_ricardo',
    dadosPosAceite() {
      return {
        nome: 'Ricardo Almeida Souza',
        idade: 55,
        sexo: 'M',
        condicoes: 'Diabetes tipo 2 · dislipidemia',
        pressao: '132/84',
        paColor: 'amber',
        medicacao: 'Metformina 850 mg · Sinvastatina 20 mg',
        telefone: '(21) 98765-1122',
        email: 'ricardo.a.souza@email.com',
        peso: '88kg',
        altura: '1,74m',
        imc: '29,1',
        glicemia: '118 mg/dL',
        saturacao: '97%',
        fc: '74 bpm',
        sono: '5,5h',
        passos: '3102',
        hrv: '31ms',
        temperatura: '36,6°C',
        ultimoReg: 'Sincronizado (app)',
        meds: ['Metformina 850 mg', 'Sinvastatina 20 mg'],
        corpo: {
          gorduraCorporal: '26%',
          massaMagra: '58 kg',
          cintura: '98 cm',
          atualizado: 'Hoje (app)',
        },
      };
    },
  },
};

let cadPacModo = 'cadastro';

function normalizeCodigoVinculo(s) {
  return String(s || '').trim().replace(/\s+/g, '').toUpperCase();
}

function codigoVinculoJaUsadoNaCarteira(code) {
  return pacientes.some(
    x => x.vinculoApp && x.vinculoApp.codigoInformado === code && x.vinculoApp.estado !== 'recusado',
  );
}

function pacienteVinculoPendente(p) {
  return p.vinculoApp && p.vinculoApp.estado === 'pendente';
}

/* Medidas corporais extras (mock) — mescla com peso/altura/imc do paciente */
function corpoParaPaciente(p) {
  const x = p.corpo || {};
  return {
    peso: x.peso != null ? x.peso : p.peso,
    altura: x.altura != null ? x.altura : p.altura,
    imc: x.imc != null ? x.imc : p.imc,
    cintura: x.cintura,
    quadril: x.quadril,
    rcq: x.rcq,
    gorduraCorporal: x.gorduraCorporal,
    massaMagra: x.massaMagra,
    aguaCorporal: x.aguaCorporal,
    metabolismoBasal: x.metabolismoBasal,
    musculoEsqueletico: x.musculoEsqueletico,
    pesoOssos: x.pesoOssos,
    atualizado: x.atualizado,
  };
}

function parseNumCorpoRaw(s) {
  if (s == null || s === '') return null;
  const n = parseFloat(String(s).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Modelo da aba Corpo (layout tipo app — demo comercial) */
function dadosCorpoParaPainel(p) {
  const c = corpoParaPaciente(p);
  const cx = p.corpo || {};
  const m = parseNumCorpoRaw(c.altura);
  const kg = parseNumCorpoRaw(c.peso);
  let imc = parseNumCorpoRaw(c.imc);
  if (imc == null && m && kg) imc = Math.round((kg / (m * m)) * 10) / 10;

  const idealPeso = cx.pesoIdealKg != null ? cx.pesoIdealKg : (m ? Math.round(22 * m * m * 10) / 10 : null);
  const defData = k => (cx.datas && cx.datas[k]) || '—';
  const defFonte = (k, fb) => (cx.fontes && cx.fontes[k]) || fb;

  let pesoSev = 'ok';
  if (idealPeso != null && kg != null) {
    if (kg > idealPeso + 0.5) pesoSev = 'bad';
    else if (kg < idealPeso - 2) pesoSev = 'warn';
  }

  let imcSev = 'ok';
  if (imc != null) {
    if (imc >= 30 || imc < 18.5) imcSev = 'bad';
    else if (imc >= 25) imcSev = 'warn';
  } else imcSev = 'muted';

  const gPct = parseNumCorpoRaw(c.gorduraCorporal);
  const gMin = p.sexo === 'F' ? 20 : 15;
  const gMax = p.sexo === 'F' ? 32 : 25;
  let gSev = 'ok';
  if (gPct != null) {
    if (gPct > gMax + 2 || gPct < gMin - 3) gSev = 'bad';
    else if (gPct > gMax || gPct < gMin) gSev = 'warn';
  } else gSev = 'muted';

  const mmKg = parseNumCorpoRaw(c.massaMagra);
  const mmMin = p.sexo === 'F' ? 38 : 52;
  const mmMax = p.sexo === 'F' ? 52 : 66;
  let mmSev = 'ok';
  if (mmKg != null) {
    if (mmKg < mmMin - 2) mmSev = 'bad';
    else if (mmKg < mmMin || mmKg > mmMax + 4) mmSev = 'warn';
  } else mmSev = 'muted';

  const ccm = parseNumCorpoRaw(c.cintura);
  const cLim = p.sexo === 'F' ? 88 : 94;
  let cinSev = 'ok';
  if (ccm != null) {
    if (ccm >= cLim) cinSev = 'bad';
    else if (ccm >= cLim - 6) cinSev = 'warn';
  } else cinSev = 'muted';

  const altSev = m ? 'ok' : 'muted';

  return {
    peso: {
      kg, ideal: idealPeso, text: c.peso || '—',
      data: defData('peso'), fonte: defFonte('peso', 'Balança Inteligente'), sev: pesoSev,
    },
    imc: {
      val: imc,
      data: defData('imc'), fonte: defFonte('imc', 'Calculado'), sev: imcSev,
    },
    gordura: {
      text: c.gorduraCorporal || '—', pct: gPct,
      data: defData('gordura'), fonte: defFonte('gordura', 'Balança Inteligente'), sev: gSev,
      idealLabel: `${gMin}–${gMax}`,
    },
    massaMusc: {
      text: c.massaMagra || '—', kg: mmKg,
      data: defData('massaMusc'), fonte: defFonte('massaMusc', 'Balança Inteligente'), sev: mmSev,
      mmMin, mmMax,
    },
    cintura: {
      text: c.cintura || '—', lim: cLim,
      data: defData('cintura'), fonte: defFonte('cintura', 'Manual'), sev: cinSev,
    },
    altura: {
      text: c.altura || '—', m,
      data: defData('altura'), fonte: defFonte('altura', 'Manual'), sev: altSev,
    },
  };
}

const alertas = [
  { id:1, icon:'🚨', severity:'red',   msg:'Pressão arterial 178/102 mmHg — muito elevada', paciente:'Maria Aparecida Santos',  detalhe:'Há 14 horas sem novo registro', ativo:true, pacienteId:1, criadoEm:'2026-04-10T09:30:00' },
  { id:2, icon:'💊', severity:'red',   msg:'Estoque de Furosemida zerado',                  paciente:'Roberto Ferreira Lima',   detalhe:'Crítico — ICC em tratamento',   ativo:true, pacienteId:2, criadoEm:'2026-04-10T07:15:00' },
  { id:3, icon:'🩺', severity:'red',   msg:'Glicemia 310 mg/dL — fora do controle',         paciente:'Antônia Gonçalves Ramos', detalhe:'Registrado às 07:22',           ativo:true, pacienteId:3, criadoEm:'2026-04-10T07:22:00' },
  { id:4, icon:'😮', severity:'red',   msg:'Saturação O₂ 91% — abaixo do limite',           paciente:'Severino Costa Filho',    detalhe:'Monitorar com urgência',        ativo:true, pacienteId:4, criadoEm:'2026-04-09T22:40:00' },
  { id:5, icon:'⚠️', severity:'amber', msg:'Losartana com apenas 3 comp. restantes',      paciente:'João da Silva',           detalhe:'Renovar receita até 10/04',     ativo:true, pacienteId:5, criadoEm:'2026-04-09T14:20:00' },
  { id:6, icon:'😴', severity:'amber', msg:'Sono abaixo de 5h por 3 dias seguidos',       paciente:'Fernanda Lima Costa',     detalhe:'Pode afetar controle hormonal', ativo:true, pacienteId:6, criadoEm:'2026-04-08T06:00:00' },
  { id:7, icon:'💉', severity:'amber', msg:'Insulina irregular há 2 dias',                paciente:'Hélio Nascimento Jr.',    detalhe:'Glicemia instável',             ativo:true, pacienteId:9, criadoEm:'2026-04-07T18:30:00' },
  { id:8, icon:'📋', severity:'amber', msg:'ECG solicitado há 5 dias sem resultado',      paciente:'Benedita Rocha Alves',    detalhe:'Exame pendente na clínica',       ativo:true, pacienteId:8, criadoEm:'2026-04-05T11:00:00' },
  { id:9, icon:'🔬', severity:'amber', msg:'Creatinina acima de 2,4 mg/dL',                 paciente:'Marlene Souza Barbosa',   detalhe:'Necessita reavaliação nephro',  ativo:true, pacienteId:10, criadoEm:'2026-04-03T16:45:00' },
  { id:10,icon:'🩸', severity:'amber', msg:'Hemoglobina 9,2 g/dL — anemia moderada',        paciente:'Raimunda Ferreira Castro',detalhe:'Registrado em exame de 02/04',  ativo:true, pacienteId:15, criadoEm:'2026-04-02T10:00:00' },
];

/** Agenda clínica — mesma base usada no app do paciente (lembretes / confirmação) */
let agendaNextId = 200;

/** Cadastro completo de profissionais (substitui o antigo profissionaisAgenda) */
let medicos = [
  {
    id: 1,
    nome: 'Dr. Carlos Mendes',
    crm: 'CRM 54.321-SP',
    especialidade: 'Cardiologia',
    email: 'carlos.mendes@teepsaude.com',
    telefone: '(11) 98765-4321',
    avatar: '👨‍⚕️',
    fotoUrl: null,
    cor: '#7c3aed',
    ativo: true,
    login: { usuario: 'carlos.mendes', senha: 'medico1' },
    consultaDuracao: 30,
    bio: 'Cardiologista com foco em hipertensão e insuficiência cardíaca.',
    horarioAtendimento: {
      segunda: ['08:00', '17:00'], terca: ['08:00', '17:00'], quarta: ['08:00', '17:00'],
      quinta: ['08:00', '17:00'], sexta: ['08:00', '16:00'],
    },
  },
  {
    id: 2,
    nome: 'Dra. Ana Paula Ribeiro',
    crm: 'CRM 61.087-SP',
    especialidade: 'Clínica Geral',
    email: 'ana.ribeiro@teepsaude.com',
    telefone: '(11) 97654-3210',
    avatar: '👩‍⚕️',
    fotoUrl: null,
    cor: '#dc2626',
    ativo: true,
    login: { usuario: 'ana.ribeiro', senha: 'medico2' },
    consultaDuracao: 30,
    bio: 'Medicina de família e promoção da saúde.',
    horarioAtendimento: {
      segunda: ['08:00', '17:00'], terca: ['08:00', '17:00'], quarta: ['08:00', '12:00'],
      quinta: ['08:00', '17:00'], sexta: ['08:00', '16:00'],
    },
  },
  {
    id: 3,
    nome: 'Dr. Ricardo Alves',
    crm: 'CRM 49.230-SP',
    especialidade: 'Endocrinologia',
    email: 'ricardo.alves@teepsaude.com',
    telefone: '(11) 96543-2109',
    avatar: '👨‍⚕️',
    fotoUrl: null,
    cor: '#d97706',
    ativo: true,
    login: { usuario: 'ricardo.alves', senha: 'medico3' },
    consultaDuracao: 30,
    bio: 'Diabetes, tireoide e obesidade.',
    horarioAtendimento: {
      segunda: ['08:00', '17:00'], terca: ['08:00', '17:00'], quarta: ['08:00', '17:00'],
      quinta: ['08:00', '17:00'], sexta: ['08:00', '16:00'],
    },
  },
  {
    id: 4,
    nome: 'Dra. Juliana Prado',
    crm: 'CRM 76.551-SP',
    especialidade: 'Ginecologia / Pré-natal',
    email: 'juliana.prado@teepsaude.com',
    telefone: '(11) 95432-1098',
    avatar: '👩‍⚕️',
    fotoUrl: null,
    cor: '#16a34a',
    ativo: true,
    login: { usuario: 'juliana.prado', senha: 'medico4' },
    consultaDuracao: 30,
    bio: 'Pré-natal de baixo e alto risco.',
    horarioAtendimento: {
      segunda: ['08:00', '17:00'], terca: ['08:00', '17:00'], quarta: ['08:00', '17:00'],
      quinta: ['08:00', '17:00'], sexta: ['08:00', '16:00'],
    },
  },
];

function profissionaisParaAgenda() {
  return medicos
    .filter(m => m.ativo !== false)
    .map(m => ({
      id: m.id,
      nome: m.nome,
      especialidade: m.especialidade,
      crm: m.crm,
    }));
}

const ESPECIALIDADES_PADRAO = [
  'Cardiologia', 'Clínica Geral', 'Endocrinologia', 'Ginecologia', 'Pediatria', 'Ortopedia',
  'Neurologia', 'Psiquiatria', 'Dermatologia', 'Urologia', 'Oftalmologia', 'Otorrinolaringologia',
];

/** Dosagens e frequências (reutilizados na receita e no modal de medicação) */
const dosagensCatalogoOpts = ['', '5 mg', '10 mg', '12,5 mg', '25 mg', '50 mg', '75 mg', '100 mg', '500 mg', '850 mg', '1000 mg', 'Outra (ver bula)'];
const frequenciasCatalogoOpts = [
  '',
  '1x ao dia',
  '2x ao dia',
  '3x ao dia',
  '4x ao dia',
  '12/12h',
  '8/8h',
  '6/6h',
  'Sob demanda',
  'Semanal',
  'Quinzenal',
];

let agendaHoje = [
  { id:1, hora:'08:00', pacienteId:1,  paciente:'Maria Aparecida Santos',  medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Retorno urgente · Presencial',   dotColor:'var(--red)',    badge:'agendado', syncApp:true },
  { id:2, hora:'09:00', pacienteId:4,  paciente:'Severino Costa Filho',    medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Avaliação DPOC · Presencial',    dotColor:'var(--amber)', badge:'agendado', syncApp:true },
  { id:3, hora:'10:00', pacienteId:7,  paciente:'Carlos Eduardo Matos',    medicoId:2, medico:'Dra. Ana Paula Ribeiro', tipo:'Avaliação · Teleconsulta',       dotColor:'var(--amber)', badge:'agendado', syncApp:true },
  { id:4, hora:'11:30', pacienteId:13, paciente:'Luísa Cardoso Neves',     medicoId:4, medico:'Dra. Juliana Prado', tipo:'Pré-natal · Presencial',         dotColor:'var(--green)', badge:'realizado', syncApp:true },
  { id:5, hora:'14:00', pacienteId:5,  paciente:'João da Silva',            medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Retorno · Presencial',           dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:6, hora:'15:00', pacienteId:9,  paciente:'Hélio Nascimento Jr.',     medicoId:3, medico:'Dr. Ricardo Alves', tipo:'Ajuste insulina · Teleconsulta', dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:7, hora:'16:30', pacienteId:11, paciente:'Patricia Helena Souza',   medicoId:2, medico:'Dra. Ana Paula Ribeiro', tipo:'Check-up · Teleconsulta',        dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:20, hora:'17:00', pacienteId:6, paciente:'Fernanda Lima Costa',      medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Acompanhamento hormonal · Presencial', dotColor:'var(--border)', badge:'agendado', syncApp:true },
  { id:21, hora:'17:30', pacienteId:8, paciente:'Benedita Rocha Alves',     medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Revisão cardiológica · Presencial',    dotColor:'var(--border)', badge:'agendado', syncApp:true },
  { id:22, hora:'18:00', pacienteId:14, paciente:'Edilson Batista Moreira', medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Check-up · Presencial',               dotColor:'var(--border)', badge:'agendado', syncApp:true },
];

/** Agendamentos em datas além de hoje/amanhã (dataIso: YYYY-MM-DD) */
let agendaFutura = [];

let agendaAmanha = [
  { id:8, hora:'08:30', pacienteId:3,  paciente:'Antônia Gonçalves Ramos',  medicoId:3, medico:'Dr. Ricardo Alves', tipo:'Controle glicemia · Presencial', dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:9, hora:'10:00', pacienteId:12, paciente:'Marcos Vinícius Teixeira', medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Pós-op 30 dias · Presencial',    dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:10, hora:'11:00', pacienteId:2, paciente:'Roberto Ferreira Lima',    medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Revisão medicação · Presencial', dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:11, hora:'14:30', pacienteId:16, paciente:'Gilson Pereira Andrade',   medicoId:2, medico:'Dra. Ana Paula Ribeiro', tipo:'Rotina · Teleconsulta',          dotColor:'var(--border)',badge:'agendado', syncApp:true },
  { id:23, hora:'09:30', pacienteId:17, paciente:'Sueli Aparecida Moura',    medicoId:1, medico:'Dr. Carlos Mendes', tipo:'Retorno · Presencial',           dotColor:'var(--border)', badge:'agendado', syncApp:true },
];

const EXAME_TIPOS_LISTA = ['Cardiológico', 'Laboratorial', 'Imagem', 'Outro'];

/** Fluxo operacional da solicitação (gestão clínica) */
const EXAME_STATUS_FLUXO_LISTA = [
  'solicitado', 'agendado', 'realizado', 'resultado_recebido', 'concluido',
];

const EXAME_STATUS_FLUXO_LABEL = {
  solicitado: 'Solicitado',
  agendado: 'Agendado',
  realizado: 'Realizado',
  resultado_recebido: 'Resultado recebido',
  concluido: 'Concluído',
};

/** SVG mínimo — preview de laudo na demo */
const EXAME_DEMO_LAUDO_DATA_URL =
  'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520"><rect fill="#f8f7fc" width="100%" height="100%"/><text x="24" y="48" font-family="sans-serif" font-size="16" fill="#7c3aed">Laudo (demonstração)</text><text x="24" y="80" font-family="sans-serif" font-size="12" fill="#6b7280">Anexo simulado — em produção viria do app ou laboratório.</text></svg>',
  );

let exameSolicitacaoNextId = 13;
let exameAnexoCatalogoNextId = 5000;

/**
 * Solicitações de exames (gestão). Resultados = anexos aqui + examesArquivos do paciente.
 * compartilhadoMedicoIds: médicos que podem ver o resultado após autorização do paciente.
 */
let exames = [
  { id:1, nome:'Eletrocardiograma', pacienteId:8, paciente:'Benedita Rocha Alves', data:'01/04/2025', dataIso:'2025-04-01', tipo:'Cardiológico', prioridade:'normal', statusFluxo:'solicitado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[1], autorizadoPaciente:true },
  { id:2, nome:'Hemograma Completo', pacienteId:15, paciente:'Raimunda Ferreira Castro', data:'02/04/2025', dataIso:'2025-04-02', tipo:'Laboratorial', prioridade:'normal', statusFluxo:'concluido', origem:'clinica', anexos:[{ id:5001, titulo:'Hemograma — laudo', nomeArquivo:'hemograma.pdf', mime:'application/pdf', dataRegistro:'02/04/2025 11:00', dataUrl:EXAME_DEMO_LAUDO_DATA_URL }], compartilhadoMedicoIds:[1, 2], autorizadoPaciente:true },
  { id:3, nome:'Glicemia em jejum', pacienteId:3, paciente:'Antônia Gonçalves Ramos', data:'06/04/2025', dataIso:'2025-04-06', tipo:'Laboratorial', prioridade:'urgente', statusFluxo:'agendado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[3], autorizadoPaciente:true },
  { id:4, nome:'Ecocardiograma', pacienteId:2, paciente:'Roberto Ferreira Lima', data:'05/04/2025', dataIso:'2025-04-05', tipo:'Imagem', prioridade:'normal', statusFluxo:'agendado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[1], autorizadoPaciente:true },
  { id:5, nome:'Raio-X de Tórax', pacienteId:4, paciente:'Severino Costa Filho', data:'04/04/2025', dataIso:'2025-04-04', tipo:'Imagem', prioridade:'urgente', statusFluxo:'realizado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[1], autorizadoPaciente:true },
  { id:6, nome:'Função Renal (Creatinina)', pacienteId:10, paciente:'Marlene Souza Barbosa', data:'03/04/2025', dataIso:'2025-04-03', tipo:'Laboratorial', prioridade:'urgente', statusFluxo:'resultado_recebido', origem:'clinica', anexos:[{ id:5002, titulo:'Creatinina', nomeArquivo:'creatinina.pdf', mime:'application/pdf', dataRegistro:'05/04/2025 09:30', dataUrl:EXAME_DEMO_LAUDO_DATA_URL }], compartilhadoMedicoIds:[2], autorizadoPaciente:true },
  { id:7, nome:'Perfil Lipídico', pacienteId:7, paciente:'Carlos Eduardo Matos', data:'25/03/2025', dataIso:'2025-03-25', tipo:'Laboratorial', prioridade:'normal', statusFluxo:'concluido', origem:'clinica', anexos:[{ id:5003, titulo:'Perfil lipídico', nomeArquivo:'lipidico.pdf', mime:'application/pdf', dataRegistro:'26/03/2025 16:00', dataUrl:EXAME_DEMO_LAUDO_DATA_URL }], compartilhadoMedicoIds:[1, 2], autorizadoPaciente:true },
  { id:8, nome:'TSH e T4 livre', pacienteId:6, paciente:'Fernanda Lima Costa', data:'28/03/2025', dataIso:'2025-03-28', tipo:'Laboratorial', prioridade:'normal', statusFluxo:'concluido', origem:'paciente', anexos:[{ id:5004, titulo:'TSH / T4', nomeArquivo:'tsh.jpg', mime:'image/jpeg', dataRegistro:'29/03/2025 08:00', dataUrl:EXAME_DEMO_LAUDO_DATA_URL }], compartilhadoMedicoIds:[2], autorizadoPaciente:true },
  { id:9, nome:'Ultrassom obstétrico', pacienteId:13, paciente:'Luísa Cardoso Neves', data:'04/04/2025', dataIso:'2025-04-04', tipo:'Imagem', prioridade:'normal', statusFluxo:'concluido', origem:'clinica', anexos:[{ id:5005, titulo:'US obstétrico', nomeArquivo:'us.pdf', mime:'application/pdf', dataRegistro:'04/04/2025 14:00', dataUrl:EXAME_DEMO_LAUDO_DATA_URL }], compartilhadoMedicoIds:[4], autorizadoPaciente:true },
  { id:10, nome:'Monitorização Holter 24h', pacienteId:1, paciente:'Maria Aparecida Santos', data:'08/04/2025', dataIso:'2025-04-08', tipo:'Cardiológico', prioridade:'urgente', statusFluxo:'solicitado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[1], autorizadoPaciente:true },
  { id:11, nome:'Curva glicêmica', pacienteId:9, paciente:'Hélio Nascimento Jr.', data:'07/04/2025', dataIso:'2025-04-07', tipo:'Laboratorial', prioridade:'normal', statusFluxo:'solicitado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[3], autorizadoPaciente:true },
  { id:12, nome:'Densitometria óssea', pacienteId:15, paciente:'Raimunda Ferreira Castro', data:'15/04/2025', dataIso:'2025-04-15', tipo:'Imagem', prioridade:'normal', statusFluxo:'agendado', origem:'clinica', anexos:[], compartilhadoMedicoIds:[1], autorizadoPaciente:true },
];

const medicacoes = [
  { nome:'Losartana 50mg',     paciente:'Maria Aparecida Santos',   estoque:5,  total:30, status:'critico', proxRenovacao:'08/04/2025' },
  { nome:'Furosemida 40mg',    paciente:'Roberto Ferreira Lima',    estoque:0,  total:30, status:'critico', proxRenovacao:'06/04/2025' },
  { nome:'Insulina Glargina',  paciente:'Hélio Nascimento Jr.',     estoque:8,  total:30, status:'baixo',   proxRenovacao:'10/04/2025' },
  { nome:'Broncodilatador',    paciente:'Severino Costa Filho',     estoque:2,  total:20, status:'critico', proxRenovacao:'07/04/2025' },
  { nome:'Glibenclamida 5mg',  paciente:'Antônia Gonçalves Ramos',  estoque:12, total:30, status:'baixo',   proxRenovacao:'14/04/2025' },
  { nome:'Amiodarona 200mg',   paciente:'Benedita Rocha Alves',     estoque:20, total:30, status:'ok',      proxRenovacao:'20/04/2025' },
  { nome:'Atorvastatina 20mg', paciente:'Carlos Eduardo Matos',     estoque:25, total:30, status:'ok',      proxRenovacao:'25/04/2025' },
  { nome:'Levotiroxina 75mcg', paciente:'Fernanda Lima Costa',      estoque:18, total:30, status:'ok',      proxRenovacao:'18/04/2025' },
  { nome:'Warfarina 5mg',      paciente:'Roberto Ferreira Lima',    estoque:14, total:30, status:'baixo',   proxRenovacao:'13/04/2025' },
  { nome:'Metformina 850mg',   paciente:'Antônia Gonçalves Ramos',  estoque:28, total:30, status:'ok',      proxRenovacao:'30/04/2025' },
  { nome:'Clopidogrel 75mg',   paciente:'Marcos Vinícius Teixeira', estoque:22, total:30, status:'ok',      proxRenovacao:'22/04/2025' },
  { nome:'AAS 100mg',          paciente:'Edilson Batista Moreira',  estoque:30, total:30, status:'ok',      proxRenovacao:'06/05/2025' },
];

const notificacoes = [
  { icon:'🚨', msg:'Glicemia crítica: Antônia G. Ramos — 310 mg/dL', time:'Há 2h' },
  { icon:'💊', msg:'Estoque zerado: Furosemida — Roberto F. Lima',    time:'Há 4h' },
  { icon:'📅', msg:'Consulta em 30min: Carlos Eduardo Matos',         time:'Às 10:00' },
  { icon:'🩺', msg:'Exame liberado: TSH de Fernanda Lima Costa',      time:'Hoje' },
  { icon:'⚠️', msg:'Losartana em falta: João da Silva',               time:'Ontem' },
];

/* Modelos de mensagem rápida */
const msgTemplates = [
  'Olá, por favor lembre-se de tomar sua medicação hoje.',
  'Identificamos um dado fora do parâmetro. Por favor entre em contato.',
  'Sua consulta está próxima. Confirme sua presença.',
  'Seu exame está disponível. Passe na clínica para buscar.',
  'Por favor atualize seus sinais vitais pelo aplicativo.',
];

/* Lista para busca (demo comercial — um por vez) */
const catalogoMedicamentos = [
  'AAS', 'Amoxicilina', 'Amlodipina', 'Atorvastatina', 'Azitromicina', 'Budesonida', 'Clopidogrel',
  'Dipirona', 'Digoxina', 'Enalapril', 'Eritropoetina', 'Furosemida', 'Glibenclamida', 'Hidroclorotiazida',
  'Ibuprofeno', 'Insulina Glargina', 'Insulina Regular', 'Ipratrópio', 'Losartana', 'Levotiroxina',
  'Metformina', 'Metoprolol', 'Omeprazol', 'Paracetamol', 'Sinvastatina', 'Sertralina',
  'Salbutamol', 'Topiramato', 'Warfarina', 'Amiodarona', 'Atenolol', 'Carbonato de cálcio',
  'Losartana potássica', 'Ácido fólico', 'Vitamina D', 'Naratriptano',
];

const navPrincipal = [
  { icon:'👥', label:'Pacientes',  page:'pacientes',  badge: pacientes.filter(p=>p.status==='critico').length, badgeColor:'' },
  { icon:'📅', label:'Agenda',     page:'agenda' },
  { icon:'🩺', label:'Painel',     page:'painel' },
];
/** Itens fixos da seção Análise (exames entram via navAnaliseParaSessao no app) */
const navAnalise = [
  { icon:'💊', label:'Medicações', page:'medicacoes', badge: medicacoes.filter(m=>m.status==='critico').length, badgeColor:'' },
];
const navClinica = [
  { icon:'👨‍⚕️', label:'Médicos', page:'medicos' },
  { icon:'⚙️', label:'Configurações', page:'configuracoes' },
];
