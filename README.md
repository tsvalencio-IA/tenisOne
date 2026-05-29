# Copa do Mundo de Vendas Diária — Tênis One

## Versão profissional com Firebase Auth, Realtime Database e Cloudinary

Esta versão preserva o projeto atual da gincana e adiciona a camada profissional de login por email/senha, banco em tempo real e upload de fotos.

Leia primeiro:

```txt
CONFIGURAR.md
```

É nesse arquivo que está explicado onde colocar:
- chaves do Firebase;
- Cloudinary `cloudName` e `uploadPreset`;
- email do gerente;
- emails dos 5 vendedores;
- regras do Realtime Database.



## Acessos

- Versão profissional: email e senha cadastrados no Firebase Authentication.
- Gerente: definido em `config.js` no campo `auth.managerEmail`.
- Vendedores: definidos em `config.js` no array `auth.sellers`.
- Fallback local preservado: se o Firebase não estiver configurado, o sistema ainda aceita gerente `2026` e vendedores `vendas`.

## Regra oficial aplicada

- Time Verde: Isack + Viviane
- Time Azul: Matheus + Brian
- Cada dia é uma rodada.
- O gerente lança as vendas por vendedor.
- O sistema soma automaticamente por dupla.
- A dupla com maior faturamento do dia marca gol.
- Dias 01 a 10: vitória do dia = 1 gol.
- Dias 11 a 20: vitória do dia = 2 gols.
- Dias 21 ao fim: vitória do dia = 3 gols.
- Bônus da dezena: +3 gols automáticos para a dupla com maior faturamento acumulado da dezena.
- Artilheiro individual: vendedor com maior faturamento acumulado no mês.

## Fluxo do gerente

1. Entrar como gerente com senha `2026`.
2. Cadastrar ou editar vendedores.
3. Enviar fotos e configurar figurinhas.
4. Lançar a venda diária por vendedor.
5. Ao salvar uma venda, o sistema recalcula automaticamente:
   - total do Time Verde;
   - total do Time Azul;
   - vencedor da rodada;
   - gols da rodada;
   - bônus da dezena;
   - placar geral;
   - ranking individual;
   - artilheiro.

O gerente pode usar os botões de recálculo apenas para conferência ou correção.

## Fluxo do vendedor

1. Entrar como vendedor com senha `vendas`.
2. Escolher o nome.
3. Acompanhar placar, ranking, desempenho, álbum e figurinhas.
4. O vendedor não altera dados.

## Publicação no GitHub Pages

Suba todos os arquivos na raiz do repositório e publique pelo GitHub Pages.

thIAguinho Soluções — tecnologia sob medida.

## Guia do gerente

Abra `guia-gerente.html` para o treinamento completo do gerente, com o fluxo automático individual + grupo.


## Guia automático do gerente

O arquivo `guia-gerente.html` é um guia profissional interativo.

Como usar:
1. Abra `guia-gerente.html`.
2. Clique em **Iniciar guia automático**.
3. O guia vai apresentar as etapas com narração por voz.
4. Use **Próxima etapa**, **Voltar**, **Repetir voz** ou **Pausar voz**.
5. Ao final, clique em **Abrir sistema** para operar o `index.html`.

O guia explica:
- senha do gerente `2026`;
- senha dos vendedores `vendas`;
- cadastro de vendedores;
- edição de figurinhas;
- envio de fotos;
- lançamento de vendas;
- venda individual e total por grupo;
- cálculo automático de gols;
- bônus automático da dezena;
- ranking e artilheiro;
- auditoria operacional;
- geração do álbum e relatórios.


## Ajuste operacional importante

Na tela **Lançar vendas**, o gerente usa **Salvar venda e recalcular automaticamente** para registrar o valor do vendedor. Ao terminar os lançamentos do dia, usa **Finalizar dia selecionado** ou **Finalizar este dia** para marcar a rodada como finalizada. O cálculo de gols e bônus continua automático.