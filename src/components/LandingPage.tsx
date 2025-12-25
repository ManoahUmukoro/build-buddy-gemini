import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  ArrowRight, 
  Play, 
  Menu, 
  Inbox, 
  Cpu, 
  BarChart3, 
  CheckCircle2,
  ClipboardList,
  Wallet,
  BookOpen,
  Flame,
  Sparkles
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Methodology', href: '#methodology' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Docs', href: '#docs' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <span className="font-heading font-bold text-lg tracking-tight">LifeOS</span>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a 
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/auth')}
              >
                Log In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90"
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <a 
                      key={link.label}
                      href={link.href}
                      className="text-lg font-medium"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <hr className="border-border" />
                  <Button 
                    variant="outline" 
                    onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}
                  >
                    Log In
                  </Button>
                  <Button 
                    onClick={() => { setMobileMenuOpen(false); navigate('/auth'); }}
                  >
                    Get Started
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-reveal inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            v1.0 Public Release
          </div>

          {/* Headline */}
          <h1 className="animate-reveal animate-reveal-delay-1 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            Your life deserves a system,
            <br className="hidden sm:block" />
            <span className="text-muted-foreground"> not just a list.</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-reveal animate-reveal-delay-2 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop stitching together scattered apps. LifeOS is the unified workspace for your tasks, finances, habits, and mental clarity.
          </p>

          {/* CTAs */}
          <div className="animate-reveal animate-reveal-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 h-12 px-6 text-base"
            >
              Start Building Your System
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Play className="mr-2 h-4 w-4" />
              See How It Works
            </Button>
          </div>

          {/* Visual Hook - SVG Diagram */}
          <div className="animate-reveal animate-reveal-delay-3 relative mx-auto max-w-3xl">
            <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                {/* Chaos */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <svg className="w-10 h-10 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 7l3-3m0 0l3 3M6 4v8M21 17l-3 3m0 0l-3-3m3 3V12M12 3v4m0 14v-4M8 12H4m16 0h-4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Chaos</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                <div className="h-6 w-px bg-border sm:hidden" />

                {/* LifeOS */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                    <span className="font-heading font-bold text-primary text-lg">LifeOS</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">Process</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />
                <div className="h-6 w-px bg-border sm:hidden" />

                {/* Clarity */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-success" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Clarity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Anti-Hype */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-border bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-semibold mb-8">Built for the intentional.</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { label: 'PRIVACY', value: 'LOCAL-FIRST' },
              { label: 'ADS', value: '0' },
              { label: 'TRACKING', value: 'NONE' },
              { label: 'VIBE', value: 'CALM' },
            ].map((item) => (
              <div 
                key={item.label}
                className="font-mono text-xs sm:text-sm bg-card border border-border rounded-md px-4 py-2"
              >
                [{item.label}: <span className="text-primary">{item.value}</span>]
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid - The System */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-4">A complete operating system.</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Everything you need to run your life with intention and clarity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Planner - Large */}
            <div className="md:col-span-2 bento-card bg-muted/50 hover:bg-card rounded-2xl border border-border p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-1">Planner</h3>
                  <p className="text-muted-foreground text-sm">Think in flows, not to-dos.</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded border-2 border-primary flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">Review quarterly OKRs</span>
                  <span className="text-xs text-muted-foreground ml-auto">→ Q1 Goals</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                  <span className="text-sm">Update project timeline</span>
                  <span className="text-xs text-muted-foreground ml-auto">→ Work</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                  <span className="text-sm">Schedule team sync</span>
                  <span className="text-xs text-muted-foreground ml-auto">→ Meetings</span>
                </div>
              </div>
            </div>

            {/* Finance - Tall */}
            <div className="md:row-span-2 bento-card bg-muted/50 hover:bg-card rounded-2xl border border-border p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-success/10">
                  <Wallet className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-1">Finance</h3>
                  <p className="text-muted-foreground text-sm">Money is data, not anxiety.</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-xl border border-border p-4 h-48 flex flex-col justify-end">
                {/* Simple bar chart visualization */}
                <div className="flex items-end justify-between gap-2 h-full">
                  {[40, 65, 45, 80, 55, 70].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className={`w-full rounded-t ${i === 3 ? 'bg-success' : 'bg-primary/60'}`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {['J', 'F', 'M', 'A', 'M', 'J'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly avg</span>
                <span className="font-medium text-success">+12.4%</span>
              </div>
            </div>

            {/* Journal - Small */}
            <div className="bento-card bg-muted/50 hover:bg-card rounded-2xl border border-border p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <BookOpen className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-1">Journal</h3>
                  <p className="text-muted-foreground text-sm">Clear your cache.</p>
                </div>
              </div>
              <div className="bg-background/50 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground italic">
                  "Today I focused on what matters most. The clarity feels good..."
                </p>
              </div>
            </div>

            {/* Habits - Small */}
            <div className="bento-card bg-muted/50 hover:bg-card rounded-2xl border border-border p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-xl bg-destructive/10">
                  <Flame className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg mb-1">Habits</h3>
                  <p className="text-muted-foreground text-sm">Compound interest for your character.</p>
                </div>
              </div>
              {/* Streak grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 21 }).map((_, i) => (
                  <div 
                    key={i}
                    className={`aspect-square rounded-sm ${
                      [0, 1, 2, 4, 5, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 20].includes(i) 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology Section */}
      <section id="methodology" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-4">The Method</h2>
          <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">
            A simple pipeline to transform chaos into clarity.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Step 1 */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Inbox className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Capture</h3>
              <p className="text-sm text-muted-foreground">Dump the chaos from your brain.</p>
            </div>

            {/* Dotted line */}
            <div className="hidden md:block flex-1 pipeline-line" />
            <div className="md:hidden h-8 w-px border-l-2 border-dashed border-border" />

            {/* Step 2 */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Cpu className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Process</h3>
              <p className="text-sm text-muted-foreground">Assign to projects, budgets, or habits.</p>
            </div>

            {/* Dotted line */}
            <div className="hidden md:block flex-1 pipeline-line" />
            <div className="md:hidden h-8 w-px border-l-2 border-dashed border-border" />

            {/* Step 3 */}
            <div className="flex-1 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Review</h3>
              <p className="text-sm text-muted-foreground">Weekly insights to optimize your life.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-center mb-4">Invest in clarity.</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Start free. Upgrade when you're ready.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="mb-6">
                <span className="text-sm font-medium text-muted-foreground">The Builder</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-heading font-bold">$0</span>
                  <span className="text-muted-foreground">/ forever</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Core OS features. Unlimited Tasks. Local Data.
              </p>
              <ul className="space-y-3 mb-8">
                {['Unlimited tasks & habits', 'Basic finance tracking', 'Daily journaling', 'Focus timer'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                Start for Free
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="bg-card rounded-2xl border-2 border-primary p-8 relative">
              <div className="absolute -top-3 right-6">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <div className="mb-6">
                <span className="text-sm font-medium text-muted-foreground">The Architect</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-heading font-bold">$9</span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                AI Synthesis. Receipt OCR. Advanced Analytics. Backups.
              </p>
              <ul className="space-y-3 mb-8">
                {['Everything in Free', 'AI-powered insights', 'Receipt scanning', 'Advanced analytics', 'Cloud backup'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full"
                onClick={() => navigate('/pricing')}
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Developer/Docs Callout */}
      <section id="docs" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary text-secondary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Built like reliable software.
            <br />
            <span className="text-muted-foreground">Documented like a framework.</span>
          </h2>
          <p className="text-secondary-foreground/70 mb-8 max-w-xl mx-auto">
            We treat your life data with the engineering rigor it deserves. Export anytime. API coming soon.
          </p>
          <a 
            href="#" 
            className="font-mono text-sm underline underline-offset-4 hover:text-primary transition-colors"
          >
            Read the Documentation →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Product */}
            <div>
              <h4 className="font-heading font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-heading font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-heading font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                {['Documentation', 'Help Center', 'Community', 'Templates'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-heading font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                {['Privacy', 'Terms', 'Security', 'Cookies'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-heading font-bold">LifeOS</span>
            <p className="text-sm text-muted-foreground">
              © 2025 Webnexer Initiative. Built for clarity.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;