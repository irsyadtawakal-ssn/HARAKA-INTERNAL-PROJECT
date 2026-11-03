import { NextResponse } from "next/server";
import { getLeads, type LeadRow } from "@/lib/supabase";
import fs from "fs";
import path from "path";

type LeadSeed = LeadRow & { created_at?: string };

const SEED_LEADS: LeadSeed[] = [
  {
    name: "Siti Rahmawati (Brand Nawal Skincare)",
    whatsapp: "081289123456",
    summary: {
      produk: "Sunscreen Serum SPF 50 PA++++",
      jumlah: "1.000 pcs (MOQ pemula)",
      budget: "Rp 35.000.000",
      launching: "Q1 2027",
    },
    created_at: "2026-11-02T16:45:00.000Z",
    transcript: [
      { role: "assistant", content: "Halo Kak, aku Rara. Ceritakan produk impianmu." },
      { role: "user", content: "Halo Rara, aku mau maklon sunscreen serum ringan non-whitecast untuk brand baru." },
      { role: "assistant", content: "Bagus sekali Kak! Formula sunscreen serum Haraka Erfi water-based, cepat meresap, dan lolos uji in-vitro SPF 50. Berapa rencana jumlah produksinya?" },
      { role: "user", content: "Rencana 1.000 pcs dulu untuk tes pasar. Bisa urus BPOM dan Halal juga kan?" },
      { role: "assistant", content: "Tentu bisa Kak! Haraka Erfi mengurus seluruh legalitas BPOM, sertifikasi Halal, dan HKI merek Kakak dari awal sampai siap jual. Boleh minta nama dan nomor WhatsApp untuk kami kirimkan sampel formulanya?" },
      { role: "user", content: "Siti Rahmawati, 081289123456" },
      { role: "assistant", content: "Terima kasih Kak Siti! Tim kami akan segera menghubungi lewat WhatsApp untuk pengiriman sample." }
    ],
    session_id: "sess_rara_01",
  },
  {
    name: "Kevin Pratama (GlowLab)",
    whatsapp: "085712348899",
    summary: {
      produk: "Brightening Face Serum Niacinamide 10%",
      jumlah: "3.000 pcs",
      budget: "Rp 75.000.000",
      launching: "Desember 2026",
    },
    created_at: "2026-11-02T14:20:00.000Z",
    transcript: [
      { role: "assistant", content: "Halo Kak, aku Rara. Ceritakan produk impianmu." },
      { role: "user", content: "Siang, kami sedang mencari pabrik maklon untuk upgrade formula serum niacinamide 10% + alpha arbutin." },
      { role: "assistant", content: "Halo Kak Kevin! Formula pencerah kami menggunakan Encapsulated Niacinamide sehingga stabil dan minim iritasi. Ada target waktu launching?" },
      { role: "user", content: "Target produksi batch pertama 3.000 botol sebelum Desember 2026." },
      { role: "assistant", content: "Siap, estimasi waktu formulasi dan BPOM express kami bisa selesai tepat waktu. Boleh konfirmasi kontak untuk diskusi MoU dan sampel batch?" }
    ],
    session_id: "sess_rara_02",
  },
  {
    name: "Dinda Ayu Kusuma",
    whatsapp: "081398765432",
    summary: {
      produk: "Lip Velvet Tint & Hydrating Lip Oil",
      jumlah: "2.000 pcs (2 shade)",
      budget: "Rp 50.000.000",
      launching: "Januari 2027",
    },
    created_at: "2026-11-01T11:15:00.000Z",
    transcript: [
      { role: "assistant", content: "Halo Kak, aku Rara. Ceritakan produk impianmu." },
      { role: "user", content: "Mau tanya apakah Haraka bisa maklon produk bibir seperti lip velvet tint stain tahan lama?" },
      { role: "assistant", content: "Bisa banget Kak Dinda! Laboratorium kami memiliki spesialisasi tekstur velvet matte yang tidak membuat bibir kering, diperkaya Vitamin E dan Jojoba Oil." }
    ],
    session_id: "sess_rara_03",
  },
  {
    name: "Ahmad Fauzi (CV Barakah Medika)",
    whatsapp: "082144556677",
    summary: {
      produk: "Gentle Facial Cleanser Calendula Low pH",
      jumlah: "5.000 pcs",
      budget: "Rp 90.000.000",
      launching: "Q1 2027",
    },
    created_at: "2026-10-31T09:30:00.000Z",
    transcript: [
      { role: "assistant", content: "Halo Kak, aku Rara. Ceritakan produk impianmu." },
      { role: "user", content: "Perlu cleanser foaming SLS-free dengan ekstrak calendula asli untuk klinik kecantikan kami." },
      { role: "assistant", content: "Formula gentle cleanser low pH 5.5 kami sudah tersertifikasi dermatologically tested dan bebas SLS/paraben." }
    ],
    session_id: "sess_rara_04",
  },
  {
    name: "Clarissa Tan (Botanica)",
    whatsapp: "087811223344",
    summary: {
      produk: "Barrier Repair Moisturizer Gel Ceramide",
      jumlah: "1.000 pcs",
      budget: "Rp 40.000.000",
      launching: "Februari 2027",
    },
    created_at: "2026-10-30T17:00:00.000Z",
    transcript: [
      { role: "assistant", content: "Halo Kak, aku Rara. Ceritakan produk impianmu." },
      { role: "user", content: "Halo Rara, untuk moisturizer 5x Ceramide MOQ berapa ya?" },
      { role: "assistant", content: "MOQ formula inovasi kami mulai dari 1.000 pcs dengan kemasan jar atau pump airless." }
    ],
    session_id: "sess_rara_05",
  }
];

export async function GET() {
  try {
    // 1. Live Leads from Supabase + Local Rara Leads + Seed fallback
    let liveLeads = await getLeads();
    const dataDir = path.join(process.cwd(), "data");
    let localRaraLeads: LeadSeed[] = [];
    try {
      const localLeadsPath = path.join(dataDir, "rara-leads.json");
      if (fs.existsSync(localLeadsPath)) {
        localRaraLeads = JSON.parse(fs.readFileSync(localLeadsPath, "utf8"));
      }
    } catch {}

    if (!liveLeads || liveLeads.length === 0) {
      liveLeads = [...localRaraLeads, ...SEED_LEADS];
    } else if (localRaraLeads.length > 0) {
      liveLeads = [...localRaraLeads, ...liveLeads];
    }

    // 2. Maklon Control Room Data
    type RawPayment = {
      nilai?: number | string;
      status?: string;
      tglLunas?: string;
      customerId?: string;
      [key: string]: unknown;
    };
    type RawCustomer = { nama?: string; [key: string]: unknown };
    type RawHistoricalLead = { count?: number; [key: string]: unknown };

    let payments: Record<string, RawPayment> = {};
    let customers: Record<string, RawCustomer> = {};
    let historicalLeads: Record<string, RawHistoricalLead> = {};

    try {
      if (fs.existsSync(path.join(dataDir, "payments.json"))) {
        payments = JSON.parse(fs.readFileSync(path.join(dataDir, "payments.json"), "utf8"));
      }
      if (fs.existsSync(path.join(dataDir, "customers.json"))) {
        customers = JSON.parse(fs.readFileSync(path.join(dataDir, "customers.json"), "utf8"));
      }
      if (fs.existsSync(path.join(dataDir, "leads.json"))) {
        historicalLeads = JSON.parse(fs.readFileSync(path.join(dataDir, "leads.json"), "utf8"));
      }
    } catch (e) {
      console.error("Failed to read JSON data:", e);
    }

    // Compute Payment Metrics
    let totalNilai = 0;
    let totalLunas = 0;
    const paymentList = Object.entries(payments).map(([id, p]) => {
      const val = Number(p.nilai) || 0;
      totalNilai += val;
      const isLunas = p.status === "lunas" || !!p.tglLunas;
      if (isLunas) {
        totalLunas += val;
      }
      const cid = String(p.customerId || "");
      return {
        id,
        ...p,
        isLunas,
        custName: customers[cid]?.nama || cid,
      };
    });

    const piutang = totalNilai - totalLunas;

    // Compute Historical Leads total
    let totalHistoricalLeads = 0;
    for (const m in historicalLeads) {
      totalHistoricalLeads += historicalLeads[m]?.count || 0;
    }

    // 3. Avatar Manifest / Clips Info
    let manifest: { mode?: string; clips?: Record<string, string[]> } | null = null;
    try {
      const manifestPath = path.join(process.cwd(), "public", "avatar", "manifest.json");
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      }
    } catch {}

    return NextResponse.json({
      success: true,
      metrics: {
        totalInboundLeads: totalHistoricalLeads + liveLeads.length,
        liveRaraLeadsCount: liveLeads.length,
        historicalLeadsCount: totalHistoricalLeads,
        totalRevenue: totalNilai,
        totalLunas,
        piutang,
        totalInvoices: paymentList.length,
        lunasPercent: ((totalLunas / (totalNilai || 1)) * 100).toFixed(1),
        totalCustomers: Object.keys(customers).length,
      },
      liveLeads,
      payments: paymentList.slice(0, 100), // top 100 latest
      historicalLeads,
      customers,
      avatarInfo: {
        mode: manifest?.mode || "clips",
        states: manifest?.clips ? Object.keys(manifest.clips) : ["idle", "listening", "thinking", "speaking"],
        clipCount: manifest?.clips
          ? Object.values(manifest.clips).reduce((a, b) => a + b.length, 0)
          : 7,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
