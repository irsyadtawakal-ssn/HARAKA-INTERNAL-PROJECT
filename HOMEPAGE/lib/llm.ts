import { getRaraConfig, type RaraConfig } from "./raraConfig";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type LlmOverride = Partial<RaraConfig["llm"]>;

function resolveConfig(override?: LlmOverride) {
  const isTest = process.env.NODE_ENV === "test";
  const cfg = isTest ? undefined : getRaraConfig().llm;
  const baseUrl = (override?.baseUrl ?? cfg?.baseUrl ?? process.env.LLM_BASE_URL ?? "").replace(/\/$/, "");
  const apiKey =
    override?.apiKey && override.apiKey !== "***MASKED***"
      ? override.apiKey
      : cfg?.apiKey || process.env.LLM_API_KEY || "";
  const model = override?.model ?? cfg?.model ?? process.env.LLM_MODEL ?? "";
  const fallbackModel = override?.fallbackModel ?? cfg?.fallbackModel ?? "";
  const temperature = override?.temperature ?? cfg?.temperature ?? 0.45;
  const maxTokens = override?.maxTokens ?? cfg?.maxTokens ?? 320;
  return { base: baseUrl, key: apiKey, model, fallbackModel, temperature, maxTokens };
}

/** Smart local knowledge responder when LLM API key is not yet filled in .env or dashboard */
export function buildKnowledgeFallbackReply(messages: ChatMessage[]): string {
  const cfg = getRaraConfig();
  const h = cfg.persona.visitorHonorific || "Kak";
  const lastUser = ([...messages].reverse().find((m) => m.role === "user")?.content || "").toLowerCase();
  const userTurnCount = messages.filter((m) => m.role === "user").length;

  // Keyword answers only fit short factual questions; advice, trends or comparisons need the real AI or a person.
  const openEnded = /rekomend|rekomen|saran|tren|trend|cocok|bagus|terbaik|laris|bandingk|beda|kenapa|mengapa|gimana cara|bagaimana cara/.test(lastUser);
  const handoff = `Maaf ${h}, untuk pertanyaan ini ${cfg.persona.avatarName} belum bisa menjawab dengan detail sekarang. Supaya jawabannya tepat, tim ${cfg.knowledge.company.brandName} siap bantu langsung lewat tombol WhatsApp di bawah ya.
[[LEAD]]`;

  let answer = "";
  if (openEnded) {
    answer = handoff;
  } else if (lastUser.includes("moq") || lastUser.includes("minimal") || lastUser.includes("jumlah")) {
    answer = `Di ${cfg.knowledge.company.brandName}, jumlah pemesanan minimum atau MOQ sangat fleksibel ${h}, mulai dari 1.000 pcs untuk mempermudah perintis brand baru dan UMKM. Kami juga menyediakan opsi simulasi awal 500 pcs maupun kapasitas besar di atas 5.000 pcs. Kira-kira ${h} berencana membuat produk kategori apa?`;
  } else if (lastUser.includes("bpom") || lastUser.includes("halal") || lastUser.includes("izin") || lastUser.includes("haki") || lastUser.includes("legal")) {
    answer = `Betul ${h}, seluruh pengurusan notifikasi resmi BPOM, sertifikasi Halal MUI atau BPJPH, hingga pendaftaran merek HAKI didampingi penuh oleh tim regulasi kami. Pabrik kami juga sudah berstandar CPKB dan ISO 22716 sehingga produk ${h} seratus persen legal dan aman dipasarkan. Apakah ${h} sudah punya konsep produk yang ingin didaftarkan?`;
  } else if (lastUser.includes("lama") || lastUser.includes("waktu") || lastUser.includes("proses") || lastUser.includes("estimasi") || lastUser.includes("bulan")) {
    answer = `Estimasi waktu total dari persetujuan sampel formula hingga produk siap jual adalah sekitar 3 bulan ${h}, mencakup registrasi BPOM, kemasan, dan produksi massal di pabrik CPKB kami. Untuk sampel awalnya sendiri bisa direvisi bersama tim R&D sampai ${h} cocok seratus persen. Target launching produk ${h} rencananya bulan apa?`;
  } else if (lastUser.includes("harga") || lastUser.includes("biaya") || lastUser.includes("modal") || lastUser.includes("budget")) {
    answer = `Untuk rincian harga per pcs disesuaikan dengan pilihan bahan aktif, tekstur, dan kemasan ${h}, tapi tenang saja karena sistem satu pintu kami sangat hemat untuk brand baru. Supaya tim R&D dan sales kami bisa kirimkan hitungan estimasi dan sampelnya, ${h} bisa langsung chat tim kami lewat tombol WhatsApp di bawah ya.\n[[LEAD]]`;
  } else if (lastUser.includes("sampel") || lastUser.includes("sample") || lastUser.includes("formula") || lastUser.includes("revisi")) {
    answer = `Tim R&D ${cfg.knowledge.company.brandName} siap meracik sampel formula khusus sesuai bahan aktif, tekstur, dan aroma impian ${h}, dan sampelnya bisa direvisi sampai benar-benar pas. Saat ini ${h} tertarik mengembangkan produk skincare, bodycare, haircare, atau parfum?`;
  } else if (lastUser.includes("produk") || lastUser.includes("kategori") || lastUser.includes("bisa bikin") || lastUser.includes("apa saja")) {
    answer = `Kami melayani maklon lengkap mulai dari Skincare seperti serum, sunscreen, moisturizer, dan cleanser, lalu Bodycare, Haircare, hingga Parfum EDP dan Body Mist ${h}. Semuanya diproduksi di pabrik CPKB kami di Bekasi sejak 2015. Produk mana yang paling ingin ${h} luncurkan lebih dulu?`;
  } else {
    answer = handoff;
  }

  if (userTurnCount >= cfg.leadRules.triggerAfterTurns && !answer.includes("[[LEAD]]")) {
    answer += ` Jika ${h} ingin kami hitungkan estimasi biaya dan kirimkan sampel formulanya, langsung chat tim kami lewat tombol WhatsApp di bawah ya.\n[[LEAD]]`;
  }
  return answer;
}

/** Builds an error carrying the endpoint's own message (e.g. 9Router's "model not found") instead of a bare status. */
async function llmError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  let detail = text.slice(0, 300);
  try {
    const json = JSON.parse(text);
    detail = json?.error?.message || json?.error || json?.message || detail;
  } catch {
    // body is not JSON, keep the raw text
  }
  return new Error(`LLM request failed: ${res.status}${detail ? ` — ${String(detail)}` : ""}`);
}

/** Calls an OpenAI-compatible chat endpoint and returns the reply as a plain-text stream. */
export async function streamChat(
  messages: ChatMessage[],
  system: string,
  override?: LlmOverride
): Promise<ReadableStream<Uint8Array>> {
  const { base, key, model, fallbackModel, temperature, maxTokens } = resolveConfig(override);
  const encoder = new TextEncoder();

  // If no API key or model is set yet, stream from the intelligent local knowledge responder so Rara never breaks
  if (!base || !key || !model) {
    const fallbackText = buildKnowledgeFallbackReply(messages);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fallbackText));
        controller.close();
      },
    });
  }

  let res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      stream: true,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if ((!res.ok || !res.body) && fallbackModel && fallbackModel !== model) {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: fallbackModel,
        stream: true,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
  }

  if (!res.ok || !res.body) throw await llmError(res);

  const decoder = new TextDecoder();
  let buffer = "";
  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.trim();
          if (!data.startsWith("data:")) continue;
          const payload = data.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const text = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // ignore keep-alive or partial lines
          }
        }
      },
    })
  );
}

/** Lists model ids from 9Router's OpenAI-compatible `/models` route. */
export async function listModels(override?: LlmOverride): Promise<string[]> {
  const { base, key } = resolveConfig(override);
  if (!base) throw new Error("Endpoint Base URL belum diisi");
  if (!key) throw new Error("API Key belum diisi");

  const res = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Gagal mengambil daftar model — ${(await llmError(res)).message.replace("LLM request failed: ", "")}`);
  const json = await res.json();
  const data: unknown[] = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((m) => (m && typeof m === "object" && "id" in m ? String((m as { id: unknown }).id) : ""))
    .filter(Boolean)
    .sort();
}

/** Reads a completion body; some 9Router models answer with SSE (`data: {...}`) even when not asked to stream. */
function readCompletionText(body: string): string {
  if (!body.trimStart().startsWith("data:")) {
    return JSON.parse(body).choices?.[0]?.message?.content ?? "";
  }
  let text = "";
  for (const line of body.split("\n")) {
    const payload = line.trim().replace(/^data:/, "").trim();
    if (!line.trim().startsWith("data:") || !payload || payload === "[DONE]") continue;
    try {
      const choice = JSON.parse(payload).choices?.[0];
      text += choice?.delta?.content ?? choice?.message?.content ?? "";
    } catch {
      // ignore keep-alive or partial lines
    }
  }
  return text;
}

/** Non-streaming completion, used for structured summaries and connection testing. */
export async function completeChat(
  messages: ChatMessage[],
  system: string,
  override?: LlmOverride
): Promise<string> {
  const { base, key, model, fallbackModel, temperature, maxTokens } = resolveConfig(override);
  if (!base || !key) {
    return buildKnowledgeFallbackReply(messages);
  }
  if (!model) throw new Error("Model utama 9Router belum dipilih. Klik \"Ambil daftar model\" lalu pilih modelnya.");

  let res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });

  if (!res.ok && fallbackModel && fallbackModel !== model) {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: fallbackModel,
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
  }

  if (!res.ok) throw await llmError(res);
  return readCompletionText(await res.text());
}
