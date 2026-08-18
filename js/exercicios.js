/* MOLBOX — gerador de exercícios.

   Duas ideias sustentam este arquivo.

   1. Os exercícios são paramétricos, não um banco fixo. Cada chamada sorteia
      substância e valores, então o aluno nunca decora a resposta: ele precisa
      refazer o caminho.

   2. Cada exercício carrega, junto da resposta certa, a lista dos valores que
      resultam dos erros típicos daquele tipo de conta. Quando a resposta do
      aluno bate com um desses valores, o aplicativo não diz "errado" — diz
      qual passo foi trocado. Essa lista é o coração pedagógico do MOLBOX.
*/

const SUBSTANCIAS = [
  { f: "H2O",        nome: "água",                     gas: false },
  { f: "NaOH",       nome: "hidróxido de sódio",       gas: false },
  { f: "NaCl",       nome: "cloreto de sódio",         gas: false },
  { f: "H2SO4",      nome: "ácido sulfúrico",          gas: false },
  { f: "CaCO3",      nome: "carbonato de cálcio",      gas: false },
  { f: "Ca(OH)2",    nome: "hidróxido de cálcio",      gas: false },
  { f: "NaHCO3",     nome: "bicarbonato de sódio",     gas: false },
  { f: "KMnO4",      nome: "permanganato de potássio", gas: false },
  { f: "C6H12O6",    nome: "glicose",                  gas: false },
  { f: "C12H22O11",  nome: "sacarose",                 gas: false },
  { f: "C2H5OH",     nome: "etanol",                   gas: false },
  { f: "CH3COOH",    nome: "ácido acético",            gas: false },
  { f: "AgNO3",      nome: "nitrato de prata",         gas: false },
  { f: "KNO3",       nome: "nitrato de potássio",      gas: false },
  { f: "Al2(SO4)3",  nome: "sulfato de alumínio",      gas: false },
  { f: "Fe2O3",      nome: "óxido de ferro III",       gas: false },
  { f: "CuSO4·5H2O", nome: "sulfato de cobre penta-hidratado", gas: false },
  { f: "MgSO4",      nome: "sulfato de magnésio",      gas: false },
  { f: "KCl",        nome: "cloreto de potássio",      gas: false },
  { f: "Na2CO3",     nome: "carbonato de sódio",       gas: false },
  { f: "H2O2",       nome: "peróxido de hidrogênio",   gas: false },
  { f: "O2",         nome: "gás oxigênio",             gas: true  },
  { f: "N2",         nome: "gás nitrogênio",           gas: true  },
  { f: "H2",         nome: "gás hidrogênio",           gas: true  },
  { f: "CO2",        nome: "gás carbônico",            gas: true  },
  { f: "CH4",        nome: "metano",                   gas: true  },
  { f: "NH3",        nome: "amônia",                   gas: true  },
  { f: "CO",         nome: "monóxido de carbono",      gas: true  },
  { f: "SO2",        nome: "dióxido de enxofre",       gas: true  },
];

const COM_PARENTESES = ["Ca(OH)2", "Al2(SO4)3", "Mg(NO3)2", "Ca3(PO4)2", "Fe(OH)3", "(NH4)2SO4", "Ba(NO3)2", "Al(OH)3"];

const VALORES_BONITOS = [0.5, 1.0, 2.0, 2.5, 4.0, 5.0, 8.0, 10.0, 20.0, 25.0, 40.0, 50.0, 100.0];
const VALORES_MOL     = [0.10, 0.20, 0.25, 0.50, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

const DEGRAUS = [
  { n: 1, nome: "Átomo",    resumo: "massa atômica, símbolo e contagem de átomos numa fórmula" },
  { n: 2, nome: "Contagem", resumo: "a constante de Avogadro e o salto entre contar e medir" },
  { n: 3, nome: "Mol",      resumo: "a ponte completa: massa, mol, entidades e volume" },
  { n: 4, nome: "Reação",   resumo: "coeficientes, proporção entre substâncias e reagente limitante" },
];

/* Reações usadas nos exercícios do degrau 4. Ficam aqui sem coeficientes: o
   próprio balanceador os calcula na hora, então não há número decorado no
   código que possa divergir do que o aplicativo ensina. */
const REACOES = [
  "CH4 + O2 -> CO2 + H2O",
  "H2 + O2 -> H2O",
  "N2 + H2 -> NH3",
  "Fe + O2 -> Fe2O3",
  "C3H8 + O2 -> CO2 + H2O",
  "Al + HCl -> AlCl3 + H2",
  "CaCO3 -> CaO + CO2",
  "NaOH + H2SO4 -> Na2SO4 + H2O",
  "Zn + HCl -> ZnCl2 + H2",
  "C2H5OH + O2 -> CO2 + H2O",
  "KClO3 -> KCl + O2",
  "Mg + O2 -> MgO",
  "NH3 + O2 -> NO + H2O",
  "Ca(OH)2 + HCl -> CaCl2 + H2O",
  "C6H12O6 + O2 -> CO2 + H2O",
  "Na + H2O -> NaOH + H2",
];

function sortearReacao(minimoReagentes) {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const bruta = sortear(REACOES);
    try {
      const b = balancear(bruta);
      if (minimoReagentes && b.reagentes.length < minimoReagentes) continue;
      return b;
    } catch (e) { /* passa para a próxima */ }
  }
  return balancear("H2 + O2 -> H2O");
}

const ACERTOS_PARA_LIBERAR = 5;

function sortear(lista) { return lista[Math.floor(Math.random() * lista.length)]; }

/* A equação sem coeficiente algum, para o enunciado de balanceamento. */
function escreverEsqueleto(b) {
  const lado = (l) => l.map(e => e.vista).join(" + ");
  return `<span class="eq-linha">${lado(b.reagentes)} → ${lado(b.produtos)}</span>`;
}

/* A equação balanceada, em linha, para citar dentro de um enunciado. */
function escreverEquacaoTextoCurto(b) {
  const lado = (l) => l.map(e => (e.coeficiente === 1 ? "" : e.coeficiente + " ") + e.vista).join(" + ");
  return `<span class="eq-linha">${lado(b.reagentes)} → ${lado(b.produtos)}</span>`;
}

function sortearSubstancia(apenasGas) {
  const universo = apenasGas ? SUBSTANCIAS.filter(s => s.gas) : SUBSTANCIAS;
  return sortear(universo);
}

function comFormula(s) {
  const a = analisar(s.f);
  return { ...s, analise: a, M: a.massaMolar, vista: formatarFormula(a.normalizada) };
}

/* Um erro previsto: o valor que ele produz e a frase que nomeia o engano. */
function engano(valor, mensagem) { return { valor, mensagem }; }

/* ---------------- geradores por tipo ---------------- */

const GERADORES = {

  /* ----- degrau 1 ----- */

  atomosNaFormula(cfg) {
    const formula = sortear(COM_PARENTESES);
    const a = analisar(formula);
    const alvo = sortear(a.itens.filter(i => i.quantidade > 1)) || a.itens[0];
    const vista = formatarFormula(a.normalizada);

    // erro clássico: ler só o índice de dentro do parêntese e esquecer de
    // multiplicar pelo índice de fora
    const dentro = analisar(formula.replace(/\)(\d+)/, ")"));
    const semMultiplicar = dentro.composicao[alvo.simbolo] || alvo.quantidade;

    return {
      degrau: 1, tipo: "atomosNaFormula", formulas: [formula],
      enunciado: `Quantos átomos de <strong>${alvo.simbolo}</strong> existem em uma unidade de ${vista}?`,
      unidade: "átomos", resposta: alvo.quantidade, sig: 3,
      erros: [
        engano(semMultiplicar, `Você contou só o índice de dentro do parêntese. O número de fora multiplica tudo que está dentro dele — inclusive o ${alvo.simbolo}.`),
        engano(alvo.quantidade + 1, "Quase. Recontagem: multiplique o índice de dentro pelo índice de fora do parêntese."),
      ],
      dica: "O índice que fica depois do parêntese multiplica todos os átomos que estão dentro dele.",
      resolucao: `Em ${vista}, o ${alvo.simbolo} aparece com índice interno e o parêntese multiplica esse valor. Total: <strong>${alvo.quantidade} átomos de ${alvo.simbolo}</strong>.`,
    };
  },

  massaMolarSimples(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const a = s.analise;
    const maior = a.itens[0];

    // erro clássico: somar as massas atômicas ignorando os índices
    const semIndices = a.itens.reduce((soma, i) => soma + i.massaAtomica, 0);

    return {
      degrau: 1, tipo: "massaMolarSimples", formulas: [s.f],
      enunciado: `Qual a massa molar de ${s.vista} (${s.nome})?`,
      unidade: "g/mol", resposta: a.massaMolar, sig: 4,
      erros: [
        engano(semIndices, "Você somou as massas atômicas mas esqueceu os índices. Cada elemento entra multiplicado pela quantidade de átomos dele na fórmula."),
        engano(maior.massaAtomica, `Esse é o valor da massa atômica do ${maior.simbolo} sozinho. A massa molar soma a contribuição de todos os elementos.`),
      ],
      dica: "Multiplique a massa atômica de cada elemento pelo número de átomos dele e some tudo.",
      resolucao: a.itens.map(i => `${i.quantidade} × ${formatarNumero(i.massaAtomica, 5)} (${i.simbolo}) = ${formatarNumero(i.contribuicao, 5)}`).join("<br>") +
                 `<br><strong>Soma = ${formatarNumero(a.massaMolar, 5)} g/mol</strong>`,
    };
  },

  /* ----- degrau 2 ----- */

  molParaParticulas(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear(VALORES_MOL);
    const certo = n * CONSTANTES.AVOGADRO;

    return {
      degrau: 2, tipo: "molParaParticulas", formulas: [s.f],
      enunciado: `Quantas moléculas há em <strong>${formatarNumero(n, 3)} mol</strong> de ${s.vista}?`,
      unidade: "moléculas", resposta: certo, sig: 3,
      erros: [
        engano(n / CONSTANTES.AVOGADRO, "Você dividiu quando era para multiplicar. Um mol contém 6,02×10²³ entidades, então mais mols significam mais entidades."),
        engano(CONSTANTES.AVOGADRO, "Esse é o número de entidades em exatamente 1 mol. Aqui a quantidade de matéria é outra."),
        engano(n * CONSTANTES.AVOGADRO * s.analise.totalAtomos, "Esse é o número total de átomos, não de moléculas. A pergunta é sobre moléculas inteiras."),
      ],
      dica: "Cada mol contém 6,02×10²³ entidades. É uma multiplicação direta.",
      resolucao: `${formatarNumero(n, 3)} mol × 6,022×10²³ moléculas/mol = <strong>${formatarNumero(certo, 3)} moléculas</strong>`,
    };
  },

  particulasParaMol(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const fator = sortear([1.2, 1.5, 2.4, 3.0, 4.8, 6.0, 9.0, 1.8]);
    const N = fator * 1e23;
    const certo = N / CONSTANTES.AVOGADRO;

    return {
      degrau: 2, tipo: "particulasParaMol", formulas: [s.f],
      enunciado: `Uma amostra de ${s.vista} contém <strong>${formatarNumero(N, 2)} moléculas</strong>. A quantos mols isso corresponde?`,
      unidade: "mol", resposta: certo, sig: 3,
      erros: [
        engano(N * CONSTANTES.AVOGADRO, "Você multiplicou por Avogadro. Para sair de um número enorme de partículas e chegar a poucos mols, a operação é a divisão."),
        engano(N / s.M, "Você dividiu pela massa molar. Massa molar converte gramas; para converter contagem de partículas, o fator é a constante de Avogadro."),
      ],
      dica: "Divida o número de partículas por 6,02×10²³.",
      resolucao: `${formatarNumero(N, 2)} moléculas ÷ 6,022×10²³ moléculas/mol = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  atomosTotais(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear([0.5, 1.0, 2.0, 0.25, 1.5]);
    const total = s.analise.totalAtomos;
    const certo = n * CONSTANTES.AVOGADRO * total;

    return {
      degrau: 2, tipo: "atomosTotais", formulas: [s.f],
      enunciado: `Quantos <strong>átomos no total</strong> existem em ${formatarNumero(n, 3)} mol de ${s.vista}?`,
      unidade: "átomos", resposta: certo, sig: 3,
      erros: [
        engano(n * CONSTANTES.AVOGADRO, `Esse é o número de moléculas, não de átomos. Cada molécula de ${s.vista} tem ${total} átomos dentro dela.`),
        engano(CONSTANTES.AVOGADRO * total, "Você esqueceu de usar a quantidade de matéria informada no enunciado."),
      ],
      dica: `Primeiro ache quantas moléculas há. Depois multiplique pelo número de átomos em cada molécula.`,
      resolucao: `${formatarNumero(n, 3)} mol × 6,022×10²³ moléculas/mol × ${total} átomos/molécula = <strong>${formatarNumero(certo, 3)} átomos</strong>`,
    };
  },

  /* ----- degrau 3 ----- */

  massaParaMol(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const m = sortear(VALORES_BONITOS);
    const certo = m / s.M;

    return {
      degrau: 3, tipo: "massaParaMol", formulas: [s.f],
      enunciado: `Quantos mols há em <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista} (${s.nome})?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * s.M, "Você inverteu a razão molar. Repare nas unidades: g × g/mol dá g²/mol, que não é mol. Para cancelar o grama, a massa molar entra dividindo."),
        engano(m / CONSTANTES.AVOGADRO, "Você usou a constante de Avogadro. Ela converte contagem de partículas; para converter gramas, o fator é a massa molar."),
        engano(m * CONSTANTES.AVOGADRO, "Esse é o número de entidades, não a quantidade de matéria. A pergunta pede mols."),
        engano(m / s.analise.itens[0].massaAtomica, `Você dividiu pela massa atômica do ${s.analise.itens[0].simbolo} em vez da massa molar da substância inteira.`),
      ],
      dica: "Escreva a massa molar como fração e veja qual posição faz o grama cancelar.",
      resolucao: `${formatarNumero(m, 3)} g × (1 mol ⁄ ${formatarNumero(s.M, 5)} g) = <strong>${formatarNumero(certo, 3)} mol</strong><br>O grama de cima cancela com o grama de baixo e sobra mol.`,
    };
  },

  molParaMassa(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const n = sortear(VALORES_MOL);
    const certo = n * s.M;

    return {
      degrau: 3, tipo: "molParaMassa", formulas: [s.f],
      enunciado: `Qual a massa de <strong>${formatarNumero(n, 3)} mol</strong> de ${s.vista} (${s.nome})?`,
      unidade: "g", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(n / s.M, "Você inverteu a razão. Aqui a massa molar entra multiplicando: cada mol pesa a massa molar."),
        engano(s.M, "Essa é a massa de exatamente 1 mol. O enunciado pede outra quantidade de matéria."),
        engano(n * CONSTANTES.AVOGADRO, "Você achou o número de entidades. A pergunta é sobre massa, em gramas."),
      ],
      dica: "Se 1 mol pesa a massa molar, quanto pesam n mols?",
      resolucao: `${formatarNumero(n, 3)} mol × (${formatarNumero(s.M, 5)} g ⁄ 1 mol) = <strong>${formatarNumero(certo, 3)} g</strong>`,
    };
  },

  massaParaParticulas(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const m = sortear(VALORES_BONITOS);
    const mols = m / s.M;
    const certo = mols * CONSTANTES.AVOGADRO;

    return {
      degrau: 3, tipo: "massaParaParticulas", formulas: [s.f],
      enunciado: `Quantas moléculas há em <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista}?`,
      unidade: "moléculas", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * CONSTANTES.AVOGADRO, "Você pulou a ponte. Não dá para ir de grama direto para partícula: é preciso passar pelo mol primeiro, dividindo pela massa molar."),
        engano(mols, "Você parou no meio do caminho. Isso é a quantidade de matéria em mols; falta multiplicar por Avogadro."),
        engano(m * s.M * CONSTANTES.AVOGADRO, "A massa molar entrou multiplicando quando deveria dividir. Confira o cancelamento das unidades."),
      ],
      dica: "São dois passos: grama para mol pela massa molar, mol para moléculas por Avogadro.",
      resolucao: `${formatarNumero(m, 3)} g × (1 mol ⁄ ${formatarNumero(s.M, 5)} g) = ${formatarNumero(mols, 3)} mol<br>` +
                 `${formatarNumero(mols, 3)} mol × 6,022×10²³ = <strong>${formatarNumero(certo, 3)} moléculas</strong>`,
    };
  },

  volumeParaMol(cfg) {
    const s = comFormula(sortearSubstancia(true));
    const vm = cfg.volumeMolar;
    const n = sortear([0.25, 0.5, 1.0, 2.0, 0.1]);
    const V = n * vm;
    const certo = V / vm;

    return {
      degrau: 3, tipo: "volumeParaMol", formulas: [s.f],
      enunciado: `Nas condições escolhidas, <strong>${formatarNumero(V, 3)} L</strong> de ${s.vista} correspondem a quantos mols?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `Volume molar = ${formatarNumero(vm, 4)} L/mol · M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(V * vm, "Você multiplicou pelo volume molar. Para descobrir quantos mols cabem num volume, é preciso dividir."),
        engano(V / s.M, "Você usou a massa molar. Ela converte gramas; para converter litros de gás, o fator é o volume molar."),
        engano(V * s.M, "A massa molar não entra aqui, e nem multiplicando. O volume molar é o fator desta conversão."),
      ],
      dica: "O volume molar diz quantos litros um mol de gás ocupa. Você tem litros e quer mols.",
      resolucao: `${formatarNumero(V, 3)} L × (1 mol ⁄ ${formatarNumero(vm, 4)} L) = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  massaParaVolume(cfg) {
    const s = comFormula(sortearSubstancia(true));
    const vm = cfg.volumeMolar;
    const m = sortear([2.0, 4.0, 8.0, 10.0, 16.0, 20.0, 5.0]);
    const mols = m / s.M;
    const certo = mols * vm;

    return {
      degrau: 3, tipo: "massaParaVolume", formulas: [s.f],
      enunciado: `Que volume ocupam <strong>${formatarNumero(m, 3)} g</strong> de ${s.vista} nas condições escolhidas?`,
      unidade: "L", resposta: certo, sig: 3,
      contexto: `Volume molar = ${formatarNumero(vm, 4)} L/mol · M(${s.f}) = ${formatarNumero(s.M, 5)} g/mol`,
      erros: [
        engano(m * vm, "Você pulou a ponte. O volume molar só conversa com mol, nunca direto com grama: primeiro converta a massa em mols."),
        engano(mols, "Você parou no mol. Falta o último passo, multiplicar pelo volume molar."),
        engano(m / vm, "O volume molar entrou dividindo e sem passar pelo mol. Refaça em dois passos e confira as unidades."),
      ],
      dica: "Grama para mol pela massa molar; mol para litro pelo volume molar.",
      resolucao: `${formatarNumero(m, 3)} g ÷ ${formatarNumero(s.M, 5)} g/mol = ${formatarNumero(mols, 3)} mol<br>` +
                 `${formatarNumero(mols, 3)} mol × ${formatarNumero(vm, 4)} L/mol = <strong>${formatarNumero(certo, 3)} L</strong>`,
    };
  },


  /* ----- degrau 4 ----- */

  coeficienteNaEquacao(cfg) {
    const b = sortearReacao();
    const alvo = sortear(b.especies);
    const outro = sortear(b.especies.filter(e => e !== alvo && e.coeficiente !== alvo.coeficiente)) || null;

    const erros = [engano(1, "1 é o coeficiente de quem já está balanceado sozinho. Confira se todos os elementos fecham dos dois lados com esse valor.")];
    if (outro) {
      erros.push(engano(outro.coeficiente, `Esse é o coeficiente de ${outro.formula}, não o de ${alvo.formula}.`));
    }

    return {
      degrau: 4, tipo: "coeficienteNaEquacao", formulas: b.especies.map(e => e.formula),
      enunciado: `Balanceando com os menores números inteiros possíveis, qual o coeficiente de <strong>${alvo.vista}</strong> em<br>${escreverEsqueleto(b)}?`,
      unidade: "", resposta: alvo.coeficiente, sig: 2,
      erros,
      dica: "Conte os átomos de cada elemento dos dois lados e ajuste os coeficientes até que todas as contagens fechem. Comece pelo elemento que aparece em menos substâncias.",
      resolucao: `A equação balanceada é <strong>${b.equacaoTexto}</strong>.<br>` +
        b.conferencia.map(c => `${c.elemento}: ${c.antes} de cada lado`).join(" · "),
    };
  },

  molParaMolReacao(cfg) {
    const b = sortearReacao();
    const de = sortear(b.reagentes);
    const para = sortear(b.produtos);
    const n = sortear([0.2, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0]);
    const certo = n * (para.coeficiente / de.coeficiente);

    return {
      degrau: 4, tipo: "molParaMolReacao", formulas: [de.formula, para.formula],
      enunciado: `Na reação ${escreverEquacaoTextoCurto(b)}, quantos mols de <strong>${para.vista}</strong> se formam a partir de <strong>${formatarNumero(n, 3)} mol</strong> de ${de.vista}?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `Proporção: ${de.coeficiente} ${de.formula} para ${para.coeficiente} ${para.formula}`,
      erros: [
        engano(n * (de.coeficiente / para.coeficiente), "A razão entrou de cabeça para baixo. O coeficiente da substância que você quer fica em cima; o da que você tem, embaixo."),
        engano(n, "Você usou a mesma quantidade dos dois lados. A equação balanceada existe justamente porque essa proporção não é de um para um aqui."),
      ],
      dica: "Multiplique pelos coeficientes na forma de fração, com o da substância pedida no numerador.",
      resolucao: `${formatarNumero(n, 3)} mol de ${de.formula} × (${para.coeficiente} mol ${para.formula} ⁄ ${de.coeficiente} mol ${de.formula}) = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  massaParaMassaReacao(cfg) {
    const b = sortearReacao();
    const de = sortear(b.reagentes);
    const para = sortear(b.produtos);
    const Md = de.analise.massaMolar, Mp = para.analise.massaMolar;
    const m = sortear([5.0, 10.0, 20.0, 25.0, 50.0, 100.0, 8.0, 16.0]);
    const mols = m / Md;
    const molsProduto = mols * (para.coeficiente / de.coeficiente);
    const certo = molsProduto * Mp;

    return {
      degrau: 4, tipo: "massaParaMassaReacao", formulas: [de.formula, para.formula],
      enunciado: `Na reação ${escreverEquacaoTextoCurto(b)}, que massa de <strong>${para.vista}</strong> se forma a partir de <strong>${formatarNumero(m, 3)} g</strong> de ${de.vista}?`,
      unidade: "g", resposta: certo, sig: 3,
      contexto: `M(${de.formula}) = ${formatarNumero(Md, 5)} g/mol · M(${para.formula}) = ${formatarNumero(Mp, 5)} g/mol`,
      erros: [
        engano(m * (para.coeficiente / de.coeficiente), "Você aplicou a proporção direto sobre a massa. Coeficiente é razão de mols, nunca de gramas: converta para mol antes."),
        engano(molsProduto, "Você parou no mol do produto. Falta multiplicar pela massa molar dele para voltar a gramas."),
        engano(mols * (de.coeficiente / para.coeficiente) * Mp, "A razão entre os coeficientes entrou invertida no meio do caminho."),
        engano(mols * Mp, "Você converteu para mol e voltou para grama, mas esqueceu a proporção da reação no meio."),
      ],
      dica: "São três passos: grama para mol pela massa molar do reagente, mol para mol pelos coeficientes, mol para grama pela massa molar do produto.",
      resolucao: `${formatarNumero(m, 3)} g ÷ ${formatarNumero(Md, 5)} = ${formatarNumero(mols, 3)} mol de ${de.formula}<br>` +
        `${formatarNumero(mols, 3)} × (${para.coeficiente}⁄${de.coeficiente}) = ${formatarNumero(molsProduto, 3)} mol de ${para.formula}<br>` +
        `${formatarNumero(molsProduto, 3)} × ${formatarNumero(Mp, 5)} = <strong>${formatarNumero(certo, 3)} g</strong>`,
    };
  },

  produtoComLimitante(cfg) {
    const b = sortearReacao(2);
    const a1 = b.reagentes[0], a2 = b.reagentes[1];
    const produto = sortear(b.produtos);

    // sorteia massas que garantam um limitante claro, nunca proporção exata
    const base = sortear([0.4, 0.6, 1.5, 2.0, 2.5]);
    const mols1 = a1.coeficiente * sortear([1.0, 2.0, 0.5]);
    const mols2 = a2.coeficiente * base;
    const m1 = mols1 * a1.analise.massaMolar;
    const m2 = mols2 * a2.analise.massaMolar;

    const razao1 = mols1 / a1.coeficiente;
    const razao2 = mols2 / a2.coeficiente;
    const extensao = Math.min(razao1, razao2);
    const certo = produto.coeficiente * extensao;
    const pelaOutra = produto.coeficiente * Math.max(razao1, razao2);

    return {
      degrau: 4, tipo: "produtoComLimitante", formulas: [a1.formula, a2.formula, produto.formula],
      enunciado: `Misturam-se <strong>${formatarNumero(m1, 3)} g</strong> de ${a1.vista} com <strong>${formatarNumero(m2, 3)} g</strong> de ${a2.vista} segundo ${escreverEquacaoTextoCurto(b)}. Quantos mols de <strong>${produto.vista}</strong> se formam?`,
      unidade: "mol", resposta: certo, sig: 3,
      contexto: `M(${a1.formula}) = ${formatarNumero(a1.analise.massaMolar, 5)} · M(${a2.formula}) = ${formatarNumero(a2.analise.massaMolar, 5)} g/mol`,
      erros: [
        engano(pelaOutra, "Você usou o reagente em excesso para calcular. Quem manda é o limitante: aquele com a menor razão entre mols disponíveis e coeficiente — não o de menor massa."),
        engano(certo + pelaOutra, "Você somou as duas contas. Só uma delas vale: a do reagente que acaba primeiro."),
        engano(Math.min(mols1, mols2), "Você comparou os mols diretamente, sem dividir pelos coeficientes. O reagente que exige três mols por vez acaba antes de outro que exige um, mesmo tendo mais matéria."),
      ],
      dica: "Converta as duas massas em mols, divida cada uma pelo respectivo coeficiente e compare. A menor razão manda na reação inteira.",
      resolucao: `${a1.formula}: ${formatarNumero(mols1, 3)} mol ÷ ${a1.coeficiente} = ${formatarNumero(razao1, 3)}<br>` +
        `${a2.formula}: ${formatarNumero(mols2, 3)} mol ÷ ${a2.coeficiente} = ${formatarNumero(razao2, 3)}<br>` +
        `Limitante: <strong>${razao1 <= razao2 ? a1.formula : a2.formula}</strong>, com extensão ${formatarNumero(extensao, 3)}.<br>` +
        `${produto.formula}: ${produto.coeficiente} × ${formatarNumero(extensao, 3)} = <strong>${formatarNumero(certo, 3)} mol</strong>`,
    };
  },

  percentualEmMassa(cfg) {
    const s = comFormula(sortearSubstancia(false));
    const a = s.analise;
    const alvo = sortear(a.itens);
    const certo = alvo.percentual;
    const porAtomos = (alvo.quantidade / a.totalAtomos) * 100;

    return {
      degrau: 3, tipo: "percentualEmMassa", formulas: [s.f],
      enunciado: `Qual a porcentagem <strong>em massa</strong> de ${alvo.simbolo} em ${s.vista}?`,
      unidade: "%", resposta: certo, sig: 3,
      contexto: `M(${s.f}) = ${formatarNumero(a.massaMolar, 5)} g/mol`,
      erros: [
        engano(porAtomos, `Você calculou a porcentagem em número de átomos, não em massa. A balança não conta átomos: ela pesa. Multiplique a quantidade pela massa atômica antes de comparar.`),
        engano(alvo.contribuicao, "Esse é o valor em gramas que o elemento contribui. Falta dividir pela massa molar e multiplicar por cem."),
      ],
      dica: "Massa que o elemento contribui, dividida pela massa molar total, vezes cem.",
      resolucao: `${alvo.quantidade} × ${formatarNumero(alvo.massaAtomica, 5)} = ${formatarNumero(alvo.contribuicao, 4)} g de ${alvo.simbolo} em cada mol<br>` +
                 `${formatarNumero(alvo.contribuicao, 4)} ÷ ${formatarNumero(a.massaMolar, 5)} × 100 = <strong>${formatarNumero(certo, 3)}%</strong>`,
    };
  },
};

const TIPOS_POR_DEGRAU = {
  1: ["atomosNaFormula", "massaMolarSimples"],
  2: ["molParaParticulas", "particulasParaMol", "atomosTotais"],
  3: ["massaParaMol", "molParaMassa", "massaParaParticulas", "volumeParaMol", "massaParaVolume", "percentualEmMassa"],
  4: ["coeficienteNaEquacao", "molParaMolReacao", "massaParaMassaReacao", "produtoComLimitante"],
};

const NOME_TIPO = {
  atomosNaFormula: "Contagem de átomos na fórmula",
  massaMolarSimples: "Cálculo de massa molar",
  molParaParticulas: "Mol para entidades",
  particulasParaMol: "Entidades para mol",
  atomosTotais: "Átomos totais numa amostra",
  massaParaMol: "Massa para mol",
  molParaMassa: "Mol para massa",
  massaParaParticulas: "Massa para entidades",
  volumeParaMol: "Volume de gás para mol",
  massaParaVolume: "Massa para volume de gás",
  percentualEmMassa: "Porcentagem em massa",
  coeficienteNaEquacao: "Coeficiente do balanceamento",
  molParaMolReacao: "Proporção em mols entre substâncias",
  massaParaMassaReacao: "Massa de reagente para massa de produto",
  produtoComLimitante: "Produto formado com reagente limitante",
};

/* Gera um exercício do degrau pedido, evitando repetir o tipo anterior. */
function gerarExercicio(degrau, cfg, tipoAnterior) {
  let tipos = TIPOS_POR_DEGRAU[degrau] || TIPOS_POR_DEGRAU[1];
  if (tipos.length > 1 && tipoAnterior) {
    const outros = tipos.filter(t => t !== tipoAnterior);
    if (outros.length) tipos = outros;
  }
  const tipo = sortear(tipos);
  const q = GERADORES[tipo](cfg || { volumeMolar: 22.4 });
  q.enunciadoTexto = q.enunciado.replace(/<[^>]*>/g, "");

  // Alguns sorteios fazem um erro previsto cair exatamente sobre a resposta
  // certa — é o caso de 1 mol, em que multiplicar e não multiplicar por
  // Avogadro dão o mesmo número, ou de fórmulas em que todos os índices são 1.
  // Nesses casos o valor deixa de diagnosticar coisa alguma e sai da lista.
  const limpos = [];
  for (const e of q.erros) {
    if (!isFinite(e.valor)) continue;
    if (proximo(e.valor, q.resposta)) continue;
    if (limpos.some(j => proximo(j.valor, e.valor))) continue;
    limpos.push(e);
  }
  q.erros = limpos;

  return q;
}

/* ---------------- correção ---------------- */

const TOLERANCIA = 0.015; // 1,5%: acomoda arredondamento honesto sem perdoar erro de método

function proximo(a, b) {
  if (!isFinite(a) || !isFinite(b)) return false;
  if (b === 0) return Math.abs(a) < 1e-12;
  return Math.abs(a - b) / Math.abs(b) <= TOLERANCIA;
}

/* Devolve o veredito e, quando possível, o nome do engano cometido. */
function corrigir(exercicio, respostaBruta) {
  const valor = lerNumero(respostaBruta);

  if (!isFinite(valor)) {
    return { situacao: "invalido", mensagem: "Não consegui ler esse número. Use vírgula ou ponto para decimal, e a forma 6,02e23 para potências de dez." };
  }

  if (proximo(valor, exercicio.resposta)) {
    return { situacao: "certo", mensagem: "Isso. O caminho estava certo do começo ao fim." };
  }

  for (const e of exercicio.erros) {
    if (proximo(valor, e.valor)) {
      return { situacao: "diagnosticado", mensagem: e.mensagem, erroReconhecido: true };
    }
  }

  // fator de dez costuma ser troca de unidade ou escorregão na potência
  const razao = valor / exercicio.resposta;
  for (const p of [1000, 100, 10, 0.1, 0.01, 0.001]) {
    if (proximo(razao, p)) {
      return {
        situacao: "diagnosticado",
        mensagem: `O caminho parece certo, mas o resultado está ${p >= 10 ? p + " vezes maior" : "dividido por " + Math.round(1 / p)} que o esperado. Confira a potência de dez ou a vírgula.`,
        erroReconhecido: true,
      };
    }
  }

  return { situacao: "errado", mensagem: "Não é esse valor. Refaça escrevendo as unidades ao lado de cada número: elas dizem onde a conta saiu do trilho." };
}
