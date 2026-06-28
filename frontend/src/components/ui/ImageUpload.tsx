import { ImagePlus, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { mediaApi, type UploadedImage } from '../../features/sqps/api/mediaApi'
import { Button } from './Button'

export function ImageUpload({ purpose = 'profile', onUploaded }: { purpose?: 'profile' | 'evidence'; onUploaded: (image: UploadedImage) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  const upload = async () => {
    if (!file) return
    setUploading(true); setError('')
    try { onUploaded(await mediaApi.uploadImage(file, purpose, setProgress)); setFile(null) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed.') }
    finally { setUploading(false) }
  }

  return <div className="space-y-3"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 hover:border-aqua"><ImagePlus className="text-ocean" /><span className="text-sm"><strong className="block">Choose an image</strong><span className="text-slate-500">JPEG, PNG, or WebP; maximum 5 MB</span></span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{file && <p className="truncate text-sm text-slate-600">{file.name}</p>}{uploading && <div role="progressbar" aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-aqua" style={{ width: `${progress}%` }} /></div>}{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="button" variant="secondary" icon={<UploadCloud size={17} />} disabled={!file || uploading} onClick={upload}>{uploading ? `Uploading ${progress}%` : 'Upload image'}</Button></div>
}
