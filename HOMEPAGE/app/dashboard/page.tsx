"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Bot,
  Clapperboard,
  Film,
  FolderOpen,
  ShieldCheck,
  Factory,
  Search,
  Download,
  ExternalLink,
  MessageCircle,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Check,
  Copy,
  TrendingUp,
  DollarSign,
  Wand2,
} from "lucide-react";
import styles from "./dashboard.module.css";
import RaraSettingsTab from "@/components/dashboard/RaraSettingsTab";

type Lead = {
  name: string;
  whatsapp: string;
  summary: {
    produk: string | null;
    jumlah: string | null;
    budget: string | null;
    launching: string | null;
  };
  transcript: { role: string; content: string }[];
  session_id: string;
  created_at?: string;
  funnel?: "A" | "B";
};

type Payment = {
  noInvoice: string;
  customerId: string;
  custName?: string;
  produk: string;
  qty: number;
  nilai: number;
  status: string;
  tanggal: string;
  isLunas: boolean;
};

type ApprovalItem = {
  id: string;
  title: string;
  category: "Klaim Pabrik" | "Budget Iklan Meta" | "Publish Landing Page" | "Testimoni" | "Script Video";
  requester: string;
  detail: string;
  status: "pending" | "approved" | "rejected";
  risk: "Tinggi" | "Sedang" | "Rendah";
};

const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: "APP-01",
    title: "Klaim Lab: Lolos Uji In-Vitro SPF 50 PA++++",
    category: "Klaim Pabrik",
    requester: "AI Creative Analyst",
    detail: "Dipakai pada Script Video Hook Sunscreen Serum Pemula. Menunggu validasi sertifikat lab R&D.",
    status: "approved",
    risk: "Tinggi",
  },
  {
    id: "APP-02",
    title: "Aktivasi Iklan Meta: Funnel A (Brand Pemula)",
    category: "Budget Iklan Meta",
    requester: "Admin Ads",
    detail: "Budget harian Rp 750.000 / hari. Target CPL ≤ Rp 25.000 ke WhatsApp CS.",
    status: "pending",
    risk: "Sedang",
  },
  {
    id: "APP-03",
    title: "Publish Landing Page: Promo MOQ 1.000 pcs Batch Akhir Tahun",
    category: "Publish Landing Page",
    requester: "Marketing Team",
    detail: "Dua variasi A/B test (Headline Edukasi vs Headline Kecepatan BPOM).",
    status: "pending",
    risk: "Sedang",
  },
  {
    id: "APP-04",
    title: "Klaim Efektivitas: Mencerahkan Dalam 14 Hari",
    category: "Klaim Pabrik",
    requester: "AI Script Generator",
    detail: "Ditolak karena klaim BPOM tidak mengizinkan janji hari spesifik tanpa uji klinis in-vivo.",
    status: "rejected",
    risk: "Tinggi",
  },
];

type FactoryAsset = {
  id: string;
  title: string;
  category: "mesin" | "lab" | "packaging" | "tekstur";
  categoryLabel: string;
  ratio: "9:16 (Reels/TikTok)" | "16:9 (Landscape)";
  duration: string;
  file: string;
  description: string;
};

const FACTORY_ASSETS: FactoryAsset[] = [
  {
    id: "AST-01",
    title: "Mesin Homogenizer Vacuum 500L CPKB",
    category: "mesin",
    categoryLabel: "B-Roll Mesin CPKB",
    ratio: "9:16 (Reels/TikTok)",
    duration: "0:18s",
    file: "/assets/homogenizer-500l.mp4",
    description: "Footage proses emulsifikasi krim halus standar farmasi CPKB tanpa gelembung udara.",
  },
  {
    id: "AST-02",
    title: "Lab R&D: Droplet Pipet Serum & Viskositas",
    category: "lab",
    categoryLabel: "Lab & Formulasi",
    ratio: "9:16 (Reels/TikTok)",
    duration: "0:14s",
    file: "/assets/lab-viscosity-pipette.mp4",
    description: "Macro shot tetesan serum transparan dan pengujian viskositas spindle spindle.",
  },
  {
    id: "AST-03",
    title: "Filling & Capping Otomatis Botol Dropper",
    category: "mesin",
    categoryLabel: "B-Roll Mesin CPKB",
    ratio: "16:9 (Landscape)",
    duration: "0:25s",
    file: "/assets/conveyor-filling-dropper.mp4",
    description: "Line konveyor steril pengisian botol serum 30ml berkapasitas 2.400 botol/jam.",
  },
  {
    id: "AST-04",
    title: "Uji In-Vitro UV Analyzer SPF 50",
    category: "lab",
    categoryLabel: "Lab & Formulasi",
    ratio: "9:16 (Reels/TikTok)",
    duration: "0:12s",
    file: "/assets/lab-spf-analyzer.mp4",
    description: "Uji spektrofotometer transmisi sinar UVA & UVB untuk sertifikasi klaim proteksi.",
  },
  {
    id: "AST-05",
    title: "Unboxing Sample Kit Formulasi Klien",
    category: "packaging",
    categoryLabel: "Packaging & Sample",
    ratio: "9:16 (Reels/TikTok)",
    duration: "0:20s",
    file: "/assets/unboxing-sample-kit.mp4",
    description: "Aesthetic unboxing box tester 3 variasi tekstur lengkap dengan sertifikat analisis.",
  },
  {
    id: "AST-06",
    title: "Cleanroom Kelas C & Air Shower Produksi",
    category: "mesin",
    categoryLabel: "B-Roll Mesin CPKB",
    ratio: "16:9 (Landscape)",
    duration: "0:30s",
    file: "/assets/cleanroom-airshower.mp4",
    description: "Fasilitas HEPA filter terkontrol partikel mikron untuk standar higienitas tertinggi.",
  },
  {
    id: "AST-07",
    title: "Tekstur Swatch: Water-Burst Gel Sunscreen",
    category: "tekstur",
    categoryLabel: "Tekstur Kosmetik",
    ratio: "9:16 (Reels/TikTok)",
    duration: "0:15s",
    file: "/assets/texture-waterburst-swatch.mp4",
    description: "Tekstur gel pecah menjadi butiran air saat diaplikasikan, zero whitecast.",
  },
  {
    id: "AST-08",
    title: "Ruang Botol & Packaging Akrilik Premium",
    category: "packaging",
    categoryLabel: "Packaging & Sample",
    ratio: "16:9 (Landscape)",
    duration: "0:22s",
    file: "/assets/packaging-bottle-display.mp4",
    description: "Pilihan botol serum pipet, airless pump, tube biodegradable, dan jar mewah.",
  },
];

function formatRupiah(num: number): string {
  if (num >= 1_000_000_000) {
    return `Rp ${(num / 1_000_000_000).toFixed(2).replace(".", ",")} M`;
  }
  if (num >= 1_000_000) {
    return `Rp ${(num / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  }
  return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
}

type DashboardData = {
  liveLeads?: Lead[];
  invoices?: Payment[];
  metrics?: {
    totalLeads?: number;
    qualifiedLeads?: number;
    totalRevenue?: number;
    totalTurnover?: number;
    paidTurnover?: number;
    pendingTurnover?: number;
    paidPercentage?: string;
    pendingInvoices?: number;
    lunasAmount?: number;
    piutangAmount?: number;
    totalInvoices?: number;
    lunasCount?: number;
    belumLunasCount?: number;
    totalCustomers?: number;
    conversionRate?: string;
  };
  monthlyLeads?: { month: string; count: number; target: number }[];
  avatarManifest?: {
    mode: string;
    totalClips: number;
    states: string[];
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  // Active Sidebar Menu: PENGATURAN RARA & PEMBUATAN KONTEN DIPISAHKAN SECARA TEGAS
  const [activeMenu, setActiveMenu] = useState<
    "overview" | "leads" | "rara_settings" | "content_studio" | "asset_library" | "approvals" | "maklon"
  >("rara_settings");

  // Funnel Filter: "all" | "A" (Pemula) | "B" (Existing)
  const [selectedFunnel, setSelectedFunnel] = useState<"all" | "A" | "B">("all");

  // Tanya Rara Leads state
  const [leadSearch, setLeadSearch] = useState("");
  const [leadCategory, setLeadCategory] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copied, setCopied] = useState(false);
  const [contactedMap, setContactedMap] = useState<Record<string, boolean>>({});

  // PEMBUATAN KONTEN (CONTENT STUDIO) STATE
  const [contentDuration, setContentDuration] = useState<"15" | "30" | "45">("30");
  const [contentFunnel, setContentFunnel] = useState<"A" | "B">("A");
  const [copiedHookId, setCopiedHookId] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [scriptSentApproval, setScriptSentApproval] = useState(false);
  const [customHooks, setCustomHooks] = useState([
    {
      id: 1,
      type: "Curhat & Masalah",
      funnel: "A",
      text: "Banyak yang ngira bikin skincare BPOM harus modal 200 juta. Faktanya?",
      score: 94,
      hookRate: "38.2%",
      target: "Brand Pemula",
    },
    {
      id: 2,
      type: "Edukasi Formulasi",
      funnel: "A",
      text: "Sunscreen water-burst ini dibuat pakai teknologi micro-emulsion yang nggak bikin whitecast abu-abu sama sekali!",
      score: 91,
      hookRate: "34.5%",
      target: "Edukasi R&D",
    },
    {
      id: 3,
      type: "Kendala Pabrik (B2B)",
      funnel: "B",
      text: "Pernah kehabisan stok saat kampanye flash sale karena pabrik maklon telat kirim?",
      score: 96,
      hookRate: "41.0%",
      target: "Owner Existing",
    },
    {
      id: 4,
      type: "Bongkar Margin",
      funnel: "A",
      text: "Hitung modal bikin lip oil velvet dari nol: lab gratis, uji stabilitas tuntas, izin BPOM beres!",
      score: 89,
      hookRate: "32.1%",
      target: "Brand Pemula",
    },
  ]);

  // ASSET LIBRARY STATE
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<FactoryAsset | null>(null);
  const [assetCopied, setAssetCopied] = useState<string | null>(null);

  // Approvals Matrix
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);

  // Maklon Control Room state
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "lunas" | "belum">("all");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
      });
  }, []);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!data?.liveLeads) return [];
    return data.liveLeads.filter((l: Lead) => {
      // Funnel filter
      if (selectedFunnel === "A" && l.funnel && l.funnel !== "A") return false;
      if (selectedFunnel === "B" && l.funnel && l.funnel !== "B") return false;

      // Category filter
      if (leadCategory !== "all") {
        const prod = (l.summary?.produk || "").toLowerCase();
        if (!prod.includes(leadCategory.toLowerCase())) return false;
      }

      // Search filter
      if (leadSearch.trim()) {
        const q = leadSearch.toLowerCase();
        const n = (l.name || "").toLowerCase();
        const w = (l.whatsapp || "").toLowerCase();
        const p = (l.summary?.produk || "").toLowerCase();
        return n.includes(q) || w.includes(q) || p.includes(q);
      }
      return true;
    });
  }, [data, selectedFunnel, leadCategory, leadSearch]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    return data.invoices.filter((inv: Payment) => {
      if (invoiceFilter === "lunas" && !inv.isLunas) return false;
      if (invoiceFilter === "belum" && inv.isLunas) return false;

      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const no = (inv.noInvoice || "").toLowerCase();
        const cust = (inv.custName || inv.customerId || "").toLowerCase();
        const prod = (inv.produk || "").toLowerCase();
        return no.includes(q) || cust.includes(q) || prod.includes(q);
      }
      return true;
    });
  }, [data, invoiceFilter, invoiceSearch]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    if (assetFilter === "all") return FACTORY_ASSETS;
    return FACTORY_ASSETS.filter((a) => a.category === assetFilter);
  }, [assetFilter]);

  // Handle Approvals
  const handleApproval = (id: string, newStatus: "approved" | "rejected" | "pending") => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const copyTranscript = (lead: Lead) => {
    const text =
      `TRANSKRIP KONSULTASI TANYA RARA\n` +
      `Nama: ${lead.name}\n` +
      `WhatsApp: ${lead.whatsapp}\n` +
      `Produk: ${lead.summary.produk || "-"}\n` +
      `MOQ: ${lead.summary.jumlah || "-"}\n` +
      `Budget: ${lead.summary.budget || "-"}\n` +
      `Target Launching: ${lead.summary.launching || "-"}\n\n` +
      lead.transcript.map((m) => `${m.role === "assistant" ? "Rara" : lead.name}: ${m.content}`).join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyScriptText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  const copyHookText = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHookId(id);
    setTimeout(() => setCopiedHookId(null), 1800);
  };

  const generateNewHook = () => {
    const freshAngles = [
      {
        type: "Trik Bisnis B2B",
        funnel: "B",
        text: "Kenapa brand skincare top lebih milih maklon di pabrik daripada bangun pabrik sendiri? Ini hitungan marginnya!",
        score: 95,
        hookRate: "39.4%",
        target: "Owner Existing",
      },
      {
        type: "Uji Bukti Formula",
        funnel: "A",
        text: "Kaget pas cek lab: serum 30 ribuan ini ternyata punya stabilitas active ingredient lebih tinggi dari brand impor!",
        score: 93,
        hookRate: "36.8%",
        target: "Brand Pemula",
      },
      {
        type: "Timeline BPOM",
        funnel: "A",
        text: "Mau jualan skincare viral di TikTok sebelum lebaran? Kapan batas aman mulai formulasi di pabrik?",
        score: 92,
        hookRate: "35.0%",
        target: "Brand Pemula",
      },
    ];

    const pick = freshAngles[Math.floor(Math.random() * freshAngles.length)];
    const newHook = {
      id: Date.now(),
      type: pick.type,
      funnel: pick.funnel,
      text: pick.text,
      score: pick.score,
      hookRate: pick.hookRate,
      target: pick.target,
    };
    setCustomHooks((prev) => [newHook, ...prev]);
  };

  const sendScriptToApproval = (scriptTitle: string) => {
    const newApp: ApprovalItem = {
      id: `APP-0${approvals.length + 1}`,
      title: `Draft Iklan: ${scriptTitle}`,
      category: "Script Video",
      requester: "AI Content Studio",
      detail: `Script video ${contentDuration}s untuk Funnel ${contentFunnel}. Membutuhkan approval klaim bahan aktif dan hook visual.`,
      status: "pending",
      risk: "Sedang",
    };
    setApprovals((prev) => [newApp, ...prev]);
    setScriptSentApproval(true);
    setTimeout(() => setScriptSentApproval(false), 2500);
  };

  const exportLeadsCsv = () => {
    if (!filteredLeads.length) return;
    const headers = "Nama,WhatsApp,Produk,MOQ,Budget,Target Launching,Status Follow-Up\n";
    const rows = filteredLeads
      .map(
        (l: Lead) =>
          `"${l.name}","${l.whatsapp}","${l.summary.produk || ""}","${l.summary.jumlah || ""}","${l.summary.budget || ""}","${l.summary.launching || ""}","${contactedMap[l.whatsapp] ? "Sudah Dihubungi" : "Belum Follow-up"}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-tanya-rara-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const m = data?.metrics;

  return (
    <div className={styles.dashboardLayout}>
      {/* ====================================================================
          SIDEBAR NAVIGATION (DIPISAH: RARA vs KONTEN & IKLAN)
          ==================================================================== */}
      <aside className={styles.sidebar}>
        {/* Brand Header */}
        <div className={styles.sidebarBrand}>
          <div className={styles.brandTitle}>HARAKA ERFI</div>
          <div className={styles.brandSub}>AI Marketing Factory</div>
          <span
            style={{
              position: "absolute",
              top: 24,
              right: 18,
              fontSize: 10,
              fontWeight: 800,
              background: "#eaf5f1",
              color: "#0d6a55",
              padding: "2px 6px",
              borderRadius: 6,
            }}
          >
            v1.0
          </span>
        </div>

        <nav className={styles.sidebarNav}>
          {/* GROUP 1: UTAMA & METRIK */}
          <div className={styles.navSectionLabel}>Utama & Metrik</div>
          <button
            className={`${styles.navLink} ${activeMenu === "overview" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("overview")}
          >
            <div className={styles.navLinkLeft}>
              <LayoutDashboard size={16} />
              <span>Overview & Funnel</span>
            </div>
          </button>

          {/* GROUP 2: AVATAR TANYA RARA (KHUSUS AVATAR & PROSPEK) */}
          <div className={styles.navSectionLabel}>Avatar Tanya Rara</div>
          <button
            className={`${styles.navLink} ${activeMenu === "leads" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("leads")}
          >
            <div className={styles.navLinkLeft}>
              <Users size={16} />
              <span>Tanya Rara Leads</span>
            </div>
            <span className={styles.navBadge}>{data?.liveLeads?.length || 5}</span>
          </button>

          <button
            className={`${styles.navLink} ${activeMenu === "rara_settings" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("rara_settings")}
          >
            <div className={styles.navLinkLeft}>
              <Bot size={16} />
              <span>Pengaturan Avatar Rara</span>
            </div>
            <span className={styles.navBadge} style={{ background: "#faeeed", color: "#a8666a" }}>
              7 Clips
            </span>
          </button>

          {/* GROUP 3: PEMBUATAN KONTEN & IKLAN (KHUSUS KONTEN & ASSET FACTORY) */}
          <div className={styles.navSectionLabel}>Pembuatan Konten & Iklan</div>
          <button
            className={`${styles.navLink} ${activeMenu === "content_studio" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("content_studio")}
          >
            <div className={styles.navLinkLeft}>
              <Clapperboard size={16} />
              <span>Pembuatan Konten</span>
            </div>
            <span className={styles.navBadge} style={{ background: "#eaf5f1", color: "#0d6a55" }}>
              AI Studio
            </span>
          </button>

          <button
            className={`${styles.navLink} ${activeMenu === "asset_library" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("asset_library")}
          >
            <div className={styles.navLinkLeft}>
              <FolderOpen size={16} />
              <span>Asset Library Pabrik</span>
            </div>
            <span className={styles.navBadge}>8 Media</span>
          </button>

          <button
            className={`${styles.navLink} ${activeMenu === "approvals" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("approvals")}
          >
            <div className={styles.navLinkLeft}>
              <ShieldCheck size={16} />
              <span>Approval & Guardrails</span>
            </div>
            <span className={styles.navBadge} style={{ background: "#faeeed", color: "#a8666a" }}>
              {approvals.filter((a) => a.status === "pending").length}
            </span>
          </button>

          {/* GROUP 4: MANUFAKTUR & CRM */}
          <div className={styles.navSectionLabel}>Manufaktur & CRM</div>
          <button
            className={`${styles.navLink} ${activeMenu === "maklon" ? styles.navLinkActive : ""}`}
            onClick={() => setActiveMenu("maklon")}
          >
            <div className={styles.navLinkLeft}>
              <Factory size={16} />
              <span>Maklon CRM & Transaksi</span>
            </div>
            <span className={styles.navBadge}>{m?.totalInvoices || 333}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>HE</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.userName}>Owner / Admin</div>
              <div className={styles.userRole}>Haraka Erfi Factory</div>
            </div>
          </div>
          <Link
            href="/"
            target="_blank"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              background: "#ffffff",
              border: "1px solid #e8e2de",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#a8666a",
              textDecoration: "none",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} /> Buka Tanya Rara Live
            </span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </aside>

      {/* ====================================================================
          MAIN CONTENT AREA
          ==================================================================== */}
      <main className={styles.mainContent}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <div className={styles.pageHeading}>
            <h2 className={styles.pageTitle}>
              {activeMenu === "overview" && "Executive Summary & Funnel Intelligence"}
              {activeMenu === "leads" && "Inbound Leads — Tanya Rara (AI Avatar)"}
              {activeMenu === "rara_settings" && "Pengaturan Avatar Tanya Rara (AI Engine & Visual)"}
              {activeMenu === "content_studio" && "Studio Pembuatan Konten & Iklan (Blueprint §6)"}
              {activeMenu === "asset_library" && "Asset Library Pabrik — Media B-Roll & Footage"}
              {activeMenu === "approvals" && "Matriks Approval & Pagar Keamanan (Blueprint §10 & §11)"}
              {activeMenu === "maklon" && "Maklon Control Room: Transaksi & Pabrik"}
            </h2>

            {/* Funnel Switcher (Blueprint Section 5) */}
            <div className={styles.funnelToggle}>
              <button
                className={`${styles.funnelToggleBtn} ${selectedFunnel === "all" ? styles.funnelToggleBtnActive : ""}`}
                onClick={() => setSelectedFunnel("all")}
              >
                Semua Funnel
              </button>
              <button
                className={`${styles.funnelToggleBtn} ${selectedFunnel === "A" ? styles.funnelToggleBtnActive : ""}`}
                onClick={() => setSelectedFunnel("A")}
                title="Funnel A: Calon Brand Pemula (Edukasi, MOQ 1.000 pcs)"
              >
                Funnel A: Pemula
              </button>
              <button
                className={`${styles.funnelToggleBtn} ${selectedFunnel === "B" ? styles.funnelToggleBtnActive : ""}`}
                onClick={() => setSelectedFunnel("B")}
                title="Funnel B: Owner Brand Existing (Kapasitas, Formulasi, Repeat)"
              >
                Funnel B: Existing
              </button>
            </div>
          </div>

          <div className={styles.topActions}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#eaf5f1",
                color: "#0d6a55",
                padding: "4px 8px",
                borderRadius: 99,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0d6a55" }} />
              Live Sync
            </span>
            <button className={styles.btnPrimary} onClick={exportLeadsCsv}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        </header>

        <div className={styles.pageBody}>
          {/* ==================================================================
              MENU 1: OVERVIEW & FUNNEL INTELLIGENCE
              ================================================================== */}
          {activeMenu === "overview" && (
            <>
              {/* 4 KPI Cards */}
              <div className={styles.kpiGrid}>
                {/* KPI 1 */}
                <div className={styles.kpiCard}>
                  <div className={styles.kpiHead}>
                    <span className={styles.kpiLabel}>INBOUND LEADS</span>
                    <div className={styles.kpiIconWrap} style={{ background: "#faeeed", color: "#a8666a" }}>
                      <Users size={16} />
                    </div>
                  </div>
                  <div className={styles.kpiValue}>{m?.totalLeads || 785}</div>
                  <div className={styles.kpiFoot}>
                    <span className={styles.kpiTrendPositive}>
                      <TrendingUp size={11} style={{ display: "inline" }} /> +{data?.liveLeads?.length || 5} Rara AI
                    </span>
                    <span className={styles.kpiMuted}>dari database WhatsApp</span>
                  </div>
                </div>

                {/* KPI 2 */}
                <div className={styles.kpiCard}>
                  <div className={styles.kpiHead}>
                    <span className={styles.kpiLabel}>TOTAL OMZET MAKLON</span>
                    <div className={styles.kpiIconWrap} style={{ background: "#eaf5f1", color: "#0d6a55" }}>
                      <DollarSign size={16} />
                    </div>
                  </div>
                  <div className={styles.kpiValue}>{formatRupiah(m?.totalTurnover || 11019688329)}</div>
                  <div className={styles.kpiFoot}>
                    <span className={styles.kpiTrendPositive}>
                      <CheckCircle2 size={11} style={{ display: "inline" }} /> {m?.paidPercentage || "93.1"}% Lunas
                    </span>
                    <span className={styles.kpiMuted}>({m?.totalInvoices || 333} invoices)</span>
                  </div>
                </div>

                {/* KPI 3 */}
                <div className={styles.kpiCard}>
                  <div className={styles.kpiHead}>
                    <span className={styles.kpiLabel}>TERMIN BERJALAN</span>
                    <div className={styles.kpiIconWrap} style={{ background: "#fcf1db", color: "#9a6100" }}>
                      <Clock size={16} />
                    </div>
                  </div>
                  <div className={styles.kpiValue} style={{ color: "#9a6100" }}>
                    {formatRupiah(m?.pendingTurnover || 762690000)}
                  </div>
                  <div className={styles.kpiFoot}>
                    <span style={{ color: "#9a6100", fontWeight: 700 }}>
                      {m?.pendingInvoices || 19} Invoice
                    </span>
                    <span className={styles.kpiMuted}>Menunggu pelunasan</span>
                  </div>
                </div>

                {/* KPI 4 */}
                <div className={styles.kpiCard}>
                  <div className={styles.kpiHead}>
                    <span className={styles.kpiLabel}>APPROVAL PENDING</span>
                    <div className={styles.kpiIconWrap} style={{ background: "#eaf1f8", color: "#23588a" }}>
                      <ShieldCheck size={16} />
                    </div>
                  </div>
                  <div className={styles.kpiValue}>
                    {approvals.filter((a) => a.status === "pending").length} Item
                  </div>
                  <div className={styles.kpiFoot}>
                    <span style={{ color: "#a8666a", fontWeight: 700 }}>Klaim & Budget</span>
                    <span className={styles.kpiMuted}>Butuh review manusia</span>
                  </div>
                </div>
              </div>

              {/* Blueprint Section 5: Comparison of Two Funnels */}
              <div className={styles.panelCard}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3 className={styles.panelTitle}>Perbandingan Dua Funnel Utama (Blueprint §5)</h3>
                    <p className={styles.panelDesc}>
                      Pemisahan terukur antara Calon Brand Pemula (Funnel A) dan Pemilik Brand Existing (Funnel B).
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Funnel A Card */}
                  <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#a8666a" }}>FUNNEL A: BRAND PEMULA</span>
                      <span style={{ fontSize: 11, background: "#faeeed", color: "#a8666a", fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
                        MOQ 1.000 pcs
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#705e5e", marginBottom: 14 }}>
                      Angle: <em>&quot;Mulai brand sendiri dengan bimbingan formulasi & izin BPOM/Halal lengkap dari nol.&quot;</em>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>INBOUND LEADS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1f1818" }}>480</div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>SAMPLE RATE</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d6a55" }}>54.2%</div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>AVG DEAL</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#a8666a" }}>Rp 35 Jt</div>
                      </div>
                    </div>
                  </div>

                  {/* Funnel B Card */}
                  <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#0d6a55" }}>FUNNEL B: OWNER EXISTING</span>
                      <span style={{ fontSize: 11, background: "#eaf5f1", color: "#0d6a55", fontWeight: 700, padding: "2px 7px", borderRadius: 99 }}>
                        Kapasitas & Batch Besar
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#705e5e", marginBottom: 14 }}>
                      Angle: <em>&quot;Pabrik maklon kapasitas konsisten, ketepatan waktu pengiriman, & R&D formula inovatif.&quot;</em>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, textAlign: "center" }}>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>INBOUND LEADS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1f1818" }}>305</div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>SAMPLE RATE</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d6a55" }}>68.5%</div>
                      </div>
                      <div style={{ background: "#ffffff", padding: "10px 8px", borderRadius: 8, border: "1px solid #f0ebe7" }}>
                        <div style={{ fontSize: 10, color: "#9c8a8a", fontWeight: 700 }}>AVG DEAL</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d6a55" }}>Rp 85 Jt</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attribution Pipeline */}
              <div className={styles.panelCard}>
                <h3 className={styles.panelTitle} style={{ marginBottom: 14 }}>
                  Pipeline Maklon Teratribusi (Inbound → Deal)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "1. Total Inbound Contact (Tanya Rara + WA)", count: "785 Leads", pct: 100, color: "#a8666a" },
                    { label: "2. Konsultasi Spesifikasi & Estimasi Biaya", count: "512 Prospek", pct: 65.2, color: "#a8666a" },
                    { label: "3. Pengiriman Tester Sampel Formulasi", count: "394 Sampel", pct: 50.1, color: "#0d6a55" },
                    { label: "4. Deal Kontrak & DP Invoice Produksi", count: "333 Invoices", pct: 42.4, color: "#0d6a55" },
                    { label: "5. Pelunasan & Repeat Order", count: "314 Transaksi", pct: 40.0, color: "#0d6a55" },
                  ].map((step, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                        <span>{step.label}</span>
                        <span>
                          <b>{step.count}</b> ({step.pct}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: "#f2eeea", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${step.pct}%`, height: "100%", background: step.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ==================================================================
              MENU 2: TANYA RARA LEADS & TRANSKRIP
              ================================================================== */}
          {activeMenu === "leads" && (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Calon Klien Inbound — Tanya Rara (AI Avatar)</h3>
                  <p className={styles.panelDesc}>
                    Calon klien yang berkonsultasi langsung dengan avatar Rara dan meninggalkan kontak WhatsApp.
                  </p>
                </div>

                <div className={styles.searchWrap} style={{ maxWidth: 280 }}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Cari nama, WA, produk…"
                    className={styles.searchInput}
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className={styles.categoryPills}>
                {["all", "Sunscreen Serum", "Face Serum", "Facial Cleanser", "Lip Care", "Moisturizer Gel"].map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.pillBtn} ${leadCategory === cat ? styles.pillBtnActive : ""}`}
                    onClick={() => setLeadCategory(cat)}
                  >
                    {cat === "all" ? "Semua Kategori" : cat}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Calon Klien</th>
                      <th>Nomor WhatsApp</th>
                      <th>Produk Impian</th>
                      <th>Target MOQ</th>
                      <th>Budget</th>
                      <th>Launching</th>
                      <th>Follow-up</th>
                      <th style={{ textAlign: "right" }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead: Lead, idx: number) => {
                      const isContacted = contactedMap[lead.whatsapp];
                      const waClean = lead.whatsapp.replace(/\D/g, "");
                      const waFormatted = waClean.startsWith("0") ? "62" + waClean.slice(1) : waClean;
                      const waMsg = encodeURIComponent(
                        `Halo Kak ${lead.name}, saya dari Haraka Erfi Kosmetindo. Terima kasih sudah berkonsultasi dengan Rara mengenai rencana pembuatan produk ${lead.summary.produk || "kosmetik"}. Boleh kami bantu hitungkan estimasi biaya dan kirimkan sampel testernya?`
                      );
                      const waLink = `https://wa.me/${waFormatted}?text=${waMsg}`;

                      return (
                        <tr key={idx}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "#1f1818",
                                  color: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                {lead.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: "#1f1818" }}>{lead.name}</div>
                                <div style={{ fontSize: 11, color: "#9c8a8a" }}>{lead.created_at || "2 Nov 2026"}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{lead.whatsapp}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: "#faeeed",
                                color: "#a8666a",
                              }}
                            >
                              {lead.summary.produk || "Formula Kustom"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{lead.summary.jumlah || "-"}</div>
                            <div style={{ fontSize: 10.5, color: "#9c8a8a" }}>
                              {lead.funnel === "B" ? "Kapasitas besar" : "MOQ pemula"}
                            </div>
                          </td>
                          <td style={{ color: "#0d6a55", fontWeight: 700 }}>{lead.summary.budget || "Fleksibel"}</td>
                          <td>{lead.summary.launching || "Segera"}</td>
                          <td>
                            <button
                              onClick={() => setContactedMap((prev) => ({ ...prev, [lead.whatsapp]: !prev[lead.whatsapp] }))}
                              style={{
                                border: "none",
                                background: isContacted ? "#eaf5f1" : "#f2eeea",
                                color: isContacted ? "#0d6a55" : "#705e5e",
                                fontWeight: 700,
                                fontSize: 11,
                                padding: "4px 8px",
                                borderRadius: 99,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              {isContacted ? <Check size={11} /> : <Clock size={11} />}
                              {isContacted ? "Sudah Dihubungi" : "Belum Follow-up"}
                            </button>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 5 }}>
                              <button
                                style={{
                                  border: "1px solid #e8e2de",
                                  background: "#fff",
                                  borderRadius: 6,
                                  padding: "5px 10px",
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <Eye size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                                Transkrip
                              </button>
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  border: "1px solid #2f8f5b",
                                  background: "#2f8f5b",
                                  color: "#fff",
                                  borderRadius: 6,
                                  padding: "5px 10px",
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <MessageCircle size={12} /> Chat WA
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================
              MENU 3: PENGATURAN AVATAR RARA (ALL-IN-ONE 6 SUB-TABS)
              ================================================================== */}
          {activeMenu === "rara_settings" && <RaraSettingsTab />}

          {/* ==================================================================
              MENU 4: PEMBUATAN KONTEN & IKLAN (AI CREATIVE FACTORY)
              ================================================================== */}
          {activeMenu === "content_studio" && (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Studio Pembuatan Konten & Iklan (Blueprint §6)</h3>
                  <p className={styles.panelDesc}>
                    Generator Hook 3 detik berbasis AI, penyusun naskah video iklan 15/30/45 detik, dan copywriter Meta & TikTok terpisah per funnel.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={generateNewHook}
                    style={{
                      border: "1px solid #0d6a55",
                      background: "#eaf5f1",
                      color: "#0d6a55",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Wand2 size={13} /> ⚡ Generate Hook AI Baru
                  </button>
                </div>
              </div>

              {/* Funnel Selection Banner */}
              <div
                style={{
                  background: contentFunnel === "A" ? "#faeeed" : "#eaf5f1",
                  border: `1px solid ${contentFunnel === "A" ? "#f0d5d3" : "#c4e4d8"}`,
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: contentFunnel === "A" ? "#a8666a" : "#0d6a55", textTransform: "uppercase" }}>
                    Target Sudut Pandang Iklan:
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818", marginTop: 2 }}>
                    {contentFunnel === "A"
                      ? "Funnel A: Calon Brand Pemula (MOQ 1.000 pcs, Edukasi Perizinan BPOM, Modal Terjangkau)"
                      : "Funnel B: Owner Brand Existing (Kapasitas Produksi 50.000 pcs/minggu, R&D Inovatif, Ketepatan Waktu)"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setContentFunnel("A")}
                    style={{
                      border: "none",
                      background: contentFunnel === "A" ? "#a8666a" : "#ffffff",
                      color: contentFunnel === "A" ? "#ffffff" : "#1f1818",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Funnel A (Pemula)
                  </button>
                  <button
                    onClick={() => setContentFunnel("B")}
                    style={{
                      border: "none",
                      background: contentFunnel === "B" ? "#0d6a55" : "#ffffff",
                      color: contentFunnel === "B" ? "#ffffff" : "#1f1818",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Funnel B (Existing)
                  </button>
                </div>
              </div>

              {/* SECTION A: HOOK 3 DETIK GENERATOR */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#1f1818" }}>
                    🔥 AI Hook 3 Detik Generator (Berdasarkan Formula Blueprint §6)
                  </h4>
                  <span style={{ fontSize: 11, color: "#705e5e" }}>Diurutkan berdasarkan estimasi Retensi Hook 3 Detik</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                  {customHooks
                    .filter((h) => selectedFunnel === "all" || h.funnel === selectedFunnel)
                    .map((hook) => (
                      <div
                        key={hook.id}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e8e2de",
                          borderRadius: 12,
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: "0 1px 3px rgba(31,24,24,0.03)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: hook.funnel === "A" ? "#a8666a" : "#0d6a55", background: hook.funnel === "A" ? "#faeeed" : "#eaf5f1", padding: "2px 6px", borderRadius: 4 }}>
                              {hook.type}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: "#0d6a55" }}>
                              Score: {hook.score}/100
                            </span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818", lineHeight: 1.45, marginBottom: 8 }}>
                            &quot;{hook.text}&quot;
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #f0ebe7" }}>
                          <span style={{ fontSize: 10.5, color: "#9c8a8a" }}>
                            Est. Hook Rate: <b>{hook.hookRate}</b>
                          </span>
                          <button
                            onClick={() => copyHookText(hook.id, hook.text)}
                            style={{
                              border: "1px solid #e8e2de",
                              background: copiedHookId === hook.id ? "#eaf5f1" : "#ffffff",
                              color: copiedHookId === hook.id ? "#0d6a55" : "#1f1818",
                              borderRadius: 6,
                              padding: "4px 8px",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {copiedHookId === hook.id ? <Check size={11} /> : <Copy size={11} />}
                            {copiedHookId === hook.id ? "Tersalin!" : "Salin Hook"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* SECTION B: VIDEO AD SCRIPT BUILDER (15s / 30s / 45s) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: "#1f1818" }}>
                      🎬 Naskah Script Iklan Video (Struktur Timeline Visual + Verbal)
                    </h4>
                    <p style={{ fontSize: 11.5, color: "#705e5e", margin: "2px 0 0" }}>
                      Menggabungkan Hook 3s, Masalah/Agitasi, Solusi Maklon Pabrik Haraka Erfi, dan CTA WhatsApp.
                    </p>
                  </div>

                  {/* Duration Selector */}
                  <div style={{ display: "inline-flex", background: "#f2eeea", padding: 3, borderRadius: 8, gap: 2 }}>
                    {(["15", "30", "45"] as const).map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setContentDuration(dur)}
                        style={{
                          border: "none",
                          background: contentDuration === dur ? "#ffffff" : "transparent",
                          color: contentDuration === dur ? "#1f1818" : "#705e5e",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {dur} Detik
                      </button>
                    ))}
                  </div>
                </div>

                {/* Script Card Output */}
                <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: contentFunnel === "A" ? "#a8666a" : "#0d6a55" }}>
                        SCRIPT {contentDuration} DETIK — FUNNEL {contentFunnel} (
                        {contentFunnel === "A" ? "BRAND PEMULA" : "OWNER EXISTING"})
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800 }}>
                        {contentFunnel === "A"
                          ? contentDuration === "15"
                            ? 'Konsep: "Modal 30 Jt Punya Skincare Sendiri"'
                            : contentDuration === "30"
                            ? 'Konsep: "Mulai Brand Sendiri dengan MOQ 1.000 pcs & Izin Lengkap"'
                            : 'Konsep: "Edukasi Formulasi & Uji Lab In-Vitro SPF 50"'
                          : contentDuration === "15"
                          ? 'Konsep: "Anti Telat Kirim Saat Flash Sale"'
                          : contentDuration === "30"
                          ? 'Konsep: "Pabrik Maklon Berstandar CPKB Farmasi 50.000 pcs/Minggu"'
                          : 'Konsep: "Konsistensi Batch Besar & R&D Formula Inovatif"'}
                      </h4>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() =>
                          copyScriptText(
                            contentFunnel === "A"
                              ? `[0-3s Hook]: Banyak yang ngira bikin skincare BPOM harus modal ratusan juta. Faktanya?\n[3-15s Problem]: Di Haraka Erfi, kamu bisa mulai maklon dari MOQ 1.000 pcs.\n[15-30s Solusi]: Formula water-based lolos uji in-vitro SPF 50, izin BPOM & Halal tuntas dari nol.\n[CTA]: Konsultasi gratis sekarang bareng Rara di website!`
                              : `[0-3s Hook]: Pernah kehabisan stok saat kampanye flash sale karena pabrik telat kirim?\n[3-25s Solusi]: Haraka Erfi didukung mesin mixing otomatis berstandar CPKB farmasi dengan kapasitas 50.000 pcs per minggu.\n[CTA]: Kirimkan RFQ brand Anda untuk uji stabilitas gratis hari ini.`
                          )
                        }
                        style={{
                          border: "1px solid #e8e2de",
                          background: copiedScript ? "#eaf5f1" : "#ffffff",
                          color: copiedScript ? "#0d6a55" : "#1f1818",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {copiedScript ? <Check size={12} /> : <Copy size={12} />}
                        {copiedScript ? "Script Tersalin!" : "Salin Script"}
                      </button>

                      <button
                        onClick={() => sendScriptToApproval(`Script ${contentDuration}s Funnel ${contentFunnel}`)}
                        style={{
                          border: "1px solid #0d6a55",
                          background: scriptSentApproval ? "#0d6a55" : "#eaf5f1",
                          color: scriptSentApproval ? "#ffffff" : "#0d6a55",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ShieldCheck size={13} />
                        {scriptSentApproval ? "Terkirim ke Matriks Approval!" : "Kirim ke Approval"}
                      </button>
                    </div>
                  </div>

                  {/* Script Timeline Breakdown */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Block 1 */}
                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #f0ebe7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#a8666a" }}>[0 - 3 DETIK] HOOK VISUAL & VERBAL</span>
                        <span style={{ fontSize: 10.5, color: "#9c8a8a" }}>Asset: Footage B-Roll / Ekspresi Rara</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1818", lineHeight: 1.5 }}>
                        {contentFunnel === "A"
                          ? '"Banyak yang ngira bikin skincare BPOM harus modal ratusan juta. Faktanya?"'
                          : '"Pernah kehabisan stok saat kampanye flash sale karena pabrik telat kirim?"'}
                      </div>
                      <div style={{ fontSize: 11, color: "#705e5e", marginTop: 4 }}>
                        <em>Arahan Visual: Close-up botol serum mewah disorot lampu lab, teks tebal di tengah layar.</em>
                      </div>
                    </div>

                    {/* Block 2 */}
                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #f0ebe7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#0d6a55" }}>
                          [3 - {contentDuration === "15" ? "10" : "20"} DETIK] PROBLEM & SOLUSI PABRIK
                        </span>
                        <span style={{ fontSize: 10.5, color: "#9c8a8a" }}>Asset: Cleanroom CPKB & Droplet Pipet</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1818", lineHeight: 1.5 }}>
                        {contentFunnel === "A"
                          ? '"Di Haraka Erfi, kamu bisa mulai maklon dari MOQ 1.000 pcs. Formula sudah water-based, lolos uji in-vitro SPF 50, dan seluruh perizinan BPOM & Halal resmi kami dampingi dari nol."'
                          : '"Haraka Erfi didukung mesin mixing otomatis berstandar CPKB farmasi dengan kapasitas 50.000 pcs per minggu. Lead time terukur, konsistensi batch tinggi, dan uji stabilitas formula akurat."'}
                      </div>
                      <div style={{ fontSize: 11, color: "#705e5e", marginTop: 4 }}>
                        <em>Arahan Visual: B-roll mesin homogenizer 500L berputar cepat, dilanjutkan pengujian viskositas di lab R&D.</em>
                      </div>
                    </div>

                    {/* Block 3 */}
                    <div style={{ background: "#ffffff", padding: 12, borderRadius: 10, border: "1px solid #f0ebe7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#23588a" }}>
                          [{contentDuration === "15" ? "10" : "20"} - {contentDuration} DETIK] CALL TO ACTION (CTA)
                        </span>
                        <span style={{ fontSize: 10.5, color: "#9c8a8a" }}>Asset: Tanya Rara AI Avatar</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1f1818", lineHeight: 1.5 }}>
                        {contentFunnel === "A"
                          ? '"Mau coba tester formulanya dulu gratis? Ngobrol langsung bareng Rara di website kami sekarang!"'
                          : '"Kirimkan RFQ dan spesifikasi formula brand Anda untuk uji stabilitas gratis hari ini."'}
                      </div>
                      <div style={{ fontSize: 11, color: "#705e5e", marginTop: 4 }}>
                        <em>Arahan Visual: Potongan avatar Rara tersenyum ramah dengan tombol &quot;Konsultasi Formula di Website&quot;.</em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              MENU 5: ASSET LIBRARY PABRIK (MEDIA & B-ROLL MAKLON)
              ================================================================== */}
          {activeMenu === "asset_library" && (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Asset Library Pabrik — Media B-Roll & Footage (Blueprint §6)</h3>
                  <p className={styles.panelDesc}>
                    Pustaka aset video dan media pabrik untuk bahan baku pembuatan konten iklan video, landing page, dan materi promosi.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {["all", "mesin", "lab", "packaging", "tekstur"].map((cat) => (
                    <button
                      key={cat}
                      className={`${styles.pillBtn} ${assetFilter === cat ? styles.pillBtnActive : ""}`}
                      onClick={() => setAssetFilter(cat)}
                    >
                      {cat === "all" ? "Semua Aset" : cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Grid */}
              <div className={styles.assetGrid}>
                {filteredAssets.map((asset) => (
                  <div key={asset.id} className={styles.assetCard}>
                    <div className={styles.assetThumb}>
                      <Film size={32} style={{ opacity: 0.6 }} />
                      <span className={styles.assetRatioBadge}>{asset.ratio}</span>
                      <span className={styles.assetDurationBadge}>{asset.duration}</span>
                    </div>

                    <div className={styles.assetContent}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#a8666a", background: "#faeeed", padding: "2px 6px", borderRadius: 4 }}>
                          {asset.categoryLabel}
                        </span>
                        <span style={{ fontSize: 10, color: "#9c8a8a", fontFamily: "monospace" }}>{asset.id}</span>
                      </div>

                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818" }}>{asset.title}</div>
                      <div style={{ fontSize: 11.5, color: "#705e5e", lineHeight: 1.45 }}>{asset.description}</div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, paddingTop: 8, borderTop: "1px solid #f0ebe7" }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(asset.file);
                            setAssetCopied(asset.id);
                            setTimeout(() => setAssetCopied(null), 1800);
                          }}
                          style={{
                            border: "1px solid #e8e2de",
                            background: assetCopied === asset.id ? "#eaf5f1" : "#ffffff",
                            color: assetCopied === asset.id ? "#0d6a55" : "#1f1818",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {assetCopied === asset.id ? <Check size={11} /> : <Copy size={11} />}
                          {assetCopied === asset.id ? "Path Tersalin!" : "Salin Path"}
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenu("content_studio");
                          }}
                          style={{
                            border: "none",
                            background: "#a8666a",
                            color: "#ffffff",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Gunakan di Script →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================================================
              MENU 6: APPROVAL & GUARDRAILS (Blueprint Section 10 & 11)
              ================================================================== */}
          {activeMenu === "approvals" && (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Matriks Approval & Pagar Keamanan (Blueprint §10 & §11)</h3>
                  <p className={styles.panelDesc}>
                    AI meramu otomatis, namun manusia tetap memegang kendali atas budget, klaim pabrik, legalitas BPOM, dan publikasi iklan.
                  </p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID & Judul Item</th>
                      <th>Kategori</th>
                      <th>Pemohon</th>
                      <th>Detail & Risiko</th>
                      <th>Status Saat Ini</th>
                      <th style={{ textAlign: "right" }}>Aksi Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#1f1818" }}>{app.title}</div>
                          <div style={{ fontSize: 11, color: "#9c8a8a", fontFamily: "monospace" }}>{app.id}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "#f2eeea", color: "#5c4b4b" }}>
                            {app.category}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{app.requester}</td>
                        <td style={{ maxWidth: "340px", fontSize: 11.5, color: "#5c4b4b" }}>
                          <div>{app.detail}</div>
                          <div style={{ marginTop: 2, fontSize: 10.5, color: app.risk === "Tinggi" ? "#a8666a" : "#9a6100", fontWeight: 700 }}>
                            Risiko: {app.risk}
                          </div>
                        </td>
                        <td>
                          {app.status === "approved" && (
                            <span style={{ background: "#eaf5f1", color: "#0d6a55", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
                              Disetujui
                            </span>
                          )}
                          {app.status === "rejected" && (
                            <span style={{ background: "#faeeed", color: "#a8666a", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
                              Ditolak
                            </span>
                          )}
                          {app.status === "pending" && (
                            <span style={{ background: "#fcf1db", color: "#9a6100", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
                              Menunggu Review
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {app.status === "pending" ? (
                            <div style={{ display: "inline-flex", gap: 5 }}>
                              <button
                                onClick={() => handleApproval(app.id, "approved")}
                                style={{
                                  border: "1px solid #0d6a55",
                                  background: "#eaf5f1",
                                  color: "#0d6a55",
                                  borderRadius: 6,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => handleApproval(app.id, "rejected")}
                                style={{
                                  border: "1px solid #a8666a",
                                  background: "#faeeed",
                                  color: "#a8666a",
                                  borderRadius: 6,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApproval(app.id, "pending")}
                              style={{ border: "1px solid #e8e2de", background: "#fff", color: "#705e5e", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
                            >
                              Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================================================================
              MENU 7: MAKLON CONTROL ROOM & INVOICES
              ================================================================== */}
          {activeMenu === "maklon" && (
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Maklon Control Room — 333 Invoices & Operasional Pabrik</h3>
                  <p className={styles.panelDesc}>
                    Rekapitulasi 333 invoice riil bernilai Rp 11,01 Miliar dari operasional Haraka Erfi Kosmetindo.
                  </p>
                </div>

                <div className={styles.filterBar}>
                  <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input
                      type="text"
                      placeholder="Cari no invoice, pelanggan, produk…"
                      className={styles.searchInput}
                      value={invoiceSearch}
                      onChange={(e) => setInvoiceSearch(e.target.value)}
                    />
                  </div>

                  <select
                    style={{ padding: "7px 12px", fontSize: 12.5, border: "1px solid #e8e2de", borderRadius: 8, background: "#fff" }}
                    value={invoiceFilter}
                    onChange={(e) => setInvoiceFilter(e.target.value as "all" | "lunas" | "belum")}
                  >
                    <option value="all">Semua Status (333)</option>
                    <option value="lunas">Hanya Lunas (314)</option>
                    <option value="belum">Piutang / Pending (19)</option>
                  </select>
                </div>
              </div>

              {/* Invoices Table */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No. Invoice</th>
                      <th>Nama Pelanggan</th>
                      <th>Produk Maklon</th>
                      <th>Qty</th>
                      <th>Nilai (Termasuk PPN)</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.slice(0, 50).map((inv: Payment, idx: number) => (
                      <tr key={idx}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#a8666a" }}>
                            {inv.noInvoice || `INV-2026-${idx + 1}`}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{inv.custName || inv.customerId}</td>
                        <td>{inv.produk}</td>
                        <td style={{ fontWeight: 600 }}>{inv.qty ? `${inv.qty.toLocaleString("id-ID")} pcs` : "-"}</td>
                        <td style={{ fontWeight: 800, color: "#1f1818" }}>{formatRupiah(inv.nilai)}</td>
                        <td style={{ color: "#705e5e" }}>{inv.tanggal}</td>
                        <td>
                          {inv.isLunas ? (
                            <span style={{ background: "#eaf5f1", color: "#0d6a55", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
                              Lunas
                            </span>
                          ) : (
                            <span style={{ background: "#fcf1db", color: "#9a6100", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}>
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredInvoices.length > 50 && (
                <div style={{ textAlign: "center", padding: "14px 0", fontSize: 12, color: "#705e5e" }}>
                  Menampilkan 50 transaksi teratas dari total {filteredInvoices.length} invoice.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ====================================================================
          SLIDE-OVER TRANSCRIPT DRAWER
          ==================================================================== */}
      {selectedLead && (
        <div className={styles.drawerBackdrop} onClick={() => setSelectedLead(null)}>
          <div className={styles.drawerPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a8666a", textTransform: "uppercase" }}>
                  PROSPEK TANYA RARA
                </div>
                <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800 }}>{selectedLead.name}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#705e5e" }}>
                  WhatsApp: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedLead.whatsapp}</span>
                </p>
              </div>
              <button
                style={{
                  background: "#f2eeea",
                  border: "none",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setSelectedLead(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.drawerScroll}>
              {/* Specification Card */}
              <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9c8a8a", textTransform: "uppercase" }}>Produk Impian</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{selectedLead.summary.produk || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9c8a8a", textTransform: "uppercase" }}>Rencana MOQ</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{selectedLead.summary.jumlah || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9c8a8a", textTransform: "uppercase" }}>Estimasi Budget</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0d6a55" }}>{selectedLead.summary.budget || "-"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9c8a8a", textTransform: "uppercase" }}>Target Launching</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{selectedLead.summary.launching || "-"}</div>
                </div>
              </div>

              {/* Copy button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Transkrip Obrolan Rara</span>
                <button
                  onClick={() => copyTranscript(selectedLead)}
                  style={{
                    border: "1px solid #e8e2de",
                    background: "#fff",
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: copied ? "#0d6a55" : "#705e5e",
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Tersalin!" : "Salin Transkrip"}
                </button>
              </div>

              {/* Chat bubbles */}
              {selectedLead.transcript && selectedLead.transcript.length > 0 ? (
                selectedLead.transcript.map((msg, i) => (
                  <div
                    key={i}
                    className={`${styles.bubble} ${msg.role === "assistant" ? styles.bubbleRara : styles.bubbleClient}`}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.75, marginBottom: 2 }}>
                      {msg.role === "assistant" ? "Rara (AI Avatar)" : selectedLead.name}
                    </div>
                    {msg.content}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#705e5e", textAlign: "center", padding: "16px 0" }}>Belum ada transkrip.</div>
              )}
            </div>

            <div className={styles.drawerFoot}>
              <a
                href={`https://wa.me/${selectedLead.whatsapp.replace(/\D/g, "").startsWith("0") ? "62" + selectedLead.whatsapp.replace(/\D/g, "").slice(1) : selectedLead.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `Halo Kak ${selectedLead.name}, saya dari tim Sales Maklon Haraka Erfi. Terima kasih sudah berkonsultasi dengan Rara terkait produk ${selectedLead.summary.produk || "kosmetik"}. Boleh kami bantu kirimkan formulasi tester dan hitungan biayanya?`
                )}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 16px",
                  background: "#2f8f5b",
                  color: "#fff",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <MessageCircle size={15} /> Lanjutkan Follow-Up via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
