// script.js
// O navegador só envia o número e o id_token do Google para o servidor.
// Quem gera o SVG (e assina com o e-mail verificado) é a função /api/desenho.

// O Client ID do Google é público e pode ficar no repositório.
const GOOGLE_CLIENT_ID = "499170150715-fra7hc9hb34us6o5q8q4qb0fnmla19s4.apps.googleusercontent.com";

const formulario = document.getElementById("formulario");
const campoNumero = document.getElementById("numero");
const area = document.getElementById("desenho");
const mensagem = document.getElementById("mensagem");
const botaoBaixar = document.getElementById("baixar");
const botaoGoogle = document.getElementById("botao-google");

let idToken = "";
let svgAtual = "";

// Chamado pelo Google depois do login: guarda o id_token.
function aoEntrar(resposta) {
  idToken = resposta.credential;
  mensagem.textContent = "Login feito com sucesso. Escolha um número e clique em Desenhar.";
}

// Desenha o botão "Sign in with Google" quando a biblioteca estiver carregada.
function iniciarGoogle() {
  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    mensagem.textContent = "Não foi possível carregar o login do Google.";
    return;
  }
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: aoEntrar,
  });
  window.google.accounts.id.renderButton(botaoGoogle, {
    theme: "outline",
    size: "large",
  });
}

window.addEventListener("load", iniciarGoogle);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  mensagem.textContent = "";

  const numero = Number(campoNumero.value);

  const cabecalhos = { "Content-Type": "application/json" };
  if (idToken) {
    cabecalhos["Authorization"] = "Bearer " + idToken;
  }

  let resposta;
  try {
    resposta = await fetch("/api/desenho", {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({ numero: numero }),
    });
  } catch {
    mensagem.textContent = "Erro de conexão com o servidor. Tente novamente.";
    return;
  }

  if (resposta.status === 400) {
    mensagem.textContent = "Número inválido. Digite um inteiro entre 1 e 100.";
    return;
  }
  if (resposta.status === 401) {
    mensagem.textContent = "Login inválido ou expirado. Entre com o Google novamente.";
    return;
  }
  if (!resposta.ok) {
    mensagem.textContent = "Erro inesperado do servidor (" + resposta.status + ").";
    return;
  }

  svgAtual = await resposta.text();
  area.innerHTML = svgAtual;
  botaoBaixar.hidden = false;
});

botaoBaixar.addEventListener("click", () => {
  const arquivo = new Blob([svgAtual], { type: "image/svg+xml" });
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exemplo.svg";
  link.click();
  URL.revokeObjectURL(url);
});
