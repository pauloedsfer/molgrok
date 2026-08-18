// ===== DEGRAU 0 - Quiz interativo =====

const perguntas = [
  {
    pergunta: "O número de Avogadro (6,022 × 10²³) funciona como um…",
    opcoes: [
      "Pacote padrão de partículas (como a dúzia é um pacote de 12)",
      "Tipo de átomo especial",
      "Unidade de temperatura",
      "Nome de um equipamento de laboratório"
    ],
    correta: 0,
    explicacao: "Isso mesmo! O mol é um “pacote” que contém 6,022 × 10²³ partículas — da mesma forma que a dúzia é um pacote de 12 unidades."
  },
  {
    pergunta: "O que significa a palavra “mol” na química?",
    opcoes: [
      "Uma quantidade muito pequena de substância",
      "Um pacote que contém 6,022 × 10²³ entidades (átomos, moléculas…)",
      "O nome de um elemento químico",
      "Uma unidade de volume"
    ],
    correta: 1,
    explicacao: "Correto! O mol é a unidade que usamos para contar quantidades enormes de partículas de forma prática."
  },
  {
    pergunta: "Onde encontramos a massa de 1 mol de um elemento?",
    opcoes: [
      "No rótulo da embalagem do produto",
      "Na Tabela Periódica (massa atômica)",
      "Só em livros muito avançados",
      "Não é possível saber"
    ],
    correta: 1,
    explicacao: "Perfeito! A massa atômica que aparece na Tabela Periódica é exatamente a massa, em gramas, de 1 mol daquele elemento."
  },
  {
    pergunta: "Por que o mol é tão importante?",
    opcoes: [
      "Porque permite “contar” partículas usando a massa que medimos na balança",
      "Porque é obrigatório em todas as provas",
      "Porque foi inventado recentemente",
      "Porque substitui a Tabela Periódica"
    ],
    correta: 0,
    explicacao: "Exato! O mol faz a ponte entre o mundo atômico (invisível) e o mundo material (o que pesamos e medimos)."
  },
  {
    pergunta: "1 mol de água (H₂O) tem quantos gramas, aproximadamente?",
    opcoes: [
      "1 grama",
      "10 gramas",
      "18 gramas",
      "100 gramas"
    ],
    correta: 2,
    explicacao: "Isso! A massa molar da água é cerca de 18 g/mol (2 de hidrogênio + 16 de oxigênio)."
  }
];

let perguntaAtual = 0;
let acertos = 0;

const quizContainer = document.getElementById("quiz-container");
const resultadoDiv = document.getElementById("resultado");
const resultadoTitulo = document.getElementById("resultado-titulo");
const resultadoTexto = document.getElementById("resultado-texto");
const btnReiniciar = document.getElementById("btn-reiniciar");

function mostrarPergunta() {
  if (perguntaAtual >= perguntas.length) {
    mostrarResultado();
    return;
  }

  const p = perguntas[perguntaAtual];

  quizContainer.innerHTML = `
    <div class="pergunta-card">
      <h3>Pergunta ${perguntaAtual + 1} de ${perguntas.length}</h3>
      <p style="font-size: 1.15rem; margin-bottom: 20px; font-weight: 500;">${p.pergunta}</p>
      <div class="opcoes">
        ${p.opcoes.map((opcao, index) => `
          <button class="opcao" data-index="${index}">
            ${opcao}
          </button>
        `).join("")}
      </div>
      <div class="feedback" id="feedback"></div>
    </div>
  `;

  // Adiciona eventos nos botões
  const botoes = quizContainer.querySelectorAll(".opcao");
  botoes.forEach(botao => {
    botao.addEventListener("click", () => verificarResposta(parseInt(botao.dataset.index)));
  });
}

function verificarResposta(indiceEscolhido) {
  const p = perguntas[perguntaAtual];
  const botoes = quizContainer.querySelectorAll(".opcao");
  const feedback = document.getElementById("feedback");

  // Desabilita todos os botões
  botoes.forEach(b => b.disabled = true);

  if (indiceEscolhido === p.correta) {
    acertos++;
    botoes[indiceEscolhido].classList.add("correta");
    feedback.className = "feedback mostrar certo";
    feedback.textContent = "✅ " + p.explicacao;
  } else {
    botoes[indiceEscolhido].classList.add("errada");
    botoes[p.correta].classList.add("correta");
    feedback.className = "feedback mostrar errado";
    feedback.textContent = "❌ " + p.explicacao;
  }

  // Avança após 2,2 segundos
  setTimeout(() => {
    perguntaAtual++;
    mostrarPergunta();
  }, 2200);
}

function mostrarResultado() {
  quizContainer.innerHTML = "";
  resultadoDiv.classList.remove("escondido");

  const percentual = Math.round((acertos / perguntas.length) * 100);

  if (percentual === 100) {
    resultadoTitulo.textContent = "🎉 Perfeito! Você mandou bem!";
    resultadoTexto.textContent = `Você acertou todas as ${perguntas.length} perguntas. O conceito de mol já está começando a fazer sentido. Pode seguir para o próximo degrau com confiança!`;
  } else if (percentual >= 60) {
    resultadoTitulo.textContent = "👏 Muito bom!";
    resultadoTexto.textContent = `Você acertou ${acertos} de ${perguntas.length} perguntas (${percentual}%). Já entendeu a ideia principal. Vale a pena revisar as que errou e tentar de novo.`;
  } else {
    resultadoTitulo.textContent = "📚 Continue praticando!";
    resultadoTexto.textContent = `Você acertou ${acertos} de ${perguntas.length}. Sem problemas! Volte na explicação do mol e tente novamente. O importante é entender a analogia da dúzia.`;
  }
}

btnReiniciar.addEventListener("click", () => {
  perguntaAtual = 0;
  acertos = 0;
  resultadoDiv.classList.add("escondido");
  mostrarPergunta();
});

// Inicia o quiz quando a página carrega
mostrarPergunta();
