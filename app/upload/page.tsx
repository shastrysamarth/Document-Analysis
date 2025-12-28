// app/upload/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MoveRight } from "lucide-react";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number }
  | { status: "success"; documentId: string }
  | { status: "error"; message: string };

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Upload with progress using XHR (fetch doesn't reliably provide upload progress in browsers).
 */
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress(Math.max(1, Math.min(100, pct)));
    };

    xhr.onload = () => {
      try {
        const isOk = xhr.status >= 200 && xhr.status < 300;
        const json = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (!isOk) {
          const msg =
            json?.error || json?.message || `Upload failed with status ${xhr.status}`;
          reject(new Error(msg));
          return;
        }
        resolve(json);
      } catch (e) {
        reject(new Error("Failed to parse server response."));
      }
    };

    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.send(formData);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [state, setState] = React.useState<UploadState>({ status: "idle" });

  // PDF preview url
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    // only preview PDFs
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    // cleanup previous url
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const disabled = state.status === "uploading";

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setState({ status: "idle" });
  };

  const onClear = () => {
    setFile(null);
    setState({ status: "idle" });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onUpload = async () => {
    if (!file) {
      setState({ status: "error", message: "Please choose a file to upload." });
      return;
    }

    setState({ status: "uploading", progress: 1 });

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await uploadWithProgress("/api/ingest", form, (pct) => {
        setState({ status: "uploading", progress: pct });
      });

      if (!res?.documentId) {
        throw new Error("Upload succeeded but no documentId was returned.");
      }

      setState({ status: "success", documentId: res.documentId });
    } catch (err: any) {
      setState({
        status: "error",
        message: err?.message || "Upload failed.",
      });
    }
  };

  const isPdf =
    !!file &&
    (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  return (
    <main className="w-screen h-screen p-6">
      <div className="mx-auto h-full w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* LEFT: Preview */}
        <Card className="rounded-2xl h-full overflow-hidden">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {file ? (
                <span>
                  {file.name}{" "}
                  <span className="text-muted-foreground">
                    ({formatBytes(file.size)})
                  </span>
                </span>
              ) : (
                "Choose a PDF to preview it here."
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[calc(100%-96px)]">
            {!file ? (
              <div className="h-full rounded-xl border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                No file selected.
              </div>
            ) : !isPdf ? (
              <div className="h-full rounded-xl border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                Preview is currently available for PDFs only.
                <br />
                You selected: <span className="font-medium text-foreground">{file.name}</span>
              </div>
            ) : !previewUrl ? (
              <div className="h-full rounded-xl border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                Preparing preview…
              </div>
            ) : (
              <iframe
                title="PDF Preview"
                src={previewUrl}
                className="h-full w-full rounded-xl border"
              />
            )}
          </CardContent>
        </Card>

        {/* RIGHT: Upload controls */}
        <div className="flex flex-col items-center justify-center">
          <Card className="rounded-2xl w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Upload a document</CardTitle>
              <CardDescription>
                Ingest a file for OCR, schema discovery, validation, and review.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  type="file"
                  onChange={onPickFile}
                  disabled={disabled}
                />
                <div className="text-sm text-muted-foreground">
                  {file ? (
                    <span>
                      Selected:{" "}
                      <span className="font-medium text-foreground">{file.name}</span>{" "}
                      <span className="text-muted-foreground">
                        ({formatBytes(file.size)})
                      </span>
                    </span>
                  ) : (
                    <span>No file selected.</span>
                  )}
                </div>
              </div>

              {state.status === "uploading" && (
                <div className="space-y-2">
                  <Progress value={state.progress} />
                  <div className="text-xs text-muted-foreground">
                    Uploading… {state.progress}%
                  </div>
                </div>
              )}

              {state.status === "error" && (
                <Alert variant="destructive">
                  <AlertTitle>Upload failed</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}

              {state.status === "success" && (
                <Alert>
                  <AlertTitle>Ingested successfully</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <div>
                      Document ID:{" "}
                      <span className="font-mono text-sm">{state.documentId}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => router.push(`/review?doc=${state.documentId}`)}
                      >
                        Review this document
                      </Button>
                      <Button type="button" variant="secondary" onClick={onClear}>
                        Upload another
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={onUpload}
                  disabled={disabled || !file}
                >
                  {state.status === "uploading" ? "Uploading…" : "Upload"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClear}
                  disabled={disabled}
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Tip: Start with PDFs or images. Your{" "}
                <code className="font-mono">/api/ingest</code> route will run OCR +
                schema discovery + embeddings and set status to{" "}
                <code className="font-mono">REVIEW_REQUIRED</code>.
              </div>
            </CardContent>
          </Card>

          <div className="mt-4">
            <Button type="button" onClick={() => router.push("/review")}>
              Review Documents <MoveRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
