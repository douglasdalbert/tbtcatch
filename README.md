# Catch — tabuleiro em família

Protótipo web local de um tabuleiro de fã com tema Pokémon. O notebook hospeda uma única partida, o tablet exibe o mapa e os celulares representam os jogadores. Não há seleção ou identificação de salas nos links.

## Estado atual

Primeiro marco implementado: partida em memória, entrada automática por QR codes separados para tablet e celulares, perfil simplificado no celular, sincronização, reconexão e pausa global quando o mapa sai do fullscreen ou desconecta.

**Ainda não há tabuleiro jogável.** Mapa procedural, catálogo editável, cidades, turnos, dados, mochila e capturas serão implementados nas próximas etapas. Há uma seleção inicial de 12 personagens da imagem fornecida. O botão **Iniciar teste de conexão** apenas valida a infraestrutura; não inicia turnos.

Regras e próximos passos estão em [docs/projeto.md](./docs/projeto.md).

## Requisitos

- Node.js `^22.18.0`, `^24.11.0` ou `>=26.0.0` e npm.
- Aparelhos na mesma rede local.
- Navegador do tablet com Fullscreen API; o botão informa se ela não estiver disponível.

## Executar

No Linux, na raiz do projeto:

```sh
./iniciar.sh
```

O script funciona mesmo quando chamado de outra pasta, confere Node.js, restaura dependências ausentes/inconsistentes com `npm ci`, compila e inicia o servidor em primeiro plano. Na primeira execução, instalar dependências requer internet. Depois, com dependências completas, iniciar não exige downloads. Mantenha o terminal aberto; use Ctrl+C para encerrar.

Abra **http://localhost:3000/host** no notebook. Esse é o painel único dos QR codes e o ponto previsto para integrar o futuro CRUD; o CRUD ainda não está implementado.

1. Clique em **Preparar partida**.
2. Confira o endereço de rede selecionado. Se houver várias interfaces, escolha o IP acessível pelos demais aparelhos.
3. No tablet, leia o QR **Tablet · abrir mapa**. A conexão é automática; toque em **Ativar fullscreen**.
4. Nos celulares, leia o QR **Celular · entrar como jogador**. A entrada é automática como **Jogador A**, **Jogador B** etc., com personagem aleatório disponível.
5. Quando o tablet estiver em fullscreen e todos os jogadores conectados, use **Iniciar teste de conexão**.
6. Sair do fullscreen ou desconectar o tablet pausa a sessão para todos. Ative novamente o fullscreen e clique em **Retomar sessão** no notebook.
7. **Encerrar partida** pede confirmação e descarta a sessão para todos.

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

O servidor escuta em `0.0.0.0:3000`. Libere essa porta apenas para a rede local no firewall, se necessário. Para outra porta:

```sh
PORT=3001 ./iniciar.sh
```

Execução manual equivalente, após instalar dependências: `npm run build && npm start`.

Se estiver usando WSL2, contêiner ou máquina virtual, seu IP virtual pode não ser acessível pelo Wi-Fi. Configure a rede espelhada/encaminhamento de porta do ambiente e abra o controle do anfitrião pelo endereço que os aparelhos conseguem acessar. Esse endereço também aparecerá na seleção para os QR codes.

### Durante o desenvolvimento

```sh
npm run dev
```

Abra **http://localhost:5173/host**. O Vite atende a interface na porta 5173 e encaminha API e Socket.IO ao servidor na porta 3000. No Wi-Fi, utilize o IP do notebook com porta **5173**; nessa modalidade, libere essa porta.

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

- [PokéAPI](https://pokeapi.co/) e [documentação REST v2](https://pokeapi.co/docs/v2): referência para o futuro catálogo, ainda sem integração. Importações devem ser armazenadas localmente, sem exigir internet durante o jogo.
- Fontes Pokemon Solid e Hollow fornecidas pelo usuário em `pokemon.zip`, servidas em [apps/web/public/fonts](./apps/web/public/fonts). A Solid é usada em títulos e no nome do jogador; textos e controles comuns mantêm a fonte de sistema. O arquivo não inclui licença: verificar os termos antes de publicação/redistribuição.

## Estrutura

- [apps/server](./apps/server): servidor HTTP, Socket.IO e partida única em memória.
- [apps/web](./apps/web): interface React para notebook, tablet e celulares.
- [packages/shared](./packages/shared): contratos e validação dos comandos.
- [tests](./tests): teste integrado de navegador.
- [docs/projeto.md](./docs/projeto.md): decisões e continuidade do desenvolvimento.
