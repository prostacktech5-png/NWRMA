'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSync } from '@/lib/sync-context';
import {
  db,
  RIVER_LOCATION_OPTIONS,
  RIVER_OTHER_VALUE,
  parseRiverLocationOption,
} from '@/lib/db';
import { v4 as uuid } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  Droplets,
  Waves,
  Navigation,
  Loader2,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatReadingTime12h } from '@/lib/utils';

export default function NewReadingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshStats } = useSync();

  const [riverPreset, setRiverPreset] = useState('');
  const [riverCustom, setRiverCustom] = useState('');
  const [siteLocation, setSiteLocation] = useState('');
  const [waterLevel, setWaterLevel] = useState('');
  const [remarks, setRemarks] = useState('');
  const [currentMoment, setCurrentMoment] = useState(() => new Date());
  
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setCurrentMoment(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const getGPSLocation = async () => {
    setGpsLoading(true);
    setGpsError('');
    
    if (!navigator.geolocation) {
      setGpsError('GPS not supported');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLat(position.coords.latitude);
        setGpsLng(position.coords.longitude);
        setGpsLoading(false);
      },
      (error) => {
        setGpsError(error.message || 'Failed to get location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const riverResolved =
      riverPreset === RIVER_OTHER_VALUE
        ? riverCustom.trim()
        : riverPreset
          ? parseRiverLocationOption(riverPreset).riverName
          : '';
    const locationTrimmed = siteLocation.trim();

    if (!riverResolved || !locationTrimmed || !waterLevel) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      
      await db.readings.add({
        id: uuid(),
        officerName: user?.name || '',
        officerPhone: user?.phone || '',
        location: locationTrimmed,
        riverName: riverResolved,
        waterLevel: parseFloat(waterLevel),
        readingTime: formatReadingTime12h(now),
        date: format(now, 'yyyy-MM-dd'),
        dateTime: now,
        gpsLat,
        gpsLng,
        photoBase64: null,
        remarks,
        syncStatus: 'pending',
        createdAt: now,
      });

      await refreshStats();
      setSubmitSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Failed to save reading:', error);
      alert('Failed to save reading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Reading Saved</h2>
            <p className="text-muted-foreground">
              Your water level reading has been saved and will sync when online.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="font-semibold text-lg">New Reading</h1>
          <p className="text-sm opacity-90">Record water level</p>
        </div>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Officer Info (Auto-filled) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Field Officer</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.phone}</p>
          </CardContent>
        </Card>

        {/* River + area (preset) */}
        <div className="space-y-2">
          <Label htmlFor="river-preset" className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" />
            River and location *
          </Label>
          <Select
            value={riverPreset || undefined}
            onValueChange={(v) => {
              setRiverPreset(v);
              setRiverCustom('');
              if (v === RIVER_OTHER_VALUE) {
                setSiteLocation('');
              } else {
                const { areaLabel } = parseRiverLocationOption(v);
                setSiteLocation(areaLabel);
              }
            }}
            required
          >
            <SelectTrigger id="river-preset" className="h-12 text-base">
              <SelectValue placeholder="e.g. Moa River – Kailahun" />
            </SelectTrigger>
            <SelectContent className="max-h-[min(70vh,320px)]">
              {RIVER_LOCATION_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-base py-3">
                  {opt}
                </SelectItem>
              ))}
              <SelectItem
                value={RIVER_OTHER_VALUE}
                className="text-base py-3 border-t mt-1 pt-2"
              >
                Other — enter river and location manually
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Each option is river name and a main town or district along it (you can edit Location below).
          </p>
          {riverPreset === RIVER_OTHER_VALUE && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="river-custom">River name *</Label>
              <Input
                id="river-custom"
                className="h-12 text-base"
                placeholder="e.g., river or stream name"
                value={riverCustom}
                onChange={(e) => setRiverCustom(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {/* Location (site) */}
        <div className="space-y-2">
          <Label htmlFor="site-location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location *
          </Label>
          <Input
            id="site-location"
            className="h-12 text-base"
            placeholder="e.g., gauge station, town, bridge, landmark"
            value={siteLocation}
            onChange={(e) => setSiteLocation(e.target.value)}
            autoComplete="off"
            required
          />
          <p className="text-xs text-muted-foreground">
            Gauge site or landmark (filled from the list above; you may change it).
          </p>
        </div>

        {/* Water Level */}
        <div className="space-y-2">
          <Label htmlFor="waterLevel" className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-accent" />
            Water Level (meters) *
          </Label>
          <Input
            id="waterLevel"
            type="number"
            step="0.01"
            min="0"
            max="50"
            placeholder="e.g., 2.45"
            value={waterLevel}
            onChange={(e) => setWaterLevel(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>

        {/* Date & Time (live, used when you save) */}
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex justify-between items-center text-sm gap-2">
              <span className="text-muted-foreground shrink-0">Date & Time</span>
              <span className="font-medium text-right tabular-nums">
                {format(currentMoment, 'PPpp')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GPS Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            GPS Location
          </Label>
          {gpsLat && gpsLng ? (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <p className="font-medium text-primary">Location captured</p>
                    <p className="text-muted-foreground">
                      {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}
                    </p>
                  </div>
                  <Check className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={getGPSLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting location...
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Capture GPS Location
                </>
              )}
            </Button>
          )}
          {gpsError && (
            <p className="text-sm text-destructive">{gpsError}</p>
          )}
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks (Optional)</Label>
          <Textarea
            id="remarks"
            placeholder="Any additional notes..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-[80px] text-base"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 pb-20">
          <Button
            type="submit"
            className="w-full h-14 text-lg"
            disabled={
              isSubmitting ||
              !waterLevel ||
              !siteLocation.trim() ||
              !riverPreset ||
              (riverPreset === RIVER_OTHER_VALUE && !riverCustom.trim())
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Save Reading
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
