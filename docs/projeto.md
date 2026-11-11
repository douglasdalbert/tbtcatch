# Tabuleiro virtual Pokémon — plano e registro de decisões

## Objetivo e estado atual

Projeto de fã para partidas familiares em rede local. O notebook hospeda o servidor, o tablet exibe o tabuleiro compartilhado e cada celular representa um jogador. O repositório está vazio; nenhuma implementação foi iniciada.

Este documento, mantido em `docs/projeto.md` no repositório, é a fonte de continuidade do desenvolvimento: requisitos confirmados, limites da primeira entrega, decisões técnicas propostas, pendências e critérios de validação. Deve ser atualizado conforme as decisões mudarem.

## 1. Escopo confirmado

### Primeira entrega

- Aplicação web local, sem contas e sem autenticação.
- Uma partida ativa por servidor, com estado exclusivamente em memória.
- Sala, QR code, entrada e reconexão dos jogadores.
- Tablet em fullscreen, mapa procedural hexagonal e turnos sincronizados.
- Cadastro do jogador, escolha de sprite e cidade inicial.
- Movimento terrestre/aquático, encontros, captura e surgimento de evoluções.
- D6 reutilizável, visual e físico em 3D, operado por movimento do celular ou por toque.
- Catálogo pequeno inicial, persistente, com painel CRUD separado.
- Interface inicial de mochila, sem regras funcionais de itens.
- Centros Pokémon, ginásios e Plateau representados no mapa.

### Etapas posteriores

- Batalhas, dano, vida, cura funcional e regras dos ginásios.
- Itens/cartas e seus efeitos; cadastro de cartas quando essa etapa for definida.
- Condições de vitória e requisitos para entrar/concluir o Plateau.
- Dados com quantidades variáveis de faces, incluindo exemplos como d13.
- Catálogo ampliado e regras adicionais.

Não implementar multiplicadores de tipo: o poder dos Pokémon será fixo. Tipos orientam biomas, encontros iniciais e seleção de ginásios.

## 2. Dispositivos, sala e ciclo da partida

1. Anfitrião inicia o servidor no notebook e abre o controle local.
2. Cria uma sala; o servidor informa endereço de rede local e QR code.
3. Tablet entra como mapa e informa sua área útil após entrar em fullscreen.
4. Anfitrião gera e inspeciona o mapa antes de iniciar os turnos.
5. Celulares entram pelo QR, escolhem nome, sprite e uma das oito cidades para começar.
6. Anfitrião inicia a partida com os jogadores preparados.
7. Enquanto o servidor permanecer ativo, reconexão recupera o jogador e seu estado.
8. Reiniciar o servidor ou encerrar a partida descarta o jogo; não existe salvar/carregar.

Catálogo não é estado de partida. Ele persiste, mas cada partida utiliza uma cópia do catálogo feita na criação, imune a edições posteriores.

### Fullscreen e pausa

- Exigir fullscreen somente no tablet que exibe o mapa.
- Sugerir a entrada em fullscreen com botão acionado pelo usuário antes da geração.
- Não gerar usando dimensões anteriores à entrada em fullscreen.
- Sair do fullscreen pausa globalmente a partida e bloqueia comandos de jogo.
- O servidor é responsável por aplicar a pausa, não apenas a interface.
- Perda da conexão do mapa também deve pausar para impedir avanço sem visualização.
- Voltar ao fullscreen não regenera o mapa.
- Celulares não dependem de fullscreen.
- Definir explicitamente o fluxo de retomada antes da implementação: recomendação de retomar mediante confirmação do anfitrião, somente com mapa reconectado e em fullscreen.
- Se o navegador do tablet não suportar fullscreen, informar incompatibilidade; não contornar silenciosamente a exigência.

## 3. Estrutura do tabuleiro

### Cidades

São oito cidades, inicialmente identificadas por A–H, com oito tipos de ginásio distintos, sem repetição.

Cada cidade possui:

- Núcleo de 3 hexágonos próximos e conectados.
- 1 hexágono de ginásio adjacente ao núcleo, em posição variável.
- 1 hexágono de Centro Pokémon adjacente ao núcleo e distinto do ginásio.
- 2 conexões de caminhos em lados/acessos distintos, utilizáveis para entrada e saída.

Os caminhos não podem apenas se fundir imediatamente em um acesso único. A rede deve permitir as duas conexões de cada cidade. O núcleo, o ginásio e o Centro Pokémon não podem se sobrepor a outros locais.

No futuro haverá vários ginásios cadastrados por tipo; sortear um por tipo na criação do mapa. O nome da cidade deriva do ginásio escolhido e será mostrado em uma placa pequena ou rótulo legível.

### Plateau

- Nono destino, não obrigatoriamente central.
- Mega-hexágono de raio 2: 19 células, sendo anel externo de 12 e interior de 7.
- Anel externo destinado a caminho/eventos, com deslocamento de sentido único.
- Interior reservado para QR code, situações, eventos e batalhas finais; não tratá-lo automaticamente como terreno livre.
- Acesso único como ramificação da rede, sem exigir saída de volta.
- Não depender do Plateau para conectar as oito cidades.
- Preparar as células interiores para apresentação; não inventar a batalha final nesta etapa.
- Definir na etapa de regras finais como se encerra o trajeto do anel e como começa a batalha, evitando confundir acesso único com um ciclo livre de retorno à rede.

### Distâncias e dimensionamento

- Coordenadas axiais e distância hexagonal geométrica, distinta da distância pelos caminhos.
- Cidades: pelo menos 10 entre as células mais próximas de seus conjuntos reservados.
- A inclusão do Centro Pokémon amplia o conjunto reservado; propor incluí-lo na validação de distância para preservar a separação, sem medir apenas pelos centros das cidades.
- Encontros: distância geométrica mínima de 5 entre pontos.
- Evolução: novo ponto a pelo menos 10 da posição da captura.
- Dimensionar pela área útil em pixels do tablet, não por uma estimativa falsa de tamanho físico.
- Garantir tamanho mínimo lógico que comporte as reservas e distâncias.
- Zoom e arraste permitem visualizar mapas maiores que a tela.
- Orientação e redimensionamento posteriores alteram apenas a apresentação.
- Quando a geometria for inviável, informar a falha e oferecer nova geração/mapa maior; nunca diminuir distâncias silenciosamente.

## 4. Geração procedural

Ordem lógica, respeitando o modelo atualizado de cidade:

1. Definir dimensões, semente, oito tipos distintos e ginásios disponíveis.
2. Reservar os conjuntos completos das oito cidades e o Plateau com suas áreas de exclusão.
3. Conectar as oito cidades em uma rede de duas conexões distintas por cidade; um ciclo é a base inicial mais simples.
4. Conectar o Plateau por uma ramificação de acesso único.
5. Construir caminhos terrestres e aquáticos sem atravessar reservas indevidas.
6. Distribuir encontros adjacentes aos caminhos ou com ramais alcançáveis, incluindo acessos a lagos.
7. Atribuir encontros iniciais únicos e reservar capacidade para evoluções futuras.
8. Preencher o restante com regiões temáticas coerentes, considerando tipos de encontros e ginásios.
9. Validar todas as invariantes antes de publicar o mapa.

Usar geração determinística por semente, tentativas limitadas e diagnóstico de inviabilidade. Modelar separadamente terreno/bioma, local especial, caminho e encontro, para permitir combinações sem confundir regras.

Regiões podem representar fogo, floresta, gelo, água e demais tipos cadastrados. Não é necessário haver 18 regiões na primeira entrega: o catálogo inicial e sua cobertura devem ser explícitos.

## 5. Turno e interface do celular

Ao chegar a vez do jogador, abrir um componente/modal de jogo em tela completa, com ícones e quatro botões:

1. **Mover**: abre a área de dados ou, se o dado já foi lançado, retoma o movimento com seu resultado preservado.
2. **Agir**: abre ações disponíveis na posição atual, incluindo captura.
3. **Mochila**: mostra equipe de até seis Pokémon e espaço para itens futuros.
4. **Encerrar turno**: exige confirmação em componente reutilizável.

Todos os modais podem ser fechados. Fechar uma interface não relança o dado, não apaga o progresso e não encerra implicitamente o turno. Ao voltar à tela inicial, mostrar botão flutuante no rodapé indicando que é a vez do jogador e permitindo reabrir o componente.

O estado da fase, resultado do dado, passos e ações consumidas pertence à partida no servidor, não ao ciclo de vida dos componentes.

### Movimento

- O jogador escolhe sua cidade inicial; não impor cidade A.
- D6 determina o orçamento de passos do turno.
- Fora do Plateau, pode encerrar o movimento antes de gastar todos os passos.
- Pode fazer desvios, repetir células e gastar mais passos para se deslocar menos.
- Validar cada passo pela adjacência e transitabilidade reais.
- Água é transitável inicialmente, sem habilidades especiais.
- Usar sobreposição visual semitransparente, chamada de “overflow” na conversa, nos caminhos alcançáveis com o orçamento restante.
- Calcular essa área por caminhos transitáveis, não por um círculo geométrico que atravesse lacunas ou obstáculos.
- Não desenhar contornos especiais em todos os caminhos comuns: essa ideia foi descartada.
- No anel do Plateau, seguir o sentido único e consumir exatamente o valor sorteado: percurso com destaque fraco e destino final com destaque mais forte e borda.
- Resolver explicitamente transição para o Plateau e impossibilidade de completar os passos antes de habilitar o trajeto final; não permitir travamentos nem inventar retorno contra a direção.

### Regras de turno ainda pendentes

O quarto botão foi confirmado, mas não houve confirmação sobre:

- Quantas vezes pode mover ou agir por turno.
- Se pode mover e capturar no mesmo turno e em qual ordem.
- Se uma captura bem-sucedida encerra automaticamente o turno.
- Como encerrar/restaurar uma rolagem física interrompida por pausa ou desconexão.

Regra já definida: falhar uma captura passa a vez ao próximo jogador. Não usar a ausência das demais regras para permitir ações infinitas. A implementação da máquina de turnos depende de fechar esses pontos.

## 6. Encontros, captura e evolução

- Encontros visíveis, com espécie fixa no respectivo hexágono.
- Cada espécie existe uma única vez por partida, incluindo evoluções.
- Cada Pokémon possui poder fixo, tipo, faces aceitas de captura no d6 e eventual próxima evolução.
- Estar sobre o hexágono do encontro é requisito para tentar capturar pela opção **Agir**.
- Falha na captura encerra o turno e passa ao próximo jogador, onde quer que ele esteja.
- Sucesso retira o encontro do mapa e atribui o Pokémon exclusivamente ao capturador.
- Limite de seis Pokémon: bloquear novas capturas ao atingir o limite; trocas e liberação ficam para depois.
- Ao capturar, a próxima evolução surge em um novo hexágono distante e alcançável, com identificação visual.
- Evolução pode aparecer em qualquer bioma.
- O novo ponto pode exigir ramal de acesso; não ocupar reservas, sobrepor locais nem quebrar conexões.
- Aplicar a distância mínima entre encontros e a distância de 10 da captura também nessa geração dinâmica.
- Não substituir automaticamente o Pokémon anterior: sua evolução é outro Pokémon a capturar.
- Reservar posições/capacidade durante a geração inicial para garantir evoluções previstas; não efetivar captura e depois descobrir silenciosamente que não existe lugar para a evolução.
- Resolver captura, unicidade, equipe e novo encontro de forma atômica no servidor.

## 7. Dados reutilizáveis

Componente independente dos modais de movimento/captura, preparado para reutilização futura em batalhas:

- Primeira versão: d6 físico e visual em 3D.
- Balançar o celular aplica impulsos ao dado, que colide com as bordas.
- Ao parar e deitar o celular, a simulação continua até estabilizar.
- Detectar repouso físico e face superior; não sortear um resultado diferente do visualizado.
- Resultado só é enviado uma vez para a solicitação de rolagem ativa.
- Alternativa por botão/toque quando não há sensores, permissão ou condições adequadas.
- Face ambígua, dado apoiado em aresta e ausência de estabilização exigem tratamento visível; não inventar sucesso.
- Fechar modal não permite relançar um resultado já confirmado.
- Tratar pausa, perda de foco e reconexão sem duplicar resultado.
- Interface permite evoluir para outras quantidades de faces sem implementar agora poliedros arbitrários.

O servidor valida solicitação, jogador, turno, tipo e faixa do dado; aceita a face final simulada pelo celular. Isso é adequado ao uso familiar combinado, mas não é um mecanismo antitrapaça.

Sensores podem exigir HTTPS e permissão explícita. Prever HTTPS local com certificado confiável nos dispositivos, instruções de configuração e endereço/IP compatível com o certificado. Não presumir que HTTP via IP local ou um certificado não confiável habilite sensores. O botão alternativo deve funcionar sem sensor.

## 8. Catálogo e painel de cadastro

Persistência proposta: SQLite, somente para conteúdo.

Cadastros iniciais:

- Tipos/biomas e suas propriedades visuais.
- Pokémon: identificador único, nome, tipo, poder fixo, conjunto não vazio de faces de captura entre 1 e 6, referência visual e próxima evolução.
- Ginásios: nome e tipo; permitir várias opções por tipo.
- Seleção de personagens/sprites.

Validar referências, ciclos evolutivos, exclusões de registros relacionados e disponibilidade de oito tipos distintos para gerar a partida.

Painel separado, dispensável durante o jogo. Sem contas, autenticação ou chave, conforme solicitado. Proposta de exposição: painel e operações de cadastro acessíveis somente no notebook por interface local; jogo e mapa disponíveis na rede local. Não publicar o serviço na internet.

O anexo de sprites é uma referência fornecida pelo usuário, não um atlas já recortado e mapeado. Selecionar manualmente um conjunto inicial e registrar os recortes corretos; não assumir células uniformes para a imagem inteira. Preservar a imagem original. Não buscar imagens/dados automaticamente em serviços externos.

Começar com catálogo pequeno e explícito, com cadeias evolutivas suficientes para demonstrar o fluxo e conteúdo coerente com os oito tipos de ginásio. Conteúdo não cadastrado não deve ser apresentado como funcional.

## 9. Arquitetura técnica proposta

- Monorepositório TypeScript com npm workspaces.
- Cliente React + Vite, com entradas/rotas para anfitrião, cadastro, mapa e jogador.
- Servidor Node.js com API HTTP e Socket.IO para sincronização e reconexão.
- Tipos e validação de comandos compartilhados, com validação efetiva no servidor.
- SQLite para catálogo; memória para sala, tabuleiro, jogadores e turnos.
- Renderização do tabuleiro em Canvas 2D para controlar o custo em mapas maiores.
- Three.js e motor de física adequado, como Rapier, no componente isolado do dado.
- QR code gerado localmente; sem CDN ou dependência de internet durante a partida.
- Vitest para regras e gerador; Playwright para integração entre dispositivos.

Preferir essas ferramentas somente se compatíveis com o ambiente verificado durante a implementação. Não há dependências existentes a preservar.

O servidor é a autoridade sobre comandos, posição, orçamento de passos, inventário, ocupação, encontros e pausa. Associar comandos a identificadores para impedir efeitos duplicados em reenvios. Reconexões recuperam um snapshot e não criam um novo jogador.

Não incluir telemetria externa, autenticação, múltiplas salas simultâneas ou persistência de partidas.

## 10. Todos e dependências

1. **Fechar regras pendentes**: consumo de ações, sucesso da captura, retomada da pausa e transições do Plateau.
2. **Criar base técnica e documentação**: workspaces, validação compartilhada, testes, comandos e documento versionado de continuidade.
3. **Implementar catálogo e cadastro**: SQLite, validações, CRUD local, conteúdo inicial e seleção de sprites.
4. **Implementar sala e protocolo**: QR, papéis, jogadores, reconexão, snapshots e pausa por mapa.
5. **Implementar gerador e invariantes**: cidades completas, rede, Plateau, encontros, biomas e reservas de evolução.
6. **Implementar visualização do mapa**: fullscreen, dimensões, zoom, arraste e marcadores.
7. **Implementar componente de dados**: física d6, sensores, alternativa por toque, estabilização e ciclo da rolagem.
8. **Implementar fluxo do jogador**: quatro botões, confirmação reutilizável, escolha de cidade, movimento, destaques e ações.
9. **Implementar captura e evolução**: unicidade, limite de equipe, captura atômica e novo encontro acessível.
10. **Validar ponta a ponta e documentar operação**: múltiplos dispositivos, HTTPS, falhas, reconexão e critérios abaixo.

Dependências:

- Base depende das regras pendentes para definir contratos de turno sem suposições.
- Catálogo e sala dependem da base e podem avançar independentemente.
- Gerador depende do catálogo e dos contratos compartilhados.
- Mapa depende da sala e do gerador.
- Dado depende da base e pode avançar em paralelo com catálogo/sala/gerador.
- Fluxo do jogador depende de sala, mapa e dado.
- Captura/evolução depende de catálogo, gerador e fluxo do jogador.
- Validação integrada depende dos componentes implementados.

## 11. Critérios de aceitação

### Geração e geometria

- Exatamente oito cidades com tipos de ginásio distintos e um Plateau de 19 células.
- Cada cidade tem núcleo de 3, ginásio, Centro Pokémon e duas conexões distintas.
- Sem sobreposições e com distância mínima de 10 entre conjuntos de cidades.
- Rede das cidades continua conectada sem usar o Plateau como passagem.
- Encontros acessíveis e separados por pelo menos 5; evolução pelo menos 10 da captura.
- Mesma semente e catálogo produzem o mesmo mapa.
- Testes sobre um conjunto fixo de pelo menos 100 sementes nas dimensões suportadas; falhas diagnosticadas para configurações inviáveis.

### Turno e sincronização

- Jogador escolhe cidade inicial; ninguém é colocado obrigatoriamente na A.
- Rolagem e passos sobrevivem a fechar/reabrir modais e reconectar.
- Sobreposição representa alcance real, incluindo obstáculos e sentidos de circulação.
- Movimento comum permite parar antes; Plateau respeita direção e consumo exato.
- Encerrar turno pede confirmação; cancelar não altera a partida.
- Falha de captura passa o turno; comandos fora da vez são recusados com feedback.
- Captura concorrente/repetida não duplica espécie nem ultrapassa seis Pokémon.
- Reinício perde a partida, mas conserva o catálogo.

### Dispositivos e operação

- Testar notebook + tablet + pelo menos dois celulares/sessões.
- Sair do fullscreen do mapa pausa todos e bloqueia mutações; voltar não recria o mapa.
- D6 reporta a face visual estabilizada; sensores negados levam à alternativa por toque.
- Documentar validação manual em aparelhos reais, pois automação não comprova qualidade dos sensores e da física percebida.
- Build, verificação de tipos e testes pertinentes aprovados.
- Partida funciona sem internet, com assets e conteúdo servidos localmente.
- Documentação cobre iniciar, cadastrar, gerar mapa, entrar por QR, configurar HTTPS, pausar, retomar e encerrar.

## 12. Decisões que substituíram sugestões anteriores

- Cidade não é um ginásio de três células: são três células de cidade mais ginásio e Centro Pokémon separados.
- Não iniciar todos na cidade A: cada jogador escolhe a sua.
- Movimento comum não exige consumir todo o dado; Plateau exige.
- Não destacar todas as bordas de rotas comuns: usar sobreposição de alcance.
- Não implementar dados apenas por botão: d6 3D com sensores está na primeira entrega, com alternativa por toque.
- Não reduzir distâncias para o mapa caber.
- Não exigir fullscreen nos celulares.
- Não proteger o cadastro com chave/autenticação.
- Não presumir captura apenas no turno posterior à chegada: isso depende das regras de consumo de ações ainda pendentes.
- Não implementar cura antes das regras de vida/batalha.
