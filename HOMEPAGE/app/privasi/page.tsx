import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Kebijakan Privasi · Tanya Rara" };

export default function Privasi() {
  return (
    <main className="legal">
      <h1>Kebijakan Privasi</h1>
      <p>Halaman ini menjelaskan data apa yang dikumpulkan asisten AI &ldquo;Rara&rdquo; milik PT Haraka Erfi dan untuk apa data itu dipakai.</p>
      <h2>Data yang kami simpan</h2>
      <ul>
        <li><b>Obrolan tanpa identitas.</b> Isi percakapan disimpan tanpa nama, dan nomor telepon otomatis disamarkan. Data ini dipakai untuk memperbaiki jawaban Rara, lalu dihapus setelah 90 hari.</li>
        <li><b>Data kontak yang Kakak kirim.</b> Nama, nomor WhatsApp, ringkasan kebutuhan produk, dan percakapan terkait disimpan saat Kakak menekan &ldquo;Kirim&rdquo;. Data ini hanya dipakai tim Haraka Erfi untuk menghubungi Kakak soal layanan maklon.</li>
      </ul>
      <h2>Layanan pihak ketiga</h2>
      <p>Jawaban Rara diproses oleh penyedia model AI, suara dibuat oleh ElevenLabs, dan suara Kakak diubah menjadi teks oleh fitur pengenal suara bawaan browser.</p>
      <h2>Hak Kakak</h2>
      <p>Kakak bisa meminta data dihapus kapan saja melalui WhatsApp 0831-3703-0656 atau email info@harakamultifaedah.co.id.</p>
      <p><Link href="/">Kembali ke Rara</Link></p>
    </main>
  );
}
