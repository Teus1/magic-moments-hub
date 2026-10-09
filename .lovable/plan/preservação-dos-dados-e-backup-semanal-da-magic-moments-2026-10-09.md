# Preservação dos dados e backup semanal da Magic Moments

## Objetivo
Proteger eventos, clientes, pagamentos e arquivos sem apagar, recriar ou substituir os cadastros atuais. O Google Drive já está conectado; a rotina de backup ainda não está ativa.

## 1. Preservar o histórico existente
- Manter a estrutura atual e fazer somente ajustes adicionais necessários à proteção.
- Bloquear exclusões definitivas de eventos nesta etapa: usar o cancelamento já existente para preservar pagamentos, equipe, compromissos e documentos vinculados.
- Bloquear a exclusão de colaboradores com histórico de participação; manter a opção de inativar.
- Preservar o bloqueio já existente para excluir clientes vinculados a eventos.
- Aplicar essas proteções também no armazenamento dos dados, não somente nos botões.
- Não alterar cálculos financeiros, cadastro de recebimentos nem permissões dos demais módulos.

## 2. Cópia semanal no Google Drive
- Criar uma pasta privada `Backups Magic Moments` na conta conectada, sem compartilhar publicamente.
- Executar aos domingos às 03h00, horário de Brasília, sem depender de alguém estar com o sistema aberto.
- Incluir eventos, clientes, serviços, colaboradores, escalas e valores da equipe, recebimentos, compromissos do calendário, tarefas, perfis e configurações de permissões.
- Incluir todos os arquivos do armazenamento de anexos: comprovantes, contratos e documentos adicionais, preservando os vínculos com os eventos.
- Salvar cada execução em uma pasta datada, com dados em formato aberto, arquivos originais e um inventário de quantidades e verificações de integridade.
- Manter as cópias anteriores, sem exclusão automática nesta etapa; o espaço consumido depende do volume e da capacidade do Google Drive.
- Não exportar senhas, sessões ou chaves de integrações. Recuperar os dados operacionais não equivale a recriar automaticamente as contas de acesso ou toda a hospedagem.

## 3. Acompanhamento e recuperação
- Disponibilizar em Configurações uma área restrita ao Administrador para ver o último backup, andamento, falhas e histórico, além de solicitar uma cópia manual.
- Marcar uma cópia como concluída somente depois de conferir dados e arquivos; uma cópia incompleta deve aparecer como falha ou pendente.
- Processar volumes maiores por etapas persistidas, com retomada e tentativas limitadas, sem sobrescrever uma cópia concluída.
- Preparar instruções de recuperação e validar uma cópia em ambiente separado, sem substituir dados de produção nem criar um botão de restauração destrutiva.

## Limites importantes
- Nenhum backup garante perda zero: uma rotina semanal pode deixar até sete dias de alterações fora da última cópia concluída. Se uma execução falhar, esse intervalo pode aumentar.
- A recuperação automática e a retenção nativa do Lovable Cloud ainda precisam de confirmação; não serão apresentadas como garantidas.
- Para uma cópia imediata de segurança do banco, usar no Lovable **Cloud → Advanced settings → Export data**; essa exportação não substitui o backup dos anexos.
- A rotina só será considerada ativa após publicação e uma execução real completa validada. Conectar o Google Drive, sozinho, não ativa backups.

## Detalhes técnicos
- Revisão confirmou RLS nas 15 tabelas atuais; excluir eventos hoje remove recebimentos, vínculos da equipe, compromissos e metadados dos anexos em cascata. Não reconstruir essas tabelas.
- Acrescentar controles de backup com permissões e acessos restritos; autenticar ações manuais no servidor e os agendamentos com segredo privado, nunca com chave pública.
- Usar uma captura consistente dos dados relacionais; registrar versão de estrutura e inventário. A captura dos arquivos não é uma transação conjunta com o banco: detectar anexos removidos ou alterados durante a cópia e nunca declarar sucesso silenciosamente.
- Usar o Google Drive conectado somente no servidor, com uploads em lotes limitados e registros persistidos de progresso, sem expor credenciais nem conteúdo dos cadastros em logs.
- Agendamento semanal e retomadas apenas enquanto houver trabalho pendente, evitando verificações contínuas desnecessárias.
- Testar bloqueios de exclusão, escopo completo, paginação, falhas de upload, retomada, consistência dos pagamentos e integridade dos arquivos.