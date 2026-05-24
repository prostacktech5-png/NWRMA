'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, User, Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [regPhone, setRegPhone] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(loginPhone, loginPassword);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
    
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    
    setIsLoading(true);
    
    const result = await register(regPhone, regName, regPassword);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {/* Header with NWRMA Logo */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border border-border">
            <Image
              src="/image-removebg-preview.png"
              alt="NWRMA Logo"
              width={88}
              height={88}
              className="object-contain"
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-foreground">HydroGauge SL</h1>
        <p className="text-center text-muted-foreground text-sm mt-1">
          Water Level Data Collection
        </p>
        {/* Sierra Leone flag stripe */}
        <div className="flex h-1.5 mt-4 overflow-hidden">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-white border-y border-border" />
          <div className="flex-1 bg-accent" />
        </div>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-sm p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">Welcome</h2>
          <p className="text-sm text-muted-foreground">Sign in to record water level readings</p>
        </div>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-sm">
            <TabsTrigger value="login" className="rounded-sm">Login</TabsTrigger>
            <TabsTrigger value="register" className="rounded-sm">Register</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-phone"
                    type="tel"
                    placeholder="+232 XX XXX XXXX"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-sm">{error}</p>
              )}
              
              <Button type="submit" className="w-full h-12 text-base rounded-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="John Kamara"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="+232 XX XXX XXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Create password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reg-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-confirm"
                    type="password"
                    placeholder="Confirm password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="pl-10 h-12 text-base rounded-sm"
                    required
                  />
                </div>
              </div>
              
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-sm">{error}</p>
              )}
              
              <Button type="submit" className="w-full h-12 text-base rounded-sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      
      <p className="text-xs text-muted-foreground mt-6 text-center">
        National Water Resources Management Agency
        <br />
        Sierra Leone
      </p>
    </div>
  );
}
