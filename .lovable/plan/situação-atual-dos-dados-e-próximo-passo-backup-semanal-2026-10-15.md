# Situação atual dos dados e próximo passo: backup semanal

## Respostas diretas

- **Já é o "Supabase"?** Sim. O Lovable Cloud é construído sobre essa mesma tecnologia. Não é preciso criar outra conta nem migrar nada.
- **Está ligado à sua conta?** Sim. O banco pertence a este projeto, dentro da sua conta e do seu espaço de trabalho no Lovable. Só vocês acessam pelo sistema.
- **É seguro?** Sim. Cada tabela tem regras de acesso por perfil (Administrador, Comercial, Colaborador). Os anexos ficam em um armazenamento privado, as chaves do Google ficam guardadas no servidor e a ficha pública não consegue ler dados de outros clientes.
- **Tem backup?** Parcial. A plataforma guarda cópias de segurança automáticas do banco, mas vocês não conseguem baixar ou consultar essas cópias. **O backup semanal no Google Drive, que já foi aprovado, ainda não foi construído.** Hoje não existe uma cópia própria de vocês.

## O que será feito

1. **Proteção contra exclusões acidentais**: um evento passa a ser cancelado em vez de apagado. Não será possível excluir um cliente que tem eventos, nem um colaborador que tem histórico.
2. **Backup semanal no Google Drive**: todo domingo às 03h00 (horário de Brasília), em uma pasta privada. Inclui clientes, eventos, pagamentos, equipe, fichas, compromissos, tarefas e todos os anexos, além de uma lista do que foi copiado. As cópias antigas não são apagadas.
3. **Tela "Backups" em Configurações**, só para Administrador, com:
   - histórico das cópias, mostrando quando cada uma rodou, o que entrou e se deu erro;
   - um botão "Fazer backup agora".
4. **Teste de recuperação**: uma cópia será restaurada fora do sistema real para confirmar que os dados podem ser recuperados.
5. A rotina só será dada como ativa depois de publicada e com a primeira cópia feita no domínio.

## Detalhes técnicos

- Tabela `backup_runs` com controle de acesso só para administradores. Cada cópia é feita por etapas e pode continuar de onde parou.
- Os arquivos são gerados em JSON e CSV por tabela, e os anexos são copiados do armazenamento privado para o Drive.
- O agendamento chama uma rota pública `/api/public/backup` protegida por um segredo próprio.
- As chaves estrangeiras com exclusão em cascata passam a bloquear a exclusão ou a apenas desvincular o registro.
