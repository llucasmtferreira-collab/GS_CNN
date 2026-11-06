// Segurança Pública Inteligente — inferência da MLP no navegador.
// Os pesos, as categorias e o limiar de decisão foram exportados pelo notebook, após o treinamento.

const campos = ['bairro', 'periodo', 'tipo_local', 'dia_semana'];
const aviso = document.getElementById('aviso');
const botao = document.getElementById('enviar');
let modeloWeb = null;

function mostrarAviso(mensagem) {
  aviso.style.display = 'block';
  aviso.textContent = mensagem;
}

function codificar(entrada) {
  // Reproduz a ordem do OneHotEncoder utilizado no treinamento.
  const total = campos.reduce((soma, campo) => soma + modeloWeb.categorias[campo].length, 0);
  const vetor = new Float32Array(total);
  let deslocamento = 0;

  for (const campo of campos) {
    const opcoes = modeloWeb.categorias[campo];
    const indice = opcoes.indexOf(entrada[campo]);
    if (indice === -1) throw new Error(`Opção inválida para ${campo}.`);
    vetor[deslocamento + indice] = 1;
    deslocamento += opcoes.length;
  }
  return vetor;
}

function preverRoubo(entrada) {
  // Camada densa: soma dos produtos de entrada e peso + bias, seguida da ativação.
  // As ativações ocultas são ReLU e a saída usa sigmoid, como no Keras.
  let valores = codificar(entrada);
  for (const camada of modeloWeb.camadas) {
    const saida = new Float32Array(camada.bias.length);
    for (let j = 0; j < saida.length; j++) {
      let soma = camada.bias[j];
      for (let i = 0; i < valores.length; i++) {
        soma += valores[i] * camada.pesos[i][j];
      }
      saida[j] = camada.ativacao === 'relu'
        ? Math.max(soma, 0)
        : 1 / (1 + Math.exp(-soma));
    }
    valores = saida;
  }
  return valores[0];
}

function preencherOpcoes() {
  for (const campo of campos) {
    const select = document.getElementById(campo);
    select.replaceChildren();
    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = 'Selecione uma opção';
    inicial.disabled = true;
    inicial.selected = true;
    select.appendChild(inicial);
    for (const categoria of modeloWeb.categorias[campo]) {
      const opcao = document.createElement('option');
      opcao.value = categoria;
      opcao.textContent = categoria;
      select.appendChild(opcao);
    }
    select.disabled = false;
  }
  document.getElementById('etiqueta').textContent = 'MLP · ARQUITETURA ' + modeloWeb.arquitetura;
  botao.disabled = false;
}

async function iniciar() {
  try {
    const resposta = await fetch('./modelo_web.json', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Arquivo do modelo não encontrado.');
    const modelo = await resposta.json();
    if (!modelo.camadas || !modelo.categorias || !campos.every(campo => modelo.categorias[campo])) {
      throw new Error('O arquivo do modelo está incompleto.');
    }
    modeloWeb = modelo;
    preencherOpcoes();
  } catch (erro) {
    mostrarAviso('Não foi possível carregar a rede neural. Abra este site pelo GitHub Pages ou por um servidor HTTP local. ' + erro.message);
  }
}

document.getElementById('formulario').addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!modeloWeb) return;

  try {
    const entrada = {};
    for (const campo of campos) entrada[campo] = document.getElementById(campo).value;
    const saida = preverRoubo(entrada);
    const limiar = typeof modeloWeb.limiar === 'number' ? modeloWeb.limiar : 0.5;
    const probabilidadeRoubo = saida * 100;
    const probabilidadeFurto = 100 - probabilidadeRoubo;
    // Roubo quando a probabilidade de roubo atinge o limiar escolhido na validação (no notebook).
    const classe = saida >= limiar ? 'Roubo' : 'Furto';

    document.getElementById('classe').textContent = classe;
    document.getElementById('mensagem').textContent = 'Classificação estimada para as características informadas: roubo quando a probabilidade de roubo é de pelo menos ' + (limiar * 100).toFixed(0) + '% (limiar escolhido na validação).';
    document.getElementById('pf').textContent = probabilidadeFurto.toFixed(2) + '%';
    document.getElementById('pr').textContent = probabilidadeRoubo.toFixed(2) + '%';
    document.getElementById('barra-furto').style.width = probabilidadeFurto + '%';
    document.getElementById('barra-roubo').style.width = probabilidadeRoubo + '%';
    aviso.style.display = 'none';
  } catch (erro) {
    mostrarAviso(erro.message);
  }
});

iniciar();
