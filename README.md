# MolBox 📦

Ferramenta interativa e gratuita para estudar o **conceito de mol** de forma simples, clara e prática.

Criada para auxiliar o ensino de Química (especialmente no SENAI), com foco em legibilidade, celular e gamificação leve.

## O que tem nesta primeira versão

- Explicação do mol com a analogia da **dúzia**
- Vídeo embutido
- Seção “O que isso destrava” (aplicações profissionais)
- **Degrau 0** – quiz interativo bem simples
- Design responsivo (celular + computador)
- Cores inspiradas no SENAI (azul + laranja)

## Como rodar localmente

1. Baixe ou clone este repositório
2. Abra o arquivo `index.html` no navegador  
   (ou use a extensão Live Server no VS Code)

## Como colocar no GitHub + Vercel (passo a passo)

### 1. Criar repositório no GitHub
- Acesse [github.com](https://github.com) e faça login
- Clique em **New repository**
- Nome sugerido: `molbox`
- Deixe público
- **Não** marque “Add a README” (já temos um)
- Clique em **Create repository**

### 2. Enviar os arquivos
No computador, abra a pasta do projeto e rode:

```bash
git init
git add .
git commit -m "Primeira versão do MolBox"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/molbox.git
git push -u origin main
```

(Substitua `SEU-USUARIO` pelo seu nome de usuário do GitHub)

### 3. Publicar na Vercel (grátis e rápido)
1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **Add New Project**
3. Selecione o repositório `molbox`
4. Clique em **Deploy**
5. Pronto! A Vercel vai te dar um link tipo: `https://molbox.vercel.app`

Sempre que você alterar o código e fizer `git push`, a Vercel atualiza sozinha.

## Estrutura dos arquivos

```
molbox/
├── index.html      ← estrutura da página
├── styles.css      ← visual (cores, layout)
├── script.js       ← quiz interativo
└── README.md       ← este arquivo
```

## Próximos passos possíveis

- Degrau 1 (mais interações e analogias)
- Calculadora de mol ↔ massa ↔ partículas
- Tabela periódica interativa
- Mais exercícios de estequiometria
- Modo escuro
- Progresso salvo no navegador (localStorage)

---

Feito com foco em **simplicidade** e **utilidade real** para o aluno.
