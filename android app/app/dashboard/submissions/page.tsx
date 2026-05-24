'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, type WaterReading } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  Search,
  Filter,
  MapPin,
  Droplets,
  Clock,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { displayReadingTimeOnly } from '@/lib/utils';

type FilterOption = 'all' | 'today' | 'yesterday' | 'week';
type StatusFilter = 'all' | 'pending' | 'synced' | 'failed';

export default function SubmissionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [filteredReadings, setFilteredReadings] = useState<WaterReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<FilterOption>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedReading, setSelectedReading] = useState<WaterReading | null>(null);

  // Load readings
  useEffect(() => {
    const loadReadings = async () => {
      if (!user) return;
      
      try {
        const allReadings = await db.readings
          .where('officerPhone')
          .equals(user.phone)
          .reverse()
          .sortBy('createdAt');
        
        setReadings(allReadings);
        setFilteredReadings(allReadings);
      } catch (error) {
        console.error('Failed to load readings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReadings();
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...readings];
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((reading) => {
        const readingDate = reading.createdAt;
        if (dateFilter === 'today') {
          return isToday(readingDate);
        } else if (dateFilter === 'yesterday') {
          return isYesterday(readingDate);
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return readingDate >= startOfDay(weekAgo);
        }
        return true;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((reading) => reading.syncStatus === statusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((reading) => {
        const river = (reading.riverName ?? '').toLowerCase();
        const loc = reading.location.toLowerCase();
        return (
          river.includes(query) ||
          loc.includes(query) ||
          reading.waterLevel.toString().includes(query)
        );
      });
    }
    
    setFilteredReadings(filtered);
  }, [readings, dateFilter, statusFilter, searchQuery]);

  const getStatusBadge = (status: WaterReading['syncStatus']) => {
    switch (status) {
      case 'synced':
        return (
          <Badge className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
    }
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:bg-primary-foreground/20"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="font-semibold text-lg">My Submissions</h1>
          <p className="text-sm opacity-90">{readings.length} total readings</p>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 space-y-3 border-b border-border bg-card">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by river, location, or level..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as FilterOption)}>
            <SelectTrigger className="flex-1 h-10">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="flex-1 h-10">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Readings List */}
      <div className="p-4 space-y-3 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="text-center py-12">
            <Droplets className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No readings found</p>
            {readings.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          filteredReadings.map((reading) => (
            <Card
              key={reading.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedReading(reading)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium text-sm line-clamp-2">
                      {reading.riverName?.trim()
                        ? `${reading.riverName} · ${reading.location}`
                        : reading.location}
                    </span>
                  </div>
                  {getStatusBadge(reading.syncStatus)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Droplets className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-foreground">{reading.waterLevel}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{displayReadingTimeOnly(reading.readingTime)}</span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(reading.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reading Detail Modal */}
      <Dialog open={!!selectedReading} onOpenChange={() => setSelectedReading(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reading Details</DialogTitle>
          </DialogHeader>
          
          {selectedReading && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex justify-center">
                {getStatusBadge(selectedReading.syncStatus)}
              </div>
              
              {/* Photo */}
              {selectedReading.photoBase64 && (
                <img
                  src={selectedReading.photoBase64}
                  alt="Gauge photo"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              
              {/* Details */}
              <div className="space-y-3">
                {(selectedReading.riverName ?? '').trim() ? (
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Droplets className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">River name</p>
                      <p className="font-medium">{selectedReading.riverName}</p>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedReading.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Droplets className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Water Level</p>
                    <p className="font-medium">{selectedReading.waterLevel} meters</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Reading Time</p>
                      <p className="font-medium">{displayReadingTimeOnly(selectedReading.readingTime)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedReading.date}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Officer</p>
                    <p className="font-medium">{selectedReading.officerName}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedReading.officerPhone}</p>
                  </div>
                </div>
                
                {selectedReading.gpsLat && selectedReading.gpsLng && (
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <Navigation className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">GPS Coordinates</p>
                      <p className="font-medium">
                        {selectedReading.gpsLat.toFixed(6)}, {selectedReading.gpsLng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedReading.remarks && (
                  <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Remarks</p>
                      <p className="font-medium">{selectedReading.remarks}</p>
                    </div>
                  </div>
                )}
                
                {selectedReading.syncError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Sync Error: {selectedReading.syncError}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
