/* MOLBOX — service worker. Estratégia: cache primeiro.
   O app é um conjunto pequeno e estável de arquivos; a rede só entra
   quando falta algo no cache ou quando a versão muda. */

const VERSAO = "molbox-v0.6.0";
const ARQUIVOS = [
  "./", "./index.html", "./app.css", "./tokens.css", "./fontes.css",
  "./manifest.webmanifest",
  "./js/elementos.js", "./js/parser.js", "./js/converter.js",
  "./js/balanceador.js", "./js/estequiometria.js",
  "./js/moleculas.js", "./js/calculadora.js",
  "./js/solucoes.js", "./js/preparo.js", "./js/acidobase.js", "./js/mol.js",
  "./js/exercicios.js", "./js/progresso.js", "./js/app.js",
  "./marca/molbox-principal.svg", "./marca/molbox-negativo.svg",
  "./icones/favicon.svg", "./icones/icone-180.png", "./icones/icone-192.png", "./icones/icone-512.png",
  "./fontes/exo-2-latin-600-italic.woff2",
  "./fontes/exo-2-latin-500-italic.woff2",
  "./fontes/inter-latin-400-normal.woff2",
  "./fontes/inter-latin-500-normal.woff2",
  "./fontes/ibm-plex-mono-latin-400-normal.woff2",
  "./fontes/ibm-plex-mono-latin-500-normal.woff2"
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    caches.match(evento.request).then((guardado) => {
      if (guardado) return guardado;
      return fetch(evento.request).then((resposta) => {
        if (resposta && resposta.status === 200 && resposta.type === "basic") {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(evento.request, copia));
        }
        return resposta;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
