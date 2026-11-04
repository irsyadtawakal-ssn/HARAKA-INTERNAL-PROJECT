"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Bot,
  Clapperboard,
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
} from "lucide-react";
import styles from "./dashboard.module.css";
import RaraSettingsTab from "@/components/dashboard/RaraSettingsTab";
import ContentStudioTab from "@/components/dashboard/ContentStudioTab";
import AssetLibraryTab from "@/components/dashboard/AssetLibraryTab";

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
  // Tab yang tersambung ke backend Factory tidak memakai filter funnel/Export CSV milik data leads.
  const factoryTab = activeMenu === "content_studio" || activeMenu === "asset_library";

  // Funnel Filter: "all" | "A" (Pemula) | "B" (Existing)
  const [selectedFunnel, setSelectedFunnel] = useState<"all" | "A" | "B">("all");

  // Tanya Rara Leads state
  const [leadSearch, setLeadSearch] = useState("");
  const [leadCategory, setLeadCategory] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copied, setCopied] = useState(false);
  const [contactedMap, setContactedMap] = useState<Record<string, boolean>>({});

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
              <span>Studio Konten</span>
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
              {activeMenu === "content_studio" && "Studio Konten"}
              {activeMenu === "asset_library" && "Asset Library"}
              {activeMenu === "approvals" && "Matriks Approval & Pagar Keamanan (Blueprint §10 & §11)"}
              {activeMenu === "maklon" && "Maklon Control Room: Transaksi & Pabrik"}
            </h2>

            {/* Funnel Switcher (Blueprint Section 5) — hanya untuk data leads, bukan tab Factory */}
            {!factoryTab && (
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
            )}
          </div>

          {!factoryTab && (
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
          )}
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
          {activeMenu === "content_studio" && <ContentStudioTab />}

          {/* ==================================================================
              MENU 5: ASSET LIBRARY PABRIK (MEDIA & B-ROLL MAKLON)
              ================================================================== */}
          {activeMenu === "asset_library" && <AssetLibraryTab />}

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
