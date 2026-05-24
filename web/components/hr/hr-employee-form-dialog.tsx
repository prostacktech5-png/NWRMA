'use client'

import { useEffect, useState } from 'react'
import { ImageIcon, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { departmentNames } from '@/lib/erp-formatting'
import { resolveHrEmployeePhotoSrc } from '@/lib/hr-profile-image-client'
import type { Department } from '@/lib/types'

export type HrEmployeeFormValues = {
  fullName: string
  roleTitle: string
  department: Department
  employmentType: 'employee' | 'volunteer'
  phone: string
  email: string
  dateOfBirth: string
  employmentStatus: 'active' | 'on_leave' | 'terminated'
  salaryAmount: string
  stipendAmount: string
  nationalId: string
  profileImageUrl: string
  hiredAt: string
  emergencyName: string
  emergencyPhone: string
}

export type HrEmployeeFormSubmit = {
  values: HrEmployeeFormValues
  profileImageFile: File | null
  removeProfileImage: boolean
}

const DEPTS: Department[] = [
  'hydrological',
  'boreholes',
  'financial',
  'hr',
  'compliance',
]

export function emptyEmployeeForm(): HrEmployeeFormValues {
  return {
    fullName: '',
    roleTitle: '',
    department: 'hr',
    employmentType: 'employee',
    phone: '',
    email: '',
    dateOfBirth: '',
    employmentStatus: 'active',
    salaryAmount: '',
    stipendAmount: '',
    nationalId: '',
    profileImageUrl: '',
    hiredAt: new Date().toISOString().slice(0, 10),
    emergencyName: '',
    emergencyPhone: '',
  }
}

export function HrEmployeeFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  employeeId,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  initial: HrEmployeeFormValues
  /** Set when editing so existing photo can load from the API. */
  employeeId?: string | null
  onSubmit: (payload: HrEmployeeFormSubmit) => Promise<void>
}) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageHint, setImageHint] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(initial)
    setProfileFile(null)
    setRemoveImage(false)
    setImageHint(null)
    if (employeeId && initial.profileImageUrl) {
      setPreviewUrl(resolveHrEmployeePhotoSrc(employeeId, initial.profileImageUrl) ?? null)
    } else {
      setPreviewUrl(null)
    }
  }, [open, initial, employeeId])

  useEffect(() => {
    if (!profileFile) return
    const url = URL.createObjectURL(profileFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [profileFile])

  const handleOpen = (next: boolean) => {
    onOpenChange(next)
  }

  const handleProfileFile = (file: File | undefined) => {
    setImageHint(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageHint('Please choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageHint('Image must be 2 MB or smaller.')
      return
    }
    setProfileFile(file)
    setRemoveImage(false)
  }

  const clearPhoto = () => {
    setProfileFile(null)
    setPreviewUrl(null)
    setRemoveImage(true)
    setImageHint(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Profile photo</Label>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {previewUrl && !removeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleProfileFile(e.target.files?.[0])}
                />
                {(previewUrl || profileFile) && !removeImage ? (
                  <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={clearPhoto}>
                    <X className="mr-1 h-4 w-4" />
                    Remove photo
                  </Button>
                ) : null}
                {imageHint ? (
                  <p className="text-xs text-destructive">{imageHint}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WebP — max 2 MB</p>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="roleTitle">Role / position</Label>
            <Input
              id="roleTitle"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select
                value={form.department ?? 'hr'}
                onValueChange={(v) => setForm({ ...form, department: v as Department })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTS.map((d) => (
                    <SelectItem key={d} value={d!}>
                      {departmentNames[d!] ?? d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.employmentType}
                onValueChange={(v) =>
                  setForm({ ...form, employmentType: v as 'employee' | 'volunteer' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hiredAt">Hired</Label>
              <Input
                id="hiredAt"
                type="date"
                value={form.hiredAt}
                onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="salary">Salary (SLE)</Label>
              <Input
                id="salary"
                type="number"
                value={form.salaryAmount}
                onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stipend">Stipend (SLE)</Label>
              <Input
                id="stipend"
                type="number"
                value={form.stipendAmount}
                onChange={(e) => setForm({ ...form, stipendAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nationalId">National ID / passport</Label>
            <Input
              id="nationalId"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ecName">Emergency contact</Label>
              <Input
                id="ecName"
                value={form.emergencyName}
                onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ecPhone">Emergency phone</Label>
              <Input
                id="ecPhone"
                value={form.emergencyPhone}
                onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              void onSubmit({
                values: form,
                profileImageFile: profileFile,
                removeProfileImage: removeImage,
              }).finally(() => setBusy(false))
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
