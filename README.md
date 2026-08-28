# Magic Moments Hub

Quero desenvolver um sistema web interno para gerenciamento da empresa Magic Moments.

O sistema será utilizado pela equipe para centralizar clientes, eventos, serviços, calendário e informações operacionais.

IMPORTANTE: este projeto será desenvolvido por etapas. Não quero que você tente construir todas as funcionalidades de uma vez. Primeiro, crie a estrutura base do sistema, autenticação e gerenciamento de usuários/permissões. Depois vamos desenvolver cada módulo individualmente.

OBJETIVO DO SISTEMA

O sistema deve funcionar como um painel interno da Magic Moments para gerenciamento dos eventos.

A estrutura geral planejada será:

Login

Usuários e Roles

Clientes

Serviços

Eventos

Calendário

Dashboard e indicadores

O módulo financeiro NÃO será um sistema financeiro completo. A empresa continuará utilizando uma planilha para o controle financeiro oficial.

O sistema poderá futuramente apresentar apenas indicadores relacionados aos eventos, como valor contratado, valor recebido e valor a receber.

Não desenvolver controle de despesas, contas bancárias, fluxo de caixa ou contabilidade.

1. IDENTIDADE DO SISTEMA

O sistema deve utilizar a identidade visual da Magic Moments.

A interface deve ter aparência moderna, elegante e profissional, mas simples de utilizar.

Priorizar:

Interface limpa

Boa hierarquia visual

Navegação simples

Responsividade

Componentes reutilizáveis

Sidebar para navegação

Dashboard com cards e indicadores

Modais ou páginas próprias para formulários

Feedback visual para ações realizadas

Mensagens claras de erro e sucesso

Não criar uma interface exageradamente complexa.

2. AUTENTICAÇÃO

A primeira tela exibida deve ser a tela de login.

Ela deve conter:

Logo da Magic Moments

Campo de e-mail

Campo de senha

Botão "Entrar"

Opção "Esqueci minha senha"

Mensagem de erro para credenciais inválidas

Indicador de carregamento durante o login

Após o login, o usuário deve ser direcionado para o Dashboard.

Usuários não autenticados não podem acessar nenhuma página interna do sistema.

As rotas internas devem possuir proteção de autenticação.

3. USUÁRIOS

Deve existir um módulo de gerenciamento de usuários.

Somente usuários com permissão adequada poderão acessar essa área.

Cada usuário deve possuir pelo menos:

ID

Nome

E-mail

Senha/autenticação segura

Role

Status

Data de criação

Último acesso

Status:

Ativo

Inativo

Usuários inativos não podem realizar login.

Não permitir que qualquer pessoa crie uma conta livremente.

Novos usuários devem ser criados por um usuário com permissão administrativa.

4. ROLES E PERMISSÕES

Essa é uma das partes mais importantes do sistema.

Não quero que as permissões sejam simplesmente definidas de forma fixa no código.

Quero uma estrutura flexível onde seja possível criar e editar Roles.

Exemplo:

Role: Administrador

Role: Comercial

Role: Operacional

Futuramente poderei criar outras Roles sem precisar alterar a estrutura principal do sistema.

Cada Role deve possuir permissões específicas.

As permissões devem poder ser configuradas por módulo e por ação.

Estrutura conceitual:

Módulo → Ação → Permissão

Exemplos:

Clientes:

Visualizar

Criar

Editar

Excluir

Eventos:

Visualizar

Criar

Editar

Excluir

Editar valores

Editar informações críticas

Calendário:

Visualizar

Criar

Editar

Excluir

Serviços:

Visualizar

Criar

Editar

Excluir

Usuários:

Visualizar

Criar

Editar

Desativar

Gerenciar Roles

Configurações:

Visualizar

Editar

5. PERMISSÃO POR CAMPO

A estrutura deve ser preparada para futuramente permitir permissões mais específicas.

Por exemplo:

Um usuário da Role Comercial pode visualizar um evento, mas não necessariamente alterar todos os seus campos.

Exemplo:

Role Comercial:

Pode:

Visualizar cliente

Criar cliente

Editar telefone do cliente

Criar evento

Visualizar evento

Editar informações comerciais permitidas

Visualizar calendário

Não pode:

Alterar determinados valores financeiros

Alterar configurações do sistema

Gerenciar usuários

Alterar Roles

Excluir eventos

Alterar campos administrativos

Quero que a arquitetura permita futuramente configurar permissões por campo quando necessário.

Não precisa implementar todas as permissões por campo agora, mas a estrutura deve ser preparada para isso.

6. ROLE ADMIN

Criar inicialmente uma Role chamada "Administrador".

Essa Role terá acesso completo ao sistema.

O administrador poderá:

Visualizar tudo

Criar tudo

Editar tudo

Excluir quando permitido

Gerenciar usuários

Criar Roles

Editar Roles

Configurar permissões

Acessar configurações

Deve existir um usuário administrador inicial para que o sistema possa ser configurado.

7. ROLE COMERCIAL

Criar inicialmente uma Role chamada "Comercial".

Essa Role será utilizada pela equipe comercial da Magic Moments.

Ela deverá ter permissões mais limitadas.

Por exemplo:

Clientes:

Visualizar

Criar

Editar informações permitidas

Eventos:

Visualizar

Criar

Editar informações permitidas

Calendário:

Visualizar

Criar/editar conforme as permissões configuradas

Usuários:

Sem acesso

Roles:

Sem acesso

Configurações:

Sem acesso

Informações sensíveis ou campos administrativos devem possuir controle de acesso.

As permissões devem ser configuráveis pelo administrador.

8. CLIENTES

Depois da autenticação e gerenciamento de usuários, o próximo módulo será Clientes.

Um cliente pode possuir vários eventos.

Portanto, NÃO criar um cliente novo para cada evento.

Estrutura:

Cliente
→ Evento 1
→ Evento 2
→ Evento 3

O cadastro do cliente deverá possuir inicialmente:

Nome completo

Telefone

WhatsApp

E-mail

CEP

Endereço

Número

Complemento

Bairro

Cidade

Estado

Observações

Data de cadastro

Usuário responsável pelo cadastro

Na página do cliente deve existir uma seção mostrando os eventos relacionados a ele.

Exemplo:

CLIENTE
Maria Silva

Eventos:

Casamento - 12/09/2026

Evento corporativo - 15/03/2027

9. SERVIÇOS

Criar um módulo separado chamado "Serviços".

Não quero gerenciamento de equipamentos neste sistema.

Os equipamentos utilizados pela Magic Moments não serão cadastrados ou controlados.

O objetivo é gerenciar apenas os serviços oferecidos.

Cada serviço deve possuir:

Nome

Descrição

Cor

Status

Data de criação

Exemplos iniciais:

Espelho de Memórias

Spinner 360°

Combo Magic Moments

A cor do serviço será extremamente importante porque será utilizada posteriormente no calendário.

Exemplo:

Espelho de Memórias → cor definida pelo administrador

Spinner 360° → outra cor

Combo → outra cor

O administrador deverá conseguir cadastrar novos serviços, editar serviços existentes, alterar suas cores e desativá-los.

10. EVENTOS

O evento será vinculado obrigatoriamente a um cliente.

Um cliente pode possuir vários eventos.

O evento deverá possuir inicialmente:

Cliente

Nome do evento

Tipo de evento

Data

Horário de início

Horário de término

Local

Endereço

Serviço

Status

Valor contratado

Valor recebido

Valor a receber

Observações

Responsável

Data de criação

Usuário que criou o evento

O valor a receber deve poder ser calculado automaticamente:

Valor contratado - Valor recebido = Valor a receber

Porém, o controle financeiro oficial continuará sendo feito fora do sistema.

Os campos financeiros devem respeitar as permissões da Role do usuário.

11. CALENDÁRIO

Criar posteriormente um calendário de eventos.

O calendário deverá permitir visualizar os eventos por:

Mês

Semana

Dia

Cada evento deve aparecer utilizando a cor definida para o serviço relacionado.

Exemplo:

Espelho de Memórias → eventos aparecem com a cor do serviço

Spinner 360° → eventos aparecem com outra cor

Combo → eventos aparecem com outra cor

Ao clicar em um evento no calendário, abrir os detalhes daquele evento.

O calendário deve permitir identificar rapidamente:

Data

Horário

Cliente

Serviço

Local

Também deve existir uma legenda mostrando as cores dos serviços.

12. RELACIONAMENTOS IMPORTANTES

A arquitetura deve respeitar os seguintes relacionamentos:

Usuário → possui uma Role

Role → possui várias permissões

Cliente → pode possuir vários Eventos

Evento → pertence a um Cliente

Evento → possui um Serviço

Serviço → possui uma cor utilizada no Calendário

Não duplicar dados desnecessariamente.

13. SEGURANÇA

As permissões devem ser verificadas no backend, não somente na interface.

Não basta esconder um botão para impedir uma ação.

Se um usuário não possui permissão para editar determinado dado, a API/backend também deve bloquear essa alteração.

Proteger todas as rotas internas.

Senhas devem utilizar autenticação segura e nunca ser armazenadas em texto puro.

Evitar que usuários consigam acessar informações simplesmente alterando URLs ou IDs manualmente.

14. NAVEGAÇÃO

Após o login, criar uma estrutura de navegação semelhante a:

Dashboard

Eventos

Calendário

Clientes

Serviços

Configurações
└── Usuários
└── Roles e permissões

Os itens exibidos na navegação devem respeitar as permissões do usuário.

Por exemplo, um usuário sem acesso a Usuários não deve visualizar essa opção na sidebar.

15. IMPORTANTE SOBRE O DESENVOLVIMENTO

NÃO desenvolva todos os módulos agora.

Nesta primeira etapa, quero que você:

Crie a estrutura base do projeto.

Crie a tela de login.

Crie o sistema de autenticação.

Crie a estrutura de usuários.

Crie a estrutura de Roles.

Crie a estrutura de permissões.

Crie a Role Administrador.

Crie a Role Comercial.

Crie a interface administrativa para gerenciamento de usuários.

Crie a interface administrativa para gerenciamento de Roles e permissões.

Prepare a arquitetura do banco de dados para suportar Clientes, Serviços e Eventos futuramente.

NÃO implemente ainda o módulo completo de Clientes, Eventos ou Calendário.

Apenas deixe a arquitetura preparada para essas próximas etapas.

Quando essa primeira etapa estiver funcionando, eu fornecerei instruções para desenvolver o próximo módulo.

Antes de finalizar essa primeira etapa, verifique se a arquitetura permite adicionar novos módulos e novas Roles no futuro sem precisar reestruturar o sistema inteiro.

O objetivo é construir um sistema modular, onde cada parte possa ser desenvolvida e ajustada separadamente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/06c520d0-13d0-4486-818a-fdaf870b02b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
