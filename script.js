// ==========================================
// 1. CONFIGURAÇÃO INICIAL E ELEMENTOS DA TELA
// ==========================================
const canvas = document.getElementById("tela-jogo");
const ctx = canvas.getContext("2d");

// Elementos da interface (HTML)
const painelStatus = document.getElementById("painel-status");
const telaInicio = document.getElementById("tela-inicio");
const telaFim = document.getElementById("tela-fim");
const tituloFim = document.getElementById("titulo-fim");
const mensagemFim = document.getElementById("mensagem-fim");
const controlesMobile = document.getElementById("controles-mobile");

// Textos de status
const textoVida = document.getElementById("texto-vida");
const textoVidaMax = document.getElementById("texto-vida-max");
const textoClasse = document.getElementById("texto-classe");
const textoEspecial = document.getElementById("texto-especial");
const textoLocal = document.getElementById("texto-local");

// Variáveis de estado do jogo
let jogoRodando = false;
let classeEscolhida = "cavaleiro";
let teclas = {};
let projeteis = [];
let inimigos = [];
let mensagensFlutuantes = [];

// ==========================================
// 2. DADOS DAS CLASSES E DO JOGADOR
// ==========================================
const dadosClasses = {
  cavaleiro: { nome: "Cavaleiro", emoji: "🛡️", vida: 140, velocidade: 3.2, dano: 25, corProjetil: "#d1d5db", especial: "Golpe Giratório" },
  arqueiro:  { nome: "Arqueiro",  emoji: "🏹", vida: 100, velocidade: 4.5, dano: 20, corProjetil: "#fbbf24", especial: "Chuva de Flechas" },
  bruxo:     { nome: "Bruxo",     emoji: "🧙‍♂️", vida: 85,  velocidade: 3.5, dano: 35, corProjetil: "#38bdf8", especial: "Explosão Arcana" }
};

let jogador = {
  x: 100,
  y: 250,
  tamanho: 32,
  vida: 100,
  vidaMax: 100,
  velocidade: 3.5,
  dano: 20,
  emoji: "🛡️",
  tempoRecargaEspecial: 0, // Em frames (0 = pronto)
  invulneravel: 0
};

// Área da Vila Segura (onde o jogador pode se curar com E)
const vila = {
  x: 40,
  y: 180,
  largura: 130,
  altura: 140,
  nome: "Vila da Nascente"
};

// ==========================================
// 3. CONTROLES DE INTERFACE E BOTÕES
// ==========================================
// Seleção de classe na tela inicial
document.querySelectorAll(".btn-classe").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll(".btn-classe").forEach(b => b.classList.remove("selecionado"));
    botao.classList.add("selecionado");
    classeEscolhida = botao.getAttribute("data-classe");
  });
});

// Botões Iniciar e Reiniciar
document.getElementById("btn-iniciar").addEventListener("click", iniciarJogo);
document.getElementById("btn-reiniciar").addEventListener("click", iniciarJogo);

// Teclado (Pressionar e Soltar)
window.addEventListener("keydown", (e) => {
  const tecla = e.key.toLowerCase();
  teclas[tecla] = true;

  if (!jogoRodando) return;

  // Tecla G: Ataque Especial
  if (tecla === "g") {
    usarEspecial();
  }
  // Tecla E: Interagir (Curar na Vila)
  if (tecla === "e") {
    interagirVila();
  }
});

window.addEventListener("keyup", (e) => {
  teclas[e.key.toLowerCase()] = false;
});

// Clique do Mouse no Canvas para Atacar na direção do cursor
canvas.addEventListener("mousedown", (e) => {
  if (!jogoRodando) return;
  const rect = canvas.getBoundingClientRect();
  const escalaX = canvas.width / rect.width;
  const escalaY = canvas.height / rect.height;
  const alvoX = (e.clientX - rect.left) * escalaX;
  const alvoY = (e.clientY - rect.top) * escalaY;

  atacar(alvoX, alvoY);
});

// ==========================================
// 4. INICIALIZAÇÃO DO JOGO E INIMIGOS
// ==========================================
function iniciarJogo() {
  const info = dadosClasses[classeEscolhida];

  // Configura o jogador com base na classe
  jogador.x = 100;
  jogador.y = 250;
  jogador.vida = info.vida;
  jogador.vidaMax = info.vida;
  jogador.velocidade = info.velocidade;
  jogador.dano = info.dano;
  jogador.emoji = info.emoji;
  jogador.tempoRecargaEspecial = 0;
  jogador.invulneravel = 0;

  // Limpa tiros e mensagens antigas
  projeteis = [];
  mensagensFlutuantes = [];

  // Cria os inimigos na floresta e a Quimera no final
  inimigos = [
    { nome: "Esqueleto", emoji: "💀", x: 340, y: 120, tamanho: 30, vida: 50, vidaMax: 50, dano: 10, velocidade: 1.4, boss: false },
    { nome: "Esqueleto", emoji: "💀", x: 360, y: 380, tamanho: 30, vida: 50, vidaMax: 50, dano: 10, velocidade: 1.4, boss: false },
    { nome: "Orc Guerreiro", emoji: "👹", x: 520, y: 240, tamanho: 36, vida: 90, vidaMax: 90, dano: 18, velocidade: 1.1, boss: false },
    { nome: "QUIMERA (BOSS)", emoji: "🦁", x: 710, y: 250, tamanho: 54, vida: 260, vidaMax: 260, dano: 25, velocidade: 1.3, boss: true }
  ];

  // Atualiza telas
  telaInicio.classList.add("escondido");
  telaFim.classList.add("escondido");
  painelStatus.classList.remove("escondido");
  controlesMobile.classList.remove("escondido");
  textoClasse.textContent = info.nome;

  jogoRodando = true;
  loopPrincipal();
}

// ==========================================
// 5. MECÂNICAS DE COMBATE E VILA
// ==========================================
function atacar(alvoX, alvoY) {
  const angulo = Math.atan2(alvoY - jogador.y, alvoX - jogador.x);
  const info = dadosClasses[classeEscolhida];

  projeteis.push({
    x: jogador.x,
    y: jogador.y,
    vx: Math.cos(angulo) * 7,
    vy: Math.sin(angulo) * 7,
    dano: jogador.dano,
    cor: info.corProjetil,
    raio: 6
  });
}

function usarEspecial() {
  if (jogador.tempoRecargaEspecial > 0) {
    criarMensagem(jogador.x, jogador.y - 20, "Recarregando...", "#fbbf24");
    return;
  }

  const info = dadosClasses[classeEscolhida];
  // Dispara 8 projéteis em círculo ao redor do herói
  for (let i = 0; i < 8; i++) {
    const angulo = (Math.PI * 2 / 8) * i;
    projeteis.push({
      x: jogador.x,
      y: jogador.y,
      vx: Math.cos(angulo) * 6,
      vy: Math.sin(angulo) * 6,
      dano: jogador.dano * 1.5,
      cor: "#f87171",
      raio: 8
    });
  }

  jogador.tempoRecargaEspecial = 240; // ~4 segundos de recarga
  criarMensagem(jogador.x, jogador.y - 25, info.especial + "!", "#38bdf8");
}

function interagirVila() {
  if (estaNaVila()) {
    jogador.vida = jogador.vidaMax;
    criarMensagem(jogador.x, jogador.y - 25, "Vida Restaurada! ❤️", "#4ade80");
  } else {
    criarMensagem(jogador.x, jogador.y - 25, "Vá até a Vila para curar!", "#e5e7eb");
  }
}

function estaNaVila() {
  return (
    jogador.x > vila.x &&
    jogador.x < vila.x + vila.largura &&
    jogador.y > vila.y &&
    jogador.y < vila.y + vila.altura
  );
}

function criarMensagem(x, y, texto, cor) {
  mensagensFlutuantes.push({ x, y, texto, cor, tempo: 60 });
}

// ==========================================
// 6. ATUALIZAÇÃO DA LÓGICA (MOVIMENTO E DANO)
// ==========================================
function atualizar() {
  // Movimento do jogador pelas Setas ou WASD
  if (teclas["arrowup"] || teclas["w"]) jogador.y -= jogador.velocidade;
  if (teclas["arrowdown"] || teclas["s"]) jogador.y += jogador.velocidade;
  if (teclas["arrowleft"] || teclas["a"]) jogador.x -= jogador.velocidade;
  if (teclas["arrowright"] || teclas["d"]) jogador.x += jogador.velocidade;

  // Impede o jogador de sair da tela
  jogador.x = Math.max(20, Math.min(canvas.width - 20, jogador.x));
  jogador.y = Math.max(20, Math.min(canvas.height - 20, jogador.y));

  // Atualiza contadores
  if (jogador.tempoRecargaEspecial > 0) jogador.tempoRecargaEspecial--;
  if (jogador.invulneravel > 0) jogador.invulneravel--;

  // Atualiza projéteis
  for (let i = projeteis.length - 1; i >= 0; i--) {
    let p = projeteis[i];
    p.x += p.vx;
    p.y += p.vy;

    // Remove se sair da tela
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      projeteis.splice(i, 1);
      continue;
    }

    // Verifica colisão do tiro com cada inimigo
    for (let j = inimigos.length - 1; j >= 0; j--) {
      let ini = inimigos[j];
      const dist = Math.hypot(p.x - ini.x, p.y - ini.y);

      if (dist < ini.tamanho / 2 + p.raio) {
        ini.vida -= p.dano;
        criarMensagem(ini.x, ini.y - 20, "-" + Math.round(p.dano), "#f87171");
        projeteis.splice(i, 1);

        // Verifica se o inimigo morreu
        if (ini.vida <= 0) {
          const eraBoss = ini.boss;
          inimigos.splice(j, 1);
          if (eraBoss) {
            finalizarJogo(true);
            return;
          }
        }
        break;
      }
    }
  }

  // Movimento e ataque dos inimigos
  inimigos.forEach(ini => {
    const distJogador = Math.hypot(jogador.x - ini.x, jogador.y - ini.y);

    // Persegue o jogador se ele estiver perto e fora da Vila Segura
    if (distJogador < 230 && !estaNaVila()) {
      const angulo = Math.atan2(jogador.y - ini.y, jogador.x - ini.x);
      ini.x += Math.cos(angulo) * ini.velocidade;
      ini.y += Math.sin(angulo) * ini.velocidade;
    }

    // Dano ao encostar no jogador
    if (distJogador < (jogador.tamanho + ini.tamanho) / 2 && jogador.invulneravel === 0 && !estaNaVila()) {
      jogador.vida -= ini.dano;
      jogador.invulneravel = 50; // Breve proteção após levar dano
      criarMensagem(jogador.x, jogador.y - 20, "-" + ini.dano + " ❤️", "#ef4444");

      if (jogador.vida <= 0) {
        jogador.vida = 0;
        finalizarJogo(false);
      }
    }
  });

  // Atualiza mensagens flutuantes
  for (let i = mensagensFlutuantes.length - 1; i >= 0; i--) {
    mensagensFlutuantes[i].y -= 0.7;
    mensagensFlutuantes[i].tempo--;
    if (mensagensFlutuantes[i].tempo <= 0) mensagensFlutuantes.splice(i, 1);
  }

  // Atualiza textos do painel superior
  textoVida.textContent = Math.max(0, Math.round(jogador.vida));
  textoVidaMax.textContent = jogador.vidaMax;
  textoEspecial.textContent = jogador.tempoRecargaEspecial === 0 ? "Pronto!" : Math.ceil(jogador.tempoRecargaEspecial / 60) + "s";
