'use client'

import { useState } from 'react'
import {
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateValue } from '@/lib/erp-formatting'
import { useErpReference } from '@/components/reference-data-provider'

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-secondary/10 text-secondary'
    case 'suspended':
      return 'bg-warning/10 text-warning-foreground'
    case 'revoked':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-4 w-4" />
    case 'suspended':
      return <AlertTriangle className="h-4 w-4" />
    case 'revoked':
      return <XCircle className="h-4 w-4" />
    default:
      return null
  }
}

export default function DrillingCompaniesPage() {
  const { data } = useErpReference()
  const drillingCompanies = data.drillingCompanies
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCompanies = drillingCompanies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.registrationNo.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeCount = drillingCompanies.filter(c => c.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Drilling Companies</h1>
        <p className="text-muted-foreground">
          Licensed borehole drilling companies in Sierra Leone
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{drillingCompanies.length}</span>
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Licenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{activeCount}</span>
              <CheckCircle2 className="h-5 w-5 text-secondary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suspended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {drillingCompanies.filter(c => c.status === 'suspended').length}
              </span>
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Companies Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <CardDescription className="font-mono">
                    {company.registrationNo}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(company.status)}>
                  {getStatusIcon(company.status)}
                  <span className="ml-1 capitalize">{company.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{company.contacts.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{company.contacts.email}</span>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{company.contacts.address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>License expires: {formatDateValue(company.licenseExpiry)}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View Boreholes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
