import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { DEFAULT_PUBLIC_LOGO_PATH } from '@/lib/app-branding'

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/#services' },
  { label: 'Borehole Licensing', href: '/borehole-licensing' },
  { label: 'Water Quality', href: '/water-quality/portal' },
  { label: 'About', href: '/#about' },
  { label: 'Contact', href: '/#contact' },
]

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <img
            src={DEFAULT_PUBLIC_LOGO_PATH}
            alt=""
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="hidden sm:block">
            <p className="text-lg font-semibold text-foreground">NWRMA</p>
            <p className="text-xs text-muted-foreground">Sierra Leone</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden md:block">
            <Button variant="outline">Staff Login</Button>
          </Link>
          
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 pt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
                <hr className="my-4" />
                <Link href="/login">
                  <Button className="w-full">Staff Login</Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <img
                src={DEFAULT_PUBLIC_LOGO_PATH}
                alt=""
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div>
                <p className="text-lg font-semibold text-foreground">NWRMA</p>
                <p className="text-xs text-muted-foreground">National Water Resources Management Authority</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              The National Water Resources Management Authority is responsible for the regulation, 
              management, and development of water resources in Sierra Leone for sustainable use.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/borehole-licensing" className="hover:text-foreground">Borehole Licensing</Link></li>
              <li><Link href="/water-quality/portal" className="hover:text-foreground">Water Quality Testing</Link></li>
              <li><Link href="/#services" className="hover:text-foreground">Our Services</Link></li>
              <li><Link href="/#about" className="hover:text-foreground">About Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground">Contact</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Youyi Building, 4th Floor</li>
              <li>Brookfields, Freetown</li>
              <li>Sierra Leone</li>
              <li className="pt-2">+232 22 123 456</li>
              <li>info@nwrma.gov.sl</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} National Water Resources Management Authority. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/accessibility" className="hover:text-foreground">Accessibility</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
