import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AvailabilityStatus,
  Brand,
  Category,
  DatabaseStatusInfo,
  Product,
  ProductSpec,
  QuoteItem,
  QuoteRequest,
  QuoteStatus,
} from '../src/types/domain.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'videoweb.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, {recursive: true});
}

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema definition
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    specialty TEXT NOT NULL,
    authorized_status TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    price_brl REAL,
    availability TEXT NOT NULL DEFAULT 'Pronta Entrega',
    featured INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL,
    specs_json TEXT NOT NULL DEFAULT '[]',
    in_box_json TEXT NOT NULL DEFAULT '[]',
    warranty_months INTEGER NOT NULL DEFAULT 24,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    document_id TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    project_type TEXT NOT NULL,
    timeline TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    items_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Novo',
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Seed initial catalog when database is empty
function seedDatabase() {
  const categoryCount = (db.prepare('SELECT COUNT(*) AS count FROM categories').get() as {count: number}).count;
  if (categoryCount > 0) {
    return;
  }

  const insertCategory = db.prepare(`
    INSERT INTO categories (slug, name, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const categoriesSeed: Array<[string, string, string, string, number]> = [
    [
      'cameras-cinema',
      'Câmeras de Cinema',
      'Corpos digitais Large Format e Super 35 de alta latitude dinâmica para longa-metragem, publicidade e séries.',
      '/src/assets/images/prod_cinema_camera_1795521924293.jpg',
      1,
    ],
    [
      'lentes-cine',
      'Lentes Cine & Anamórficas',
      'Jogos de objetivas prime e zoom cinematográficas com montagem PL/LPL e calibração ótica certificada.',
      '/src/assets/images/prod_cine_lenses_1795521925276.jpg',
      2,
    ],
    [
      'iluminacao-led',
      'Iluminação LED & Fresnel',
      'Refletores COB RGBWW de alto CRI/TLCI, painéis suaves e controle DMX sem fio para estúdio e externa.',
      '/src/assets/images/prod_studio_lighting_1795521925302.jpg',
      3,
    ],
    [
      'audio-profissional',
      'Áudio Profissional',
      'Gravadores multipista timecode, sistemas sem fio UHF digitais e microfones direcionais de estúdio.',
      '/src/assets/images/prod_pro_audio_1795521925833.jpg',
      4,
    ],
    [
      'broadcast-switchers',
      'Broadcast & Switchers',
      'Mesas de corte 12G-SDI/NDI, matrizes de roteamento, intercom e monitoração HDR de referência.',
      '/src/assets/images/prod_broadcast_switcher_1795521926372.jpg',
      5,
    ],
  ];

  for (const row of categoriesSeed) {
    insertCategory.run(...row);
  }

  const insertBrand = db.prepare(`
    INSERT INTO brands (slug, name, country, specialty, authorized_status, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const brandsSeed: Array<[string, string, string, string, string, string]> = [
    [
      'arri',
      'ARRI',
      'Alemanha',
      'Câmeras Cinema, Óptica LPL & Iluminação',
      'Distribuidor Oficial Autorizado',
      'Referência mundial em sistemas de captura digital, lentes Signature Prime e refletores SkyPanel/Orbiter com suporte técnico certificado.',
    ],
    [
      'sony',
      'Sony Cinema Line',
      'Japão',
      'Câmeras Full-Frame & Broadcast 4K',
      'Revenda Oficial Pro Solutions',
      'Linha Cinema Line e sistemas de produção ao vivo com ciência de cor S-Cinetone, foco híbrido avançado e fluxo XAVC.',
    ],
    [
      'red',
      'RED Digital Cinema',
      'Estados Unidos',
      'Sensores 8K VV & REDCODE RAW',
      'Representante Autorizado Brasil',
      'Câmeras modulares DSMC3 com gravação interna RAW comprimida em 16-bit e faixa dinâmica superior a 17 stops.',
    ],
    [
      'zeiss',
      'ZEISS',
      'Alemanha',
      'Objetivas Supreme & Compact Prime',
      'Centro Óptico Certificado',
      'Engenharia óptica de precisão para sensores Full-Frame com metadados eXtended Data para pós-produção e VFX.',
    ],
    [
      'canon',
      'Canon Pro Video',
      'Japão',
      'Cinema EOS & Lentes Sumire / Servo',
      'Parceiro Premier Broadcast',
      'Sistemas versáteis de cinema e documentário combinados com lentes cine-servo de alto alcance para estúdio e externa.',
    ],
    [
      'blackmagic',
      'Blackmagic Design',
      'Austrália',
      'Switchers ATEM, Câmeras & DaVinci',
      'Distribuidor Oficial Autorizado',
      'Infraestrutura completa de produção ao vivo 12G-SDI, roteadores Videohub, gravadores HyperDeck e correção de cor.',
    ],
    [
      'sound-devices',
      'Sound Devices',
      'Estados Unidos',
      'Gravadores Multipista & Mixers RF',
      'Revenda Técnica Autorizada',
      'Padrão da indústria em captação de som direto com pré-amplificadores Kashmir e arquitetura FPGA de baixa latência.',
    ],
    [
      'aputure',
      'Aputure',
      'Global',
      'Iluminação COB LED & Ecossistema Sidus',
      'Distribuidor Master Brasil',
      'Refletores LED de alta potência da série Electro Storm e Light Storm com controle preciso de espectro RGBACL.',
    ],
  ];

  for (const row of brandsSeed) {
    insertBrand.run(...row);
  }

  const getCategoryId = db.prepare('SELECT id FROM categories WHERE slug = ?');
  const getBrandId = db.prepare('SELECT id FROM brands WHERE slug = ?');

  const insertProduct = db.prepare(`
    INSERT INTO products (
      slug, sku, name, short_description, full_description,
      category_id, brand_id, price_brl, availability, featured,
      image_url, specs_json, in_box_json, warranty_months
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const productsSeed: Array<{
    slug: string;
    sku: string;
    name: string;
    shortDescription: string;
    fullDescription: string;
    categorySlug: string;
    brandSlug: string;
    priceBrl: number | null;
    availability: AvailabilityStatus;
    featured: number;
    imageUrl: string;
    specs: ProductSpec[];
    inBox: string[];
    warrantyMonths: number;
  }> = [
    {
      slug: 'arri-alexa-35-production-set',
      sku: 'VW-CAM-AR35',
      name: 'ARRI ALEXA 35 Kit Produção 19mm',
      shortDescription: 'Sensor Super 35 4.6K com 17 stops de faixa dinâmica e ciência de cor REVEAL.',
      fullDescription:
        'A ARRI ALEXA 35 estabelece o novo padrão para captura cinematográfica digital. Equipada com sensor nativo 4.6K Super 35, entrega 17 stops reais de latitude dinâmica, sensibilidade estendida até EI 6400 e fidelidade tonal incomparável através do pipeline REVEAL Color Science. Kit completo configurado pela engenharia da VideoWeb Center pronto para operação em set.',
      categorySlug: 'cameras-cinema',
      brandSlug: 'arri',
      priceBrl: 548000,
      availability: 'Sob Encomenda',
      featured: 1,
      imageUrl: '/src/assets/images/hero_cinema_stage_1795521923981.jpg',
      specs: [
        {label: 'Sensor', value: 'Super 35 ALEV 4 CMOS (4608 × 3164)'},
        {label: 'Faixa Dinâmica', value: '17 stops certificados'},
        {label: 'Montagem', value: 'ARRI LPL (acompanha adaptador PL-to-LPL)'},
        {label: 'Taxa de Quadros', value: 'Até 120 fps em 4.6K ARRIRAW / ProRes'},
        {label: 'Sensibilidade Nativa', value: 'EI 160 a EI 6400 (Enhanced Sensitivity)'},
        {label: 'Saídas de Vídeo', value: '2× 12G-SDI independentes + VF MVF-2'},
      ],
      inBox: [
        'Corpo ARRI ALEXA 35',
        'Visor Eletrônico MVF-2 OLED',
        'Adaptador B-Mount PDM-1 e gaiola de produção 19mm',
        '2× Cartões Codex Compact Drive 2TB + Leitor USB-C',
        'Case rígido customizado e calibração inicial VideoWeb',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'sony-venice-2-8k-body',
      sku: 'VW-CAM-VN28',
      name: 'Sony VENICE 2 8K Full-Frame',
      shortDescription: 'Câmera cinema Full-Frame 8.6K com Dual Base ISO 800/3200 e ND interno de 8 passos.',
      fullDescription:
        'Projetada para produções cinematográficas de grande escala, a Sony VENICE 2 8K combina um sensor Full-Frame de 8.6K com gravação interna X-OCN sem necessidade de gravador externo. Conta com filtro ND mecânico servo-controlado de 8 posições e sistema modular compatível com extensão Rialto 2.',
      categorySlug: 'cameras-cinema',
      brandSlug: 'sony',
      priceBrl: 412000,
      availability: 'Pronta Entrega',
      featured: 1,
      imageUrl: '/src/assets/images/prod_cinema_camera_1795521924293.jpg',
      specs: [
        {label: 'Sensor', value: 'Full-Frame CMOS 8.6K (36 × 24 mm)'},
        {label: 'Dual Base ISO', value: 'ISO 800 / ISO 3200'},
        {label: 'Faixa Dinâmica', value: '16 stops'},
        {label: 'Gravação Interna', value: 'X-OCN XT / ST / LT e Apple ProRes 4444'},
        {label: 'Filtros ND Internos', value: '8 passos mecânicos (0.3 a 2.4)'},
        {label: 'Montagem', value: 'PL Mount removível sobre E-Mount'},
      ],
      inBox: [
        'Corpo Sony VENICE 2 com bloco sensor 8K',
        'Viewfinder OLED DVF-EL200',
        'Top Handle e placa base VCT',
        '2× Cartões AXS-A1TS66 1TB',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'red-v-raptor-x-8k-vv',
      sku: 'VW-CAM-RVRX',
      name: 'RED V-RAPTOR [X] 8K VV',
      shortDescription: 'Sensor Global Shutter 8K Vista Vision com REDCODE RAW 16-bit e alta velocidade.',
      fullDescription:
        'A primeira câmera cinematográfica Large Format do mundo com obturador global (Global Shutter). Elimina completamente o rolling shutter e artefatos de flash em cenas de ação, efeitos visuais e publicidade de alta velocidade, mantendo até 120 fps em 8K completo.',
      categorySlug: 'cameras-cinema',
      brandSlug: 'red',
      priceBrl: 239000,
      availability: 'Pronta Entrega',
      featured: 0,
      imageUrl: '/src/assets/images/prod_cinema_camera_1795521924293.jpg',
      specs: [
        {label: 'Sensor', value: 'V-RAPTOR [X] 8K VV Global Shutter (40.96 × 21.60 mm)'},
        {label: 'Resolução Máxima', value: '8192 × 4320 até 120 fps'},
        {label: 'Faixa Dinâmica', value: '17+ stops'},
        {label: 'Codec', value: 'REDCODE RAW 16-bit + ProRes simultâneo'},
        {label: 'Montagem', value: 'RF Lock nativa (adaptável para PL)'},
        {label: 'Peso do Corpo', value: '1,82 kg em liga de alumínio'},
      ],
      inBox: [
        'Corpo RED V-RAPTOR [X] 8K VV',
        'Monitor RED Touch 7.0" LCD',
        '2× Cartões RED PRO CFexpress 2TB',
        'Leitor CFexpress USB-C e fonte AC',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'zeiss-supreme-prime-set-5-lentes',
      sku: 'VW-LEN-ZSP5',
      name: 'ZEISS Supreme Prime Set (25, 35, 50, 85, 100mm)',
      shortDescription: 'Conjunto de 5 objetivas cinema T1.5 para sensores Full-Frame com dados eXtended Data.',
      fullDescription:
        'Desenvolvidas para atender às exigências de produções 8K Full-Frame e Large Format, as ZEISS Supreme Prime oferecem abertura ultra-luminosa T1.5, queda de foco orgânica e consistência colorimétrica absoluta em todo o conjunto. Todas as lentes saem colimadas do laboratório óptico da VideoWeb Center.',
      categorySlug: 'lentes-cine',
      brandSlug: 'zeiss',
      priceBrl: 695000,
      availability: 'Sob Encomenda',
      featured: 1,
      imageUrl: '/src/assets/images/prod_cine_lenses_1795521925276.jpg',
      specs: [
        {label: 'Cobertura de Imagem', value: '46.3 mm (Full-Frame / Vista Vision)'},
        {label: 'Abertura Máxima', value: 'T1.5 em todas as distâncias focais'},
        {label: 'Montagem', value: 'PL Mount com contatos Cooke /i e ZEISS eXtended Data'},
        {label: 'Diâmetro Frontal', value: '95 mm uniforme em todo o set'},
        {label: 'Rotação de Foco', value: '300° suaves e padronizados'},
        {label: 'Escala', value: 'Metros ou Pés (configurável)'},
      ],
      inBox: [
        '5× Objetivas ZEISS Supreme Prime (25, 35, 50, 85, 100mm)',
        'Flight Case de transporte personalizado para 6 lentes',
        'Certificado de colimação e projeção MTF',
      ],
      warrantyMonths: 36,
    },
    {
      slug: 'arri-signature-prime-35-50-85-trio',
      sku: 'VW-LEN-ASP3',
      name: 'ARRI Signature Prime Trio LPL (35 / 50 / 85mm)',
      shortDescription: 'Óptica Large Format T1.8 com corpo em magnésio e porta-filtros traseiro magnético.',
      fullDescription:
        'As ARRI Signature Prime entregam renderização de pele natural, bokeh cremoso e controle exemplar de flare sem perder nitidez em 4.6K ou 8K. Construídas em magnésio ultraleve com interface eletrônica LDS-2 integrada ao bocal LPL.',
      categorySlug: 'lentes-cine',
      brandSlug: 'arri',
      priceBrl: 520000,
      availability: 'Sob Encomenda',
      featured: 0,
      imageUrl: '/src/assets/images/prod_cine_lenses_1795521925276.jpg',
      specs: [
        {label: 'Cobertura', value: '46 mm (ARRI Large Format)'},
        {label: 'Abertura', value: 'T1.8 – T22'},
        {label: 'Montagem', value: 'ARRI LPL com metadados LDS-2'},
        {label: 'Diâmetro Frontal', value: '114 mm'},
        {label: 'Recurso Exclusivo', value: 'Suporte magnético traseiro para filtros de textura'},
      ],
      inBox: [
        'ARRI Signature Prime 35mm T1.8',
        'ARRI Signature Prime 50mm T1.8',
        'ARRI Signature Prime 85mm T1.8',
        'Maleta Pelican com espuma cortada a laser',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'canon-sumire-prime-cn-e-50mm',
      sku: 'VW-LEN-CSP50',
      name: 'Canon Sumire Prime CN-E 50mm T1.3 FP X',
      shortDescription: 'Objetiva cine Full-Frame com abertura T1.3 e estética óptica cinematográfica clássica.',
      fullDescription:
        'A linha Canon Sumire Prime combina precisão mecânica moderna com uma assinatura visual sutilmente mais orgânica em aberturas máximas, oferecendo transições suaves de pele e 11 lâminas de íris para desfoque circular.',
      categorySlug: 'lentes-cine',
      brandSlug: 'canon',
      priceBrl: 54900,
      availability: 'Pronta Entrega',
      featured: 0,
      imageUrl: '/src/assets/images/prod_cine_lenses_1795521925276.jpg',
      specs: [
        {label: 'Distância Focal', value: '50mm Full-Frame'},
        {label: 'Abertura', value: 'T1.3'},
        {label: 'Diafragma', value: '11 lâminas arredondadas'},
        {label: 'Montagem', value: 'PL Mount (conversível para EF em centro autorizado)'},
        {label: 'Foco Mínimo', value: '0,5 m'},
      ],
      inBox: ['Lente Canon CN-E 50mm T1.3', 'Tampas frontal e traseira PL', 'Manual e certificado Canon'],
      warrantyMonths: 12,
    },
    {
      slug: 'aputure-electro-storm-cs15-kit',
      sku: 'VW-LGT-CS15',
      name: 'Aputure Electro Storm CS15 RGBACL 1500W',
      shortDescription: 'Refletor LED COB de 1500W com espectro RGBACL completo, CRMX e proteção IP65.',
      fullDescription:
        'Desenvolvido para substituir cabeças HMI e tungstênio de média potência no set, o Electro Storm CS15 entrega saída luminosa extrema com precisão cromática CRI 96+ / SSI 89+ e ajuste de 2000K a 10000K com controle completo de verde/magenta.',
      categorySlug: 'iluminacao-led',
      brandSlug: 'aputure',
      priceBrl: 46800,
      availability: 'Pronta Entrega',
      featured: 1,
      imageUrl: '/src/assets/images/prod_studio_lighting_1795521925302.jpg',
      specs: [
        {label: 'Potência', value: '1500W COB LED RGBACL'},
        {label: 'Temperatura de Cor', value: '2.000K – 10.000K (CCT + HSI + xy)'},
        {label: 'Qualidade Espectral', value: 'CRI ≥ 96 · TLCI ≥ 97 · SSI (D56) 86'},
        {label: 'Encaixe de Modificadores', value: 'Bowens Mount + A-Mount eletrônico reforçado'},
        {label: 'Conectividade', value: 'LumenRadio CRMX, Art-Net, sACN, DMX 5-pin, Sidus Link'},
        {label: 'Proteção Climática', value: 'IP65 à prova de poeira e chuva'},
      ],
      inBox: [
        'Cabeça Aputure Electro Storm CS15',
        'Control Box com suporte V-Lock / AC PowerCON',
        'Refletor Hyper 35° e cabo de cabeça 7,5m',
        'Flight Case com rodízios',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'arri-orbiter-fresnel-studio-kit',
      sku: 'VW-LGT-AORB',
      name: 'ARRI Orbiter Kit Óptico Fresnel & Open Face',
      shortDescription: 'Luminária LED direcional com Spectra six-color light engine e ótica intercambiável.',
      fullDescription:
        'O ARRI Orbiter traz o motor de luz ARRI Spectra de seis cores, capaz de reproduzir cores saturadas e tons brancos com fidelidade absoluta para câmeras de cinema e broadcast. Seu sistema Quick Lighting Mount (QLM) permite alternar entre Fresnel, Open Face, Projection e Domo em segundos.',
      categorySlug: 'iluminacao-led',
      brandSlug: 'arri',
      priceBrl: 62500,
      availability: 'Pronta Entrega',
      featured: 0,
      imageUrl: '/src/assets/images/prod_studio_lighting_1795521925302.jpg',
      specs: [
        {label: 'Motor de Luz', value: 'ARRI Spectra 6-Color (R, G, B, A, C, L)'},
        {label: 'Faixa CCT', value: '2.000K – 20.000K'},
        {label: 'Consumo Nominal', value: '400W (máx. 500W)'},
        {label: 'Controle', value: 'DMX/RDM, Art-Net 4, sACN, CRMX integrado'},
        {label: 'Sistema Operacional', value: 'LiOS (Lighting Operating System)'},
      ],
      inBox: [
        'Luminária ARRI Orbiter preta',
        'Ótica Open Face 15° e acessório Fresnel QLM',
        'Painel de controle destacável + cabo 5m',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'sound-devices-888-mixer-recorder',
      sku: 'VW-AUD-SD888',
      name: 'Sound Devices 888 Gravador-Mixer 16 Canais / 20 Pistas',
      shortDescription: 'Gravador de campo profissional com 8 pré-amplificadores Kashmir, Dante e timecode Ambient.',
      fullDescription:
        'O Sound Devices 888 combina portabilidade para bolsa de som direto com poder de carrinho de áudio profissional. Possui 8 entradas de microfone/linha com pré-amplificadores Kashmir de baixíssimo ruído, 16 canais via Dante AoIP e gravação redundante simultânea em SSD interno de 256GB e dois cartões SD.',
      categorySlug: 'audio-profissional',
      brandSlug: 'sound-devices',
      priceBrl: 58900,
      availability: 'Pronta Entrega',
      featured: 1,
      imageUrl: '/src/assets/images/prod_pro_audio_1795521925833.jpg',
      specs: [
        {label: 'Pistas de Gravação', value: '20 pistas simultâneas (Polyphonic BWF WAV)'},
        {label: 'Pré-amplificadores', value: '8× Kashmir Class-A discretos (-130 dBV EIN)'},
        {label: 'Áudio em Rede', value: '16×16 canais Dante AoIP redundante'},
        {label: 'Timecode', value: 'Gerador Ambient ACN integrado (±0.2 ppm)'},
        {label: 'Armazenamento', value: 'SSD interno 256GB + Dual SDXC'},
      ],
      inBox: [
        'Gravador-Mixer Sound Devices 888',
        'Antena Bluetooth e cabos TA3-XLR balanceados',
        'Fonte externa XL-WPH3 e manual técnico',
      ],
      warrantyMonths: 24,
    },
    {
      slug: 'sony-uwp-d27-dual-wireless-system',
      sku: 'VW-AUD-UWP27',
      name: 'Sony UWP-D27 Sistema Sem Fio Dual Channel UHF',
      shortDescription: 'Receptor portátil de dois canais com sincronização NFC e interface digital MI Shoe.',
      fullDescription:
        'Sistema sem fio UHF de diversidade real em dois canais simultâneos, ideal para documentários, jornalismo e produção corporativa com câmeras Sony Cinema Line e XDCAM.',
      categorySlug: 'audio-profissional',
      brandSlug: 'sony',
      priceBrl: 9800,
      availability: 'Pronta Entrega',
      featured: 0,
      imageUrl: '/src/assets/images/prod_pro_audio_1795521925833.jpg',
      specs: [
        {label: 'Canais', value: '2 receptores UHF independentes em chassi compacto'},
        {label: 'Transmissores Inclusos', value: '2× Bodypack UTX-B40 + 2× Lapela ECM-V1BMP'},
        {label: 'Sincronização', value: 'NFC Sync de um toque'},
        {label: 'Interface', value: 'Analógica XLR + Áudio Digital direto via SMAD-P5'},
      ],
      inBox: [
        'Receptor duplo URX-P41D',
        '2× Transmissores bodypack UTX-B40',
        '2× Microfones de lapela e cabos XLR',
      ],
      warrantyMonths: 12,
    },
    {
      slug: 'blackmagic-atem-constellation-4k-panel',
      sku: 'VW-BRC-ATEM4K',
      name: 'Blackmagic ATEM 4 M/E Constellation 4K + 2 M/E Advanced Panel',
      shortDescription: 'Switcher de produção ao vivo Ultra HD 40×24 12G-SDI com console físico 2 M/E.',
      fullDescription:
        'Solução completa de direção técnica para unidades móveis, emissoras, auditórios corporativos e grandes eventos ao vivo. Oferece 40 entradas 12G-SDI com conversor de padrão em cada entrada, 16 keyers avançados, 4 multiviewers Ultra HD e console hardware 2 M/E com botões OLED e T-bar de precisão.',
      categorySlug: 'broadcast-switchers',
      brandSlug: 'blackmagic',
      priceBrl: 118500,
      availability: 'Pronta Entrega',
      featured: 1,
      imageUrl: '/src/assets/images/prod_broadcast_switcher_1795521926372.jpg',
      specs: [
        {label: 'Entradas de Vídeo', value: '40× 12G-SDI (10-bit com frame sync individual)'},
        {label: 'Saídas Auxiliares', value: '24× 12G-SDI roteáveis'},
        {label: 'Camadas / M/E', value: '4 M/E · 16 ATEM Advanced Chroma Keyers'},
        {label: 'Áudio', value: 'Mixer Fairlight integrado de 156 canais + MADI'},
        {label: 'Superfície de Controle', value: 'ATEM 2 M/E Advanced Panel 20'},
      ],
      inBox: [
        'Switcher ATEM 4 M/E Constellation 4K (2U)',
        'Console ATEM 2 M/E Advanced Panel 20',
        'Cabos Ethernet redundantes e documentação técnica',
      ],
      warrantyMonths: 12,
    },
    {
      slug: 'blackmagic-smartscope-duo-4k-rack',
      sku: 'VW-BRC-SMRT4K',
      name: 'Blackmagic SmartScope Duo 4K – Monitoração Waveform 12G',
      shortDescription: 'Monitor duplo de rack 3U com medição waveform, vectorscope, histograma e parade RGB.',
      fullDescription:
        'Instrumento essencial para controle de engenharia de vídeo e colorização em estúdios e racks portáteis. Exibe sinais independentes em telas LCD de 8 polegadas ou instrumentos de medição em tempo real via 12G-SDI.',
      categorySlug: 'broadcast-switchers',
      brandSlug: 'blackmagic',
      priceBrl: 11400,
      availability: 'Pronta Entrega',
      featured: 0,
      imageUrl: '/src/assets/images/prod_broadcast_switcher_1795521926372.jpg',
      specs: [
        {label: 'Telas', value: '2× LCD 8" independentes em chassi rack 3U'},
        {label: 'Entradas', value: '2× 12G-SDI com Loop Out'},
        {label: 'Escopos Suportados', value: 'Waveform, Vectorscope, RGB/YUV Parade, Histogram, Audio Phase'},
        {label: 'Controle Remoto', value: 'Ethernet RJ45 com Tally integrado'},
      ],
      inBox: ['Unidade SmartScope Duo 4K', 'Fonte de alimentação universal', 'Software utilitário'],
      warrantyMonths: 12,
    },
  ];

  for (const item of productsSeed) {
    const cat = getCategoryId.get(item.categorySlug) as {id: number} | undefined;
    const brand = getBrandId.get(item.brandSlug) as {id: number} | undefined;
    if (!cat || !brand) continue;

    insertProduct.run(
      item.slug,
      item.sku,
      item.name,
      item.shortDescription,
      item.fullDescription,
      cat.id,
      brand.id,
      item.priceBrl,
      item.availability,
      item.featured,
      item.imageUrl,
      JSON.stringify(item.specs),
      JSON.stringify(item.inBox),
      item.warrantyMonths
    );
  }

  // Seed 2 realistic initial quote requests so the admin panel shows populated real data immediately
  const insertQuote = db.prepare(`
    INSERT INTO quotes (
      protocol, customer_name, company_name, document_id, email, phone,
      project_type, timeline, notes, items_json, status, admin_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuote.run(
    'VW-2026-1001',
    'Henrique Vasconcelos',
    'Onda Branca Filmes Ltda.',
    '18.420.391/0001-55',
    'henrique@ondabranca.com.br',
    '(11) 98412-3390',
    'Compra de Equipamento',
    'Imediato (até 15 dias)',
    'Necessitamos de proposta formal com faturamento PJ para pacote Sony VENICE 2 + iluminação COB LED para nova série documental.',
    JSON.stringify([
      {productId: 2, sku: 'VW-CAM-VN28', name: 'Sony VENICE 2 8K Full-Frame', brandName: 'Sony Cinema Line', quantity: 1, priceBrl: 412000},
      {productId: 7, sku: 'VW-LGT-CS15', name: 'Aputure Electro Storm CS15 RGBACL 1500W', brandName: 'Aputure', quantity: 2, priceBrl: 46800},
    ]),
    'Em Análise',
    'Engenharia confirmou disponibilidade em estoque SP. Proposta comercial em revisão.'
  );

  insertQuote.run(
    'VW-2026-1002',
    'Mariana Albuquerque',
    'Rede Horizonte Comunicação',
    '04.912.880/0001-12',
    'engenharia@redehorizonte.tv.br',
    '(21) 99104-7721',
    'Integração de Estúdio',
    '30 a 60 dias',
    'Atualização de switcher principal de jornalismo para 4K 12G-SDI e monitoração waveform em rack 3U.',
    JSON.stringify([
      {productId: 11, sku: 'VW-BRC-ATEM4K', name: 'Blackmagic ATEM 4 M/E Constellation 4K + 2 M/E Advanced Panel', brandName: 'Blackmagic Design', quantity: 1, priceBrl: 118500},
      {productId: 12, sku: 'VW-BRC-SMRT4K', name: 'Blackmagic SmartScope Duo 4K – Monitoração Waveform 12G', brandName: 'Blackmagic Design', quantity: 2, priceBrl: 11400},
    ]),
    'Novo',
    ''
  );
}

seedDatabase();

function mapProductRow(row: Record<string, unknown>): Product {
  let specs: ProductSpec[] = [];
  let inBox: string[] = [];
  try {
    specs = JSON.parse(String(row.specs_json || '[]')) as ProductSpec[];
  } catch {
    specs = [];
  }
  try {
    inBox = JSON.parse(String(row.in_box_json || '[]')) as string[];
  } catch {
    inBox = [];
  }

  return {
    id: Number(row.id),
    slug: String(row.slug),
    sku: String(row.sku),
    name: String(row.name),
    shortDescription: String(row.short_description),
    fullDescription: String(row.full_description),
    categoryId: Number(row.category_id),
    categorySlug: String(row.category_slug),
    categoryName: String(row.category_name),
    brandId: Number(row.brand_id),
    brandSlug: String(row.brand_slug),
    brandName: String(row.brand_name),
    priceBrl: row.price_brl === null || row.price_brl === undefined ? null : Number(row.price_brl),
    availability: String(row.availability) as AvailabilityStatus,
    featured: Boolean(row.featured),
    imageUrl: String(row.image_url),
    specs,
    inBox,
    warrantyMonths: Number(row.warranty_months),
    createdAt: String(row.created_at),
  };
}

export function listCategories(): Category[] {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    imageUrl: String(r.image_url),
    displayOrder: Number(r.display_order),
    productCount: Number(r.product_count ?? 0),
  }));
}

export function createCategory(input: {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder?: number;
}): Category {
  const info = db
    .prepare(
      `INSERT INTO categories (slug, name, description, image_url, display_order)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.slug, input.name, input.description, input.imageUrl, input.displayOrder ?? 10);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return {
    id: Number(created.id),
    slug: String(created.slug),
    name: String(created.name),
    description: String(created.description),
    imageUrl: String(created.image_url),
    displayOrder: Number(created.display_order),
    productCount: 0,
  };
}

export function listBrands(): Brand[] {
  const rows = db
    .prepare(
      `SELECT b.*, COUNT(p.id) AS product_count
       FROM brands b
       LEFT JOIN products p ON p.brand_id = b.id
       GROUP BY b.id
       ORDER BY b.name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    country: String(r.country),
    specialty: String(r.specialty),
    authorizedStatus: String(r.authorized_status),
    description: String(r.description),
    productCount: Number(r.product_count ?? 0),
  }));
}

export function createBrand(input: {
  slug: string;
  name: string;
  country: string;
  specialty: string;
  authorizedStatus: string;
  description: string;
}): Brand {
  const info = db
    .prepare(
      `INSERT INTO brands (slug, name, country, specialty, authorized_status, description)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.slug, input.name, input.country, input.specialty, input.authorizedStatus, input.description);

  const created = db.prepare('SELECT * FROM brands WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return {
    id: Number(created.id),
    slug: String(created.slug),
    name: String(created.name),
    country: String(created.country),
    specialty: String(created.specialty),
    authorizedStatus: String(created.authorized_status),
    description: String(created.description),
    productCount: 0,
  };
}

export interface ProductQueryFilters {
  categoria?: string;
  marca?: string;
  q?: string;
  disponibilidade?: string;
  featured?: boolean;
  sort?: string;
}

export function listProducts(filters: ProductQueryFilters = {}): Product[] {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.categoria && filters.categoria !== 'todas') {
    conditions.push('c.slug = ?');
    params.push(filters.categoria);
  }
  if (filters.marca && filters.marca !== 'todas') {
    conditions.push('b.slug = ?');
    params.push(filters.marca);
  }
  if (filters.disponibilidade && filters.disponibilidade !== 'todos') {
    conditions.push('p.availability = ?');
    params.push(filters.disponibilidade);
  }
  if (filters.featured) {
    conditions.push('p.featured = 1');
  }
  if (filters.q && filters.q.trim().length > 0) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ? OR b.name LIKE ? OR c.name LIKE ?)');
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'ORDER BY p.featured DESC, p.id ASC';
  if (filters.sort === 'price_asc') {
    orderBy = 'ORDER BY CASE WHEN p.price_brl IS NULL THEN 1 ELSE 0 END, p.price_brl ASC';
  } else if (filters.sort === 'price_desc') {
    orderBy = 'ORDER BY CASE WHEN p.price_brl IS NULL THEN 1 ELSE 0 END, p.price_brl DESC';
  } else if (filters.sort === 'name_asc') {
    orderBy = 'ORDER BY p.name ASC';
  }

  const sql = `
    SELECT
      p.*,
      c.slug AS category_slug,
      c.name AS category_name,
      b.slug AS brand_slug,
      b.name AS brand_name
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    INNER JOIN brands b ON b.id = p.brand_id
    ${whereClause}
    ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(mapProductRow);
}

export function getProductBySlug(slug: string): {product: Product; related: Product[]} | null {
  const row = db
    .prepare(
      `SELECT
         p.*,
         c.slug AS category_slug,
         c.name AS category_name,
         b.slug AS brand_slug,
         b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.slug = ?`
    )
    .get(slug) as Record<string, unknown> | undefined;

  if (!row) return null;

  const product = mapProductRow(row);
  const relatedRows = db
    .prepare(
      `SELECT
         p.*,
         c.slug AS category_slug,
         c.name AS category_name,
         b.slug AS brand_slug,
         b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.category_id = ? AND p.id != ?
       ORDER BY p.featured DESC, p.id ASC
       LIMIT 3`
    )
    .all(product.categoryId, product.id) as Array<Record<string, unknown>>;

  return {
    product,
    related: relatedRows.map(mapProductRow),
  };
}

export interface UpsertProductInput {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: number;
  brandId: number;
  priceBrl: number | null;
  availability: AvailabilityStatus;
  featured: boolean;
  imageUrl: string;
  specs: ProductSpec[];
  inBox: string[];
  warrantyMonths: number;
}

export function createProduct(input: UpsertProductInput): Product {
  const info = db
    .prepare(
      `INSERT INTO products (
        slug, sku, name, short_description, full_description,
        category_id, brand_id, price_brl, availability, featured,
        image_url, specs_json, in_box_json, warranty_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.slug,
      input.sku,
      input.name,
      input.shortDescription,
      input.fullDescription,
      input.categoryId,
      input.brandId,
      input.priceBrl,
      input.availability,
      input.featured ? 1 : 0,
      input.imageUrl,
      JSON.stringify(input.specs),
      JSON.stringify(input.inBox),
      input.warrantyMonths
    );

  const created = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, b.slug AS brand_slug, b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.id = ?`
    )
    .get(info.lastInsertRowid) as Record<string, unknown>;

  return mapProductRow(created);
}

export function updateProduct(id: number, input: UpsertProductInput): Product | null {
  const result = db
    .prepare(
      `UPDATE products SET
        slug = ?, sku = ?, name = ?, short_description = ?, full_description = ?,
        category_id = ?, brand_id = ?, price_brl = ?, availability = ?, featured = ?,
        image_url = ?, specs_json = ?, in_box_json = ?, warranty_months = ?
      WHERE id = ?`
    )
    .run(
      input.slug,
      input.sku,
      input.name,
      input.shortDescription,
      input.fullDescription,
      input.categoryId,
      input.brandId,
      input.priceBrl,
      input.availability,
      input.featured ? 1 : 0,
      input.imageUrl,
      JSON.stringify(input.specs),
      JSON.stringify(input.inBox),
      input.warrantyMonths,
      id
    );

  if (result.changes === 0) return null;

  const updated = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, b.slug AS brand_slug, b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapProductRow(updated);
}

export function deleteProduct(id: number): boolean {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createQuote(input: {
  customerName: string;
  companyName: string;
  documentId: string;
  email: string;
  phone: string;
  projectType: string;
  timeline: string;
  notes: string;
  items: QuoteItem[];
}): QuoteRequest {
  const year = new Date().getFullYear();
  const count = (db.prepare('SELECT COUNT(*) AS count FROM quotes').get() as {count: number}).count;
  const randomSuffix = Math.floor(1000 + count + (Date.now() % 900));
  const protocol = `VW-${year}-${randomSuffix}`;

  const info = db
    .prepare(
      `INSERT INTO quotes (
        protocol, customer_name, company_name, document_id, email, phone,
        project_type, timeline, notes, items_json, status, admin_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Novo', '')`
    )
    .run(
      protocol,
      input.customerName,
      input.companyName,
      input.documentId,
      input.email,
      input.phone,
      input.projectType,
      input.timeline,
      input.notes,
      JSON.stringify(input.items)
    );

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return mapQuoteRow(created);
}

function mapQuoteRow(row: Record<string, unknown>): QuoteRequest {
  let items: QuoteItem[] = [];
  try {
    items = JSON.parse(String(row.items_json || '[]')) as QuoteItem[];
  } catch {
    items = [];
  }
  return {
    id: Number(row.id),
    protocol: String(row.protocol),
    customerName: String(row.customer_name),
    companyName: String(row.company_name),
    documentId: String(row.document_id),
    email: String(row.email),
    phone: String(row.phone),
    projectType: String(row.project_type),
    timeline: String(row.timeline),
    notes: String(row.notes),
    items,
    status: String(row.status) as QuoteStatus,
    adminNotes: String(row.admin_notes),
    createdAt: String(row.created_at),
  };
}

export function listQuotes(): QuoteRequest[] {
  const rows = db.prepare('SELECT * FROM quotes ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  return rows.map(mapQuoteRow);
}

export function updateQuoteStatus(id: number, status: QuoteStatus, adminNotes: string): QuoteRequest | null {
  const result = db
    .prepare('UPDATE quotes SET status = ?, admin_notes = ? WHERE id = ?')
    .run(status, adminNotes, id);
  if (result.changes === 0) return null;
  const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as Record<string, unknown>;
  return mapQuoteRow(row);
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get(key) as {value: string} | undefined;
  return row ? row.value : null;
}

export function setSettingIfAbsent(key: string, value: string): boolean {
  const result = db
    .prepare('INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)')
    .run(key, value);
  return result.changes > 0;
}

export function getDatabaseStatus(): DatabaseStatusInfo {
  const products = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as {c: number}).c;
  const inStockProducts = (
    db.prepare("SELECT COUNT(*) AS c FROM products WHERE availability = 'Pronta Entrega'").get() as {c: number}
  ).c;
  const categories = (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as {c: number}).c;
  const brands = (db.prepare('SELECT COUNT(*) AS c FROM brands').get() as {c: number}).c;
  const totalQuotes = (db.prepare('SELECT COUNT(*) AS c FROM quotes').get() as {c: number}).c;
  const pendingQuotes = (
    db.prepare("SELECT COUNT(*) AS c FROM quotes WHERE status IN ('Novo', 'Em Análise')").get() as {c: number}
  ).c;

  return {
    engine: 'SQLite WAL (better-sqlite3)',
    storagePath: 'data/videoweb.db',
    externalDatabaseConfigured: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0),
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0),
    crmWebhookConfigured: Boolean(process.env.CRM_WEBHOOK_URL && process.env.CRM_WEBHOOK_URL.trim().length > 0),
    seo: {
      searchConsoleConfigured: Boolean(
        process.env.GOOGLE_SITE_VERIFICATION && process.env.GOOGLE_SITE_VERIFICATION.trim().length > 0
      ),
      ga4Configured: /^G-[A-Z0-9]+$/i.test((process.env.GA4_MEASUREMENT_ID || '').trim()),
      gtmConfigured: /^GTM-[A-Z0-9]+$/i.test((process.env.GTM_ID || '').trim()),
      sitemapPath: '/sitemap.xml',
      robotsPath: '/robots.txt',
    },
    counts: {
      products,
      inStockProducts,
      categories,
      brands,
      totalQuotes,
      pendingQuotes,
    },
  };
}
