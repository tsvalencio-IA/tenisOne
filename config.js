window.APP_CONFIG = {
  // ---------------------------------------------------------------------------
  // ACESSO
  // ---------------------------------------------------------------------------
  // O sistema usa Firebase Authentication por email e senha.
  // As senhas abaixo ficam apenas como contingência local se o Firebase ainda
  // não estiver disponível no momento do teste.
  managerPassword: "2026",
  sellerPassword: "vendas",

  // Produção: gravação liberada para a campanha.
  trialDays: 0,

  contactPerson: "Thiago Ventura Valêncio",
  contactChannel: "WhatsApp",

  // ---------------------------------------------------------------------------
  // FIREBASE AUTH — IDENTIFICAÇÕES DE ACESSO
  // ---------------------------------------------------------------------------
  // AQUI você define qual email é do gerente e qual email pertence a cada vendedor.
  //
  // PASSO 1:
  // Crie estes usuários no Firebase Authentication com o provedor Email/Senha.
  //
  // PASSO 2:
  // Coloque exatamente os mesmos emails abaixo.
  //
  // PASSO 3:
  // Em cada vendedor, mantenha o vendorId igual ao id do vendedor no bloco
  // campaign.vendors.
  //
  // IMPORTANTE:
  // - O gerente pode gravar, lançar vendas, editar vendedores e fotos.
  // - Os vendedores apenas visualizam o sistema com seu próprio email.
  auth: {
    enabled: true,

    managerName: "Saulo",
    managerEmail: "saulo@t1.com",

    sellers: [
      { vendorId: "isack", email: "isack@tenisone.com.br" },
      { vendorId: "viviane", email: "viviane@tenisone.com.br" },
      { vendorId: "matheus", email: "matheus@tenisone.com.br" },
      { vendorId: "brian", email: "brian@tenisone.com.br" },

      // 5º vendedor:
      // Troque o nome, email e time do vendedor "vendedor5" no bloco
      // campaign.vendors logo abaixo quando o Saulo confirmar os dados.
      { vendorId: "vendedor5", email: "vendedor5@tenisone.com.br" }
    ]
  },

  campaign: {
    name: "Copa do Mundo de Vendas Diária",
    store: "Tênis One — Shopping Cidade Norte",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    productsRule: "Todos os produtos da loja contam.",
    bonusRuleNote: "Rodadas, gols e bônus são automáticos. Na regra atual, maior meta batida é calculada como maior faturamento acumulado da dezena; se houver alteração de venda, o bônus é recalculado.",
    prizes: {
      teamChampion: "R$ 100,00 via PIX para cada integrante + 1 folga premiada para cada um.",
      topSeller: "R$ 100,00 via PIX para o artilheiro individual."
    },
    teams: {
      verde: { id: "verde", name: "Seleção Verde", color: "#0b7f49" },
      azul: { id: "azul", name: "Seleção Azul", color: "#143f91" }
    },
    vendors: [
      {
        id: "isack",
        name: "Isack",
        shortName: "Isack",
        team: "verde",
        shirtNumber: 10,
        position: "Goleiro",
        height: "1,75m",
        weight: "88kg",
        birthDate: "A definir",
        age: "18",
        rarity: "legendary",
        title: "Craque da Rodada",
        subtitle: "Rumo à taça de vendas",
        albumOrder: 1,
        specialType: "normal",
        showInAlbum: true,
        active: true
      },
      {
        id: "viviane",
        name: "Viviane",
        shortName: "Viviane",
        team: "verde",
        shirtNumber: 8,
        position: "Atacante",
        height: "1,65m",
        weight: "58kg",
        birthDate: "A definir",
        age: "22",
        rarity: "gold",
        title: "Camisa 10",
        subtitle: "Força da Seleção Verde",
        albumOrder: 2,
        specialType: "normal",
        showInAlbum: true,
        active: true
      },
      {
        id: "matheus",
        name: "Matheus",
        shortName: "Matheus",
        team: "azul",
        shirtNumber: 7,
        position: "Meia",
        height: "1,78m",
        weight: "76kg",
        birthDate: "A definir",
        age: "21",
        rarity: "silver",
        title: "Artilheiro",
        subtitle: "Pontaria nas vendas",
        albumOrder: 3,
        specialType: "normal",
        showInAlbum: true,
        active: true
      },
      {
        id: "brian",
        name: "Brian",
        shortName: "Brian",
        team: "azul",
        shirtNumber: 11,
        position: "Lateral",
        height: "1,74m",
        weight: "72kg",
        birthDate: "A definir",
        age: "20",
        rarity: "classic",
        title: "Capitão",
        subtitle: "Liderança em campo",
        albumOrder: 4,
        specialType: "normal",
        showInAlbum: true,
        active: true
      },
      {
        id: "vendedor5",
        name: "Vendedor 5",
        shortName: "Vend. 5",
        team: "verde",
        shirtNumber: 5,
        position: "Reforço",
        height: "1,70m",
        weight: "70kg",
        birthDate: "A definir",
        age: "20",
        rarity: "classic",
        title: "Reforço da Rodada",
        subtitle: "5º vendedor da campanha",
        albumOrder: 5,
        specialType: "normal",
        showInAlbum: true,
        active: true
      }
    ]
  },

  // ---------------------------------------------------------------------------
  // FIREBASE REALTIME DATABASE
  // ---------------------------------------------------------------------------
  // AQUI já estão as identificações do projeto Firebase informado.
  // Firebase Console → Project settings → General → Your apps.
  firebase: {
    apiKey: "AIzaSyCKjUnYqe5ZEiSPBJeaHeMALgRoZyA0xHw",
    authDomain: "tenis1-32523.firebaseapp.com",
    databaseURL: "https://tenis1-32523-default-rtdb.firebaseio.com",
    projectId: "tenis1-32523",
    storageBucket: "tenis1-32523.firebasestorage.app",
    messagingSenderId: "1093444270871",
    appId: "1:1093444270871:web:100f1ecf5d2ecec6d95552"
  },

  // ---------------------------------------------------------------------------
  // CLOUDINARY
  // ---------------------------------------------------------------------------
  // AQUI você cola as identificações do Cloudinary.
  // cloudName: nome da nuvem.
  // uploadPreset: preset unsigned para upload direto pelo navegador.
  cloudinary: {
    cloudName: "dd6ppm6nf",
    uploadPreset: "tenis1"
  }
};
