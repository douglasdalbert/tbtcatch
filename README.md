# Catch — tabuleiro em família

Protótipo web local de um tabuleiro para partidas em família. O notebook hospeda uma única partida, o tablet exibe o mapa e os celulares representam os jogadores. Não há seleção ou identificação de salas nos links.

O jogo se chamará **Terra** e seguirá para uma identidade própria, com criaturas originais inspiradas no Brasil. O protótipo atual ainda contém referências e recursos de Pokémon, cuja substituição será planejada futuramente. O processo proposto para criar imagens e animações está em [docs/projeto.md](./docs/projeto.md#criação-de-criaturas-sprites-e-animações-próprias).

## Estado atual

Primeiro marco implementado: partida em memória, entrada automática por QR codes separados para tablet e celulares, perfil simplificado no celular, sincronização, reconexão e pausa global quando o mapa sai do fullscreen ou desconecta.

**Ainda não há tabuleiro jogável.** Mapa procedural, catálogo editável, cidades, turnos, dados, mochila e capturas serão implementados nas próximas etapas. Há uma seleção inicial de 12 personagens da imagem fornecida. O botão **Iniciar teste de conexão** apenas valida a infraestrutura; não inicia turnos.

Regras e próximos passos estão em [docs/projeto.md](./docs/projeto.md).

## Requisitos

- Node.js `^22.18.0`, `^24.11.0` ou `>=26.0.0` e npm.
- Aparelhos na mesma rede local.
- Navegador do tablet com Fullscreen API; o botão informa se ela não estiver disponível.
- No WSL: Docker Desktop com integração habilitada para a distribuição e acesso a `powershell.exe`. O inicializador detecta o IPv4 Wi-Fi do Windows, como no projeto karaoke, e publica a interface por Docker Desktop. Não use o IP interno `172.x` do WSL no tablet.

## Executar

No Linux, na raiz do projeto:

```sh
./iniciar.sh
```

O script funciona mesmo quando chamado de outra pasta e inicia em **modo de desenvolvimento**, com atualização automática da interface ao salvar. No Linux nativo, confere Node.js e restaura dependências ausentes/inconsistentes com `npm ci`. No WSL, detecta o Wi-Fi pelo Windows, compila a imagem e sobe o aplicativo pelo Docker Desktop, seguindo com `docker compose watch`. A primeira instalação/build requer internet.

No Linux nativo, Ctrl+C encerra o servidor. No WSL, Ctrl+C encerra apenas o monitoramento; para parar o aplicativo, execute `docker compose stop`. Para retomá-lo com monitoramento, execute `./iniciar.sh` novamente. Alterações na interface são sincronizadas pelo Compose e aplicadas pelo Vite; alterações no backend reiniciam o servidor e descartam a partida.

Abra no notebook o **endereço de rede exibido pelo script**, por exemplo `http://192.168.1.10:5173/`. A página inicial recupera a partida existente ou cria uma automaticamente, sem seleção de dispositivo nem botão inicial. Os QR codes do tablet e dos celulares aparecem com links clicáveis abaixo. Esse é também o painel previsto para integrar o futuro CRUD, ainda não implementado. `/host` continua funcionando como endereço alternativo do mesmo painel.

1. Aguarde a abertura automática da partida e dos QR codes. Abrir outro painel não recria nem apaga a partida existente.
2. Abra o endereço Wi-Fi exibido pelo script. O servidor fornece o IP de rede para os QR codes, sem seletor de IP, independentemente do endereço usado para abrir o painel. No WSL/Docker, usa `CATCH_LAN_IP` detectado pelo PowerShell, nunca o IP interno da VM/container. Sem endereço válido, apresenta erro em vez de gerar QR de loopback.
3. No tablet, leia o QR **Abrir mapa**. A conexão é automática; toque em **Ativar fullscreen**.
4. Nos celulares, leia o QR **Jogar**. A entrada é automática como **Jogador A**, **Jogador B** etc., com personagem aleatório disponível.
5. Quando o tablet estiver em fullscreen e todos os jogadores conectados, use **Iniciar teste de conexão**.
6. Sair do fullscreen ou desconectar o tablet pausa a sessão para todos. Ative novamente o fullscreen e clique em **Retomar sessão** no notebook.
7. **Encerrar partida** pede confirmação e descarta a sessão para todos. Nesse caso, o painel não cria outra imediatamente; use **Abrir partida novamente** ou recarregue a página para abrir uma nova.

Os QR codes abrem `/map` e `/player`, sem parâmetros de sala. Telas abertas antes de preparar a partida aguardam e conectam automaticamente quando o anfitrião a prepara. URLs antigas com `?room=...` também abrem a partida única: o parâmetro não é utilizado.

### Perfil no celular

- Toque no nome no topo para editar em um modal.
- Toque no círculo do personagem para abrir as opções.
- Personagens ocupados ficam desabilitados; o servidor também recusa escolhas conflitantes.
- Cada jogador tem personagem exclusivo, reservado mesmo quando desconectado. Trocar libera o personagem anterior.
- A seleção inicial tem 12 personagens distintos; se todos estiverem ocupados, novos jogadores recebem uma mensagem explícita.
- Nome e personagem são sincronizados no tablet e notebook e preservados na reconexão.
- A tela do celular não mostra a lista geral de jogadores nem detalhes técnicos do notebook/tablet.

Os links dos QR codes incluem a porta atual. `localhost` e `127.0.0.1` não funcionam nos outros aparelhos: eles apontam para o próprio dispositivo.

No desenvolvimento, o Vite escuta em `0.0.0.0:5173` e encaminha API e Socket.IO ao servidor na porta 3000. Libere a porta **5173** apenas para a rede local no firewall, se necessário. Para alterar as portas da interface e do servidor:

```sh
WEB_PORT=5174 PORT=3001 ./iniciar.sh
```

Abra então o IP de rede mostrado pelo script na porta 5174; os QR codes usarão esse endereço e porta. `PORT` e `WEB_PORT` devem ser diferentes.

### Produção, sem atualização automática

```sh
./iniciar.sh --producao
```

Esse modo compila e serve a interface e a API juntas pelo **IP de rede do notebook na porta 3000** (ou na porta `PORT`). Libere essa porta na rede local. Execução manual equivalente, após instalar dependências: `npm run build && npm start`.

No WSL2, use `./iniciar.sh` em vez de executar `npm run dev` diretamente: o IP virtual do WSL não é o endereço acessível pelo Wi-Fi. O script publica a porta pelo Docker Desktop no IP Wi-Fi do Windows. Se o Windows solicitar acesso à rede, permita somente na rede privada da família. A aplicação não cria regras de firewall nem exige PowerShell elevado. Se o acesso ainda falhar, confira o firewall do Windows e isolamento de clientes/rede de convidados no roteador.

### Durante o desenvolvimento

```sh
npm run dev
```

Abra o **IP de rede do notebook na porta 5173**. O Vite atende a interface na porta 5173 e encaminha API e Socket.IO ao servidor na porta 3000. No Wi-Fi, libere a porta **5173**.

Esse comando é usado diretamente por `./iniciar.sh` no Linux nativo (também aceita `--dev`); no WSL ele roda dentro do container, com sincronização do Compose Watch. React Fast Refresh atualiza a interface ao salvar arquivos; o servidor usa `tsx watch` e reinicia ao alterar seus arquivos ou dependências importadas. Reiniciar o servidor descarta a partida em memória, então mudanças no backend exigem reconectar e configurar a partida novamente. Mudanças na interface não reiniciam o servidor, embora algumas alterações possam recarregar a página.

## Reconexão e dados

- A aba guarda uma chave de reconexão em `sessionStorage`, separada por papel.
- Recarregar a mesma aba ou recuperar a conexão Wi-Fi restaura a identidade, sem adicionar outro jogador.
- Mantenha as abas abertas. Fechar uma aba e perder seu armazenamento pode impedir recuperar seu papel; nesta primeira etapa, reinicie o servidor se perder a sessão do anfitrião ou do mapa.
- Uma segunda conexão usando a mesma chave substitui a anterior.
- Após iniciar o teste, novos jogadores não entram; jogadores já inscritos podem reconectar.
- Reiniciar o servidor perde a partida. Ao recarregar, a sessão expirada é descartada e o celular aguarda a preparação da próxima partida.
- Não há contas nem autenticação de usuários. O projeto é destinado exclusivamente a uma rede familiar confiável; não exponha as portas na internet.
- Não há banco de dados nesta etapa. SQLite será introduzido com o catálogo, sem persistir partidas.
- QR codes, scripts e estilos são servidos localmente. Depois de instalar e compilar, a execução não depende de internet.
- HTTPS e permissões de sensores serão tratados na etapa dos dados 3D; o protótipo atual usa HTTP e não solicita sensores.

## Validação

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
# Em Linux, instale também as bibliotecas do navegador quando necessário:
npx playwright install-deps chromium
npm run test:e2e
```

A instalação das bibliotecas de sistema pode exigir privilégios administrativos. O teste de navegador usa um servidor temporário na porta 3100, sem reutilizar nem alterar a partida de um servidor em execução na porta 3000. Execute o build antes dele.

Os testes cobrem validação de comandos, papéis, reconexão, nomes automáticos, edição do perfil, exclusividade e esgotamento de personagens, encerramento, fullscreen e retomada manual. O teste de navegador usa quatro sessões independentes: anfitrião, mapa e dois jogadores, incluindo edição de perfil, bloqueio de personagem ocupado, queda de conexão e recarregamento. Ainda é necessário validar acesso pelo Wi-Fi e fullscreen nos aparelhos físicos da família.

## Referências e recursos

- [PokéAPI](https://pokeapi.co/) e [documentação REST v2](https://pokeapi.co/docs/v2): referência do plano anterior, ainda sem integração; não é uma fonte definida para o futuro catálogo próprio.
- Fontes Pokemon Solid e Hollow fornecidas pelo usuário em `pokemon.zip`, servidas em [apps/web/public/fonts](./apps/web/public/fonts). A Solid é usada em títulos e no nome do jogador; textos e controles comuns mantêm a fonte de sistema. O arquivo não inclui licença: verificar os termos antes de publicação/redistribuição.

## Estrutura

- [apps/server](./apps/server): servidor HTTP, Socket.IO e partida única em memória.
- [apps/web](./apps/web): interface React para notebook, tablet e celulares.
- [packages/shared](./packages/shared): contratos e validação dos comandos.
- [tests](./tests): teste integrado de navegador.
- [docs/projeto.md](./docs/projeto.md): decisões e continuidade do desenvolvimento.
