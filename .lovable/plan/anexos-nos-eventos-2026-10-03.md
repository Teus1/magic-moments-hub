# Anexos nos eventos

## Objetivo

Adicionar, após os valores do evento, dois grupos de arquivos:

- **Comprovantes**: vários comprovantes por evento.
- **Contratos e documentos**: vários contratos ou documentos adicionais por evento.

Não haverá limite de quantidade. Cada arquivo poderá ter até **20 MB** e ficará disponível somente para a equipe com acesso administrativo ao módulo Eventos.

## Experiência no cadastro

- Cada grupo terá uma área própria para selecionar vários arquivos, inclusive em seleções sucessivas.
- Antes de salvar, os arquivos selecionados serão listados com nome, tamanho e opção de remover.
- Ao editar um evento, os anexos já salvos serão exibidos com ações para baixar e excluir, conforme a permissão do usuário.
- O salvamento criará primeiro o evento, quando necessário, e depois enviará seus anexos, com mensagens claras para arquivo inválido ou falha no envio.
- A exclusão de um evento também removerá seus arquivos armazenados.

## Proteção e dados

- Criar uma área privada de armazenamento com limite de 20 MB por arquivo.
- Criar um registro de anexos associado ao evento, identificando a categoria, nome original, formato, tamanho e caminho seguro.
- Aplicar as mesmas permissões do módulo Eventos: visualização para listar/baixar e edição para enviar/excluir.
- Os links de download serão temporários; nenhum anexo ficará publicamente acessível.

## Validação

- Testar criação e edição com múltiplos anexos nas duas categorias.
- Testar download e remoção de arquivos já salvos.
- Confirmar bloqueio de arquivo acima de 20 MB e acesso restrito.
- Conferir o formulário em computador e celular, sem alterar os demais fluxos de Eventos.
