# Google Maps no domínio próprio

## Situação verificada

- Sua chave `GOOGLE_API_KEY` está salva, mas não é utilizada pela integração atual.
- A conexão vinculada continua sendo a gerenciada pela Lovable.
- Sua conexão própria foi criada e está disponível, mas ainda não está vinculada ao projeto.
- O mapa atual permite apenas endereços Lovable e bloqueia o domínio próprio.
- As buscas de locais e os cálculos utilizam a conexão gerenciada; seu funcionamento real e as permissões da sua chave no Google ainda não foram validados.

## O que será feito

1. Abrir o seletor de conexão do Google Maps e vincular a conexão própria já criada, **Mateus's Google Maps Platform**, sem solicitar novamente as chaves.
2. Confirmar as credenciais e variáveis disponibilizadas pela nova conexão e ajustar o mapa para utilizar a chave de navegador autorizada para `gerenciadormagicmoments.app` e `www.gerenciadormagicmoments.app`.
3. Manter as sugestões de endereços, os trajetos e os pedágios. Utilizar os campos separados da conexão: chave de navegador restrita aos sites e chave de servidor para Places API (New) e Routes API. Não remover as restrições da chave de navegador.
4. Ajustar a verificação de domínio do mapa para aceitar os dois endereços próprios autorizados, preservando a proteção dos endereços privados de desenvolvimento.
5. Verificar os erros de compilação e os controles que não dependem de chamadas reais ao Google. A validação final do mapa, das sugestões e de um trajeto será feita por você no site publicado autorizado; testes reais do Google Maps não estão disponíveis neste ambiente.

## Configuração necessária no Google

- Faturamento ativo e Maps JavaScript API habilitada para o mapa.
- Autorização dos endereços raiz e subdomínios na chave de navegador, conforme você já informou ter configurado.
- Places API (New) e Routes API habilitadas e permitidas na credencial de servidor utilizada para buscas e trajetos.
- Você informou ter concluído o formulário com as duas chaves; não será necessário reenviá-las pelo chat. As permissões reais no Google permanecem sem validação independente.

## Detalhes técnicos

- Ler os nomes e instruções das credenciais fornecidas pela conexão antes de ajustar os consumidores.
- Preservar consultas autenticadas com permissão de visualizar Eventos, validação dos campos e caches existentes.
- Manter credenciais privadas apenas no servidor; expor ao navegador somente a chave pública destinada ao mapa.
- Preservar as regras de cálculo, os trajetos separados de ida e volta e os pedágios indisponíveis como desconhecidos.

## Fora do escopo

- Troca por OpenStreetMap ou outra biblioteca.
- Publicação automática: publicar somente mediante solicitação.
