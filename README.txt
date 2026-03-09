COMO USAR

1. Abra o arquivo `index.html` no navegador (arraste para o browser ou use um servidor local).
2. O aplicativo roda totalmente no navegador e salva dados em localStorage.

FUNCIONALIDADES PRINCIPAIS
- Adicionar receitas
- Adicionar despesas (à vista ou parceladas)
- Parcelamento automático com distribuição em centavos
- Filtros por mês e ano e resumo mensal

NOTAS DE ALTERAÇÕES (março/2026)

- Visual principal migrado para Tailwind via CDN; marcação usa utilitários Tailwind.
- `style.css` reduzido para um conjunto mínimo de regras auxiliares (animação do badge, cabeçalho sticky, botões de exclusão) para evitar conflitos com utilitários.
- `app.js` atualizado: o badge do título da tabela agora é renderizado como HTML com atributos ARIA e uma animação leve para melhorar acessibilidade.

TESTES RÁPIDOS (como verificar no navegador)

1) Abrir `index.html` no navegador moderno (Chrome, Edge ou Firefox).

2) Adicionar uma despesa simples:
   - Preencha "Descrição" e "Valor" (ex.: 150.00), selecione um cartão (ou crie um), e clique em "Adicionar Despesa".
   - Verifique se a despesa aparece na tabela e se o badge atualiza o total.

3) Testar parcelamento:
   - Adicione uma despesa com Parcelas = 3 e um valor com centavos (ex.: 100.01).
   - Confirme que as parcelas somam exatamente o valor informado.

4) Testar filtro de mês/ano e persistência:
   - Altere os selects de filtro (mês/ano) e observe o badge — ele deve exibir mês/ano quando aplicável.
   - Recarregue a página: os filtros devem ser mantidos (persistência via localStorage).

5) Acessibilidade do badge:
   - O badge possui role="status" e aria-live="polite" para que leitores de tela anunciem atualizações.

PRÓXIMOS PASSOS SUGERIDOS

- Se desejar, posso completar a migração para Tailwind removendo todas as regras restantes em `style.css` e convertendo quaisquer classes personalizadas no HTML.
- Também posso adicionar testes automatizados (Node + jsdom) para validar a lógica de parcelamento e a renderização do badge.

---


COMO USAR

1. Extraia o arquivo.
2. Abra o arquivo index.html.
3. O sistema funciona direto no navegador.

FUNÇÕES
- Adicionar receitas (salário ou extras)
- Adicionar despesas
- Parcelamento automático
- Cálculo automático de saldo
- Dados salvos no navegador

Não precisa instalar nada.
