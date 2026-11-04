import fs from "node:fs";
import path from "node:path";
import { LEAD_MARKER } from "./lead";
import type { AvatarState } from "./avatarState";
import { mergeMiraProfile, type AvatarProfileConfig } from "./avatarProfile";

export type CommercialItem = {
  id: string;
  label: string;
  value: string;
  allowMention: boolean;
  fallbackInstruction: string;
};

export type ProductCategoryKnowledge = {
  id: string;
  name: string;
  items: string;
  heroIngredients: string;
  packagingOptions: string;
  moqNote: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: "faq" | "objection";
};

export type PronunciationRule = {
  id: string;
  term: string;
  phonetic: string;
  enabled: boolean;
};

export type ExtraKnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  enabled: boolean;
};

export type RaraConfig = {
  updatedAt: string;
  visual: {
    mode: "clips" | "placeholder";
    clips: Record<AvatarState, string[]>;
    cameoFeather: number; // 5 - 35 (%)
    despillGreen: number; // 50 - 95 (%)
    dissolveSpeedMs: number; // 150 - 800 (ms)
    avatarScale: number; // 0.9 - 1.35
    bgTheme: "soft-rose" | "warm-cream" | "clinical- pearl" | "emerald-lab";
    greeting: string;
    quickChips: string[];
    topBadge: string;
    factOrbs: { big: string; small: string; pos: "left-top" | "left-bottom" | "right-top" | "right-bottom" }[];
  };
  llm: {
    provider: "9router";
    baseUrl: string;
    apiKey: string;
    model: string;
    fallbackModel: string;
    temperature: number;
    maxTokens: number;
    targetSentences: string; // e.g., "2–4 kalimat"
    maxQuestionsPerTurn: number;
  };
  voice: {
    provider: "elevenlabs";
    elevenlabsApiKey: string;
    voiceId: string;
    modelId: "eleven_flash_v2_5" | "eleven_turbo_v2_5" | "eleven_multilingual_v2";
    stability: number; // 0 - 100
    similarityBoost: number; // 0 - 100
    styleExaggeration: number; // 0 - 100
    useSpeakerBoost: boolean;
    speakingSpeed: number; // 0.7 - 1.2 (ElevenLabs range)
    sttLang: "id-ID" | "en-US";
    sampleTestText: string;
    pronunciationDictionary: PronunciationRule[];
  };
  knowledge: {
    activeMode: "structured" | "markdown";
    sourceUrl: string;
    lastSyncedAt: string;
    company: {
      legalName: string;
      parentCompany: string;
      brandName: string;
      establishedYear: string;
      tagline: string;
      positioning: string;
      certifications: string[];
      address: string;
      addressLandmark: string;
      whatsappCs: string;
      officePhone: string;
      email: string;
      operatingHours: string;
    };
    commercial: CommercialItem[];
    categories: ProductCategoryKnowledge[];
    services: { title: string; description: string }[];
    sixSteps: { step: number; title: string; description: string }[];
    whyHaraka: { title: string; description: string }[];
    faqs: FaqItem[];
    portfolioBrands: string[];
    extraDocs: ExtraKnowledgeDoc[];
    rawMarkdown: string;
  };
  persona: {
    avatarName: string;
    roleTitle: string;
    visitorHonorific: string; // "Kak", "Bapak/Ibu", "Kakak"
    toneOfVoice: string;
    languages: string;
    customSystemPromptOverride: string;
    useCustomPromptOverride: boolean;
  };
  guardrails: {
    strictBpomMode: boolean;
    noFabricatedNumbers: boolean;
    noMedicalClaims: boolean;
    noCompetitorBash: boolean;
    mandatoryCpkbEducation: boolean;
    forbiddenClaims: string[];
    allowedTopicsNote: string;
  };
  leadRules: {
    triggerAfterTurns: number;
    triggerOnCommercialIntent: boolean;
    requiredQualificationFields: string[];
    whatsappCsNumber: string;
    whatsappPrefillTemplate: string;
    notifyEmailTo: string;
    notifyEmailFrom: string;
    vpsWaWebhookUrl: string;
    vpsWaWebhookSecret: string;
    maxUserTurnsPerSession: number;
    ipRateLimitPerMinute: number;
    sessionLimitMessage: string;
  };
  /** Mira's own persona, voice and greeting; the top-level ones are Rara's. Always filled by getRaraConfig. */
  mira?: AvatarProfileConfig;
};

export const DEFAULT_RARA_CONFIG: RaraConfig = {
  updatedAt: new Date().toISOString(),
  visual: {
    mode: "clips",
    clips: {
      idle: ["idle-1.mp4", "idle-2.mp4"],
      listening: ["listening-1.mp4"],
      thinking: ["thinking-1.mp4"],
      speaking: ["speaking-1.mp4", "speaking-2.mp4", "speaking-3.mp4"],
    },
    cameoFeather: 15,
    despillGreen: 78,
    dissolveSpeedMs: 400,
    avatarScale: 1.22,
    bgTheme: "soft-rose",
    greeting: "Halo Kak, aku Rara dari PT Haraka Erfi. Ceritakan produk kosmetik impianmu ya!",
    quickChips: [
      "Berapa MOQ maklon?",
      "Bisa urus BPOM & Halal?",
      "Berapa lama proses sampai siap jual?",
      "Apa saja kategori produknya?",
    ],
    topBadge: "CPKB · BPOM · HALAL · ISO 22716",
    factOrbs: [
      { big: "18+ Brand", small: "Mitra Portofolio", pos: "left-top" },
      { big: "MOQ 1.000 pcs", small: "Fleksibel untuk UMKM", pos: "left-bottom" },
      { big: "6 Tahap", small: "Ide → Siap Jual (±3 Bulan)", pos: "right-top" },
      { big: "Sejak 2015", small: "Pabrik CPKB Bekasi", pos: "right-bottom" },
    ],
  },
  llm: {
    provider: "9router",
    baseUrl: process.env.LLM_BASE_URL || "https://router-okx.akbaralatas.com/v1",
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "",
    fallbackModel: process.env.LLM_FALLBACK_MODEL || "",
    temperature: 0.45,
    maxTokens: 320,
    targetSentences: "2–4 kalimat yang mengalir alami saat dibacakan suara",
    maxQuestionsPerTurn: 1,
  },
  voice: {
    provider: "elevenlabs",
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
    voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    modelId: (process.env.ELEVENLABS_MODEL as RaraConfig["voice"]["modelId"]) || "eleven_flash_v2_5",
    stability: 75,
    similarityBoost: 85,
    styleExaggeration: 20,
    useSpeakerBoost: true,
    speakingSpeed: 1.05,
    sttLang: "id-ID",
    sampleTestText:
      "Halo Kak! Aku Rara dari PT Haraka Erfi. Mau mulai bikin brand skincare sendiri dengan MOQ seribu pcs dan izin BPOM resmi? Ceritakan konsep produk impian Kakak ya!",
    pronunciationDictionary: [
      { id: "pr-1", term: "BPOM", phonetic: "Be-Pom", enabled: true },
      { id: "pr-2", term: "CPKB", phonetic: "C P K B", enabled: true },
      { id: "pr-3", term: "MOQ", phonetic: "M O Q", enabled: true },
      { id: "pr-4", term: "HAKI", phonetic: "Ha-Ki", enabled: true },
      { id: "pr-5", term: "PA++++", phonetic: "P A plus empat", enabled: true },
      { id: "pr-6", term: "R&D", phonetic: "R and D", enabled: true },
      { id: "pr-7", term: "UMKM", phonetic: "U M K M", enabled: true },
    ],
  },
  knowledge: {
    activeMode: "structured",
    sourceUrl: "https://harakaerfi.com/",
    lastSyncedAt: new Date().toISOString(),
    company: {
      legalName: "PT Haraka Erfi (PT Haraka Erfi Kosmetindo Abadi)",
      parentCompany: "PT Haraka Multifaedah (Hakara Manufacturing)",
      brandName: "Haraka Erfi",
      establishedYear: "2015",
      tagline: "Bangun Brand Kosmetikmu. Kami Urus Selebihnya. — Partner Maklon dari Ide Hingga Produk Siap Jual.",
      positioning:
        "Bukan sekadar pabrik maklon produksi, melainkan strategic partner dan konseptor produk dari hulu ke hilir (end-to-end): mulai dari riset bahan aktif di laboratorium R&D, perancangan formula khusus/custom, desain logo & kemasan, pengurusan legalitas izin edar, hingga manufaktur skala penuh.",
      certifications: ["CPKB (Cara Pembuatan Kosmetik yang Baik) BPOM RI", "Notifikasi Resmi BPOM", "Sertifikasi Halal MUI / BPJPH", "ISO 22716", "Pendaftaran Merek (HAKI)"],
      address: "Jl. Raya Cimatis No. 80, Kel. Jatikarya, Kec. Jatisampurna, Bekasi, Jawa Barat",
      addressLandmark: "Belakang Plaza Cibubur, dekat Citra Grand",
      whatsappCs: "0831-3703-0656",
      officePhone: "021-39733633",
      email: "info@harakamultifaedah.co.id",
      operatingHours: "Senin – Jumat (08.00 – 17.00 WIB), Sabtu (08.00 – 14.00 WIB)",
    },
    commercial: [
      {
        id: "com-moq",
        label: "MOQ (Jumlah Pemesanan Minimum)",
        value:
          "MOQ standar mulai dari 1.000 pcs (populer & fleksibel untuk UMKM/perintis brand baru). Tersedia opsi simulasi batch awal 500 pcs untuk pemula tertentu dan 5.000+ pcs untuk skala besar dengan diskon volume bertahap.",
        allowMention: true,
        fallbackInstruction: "Sebutkan MOQ fleksibel mulai 1.000 pcs untuk mempermudah brand baru.",
      },
      {
        id: "com-timeline",
        label: "Estimasi Durasi Maklon (Sampel hingga Siap Jual)",
        value:
          "Estimasi total dari ACC sampel hingga produk 100% legal dan siap jual kurang lebih 3 bulan (mencakup pendaftaran BPOM, finalisasi kemasan, dan produksi massal ±30 hari kerja setelah izin terbit).",
        allowMention: true,
        fallbackInstruction: "Sebutkan estimasi total sekitar 3 bulan dari ACC sampel hingga siap dipasarkan.",
      },
      {
        id: "com-sample",
        label: "Kebijakan Sampel R&D & Revisi Formula",
        value:
          "Tim R&D membuatkan sampel formula custom sesuai bahan aktif, tekstur, warna, dan aroma yang diinginkan. Sampel dapat direvisi hingga 100% cocok dan disetujui klien sebelum masuk lini produksi massal.",
        allowMention: true,
        fallbackInstruction: "Jelaskan sampel bisa direvisi sampai cocok, untuk rincian biaya sampel arahkan ke tim sales.",
      },
      {
        id: "com-price",
        label: "Kisaran Harga Produksi / HPP per Pcs",
        value:
          "Harga per pcs dan total paket dihitung secara kustom oleh tim R&D dan Sales sesuai jenis bahan aktif, konsentrasi formula, volume kemasan, dan kuantitas batch.",
        allowMention: false,
        fallbackInstruction:
          "Jangan mengarang angka rupiah harga/HPP. Jelaskan bahwa estimasi biaya akurat dihitung langsung oleh tim R&D sesuai bahan aktif dan kemasan, lalu tawarkan konsultasi gratis dengan tim sales.",
      },
      {
        id: "com-legal-cost",
        label: "Biaya & Layanan Legalitas (BPOM, Halal, HAKI)",
        value:
          "Notifikasi resmi BPOM wajib & termasuk dalam pendampingan. Sertifikasi Halal MUI/BPJPH dan Pendaftaran Merek (HAKI) serta desain logo & kemasan premium dapat disertakan dalam paket one-stop service.",
        allowMention: true,
        fallbackInstruction: "Sebutkan BPOM, Halal, dan HAKI diurus penuh oleh tim regulasi Haraka Erfi; rincian biayanya dihitungkan tim sales.",
      },
    ],
    categories: [
      {
        id: "cat-skincare",
        name: "Skincare",
        items: "Facial Cleanser, Toner, Face Serum, Moisturizer Cream/Gel, Sunscreen / Sunblock, Face Mask (Wash-off / Sheet / Clay), Essence",
        heroIngredients: "Niacinamide, Multi-Ceramide, Encapsulated Retinol, Centella Asiatica (Cica), Hyaluronic Acid, Peptide, Alpha Arbutin, Vitamin C, UV Filter SPF 50 PA++++",
        packagingOptions: "Botol Dropper Pipet, Airless Pump, Jar Akrilik/Kaca, Tube Kosmetik, Botol Spray/Toner (10ml – 100ml)",
        moqNote: "MOQ mulai 1.000 pcs (opsi pemula 500 pcs tersedia sesuai konsultasi)",
      },
      {
        id: "cat-bodycare",
        name: "Bodycare",
        items: "Body Lotion, Body Scrub / Lulur, Hand Cream, Body Wash / Shower Gel, Body Butter, Body Serum",
        heroIngredients: "Glutathione, Niacinamide, Shea Butter, Kojic Acid, AHA/BHA Body Exfoliant, Vitamin E, Botanical Extracts",
        packagingOptions: "Botol Pump Lotion, Jar Scrub, Tube Hand Cream, Pouch Refill (100ml – 500ml)",
        moqNote: "MOQ mulai 1.000 pcs",
      },
      {
        id: "cat-parfume",
        name: "Parfum (Perfume & Fragrance)",
        items: "Eau de Parfum (EDP), Eau de Toilette (EDT), Body Mist, Cologne, Scented Spray / Hair & Body Fragrance",
        heroIngredients: "Fine Fragrance Oils Impor (Floral, Woody, Oriental, Fresh Citrus, Gourmand, Oud, Musk), Fixative Long-Lasting",
        packagingOptions: "Botol Kaca Crimp/Spray Eksklusif, Travel Size Pocket Spray, Roll-on, Box Hardcover Custom (15ml – 100ml)",
        moqNote: "MOQ mulai 1.000 pcs",
      },
      {
        id: "cat-haircare",
        name: "Haircare",
        items: "Shampoo, Conditioner, Hair Serum, Hair Mask / Creambath, Hair Tonic, Hair Oil, Hair Vitamin Mist",
        heroIngredients: "Biotin, Ginseng Extract, Keratin, Argan Oil, Candlenut (Kemiri), Rosemary Oil, Panthenol, Anti-Dandruff Actives",
        packagingOptions: "Botol Pump/Flip-top Shampoo, Jar Hair Mask, Botol Tonic Spray/Dropper (30ml – 500ml)",
        moqNote: "MOQ mulai 1.000 pcs",
      },
    ],
    services: [
      {
        title: "Pengembangan Formula & Sampel (Custom Formula & Private Label)",
        description:
          "Pengembangan formulasi sampel oleh tim R&D profesional disesuaikan dengan bahan aktif, aroma, dan tekstur keinginan klien, atau pilih formula ready-made agar proses lebih cepat.",
      },
      {
        title: "Konsep & Desain Produk A–Z",
        description:
          "Layanan perancangan desain logo, kemasan produk, dan konsep branding eksklusif dari A sampai Z agar brand tampil menonjol di pasar.",
      },
      {
        title: "Solusi Kemasan & Sourcing",
        description:
          "Konsultasi desain packaging dan sourcing wadah kemasan berkualitas tinggi sesuai konsep dan target harga produk.",
      },
      {
        title: "Manufaktur CPKB, ISO 22716 & QC Ketat",
        description:
          "Produksi massal di pabrik modern berstandar CPKB BPOM RI dan ISO 22716 dengan mesin otomatis canggih serta Quality Control ketat di setiap tahap.",
      },
    ],
    sixSteps: [
      {
        step: 1,
        title: "Konsultasi Ide & Konsep Produk",
        description: "Diskusikan visi brand, target pasar, bahan aktif utama, serta target harga jual produk impian bersama tim representatif Haraka Erfi.",
      },
      {
        step: 2,
        title: "Pembuatan Formula & Sampel R&D",
        description: "Tim R&D berpengalaman mengembangkan formula khusus sesuai permintaan dan mengirimkan sampel untuk dievaluasi klien.",
      },
      {
        step: 3,
        title: "Approval Formula Final",
        description: "Revisi sampel jika diperlukan hingga cocok 100%. Setelah disetujui, dilakukan finalisasi spesifikasi bahan dan kemasan.",
      },
      {
        step: 4,
        title: "Registrasi Legalitas (BPOM, Halal, HAKI)",
        description: "Seluruh kelengkapan dokumen notifikasi BPOM, sertifikasi Halal MUI/BPJPH, dan pendaftaran merek HAKI diurus oleh tim regulasi.",
      },
      {
        step: 5,
        title: "Produksi Skala Penuh (Standar CPKB)",
        description: "Setelah izin edar terbit, pabrik memulai produksi massal menggunakan mesin otomatis berstandar CPKB.",
      },
      {
        step: 6,
        title: "Quality Control & Pengiriman",
        description: "Produk dikemas rapi melalui QC ketat, lalu dikirim aman ke gudang klien dan siap dijual ke pasar.",
      },
    ],
    whyHaraka: [
      { title: "Pelayanan Responsif & Cepat", description: "Akses cepat memantau perkembangan sampel dan jadwal produksi tanpa waktu tunggu lama." },
      { title: "Kustomisasi Formula Bebas", description: "Bebas menentukan bahan aktif, tekstur, aroma, warna, hingga bentuk kemasan didampingi R&D ahli." },
      { title: "MOQ Fleksibel untuk UMKM", description: "Minimum order mulai 1.000 pcs, dirancang untuk mempermudah perintis brand baru tanpa beban modal besar." },
      { title: "Benefit Exclusive Partner", description: "Prioritas antrean produksi, diskon volume bertahap, dan konsultasi bisnis berkelanjutan." },
      { title: "Standar CPKB, BPOM & ISO 22716", description: "Jaminan kualitas produk aman dan tersertifikasi resmi sesuai regulasi BPOM RI." },
      { title: "Pendampingan Bisnis A–Z", description: "Hemat biaya dan efisien karena seluruh kebutuhan R&D, desain, kemasan, dan sertifikasi tersedia satu pintu." },
    ],
    faqs: [
      {
        id: "faq-1",
        category: "faq",
        question: "Berapa minimal order (MOQ) maklon di PT Haraka Erfi?",
        answer:
          "Jumlah Minimum Pemesanan (MOQ) di Haraka Erfi sangat fleksibel, mulai dari 1.000 pcs (serta tersedia simulasi opsi pemula 500 pcs atau skala besar 5.000+ pcs). Fasilitas ini mempermudah perintis brand baru dan UMKM meluncurkan produk tanpa beban modal awal yang besar.",
      },
      {
        id: "faq-2",
        category: "faq",
        question: "Berapa lama estimasi total dari pembuatan sampel hingga produk siap jual?",
        answer:
          "Estimasi total dari ACC sampel hingga produk siap jual kurang lebih 3 bulan. Setelah sampel disetujui, produk masuk proses pendaftaran BPOM, finalisasi desain kemasan, dan produksi massal (±30 hari kerja) sehingga produk 100% legal dan siap dipasarkan.",
      },
      {
        id: "faq-3",
        category: "faq",
        question: "Apakah izin edar BPOM dan sertifikasi Halal diurus sepenuhnya?",
        answer:
          "Ya, betul! Tim legalitas kami mendampingi seluruh proses pendaftaran notifikasi resmi BPOM, pengurusan sertifikasi Halal MUI/BPJPH, serta pendaftaran merek (HAKI) sehingga produk 100% legal dan aman dijual bebas.",
      },
      {
        id: "faq-4",
        category: "faq",
        question: "Bagaimana jika saya belum punya formula atau desain kemasan sama sekali?",
        answer:
          "Tenang saja! Haraka Erfi adalah partner konseptor A sampai Z. Tim R&D kami membuatkan sampel formula custom sesuai bahan aktif impian Anda, dan tim desainer kami merancang konsep logo serta wadah kemasan yang menarik di pasaran.",
      },
      {
        id: "faq-5",
        category: "faq",
        question: "Apakah sampel produk bisa direvisi jika aromanya atau teksturnya belum cocok?",
        answer:
          "Tentu bisa! Tim R&D kami memberikan kesempatan revisi sampel hingga tekstur, aroma, warna, dan khasiat formula 100% cocok dengan keinginan dan persetujuan Anda sebelum masuk lini produksi massal.",
      },
      {
        id: "obj-1",
        category: "objection",
        question: "Takut modal kemahalan atau belum tahu cara hitung biaya awal",
        answer:
          "Jelaskan bahwa maklon jauh lebih hemat biaya dibanding membangun fasilitas sendiri karena semua sudah satu pintu (R&D, desain, kemasan, legalitas) dengan MOQ mulai 1.000 pcs. Tawarkan simulasi estimasi gratis sesuai budget calon klien bersama tim sales.",
      },
      {
        id: "obj-2",
        category: "objection",
        question: "Khawatir proses pabrik lama atau stok telat saat produk viral",
        answer:
          "Tekankan pelayanan responsif Haraka Erfi, fasilitas mesin otomatis berstandar CPKB & ISO 22716 di Bekasi, serta program Benefit Exclusive Partner yang memberikan prioritas antrean produksi dan diskon volume bertahap.",
      },
    ],
    portfolioBrands: [
      "Narsis",
      "Versident",
      "Pherini",
      "Nature Reaction",
      "Hassya Premiere",
      "Eloni",
      "Umyka Beauty Glow",
      "Djunichol Skincare",
      "Art Glow",
      "Barmen",
      "Thipank",
      "Cloris Men",
      "Sakura Kanaai",
      "Ahel Skincare",
      "Zammit",
      "EpelSkin",
      "Ascha Beauty",
      "D'Gekira Parfume",
    ],
    extraDocs: [],
    rawMarkdown: "",
  },
  persona: {
    avatarName: "Rara",
    roleTitle: "AI Maklon & Formula Consultant PT Haraka Erfi",
    visitorHonorific: "Kak",
    toneOfVoice:
      "Bahasa Indonesia yang ramah, hangat, antusias, dan profesional. Kalimat ringkas dan enak didengar saat diucapkan dengan suara (tanpa daftar bernomor, tanpa simbol markdown bintang/pagar, tanpa emoji, dan tanpa URL mentah).",
    languages: "Bahasa Indonesia (utama), dapat merespons Bahasa Inggris dasar bila diajak bicara dalam Bahasa Inggris.",
    customSystemPromptOverride: "",
    useCustomPromptOverride: false,
  },
  guardrails: {
    strictBpomMode: true,
    noFabricatedNumbers: true,
    noMedicalClaims: true,
    noCompetitorBash: true,
    mandatoryCpkbEducation: true,
    forbiddenClaims: [
      "Putih permanen dalam 3 hari / instan",
      "Menyembuhkan penyakit kulit medis / eksim / infeksi (klaim obat)",
      "Menghilangkan bopeng permanen 100% tanpa tindakan klinis",
      "Bebas bahan kimia 100% (gunakan istilah: teruji aman & berstandar BPOM)",
      "Menjamin pasti balik modal dalam X hari",
    ],
    allowedTopicsNote:
      "Hanya melayani topik seputar maklon kosmetik, formulasi skincare/bodycare/haircare/parfum, kemasan, legalitas BPOM/Halal/HAKI, dan prosedur kerja sama di PT Haraka Erfi.",
  },
  leadRules: {
    triggerAfterTurns: 3,
    triggerOnCommercialIntent: true,
    requiredQualificationFields: [
      "Jenis / kategori produk yang ingin dibuat",
      "Perkiraan jumlah produksi (MOQ)",
      "Kisaran budget modal awal",
      "Target waktu launching",
    ],
    whatsappCsNumber: "0831-3703-0656",
    whatsappPrefillTemplate:
      "Halo Admin PT Haraka Erfi, saya sudah berkonsultasi dengan Rara mengenai rencana maklon produk kosmetik. Mohon info estimasi biaya dan sampel R&D.",
    notifyEmailTo: process.env.LEAD_EMAIL_TO || "info@harakamultifaedah.co.id",
    notifyEmailFrom: process.env.LEAD_EMAIL_FROM || "rara@harakaerfi.com",
    vpsWaWebhookUrl: "",
    vpsWaWebhookSecret: "",
    maxUserTurnsPerSession: 20,
    ipRateLimitPerMinute: 30,
    sessionLimitMessage: "Sesi demo ini sudah mencapai batas. Silakan lanjut via WhatsApp 0831-3703-0656.",
  },
};

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "rara-config.json");
// API keys saved from the dashboard live here (gitignored) instead of the committed rara-config.json
const SECRETS_PATH = path.join(DATA_DIR, "rara-secrets.json");

type RaraSecrets = { llmApiKey: string; elevenlabsApiKey: string; vpsWaWebhookSecret: string };

function readSecrets(): RaraSecrets {
  try {
    if (fs.existsSync(SECRETS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(SECRETS_PATH, "utf8"));
      return {
        llmApiKey: String(raw.llmApiKey || ""),
        elevenlabsApiKey: String(raw.elevenlabsApiKey || ""),
        vpsWaWebhookSecret: String(raw.vpsWaWebhookSecret || ""),
      };
    }
  } catch (err) {
    console.error("Error reading rara-secrets.json:", err);
  }
  return { llmApiKey: "", elevenlabsApiKey: "", vpsWaWebhookSecret: "" };
}
// Windows can briefly lock a file that was just written (antivirus, editors, file watchers) and fail the open
// with EBUSY/EPERM/UNKNOWN; retry a few times so one unlucky moment does not lose a dashboard save.
function writeFileRetry(file: string, data: string) {
  const transient = new Set(["EBUSY", "EPERM", "EACCES", "UNKNOWN"]);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(file, data, "utf8");
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code ?? "";
      if (attempt >= 5 || !transient.has(code)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80 * (attempt + 1));
    }
  }
}

const KNOWLEDGE_MD_PATH = path.join(process.cwd(), "lib", "knowledge", "haraka.md");
const MANIFEST_PATH = path.join(process.cwd(), "public", "avatar", "manifest.json");

export function compileKnowledgeMarkdown(k: RaraConfig["knowledge"]): string {
  if (k.activeMode === "markdown" && k.rawMarkdown.trim().length > 0) {
    return k.rawMarkdown.trim();
  }

  const c = k.company;
  const lines: string[] = [
    `# Pengetahuan Resmi ${c.brandName}`,
    ``,
    `Sumber resmi: ${k.sourceUrl} (Sinkronisasi terakhir: ${new Date(k.lastSyncedAt || Date.now()).toLocaleDateString("id-ID")})`,
    ``,
    `## 1. Profil Perusahaan & Identitas`,
    `- Nama resmi: ${c.legalName}, unit usaha manufaktur kosmetik terintegrasi di bawah naungan ${c.parentCompany}.`,
    `- Berpengalaman di industri kosmetik sejak tahun ${c.establishedYear}.`,
    `- Tagline: "${c.tagline}"`,
    `- Positioning: ${c.positioning}`,
    `- Sertifikasi & Standar Pabrik: ${c.certifications.join(", ")}.`,
    `- Alamat Pabrik & Head Office: ${c.address} (${c.addressLandmark}).`,
    `- Kontak Resmi: WhatsApp CS ${c.whatsappCs} | Telepon Kantor ${c.officePhone} | Email ${c.email}.`,
    `- Jam Operasional: ${c.operatingHours}.`,
    ``,
    `## 2. Aturan Komersial, MOQ, Harga & Estimasi Waktu`,
  ];

  for (const item of k.commercial) {
    if (item.allowMention) {
      lines.push(`- **${item.label} (BOLEH DISEBUT):** ${item.value}`);
    } else {
      lines.push(`- **${item.label} (RAHASIA / ARAHKAN KE SALES):** ${item.fallbackInstruction}`);
    }
  }

  lines.push(``, `## 3. Kategori Produk Maklon, Bahan Aktif & Kemasan`);
  for (const cat of k.categories) {
    lines.push(`### ${cat.name}`);
    lines.push(`- Varian Produk: ${cat.items}.`);
    if (cat.heroIngredients) lines.push(`- Bahan Aktif Unggulan (R&D): ${cat.heroIngredients}.`);
    if (cat.packagingOptions) lines.push(`- Pilihan Kemasan: ${cat.packagingOptions}.`);
    if (cat.moqNote) lines.push(`- Catatan MOQ: ${cat.moqNote}.`);
  }

  lines.push(``, `## 4. Layanan End-to-End Satu Pintu`);
  k.services.forEach((s, idx) => {
    lines.push(`${idx + 1}. **${s.title}:** ${s.description}`);
  });

  lines.push(``, `## 5. Enam (6) Tahapan Prosedur Maklon di ${c.brandName}`);
  k.sixSteps.forEach((st) => {
    lines.push(`${st.step}. **${st.title}:** ${st.description}`);
  });

  lines.push(``, `## 6. Keunggulan Utama Mengapa Memilih ${c.brandName}`);
  k.whyHaraka.forEach((w) => {
    lines.push(`- **${w.title}:** ${w.description}`);
  });

  lines.push(``, `## 7. Portofolio Brand Mitra`);
  lines.push(
    `Telah dipercaya memproduksi berbagai brand skincare, bodycare, haircare, dan parfum di Indonesia, antara lain: ${k.portfolioBrands.join(", ")}.`
  );

  lines.push(``, `## 8. FAQ Resmi & Panduan Menjawab Keberatan Klien`);
  for (const f of k.faqs) {
    const prefix = f.category === "objection" ? "[Cara Menjawab Keberatan]" : "[FAQ]";
    lines.push(`- **${prefix} ${f.question}**`);
    lines.push(`  Jawaban: ${f.answer}`);
  }

  const activeDocs = (k.extraDocs || []).filter((d) => d.enabled && d.content.trim());
  if (activeDocs.length > 0) {
    lines.push(``, `## 9. Dokumen & Catatan Pengetahuan Tambahan`);
    for (const doc of activeDocs) {
      lines.push(`### ${doc.title}`);
      lines.push(doc.content.trim());
    }
  }

  return lines.join("\n");
}

export function compileSystemPrompt(cfg: RaraConfig): string {
  if (cfg.persona.useCustomPromptOverride && cfg.persona.customSystemPromptOverride.trim()) {
    const knowledgeMd = compileKnowledgeMarkdown(cfg.knowledge);
    return `${cfg.persona.customSystemPromptOverride.trim()}\n\nPENGETAHUAN RESMI\n${knowledgeMd}`;
  }

  const p = cfg.persona;
  const g = cfg.guardrails;
  const l = cfg.leadRules;
  const k = cfg.knowledge;
  const knowledgeMd = compileKnowledgeMarkdown(k);

  const guardrailBullets: string[] = [
    `- Jawab hanya berdasarkan PENGETAHUAN di bawah dan pengetahuan umum tentang kosmetik serta maklon.`,
  ];

  if (g.noFabricatedNumbers) {
    guardrailBullets.push(
      `- Jangan pernah mengarang angka. Item komersial yang bertanda RAHASIA atau tidak ada di PENGETAHUAN tidak boleh kamu sebut angkanya; jelaskan bahwa angkanya disesuaikan spesifikasi produk, lalu tawarkan tim sales untuk menghitungkannya.`
    );
  }
  if (g.noMedicalClaims || g.strictBpomMode) {
    guardrailBullets.push(
      `- Tidak boleh memberi saran medis, klaim pengobatan, atau janji hasil instan yang melanggar regulasi kosmetik BPOM.`
    );
  }
  if (g.forbiddenClaims.length > 0) {
    guardrailBullets.push(
      `- Klaim yang DILARang KERAS untuk dijanjikan: ${g.forbiddenClaims.map((c) => `"${c}"`).join(", ")}.`
    );
  }
  if (g.mandatoryCpkbEducation) {
    guardrailBullets.push(
      `- Tekankan secara natural bahwa seluruh produk diproduksi di pabrik berstandar CPKB dan ISO 22716 serta didampingi izin resmi BPOM dan Halal.`
    );
  }
  if (g.noCompetitorBash) {
    guardrailBullets.push(`- Jangan pernah menjelek-jelekkan pabrik atau brand lain.`);
  }
  if (g.allowedTopicsNote) {
    guardrailBullets.push(
      `- ${g.allowedTopicsNote} Kalau ditanya di luar topik tersebut, jawab singkat dengan sopan lalu arahkan kembali ke rencana produk pengunjung.`
    );
  }

  const qualificationList = l.requiredQualificationFields.join(", ");

  return `Kamu adalah ${p.avatarName}, ${p.roleTitle} dari ${k.company.legalName}, pabrik maklon kosmetik berstandar CPKB di Bekasi. Kamu tampil sebagai avatar interaktif di website dan jawabanmu dibacakan dengan suara.

GAYA BICARA & BAHASA
- ${p.toneOfVoice}
- Sapa pengunjung dengan panggilan "${p.visitorHonorific}".
- Bahasa yang dilayani: ${p.languages}
- Panjang jawaban: ${cfg.llm.targetSentences}. Jangan gunakan daftar bernomor, jangan gunakan format markdown, jangan gunakan emoji, dan jangan sebut URL panjang.
- Ajukan paling banyak ${cfg.llm.maxQuestionsPerTurn} pertanyaan lanjutan di setiap jawaban agar percakapan terasa santai dan tidak seperti interogasi.

ATURAN & PAGAR KEAMANAN (GUARDRAILS)
${guardrailBullets.join("\n")}

MENGGALI KEBUTUHAN KUALIFIKASI LEAD
- Sambil menjawab pertanyaan pengunjung dengan ramah, pelan-pelan gali informasi berikut: ${qualificationList}.

MENGARAHKAN KE WHATSAPP
- Saat pengunjung menunjukkan niat komersial (bertanya harga, MOQ, estimasi waktu, sampel, atau setelah ${l.triggerAfterTurns} kali tanya-jawab), tawarkan perhitungan estimasi atau sampel bersama tim ${k.company.brandName}, lalu ajak ${p.visitorHonorific} menekan tombol "Chat via WhatsApp" yang muncul di bawah jawabanmu.
- Jangan pernah meminta nama atau nomor WhatsApp pengunjung. Pengunjung yang menghubungi kita lewat tombol tersebut.
- Setiap kali kamu mengajak ke WhatsApp, wajib akhiri jawabanmu dengan ${LEAD_MARKER} di baris tersendiri agar tombolnya muncul. Ini juga berlaku saat pengunjung bertanya nomor WhatsApp atau ingin langsung bicara dengan tim; sebutkan juga nomor CS resmi ${l.whatsappCsNumber}.

PENGETAHUAN
${knowledgeMd}`;
}

export function applyPronunciationDictionary(text: string, rules: PronunciationRule[]): string {
  let out = text;
  for (const r of rules) {
    if (!r.enabled || !r.term.trim()) continue;
    const escaped = r.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    out = out.replace(regex, r.phonetic);
  }
  return out;
}

/** 9Router is the only LLM engine; endpoint/models saved for another provider are discarded. */
function mergeLlmConfig(rawLlm: Partial<RaraConfig["llm"]> | undefined, secretKey: string): RaraConfig["llm"] {
  const saved = rawLlm?.provider === "9router" ? rawLlm : { ...rawLlm, baseUrl: "", model: "", fallbackModel: "" };
  return {
    ...DEFAULT_RARA_CONFIG.llm,
    ...saved,
    provider: "9router",
    // Fallback to env if saved config has empty key/baseUrl
    baseUrl: saved.baseUrl || process.env.LLM_BASE_URL || DEFAULT_RARA_CONFIG.llm.baseUrl,
    apiKey: secretKey || saved.apiKey || process.env.LLM_API_KEY || "",
    model: saved.model || process.env.LLM_MODEL || DEFAULT_RARA_CONFIG.llm.model,
    fallbackModel: saved.fallbackModel || process.env.LLM_FALLBACK_MODEL || DEFAULT_RARA_CONFIG.llm.fallbackModel,
  };
}

export function getRaraConfig(): RaraConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      const secrets = readSecrets();
      const merged: RaraConfig = {
        ...DEFAULT_RARA_CONFIG,
        ...raw,
        visual: { ...DEFAULT_RARA_CONFIG.visual, ...(raw.visual || {}) },
        llm: mergeLlmConfig(raw.llm, secrets.llmApiKey),
        voice: {
          ...DEFAULT_RARA_CONFIG.voice,
          ...(raw.voice || {}),
          provider: "elevenlabs",
          elevenlabsApiKey:
            secrets.elevenlabsApiKey || raw.voice?.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "",
          voiceId: raw.voice?.voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_RARA_CONFIG.voice.voiceId,
        },
        knowledge: {
          ...DEFAULT_RARA_CONFIG.knowledge,
          ...(raw.knowledge || {}),
          company: { ...DEFAULT_RARA_CONFIG.knowledge.company, ...(raw.knowledge?.company || {}) },
        },
        persona: { ...DEFAULT_RARA_CONFIG.persona, ...(raw.persona || {}) },
        guardrails: { ...DEFAULT_RARA_CONFIG.guardrails, ...(raw.guardrails || {}) },
        leadRules: {
          ...DEFAULT_RARA_CONFIG.leadRules,
          ...(raw.leadRules || {}),
          vpsWaWebhookSecret: secrets.vpsWaWebhookSecret || raw.leadRules?.vpsWaWebhookSecret || "",
        },
      };
      if (!merged.knowledge.rawMarkdown) {
        merged.knowledge.rawMarkdown = compileKnowledgeMarkdown({ ...merged.knowledge, activeMode: "structured" });
      }
      merged.mira = mergeMiraProfile(raw.mira, merged);
      return merged;
    }
  } catch (err) {
    console.error("Error reading rara-config.json, falling back to default:", err);
  }

  const initial = structuredClone(DEFAULT_RARA_CONFIG);
  initial.knowledge.rawMarkdown = compileKnowledgeMarkdown(initial.knowledge);
  initial.mira = mergeMiraProfile(undefined, initial);
  try {
    return saveRaraConfig(initial);
  } catch {
    // ignore write errors on read-only fs
  }
  return initial;
}

export function saveRaraConfig(nextConfig: RaraConfig): RaraConfig {
  const current = fs.existsSync(CONFIG_PATH) ? getRaraConfig() : DEFAULT_RARA_CONFIG;

  // A masked or empty key field means "keep the stored key"; a dashboard save never erases a key by itself
  const keepKey = (next: string | undefined, stored: string | undefined) =>
    !next || next === "***MASKED***" ? stored || "" : next;
  const llmApiKey = keepKey(nextConfig.llm?.apiKey, current.llm?.apiKey);
  const elevenApiKey = keepKey(nextConfig.voice?.elevenlabsApiKey, current.voice?.elevenlabsApiKey);
  const webhookSecret = nextConfig.leadRules?.vpsWaWebhookSecret ?? "";

  const finalConfig: RaraConfig = {
    ...nextConfig,
    updatedAt: new Date().toISOString(),
    llm: {
      ...nextConfig.llm,
      apiKey: llmApiKey,
    },
    voice: {
      ...nextConfig.voice,
      elevenlabsApiKey: elevenApiKey,
    },
  };

  // Sync structured knowledge -> rawMarkdown and lib/knowledge/haraka.md
  const compiledMd = compileKnowledgeMarkdown(finalConfig.knowledge);
  if (finalConfig.knowledge.activeMode === "structured") {
    finalConfig.knowledge.rawMarkdown = compiledMd;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Keys saved from the dashboard go to the gitignored secrets file; env values are not copied there
  const secrets: RaraSecrets = {
    llmApiKey: llmApiKey === process.env.LLM_API_KEY ? "" : llmApiKey,
    elevenlabsApiKey: elevenApiKey === process.env.ELEVENLABS_API_KEY ? "" : elevenApiKey,
    vpsWaWebhookSecret: webhookSecret,
  };
  writeFileRetry(SECRETS_PATH, JSON.stringify(secrets, null, 2));

  const publicConfig: RaraConfig = {
    ...finalConfig,
    llm: { ...finalConfig.llm, apiKey: "" },
    voice: { ...finalConfig.voice, elevenlabsApiKey: "" },
    leadRules: finalConfig.leadRules && { ...finalConfig.leadRules, vpsWaWebhookSecret: "" },
  };
  writeFileRetry(CONFIG_PATH, JSON.stringify(publicConfig, null, 2));

  // Sync lib/knowledge/haraka.md so legacy readers also stay updated
  try {
    const knowledgeDir = path.dirname(KNOWLEDGE_MD_PATH);
    if (!fs.existsSync(knowledgeDir)) fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.writeFileSync(KNOWLEDGE_MD_PATH, compiledMd, "utf8");
  } catch (e) {
    console.error("Failed to sync haraka.md:", e);
  }

  // Sync public/avatar/manifest.json so Avatar component immediately reflects changes
  try {
    const manifestObj =
      finalConfig.visual.mode === "placeholder"
        ? { mode: "placeholder" }
        : {
            mode: "clips",
            clips: finalConfig.visual.clips,
          };
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifestObj, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to sync manifest.json:", e);
  }

  return finalConfig;
}
