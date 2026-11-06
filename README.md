# Segurança Pública Inteligente em São Paulo

**Global Solution 2026.2 — Aprendizado Profundo com Redes Neurais Convolucionais (FIAP)**

**Aluno:** Lucas Mota | **RM:** 566670 | **Trabalho individual**

## Objetivo

O projeto classifica registros de ocorrências da cidade de São Paulo como **furto** ou **roubo** usando uma rede neural do tipo **Multilayer Perceptron (MLP)**. Três arquiteturas foram treinadas e comparadas. A escolhida foi integrada a uma aplicação web, em que é possível selecionar características de uma ocorrência e visualizar a classe estimada e os percentuais.

**A aplicação não prevê crimes futuros.** Os percentuais são estimativas do tipo de uma ocorrência com as informações fornecidas, e não da chance de acontecer um crime em determinada região.

## Resumo dos resultados

| Modelo (conjunto de teste) | Limiar | Acurácia | Precision (roubo) | Recall (roubo) | F1-score (roubo) |
|---|---:|---:|---:|---:|---:|
| Referência: responder sempre "furto" | — | 72,00% | 0,00% | 0,00% | 0,00% |
| MLP A | 0,50 | 72,71% | 52,31% | 28,73% | 37,09% |
| **MLP A adotada no site** | **0,34** | **68,80%** | **46,72%** | **81,27%** | **59,33%** |

Responder sempre "furto" já acerta 72% dos casos do teste, então a acurácia sozinha não mostra bem o desempenho. Com o limiar padrão de 0,5 a rede quase não supera essa referência e encontra só 28,73% dos roubos. Ajustar o limiar usando **apenas a validação** faz a rede encontrar 81,27% dos roubos, ao custo de mais alarmes falsos e de um pouco de acurácia. Os detalhes estão nas seções abaixo.

## Base de dados

- **Fonte pública:** Secretaria da Segurança Pública do Estado de São Paulo (SSP-SP), [Portal de Estatísticas — Consultas](https://www.ssp.sp.gov.br/estatistica/consultas).
- **Arquivo original:** `SPDadosCriminais_2025.xlsx`, disponível na área de SP Dados da SSP-SP, ano 2025.
- **Período analisado:** fatos de 1º de janeiro a 31 de dezembro de 2025.
- **Recorte geográfico:** município de São Paulo (capital), usando o campo `NOME_MUNICIPIO_CIRCUNSCRICAO`, referente ao município do fato, e não à delegacia de registro.
- **Classes:** `FURTO - OUTROS` (0) e `ROUBO - OUTROS` (1), da coluna `NATUREZA_APURADA`.

O arquivo `dados/ocorrencias_capital_2025.csv`, incluído neste repositório, foi extraído da planilha pública com as abas `JAN-JUN_2025` e `JUL-DEZ_2025`. Foram mantidas apenas as seguintes colunas necessárias para este experimento: `NOME_DELEGACIA`, `NUM_BO`, `ANO_BO`, `DATA_OCORRENCIA_BO`, `DESC_PERIODO`, `DESCR_TIPOLOCAL`, `BAIRRO`, `NOME_MUNICIPIO_CIRCUNSCRICAO` e `NATUREZA_APURADA`. O CSV contém 346.702 linhas candidatas. A planilha original de cerca de 187 MB não foi incluída.

### Critérios de seleção

No notebook, os registros são filtrados pelo município da ocorrência, pela natureza e pelo ano do fato. Para não contar diversos itens de um mesmo boletim como exemplos independentes, os BOs são identificados pelo conjunto **delegacia + ano + número**. Boletins com rótulos contraditórios são excluídos e as duplicidades são retiradas. Após esses filtros, restaram **339.923 boletins únicos**.

Foi sorteada uma amostra **estratificada de 15.000 registros** (10.796 furtos e 4.204 roubos) com semente 42, preservando aproximadamente a proporção entre as classes. Desse total, 10.500 foram destinados a treinamento, 2.250 a validação e 2.250 a teste.

O arquivo original pode ser obtido no portal da SSP-SP selecionando SP Dados, dados criminais e o ano de 2025. Para reproduzir o CSV, devem ser combinadas as duas abas e selecionadas as colunas acima, com o município da ocorrência igual a São Paulo e as duas naturezas de interesse. As demais operações de limpeza, amostragem e treinamento ficam dentro do notebook.

## Atributos e pré-processamento

O modelo recebe **quatro atributos**: bairro (`BAIRRO`), período do dia (`DESC_PERIODO`), tipo de local (`DESCR_TIPOLOCAL`) e dia da semana, calculado a partir de `DATA_OCORRENCIA_BO`. Cada um responde a uma pergunta simples sobre o registro: *onde* (bairro e tipo de local) e *quando* (período do dia e dia da semana). São campos que descrevem o contexto do fato, sem revelar a natureza da ocorrência e sem dados pessoais.

Todos são categóricos. As categorias menos frequentes de bairro e tipo de local são agrupadas como `OUTROS`, com base somente no treino. Valores ausentes são preservados como `NAO INFORMADO`. A codificação `OneHotEncoder` é ajustada somente com os registros de treinamento e produz **65 entradas binárias (0/1)**, dispensando escalonamento adicional. A natureza da ocorrência, os identificadores do BO e a delegacia **não são entradas da MLP**, evitando vazamento da resposta e uso de identificadores.

### O que os dados mostram (somente treino)

O notebook (seção 5.1) mede, só com o conjunto de treino, quanto cada atributo ajuda a separar furto de roubo:

- Os roubos são 28,0% do treino e os furtos 72,0%: as classes são **desbalanceadas**.
- **Período do dia:** 57,4% dos registros do treino têm período `NAO INFORMADO` (na amostra completa, 8.623 registros, ou 57,5%). Esses registros concentram **89,4% de todos os roubos** (43,6% deles são roubo), enquanto entre os registros com período informado só 7,0% são roubo.
- **Tipo de local:** `VIA PUBLICA` é 77,9% do treino e tem 32,9% de roubo; terminais/estações (11,7%), residências (12,4%) e "outros" (6,4%) têm bem menos.
- **Dia da semana:** a porcentagem de roubo fica entre 25,6% e 30,1% em todos os dias; quase não separa as classes.

`NAO INFORMADO` no período não é uma característica do crime, e sim de **como o boletim foi preenchido**. Isso não é vazamento da resposta, mas a rede aprende essa relação e ela é uma limitação da base. É por isso que, no site, o exemplo "Pinheiros, sexta-feira, noite, via pública" resulta em furto (8,35% de roubo), enquanto o mesmo exemplo com período não informado resulta em roubo (44,70%).

## Três arquiteturas MLP

| Arquitetura | Camadas ocultas | Finalidade |
|---|---|---|
| A | Dense(16, ReLU) | Rede simples de referência |
| B | Dense(32, ReLU), Dense(16, ReLU) | Verificar o efeito de mais neurônios e camadas |
| C | Dense(64, ReLU), Dropout(0,25), Dense(32, ReLU) | Comparar rede maior com regularização |

As três têm uma saída `Dense(1, activation="sigmoid")`, função de perda **binary cross-entropy**, otimizador **Adam** com `learning_rate=0.001`, `batch_size=64`, até **25 épocas**, e `EarlyStopping` monitorando a perda de validação (`patience=4`, com restauração dos melhores pesos).

### Comparação na validação (classe positiva: roubo, limiar 0,5)

| Modelo | Acurácia | Precision | Recall | F1-score | Perda de validação |
|---|---:|---:|---:|---:|---:|
| **A** | 72,04% | **50,27%** | **29,79%** | **37,41%** | 0,4920 |
| B | **72,76%** | 62,50% | 7,13% | 12,80% | 0,4907 |
| C | 72,49% | 53,30% | 15,37% | 23,86% | **0,4898** |
| *Referência: sempre "furto"* | *71,96%* | *0,00%* | *0,00%* | *0,00%* | *—* |

A arquitetura **A** foi escolhida por ter o maior **F1-score de validação**, sem consultar o conjunto de teste nessa decisão.

**Efeito das mudanças.** As três redes são muito parecidas: a acurácia fica quase igual à referência de "sempre furto" e a perda de validação é praticamente a mesma. Mais camadas e neurônios (B) elevaram a acurácia em 0,72 ponto percentual e derrubaram o recall; Dropout (C) ficou no meio; a rede mais simples (A) teve a menor acurácia e o melhor F1. Ou seja, o limite está mais nos atributos do que na capacidade da rede. O F1 varia bastante mesmo com perdas quase iguais porque, com o limiar fixo de 0,5, as redes diferem principalmente em quantos casos são apontados como roubo.

### Ajuste do limiar de decisão (usando só a validação)

A saída da rede é uma probabilidade de roubo. Como roubo é a classe menos frequente (cerca de 28%), a rede raramente chega a 0,5 e deixa passar muitos roubos. O limiar foi então reavaliado de 0,05 a 0,60 **no conjunto de validação**, escolhendo o de maior F1, sem consultar o teste. O mesmo ajuste foi feito nas três redes:

| Arquitetura | F1 na validação (limiar 0,5) | Limiar ajustado | F1 na validação (limiar ajustado) |
|---|---:|---:|---:|
| **A** | 37,41% | **0,34** | **59,65%** |
| B | 12,80% | 0,27 | 59,44% |
| C | 23,86% | 0,32 | 59,45% |

Depois do ajuste, as três ficam praticamente empatadas, e A continua com o maior F1. Como é a rede mais simples e foi escolhida antes de olhar o teste, ela foi mantida.

### Avaliação final no teste

| Modelo | Limiar | Acurácia | Precision (roubo) | Recall (roubo) | F1-score (roubo) |
|---|---:|---:|---:|---:|---:|
| Referência: sempre "furto" | — | 72,00% | 0,00% | 0,00% | 0,00% |
| MLP A | 0,50 | 72,71% | 52,31% | 28,73% | 37,09% |
| **MLP A (adotada)** | **0,34** | **68,80%** | **46,72%** | **81,27%** | **59,33%** |

Matrizes de confusão no teste (linhas: classe real; colunas: classe prevista):

| | Limiar 0,50: prevê furto | Limiar 0,50: prevê roubo | Limiar 0,34: prevê furto | Limiar 0,34: prevê roubo |
|---|---:|---:|---:|---:|
| **Real: furto** | 1.455 | 165 | 1.036 | 584 |
| **Real: roubo** | 449 | 181 | 118 | 512 |

Com o limiar 0,34 a rede encontra 512 dos 630 roubos do teste (contra 181 com o limiar 0,5), mas passa a classificar como roubo 584 furtos. É a troca esperada entre recall e precision. A acurácia cai para abaixo da referência "sempre furto" porque essa referência acerta todos os furtos e erra todos os roubos: neste problema, o recall e o F1 de roubo dizem mais que a acurácia.

### Análise de overfitting e underfitting

- **Overfitting:** a perda de treino continua caindo, mas a de validação para de melhorar na época 9 (0,4774 no treino e 0,4920 na validação). O `EarlyStopping` interrompe o treino e restaura essa época. A distância entre as curvas é pequena, então não há overfitting relevante.
- **Underfitting:** a acurácia é de cerca de 74% no treino e 72% na validação, e a referência "sempre furto" já dá cerca de 72%. A rede não é muito melhor que a referência, o que aponta para falta de informação nos atributos (e não de capacidade, já que B e C não melhoraram a perda).

## Estrutura do projeto

```text
GS_CNN/
├── GS_CNN.ipynb           # Pré-processamento, treino e avaliação das três MLPs
├── dados/
│   ├── ocorrencias_capital_2025.csv  # Recorte da base pública
│   └── README.md
├── artefatos/
│   ├── modelo_mlp.keras              # MLP A selecionada no treinamento
│   ├── codificador.joblib            # OneHotEncoder ajustado com o treino
│   └── manifesto.json                # Metadados do experimento
├── docs/                              # Site estático publicado pelo GitHub Pages
│   ├── index.html                     # Formulário e apresentação dos resultados
│   ├── app.js                         # Codificação e cálculo da MLP em JavaScript
│   ├── modelo_web.json                # Categorias, pesos e limiar da MLP A exportados do Keras
│   └── .nojekyll
├── resultados/
│   ├── comparacao_validacao.csv
│   ├── metricas_teste.csv
│   ├── curvas_treinamento.png
│   ├── limiar_validacao.png
│   ├── matriz_confusao.png
│   └── historico_escolhido.json
├── imagens/
│   └── tela_aplicacao.png
├── requirements.txt                   # Dependências Python do notebook
├── Relatorio.pdf                      # Relatório técnico (10 slides)
└── README.md
```

A preparação de dados e o treinamento estão integralmente em `GS_CNN.ipynb`, sem necessidade de `pipeline.py`. O site é estático e não utiliza `app.py`, Render ou um servidor TensorFlow. O arquivo `.keras` mantém o modelo original para reprodução, enquanto `docs/modelo_web.json` contém os pesos, as categorias e o limiar necessários à execução no navegador.

## Execução do notebook — Google Colab

1. Abrir `GS_CNN.ipynb` no [Google Colab](https://colab.research.google.com/).
2. Na primeira célula, enviar `dados/ocorrencias_capital_2025.csv` quando solicitado.
3. Executar as células na ordem. O código realiza limpeza, exploração dos atributos, divisão, treinamento de três MLPs, comparação de métricas, ajuste do limiar, gráficos e avaliação final.
4. Ao concluir, são gerados `modelo_mlp.keras`, `codificador.joblib`, `manifesto.json` e `docs/modelo_web.json`, além de um `modelo_para_site.zip` com esses artefatos.

O notebook usa TensorFlow/Keras, Pandas, NumPy, Scikit-learn e Matplotlib, que normalmente estão disponíveis no Colab. As dependências também estão listadas no `requirements.txt` para reprodução fora do Colab. As saídas salvas no notebook vêm de uma execução completa; com a semente fixa (42), os números se repetem.

## Aplicação web — GitHub Pages

A aplicação recebe os quatro atributos utilizados no treinamento: bairro, período do dia, tipo de local e dia da semana. O arquivo `docs/app.js` utiliza as categorias de `docs/modelo_web.json` para reproduzir a transformação one-hot do `OneHotEncoder`, aplica os pesos das camadas densas (`ReLU` e `sigmoid`) e mostra as probabilidades de furto e roubo. A classe estimada é **roubo quando a probabilidade de roubo atinge o limiar** guardado em `modelo_web.json` (0,34), o mesmo escolhido na validação.

**A classificação acontece diretamente no navegador**, sem envio do formulário a uma API ou necessidade de servidor Python. A aplicação apresenta probabilidades condicionadas às características de um registro; não estima a chance de ocorrer um crime.

### Teste local da versão web

Para testar os arquivos estáticos em um computador com Python, na pasta principal do projeto:

```bash
python -m http.server 8000 --directory docs
```

O endereço de teste é `http://localhost:8000`. Esse comando apenas serve HTML, JavaScript e JSON; não executa nem treina a rede neural em Python. Abrir `index.html` diretamente por `file://` pode bloquear a leitura de `modelo_web.json` no navegador.

### Publicação no GitHub Pages

A publicação utiliza os arquivos da pasta `docs/` do próprio repositório, mantendo notebook, dados, modelo original e relatório na raiz.

Configuração utilizada no GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/docs` → Save**.

**Link do repositório GitHub:** https://github.com/llucasmtferreira-collab/GS_CNN

**Aplicação web pública:** https://llucasmtferreira-collab.github.io/GS_CNN/

### Atualização do modelo após novo treinamento

O arquivo `modelo_para_site.zip`, gerado pelo notebook, contém a nova rede Keras, o codificador, o manifesto e `docs/modelo_web.json`. A substituição desses arquivos no repositório mantém a versão de navegador associada ao mesmo treinamento. Se os pesos forem alterados por uma nova execução, os resultados e os slides também devem ser conferidos.

### Conferência da conversão

A inferência JavaScript foi comparada com o modelo `.keras` e com o `OneHotEncoder` salvos. Foram usadas **300 combinações aleatórias de atributos**, com coincidência das classes e diferença máxima inferior a `0,0000001` nas probabilidades. Isso verifica a conversão dos pesos; a publicação externa do site ainda precisa ser testada depois de disponibilizada.

## Limitações e uso de IA generativa

O conjunto foi extraído de boletins públicos e não representa todos os crimes. O recorte considera somente duas naturezas marcadas como `- OUTROS`; o período do dia é desconhecido em cerca de 57% dos registros e essa ausência está muito ligada a roubo (reflete o preenchimento do boletim, e não só o fato); o dia da semana quase não separa as classes; o limiar foi escolhido com uma única divisão dos dados; e, com o limiar ajustado, a acurácia (68,80%) fica abaixo da referência "sempre furto" porque o objetivo passou a ser encontrar os roubos. Por esses motivos, o sistema é apenas uma demonstração acadêmica e não deve ser usado para decisões reais de segurança pública.

**Uso de IA generativa:** Um assistente de IA generativa apoiou a escrita, revisão do código do notebook e a revisão da análise dos resultados. As decisões de modelagem (base, recorte, atributos, arquiteturas e critério de escolha) estão justificadas no notebook; as métricas foram calculadas com os dados públicos e conferidas pela execução completa do notebook; e a inferência do site foi comparada com o modelo Keras salvo.

**Referência:** SECRETARIA DA SEGURANÇA PÚBLICA DO ESTADO DE SÃO PAULO. *Estatísticas — Consultas*. Disponível em: https://www.ssp.sp.gov.br/estatistica/consultas.
