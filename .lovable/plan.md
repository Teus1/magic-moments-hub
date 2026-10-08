# Google Maps no domínio próprio

## Situação verificada
- Sua chave `GOOGLE_API_KEY` está salva, mas não é utilizada pela integração atual.
- A conexão vinculada continua sendo a gerenciada pela Lovable.
- O mapa atual permite apenas endereços Lovable e bloqueia o domínio próprio.
- As buscas de locais e os cálculos utilizam a conexão gerenciada; seu funcionamento real e as permissões da sua chave no Google ainda não foram validados.

## O que será feito
1. Abrir a configuração do Google Maps para criar uma **Nova conexão → Usar suas próprias credenciais**, sem solicitar a chave pelo chat.
2. Confirmar as credenciais e variáveis disponibilizadas pela nova conexão e ajustar o mapa para utilizar a chave de navegador autorizada para `gerenciadormagicmoments.app` e `www.gerenciadormagicmoments.app`.
3. Manter as sugestões de endereços, os trajetos e os pedágios. Configurar as credenciais adequadas para cada uso: chave de navegador restrita aos sites e chave de servidor própria para Places API (New) e Routes API, se a nova conexão exigir ambas. Não remover as restrições da chave de navegador.
4. Ajustar a verificação de domínio do mapa para aceitar os dois endereços próprios autorizados, preservando a proteção dos endereços privados de desenvolvimento.
5. Verificar os erros de compilação e os controles que não dependem de chamadas reais ao Google. A validação final do mapa, das sugestões e de um trajeto será feita por você no site publicado autorizado; testes reais do Google Maps não estão disponíveis neste ambiente.

## Configuração necessária no Google
- Faturamento ativo e Maps JavaScript API habilitada para o mapa.
- Autorização dos endereços raiz e subdomínios na chave de navegador, conforme você já informou ter configurado.
- Places API (New) e Routes API habilitadas e permitidas na credencial de servidor utilizada para buscas e trajetos.
- Se for necessária outra credencial, ela será solicitada apenas pelo formulário seguro da conexão.

## Detalhes técnicos
- Ler os nomes e instruções das credenciais fornecidas pela conexão antes de ajustar os consumidores.
- Preservar consultas autenticadas com permissão de visualizar Eventos, validação dos campos e caches existentes.
- Manter credenciais privadas apenas no servidor; expor ao navegador somente a chave pública destinada ao mapa.
- Preservar as regras de cálculo, os trajetos separados de ida e volta e os pedágios indisponíveis como desconhecidos.

## Fora do escopo
- Troca por OpenStreetMap ou outra biblioteca.
- Publicação automática: publicar somente mediante solicitação.