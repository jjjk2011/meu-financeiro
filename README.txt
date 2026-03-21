# ☁️ CLOUD FINANCE PRO

![Version](https://img.shields.io/badge/version-2.0.0-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)
![Firebase](https://img.shields.io/badge/Firebase-10.8.0-orange)

Sistema de gestão financeira pessoal com sincronização em nuvem, desenvolvido para controle completo de receitas, despesas e investimentos.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Como Usar](#como-usar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Atalhos de Teclado](#atalhos-de-teclado)
- [Instalação](#instalação)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🎯 Sobre o Projeto

O **Cloud Finance Pro** é uma aplicação web moderna para gerenciamento financeiro pessoal. Com interface intuitiva e design responsivo, permite que usuários controlem suas receitas, despesas e investimentos de forma eficiente, com dados sincronizados em tempo real na nuvem.

### 🎨 Diferenciais

- ✅ Interface limpa e moderna
- ✅ Modo escuro/claro automático
- ✅ Totalmente responsivo (mobile/desktop)
- ✅ Dados sincronizados em tempo real
- ✅ Gratuito e de código aberto

## ✨ Funcionalidades

### 🔐 **Autenticação**
- [x] Login com e-mail e senha
- [x] Cadastro com nome completo
- [x] Persistência de sessão
- [x] Logout automático

### 💰 **Gestão Financeira**
- [x] **Receitas** - Adicionar ganhos (salário, freelas, etc)
- [x] **Despesas** - Controlar gastos (contas, compras, etc)
- [x] **Parcelamento** - Dividir despesas em até 24x
- [x] **Categorias** - Organizar por tipo (Alimentação, Saúde, etc)
- [x] **Métodos** - Pagamento (Dinheiro, Crédito, Débito, PIX)
- [x] **Status** - Marcar como pago/pendente

### 📈 **Investimentos**
- [x] **Ativos** - Ações, FIIs, Cripto, Renda Fixa, etc
- [x] **Corretoras** - Personalizáveis
- [x] **Preço médio e atual** - Cálculo automático de rentabilidade
- [x] **Atualização rápida** - Clique no ✏️ para atualizar preço
- [x] **Resumo da carteira** - Total investido, valor atual, lucro e rentabilidade

### 📊 **Visualização**
- [x] **Tabela separada** - Receitas e despesas em seções diferentes
- [x] **Filtro por mês/ano** - Navegue entre períodos
- [x] **Busca em tempo real** - Encontre qualquer transação
- [x] **Cards de resumo** - Saldo, total receitas e despesas
- [x] **Cores intuitivas** - Verde (receitas), Vermelho (despesas)

### ☁️ **Nuvem**
- [x] Sincronização automática com Firebase
- [x] Backup seguro dos dados
- [x] Acesso de qualquer dispositivo
- [x] Recuperação de dados

### 🎨 **Interface**
- [x] **Modo Dark/Light** - Alternância com um clique
- [x] **Design responsivo** - Funciona em celular, tablet e PC
- [x] **Animações suaves** - Transições e feedbacks visuais
- [x] **Toast notifications** - Alertas elegantes
- [x] **Loading states** - Indicador de carregamento

### 📱 **Funcionalidades Extras**
- [x] **Exportar PDF** - Relatório completo do mês ou da carteira
- [x] **Atalhos de teclado** - Agilidade no uso
- [x] **Edição rápida** - Clique na transação para editar
- [x] **Exclusão segura** - Confirmação antes de remover
- [x] **Categorias e tipos personalizáveis** - Adicione suas próprias

## 🛠️ Tecnologias Utilizadas

### **Frontend**
- ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) - Estrutura da aplicação
- ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) - Estilização e design
- ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) - Lógica da aplicação

### **Backend & Cloud**
- ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black) - Plataforma de desenvolvimento
  - **Authentication** - Gerenciamento de usuários
  - **Firestore** - Banco de dados em tempo real
  - **Hosting** - Hospedagem da aplicação

### **Bibliotecas**
- ![jsPDF](https://img.shields.io/badge/jsPDF-2.5.1-red) - Geração de relatórios PDF
- ![AutoTable](https://img.shields.io/badge/AutoTable-3.5.25-blue) - Tabelas profissionais no PDF

## 📖 Como Usar

### **1. Primeiro Acesso**

1. Acesse a aplicação
2. Clique em **"CADASTRAR"**
3. Preencha:
   - Seu nome completo
   - E-mail válido
   - Senha (mínimo 6 caracteres)
4. Clique em **"CRIAR CONTA"**

### **2. Login**

- Digite e-mail e senha
- Clique em **"ENTRAR"**
- Seus dados serão carregados automaticamente

### **3. Adicionar Receita/Despesa**

**💰 RECEITA:**
- Selecione "Receita (+)"
- Descrição (ex: Salário)
- Valor
- Categoria (ex: TRABALHO)
- Método (ex: PIX)
- Mês/Ano
- Clique em **"SALVAR"**

**📉 DESPESA:**
- Selecione "Despesa (-)"
- Descrição (ex: Aluguel)
- Valor
- Parcelas (se aplicável)
- Categoria (ex: MORADIA)
- Método (ex: DÉBITO)
- Mês/Ano
- Clique em **"SALVAR"**

### **4. Gerenciar Investimentos**

- Acesse a aba **"INVESTIMENTOS"**
- Preencha os dados do ativo (ativo, tipo, corretora, quantidade, preço médio)
- O preço atual pode ser preenchido agora ou atualizado depois
- Clique em **"SALVAR INVESTIMENTO"**
- Para atualizar o preço atual, clique no ✏️ ao lado do valor

### **5. Gerenciar Transações**

- **✏️ EDITAR**: Clique em qualquer transação
- **✅ PAGO**: Clique no círculo ao lado
- **🗑️ EXCLUIR**: Clique no "✕" vermelho
- **📦 EXCLUIR TODAS AS PARCELAS**: Clique no ícone de caixa ao lado da primeira parcela

### **6. Filtrar e Buscar**

- **📅 MÊS/ANO**: Selecione no topo da tabela
- **🔍 BUSCAR**: Digite na caixa de pesquisa

### **7. Exportar PDF**

- No modo desejado, clique no botão **"📄 PDF"**
- O relatório será baixado automaticamente

## 📁 Estrutura do Projeto
