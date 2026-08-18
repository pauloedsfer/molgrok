/* MOLBOX — progresso do estudante.

   Guarda tudo no aparelho, em localStorage. Nada sai daqui: não há servidor,
   não há cadastro, não há coleta. O que o aplicativo sabe sobre o aluno fica
   com o aluno.

   O dado mais útil deste módulo não é o XP: é o mapa de dificuldades, que
   conta quais tipos de conta a pessoa erra mais. Serve ao estudante para
   saber onde treinar e ao professor para saber o que revisar no quadro.
*/

const CHAVE_PROGRESSO = "molbox.progresso.v1";

const MEDALHAS = [
  { id: "primeiro",    nome: "Primeira travessia", condicao: (p) => p.totalAcertos >= 1,  descricao: "Acertar o primeiro exercício" },
  { id: "dez",         nome: "Dez de bancada",      condicao: (p) => p.totalAcertos >= 10, descricao: "Acertar dez exercícios" },
  { id: "cinquenta",   nome: "Meio cento",          condicao: (p) => p.totalAcertos >= 50, descricao: "Acertar cinquenta exercícios" },
  { id: "sequencia5",  nome: "Cinco em sequência",  condicao: (p) => p.melhorSequencia >= 5,  descricao: "Cinco acertos seguidos" },
  { id: "sequencia15", nome: "Quinze em sequência", condicao: (p) => p.melhorSequencia >= 15, descricao: "Quinze acertos seguidos" },
  { id: "degrau2",     nome: "Contador",            condicao: (p) => p.desbloqueado >= 2, descricao: "Liberar o degrau da contagem" },
  { id: "degrau3",     nome: "Atravessou a ponte",  condicao: (p) => p.desbloqueado >= 3, descricao: "Liberar o degrau do mol" },
  { id: "degrau4",     nome: "Química de verdade",  condicao: (p) => p.desbloqueado >= 4, descricao: "Liberar o degrau da reação" },
  { id: "ofensiva3",   nome: "Três dias seguidos",  condicao: (p) => p.melhorOfensiva >= 3, descricao: "Treinar em três dias consecutivos" },
  { id: "ofensiva7",   nome: "Semana inteira",      condicao: (p) => p.melhorOfensiva >= 7, descricao: "Treinar em sete dias consecutivos" },
  { id: "semDica",     nome: "Sem colinha",         condicao: (p) => p.acertosSemDica >= 20, descricao: "Vinte acertos sem abrir a dica" },
];

function progressoVazio() {
  return {
    xp: 0,
    totalAcertos: 0,
    totalTentativas: 0,
    acertosSemDica: 0,
    sequencia: 0,
    melhorSequencia: 0,
    desbloqueado: 1,
    porDegrau: { 1: { acertos: 0, erros: 0 }, 2: { acertos: 0, erros: 0 }, 3: { acertos: 0, erros: 0 }, 4: { acertos: 0, erros: 0 } },
    porTipo: {},          // { tipo: { acertos, erros } }
    ofensiva: 0,
    melhorOfensiva: 0,
    ultimoDia: null,
    medalhas: [],
  };
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasEntre(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function carregarProgresso() {
  try {
    const bruto = localStorage.getItem(CHAVE_PROGRESSO);
    if (!bruto) return progressoVazio();
    const p = Object.assign(progressoVazio(), JSON.parse(bruto));
    // garante a forma esperada mesmo se o dado guardado for de uma versão anterior
    for (const d of DEGRAUS) if (!p.porDegrau[d.n]) p.porDegrau[d.n] = { acertos: 0, erros: 0 };
    if (!p.porTipo) p.porTipo = {};
    if (!Array.isArray(p.medalhas)) p.medalhas = [];
    return p;
  } catch (e) {
    return progressoVazio();
  }
}

function salvarProgresso(p) {
  try { localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(p)); } catch (e) { /* segue sem guardar */ }
}

/* Marca presença do dia e atualiza a ofensiva. Chamar ao abrir o treino. */
function registrarDia(p) {
  const hoje = hojeISO();
  if (p.ultimoDia === hoje) return p;
  if (p.ultimoDia && diasEntre(p.ultimoDia, hoje) === 1) p.ofensiva += 1;
  else p.ofensiva = 1;
  p.ultimoDia = hoje;
  p.melhorOfensiva = Math.max(p.melhorOfensiva, p.ofensiva);
  return p;
}

function nivel(xp) {
  // cada nível custa um pouco mais que o anterior
  return Math.floor((-1 + Math.sqrt(1 + xp / 12.5)) / 2) + 1;
}
function xpDoNivel(n) { return Math.round(12.5 * (2 * (n - 1) + 1) * (2 * (n - 1) + 1) - 12.5); }
function xpParaProximoNivel(xp) {
  const n = nivel(xp);
  const base = xpDoNivel(n), topo = xpDoNivel(n + 1);
  return { nivel: n, atual: xp - base, necessario: topo - base };
}

/* Registra o resultado de um exercício e devolve o que mudou, para a interface
   poder comemorar de forma específica. */
function registrarResposta(p, exercicio, acertou, usouDica) {
  const d = exercicio.degrau;
  p.totalTentativas += 1;
  if (!p.porTipo[exercicio.tipo]) p.porTipo[exercicio.tipo] = { acertos: 0, erros: 0 };

  let ganho = 0;
  const antes = { desbloqueado: p.desbloqueado, medalhas: p.medalhas.slice() };

  if (acertou) {
    p.totalAcertos += 1;
    p.porDegrau[d].acertos += 1;
    p.porTipo[exercicio.tipo].acertos += 1;
    p.sequencia += 1;
    p.melhorSequencia = Math.max(p.melhorSequencia, p.sequencia);
    if (!usouDica) p.acertosSemDica += 1;

    ganho = 10 + (usouDica ? 0 : 5) + Math.min(10, Math.floor(p.sequencia / 3) * 2);
    p.xp += ganho;
  } else {
    p.porDegrau[d].erros += 1;
    p.porTipo[exercicio.tipo].erros += 1;
    p.sequencia = 0;
  }

  // libera o próximo degrau quando o atual acumula acertos suficientes
  while (p.desbloqueado < DEGRAUS.length && p.porDegrau[p.desbloqueado].acertos >= ACERTOS_PARA_LIBERAR) {
    p.desbloqueado += 1;
  }

  const novas = [];
  for (const m of MEDALHAS) {
    if (!p.medalhas.includes(m.id) && m.condicao(p)) {
      p.medalhas.push(m.id);
      novas.push(m);
    }
  }

  salvarProgresso(p);
  return {
    ganho,
    subiuDegrau: p.desbloqueado > antes.desbloqueado ? p.desbloqueado : null,
    medalhasNovas: novas,
  };
}

/* Os tipos com maior taxa de erro, para o mapa de dificuldades. */
function pontosFracos(p, minimo = 2) {
  const lista = [];
  for (const tipo in p.porTipo) {
    const t = p.porTipo[tipo];
    const total = t.acertos + t.erros;
    if (total < minimo) continue;
    lista.push({ tipo, total, erros: t.erros, taxa: t.erros / total });
  }
  return lista.sort((a, b) => b.taxa - a.taxa || b.total - a.total);
}

function zerarProgresso() {
  try { localStorage.removeItem(CHAVE_PROGRESSO); } catch (e) { /* nada a fazer */ }
  return progressoVazio();
}
