/* MOLBOX — interface. Liga o analisador de fórmulas, o motor de conversão
   e a tabela periódica. Sem dependências externas. */

(function () {
  "use strict";

  const CHAVE = "molbox.estado.v1";
  const CHAVE_ONBOARDING = "molbox.onboarding.v1";

  const estado = {
    formula: "NaOH",
    analise: null,
    volumeMolarId: "cntp",
    origem: "massa",
    entradaBruta: "4,00",
    elementoAberto: null,
    telaAtual: "tela-mol",
    mol: { pacote: 5, comparacao: 0, elemento: "C", copoAgua: "180" },
    equacao: "CH4 + O2 -> CO2 + H2O",
    balanceada: null,
    esteq: { unidade: "g", quantidades: {}, purezas: {}, produtoRendimento: 0, massaObtida: "" },
    solucao: { formula: "NaCl", unidade: "molar", valor: "1,0", densidade: "1,00",
               dil: { c1: "1,0", v1: "", c2: "0,1", v2: "250" },
               mix: [{ c: "0,5", v: "100" }, { c: "0,1", v: "400" }] },
    preparo: { formula: "NaOH", volume: "500", concentracao: "0,1", pureza: "97", densidade: "" },
    ph: { modo: "acidoFraco", indice: 4, concentracao: "0,1",
          tampaoAcido: "0,1", tampaoBase: "0,1" },
    titulacao: { indice: 4, cAnalito: "0,1", vAnalito: "25", cTitulante: "0,1", indicador: 6 },
    degrau: 1,
    exercicio: null,
    tipoAnterior: null,
    usouDica: false,
    respondido: false,
    consultaAberta: false,
    expressao: "",
    sessao: { certas: 0, total: 0, xp: 0 },
  };

  let progresso = null;

  const EXEMPLOS = ["NaOH", "H2SO4", "Ca(OH)2", "C6H12O6", "CuSO4·5H2O", "KMnO4", "Al2(SO4)3", "K3[Fe(CN)6]"];

  const $ = (s) => document.querySelector(s);
  const criar = (tag, props) => Object.assign(document.createElement(tag), props || {});

  /* ---------------- persistência ---------------- */

  function guardar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        formula: estado.formula,
        volumeMolarId: estado.volumeMolarId,
        equacao: estado.equacao,
        telaAtual: estado.telaAtual,
        origem: estado.origem,
        entradaBruta: estado.entradaBruta,
      }));
    } catch (e) { /* modo privativo: seguir sem guardar */ }
  }

  function recuperar() {
    try {
      const bruto = localStorage.getItem(CHAVE);
      if (!bruto) return;
      const d = JSON.parse(bruto);
      if (d.formula) estado.formula = d.formula;
      if (d.equacao) estado.equacao = d.equacao;
      if (d.telaAtual) estado.telaAtual = d.telaAtual;
      if (d.volumeMolarId) estado.volumeMolarId = d.volumeMolarId;
      if (d.origem && GRANDEZAS[d.origem]) estado.origem = d.origem;
      if (d.entradaBruta) estado.entradaBruta = d.entradaBruta;
    } catch (e) { /* dado corrompido: começar limpo */ }
  }

  function volumeMolarAtual() {
    return VOLUMES_MOLARES.find(v => v.id === estado.volumeMolarId) || VOLUMES_MOLARES[0];
  }

  /* ---------------- navegação ---------------- */

  const TITULOS = {
    "tela-mol": "Mol: A Chave",
    "tela-massa": "Massa molar",
    "tela-ponte": "Ponte do mol",
    "tela-balancear": "Balancear",
    "tela-esteq": "Estequiometria",
    "tela-solucoes": "Concentração",
    "tela-preparo": "Preparo",
    "tela-ph": "Ácidos e bases",
    "tela-titulacao": "Titulação",
    "tela-treino": "Treino",
    "tela-progresso": "Progresso",
    "tela-tabela": "Tabela periódica",
  };

  function estreita() {
    if (typeof window.matchMedia === "function") return window.matchMedia("(max-width: 899px)").matches;
    return window.innerWidth < 900; // reserva para WebViews antigas
  }

  function abrirMenu() {
    $("#sidebar").classList.add("aberta");
    $("#cortina").hidden = false;
    $("#menuBtn").setAttribute("aria-expanded", "true");
  }

  function fecharMenu() {
    $("#sidebar").classList.remove("aberta");
    $("#cortina").hidden = true;
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }

  function mostrarTela(id) {
    estado.telaAtual = id;
    guardar();
    for (const s of document.querySelectorAll("main > section")) s.hidden = (s.id !== id);
    for (const b of document.querySelectorAll(".menu .item")) {
      if (b.dataset.tela === id) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
    $("#tituloPagina").textContent = TITULOS[id] || "MOLBOX";
    if (typeof window.scrollTo === "function") { try { window.scrollTo(0, 0); } catch (e) {} }
    if (estreita()) fecharMenu();

    if (id === "tela-mol") desenharMol();
    if (id === "tela-ponte") desenharPonte();
    if (id === "tela-esteq") desenharEstequiometria();
    if (id === "tela-solucoes") desenharSolucoes();
    if (id === "tela-preparo") desenharPreparo();
    if (id === "tela-ph") desenharAcidoBase();
    if (id === "tela-titulacao") desenharTitulacao();
    if (id === "tela-treino") entrarNoTreino();
    if (id === "tela-progresso") desenharProgresso();
  }


  /* ---------------- tela: o que é o mol ---------------- */

  function secao(alvo, titulo, sobretitulo) {
    const cartao = criar("div", { className: "cartao secao-mol" });
    if (sobretitulo) cartao.appendChild(criar("p", { className: "sobretitulo", textContent: sobretitulo }));
    cartao.appendChild(criar("h2", { textContent: titulo, style: "margin-top:0" }));
    alvo.appendChild(cartao);
    return cartao;
  }

  function desenharMol() {
    const alvo = $("#painel-mol");
    alvo.innerHTML = "";

    /* --- abertura: a chave --- */
    const capa = criar("div", { className: "cartao capa-mol" });
    capa.innerHTML =
      `<h1 style="margin:0 0 var(--mb-e3)">Mol: A Chave 🔑</h1>` +
      `<p class="lede-mol">Pegue aqui <strong>A Chave</strong> 🔑 para destravar sua vida profissional com a Química.</p>` +
      `<p>Sem o mol você não controla reação, dose, rendimento nem laudo. ` +
      `Com o mol, a Tabela Periódica vira instrumento de bancada e a balança passa a “contar” partículas.</p>` +
      `<p>Você não consegue contar átomos. Ninguém consegue. ` +
      `Eles são pequenos demais, numerosos demais e leves demais. ` +
      `Ainda assim, todo dia alguém precisa saber <em>quantas</em> — porque o número de partículas decide se a reação acontece, quanto de produto sai e qual dose faz efeito.</p>` +
      `<p class="fecho-mol">O mol resolve isso. E a solução é mais simples do que parece: <strong>é um pacote</strong> — como a dúzia.</p>`;
    alvo.appendChild(capa);

    /* --- 1. o que isso destrava (impacto profissional primeiro) --- */
    const s6 = secao(alvo, "O que essa chave destrava", "POR QUE IMPORTA");
    s6.appendChild(criar("p", {
      textContent: "Entender o mol não é só passar de ano. É a ferramenta que abre praticamente tudo que se faz com química na vida profissional.",
    }));
    const lista = criar("div", { className: "aplicacoes" });
    for (const a of APLICACOES) {
      const item = criar("div", { className: "aplicacao" });
      item.innerHTML =
        `<p class="area"><span class="emoji-area" aria-hidden="true">${a.emoji || ""}</span> ${a.area}</p>` +
        `<p>${a.texto}</p>`;
      lista.appendChild(item);
    }
    s6.appendChild(lista);

    /* --- 2. pacotes --- */
    const s1 = secao(alvo, "Você já usa pacotes a vida inteira", "A IDEIA CENTRAL");
    s1.appendChild(criar("p", {
      textContent: "Ninguém pede quinhentas folhas de papel na papelaria: pede uma resma. Ninguém compra doze ovos: compra uma dúzia. Sempre que uma coisa é numerosa demais para contar uma a uma, a gente inventa um pacote e passa a contar pacotes.",
    }));

    const chips = criar("div", { className: "chips" });
    PACOTES.forEach((p, i) => {
      const b = criar("button", { type: "button", className: "chip" + (i === estado.mol.pacote ? " ativo" : "") });
      b.textContent = p.nome;
      b.addEventListener("click", () => { estado.mol.pacote = i; desenharMol(); });
      chips.appendChild(b);
    });
    s1.appendChild(chips);

    const p = PACOTES[estado.mol.pacote];
    const cartaoPacote = criar("div", { className: "quadro-pacote" + (p.destaque ? " destaque-pacote" : "") });
    cartaoPacote.innerHTML =
      `<p class="nome-pacote">1 ${p.nome} =</p>` +
      // pacotes pequenos são contagens exatas: "1 dezena = 10", não "10,0000"
      `<p class="qtd-pacote">${Number.isInteger(p.quantidade) && p.quantidade < 1e6
        ? p.quantidade.toLocaleString("pt-BR")
        : formatarNumero(p.quantidade, 6)}</p>` +
      `<p class="uso-pacote">de ${p.usoPara}</p>` +
      `<p class="porque-pacote">${p.porque}</p>`;
    s1.appendChild(cartaoPacote);

    s1.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Repare que nenhum desses números é redondo por acaso. Cada um foi escolhido para resolver um problema prático de quem contava. Com o mol não é diferente — só que o problema era muito maior.",
    }));

    /* --- 2. tamanho do pacote --- */
    const s2 = secao(alvo, "Quão grande é esse pacote", "PARA SENTIR O TAMANHO");
    s2.appendChild(criar("p", {
      innerHTML: `Um mol são <strong>602 214 076 000 000 000 000 000</strong> unidades. Ler esse número em voz alta não ajuda em nada — ` +
        `ninguém tem intuição para vinte e três zeros. Então escolha um objeto do dia a dia e veja o que acontece quando você junta um mol dele.`,
    }));

    const chipsObj = criar("div", { className: "chips" });
    COMPARACOES.forEach((c, i) => {
      const b = criar("button", { type: "button", className: "chip" + (i === estado.mol.comparacao ? " ativo" : "") });
      b.textContent = `${c.emoji} ${c.nome}`;
      b.addEventListener("click", () => { estado.mol.comparacao = i; desenharMol(); });
      chipsObj.appendChild(b);
    });
    s2.appendChild(chipsObj);

    const comp = COMPARACOES[estado.mol.comparacao];
    const r = comp.calcular(CONSTANTES.AVOGADRO);
    const quadro = criar("div", { className: "quadro-comparacao" });
    quadro.innerHTML =
      `<p class="ajuda" style="margin:0 0 6px">Um mol de ${comp.nome} — ${comp.medida.nota} — dá</p>` +
      `<p class="resultado-comparacao">${r.resultado}</p>` +
      `<p class="conta-comparacao">${r.conta}</p>` +
      `<p class="referencia-comparacao">${r.referencia}</p>`;
    s2.appendChild(quadro);

    /* --- 3. o contraste --- */
    const s3 = secao(alvo, "Agora o golpe", "O CONTRASTE");
    const contraste = contrasteDaAgua(analisar("H2O").massaMolar);
    s3.appendChild(criar("p", {
      innerHTML: `Você viu que um mol de <strong>gotas</strong> de água encheria ${contraste.gotas.texto} de todos os oceanos do planeta.`,
    }));

    const duasColunas = criar("div", { className: "contraste" });
    duasColunas.innerHTML =
      `<div class="lado"><p class="rot-contraste">1 mol de GOTAS</p>` +
      `<p class="val-contraste">${contraste.gotas.texto}</p>` +
      `<p class="ajuda">de toda a água dos oceanos</p></div>` +
      `<div class="lado"><p class="rot-contraste">1 mol de MOLÉCULAS</p>` +
      `<p class="val-contraste destaque-val">${contraste.moleculas.texto}</p>` +
      `<p class="ajuda">uma colher de sopa</p></div>`;
    s3.appendChild(duasColunas);

    s3.appendChild(criar("p", {
      innerHTML: `A mesma quantidade. O mesmo pacote. A diferença entre encher parte de um oceano e encher uma colher ` +
        `é exatamente <strong>o tamanho de uma molécula de água</strong>.`,
    }));
    s3.appendChild(criar("div", {
      className: "dica-caixa",
      textContent: "É por isso que o mol precisa ser tão grande. Não é exagero de químico: é o tamanho necessário para que um pacote de partículas caiba numa colher e possa ser pesado numa balança comum.",
    }));

    /* --- 4. por que este número --- */
    const s4 = secao(alvo, "Por que 6,02×10²³ e não um número redondo", "PARA QUEM QUER IR MAIS FUNDO");
    s4.appendChild(criar("p", {
      textContent: "Aqui está a parte genial, e é a que quase ninguém conta. O tamanho do pacote não foi escolhido para ser bonito. Foi escolhido para que um número que você lê na tabela periódica sirva para duas coisas ao mesmo tempo.",
    }));

    const chipsEl = criar("div", { className: "chips" });
    for (const sim of ELEMENTOS_VITRINE) {
      const b = criar("button", { type: "button", className: "chip" + (sim === estado.mol.elemento ? " ativo" : "") });
      b.textContent = sim;
      b.addEventListener("click", () => { estado.mol.elemento = sim; desenharMol(); });
      chipsEl.appendChild(b);
    }
    s4.appendChild(chipsEl);

    const el = pontesDoElemento(estado.mol.elemento);
    const ponte = criar("div", { className: "quadro-ponte" });
    ponte.innerHTML =
      `<div class="lado-ponte"><p class="rot-ponte">1 ÁTOMO de ${el.nome}</p>` +
      `<p class="val-ponte">${formatarNumero(el.massaAtomica, 5)} u</p>` +
      `<p class="ajuda">${el.z} prótons e ${el.neutrons} nêutrons no núcleo</p></div>` +
      `<div class="seta-ponte" aria-hidden="true">×&nbsp;6,02×10²³</div>` +
      `<div class="lado-ponte"><p class="rot-ponte">1 MOL de ${el.nome}</p>` +
      `<p class="val-ponte destaque-val">${formatarNumero(el.massaMolar, 5)} g</p>` +
      `<p class="ajuda">${formatarNumero(CONSTANTES.AVOGADRO, 4)} átomos</p></div>`;
    s4.appendChild(ponte);

    s4.appendChild(criar("p", {
      innerHTML: `<strong>É o mesmo número dos dois lados.</strong> A massa de um átomo em unidades de massa atômica e a massa ` +
        `de um mol em gramas dão o mesmo valor. O tamanho do pacote foi calibrado para que isso acontecesse.`,
    }));
    s4.appendChild(criar("p", {
      textContent: "E é por isso que a tabela periódica é um instrumento de bancada, não um cartaz. Aquele número embaixo do símbolo diz, ao mesmo tempo, quanto pesa um átomo sozinho e quantos gramas você precisa pesar para ter um pacote inteiro deles.",
    }));
    s4.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Um detalhe honesto: desde 2019 o mol é definido fixando o número de Avogadro em 6,02214076×10²³ exatamente, e não mais pelo carbono-12. A correspondência entre u e g/mol deixou de ser exata por definição, mas continua valendo até a nona casa decimal. Nenhum cálculo de laboratório sente a diferença.",
    }));

    /* --- 5. as reações --- */
    const s5 = secao(alvo, "Por que isso decide se a reação dá certo", "NA BANCADA");
    s5.appendChild(criar("p", {
      textContent: "As substâncias não reagem em gramas. Elas reagem em partículas, e em proporções de números inteiros: duas moléculas de hidrogênio para cada molécula de oxigênio, nunca uma vírgula sete.",
    }));
    s5.appendChild(criar("div", {
      className: "equacao-vista", style: "font-size:var(--mb-t-titulo-3);padding:var(--mb-e3) 0",
      innerHTML: `<span class="termo-eq"><b class="coef">2</b> H₂</span> <span class="op">+</span> <span class="termo-eq">O₂</span> <span class="op seta">→</span> <span class="termo-eq"><b class="coef">2</b> H₂O</span>`,
    }));
    s5.appendChild(criar("p", {
      textContent: "Só que a balança pesa gramas. Nenhum laboratório do mundo tem um instrumento que conte moléculas. É aí que o mol entra: ele traduz o que a reação exige para o que a balança consegue medir.",
    }));

    const entradaCopo = criar("div", { style: "max-width:280px" });
    campoTexto(entradaCopo, {
      id: "mol-copo", rotulo: "Quero produzir esta massa de água (g)", valor: estado.mol.copoAgua,
      aoMudar: (v) => { estado.mol.copoAgua = v; atualizarReceita(); },
    });
    s5.appendChild(entradaCopo);
    s5.appendChild(criar("div", { id: "saida-receita" }));

    /* --- 6. vídeo --- */
    const sVideo = secao(alvo, "Assista a explicação", "VÍDEO");
    sVideo.appendChild(criar("p", {
      textContent: "Depois de ler e interagir acima, reforçe com o vídeo. A ordem leitura → vídeo ajuda a fixar o conceito.",
    }));
    const videoWrap = criar("div", { className: "video-wrapper" });
    videoWrap.innerHTML =
      `<iframe src="https://www.youtube.com/embed/FC1jvXZXAgI" ` +
      `title="Explicação do Mol — MOLBOX" ` +
      `frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
      `allowfullscreen loading="lazy"></iframe>`;
    sVideo.appendChild(videoWrap);

    /* --- Degrau 0 — teste rápido --- */
    const s0 = secao(alvo, "Degrau 0 — teste rápido", "TREINO INICIAL");
    s0.appendChild(criar("p", {
      textContent: "Perguntas bem simples sobre o que você acabou de ver. O objetivo é só confirmar que a ideia do pacote ficou clara.",
    }));
    s0.appendChild(criar("div", { id: "degrau0-quiz" }));
    desenharDegrau0();

    const acoes = criar("div", { className: "acoes" });
    const irTreino = criar("button", { className: "botao", type: "button", textContent: "Ir para o treino completo" });
    irTreino.addEventListener("click", () => mostrarTela("tela-treino"));
    acoes.appendChild(irTreino);
    const irMassa = criar("button", { className: "botao secundario", type: "button", textContent: "Calcular uma massa molar" });
    irMassa.addEventListener("click", () => mostrarTela("tela-massa"));
    acoes.appendChild(irMassa);
    s0.appendChild(acoes);

    atualizarReceita();
  }

  /* ---------------- Degrau 0 (quiz simples dentro da tela do mol) ---------------- */

  const DEGRAU0 = [
    {
      pergunta: "O número de Avogadro (6,022 × 10²³) funciona como um…",
      opcoes: [
        "Pacote padrão de partículas (como a dúzia é um pacote de 12)",
        "Tipo especial de átomo",
        "Unidade de temperatura",
        "Nome de um equipamento de laboratório"
      ],
      correta: 0,
      explicacao: "Isso! O mol é um pacote — da mesma forma que a dúzia é um pacote de 12."
    },
    {
      pergunta: "Por que existe o mol?",
      opcoes: [
        "Para contar partículas usando a massa que medimos na balança",
        "Porque é obrigatório em todas as provas",
        "Para substituir a Tabela Periódica",
        "Porque foi inventado recentemente"
      ],
      correta: 0,
      explicacao: "Exato. Átomos são pequenos demais para contar um a um. O mol traduz contagem impossível em pesagem trivial."
    },
    {
      pergunta: "Onde encontramos a massa de 1 mol de um elemento?",
      opcoes: [
        "Na Tabela Periódica (massa atômica)",
        "Só em livros muito avançados",
        "No rótulo de qualquer embalagem",
        "Não é possível saber"
      ],
      correta: 0,
      explicacao: "Perfeito. O número que aparece na Tabela Periódica é a massa, em gramas, de 1 mol daquele elemento."
    },
    {
      pergunta: "1 mol de água (H₂O) pesa aproximadamente…",
      opcoes: ["1 g", "10 g", "18 g", "100 g"],
      correta: 2,
      explicacao: "Correto. A massa molar da água é cerca de 18 g/mol (2 de H + 16 de O)."
    },
    {
      pergunta: "Sem o mol, o que fica muito mais difícil?",
      opcoes: [
        "Controlar reações, doses e processos industriais",
        "Memorizar a Tabela Periódica",
        "Usar a calculadora",
        "Ler um rótulo de alimento"
      ],
      correta: 0,
      explicacao: "Isso. O mol é a ponte entre o mundo das partículas e o que a balança e o processo conseguem medir."
    }
  ];

  let degrau0Atual = 0;
  let degrau0Acertos = 0;

  function desenharDegrau0() {
    const caixa = $("#degrau0-quiz");
    if (!caixa) return;
    caixa.innerHTML = "";

    if (degrau0Atual >= DEGRAU0.length) {
      const pct = Math.round((degrau0Acertos / DEGRAU0.length) * 100);
      const resultado = criar("div", { className: "degrau0-resultado" });
      let titulo, texto;
      if (pct === 100) {
        titulo = "Perfeito! Você mandou bem.";
        texto = `Acertou todas as ${DEGRAU0.length} perguntas. A ideia do pacote já está clara. Pode seguir com confiança.`;
      } else if (pct >= 60) {
        titulo = "Muito bom!";
        texto = `Você acertou ${degrau0Acertos} de ${DEGRAU0.length} (${pct}%). Já entendeu o essencial. Vale revisar as que errou.`;
      } else {
        titulo = "Continue praticando";
        texto = `Você acertou ${degrau0Acertos} de ${DEGRAU0.length}. Sem problemas — volte na explicação do mol e tente de novo. O importante é a analogia da dúzia.`;
      }
      resultado.innerHTML =
        `<h3 style="margin-top:0">${titulo}</h3><p>${texto}</p>`;
      const btn = criar("button", {
        type: "button", className: "botao secundario", textContent: "Tentar novamente"
      });
      btn.addEventListener("click", () => {
        degrau0Atual = 0;
        degrau0Acertos = 0;
        desenharDegrau0();
      });
      resultado.appendChild(btn);
      caixa.appendChild(resultado);
      return;
    }

    const p = DEGRAU0[degrau0Atual];
    const card = criar("div", { className: "degrau0-card" });
    card.appendChild(criar("p", {
      className: "degrau0-progresso",
      textContent: `Pergunta ${degrau0Atual + 1} de ${DEGRAU0.length}`
    }));
    card.appendChild(criar("p", {
      className: "degrau0-pergunta",
      textContent: p.pergunta
    }));

    const opcoes = criar("div", { className: "degrau0-opcoes" });
    p.opcoes.forEach((txt, i) => {
      const btn = criar("button", {
        type: "button", className: "degrau0-opcao", textContent: txt
      });
      btn.addEventListener("click", () => responderDegrau0(i));
      opcoes.appendChild(btn);
    });
    card.appendChild(opcoes);
    card.appendChild(criar("div", { id: "degrau0-feedback", className: "degrau0-feedback" }));
    caixa.appendChild(card);
  }

  function responderDegrau0(indice) {
    const p = DEGRAU0[degrau0Atual];
    const botoes = document.querySelectorAll(".degrau0-opcao");
    const feedback = $("#degrau0-feedback");
    botoes.forEach(b => b.disabled = true);

    if (indice === p.correta) {
      degrau0Acertos++;
      botoes[indice].classList.add("acertou");
      feedback.className = "degrau0-feedback certo";
      feedback.textContent = "✅ " + p.explicacao;
    } else {
      botoes[indice].classList.add("errou");
      botoes[p.correta].classList.add("acertou");
      feedback.className = "degrau0-feedback errado";
      feedback.textContent = "❌ " + p.explicacao;
    }

    setTimeout(() => {
      degrau0Atual++;
      desenharDegrau0();
    }, 2200);
  }

  function atualizarReceita() {
    const alvo = $("#saida-receita");
    if (!alvo) return;
    alvo.innerHTML = "";
    const massa = lerNumero(estado.mol.copoAgua);
    if (!(massa > 0)) {
      alvo.innerHTML = `<p class="ajuda">Informe uma massa de água.</p>`;
      return;
    }

    const r = receitaDaAgua(massa);
    const tabela = criar("table", { style: "margin-top:var(--mb-e3)" });
    tabela.innerHTML = `<thead><tr><th>Substância</th><th>Partículas</th><th>Mol</th><th>Na balança</th></tr></thead>`;
    const corpo = criar("tbody");
    const linhas = [
      ["H₂", r.molH2 * CONSTANTES.AVOGADRO, r.molH2, r.massaH2],
      ["O₂", r.molO2 * CONSTANTES.AVOGADRO, r.molO2, r.massaO2],
      ["H₂O", r.moleculasAgua, r.molAgua, r.massaAgua],
    ];
    for (const [nome, part, mol, g] of linhas) {
      const tr = criar("tr");
      tr.innerHTML = `<td style="font-family:var(--mb-fonte-dado)">${nome}</td>` +
        `<td class="num">${formatarNumero(part, 3)}</td>` +
        `<td class="num">${formatarNumero(mol, 4)}</td>` +
        `<td class="num" style="color:var(--mb-energia);font-weight:500">${formatarNumero(g, 4)} g</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    alvo.appendChild(tabela);

    alvo.appendChild(criar("div", {
      className: "motivo",
      innerHTML: `Você jamais conseguiria contar ${formatarNumero(r.moleculasAgua, 3)} moléculas. ` +
        `Mas consegue pesar ${formatarNumero(r.massaH2, 4)} g e ${formatarNumero(r.massaO2, 4)} g numa balança comum. ` +
        `<strong>É isso que o mol faz:</strong> transforma uma contagem impossível numa pesagem trivial.`,
    }));
  }

  /* ---------------- tela: massa molar ---------------- */

  function analisarAtual() {
    const entrada = $("#formula").value;
    const caixaErro = $("#erro-formula");
    caixaErro.innerHTML = "";
    $("#formula").setAttribute("aria-invalid", "false");

    try {
      estado.analise = analisar(entrada);
      estado.formula = entrada;
      guardar();
      desenharResultadoMassa();
    } catch (e) {
      estado.analise = null;
      $("#resultado-massa").innerHTML = "";
      $("#formula").setAttribute("aria-invalid", "true");

      const caixa = criar("div", { className: "erro" });
      caixa.appendChild(criar("strong", { textContent: e.message }));
      if (typeof e.posicao === "number") {
        const marcador = criar("span", { className: "marcador" });
        marcador.textContent = entrada + "\n" + " ".repeat(Math.max(0, e.posicao)) + "▲";
        caixa.appendChild(marcador);
      }
      caixaErro.appendChild(caixa);
    }
  }

  function desenharResultadoMassa() {
    const a = estado.analise;
    const alvo = $("#resultado-massa");
    alvo.innerHTML = "";

    // destaque
    const destaque = criar("div", { className: "cartao destaque" });
    destaque.innerHTML =
      `<p class="formula-vista">${formatarFormula(a.normalizada)}</p>` +
      `<p class="rotulo">MASSA MOLAR</p>` +
      `<p class="valor">${formatarNumero(a.massaMolar, 6)} <span class="unidade">g/mol</span></p>`;
    alvo.appendChild(destaque);

    // frase da ponte
    const frase = criar("div", { className: "cartao" });
    frase.innerHTML =
      `<p style="margin:0">Um mol de <span style="font-family:var(--mb-fonte-dado)">${formatarFormula(a.normalizada)}</span> ` +
      `pesa <strong>${formatarNumero(a.massaMolar, 5)} g</strong> e contém ` +
      `<strong>6,022×10²³</strong> ${a.totalAtomos === 1 ? "átomos" : "entidades"}, ` +
      `somando ${formatarNumero(a.totalAtomos, 3)} átomos por entidade.</p>` +
      (a.carga !== 0 ? `<p class="ajuda">Íon de carga ${a.carga > 0 ? "+" : ""}${a.carga}. A massa dos elétrons ganhos ou perdidos é desprezada, como é praxe.</p>` : "") +
      (a.massaIncerta ? `<p class="ajuda">Contém elemento sem composição isotópica estável: a massa usada é o número de massa do isótopo mais estável, não uma massa atômica padrão.</p>` : "");

    const botao = criar("button", { className: "botao", type: "button", textContent: "Levar para a ponte do mol" });
    botao.style.marginTop = "var(--mb-e3)";
    botao.addEventListener("click", () => mostrarTela("tela-ponte"));
    frase.appendChild(botao);
    alvo.appendChild(frase);

    // composição
    const comp = criar("div", { className: "cartao" });
    comp.innerHTML = `<h2 style="margin-top:0">De onde vem cada grama</h2>`;
    const tabela = criar("table");
    tabela.innerHTML =
      `<thead><tr><th>Elemento</th><th>Átomos</th><th>Contribui</th><th>% da massa</th></tr></thead>`;
    const corpo = criar("tbody");
    const maior = a.itens[0].percentual;

    for (const item of a.itens) {
      const tr = criar("tr");
      tr.innerHTML =
        `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${item.simbolo}</span> ` +
        `<span style="color:var(--mb-texto-2);font-size:var(--mb-t-legenda)">${item.nome}</span></td>` +
        `<td class="num">${item.quantidade}</td>` +
        `<td class="num">${formatarNumero(item.contribuicao, 4)} g</td>` +
        `<td class="num">${formatarNumero(item.percentual, 3)}%` +
        `<div class="barra-trilho"><div class="barra" style="width:${(item.percentual / maior * 100).toFixed(1)}%"></div></div></td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    comp.appendChild(tabela);
    comp.appendChild(criar("p", {
      className: "ajuda",
      textContent: "A porcentagem em massa é o que a balança enxerga. Repare que o elemento mais numeroso quase nunca é o que mais pesa."
    }));
    alvo.appendChild(comp);

    desenharEstruturaECargas(alvo, a);
    desenharNucleo(alvo, a);
  }

  function desenharEstruturaECargas(alvo, a) {
    const est = estruturaDe(a);
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Como os átomos se ligam</h2>`;

    if (est.tipo === "molecular") {
      const quadro = criar("div", { className: "estrutura" });
      quadro.innerHTML = desenharEstrutura(est.dados);
      cartao.appendChild(quadro);
      cartao.appendChild(criar("p", {
        style: "margin:0;text-align:center",
        textContent: `${est.dados.nome} — ${est.dados.geometria}.`,
      }));
      cartao.appendChild(criar("p", {
        className: "ajuda",
        style: "text-align:center",
        textContent: "As bolinhas seguem o raio do núcleo, que cresce com a raiz cúbica do número de massa. O tamanho do átomo inteiro é outra coisa: depende da eletrosfera e não acompanha a massa.",
      }));
    } else if (est.tipo === "ionico") {
      cartao.appendChild(criar("p", {
        style: "margin:0",
        innerHTML: `Não há molécula de ${est.chave} para desenhar. O ${est.nome} é um retículo iônico: um empilhamento de íons que se repete indefinidamente, sem unidade isolada. A fórmula diz a proporção entre os íons, não o conteúdo de uma partícula.`,
      }));
    } else {
      cartao.appendChild(criar("p", {
        style: "margin:0",
        textContent: `Não tenho a estrutura desta substância — o acervo conferido tem ${quantasEstruturas()} moléculas e esta não está entre elas. Fórmula molecular não determina estrutura: C2H6O é etanol ou éter dimetílico, C4H10 é butano ou isobutano. Desenhar uma delas como se fosse a única seria ensinar errado, porque essa multiplicidade é a própria isomeria.`,
      }));
    }

    const idh = indiceInsaturacao(a);
    if (idh) {
      const caixa = criar("div", { className: idh.situacao === "impossivel" ? "erro" : "dica-caixa" });
      caixa.style.marginTop = "var(--mb-e4)";
      caixa.innerHTML = `<strong>${idh.titulo}</strong><br>${idh.mensagem}`;
      cartao.appendChild(caixa);
    }

    alvo.appendChild(cartao);
  }

  function desenharNucleo(alvo, a) {
    const n = contarNucleo(a);
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">O que pesa dentro do átomo</h2>`;

    const fila = criar("div", { className: "fila-nucleos" });
    for (const item of n.itens) {
      const r = raioNucleo(POR_SIMBOLO[item.simbolo].massa);
      const lado = Math.ceil(r * 2) + 6;
      const bolha = criar("div", { className: "bolha" });
      bolha.innerHTML =
        `<svg viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}" role="img" ` +
        `aria-label="${item.nome}, ${item.z} prótons e ${item.neutrons} nêutrons">` +
        `<circle cx="${lado / 2}" cy="${lado / 2}" r="${r.toFixed(1)}" class="atomo a-${item.simbolo}"/>` +
        `<text x="${lado / 2}" y="${lado / 2}" class="rotulo-atomo" text-anchor="middle" ` +
        `dominant-baseline="central" font-size="${Math.max(9, r * 0.9).toFixed(1)}">${item.simbolo}</text></svg>` +
        `<span class="ajuda">${item.z}p + ${item.neutrons}n</span>`;
      fila.appendChild(bolha);
    }
    cartao.appendChild(fila);

    const tabela = criar("table");
    tabela.innerHTML = `<thead><tr><th>Elemento</th><th>Átomos</th><th>Prótons</th><th>Nêutrons</th></tr></thead>`;
    const corpo = criar("tbody");
    for (const item of n.itens) {
      const tr = criar("tr");
      tr.innerHTML =
        `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${item.simbolo}</span> ` +
        `<span class="ajuda">${item.isotopo}${item.simbolo}${item.incerta ? " *" : ""}</span></td>` +
        `<td class="num">${item.quantidade}</td>` +
        `<td class="num">${item.protonsTotal}</td>` +
        `<td class="num">${item.neutronsTotal}</td>`;
      corpo.appendChild(tr);
    }
    const total = criar("tr", { className: "linha-total" });
    total.innerHTML = `<td><strong>Total</strong></td><td class="num">${a.totalAtomos}</td>` +
      `<td class="num"><strong>${n.protons}</strong></td><td class="num"><strong>${n.neutrons}</strong></td>`;
    corpo.appendChild(total);
    tabela.appendChild(corpo);
    cartao.appendChild(tabela);

    const aviso = criar("div", { className: "dica-caixa", style: "margin-top:var(--mb-e4)" });
    aviso.innerHTML =
      `<strong>Por que a massa molar não é ${formatarNumero(n.somaNucleons, 6)} g/mol</strong><br>` +
      `Somando os núcleons do isótopo mais comum de cada elemento dá ${n.somaNucleons}. ` +
      `A massa molar é ${formatarNumero(a.massaMolar, 6)}, uma diferença de ${formatarNumero(Math.abs(n.diferenca), 3)}. ` +
      `A massa que a tabela periódica traz não é a de um átomo: é a média ponderada de todos os isótopos ` +
      `daquele elemento na natureza. É por isso que o cloro pesa 35,45 e não 35 — três quartos dele é ` +
      `cloro-35 e um quarto é cloro-37.`;
    cartao.appendChild(aviso);

    const eletrons = criar("p", { className: "ajuda" });
    eletrons.innerHTML =
      `E a eletrosfera? São ${n.eletrons} elétrons, e juntos eles pesam ${formatarNumero(n.massaEletrons, 3)} u — ` +
      `<strong>${formatarNumero(n.fracaoEletrons, 3)}%</strong> da massa. Um próton pesa 1836 vezes o que pesa um elétron, ` +
      `então a balança praticamente só enxerga o núcleo. Os elétrons decidem toda a química e quase nada da massa.`;
    cartao.appendChild(eletrons);

    alvo.appendChild(cartao);
  }

  /* ---------------- tela: ponte do mol ---------------- */

  function desenharPonte() {
    if (!estado.analise) {
      $("#caminho").innerHTML = `<p class="ajuda" style="margin:0">Escreva uma fórmula válida na tela de massa molar para atravessar a ponte.</p>`;
      $("#campos-ponte").innerHTML = "";
      $("#ponte-formula").textContent = "—";
      $("#ponte-massa").textContent = "";
      return;
    }

    const a = estado.analise;
    $("#ponte-formula").innerHTML = formatarFormula(a.normalizada);
    $("#ponte-massa").textContent = `M = ${formatarNumero(a.massaMolar, 5)} g/mol`;

    const valor = lerNumero(estado.entradaBruta);
    const vm = volumeMolarAtual();
    let resultado = null;
    if (isFinite(valor)) {
      resultado = converter({ origem: estado.origem, valor, massaMolar: a.massaMolar, volumeMolar: vm.valor });
    }

    const sig = contarSignificativos(estado.entradaBruta);
    const caixa = $("#campos-ponte");
    caixa.innerHTML = "";

    for (const chave of Object.keys(GRANDEZAS)) {
      const g = GRANDEZAS[chave];
      const div = criar("div", { className: "campo" + (chave === estado.origem ? " ativo" : "") });
      const idCampo = "campo-" + chave;

      const rotulo = criar("label", { htmlFor: idCampo, textContent: g.rotulo });
      const linha = criar("div", { className: "linha" });
      const input = criar("input", {
        type: "text", id: idCampo, inputMode: "decimal",
        autocomplete: "off", spellcheck: false,
      });
      input.setAttribute("aria-label", g.rotulo + " em " + g.unidade);

      if (chave === estado.origem) {
        input.value = estado.entradaBruta;
      } else if (resultado) {
        input.value = formatarNumero(resultado.valores[chave], sig);
      } else {
        input.value = "";
      }

      input.addEventListener("focus", () => {
        if (chave !== estado.origem) {
          estado.origem = chave;
          estado.entradaBruta = "";
          input.value = "";
          desenharPonte();
          const novo = document.getElementById(idCampo);
          if (novo) novo.focus();
        }
      });

      input.addEventListener("input", () => {
        estado.origem = chave;
        estado.entradaBruta = input.value;
        guardar();
        atualizarOutrosCampos(idCampo);
      });

      linha.appendChild(input);
      linha.appendChild(criar("span", { className: "sufixo", textContent: g.curta }));
      div.appendChild(rotulo);
      div.appendChild(linha);
      caixa.appendChild(div);
    }

    desenharCaminho(resultado);
  }

  /* Recalcula os campos sem redesenhar, para não roubar o cursor de quem digita. */
  function atualizarOutrosCampos(idAtivo) {
    const a = estado.analise;
    const valor = lerNumero(estado.entradaBruta);
    const vm = volumeMolarAtual();

    for (const chave of Object.keys(GRANDEZAS)) {
      const el = document.getElementById("campo-" + chave);
      if (!el) continue;
      el.parentElement.parentElement.classList.toggle("ativo", chave === estado.origem);
    }

    if (!isFinite(valor)) {
      for (const chave of Object.keys(GRANDEZAS)) {
        const el = document.getElementById("campo-" + chave);
        if (el && el.id !== idAtivo) el.value = "";
      }
      desenharCaminho(null);
      return;
    }

    const resultado = converter({ origem: estado.origem, valor, massaMolar: a.massaMolar, volumeMolar: vm.valor });
    const sig = contarSignificativos(estado.entradaBruta);
    for (const chave of Object.keys(GRANDEZAS)) {
      const el = document.getElementById("campo-" + chave);
      if (el && el.id !== idAtivo) el.value = formatarNumero(resultado.valores[chave], sig);
    }
    desenharCaminho(resultado);
  }

  function termo(texto, classe) {
    return `<span class="termo${classe ? " " + classe : ""}">${texto}</span>`;
  }

  function fracao(cima, baixo, cortarBaixo) {
    return `<span class="fracao"><span class="cima">${cima}</span>` +
           `<span class="baixo${cortarBaixo ? " corta" : ""}">${baixo}</span></span>`;
  }

  function desenharCaminho(resultado) {
    const alvo = $("#caminho");
    alvo.innerHTML = "";

    if (!resultado) {
      alvo.innerHTML = `<p class="ajuda" style="margin:0">Digite um valor em qualquer campo acima para ver o caminho da conversão.</p>`;
      return;
    }

    const sig = contarSignificativos(estado.entradaBruta);
    alvo.appendChild(criar("h2", { textContent: "O caminho da conta", style: "margin-top:0" }));

    for (const destino of Object.keys(GRANDEZAS)) {
      if (destino === estado.origem) continue;
      const passos = resultado.caminhos[destino];
      if (!passos.length) continue;

      const trilha = criar("div", { className: "trilha" });
      trilha.appendChild(criar("p", {
        className: "titulo",
        textContent: GRANDEZAS[estado.origem].rotulo.toUpperCase() + " → " + GRANDEZAS[destino].rotulo.toUpperCase()
      }));

      const conta = criar("div", { className: "conta" });
      let html = termo(`${formatarNumero(passos[0].valorEntrada, sig)} <span class="corta">${passos[0].unidadeEntrada}</span>`, "entrada");

      passos.forEach((p, indice) => {
        const cortaEmCima = p.unidadeNumero !== p.unidadeSaida;
        const cima = `${p.numero === 1 ? "1" : formatarNumero(p.numero, 4)} ${cortaEmCima ? `<span class="corta">${p.unidadeNumero}</span>` : p.unidadeNumero}`;
        const baixo = `${p.denominador === 1 ? "1" : formatarNumero(p.denominador, 4)} ${p.unidadeDenominador}`;
        html += `<span class="op">×</span>` + fracao(cima, baixo, true);
        const ehUltimo = indice === passos.length - 1;
        if (ehUltimo) {
          html += `<span class="op">=</span>` + termo(`${formatarNumero(p.valorSaida, sig)} ${p.unidadeSaida}`, "saida");
        }
      });

      conta.innerHTML = html;
      trilha.appendChild(conta);
      trilha.appendChild(criar("p", {
        className: "motivo",
        textContent: passos.map(p => p.motivo).join("; ") + "."
      }));
      alvo.appendChild(trilha);
    }

    const nota = criar("p", { className: "ajuda" });
    nota.innerHTML = `Resultados com ${sig} algarismo${sig > 1 ? "s" : ""} significativo${sig > 1 ? "s" : ""}, herdado${sig > 1 ? "s" : ""} do valor que você digitou. ` +
      `O volume vale apenas se a substância for um gás na condição escolhida.`;
    alvo.appendChild(nota);
  }



  /* ---------------- tela: balancear ---------------- */

  const EXEMPLOS_EQ = [
    "CH4 + O2 -> CO2 + H2O",
    "C3H8 + O2 -> CO2 + H2O",
    "Fe + O2 -> Fe2O3",
    "Al + HCl -> AlCl3 + H2",
    "KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2",
    "MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O",
  ];

  function montarExemplosEquacao() {
    const caixa = $("#exemplos-eq");
    for (const eq of EXEMPLOS_EQ) {
      const b = criar("button", { type: "button", className: "chip", textContent: eq });
      b.addEventListener("click", () => {
        $("#equacao").value = eq;
        balancearAtual();
      });
      caixa.appendChild(b);
    }
  }

  function balancearAtual() {
    const entrada = $("#equacao").value;
    $("#erro-equacao").innerHTML = "";
    $("#equacao").setAttribute("aria-invalid", "false");

    try {
      estado.balanceada = balancear(entrada);
      estado.equacao = entrada;
      estado.esteq.quantidades = {};
      estado.esteq.purezas = {};
      estado.esteq.produtoRendimento = 0;
      estado.esteq.massaObtida = "";
      guardar();
      desenharEquacao();
    } catch (e) {
      estado.balanceada = null;
      $("#resultado-equacao").innerHTML = "";
      $("#equacao").setAttribute("aria-invalid", "true");
      const caixa = criar("div", { className: "erro" });
      caixa.appendChild(criar("strong", { textContent: e.message }));
      $("#erro-equacao").appendChild(caixa);
    }
  }

  function desenharEquacao() {
    const b = estado.balanceada;
    const alvo = $("#resultado-equacao");
    alvo.innerHTML = "";

    const cartao = criar("div", { className: "cartao" });
    const vista = criar("div", { className: "equacao-vista" });
    vista.innerHTML = escreverEquacaoHTML(b);
    cartao.appendChild(vista);
    cartao.appendChild(criar("p", {
      className: "ajuda",
      style: "text-align:center;margin:0",
      textContent: "Coeficientes em laranja. Os que valem 1 ficam subentendidos, como se escreve à mão.",
    }));
    alvo.appendChild(cartao);

    const prova = criar("div", { className: "cartao" });
    prova.innerHTML = "<h2 style=\"margin-top:0\">A prova: átomos contados dos dois lados</h2>";
    const tabela = criar("table", { className: "conferencia" });
    tabela.innerHTML = "<thead><tr><th>Elemento</th><th>Antes</th><th>Depois</th></tr></thead>";
    const corpo = criar("tbody");
    for (const c of b.conferencia) {
      const tr = criar("tr");
      const rotulo = c.elemento === "carga" ? "carga elétrica" : c.elemento;
      tr.innerHTML = `<td>${rotulo}</td><td class="num ${c.fecha ? "fecha" : "falha"}">${c.antes}</td>` +
                     `<td class="num ${c.fecha ? "fecha" : "falha"}">${c.depois}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    prova.appendChild(tabela);
    prova.appendChild(criar("p", {
      className: "ajuda",
      textContent: b.usaCarga
        ? "Numa equação iônica a carga também precisa fechar, e ela entra no sistema como se fosse mais um elemento."
        : "É esta a conta que o balanceamento tem de satisfazer: nenhum átomo aparece nem desaparece.",
    }));
    alvo.appendChild(prova);

    const acao = criar("div", { className: "cartao" });
    acao.innerHTML = "<p style=\"margin:0 0 var(--mb-e3)\">Com a equação fechada, dá para descobrir quanto se forma a partir do que você tem na bancada.</p>";
    const botao = criar("button", { className: "botao", type: "button", textContent: "Levar para a estequiometria" });
    botao.addEventListener("click", () => mostrarTela("tela-esteq"));
    acao.appendChild(botao);
    alvo.appendChild(acao);
  }

  /* ---------------- tela: estequiometria ---------------- */

  function desenharEstequiometria() {
    const alvo = $("#painel-esteq");
    alvo.innerHTML = "";
    const b = estado.balanceada;

    if (!b) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Balanceie uma equação primeiro. A estequiometria só faz sentido depois que a proporção entre as substâncias está definida.</p></div>`;
      return;
    }

    const cabeca = criar("div", { className: "cartao" });
    const vista = criar("div", { className: "equacao-vista", style: "font-size:var(--mb-t-titulo-3);padding:var(--mb-e2) 0" });
    vista.innerHTML = escreverEquacaoHTML(b);
    cabeca.appendChild(vista);
    alvo.appendChild(cabeca);

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = "<h2 style=\"margin-top:0\">O que você tem</h2>";

    const seletorUnidade = criar("select", { id: "unidade-esteq" });
    seletorUnidade.appendChild(criar("option", { value: "g", textContent: "Informar em gramas" }));
    seletorUnidade.appendChild(criar("option", { value: "mol", textContent: "Informar em mols" }));
    seletorUnidade.value = estado.esteq.unidade;
    seletorUnidade.addEventListener("change", () => {
      estado.esteq.unidade = seletorUnidade.value;
      desenharEstequiometria();
    });
    const rotuloUnidade = criar("label", { htmlFor: "unidade-esteq", textContent: "Unidade das quantidades" });
    entrada.appendChild(rotuloUnidade);
    entrada.appendChild(seletorUnidade);
    entrada.appendChild(criar("div", { style: "height:var(--mb-e4)" }));

    b.reagentes.forEach((r, i) => {
      const bloco = criar("div", { className: "reagente-campo" });

      const nome = criar("div");
      nome.innerHTML = `<span class="nome-r">${r.vista}</span><br>` +
        `<span class="ajuda">coef. ${r.coeficiente} · M = ${formatarNumero(r.analise.massaMolar, 5)} g/mol</span>`;
      bloco.appendChild(nome);

      const caixaQtd = criar("div");
      const idQtd = "qtd-" + i;
      caixaQtd.appendChild(criar("label", { htmlFor: idQtd, textContent: estado.esteq.unidade === "g" ? "Massa (g)" : "Quantidade (mol)" }));
      const campoQtd = criar("input", { type: "text", id: idQtd, inputMode: "decimal", autocomplete: "off", placeholder: "opcional" });
      campoQtd.value = estado.esteq.quantidades[i] || "";
      campoQtd.addEventListener("input", () => {
        estado.esteq.quantidades[i] = campoQtd.value;
        recalcularEstequiometria();
      });
      caixaQtd.appendChild(campoQtd);
      bloco.appendChild(caixaQtd);

      const caixaPureza = criar("div");
      if (estado.esteq.unidade === "g") {
        const idPur = "pur-" + i;
        caixaPureza.appendChild(criar("label", { htmlFor: idPur, textContent: "Pureza (%)" }));
        const campoPur = criar("input", { type: "text", id: idPur, inputMode: "decimal", autocomplete: "off", placeholder: "100" });
        campoPur.value = estado.esteq.purezas[i] || "";
        campoPur.addEventListener("input", () => {
          estado.esteq.purezas[i] = campoPur.value;
          recalcularEstequiometria();
        });
        caixaPureza.appendChild(campoPur);
      }
      bloco.appendChild(caixaPureza);
      entrada.appendChild(bloco);
    });

    entrada.appendChild(criar("p", {
      className: "ajuda",
      textContent: "Deixe em branco o reagente que estiver em excesso conhecido ou que não interessa controlar. Basta um valor para o cálculo sair.",
    }));
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-esteq" }));
    recalcularEstequiometria();
  }

  function recalcularEstequiometria() {
    const b = estado.balanceada;
    const saida = $("#saida-esteq");
    if (!saida) return;
    saida.innerHTML = "";

    const mols = {};
    let algum = false;
    b.reagentes.forEach((r, i) => {
      const valor = lerNumero(estado.esteq.quantidades[i]);
      if (!isFinite(valor) || valor <= 0) { mols[i] = null; return; }
      const pureza = lerNumero(estado.esteq.purezas[i]);
      mols[i] = entradaParaMols(valor, estado.esteq.unidade, r.analise.massaMolar, isFinite(pureza) ? pureza : 100);
      algum = true;
    });

    if (!algum) {
      saida.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe a quantidade de pelo menos um reagente para ver o resultado.</p></div>`;
      return;
    }

    const r = calcularEstequiometria(b, mols);
    if (r.situacao !== "ok") {
      saida.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">${r.mensagem}</p></div>`;
      return;
    }

    const conhecidos = r.razoes.length;

    const resumo = criar("div", { className: "cartao" });
    if (conhecidos > 1) {
      resumo.innerHTML =
        `<h2 style="margin-top:0">Quem manda na reação</h2>` +
        (r.proporcaoExata
          ? `<p style="margin:0">Os reagentes estão na proporção exata da equação: nenhum sobra. Na prática de bancada isso quase nunca acontece por acaso.</p>`
          : `<p style="margin:0">O reagente limitante é <strong>${r.limitante.formula}</strong>. Ele acaba primeiro, e por isso define tudo que se forma.</p>`);
      const tabelaRazao = criar("table");
      tabelaRazao.innerHTML = `<thead><tr><th>Reagente</th><th>mols</th><th>÷ coef.</th><th>razão</th></tr></thead>`;
      const corpo = criar("tbody");
      for (const item of r.razoes) {
        const reg = b.reagentes[item.indice];
        const tr = criar("tr");
        if (item.indice === r.limitanteIndice) tr.className = "limitante";
        tr.innerHTML = `<td>${reg.vista}${item.indice === r.limitanteIndice ? '<span class="selo-limitante">LIMITANTE</span>' : ""}</td>` +
          `<td class="num">${formatarNumero(item.mols, 4)}</td><td class="num">${item.coeficiente}</td>` +
          `<td class="num">${formatarNumero(item.razao, 4)}</td>`;
        corpo.appendChild(tr);
      }
      tabelaRazao.appendChild(corpo);
      resumo.appendChild(tabelaRazao);
      resumo.appendChild(criar("p", {
        className: "ajuda",
        textContent: "Repare que quem manda é a menor razão, não a menor massa nem o menor número de mols. Um reagente que a equação consome de três em três acaba antes de outro que ela consome de um em um.",
      }));
    } else {
      resumo.innerHTML = `<h2 style="margin-top:0">Com um reagente informado</h2>` +
        `<p style="margin:0">Só <strong>${b.reagentes[r.razoes[0].indice].formula}</strong> foi informado, então a conta supõe que todos os outros estão em excesso.</p>`;
    }
    saida.appendChild(resumo);

    const tabela = criar("div", { className: "cartao" });
    tabela.innerHTML = `<h2 style="margin-top:0">O que acontece com cada substância</h2>`;
    const t = criar("table");
    t.innerHTML = `<thead><tr><th>Substância</th><th>mol</th><th>massa</th><th>situação</th></tr></thead>`;
    const corpo = criar("tbody");

    for (const l of r.linhas) {
      const tr = criar("tr");
      if (l.limitante) tr.className = "limitante";
      if (l.papel === "reagente") {
        const situacao = l.emFalta ? "suposto em excesso"
          : l.limitante ? "consumido por inteiro"
          : `sobram ${formatarNumero(l.restanteMols, 3)} mol (${formatarNumero(l.restanteMassa, 3)} g)`;
        tr.innerHTML = `<td>${l.especie.vista}${l.limitante ? '<span class="selo-limitante">LIMITANTE</span>' : ""}</td>` +
          `<td class="num">−${formatarNumero(l.consumidoMols, 4)}</td>` +
          `<td class="num">−${formatarNumero(l.consumidoMassa, 4)} g</td>` +
          `<td class="ajuda" style="text-align:left">${situacao}</td>`;
      } else {
        tr.innerHTML = `<td>${l.especie.vista}</td>` +
          `<td class="num">+${formatarNumero(l.formadoMols, 4)}</td>` +
          `<td class="num">+${formatarNumero(l.formadoMassa, 4)} g</td>` +
          `<td class="ajuda" style="text-align:left">formado</td>`;
      }
      corpo.appendChild(tr);
    }
    t.appendChild(corpo);
    tabela.appendChild(t);
    tabela.appendChild(criar("p", {
      className: "ajuda",
      textContent: `A reação acontece ${formatarNumero(r.extensao, 4)} vez${r.extensao === 1 ? "" : "es"} — é esse número, multiplicado pelo coeficiente de cada substância, que gera a coluna de mols.`,
    }));
    saida.appendChild(tabela);

    // rendimento
    const produtos = r.linhas.filter(l => l.papel === "produto");
    const rendCartao = criar("div", { className: "cartao" });
    rendCartao.innerHTML = `<h2 style="margin-top:0">Rendimento</h2>` +
      `<p class="ajuda">A massa acima é a teórica, a que a equação promete. Pese o que realmente saiu da bancada e compare.</p>`;

    const seletorProduto = criar("select", { id: "produto-rend" });
    produtos.forEach((pr, i) => {
      seletorProduto.appendChild(criar("option", { value: String(i), textContent: pr.especie.formula }));
    });
    seletorProduto.value = String(Math.min(estado.esteq.produtoRendimento, produtos.length - 1));
    seletorProduto.addEventListener("change", () => {
      estado.esteq.produtoRendimento = Number(seletorProduto.value);
      recalcularEstequiometria();
    });
    rendCartao.appendChild(criar("label", { htmlFor: "produto-rend", textContent: "Produto isolado" }));
    rendCartao.appendChild(seletorProduto);

    const escolhido = produtos[Math.min(estado.esteq.produtoRendimento, produtos.length - 1)];
    rendCartao.appendChild(criar("div", { style: "height:var(--mb-e3)" }));
    rendCartao.appendChild(criar("label", { htmlFor: "massa-obtida", textContent: "Massa obtida (g)" }));
    const campoObtida = criar("input", { type: "text", id: "massa-obtida", inputMode: "decimal", autocomplete: "off", placeholder: formatarNumero(escolhido.formadoMassa, 3) });
    campoObtida.value = estado.esteq.massaObtida;
    campoObtida.addEventListener("input", () => {
      estado.esteq.massaObtida = campoObtida.value;
      recalcularEstequiometria();
      const nova = document.getElementById("massa-obtida");
      if (nova) { nova.focus(); nova.setSelectionRange(nova.value.length, nova.value.length); }
    });
    rendCartao.appendChild(campoObtida);

    const obtida = lerNumero(estado.esteq.massaObtida);
    if (isFinite(obtida) && obtida > 0) {
      const rend = calcularRendimento(obtida, escolhido.formadoMassa);
      const caixa = criar("div", { className: "veredito " + (rend.percentual > 100 ? "diagnosticado" : "certo"), style: "margin-top:var(--mb-e3)" });
      caixa.innerHTML = `<span class="selo">RENDIMENTO</span>` +
        `<p><strong>${formatarNumero(rend.percentual, 3)}%</strong> — ${formatarNumero(obtida, 3)} g obtidos de ${formatarNumero(escolhido.formadoMassa, 3)} g teóricos.</p>`;
      if (rend.observacao) caixa.appendChild(criar("p", { className: "ajuda", style: "margin-top:6px", textContent: rend.observacao }));
      rendCartao.appendChild(caixa);
    }

    saida.appendChild(rendCartao);
  }


  /* ---------------- ajudantes de formulário ---------------- */

  function campoTexto(pai, { id, rotulo, valor, dica, aoMudar, placeholder }) {
    const caixa = criar("div");
    caixa.appendChild(criar("label", { htmlFor: id, textContent: rotulo }));
    const input = criar("input", {
      type: "text", id, inputMode: "decimal", autocomplete: "off",
      spellcheck: false, value: valor || "", placeholder: placeholder || "",
    });
    input.addEventListener("input", () => aoMudar(input.value));
    caixa.appendChild(input);
    if (dica) caixa.appendChild(criar("p", { className: "ajuda", textContent: dica }));
    pai.appendChild(caixa);
    return input;
  }

  function campoSelecao(pai, { id, rotulo, opcoes, valor, aoMudar }) {
    const caixa = criar("div");
    caixa.appendChild(criar("label", { htmlFor: id, textContent: rotulo }));
    const sel = criar("select", { id });
    for (const o of opcoes) sel.appendChild(criar("option", { value: String(o.valor), textContent: o.rotulo }));
    sel.value = String(valor);
    sel.addEventListener("change", () => aoMudar(sel.value));
    caixa.appendChild(sel);
    pai.appendChild(caixa);
    return sel;
  }

  function cartaoDeErro(alvo, mensagem) {
    const c = criar("div", { className: "cartao" });
    c.appendChild(criar("div", { className: "erro", textContent: mensagem }));
    alvo.appendChild(c);
  }

  function listaDeAvisos(pai, avisos, classe = "ressalva") {
    for (const a of avisos || []) {
      pai.appendChild(criar("div", { className: classe, textContent: a }));
    }
  }

  /* ---------------- tela: concentração ---------------- */

  function desenharSolucoes() {
    const alvo = $("#painel-solucoes");
    alvo.innerHTML = "";
    const st = estado.solucao;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">A solução</h2>`;
    const grade = criar("div", { className: "grelha-3" });

    campoTexto(grade, {
      id: "sol-formula", rotulo: "Soluto", valor: st.formula, placeholder: "NaCl",
      aoMudar: (v) => { st.formula = v; desenharSaidaSolucao(); },
    });
    campoSelecao(grade, {
      id: "sol-unidade", rotulo: "Unidade informada",
      opcoes: Object.keys(UNIDADES_CONCENTRACAO).map((k) => ({ valor: k, rotulo: UNIDADES_CONCENTRACAO[k].rotulo })),
      valor: st.unidade, aoMudar: (v) => { st.unidade = v; desenharSolucoes(); },
    });
    campoTexto(grade, {
      id: "sol-valor", rotulo: `Valor (${UNIDADES_CONCENTRACAO[st.unidade].unidade || "adimensional"})`,
      valor: st.valor, aoMudar: (v) => { st.valor = v; desenharSaidaSolucao(); },
    });
    entrada.appendChild(grade);

    const linha2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(linha2, {
      id: "sol-densidade", rotulo: "Densidade da solução (g/mL)", valor: st.densidade,
      dica: "Sem densidade não há conversão entre massa e volume. Água pura é 1,00; ácido clorídrico concentrado é 1,19.",
      aoMudar: (v) => { st.densidade = v; desenharSaidaSolucao(); },
    });
    entrada.appendChild(linha2);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-solucao" }));
    desenharSaidaSolucao();

    desenharDiluicao(alvo);
    desenharMistura(alvo);
  }

  function desenharSaidaSolucao() {
    const alvo = $("#saida-solucao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.solucao;

    let analise;
    try { analise = analisar(st.formula); }
    catch (e) { cartaoDeErro(alvo, e.message); return; }

    const valor = lerNumero(st.valor);
    const densidade = lerNumero(st.densidade);
    if (!isFinite(valor) || valor <= 0) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe um valor de concentração.</p></div>`;
      return;
    }

    const molar = paraMolar(valor, st.unidade, analise.massaMolar, densidade);
    const tudo = todasAsConcentracoes(molar, analise.massaMolar, densidade);

    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML =
      `<h2 style="margin-top:0">A mesma solução em todas as unidades</h2>` +
      `<p class="ajuda">${formatarFormula(analise.normalizada)} · M = ${formatarNumero(analise.massaMolar, 5)} g/mol · ` +
      `d = ${formatarNumero(isFinite(densidade) && densidade > 0 ? densidade : 1, 3)} g/mL</p>`;

    const tabela = criar("table", { className: "tabela-unidades" });
    tabela.innerHTML = `<thead><tr><th>Unidade</th><th>Valor</th></tr></thead>`;
    const corpo = criar("tbody");
    for (const chave of Object.keys(UNIDADES_CONCENTRACAO)) {
      const u = UNIDADES_CONCENTRACAO[chave];
      const tr = criar("tr");
      if (chave === st.unidade) tr.className = "escolhida";
      const v = tudo[chave];
      tr.innerHTML = `<td>${u.rotulo}${chave === st.unidade ? " <span class=\"ajuda\">informado</span>" : ""}</td>` +
        `<td class="num">${isFinite(v) ? formatarNumero(v, 5) : "—"} ${u.unidade}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    cartao.appendChild(tabela);

    const base = criar("p", { className: "ajuda" });
    base.innerHTML = `Em um litro desta solução há <strong>${formatarNumero(tudo.massaSolutoPorLitro, 4)} g</strong> de soluto ` +
      `e <strong>${formatarNumero(tudo.massaSolventePorLitro, 5)} g</strong> de solvente, somando ${formatarNumero(tudo.massaSolucaoPorLitro, 5)} g. ` +
      `Todas as unidades acima são razões entre esses três números.`;
    cartao.appendChild(base);

    if (tudo.impossivel) {
      cartao.appendChild(criar("div", {
        className: "erro",
        textContent: "Esta combinação é impossível: a massa de soluto por litro já ultrapassa a massa total da solução. Confira a densidade ou a concentração.",
      }));
    }

    const fm = fracaoMolar(molar, analise.massaMolar, densidade);
    if (isFinite(fm)) {
      cartao.appendChild(criar("p", {
        className: "ajuda",
        textContent: `Fração molar do soluto em água: ${formatarNumero(fm, 4)}.`,
      }));
    }
    alvo.appendChild(cartao);
  }

  function desenharDiluicao(alvo) {
    const st = estado.solucao.dil;
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Diluição</h2>` +
      `<p class="ajuda">Preencha três campos e deixe o quarto em branco. Diluir não muda a quantidade de matéria do soluto: espalha a mesma quantidade num volume maior.</p>`;

    const grade = criar("div", { className: "grelha-2" });
    const campos = [
      ["dil-c1", "Concentração inicial (mol/L)", "c1"],
      ["dil-v1", "Volume inicial (mL)", "v1"],
      ["dil-c2", "Concentração final (mol/L)", "c2"],
      ["dil-v2", "Volume final (mL)", "v2"],
    ];
    for (const [id, rotulo, chave] of campos) {
      campoTexto(grade, {
        id, rotulo, valor: st[chave], placeholder: "em branco",
        aoMudar: (v) => { st[chave] = v; atualizarDiluicao(); },
      });
    }
    cartao.appendChild(grade);
    cartao.appendChild(criar("div", { id: "saida-diluicao" }));
    alvo.appendChild(cartao);
    atualizarDiluicao();
  }

  function atualizarDiluicao() {
    const alvo = $("#saida-diluicao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.solucao.dil;
    const r = diluicao({
      c1: lerNumero(st.c1), v1: lerNumero(st.v1),
      c2: lerNumero(st.c2), v2: lerNumero(st.v2),
    });

    if (r.situacao !== "ok") {
      alvo.innerHTML = `<p class="ajuda" style="margin-top:var(--mb-e3)">${r.mensagem}</p>`;
      return;
    }

    const linha = criar("div", { className: "destaque-linha" });
    linha.innerHTML =
      `<span class="rot">Pipete</span><span class="val">${formatarNumero(r.v1, 4)} mL</span>` +
      `<span class="rot">da solução de ${formatarNumero(r.c1, 4)} mol/L e complete a</span>` +
      `<span class="val">${formatarNumero(r.v2, 4)} mL</span>`;
    alvo.appendChild(linha);

    alvo.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Diluição de ${formatarNumero(r.fator, 4)} vezes. São ${formatarNumero(r.quantidadeDeMateria, 4)} mol de soluto, ` +
        `que continuam os mesmos depois de acrescentar ${formatarNumero(r.aguaAdicionada, 4)} mL de solvente.`,
    }));
    listaDeAvisos(alvo, r.avisos);
  }

  function desenharMistura(alvo) {
    const st = estado.solucao.mix;
    const cartao = criar("div", { className: "cartao" });
    cartao.innerHTML = `<h2 style="margin-top:0">Mistura de soluções</h2>` +
      `<p class="ajuda">Duas soluções do mesmo soluto. A quantidade de matéria soma; a concentração final é a soma dividida pelo volume total.</p>`;

    st.forEach((parte, i) => {
      const grade = criar("div", { className: "grelha-2" });
      campoTexto(grade, {
        id: `mix-c-${i}`, rotulo: `Solução ${i + 1} — concentração (mol/L)`, valor: parte.c,
        aoMudar: (v) => { parte.c = v; atualizarMistura(); },
      });
      campoTexto(grade, {
        id: `mix-v-${i}`, rotulo: `Solução ${i + 1} — volume (mL)`, valor: parte.v,
        aoMudar: (v) => { parte.v = v; atualizarMistura(); },
      });
      cartao.appendChild(grade);
    });

    cartao.appendChild(criar("div", { id: "saida-mistura" }));
    alvo.appendChild(cartao);
    atualizarMistura();
  }

  function atualizarMistura() {
    const alvo = $("#saida-mistura");
    if (!alvo) return;
    alvo.innerHTML = "";
    const r = misturar(estado.solucao.mix.map((p) => ({ c: lerNumero(p.c), v: lerNumero(p.v) })));

    if (r.situacao !== "ok") {
      alvo.innerHTML = `<p class="ajuda" style="margin-top:var(--mb-e3)">${r.mensagem}</p>`;
      return;
    }
    const linha = criar("div", { className: "destaque-linha" });
    linha.innerHTML = `<span class="rot">Concentração final</span><span class="val">${formatarNumero(r.cFinal, 5)} mol/L</span>`;
    alvo.appendChild(linha);
    alvo.appendChild(criar("p", {
      className: "ajuda",
      textContent: `${formatarNumero(r.mols, 5)} mol de soluto em ${formatarNumero(r.volume, 5)} mL.`,
    }));
    alvo.appendChild(criar("div", { className: "ressalva", textContent: r.ressalva }));
  }


  /* ---------------- tela: preparo ---------------- */

  function desenharPreparo() {
    const alvo = $("#painel-preparo");
    alvo.innerHTML = "";
    const st = estado.preparo;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">O que você quer preparar</h2>`;

    const g1 = criar("div", { className: "grelha-3" });
    campoTexto(g1, { id: "prep-formula", rotulo: "Reagente", valor: st.formula, placeholder: "NaOH",
      aoMudar: (v) => { st.formula = v; atualizarPreparo(); } });
    campoTexto(g1, { id: "prep-volume", rotulo: "Volume final (mL)", valor: st.volume,
      aoMudar: (v) => { st.volume = v; atualizarPreparo(); } });
    campoTexto(g1, { id: "prep-conc", rotulo: "Concentração (mol/L)", valor: st.concentracao,
      aoMudar: (v) => { st.concentracao = v; atualizarPreparo(); } });
    entrada.appendChild(g1);

    const g2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(g2, { id: "prep-pureza", rotulo: "Pureza do rótulo (%)", valor: st.pureza, placeholder: "100",
      dica: "O que está escrito no frasco. Esquecer este número é o erro de preparo mais comum.",
      aoMudar: (v) => { st.pureza = v; atualizarPreparo(); } });
    campoTexto(g2, { id: "prep-densidade", rotulo: "Densidade, se líquido (g/mL)", valor: st.densidade, placeholder: "só para reagente líquido",
      aoMudar: (v) => { st.densidade = v; atualizarPreparo(); } });
    entrada.appendChild(g2);

    const atalhos = criar("div", { className: "chips" });
    const exemplos = [
      ["NaOH 0,1 mol/L · 500 mL", { formula: "NaOH", volume: "500", concentracao: "0,1", pureza: "97", densidade: "" }],
      ["HCl 0,1 mol/L · 1 L", { formula: "HCl", volume: "1000", concentracao: "0,1", pureza: "", densidade: "" }],
      ["H2SO4 0,5 mol/L · 250 mL", { formula: "H2SO4", volume: "250", concentracao: "0,5", pureza: "", densidade: "" }],
      ["NaCl 0,9% fisiológico", { formula: "NaCl", volume: "1000", concentracao: "0,154", pureza: "99,5", densidade: "" }],
    ];
    for (const [rotulo, cfg] of exemplos) {
      const b = criar("button", { type: "button", className: "chip", textContent: rotulo });
      b.addEventListener("click", () => { Object.assign(st, cfg); desenharPreparo(); });
      atalhos.appendChild(b);
    }
    entrada.appendChild(atalhos);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-preparo" }));
    atualizarPreparo();
  }

  function atualizarPreparo() {
    const alvo = $("#saida-preparo");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.preparo;

    let analise;
    try { analise = analisar(st.formula); }
    catch (e) { cartaoDeErro(alvo, e.message); return; }

    const r = prepararSolucao({
      formula: analise.normalizada,
      massaMolar: analise.massaMolar,
      volumeFinalML: lerNumero(st.volume),
      concentracaoMolar: lerNumero(st.concentracao),
      pureza: lerNumero(st.pureza),
      densidadeReagente: lerNumero(st.densidade),
    });

    if (r.situacao !== "ok") { cartaoDeErro(alvo, r.mensagem); return; }

    const resumo = criar("div", { className: "cartao" });
    resumo.innerHTML = `<h2 style="margin-top:0">Na balança e na bureta</h2>`;

    const linha = criar("div", { className: "destaque-linha" });
    if (r.ehLiquido) {
      linha.innerHTML = `<span class="rot">Meça</span><span class="val">${formatarNumero(r.volumeReagenteML, 4)} mL</span>` +
        `<span class="rot">do reagente concentrado</span>`;
    } else {
      // cinco algarismos: a balança analítica lê até 0,1 mg, e arredondar
      // para quatro joga fora um dígito que o instrumento entrega
      linha.innerHTML = `<span class="rot">Pese</span><span class="val">${formatarNumero(r.massaReagente, 5)} g</span>` +
        `<span class="rot">do reagente</span>`;
    }
    resumo.appendChild(linha);

    const ficha = criar("dl", { className: "ficha-bancada", style: "margin-top:var(--mb-e4)" });
    const itens = [
      ["Quantidade de matéria", `${formatarNumero(r.mols, 5)} mol`],
      ["Massa de substância pura", `${formatarNumero(r.massaPura, 5)} g`],
      ["Pureza considerada", `${formatarNumero(r.purezaUsada, 4)}%`],
      ["Massa molar", `${formatarNumero(analise.massaMolar, 5)} g/mol`],
    ];
    if (r.ehLiquido) {
      itens.push(["Densidade do frasco", `${formatarNumero(r.densidade, 4)} g/mL`]);
      itens.push(["Concentração do frasco", `${formatarNumero(r.concentracaoDoFrasco, 4)} mol/L`]);
      itens.push(["Vidraria de medida", r.medidor.tipo]);
    } else {
      itens.push(["Balança", `${r.balanca.classe}${r.balanca.precisao ? " (" + r.balanca.precisao + ")" : ""}`]);
    }
    itens.push(["Balão volumétrico", r.balao.volume ? `${r.balao.volume} mL` : "não há tamanho adequado"]);
    for (const [rot, val] of itens) {
      ficha.appendChild(criar("dt", { textContent: rot }));
      ficha.appendChild(criar("dd", { textContent: val }));
    }
    resumo.appendChild(ficha);
    alvo.appendChild(resumo);

    const roteiro = criar("div", { className: "cartao" });
    roteiro.innerHTML = `<h2 style="margin-top:0">A ordem das operações</h2>`;
    const lista = criar("ol", { className: "roteiro" });
    for (const passo of r.passos) {
      const li = criar("li");
      li.innerHTML = `<p class="titulo-passo">${passo.titulo}</p><p>${passo.texto}</p>`;
      lista.appendChild(li);
    }
    roteiro.appendChild(lista);
    alvo.appendChild(roteiro);

    if (r.avisos.length) {
      const cuidados = criar("div", { className: "cartao" });
      cuidados.innerHTML = `<h2 style="margin-top:0">O que o exercício não conta</h2>`;
      listaDeAvisos(cuidados, r.avisos);
      alvo.appendChild(cuidados);
    }
  }

  /* ---------------- tela: ácidos e bases ---------------- */

  function desenharAcidoBase() {
    const alvo = $("#painel-ph");
    alvo.innerHTML = "";
    const st = estado.ph;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">A solução</h2>`;

    const g1 = criar("div", { className: "grelha-2" });
    campoSelecao(g1, {
      id: "ph-modo", rotulo: "Tipo de sistema", valor: st.modo,
      opcoes: [
        { valor: "acidoForte", rotulo: "Ácido forte" },
        { valor: "acidoFraco", rotulo: "Ácido fraco ou poliprótico" },
        { valor: "baseForte", rotulo: "Base forte" },
        { valor: "baseFraca", rotulo: "Base fraca" },
        { valor: "tampao", rotulo: "Tampão" },
      ],
      aoMudar: (v) => { st.modo = v; st.indice = 0; desenharAcidoBase(); },
    });

    const acidos = st.modo === "baseForte" || st.modo === "baseFraca";
    const acervo = acidos
      ? BASES.filter((b) => (st.modo === "baseForte" ? b.forte : !b.forte))
      : ACIDOS.filter((a) => (st.modo === "acidoForte" ? a.forte : !a.forte));

    campoSelecao(g1, {
      id: "ph-especie", rotulo: acidos ? "Base" : "Ácido",
      valor: Math.min(st.indice, acervo.length - 1),
      opcoes: acervo.map((e, i) => ({ valor: i, rotulo: `${e.formula} — ${e.nome}` })),
      aoMudar: (v) => { st.indice = Number(v); atualizarAcidoBase(); },
    });
    entrada.appendChild(g1);

    const g2 = criar("div", { className: st.modo === "tampao" ? "grelha-2" : "grelha-2", style: "margin-top:var(--mb-e3)" });
    if (st.modo === "tampao") {
      campoTexto(g2, { id: "ph-ca", rotulo: "Concentração do ácido (mol/L)", valor: st.tampaoAcido,
        aoMudar: (v) => { st.tampaoAcido = v; atualizarAcidoBase(); } });
      campoTexto(g2, { id: "ph-cb", rotulo: "Concentração da base conjugada (mol/L)", valor: st.tampaoBase,
        aoMudar: (v) => { st.tampaoBase = v; atualizarAcidoBase(); } });
    } else {
      campoTexto(g2, { id: "ph-conc", rotulo: "Concentração (mol/L)", valor: st.concentracao,
        aoMudar: (v) => { st.concentracao = v; atualizarAcidoBase(); } });
    }
    entrada.appendChild(g2);
    entrada.dataset.acervo = acervo.length;
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-ph" }));
    atualizarAcidoBase();
  }

  function acervoAtualPH() {
    const st = estado.ph;
    if (st.modo === "baseForte") return BASES.filter((b) => b.forte);
    if (st.modo === "baseFraca") return BASES.filter((b) => !b.forte);
    if (st.modo === "acidoForte") return ACIDOS.filter((a) => a.forte);
    return ACIDOS.filter((a) => !a.forte);
  }

  function atualizarAcidoBase() {
    const alvo = $("#saida-ph");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.ph;
    const acervo = acervoAtualPH();
    const especie = acervo[Math.min(st.indice, acervo.length - 1)];
    if (!especie) return;

    let pH = null;
    const detalhes = [];
    let extra = null;

    if (st.modo === "tampao") {
      const ca = lerNumero(st.tampaoAcido), cb = lerNumero(st.tampaoBase);
      if (!(ca > 0) || !(cb > 0)) {
        alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe as duas concentrações.</p></div>`;
        return;
      }
      const Ka = especie.Kas[0];
      const t = tampao(Ka, ca, cb);
      pH = t.pH;
      extra = t;
      detalhes.push(["pKa do ácido", formatarNumero(t.pKa, 4)]);
      detalhes.push(["Razão base/ácido", formatarNumero(cb / ca, 4)]);
      detalhes.push(["Henderson-Hasselbalch prevê", formatarNumero(t.henderson, 4)]);
      detalhes.push(["Capacidade tamponante", `${formatarNumero(t.capacidade, 3)} mol/L por unidade de pH`]);
    } else {
      const c = lerNumero(st.concentracao);
      if (!(c > 0)) {
        alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Informe a concentração.</p></div>`;
        return;
      }
      if (st.modo === "acidoForte") {
        pH = pHAcidoForte(c);
        detalhes.push(["Ionização", "total"]);
      } else if (st.modo === "acidoFraco") {
        pH = pHde(resolverH({ Kas: especie.Kas, cAcido: c, cCation: 0 }));
        especie.Kas.forEach((k, i) => detalhes.push([`Ka${i + 1}`, `${formatarNumero(k, 3)}  (pKa ${formatarNumero(pKde(k), 3)})`]));
      } else if (st.modo === "baseForte") {
        pH = pHBaseForte(c, especie.hidroxilas || 1);
        detalhes.push(["Hidroxilas por fórmula", String(especie.hidroxilas || 1)]);
      } else {
        pH = pHBaseFraca(especie.Kb, c);
        detalhes.push(["Kb", `${formatarNumero(especie.Kb, 3)}  (pKb ${formatarNumero(pKde(especie.Kb), 3)})`]);
        detalhes.push(["Ka do ácido conjugado", formatarNumero(KaDeKb(especie.Kb), 3)]);
      }
    }

    const h = Math.pow(10, -pH);
    const oh = KW_25 / h;

    const cartao = criar("div", { className: "cartao destaque" });
    cartao.innerHTML =
      `<p class="rotulo">pH DA SOLUÇÃO</p>` +
      `<p class="valor">${formatarNumero(pH, 4)}</p>` +
      `<p class="ajuda" style="margin-top:var(--mb-e2)">pOH ${formatarNumero(pOHde(pH), 4)} · ` +
      `[H⁺] = ${formatarNumero(h, 3)} mol/L · [OH⁻] = ${formatarNumero(oh, 3)} mol/L</p>`;
    alvo.appendChild(cartao);

    const ficha = criar("div", { className: "cartao" });
    ficha.innerHTML = `<h2 style="margin-top:0">${especie.formula} — ${especie.nome}</h2>`;
    const dl = criar("dl", { className: "ficha-bancada" });
    for (const [rot, val] of detalhes) {
      dl.appendChild(criar("dt", { textContent: rot }));
      dl.appendChild(criar("dd", { textContent: val }));
    }
    ficha.appendChild(dl);
    if (especie.observacao) {
      ficha.appendChild(criar("p", { className: "ajuda", textContent: especie.observacao }));
    }
    if (extra && extra.alerta) {
      ficha.appendChild(criar("div", { className: "ressalva", textContent: extra.alerta }));
    }
    ficha.appendChild(criar("p", {
      className: "ajuda",
      textContent: "O pH acima sai do balanço de cargas resolvido numericamente, não de fórmula aproximada. Por isso ele continua correto em soluções muito diluídas, onde a autoionização da água passa a mandar.",
    }));
    alvo.appendChild(ficha);
  }


  /* ---------------- tela: titulação ---------------- */

  function analitosDeTitulacao() {
    return ACIDOS.map((a) => ({
      ...a,
      rotulo: `${a.formula} — ${a.nome}${a.forte ? " (forte)" : a.Kas.length > 1 ? ` (${a.Kas.length} prótons)` : ""}`,
    }));
  }

  function configuracaoDeTitulacao() {
    const st = estado.titulacao;
    const lista = analitosDeTitulacao();
    const analito = lista[Math.min(st.indice, lista.length - 1)];
    return {
      analito,
      cfg: {
        cAnalito: lerNumero(st.cAnalito),
        vAnalito: lerNumero(st.vAnalito),
        cTitulante: lerNumero(st.cTitulante),
        analitoForte: analito.forte,
        Kas: analito.Kas,
      },
    };
  }

  function desenharTitulacao() {
    const alvo = $("#painel-titulacao");
    alvo.innerHTML = "";
    const st = estado.titulacao;

    const entrada = criar("div", { className: "cartao" });
    entrada.innerHTML = `<h2 style="margin-top:0">O experimento</h2>` +
      `<p class="ajuda">Analito no erlenmeyer, base forte na bureta.</p>`;

    const g1 = criar("div", { className: "grelha-2" });
    campoSelecao(g1, {
      id: "tit-analito", rotulo: "Analito", valor: st.indice,
      opcoes: analitosDeTitulacao().map((a, i) => ({ valor: i, rotulo: a.rotulo })),
      aoMudar: (v) => { st.indice = Number(v); desenharTitulacao(); },
    });
    campoTexto(g1, { id: "tit-c-analito", rotulo: "Concentração do analito (mol/L)", valor: st.cAnalito,
      aoMudar: (v) => { st.cAnalito = v; atualizarTitulacao(); } });
    entrada.appendChild(g1);

    const g2 = criar("div", { className: "grelha-2", style: "margin-top:var(--mb-e3)" });
    campoTexto(g2, { id: "tit-v-analito", rotulo: "Volume do analito (mL)", valor: st.vAnalito,
      aoMudar: (v) => { st.vAnalito = v; atualizarTitulacao(); } });
    campoTexto(g2, { id: "tit-c-titulante", rotulo: "Concentração do titulante (mol/L)", valor: st.cTitulante,
      aoMudar: (v) => { st.cTitulante = v; atualizarTitulacao(); } });
    entrada.appendChild(g2);
    alvo.appendChild(entrada);

    alvo.appendChild(criar("div", { id: "saida-titulacao" }));
    atualizarTitulacao();
  }

  /* Desenha a curva em SVG puro. Escala do eixo x pelo volume, do eixo y de
     pH 0 a 14, com a faixa de viragem do indicador escolhido em destaque. */
  function desenharCurva(curva, cfg, indicador) {
    const L = 44, R = 12, T = 12, B = 34;
    const largura = 620, altura = 340;
    const areaX = largura - L - R;
    const areaY = altura - T - B;
    const vMax = curva.vFinal || 1;

    const px = (v) => L + (v / vMax) * areaX;
    const py = (pH) => T + ((14 - pH) / 14) * areaY;

    const partes = [];

    if (indicador) {
      const y1 = py(indicador.fim), y2 = py(indicador.inicio);
      partes.push(`<rect x="${L}" y="${y1.toFixed(1)}" width="${areaX}" height="${(y2 - y1).toFixed(1)}" class="faixa-indicador"/>`);
    }

    for (let pH = 0; pH <= 14; pH += 2) {
      const y = py(pH);
      partes.push(`<line x1="${L}" y1="${y.toFixed(1)}" x2="${largura - R}" y2="${y.toFixed(1)}" class="malha"/>`);
      partes.push(`<text x="${L - 6}" y="${(y + 3).toFixed(1)}" class="rotulo-eixo" text-anchor="end">${pH}</text>`);
    }

    const passoV = vMax <= 30 ? 5 : vMax <= 70 ? 10 : 25;
    for (let v = 0; v <= vMax; v += passoV) {
      const x = px(v);
      partes.push(`<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${T + areaY}" class="malha"/>`);
      partes.push(`<text x="${x.toFixed(1)}" y="${altura - B + 14}" class="rotulo-eixo" text-anchor="middle">${v}</text>`);
    }

    partes.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${T + areaY}" class="eixo"/>`);
    partes.push(`<line x1="${L}" y1="${T + areaY}" x2="${largura - R}" y2="${T + areaY}" class="eixo"/>`);
    partes.push(`<text x="${(L + areaX / 2).toFixed(0)}" y="${altura - 4}" class="titulo-eixo" text-anchor="middle">volume de titulante (mL)</text>`);
    partes.push(`<text x="12" y="${(T + areaY / 2).toFixed(0)}" class="titulo-eixo" text-anchor="middle" transform="rotate(-90 12 ${(T + areaY / 2).toFixed(0)})">pH</text>`);

    for (const eq of curva.equivalencias) {
      const x = px(eq.volume);
      if (x > largura - R) continue;
      partes.push(`<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${(T + areaY).toFixed(1)}" class="linha-equivalencia"/>`);
      partes.push(`<circle cx="${x.toFixed(1)}" cy="${py(eq.pH).toFixed(1)}" r="4" class="marca-equivalencia"/>`);
    }

    const d = curva.dados
      .map((p, i) => `${i === 0 ? "M" : "L"}${px(p.v).toFixed(1)} ${py(Math.max(0, Math.min(14, p.pH))).toFixed(1)}`)
      .join(" ");
    partes.push(`<path d="${d}" class="curva"/>`);

    return `<svg viewBox="0 0 ${largura} ${altura}" role="img" ` +
      `aria-label="Curva de titulação: pH em função do volume de titulante adicionado">` +
      `<title>Curva de titulação</title>${partes.join("")}</svg>`;
  }

  function atualizarTitulacao() {
    const alvo = $("#saida-titulacao");
    if (!alvo) return;
    alvo.innerHTML = "";
    const st = estado.titulacao;
    const { analito, cfg } = configuracaoDeTitulacao();

    if (!(cfg.cAnalito > 0) || !(cfg.vAnalito > 0) || !(cfg.cTitulante > 0)) {
      alvo.innerHTML = `<div class="cartao"><p class="ajuda" style="margin:0">Preencha concentração e volume para ver a curva.</p></div>`;
      return;
    }

    const curva = curvaDeTitulacao(cfg);
    const indicador = INDICADORES[Math.min(st.indicador, INDICADORES.length - 1)];

    const grafico = criar("div", { className: "cartao" });
    const quadro = criar("div", { className: "grafico" });
    quadro.innerHTML = desenharCurva(curva, cfg, indicador);
    grafico.appendChild(quadro);
    grafico.appendChild(criar("p", {
      className: "ajuda", style: "text-align:center;margin:var(--mb-e2) 0 0",
      textContent: `${analito.formula} ${formatarNumero(cfg.cAnalito, 3)} mol/L, ${formatarNumero(cfg.vAnalito, 3)} mL, titulado com base forte ${formatarNumero(cfg.cTitulante, 3)} mol/L. Faixa sombreada: viragem da ${indicador.nome.toLowerCase()}.`,
    }));
    alvo.appendChild(grafico);

    const pontos = criar("div", { className: "cartao" });
    pontos.innerHTML = `<h2 style="margin-top:0">Pontos que valem olhar</h2>`;
    const tabela = criar("table");
    tabela.innerHTML = `<thead><tr><th>Momento</th><th>Volume</th><th>pH</th></tr></thead>`;
    const corpo = criar("tbody");
    const marcos = [{ rotulo: "Antes de começar", v: 0 }];
    curva.equivalencias.forEach((eq, i) => {
      marcos.push({ rotulo: `Meia-neutralização ${curva.equivalencias.length > 1 ? "do próton " + (i + 1) : ""}`.trim(), v: eq.volume - (i === 0 ? eq.volume / 2 : (eq.volume - curva.equivalencias[i - 1].volume) / 2) });
      marcos.push({ rotulo: `Equivalência ${curva.equivalencias.length > 1 ? "do próton " + (i + 1) : ""}`.trim(), v: eq.volume, destaque: true });
    });
    const ultima = curva.equivalencias[curva.equivalencias.length - 1].volume;
    marcos.push({ rotulo: "Excesso de titulante", v: ultima * 1.5 });

    for (const m of marcos) {
      const pH = pontoDeTitulacao({ ...cfg, vTitulante: m.v });
      const tr = criar("tr");
      if (m.destaque) tr.className = "limitante";
      tr.innerHTML = `<td>${m.rotulo}</td><td class="num">${formatarNumero(m.v, 4)} mL</td><td class="num">${formatarNumero(pH, 3)}</td>`;
      corpo.appendChild(tr);
    }
    tabela.appendChild(corpo);
    pontos.appendChild(tabela);

    const primeira = curva.equivalencias[0];
    const salto = pontoDeTitulacao({ ...cfg, vTitulante: primeira.volume * 1.004 }) -
                  pontoDeTitulacao({ ...cfg, vTitulante: primeira.volume * 0.996 });
    pontos.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Entre 0,4% antes e 0,4% depois da primeira equivalência o pH salta ${formatarNumero(Math.abs(salto), 3)} unidades. ` +
        `É esse salto que torna a titulação possível: uma gota a mais muda a cor. Quanto mais fraco o ácido, menor o salto — e mais difícil enxergar o ponto final.`,
    }));

    if (!analito.forte && analito.Kas.length === 1) {
      pontos.appendChild(criar("div", {
        className: "ressalva",
        textContent: `Repare que a equivalência não cai em pH 7, e sim em ${formatarNumero(primeira.pH, 3)}. No ponto de equivalência de um ácido fraco só existe a base conjugada dele em solução, e ela hidrolisa. Quem escolhe indicador supondo pH 7 erra aqui.`,
      }));
    }
    alvo.appendChild(pontos);

    // ---- indicadores ----
    const escolha = criar("div", { className: "cartao" });
    escolha.innerHTML = `<h2 style="margin-top:0">Qual indicador usar</h2>`;
    campoSelecao(escolha, {
      id: "tit-indicador", rotulo: "Indicador destacado no gráfico", valor: st.indicador,
      opcoes: INDICADORES.map((ind, i) => ({ valor: i, rotulo: `${ind.nome} (${formatarNumero(ind.inicio, 3)}–${formatarNumero(ind.fim, 3)})` })),
      aoMudar: (v) => { st.indicador = Number(v); atualizarTitulacao(); },
    });

    const avaliados = melhorIndicador(cfg, primeira);
    const t2 = criar("table", { className: "lista-indicadores", style: "margin-top:var(--mb-e3)" });
    t2.innerHTML = `<thead><tr><th>Indicador</th><th>Faixa</th><th>Para em</th><th>Erro</th></tr></thead>`;
    const c2 = criar("tbody");
    for (const a of avaliados) {
      const tr = criar("tr");
      if (a.adequado) tr.className = "adequado";
      tr.innerHTML =
        `<td>${a.indicador.nome}<br><span class="ajuda">${a.indicador.corAcida} → ${a.indicador.corBasica}</span></td>` +
        `<td class="num">${formatarNumero(a.indicador.inicio, 3)}–${formatarNumero(a.indicador.fim, 3)}</td>` +
        `<td class="num">${formatarNumero(a.vFinal, 5)} mL</td>` +
        `<td class="num erro-val">${a.erro > 0 ? "+" : ""}${formatarNumero(a.erro, 3)}%</td>`;
      c2.appendChild(tr);
    }
    t2.appendChild(c2);
    escolha.appendChild(t2);

    const melhor = avaliados[0];
    escolha.appendChild(criar("p", {
      className: "ajuda",
      textContent: `Volume de equivalência: ${formatarNumero(primeira.volume, 5)} mL. O erro de cada indicador é a diferença entre onde o analista para — quando enxerga a virada, no fim da faixa — e onde deveria parar.`,
    }));
    const veredito = criar("div", { className: melhor.adequado ? "dica-caixa" : "ressalva" });
    veredito.innerHTML = `<strong>${melhor.indicador.nome}</strong> é a melhor escolha aqui: erro de ${formatarNumero(melhor.erro, 3)}%. ${melhor.julgamento}`;
    escolha.appendChild(veredito);

    const ruins = avaliados.filter((a) => Math.abs(a.erro) > 2);
    if (ruins.length) {
      escolha.appendChild(criar("p", {
        className: "ajuda",
        textContent: `Não servem para esta titulação: ${ruins.map((a) => a.indicador.nome.toLowerCase()).join(", ")}. A faixa de viragem deles cai fora do salto, então a cor muda longe da equivalência.`,
      }));
    }
    alvo.appendChild(escolha);
  }

  /* ---------------- tela: treino ---------------- */

  function entrarNoTreino() {
    progresso = registrarDia(progresso);
    salvarProgresso(progresso);
    if (estado.degrau > progresso.desbloqueado) estado.degrau = progresso.desbloqueado;
    desenharDegraus();
    desenharPlacar();
    if (!estado.exercicio) proximoExercicio();
    else desenharExercicio();
    atualizarResumoLateral();
  }

  function desenharDegraus() {
    const caixa = $("#degraus");
    caixa.innerHTML = "";

    for (const d of DEGRAUS) {
      const liberado = d.n <= progresso.desbloqueado;
      const acertos = progresso.porDegrau[d.n].acertos;
      const b = criar("button", { type: "button", className: "degrau" });
      b.setAttribute("aria-pressed", String(d.n === estado.degrau));
      if (!liberado) b.disabled = true;

      const faltam = Math.max(0, ACERTOS_PARA_LIBERAR - progresso.porDegrau[d.n - 1>0 ? d.n - 1 : 1].acertos);
      const sub = liberado
        ? `${acertos} acerto${acertos === 1 ? "" : "s"} · ${d.resumo}`
        : `Faltam ${faltam} acerto${faltam === 1 ? "" : "s"} no degrau ${d.n - 1}`;

      b.innerHTML = `<span class="cabeca">${liberado ? "" : "🔒 "}Degrau ${d.n} — ${d.nome}</span><span class="sub">${sub}</span>`;
      b.addEventListener("click", () => {
        if (!liberado) return;
        estado.degrau = d.n;
        estado.tipoAnterior = null;
        desenharDegraus();
        proximoExercicio();
      });
      caixa.appendChild(b);
    }
  }

  function desenharPlacar() {
    const s = estado.sessao;
    const proporcao = s.total ? Math.round((s.certas / s.total) * 100) : 0;
    $("#placar").innerHTML =
      `<div><strong>${s.certas}/${s.total}</strong>nesta sessão${s.total ? " · " + proporcao + "%" : ""}</div>` +
      `<div><strong>${progresso.sequencia}</strong>acertos seguidos</div>` +
      `<div><strong>${progresso.ofensiva}</strong>dia${progresso.ofensiva === 1 ? "" : "s"} seguidos</div>` +
      `<div><strong>${progresso.xp}</strong>XP total</div>`;
  }

  function proximoExercicio() {
    estado.exercicio = gerarExercicio(estado.degrau, { volumeMolar: volumeMolarAtual().valor }, estado.tipoAnterior);
    estado.tipoAnterior = estado.exercicio.tipo;
    estado.usouDica = false;
    estado.respondido = false;
    estado.consultaAberta = false;
    estado.expressao = "";
    desenharExercicio();
  }

  function desenharExercicio() {
    const q = estado.exercicio;
    const alvo = $("#exercicio");
    alvo.innerHTML = "";

    alvo.appendChild(criar("p", { className: "ajuda", textContent: NOME_TIPO[q.tipo], style: "margin:0 0 var(--mb-e2)" }));

    const enunciado = criar("p", { className: "enunciado" });
    enunciado.innerHTML = q.enunciado;
    alvo.appendChild(enunciado);

    if (q.contexto) alvo.appendChild(criar("p", { className: "contexto", textContent: q.contexto }));

    const linha = criar("div", { className: "resposta-linha" });
    const campo = criar("input", {
      type: "text", id: "resposta", inputMode: "decimal",
      autocomplete: "off", spellcheck: false, placeholder: "sua resposta",
    });
    campo.setAttribute("aria-label", "Sua resposta em " + q.unidade);
    if (estado.respondido) campo.readOnly = true;
    linha.appendChild(campo);
    linha.appendChild(criar("span", { className: "unidade", textContent: q.unidade }));
    alvo.appendChild(linha);

    // eco do valor interpretado: quem escreve 6,02x10^23 precisa ver que o
    // aplicativo entendeu 6,02×10²³, e não outra coisa
    const eco = criar("p", { className: "eco", id: "eco-resposta" });
    alvo.appendChild(eco);
    const atualizarEco = () => {
      const bruto = campo.value.trim();
      if (!bruto) { eco.textContent = ""; return; }
      const valor = lerNumero(bruto);
      if (!isFinite(valor)) {
        eco.innerHTML = `<span class="eco-erro">Não consegui ler esse número.</span>`;
      } else {
        eco.innerHTML = `entendi <strong>${formatarNumero(valor, 6)}</strong> ${q.unidade}`;
      }
    };
    campo.addEventListener("input", atualizarEco);
    atualizarEco();

    const acoes = criar("div", { className: "acoes" });

    if (!estado.respondido) {
      const verificar = criar("button", { className: "botao", type: "button", textContent: "Verificar" });
      verificar.addEventListener("click", () => responder(campo.value));
      acoes.appendChild(verificar);

      const dica = criar("button", { className: "botao secundario", type: "button", textContent: "Ver dica" });
      dica.addEventListener("click", () => {
        estado.usouDica = true;
        dica.disabled = true;
        const caixa = criar("div", { className: "dica-caixa", textContent: q.dica });
        alvo.insertBefore(caixa, acoes.nextSibling);
      });
      acoes.appendChild(dica);

      const pular = criar("button", { className: "botao secundario", type: "button", textContent: "Trocar exercício" });
      pular.addEventListener("click", proximoExercicio);
      acoes.appendChild(pular);

      campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") responder(campo.value); });
    } else {
      const seguinte = criar("button", { className: "botao", type: "button", textContent: "Próximo exercício" });
      seguinte.addEventListener("click", proximoExercicio);
      acoes.appendChild(seguinte);
    }

    alvo.appendChild(acoes);

    montarConsulta(alvo, q);
    montarCalculadora(alvo, campo);

    if (!estado.respondido) campo.focus();
  }

  /* Consultar massa atômica não é colar: nenhum químico decora esses números,
     eles ficam na parede do laboratório. O que se aprende é o método. Por isso
     este painel não custa XP, ao contrário da dica. */
  function montarConsulta(alvo, q) {
    const caixa = criar("div", { className: "consulta" });
    const botao = criar("button", {
      type: "button", className: "chip",
      textContent: estado.consultaAberta ? "Fechar a consulta" : "Consultar massas atômicas",
    });
    botao.setAttribute("aria-expanded", String(estado.consultaAberta));
    botao.addEventListener("click", () => {
      estado.consultaAberta = !estado.consultaAberta;
      const respostaAtual = document.getElementById("resposta");
      const guardado = respostaAtual ? respostaAtual.value : "";
      desenharExercicio();
      const novo = document.getElementById("resposta");
      if (novo && guardado) novo.value = guardado;
    });
    caixa.appendChild(botao);

    if (estado.consultaAberta) {
      const elementos = [];
      const substancias = [];
      for (const f of q.formulas || []) {
        let a;
        try { a = analisar(f); } catch (e) { continue; }
        substancias.push({ formula: f, vista: formatarFormula(a.normalizada), M: a.massaMolar });
        for (const item of a.itens) {
          if (!elementos.some(e => e.simbolo === item.simbolo)) {
            elementos.push({ simbolo: item.simbolo, nome: item.nome, massa: item.massaAtomica });
          }
        }
      }
      elementos.sort((x, y) => x.simbolo.localeCompare(y.simbolo));

      const painel = criar("div", { className: "painel-consulta" });
      const tabela = criar("table");
      tabela.innerHTML = `<thead><tr><th>Elemento</th><th>Massa atômica</th></tr></thead>`;
      const corpo = criar("tbody");
      for (const e of elementos) {
        const tr = criar("tr");
        tr.innerHTML = `<td><span style="font-family:var(--mb-fonte-dado);font-weight:500">${e.simbolo}</span> ` +
          `<span class="ajuda">${e.nome}</span></td><td class="num">${formatarNumero(e.massa, 6)} u</td>`;
        corpo.appendChild(tr);
      }
      tabela.appendChild(corpo);
      painel.appendChild(tabela);

      if (substancias.length && q.degrau >= 3) {
        const lista = criar("p", { className: "ajuda" });
        lista.innerHTML = "Massa molar: " + substancias
          .map(x => `${x.vista} = ${formatarNumero(x.M, 5)} g/mol`).join(" · ");
        painel.appendChild(lista);
      }
      painel.appendChild(criar("p", {
        className: "ajuda",
        textContent: "Consultar a tabela não conta como dica e não reduz o XP.",
      }));
      caixa.appendChild(painel);
    }

    alvo.appendChild(caixa);
  }

  function montarCalculadora(alvo, campoResposta) {
    const caixa = criar("div", { className: "calculadora" });
    caixa.innerHTML = `<p class="titulo-calc">Calculadora</p>`;

    const linha = criar("div", { className: "linha-calc" });
    const campo = criar("input", {
      type: "text", id: "expressao", inputMode: "text", autocomplete: "off",
      spellcheck: false, placeholder: "4 / 39,997 × NA",
    });
    campo.setAttribute("aria-label", "Expressão para calcular");
    campo.value = estado.expressao;
    linha.appendChild(campo);
    caixa.appendChild(linha);

    const atalhos = criar("div", { className: "atalhos" });
    const inserir = (texto) => {
      const inicio = campo.selectionStart ?? campo.value.length;
      const fim = campo.selectionEnd ?? campo.value.length;
      campo.value = campo.value.slice(0, inicio) + texto + campo.value.slice(fim);
      const cursor = inicio + texto.length;
      campo.focus();
      campo.setSelectionRange(cursor, cursor);
      estado.expressao = campo.value;
      atualizar();
    };
    for (const [rotulo, texto] of [["×10ⁿ", "×10^"], ["×", "×"], ["÷", "/"], ["( )", "()"], ["N&thinsp;A", "NA"]]) {
      const b = criar("button", { type: "button", className: "tecla" });
      b.innerHTML = rotulo;
      b.addEventListener("click", () => inserir(texto === "()" ? "(" : texto));
      atalhos.appendChild(b);
    }
    caixa.appendChild(atalhos);

    const saida = criar("div", { className: "saida-calc", id: "saida-calc" });
    caixa.appendChild(saida);

    const acoes = criar("div", { className: "acoes", style: "margin-top:var(--mb-e2)" });
    const usar = criar("button", { className: "botao secundario", type: "button", textContent: "Usar como resposta" });
    usar.addEventListener("click", () => {
      let valor;
      try { valor = calcular(campo.value); } catch (e) { return; }
      if (valor === null || !isFinite(valor)) return;
      const destino = document.getElementById("resposta");
      if (!destino || destino.readOnly) return;
      destino.value = formatarNumero(valor, 4);
      destino.focus();
    });
    acoes.appendChild(usar);
    const limpar = criar("button", { className: "botao secundario", type: "button", textContent: "Limpar" });
    limpar.addEventListener("click", () => { campo.value = ""; estado.expressao = ""; campo.focus(); atualizar(); });
    acoes.appendChild(limpar);
    caixa.appendChild(acoes);

    function atualizar() {
      const texto = campo.value.trim();
      if (!texto) { saida.innerHTML = `<span class="ajuda">Escreva a conta e o resultado aparece aqui. NA é a constante de Avogadro.</span>`; usar.disabled = true; return; }
      try {
        const valor = calcular(texto);
        if (valor === null) { saida.innerHTML = ""; usar.disabled = true; return; }
        saida.innerHTML = `<span class="igual">=</span> <span class="valor-calc">${formatarNumero(valor, 6)}</span>`;
        usar.disabled = false;
      } catch (e) {
        saida.innerHTML = `<span class="erro-calc">${e.message}</span>`;
        usar.disabled = true;
      }
    }

    campo.addEventListener("input", () => { estado.expressao = campo.value; atualizar(); });
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") usar.click(); });
    atualizar();
    alvo.appendChild(caixa);
  }

  function responder(bruto) {
    const q = estado.exercicio;
    const veredito = corrigir(q, bruto);

    if (veredito.situacao === "invalido") {
      const aviso = criar("div", { className: "veredito errado" });
      aviso.innerHTML = `<span class="selo">NÃO ENTENDI O NÚMERO</span><p>${veredito.mensagem}</p>`;
      const antigo = $("#exercicio .veredito");
      if (antigo) antigo.remove();
      $("#exercicio").appendChild(aviso);
      return;
    }

    estado.respondido = true;
    const acertou = veredito.situacao === "certo";
    estado.sessao.total += 1;
    if (acertou) estado.sessao.certas += 1;

    const efeito = registrarResposta(progresso, q, acertou, estado.usouDica);
    estado.sessao.xp += efeito.ganho;

    desenharExercicio();
    document.getElementById("resposta").value = bruto;

    const caixa = criar("div", { className: "veredito " + veredito.situacao });
    const selo = acertou ? "CERTO"
      : veredito.erroReconhecido ? "SEI O QUE ACONTECEU" : "NÃO É ESSE VALOR";
    caixa.innerHTML = `<span class="selo">${selo}</span><p>${veredito.mensagem}</p>`;

    if (acertou && efeito.ganho) {
      caixa.appendChild(criar("span", { className: "ganho", textContent: `+${efeito.ganho} XP` }));
    }
    if (efeito.subiuDegrau) {
      caixa.appendChild(criar("p", {
        style: "margin-top:var(--mb-e2);font-weight:500",
        textContent: `Degrau ${efeito.subiuDegrau} liberado: ${DEGRAUS[efeito.subiuDegrau - 1].nome}.`
      }));
    }
    for (const m of efeito.medalhasNovas) {
      caixa.appendChild(criar("p", { style: "margin-top:4px", textContent: `Medalha conquistada: ${m.nome}.` }));
    }

    const alvo = $("#exercicio");
    alvo.insertBefore(caixa, alvo.querySelector(".acoes"));

    const resolucao = criar("div", { className: "resolucao" });
    resolucao.innerHTML = `<strong style="font-family:var(--mb-fonte-texto)">Resposta: ${formatarNumero(q.resposta, q.sig)} ${q.unidade}</strong><br>${q.resolucao}`;
    alvo.insertBefore(resolucao, alvo.querySelector(".acoes"));

    desenharDegraus();
    desenharPlacar();
    atualizarResumoLateral();
  }

  /* ---------------- tela: progresso ---------------- */

  function desenharProgresso() {
    const alvo = $("#painel-progresso");
    alvo.innerHTML = "";
    const nv = xpParaProximoNivel(progresso.xp);
    const taxa = progresso.totalTentativas
      ? Math.round((progresso.totalAcertos / progresso.totalTentativas) * 100) : 0;

    const cartaoNivel = criar("div", { className: "cartao" });
    cartaoNivel.innerHTML =
      `<div class="nivel-caixa"><span class="nivel-numero">Nível ${nv.nivel}</span>` +
      `<span class="ajuda" style="margin:0">${progresso.xp} XP acumulados</span></div>` +
      `<div class="xp-trilho"><div class="xp-barra" style="width:${Math.round(nv.atual / nv.necessario * 100)}%"></div></div>` +
      `<p class="ajuda">Faltam ${nv.necessario - nv.atual} XP para o nível ${nv.nivel + 1}.</p>`;
    alvo.appendChild(cartaoNivel);

    const numeros = criar("div", { className: "cartao" });
    numeros.innerHTML =
      `<div class="numeros">` +
      `<div><p class="n">${progresso.totalAcertos}</p><p class="r">acertos</p></div>` +
      `<div><p class="n">${taxa}%</p><p class="r">aproveitamento</p></div>` +
      `<div><p class="n">${progresso.melhorSequencia}</p><p class="r">melhor sequência</p></div>` +
      `<div><p class="n">${progresso.ofensiva}</p><p class="r">dias seguidos</p></div>` +
      `</div>`;
    alvo.appendChild(numeros);

    const escada = criar("div", { className: "cartao" });
    escada.innerHTML = `<h2 style="margin-top:0">A escada</h2>`;
    for (const d of DEGRAUS) {
      const liberado = d.n <= progresso.desbloqueado;
      const g = progresso.porDegrau[d.n];
      const total = g.acertos + g.erros;
      const linha = criar("div", { style: "margin-bottom:var(--mb-e3)" });
      linha.innerHTML =
        `<p style="margin:0 0 4px"><strong>Degrau ${d.n} — ${d.nome}</strong>` +
        `${liberado ? "" : ' <span class="ajuda">(bloqueado)</span>'}</p>` +
        `<p class="ajuda" style="margin:0 0 6px">${d.resumo}</p>` +
        `<div class="barra-trilho"><div class="barra" style="width:${total ? Math.round(g.acertos / total * 100) : 0}%"></div></div>` +
        `<p class="ajuda" style="margin:4px 0 0">${g.acertos} acertos e ${g.erros} erros</p>`;
      escada.appendChild(linha);
    }
    alvo.appendChild(escada);

    const fracos = pontosFracos(progresso, 2);
    const mapa = criar("div", { className: "cartao" });
    mapa.innerHTML = `<h2 style="margin-top:0">Onde você tropeça</h2>`;
    if (!fracos.length) {
      mapa.appendChild(criar("p", { className: "ajuda", textContent: "Ainda não há exercícios suficientes para apontar um padrão. Faça algumas rodadas no treino e este mapa se preenche." }));
    } else {
      for (const f of fracos.slice(0, 6)) {
        const linha = criar("div", { className: "fraqueza" });
        linha.innerHTML =
          `<span class="rot">${NOME_TIPO[f.tipo] || f.tipo}<br>` +
          `<span class="ajuda">${f.total} tentativa${f.total === 1 ? "" : "s"}</span></span>` +
          `<span class="taxa">${Math.round(f.taxa * 100)}% de erro</span>`;
        mapa.appendChild(linha);
      }
      mapa.appendChild(criar("p", { className: "ajuda", textContent: "Este é o dado mais útil da tela: ele diz exatamente qual conta merece a próxima meia hora de estudo." }));
    }
    alvo.appendChild(mapa);

    const medalhas = criar("div", { className: "cartao" });
    medalhas.innerHTML = `<h2 style="margin-top:0">Medalhas</h2>`;
    const grade = criar("div", { className: "medalhas" });
    for (const m of MEDALHAS) {
      const tem = progresso.medalhas.includes(m.id);
      const item = criar("div", { className: "medalha " + (tem ? "conquistada" : "pendente") });
      item.innerHTML = `<strong>${m.nome}</strong>${m.descricao}`;
      grade.appendChild(item);
    }
    medalhas.appendChild(grade);
    alvo.appendChild(medalhas);

    const zerar = criar("div", { className: "cartao" });
    zerar.innerHTML = `<h2 style="margin-top:0">Recomeçar</h2><p class="ajuda">Apaga XP, medalhas, degraus liberados e o mapa de dificuldades deste aparelho. Não dá para desfazer.</p>`;
    const botaoZerar = criar("button", { className: "botao secundario", type: "button", textContent: "Zerar meu progresso" });
    botaoZerar.addEventListener("click", () => {
      if (!window.confirm("Apagar todo o progresso guardado neste aparelho?")) return;
      progresso = zerarProgresso();
      estado.degrau = 1;
      estado.exercicio = null;
      estado.sessao = { certas: 0, total: 0, xp: 0 };
      desenharProgresso();
      atualizarResumoLateral();
    });
    zerar.appendChild(botaoZerar);
    alvo.appendChild(zerar);
  }

  function atualizarResumoLateral() {
    const nv = xpParaProximoNivel(progresso.xp);
    $("#resumo-lateral").textContent = `Nível ${nv.nivel} · ${progresso.xp} XP · ${progresso.totalAcertos} acertos`;
  }

  /* ---------------- tela: tabela periódica ---------------- */

  const CORES_FAMILIA = {
    alcalino: "#C43C0E", alcalinoterroso: "#B8860B", transicao: "#0B5E8C",
    postransicao: "#4A6FA5", semimetal: "#7A5AA8", naometal: "#1B7A3A",
    halogenio: "#14776E", nobre: "#164194", lantanideo: "#A03A6B", actinideo: "#8A5200",
  };

  function montarPeriodica() {
    const grade = $("#periodica");
    grade.innerHTML = "";

    for (const e of ELEMENTOS) {
      const [z, simbolo, nome, massa, col, lin, familia] = e;
      const b = criar("button", { type: "button", className: "celula f-" + familia });
      b.style.setProperty("--col", col);
      b.style.setProperty("--lin", lin);
      b.dataset.simbolo = simbolo;
      b.dataset.busca = (simbolo + " " + nome + " " + z).toLowerCase();
      b.setAttribute("aria-label", `${nome}, símbolo ${simbolo}, número atômico ${z}`);
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<span class="z">${z}</span><span class="sim">${simbolo}</span>`;
      b.addEventListener("click", () => abrirElemento(simbolo));
      grade.appendChild(b);
    }

    const legenda = $("#legenda");
    legenda.innerHTML = "";
    for (const chave in CORES_FAMILIA) {
      const s = criar("span");
      s.innerHTML = `<i class="ponto" style="background:${CORES_FAMILIA[chave]}"></i>${NOME_FAMILIA[chave]}`;
      legenda.appendChild(s);
    }
  }

  function abrirElemento(simbolo) {
    estado.elementoAberto = simbolo;
    for (const b of document.querySelectorAll(".celula")) {
      b.setAttribute("aria-pressed", b.dataset.simbolo === simbolo ? "true" : "false");
    }

    const e = POR_SIMBOLO[simbolo];
    const alvo = $("#ficha-elemento");
    alvo.innerHTML = "";

    const cartao = criar("div", { className: "cartao ficha" });
    cartao.innerHTML =
      `<div class="cabeca"><span class="simbolo">${e.simbolo}</span>` +
      `<div><strong>${e.nome}</strong><br>` +
      `<span style="color:var(--mb-texto-2);font-size:var(--mb-t-legenda)">${NOME_FAMILIA[e.familia]}</span></div></div>` +
      `<dl>` +
      `<dt>Número atômico</dt><dd>${e.z}</dd>` +
      `<dt>Massa atômica</dt><dd>${formatarNumero(e.massa, 6)} u${e.incerta ? " *" : ""}</dd>` +
      `<dt>Um mol pesa</dt><dd>${formatarNumero(e.massa, 6)} g</dd>` +
      `<dt>Um mol contém</dt><dd>6,022×10²³ átomos</dd>` +
      `</dl>` +
      (e.incerta ? `<p class="ajuda">* Sem composição isotópica terrestre estável: o valor é o número de massa do isótopo mais estável.</p>` : "");

    const acao = criar("button", { className: "botao secundario", type: "button", textContent: `Somar ${e.simbolo} à fórmula` });
    acao.style.marginTop = "var(--mb-e3)";
    acao.addEventListener("click", () => {
      const campo = $("#formula");
      campo.value = campo.value + e.simbolo;
      analisarAtual();
      mostrarTela("tela-massa");
      campo.focus();
    });
    cartao.appendChild(acao);
    alvo.appendChild(cartao);
    if (cartao.scrollIntoView) cartao.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function filtrarTabela(texto) {
    const alvo = texto.trim().toLowerCase();
    for (const b of document.querySelectorAll(".celula")) {
      b.classList.toggle("apagada", alvo !== "" && !b.dataset.busca.includes(alvo));
    }
  }

  /* ---------------- montagem ---------------- */

  function montarExemplos() {
    const caixa = $("#exemplos");
    for (const f of EXEMPLOS) {
      const b = criar("button", { type: "button", className: "chip" });
      b.innerHTML = formatarFormula(f);
      b.addEventListener("click", () => {
        $("#formula").value = f;
        analisarAtual();
      });
      caixa.appendChild(b);
    }
  }

  function montarSeletorVolume() {
    const sel = $("#volume-molar");
    for (const v of VOLUMES_MOLARES) {
      sel.appendChild(criar("option", { value: v.id, textContent: `${v.rotulo} — ${formatarNumero(v.valor, 4)} L/mol` }));
    }
    sel.value = estado.volumeMolarId;
    const explicar = () => {
      const v = volumeMolarAtual();
      $("#ajuda-volume").textContent = `Volume molar de ${formatarNumero(v.valor, 4)} L/mol — ${v.detalhe}.`;
    };
    explicar();
    sel.addEventListener("change", () => {
      estado.volumeMolarId = sel.value;
      guardar();
      explicar();
      desenharPonte();
    });
  }

  function iniciar() {
    recuperar();
    progresso = carregarProgresso();
    $("#formula").value = estado.formula;
    montarExemplos();
    montarExemplosEquacao();
    $("#equacao").value = estado.equacao;
    balancearAtual();
    montarSeletorVolume();
    montarPeriodica();
    analisarAtual();
    atualizarResumoLateral();

    $("#formula").addEventListener("input", analisarAtual);
    $("#equacao").addEventListener("input", balancearAtual);
    $("#busca").addEventListener("input", (ev) => filtrarTabela(ev.target.value));
    for (const b of document.querySelectorAll(".menu .item")) {
      b.addEventListener("click", () => mostrarTela(b.dataset.tela));
    }
    $("#menuBtn").addEventListener("click", abrirMenu);
    $("#fecharMenu").addEventListener("click", fecharMenu);
    $("#cortina").addEventListener("click", fecharMenu);
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && estreita()) fecharMenu();
    });

    const destino = {
      "#mol": "tela-mol",
      "#massa-molar": "tela-massa", "#converter": "tela-ponte",
      "#balancear": "tela-balancear", "#estequiometria": "tela-esteq",
      "#treino": "tela-treino", "#progresso": "tela-progresso", "#tabela": "tela-tabela",
    }[location.hash];

    const primeiraVez = !jaViuOnboarding();

    if (primeiraVez) {
      // primeira visita: sempre começa na tela do mol e mostra o tour
      estado.telaAtual = "tela-mol";
      mostrarTela("tela-mol");
      // no celular não abre o menu automaticamente — o overlay explica a navegação
      setTimeout(mostrarOnboarding, 350);
    } else {
      // quem já usou volta para onde parou
      mostrarTela(estado.telaAtual);
      if (destino) mostrarTela(destino);
      // no celular a gaveta começa aberta, para deixar claro que a navegação está ali
      if (estreita()) abrirMenu();
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  /* ---------------- onboarding do primeiro acesso ---------------- */

  function jaViuOnboarding() {
    try {
      return localStorage.getItem(CHAVE_ONBOARDING) === "1";
    } catch (e) {
      return false;
    }
  }

  function marcarOnboardingVisto() {
    try {
      localStorage.setItem(CHAVE_ONBOARDING, "1");
    } catch (e) { /* modo privativo */ }
  }

  function mostrarOnboarding() {
    if (document.getElementById("onboarding")) return;

    const overlay = criar("div", { id: "onboarding", className: "onboarding", role: "dialog",
      "aria-modal": "true", "aria-labelledby": "onboarding-titulo" });

    const painel = criar("div", { className: "onboarding-painel" });

    painel.innerHTML =
      `<p class="onboarding-badge">Bem-vindo ao MOLBOX</p>` +
      `<h2 id="onboarding-titulo">Do átomo ao mol, do mol à bancada</h2>` +
      `<ol class="onboarding-passos">` +
      `<li><strong>Comece pela chave.</strong> A tela “Mol: A Chave” mostra por que o mol destrava o trabalho do químico — e usa a analogia da dúzia para fazer o número de Avogadro caber na cabeça.</li>` +
      `<li><strong>Faça o Degrau 0.</strong> No final dessa mesma tela há um teste rápido com perguntas bem simples. Serve só para confirmar que a ideia do pacote ficou clara.</li>` +
      `<li><strong>Depois explore.</strong> Use o menu (ícone ☰ no canto) para abrir massa molar, balanceamento, soluções, titulação e o treino com diagnóstico de erro.</li>` +
      `</ol>` +
      `<p class="onboarding-dica">Tudo funciona sem internet. Seu progresso fica só neste aparelho.</p>`;

    const acoes = criar("div", { className: "onboarding-acoes" });
    const btn = criar("button", {
      type: "button",
      className: "botao",
      textContent: "Pegar a chave →"
    });
    btn.addEventListener("click", fecharOnboarding);
    acoes.appendChild(btn);
    painel.appendChild(acoes);

    overlay.appendChild(painel);
    document.body.appendChild(overlay);

    // foco no botão para acessibilidade
    setTimeout(() => btn.focus(), 50);

    // fechar com Escape
    const onKey = (ev) => {
      if (ev.key === "Escape") {
        fecharOnboarding();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  function fecharOnboarding() {
    const el = document.getElementById("onboarding");
    if (!el) return;
    el.classList.add("saindo");
    marcarOnboardingVisto();
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
      // no celular, agora sim abre o menu para o aluno ver a navegação
      if (estreita()) abrirMenu();
    }, 220);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
