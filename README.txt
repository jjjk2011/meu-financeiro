💰 Financeiro Pro Cloud
Um gestor financeiro pessoal leve, moderno e totalmente sincronizado na nuvem. Este projeto foi evoluído de um sistema local para uma aplicação completa com autenticação de usuários e banco de dados em tempo real.

🚀 O que ele faz?
Sincronização Cloud: Seus dados não ficam mais presos ao navegador. Acesse do PC ou do celular e veja tudo em tempo real.
Controle de Acesso: Sistema de login seguro via Firebase Auth (e-mail e senha).
Gestão de Lançamentos: Registro de receitas e despesas com suporte a parcelamento automático.
Filtros Inteligentes: Histórico mensal detalhado com cálculo de saldo líquido automático.
Customização Total: Adicione ou remova suas próprias categorias e métodos de pagamento (bancos/cartões) diretamente pela interface.
Migração Fácil: Botão de importação para trazer dados de backups em JSON sem dor de cabeça.

🛠️ Tecnologias Utilizadas
Frontend: HTML5, Tailwind CSS (estilização moderna e responsiva).
Backend como Serviço (BaaS): Firebase (Authentication e Firestore Database).
Lógica: JavaScript ES6+ utilizando módulos oficiais do Firebase.
Hospedagem: Otimizado para rodar na Vercel.

📦 Como Instalar
Clone o repositório ou baixe os arquivos index.html e app.js.
Configure o Firebase:
Crie um projeto no Console do Firebase.
Ative o Authentication (E-mail/Senha).
Crie um banco de dados Firestore e configure as regras de acesso.
Substitua o objeto firebaseConfig no index.html pelas suas credenciais.
Suba para a Vercel: Basta conectar seu GitHub e o deploy é automático.

📝 Regras de Segurança (Firestore)
Para garantir que cada usuário veja apenas os seus próprios dados, utilize a seguinte regra no seu Firebase:

JavaScript
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
Desenvolvido para ser simples, rápido e eficiente.
