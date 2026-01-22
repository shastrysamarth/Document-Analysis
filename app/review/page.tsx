import Link from "next/link"
import { db } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, Database, CheckCircle2, AlertCircle, Upload } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Chat } from "@/components/chat"

type PageProps = {
  searchParams: Promise<{ doc?: string }>
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const statusLower = status.toLowerCase()
  if (statusLower.includes("complete") || statusLower.includes("success")) return "default"
  if (statusLower.includes("pending") || statusLower.includes("processing")) return "secondary"
  if (statusLower.includes("error") || statusLower.includes("failed")) return "destructive"
  return "outline"
}

function getStatusIcon(status: string) {
  const statusLower = status.toLowerCase()
  if (statusLower.includes("complete") || statusLower.includes("success")) return <CheckCircle2 className="h-4 w-4" />
  if (statusLower.includes("error") || statusLower.includes("failed")) return <AlertCircle className="h-4 w-4" />
  return <Clock className="h-4 w-4" />
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const { doc } = await searchParams

  // ---------
  // NO doc param: list all docs
  // ---------
  if (!doc) {
    const docs = await db.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        filename: true,
        status: true,
        createdAt: true,
      },
    })

    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-balance">Document Review</h1>
              <p className="text-muted-foreground">Manage and review your uploaded documents</p>
            </div>

            <Button asChild>
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Documents
              </CardTitle>
              <CardDescription>
                {docs.length} {docs.length === 1 ? "document" : "documents"} in your library
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-48">
                          <div className="flex flex-col items-center justify-center gap-2 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                            <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
                            <p className="text-xs text-muted-foreground">Upload your first document to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      docs.map((d) => (
                        <TableRow key={d.id} className="group">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {d.filename}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(d.status)} className="gap-1">
                              {getStatusIcon(d.status)}
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/review?doc=${encodeURIComponent(d.id)}`}>View Details</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // ---------
  // doc param present: show single doc
  // ---------
  const record = await db.document.findUnique({
    where: { id: doc },
    include: {
      embeddings: { select: { id: true } },
    },
  })

  if (!record) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Document Not Found
              </CardTitle>
              <CardDescription>The document you're looking for doesn't exist or has been removed.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/review">Back to Documents</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link href="/review">← Back</Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">{record.filename}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(record.status)} className="gap-1">
                {getStatusIcon(record.status)}
                {record.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created{" "}
                {new Date(record.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            {/* Metadata Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Document Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Document ID</p>
                    <p className="font-mono text-sm">{record.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Embeddings</p>
                    <p className="text-sm">
                      {record.embeddings.length} embedding{record.embeddings.length !== 1 ? "s" : ""} generated
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Schema Card */}
            <Card>
              <CardHeader>
                <CardTitle>Schema</CardTitle>
                <CardDescription>Document structure and metadata schema</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                  {JSON.stringify(record.schema, null, 2)}
                </pre>
              </CardContent>
            </Card>

            {/* Extracted Data Card (if present) */}
            {"extracted" in record && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Data</CardTitle>
                  <CardDescription>Information extracted from the document</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed">
                    {JSON.stringify((record as any).extracted, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Document Text Card */}
            <Card>
              <CardHeader>
                <CardTitle>Document Text</CardTitle>
                <CardDescription>Full text content from the document</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed whitespace-pre-wrap">
                  {record.text}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Chat Card */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Chat documentId={record.id} />
          </div>
        </div>
      </div>
    </main>
  )
}
