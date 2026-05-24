'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSessionUser } from '@/components/demo-session-provider'
import { canManageOrgSettings } from '@/lib/settings-access-policy'
import type { MarketingNewsPost } from '@/lib/marketing-site/news-types'
import { formatNewsDate, newsPostPath } from '@/lib/marketing-site/news-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

type FormState = {
  title: string
  date: string
  excerpt: string
  bodyHtml: string
  image: string
  published: boolean
}

const emptyForm = (): FormState => ({
  title: '',
  date: formatNewsDate(new Date().toISOString()),
  excerpt: '',
  bodyHtml: '<p></p>',
  image: '',
  published: true,
})

export function MarketingNewsAdmin() {
  const { user, actingUserHeaders } = useSessionUser()
  const allowed = canManageOrgSettings(user)
  const [posts, setPosts] = useState<MarketingNewsPost[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/marketing/news?admin=1', { headers: { ...actingUserHeaders } })
    const data = (await res.json()) as { posts?: MarketingNewsPost[]; error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Failed to load news')
    setPosts(data.posts ?? [])
  }, [actingUserHeaders])

  useEffect(() => {
    if (!allowed) return
    loadPosts().catch((e) => setMessage({ type: 'err', text: String(e) }))
  }, [allowed, loadPosts])

  if (!allowed) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access restricted</AlertTitle>
        <AlertDescription>
          Website news is managed by HR &amp; Admin department managers only.
        </AlertDescription>
      </Alert>
    )
  }

  function startEdit(post: MarketingNewsPost) {
    setEditingId(post.id)
    setForm({
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      bodyHtml: post.bodyHtml,
      image: post.image ?? '',
      published: post.published,
    })
    setMessage(null)
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm())
    setMessage(null)
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/marketing/news/upload', {
        method: 'POST',
        headers: { ...actingUserHeaders },
        body: fd,
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setForm((f) => ({ ...f, image: data.url ?? '' }))
      setMessage({ type: 'ok', text: 'Image uploaded.' })
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const payload = {
        title: form.title,
        date: form.date,
        excerpt: form.excerpt,
        bodyHtml: form.bodyHtml,
        image: form.image || undefined,
        published: form.published,
        publishedAt: new Date().toISOString(),
      }
      const url = editingId ? `/api/marketing/news/${editingId}` : '/api/marketing/news'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', ...actingUserHeaders },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      await loadPosts()
      resetForm()
      setMessage({ type: 'ok', text: editingId ? 'News updated.' : 'News published.' })
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this news item?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/marketing/news/${id}`, {
        method: 'DELETE',
        headers: { ...actingUserHeaders },
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Delete failed')
      }
      await loadPosts()
      if (editingId === id) resetForm()
      setMessage({ type: 'ok', text: 'News deleted.' })
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Delete failed' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit news' : 'Add news'}</CardTitle>
          <CardDescription>
            New items appear on the public News page and the home page “Latest Updates” section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="news-title">Title</Label>
              <Input
                id="news-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-date">Display date</Label>
              <Input
                id="news-date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                placeholder="e.g. 10 Jun 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-excerpt">Short summary (card text)</Label>
              <Textarea
                id="news-excerpt"
                rows={3}
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-body">Full article (HTML allowed)</Label>
              <Textarea
                id="news-body"
                rows={8}
                value={form.bodyHtml}
                onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="news-image">Featured image</Label>
              <Input
                id="news-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => handleImageUpload(e.target.files?.[0])}
              />
              {form.image && (
                <p className="text-sm text-muted-foreground break-all">Image: {form.image}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="news-published"
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v === true }))}
              />
              <Label htmlFor="news-published">Published (visible on website)</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : editingId ? 'Update news' : 'Publish news'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={busy}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
          {message && (
            <Alert className="mt-4" variant={message.type === 'err' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All news items</CardTitle>
          <CardDescription>{posts.length} item(s) in the news feed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.length === 0 && <p className="text-sm text-muted-foreground">No news yet.</p>}
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-muted-foreground">
                  {post.date} · {post.published ? 'Published' : 'Draft'} ·{' '}
                  <a
                    href={newsPostPath(post.slug)}
                    className="text-primary underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => startEdit(post)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(post.id)}
                  disabled={busy}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
