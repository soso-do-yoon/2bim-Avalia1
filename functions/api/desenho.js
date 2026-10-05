// functions/api/desenho.js
// Pages Function: POST /api/desenho
// Gera o desenho no servidor e assina com o e-mail verificado pelo Google.

import { gerarDesenho, numeroValido } from "../../lib/desenho.js";

// Resposta de erro em JSON, com o status HTTP indicado.
function erro(status, mensagem, extras = {}) {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extras },
  });
}

// Confere o id_token no Google e devolve o e-mail verificado (ou null).
async function emailDoToken(token, clientId) {
  if (!token || !clientId) return null;

  let resposta;
  try {
    resposta = await fetch(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token)
    );
  } catch {
    return null;
  }
  if (resposta.status !== 200) return null;

  let dados;
  try {
    dados = await resposta.json();
  } catch {
    return null;
  }

  if (dados.aud !== clientId) return null;
  if (String(dados.email_verified) !== "true") return null;
  if (!dados.email) return null;

  return dados.email;
}

export async function onRequest({ request, env }) {
  // 1) Método: só POST.
  if (request.method !== "POST") {
    return erro(405, "Método não permitido. Use POST.", { Allow: "POST" });
  }

  // 2) Corpo: JSON válido com "numero" inteiro entre 1 e 100.
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return erro(400, "Corpo ausente ou JSON inválido.");
  }

  const numero = corpo && corpo.numero;
  if (typeof numero !== "number" || !numeroValido(numero)) {
    return erro(400, "O campo numero deve ser um inteiro entre 1 e 100.");
  }

  // 3) Token: Authorization: Bearer <id_token>, verificado no Google.
  const autorizacao = request.headers.get("Authorization") || "";
  const partes = autorizacao.match(/^Bearer\s+(.+)$/i);
  const token = partes ? partes[1].trim() : "";

  const email = await emailDoToken(token, env.GOOGLE_CLIENT_ID);
  if (!email) {
    return erro(401, "Token ausente, inválido ou expirado.");
  }

  // 4) Tudo certo: gera o SVG assinado com o e-mail do token.
  const svg = gerarDesenho(numero, email);
  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml" },
  });
}
