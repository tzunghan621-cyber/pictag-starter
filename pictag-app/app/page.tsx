"use client";

import { useEffect, useRef, useState } from "react";

const MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct";
const REVISION = "7e3e67edbbed1bf9888184d9df282b700a323964";
const PROMPT = "Describe this image in one short sentence.";

type LoadStatus = "idle" | "detecting" | "loading" | "ready" | "error";
type InferStatus = "idle" | "running" | "done" | "error";

type ProgressItem = {
  status?: string;
  file?: string;
  name?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type LoadedRefs = {
  processor: {
    apply_chat_template: (messages: unknown, opts?: unknown) => string;
    batch_decode: (ids: unknown, opts?: unknown) => string[];
    (text: string, image: unknown): Promise<{ input_ids: { dims: number[] } } & Record<string, unknown>>;
  };
  model: {
    generate: (opts: Record<string, unknown>) => Promise<unknown>;
  };
  RawImage: {
    fromBlob: (blob: Blob) => Promise<unknown>;
  };
};

export default function Home() {
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [progressMap, setProgressMap] = useState<Record<string, ProgressItem>>({});
  const [webgpuOk, setWebgpuOk] = useState<boolean | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [caption, setCaption] = useState<string>("");
  const [rawText, setRawText] = useState<string>("");
  const [promptText, setPromptText] = useState<string>("");
  const [inferTime, setInferTime] = useState<number | null>(null);
  const [inferStatus, setInferStatus] = useState<InferStatus>("idle");

  const [error, setError] = useState<string>("");

  const refs = useRef<LoadedRefs | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const detectAndLoad = async () => {
    setError("");
    setLoadStatus("detecting");

    const hasWebGPU =
      typeof navigator !== "undefined" &&
      (navigator as unknown as { gpu?: unknown }).gpu !== undefined;
    setWebgpuOk(hasWebGPU);

    if (!hasWebGPU) {
      setError(
        "WebGPU 不可用。pictag PoC 需要 WebGPU（Chrome / Edge 113+ / Safari 17.4+ / Firefox 141+）"
      );
      setLoadStatus("error");
      return;
    }

    setLoadStatus("loading");
    try {
      const tx = await import("@huggingface/transformers");
      const { AutoProcessor, AutoModelForVision2Seq, RawImage } = tx;

      const onProgress = (raw: unknown) => {
        const p = raw as ProgressItem;
        const key = p.file ?? p.name ?? p.status ?? "unknown";
        setProgressMap((prev) => ({ ...prev, [key]: p }));
      };

      const processor = (await AutoProcessor.from_pretrained(MODEL_ID, {
        revision: REVISION,
        progress_callback: onProgress,
      })) as unknown as LoadedRefs["processor"];

      const model = (await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
        revision: REVISION,
        dtype: "fp32",
        device: "webgpu",
        progress_callback: onProgress,
      })) as unknown as LoadedRefs["model"];

      refs.current = {
        processor,
        model,
        RawImage: RawImage as unknown as LoadedRefs["RawImage"],
      };
      setLoadStatus("ready");
    } catch (e) {
      setError(`載入失敗：${e instanceof Error ? e.message : String(e)}`);
      setLoadStatus("error");
    }
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageFile(file);
    setCaption("");
    setInferTime(null);
    setInferStatus("idle");
  };

  const generate = async () => {
    if (!refs.current || !imageFile) return;
    setInferStatus("running");
    setCaption("");
    setInferTime(null);
    try {
      const { processor, model, RawImage } = refs.current;

      const image = await RawImage.fromBlob(imageFile);
      const messages = [
        {
          role: "user",
          content: [{ type: "image" }, { type: "text", text: PROMPT }],
        },
      ];
      const text = processor.apply_chat_template(messages, {
        add_generation_prompt: true,
      });

      const inputs = await processor(text, image);
      const promptLen = inputs.input_ids.dims[inputs.input_ids.dims.length - 1];
      const inputsShape: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(inputs)) {
        const t = v as { dims?: number[]; type?: string };
        inputsShape[k] = { dims: t?.dims, type: t?.type };
      }
      console.log("[pictag debug] inputs shape:", inputsShape);
      (window as unknown as { __pictagInputs: unknown }).__pictagInputs = inputsShape;

      const t0 = performance.now();
      const generated = await model.generate({
        ...inputs,
        max_new_tokens: 256,
        do_sample: false,
        repetition_penalty: 1.1,
      });
      const t1 = performance.now();

      const decoded = processor.batch_decode(generated, {
        skip_special_tokens: true,
      });
      const fullText = decoded?.[0] ?? "";

      const onlyAssistant = stripPrompt(fullText, promptLen, processor, generated);
      console.log("[pictag debug] applied chat text:", text);
      console.log("[pictag debug] prompt token length:", promptLen);
      console.log("[pictag debug] raw fullText:", fullText);
      console.log("[pictag debug] stripped:", onlyAssistant);
      setPromptText(typeof text === "string" ? text : JSON.stringify(text));
      setRawText(fullText);
      setCaption(onlyAssistant);
      setInferTime(t1 - t0);
      setInferStatus("done");
    } catch (e) {
      setError(`推論失敗：${e instanceof Error ? e.message : String(e)}`);
      setInferStatus("error");
    }
  };

  const items = Object.values(progressMap);

  return (
    <main className="min-h-screen p-6 sm:p-10 max-w-3xl mx-auto bg-zinc-50 dark:bg-black">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">PicTag PoC</h1>
        <p className="text-sm text-zinc-500 mt-1">
          SmolVLM-256M-Instruct · fp32 · WebGPU · 純瀏覽器端
        </p>
      </header>

      <Section title="1. 模型載入">
        <p className="text-xs text-zinc-500 mb-2">
          revision: <code>{REVISION.slice(0, 12)}</code> · dtype: fp32 · device: webgpu
        </p>
        {loadStatus === "idle" && (
          <button
            onClick={detectAndLoad}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            載入模型（fp32，~1 GB，首次需下載）
          </button>
        )}
        {loadStatus === "detecting" && <p>偵測 WebGPU…</p>}
        {loadStatus === "loading" && (
          <div>
            <p className="mb-2">下載 / 編譯中…</p>
            <ul className="space-y-1 text-xs font-mono max-h-72 overflow-auto">
              {items.map((p, i) => (
                <li key={`${p.file ?? p.name ?? p.status ?? i}`} className="flex gap-2">
                  <span className="w-72 truncate">
                    {p.file ?? p.name ?? p.status ?? "?"}
                  </span>
                  <span>{(p.progress ?? 0).toFixed(0)}%</span>
                  {p.total ? (
                    <span className="text-zinc-400">
                      {fmtBytes(p.loaded ?? 0)} / {fmtBytes(p.total)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
        {loadStatus === "ready" && (
          <p className="text-green-600">
            ✓ 模型就緒（WebGPU: {webgpuOk ? "yes" : "no"}）
          </p>
        )}
        {loadStatus === "error" && (
          <p className="text-red-600 whitespace-pre-wrap">{error}</p>
        )}
      </Section>

      <Section title="2. 選圖">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
          disabled={loadStatus !== "ready"}
          className="text-sm"
        />
        {imageUrl && (
          <div className="mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="使用者選擇的圖片預覽"
              className="max-h-64 rounded border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        )}
      </Section>

      <Section title="3. 生成描述">
        <button
          onClick={generate}
          disabled={loadStatus !== "ready" || !imageFile || inferStatus === "running"}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inferStatus === "running" ? "推論中…" : "Generate Caption"}
        </button>
        {caption && (
          <pre className="mt-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded whitespace-pre-wrap text-sm">
            {caption}
          </pre>
        )}
        {rawText && (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-zinc-500">debug: raw fullText + applied chat text</summary>
            <div className="mt-1">
              <div className="text-zinc-400">applied chat text:</div>
              <pre data-testid="debug-prompt" className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded whitespace-pre-wrap break-all">{promptText}</pre>
              <div className="text-zinc-400 mt-2">raw fullText (no strip):</div>
              <pre data-testid="debug-raw" className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded whitespace-pre-wrap break-all">{rawText}</pre>
            </div>
          </details>
        )}
        {inferTime !== null && (
          <p className="text-xs text-zinc-500 mt-1">
            推論時間：{(inferTime / 1000).toFixed(2)} s
          </p>
        )}
        {inferStatus === "error" && (
          <p className="text-red-600 mt-2 whitespace-pre-wrap">{error}</p>
        )}
      </Section>

      <footer className="text-xs text-zinc-400 mt-10 leading-relaxed">
        所有處理在瀏覽器端、不上傳照片。
        <br />
        打開 DevTools Network 確認載入後的對外請求只指向 <code>huggingface.co</code> /{" "}
        <code>cdn-lfs.huggingface.co</code>（ORT WASM 可能來自 jsdelivr，第四關記錄）。
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function stripPrompt(
  fullText: string,
  _promptLen: number,
  _processor: unknown,
  _generated: unknown
): string {
  // SmolVLM chat template emits "Assistant:" before the response in decoded text.
  // Best-effort: take everything after the last "Assistant:" marker.
  const m = fullText.lastIndexOf("Assistant:");
  if (m >= 0) return fullText.slice(m + "Assistant:".length).trim();
  return fullText.trim();
}
