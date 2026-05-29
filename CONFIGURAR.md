# CONFIGURAR — Copa do Mundo de Vendas Tênis One

Este projeto foi profissionalizado **sem reconstruir o sistema**.

Foram preservados:
- layout atual;
- fluxo de gerente e vendedor;
- regras do Saulo;
- cálculo de gols por dia;
- bônus automático por dezena;
- ranking individual;
- álbum e figurinhas;
- guia do gerente;
- arquivos de tênis/3D que já estavam no repositório.

Foram adicionadas/adaptadas apenas as camadas profissionais:
- Firebase Authentication por email/senha;
- Firebase Realtime Database;
- Cloudinary para fotos das figurinhas;
- configuração clara de emails do gerente e vendedores;
- regras profissionais do banco.

---

## 1. Onde colocar as chaves do Firebase

Abra o arquivo:

```txt
config.js
```

Procure este bloco:

```js
firebase: {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
}
```

Cole os dados do seu projeto Firebase.

Você encontra esses dados em:

```txt
Firebase Console
Project settings
General
Your apps
Firebase SDK snippet / Config
```

---

## 2. Onde colocar Cloudinary

No mesmo arquivo `config.js`, procure:

```js
cloudinary: {
  cloudName: "",
  uploadPreset: ""
}
```

Preencha:

- `cloudName`: nome da sua nuvem no Cloudinary;
- `uploadPreset`: preset unsigned para upload direto pelo navegador.

O sistema usa isso para as fotos das figurinhas dos vendedores.

---

## 3. Onde colocar o email do gerente

No `config.js`, procure:

```js
auth: {
  enabled: true,

  managerName: "Saulo",
  managerEmail: "gerente@tenisone.com.br",
```

Troque:

```txt
gerente@tenisone.com.br
```

pelo email real do gerente cadastrado no Firebase Authentication.

Exemplo:

```js
managerEmail: "saulo@tenisone.com.br"
```

---

## 4. Onde colocar os emails dos vendedores

No `config.js`, procure:

```js
sellers: [
  { vendorId: "isack", email: "isack@tenisone.com.br" },
  { vendorId: "viviane", email: "viviane@tenisone.com.br" },
  { vendorId: "matheus", email: "matheus@tenisone.com.br" },
  { vendorId: "brian", email: "brian@tenisone.com.br" },
  { vendorId: "vendedor5", email: "vendedor5@tenisone.com.br" }
]
```

Troque cada email pelo email real de cada vendedor.

O `vendorId` precisa bater com o `id` do vendedor dentro de `campaign.vendors`.

Exemplo:

```js
{ vendorId: "isack", email: "isack.vendas@gmail.com" }
```

---

## 5. Onde alterar o 5º vendedor

O projeto original tinha 4 vendedores:

- Isack
- Viviane
- Matheus
- Brian

Como agora serão 5 vendedores, foi criado um 5º cadastro de base:

```js
{
  id: "vendedor5",
  name: "Vendedor 5",
  shortName: "Vend. 5",
  team: "verde",
  shirtNumber: 5,
  rarity: "classic",
  title: "Reforço da Rodada",
  subtitle: "5º vendedor da campanha",
  albumOrder: 5,
  specialType: "normal",
  showInAlbum: true,
  active: true
}
```

Troque:
- `id`, se quiser outro identificador;
- `name`;
- `shortName`;
- `team`;
- `shirtNumber`;
- `rarity`;
- `title`;
- `subtitle`.

Se alterar o `id`, lembre de alterar também o `vendorId` no bloco `auth.sellers`.

---

## 6. Firebase Authentication

No Firebase Console:

1. Vá em **Authentication**.
2. Ative **Email/Password**.
3. Crie 1 usuário para o gerente.
4. Crie 5 usuários para os vendedores.
5. Use os mesmos emails no `config.js`.

O sistema identifica automaticamente:
- gerente: pelo `managerEmail`;
- vendedor: pelo email listado em `auth.sellers`.

---

## 7. Regras do Realtime Database

Use o arquivo:

```txt
firebase-rules-profissional.json
```

Antes de colar no Firebase, troque:

```txt
gerente@tenisone.com.br
```

pelo mesmo email real do gerente configurado em `config.js`.

Depois cole as regras em:

```txt
Firebase Console
Realtime Database
Rules
```

Regra aplicada:
- qualquer usuário autenticado pode ler;
- somente o gerente pode gravar.

---

## 8. Primeiro acesso

Ordem recomendada:

1. Configure Firebase e Cloudinary em `config.js`.
2. Configure as regras no Firebase.
3. Suba o projeto no GitHub Pages.
4. Entre primeiro com o email do gerente.
5. O sistema cria a base inicial no Realtime Database.
6. Depois os vendedores já podem entrar e acompanhar.

---

## 9. Observação importante sobre o teste de 3 dias

O sistema preserva a lógica comercial que já existia:

```js
trialDays: 3
```

Isso significa que o navegador pode bloquear novas gravações depois do período de teste.

Eu não removi essa regra porque ela já fazia parte da lógica anterior do projeto.

thIAguinho Soluções — tecnologia sob medida.
