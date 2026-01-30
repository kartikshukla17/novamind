'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Brain,
  Sparkles,
  FolderKanban,
  Chrome,
  Search,
  Lock,
  Zap,
  ArrowRight,
  Star,
  Layers,
  Image as ImageIcon,
  FileText,
  Link2,
  Lightbulb,
  Shield,
  Check,
  CreditCard
} from 'lucide-react'

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
          scrolled
            ? 'w-[calc(100%-2rem)] max-w-4xl glass shadow-soft rounded-2xl'
            : 'w-[calc(100%-2rem)] max-w-6xl'
        }`}
      >
        <div className={`flex items-center justify-between px-6 ${scrolled ? 'py-3' : 'py-4'}`}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-lg transition-shadow">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-400 rounded-full animate-pulse-soft" />
            </div>
            <span className="text-xl font-bold text-warm-900">Novamind</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link text-sm font-medium">Features</a>
            <a href="#how-it-works" className="nav-link text-sm font-medium">How it works</a>
            <a href="#pricing" className="nav-link text-sm font-medium">Pricing</a>
            <a href="#privacy" className="nav-link text-sm font-medium">Privacy</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex text-sm font-medium text-warm-600 hover:text-warm-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-warm-900 text-warm-50 text-sm font-medium rounded-xl hover:bg-warm-800 transition-all active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary-100/20 to-accent-100/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-700">AI-powered organization</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-display-xl font-bold text-warm-900 mb-6 text-balance animate-fade-in-up">
            Your Second Brain for
            <span className="gradient-text"> Everything</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-warm-600 max-w-2xl mx-auto mb-10 text-balance animate-fade-in-up stagger-1">
            Remember everything. Organize nothing. Save your ideas, links, images, and notes — AI handles the rest.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-2">
            <Link
              href="/signup"
              className="btn-primary text-lg px-8 py-4 shadow-glow hover:shadow-lg"
            >
              Start for Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-lg px-8 py-4"
            >
              Sign In
            </Link>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-6 mt-12 animate-fade-in stagger-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-accent-400 text-accent-400" />
              ))}
            </div>
            <span className="text-sm text-warm-500">
              Trusted by <span className="font-semibold text-warm-700">1,000+</span> knowledge workers
            </span>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
          <div className="w-6 h-10 border-2 border-warm-300 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-warm-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* What You Can Save Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-md font-bold text-warm-900 mb-4">
              Save anything that matters
            </h2>
            <p className="text-lg text-warm-600 max-w-xl mx-auto">
              Your mind captures ideas everywhere. Now you have a place to keep them all.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <ContentTypeCard
              icon={<FileText className="h-6 w-6" />}
              title="Notes & Text"
              description="Quick thoughts, meeting notes, quotes"
              color="primary"
            />
            <ContentTypeCard
              icon={<Link2 className="h-6 w-6" />}
              title="Links & Articles"
              description="Bookmarks with auto-preview"
              color="accent"
            />
            <ContentTypeCard
              icon={<ImageIcon className="h-6 w-6" />}
              title="Images"
              description="Screenshots, inspiration, designs"
              color="emerald"
            />
            <ContentTypeCard
              icon={<Layers className="h-6 w-6" />}
              title="Files"
              description="Documents, PDFs, anything"
              color="rose"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-warm-100/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-md font-bold text-warm-900 mb-4">
              Let AI do the heavy lifting
            </h2>
            <p className="text-lg text-warm-600 max-w-xl mx-auto">
              No folders. No tags. No manual organization. Just save and find.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="AI Auto-Categorization"
              description="Content is automatically sorted into smart categories like Articles, Recipes, Design, Travel, and more."
              gradient="from-primary-500 to-primary-600"
            />
            <FeatureCard
              icon={<Search className="h-6 w-6" />}
              title="Instant Search"
              description="Find anything instantly. Search by content, tags, or even describe what you're looking for."
              gradient="from-accent-500 to-accent-600"
            />
            <FeatureCard
              icon={<FolderKanban className="h-6 w-6" />}
              title="Visual Mood Boards"
              description="Create beautiful Pinterest-style boards to visually organize projects and inspiration."
              gradient="from-emerald-500 to-emerald-600"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Smart Summaries"
              description="AI generates concise summaries of your saved content for quick reference."
              gradient="from-rose-500 to-rose-600"
            />
            <FeatureCard
              icon={<Chrome className="h-6 w-6" />}
              title="Browser Extension"
              description="Save anything from the web with one click. Capture text, images, and full pages."
              gradient="from-violet-500 to-violet-600"
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Privacy First"
              description="Your data stays yours. AI runs locally in your browser — nothing leaves your device."
              gradient="from-cyan-500 to-cyan-600"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display-md font-bold text-warm-900 mb-4">
              Simple as thinking
            </h2>
            <p className="text-lg text-warm-600 max-w-xl mx-auto">
              Three steps to an organized mind
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <StepCard
              number="01"
              title="Capture"
              description="Save anything — paste text, drop images, click the extension. Your brain dumps, we catch."
              icon={<Lightbulb className="h-8 w-8" />}
            />
            <StepCard
              number="02"
              title="Relax"
              description="AI automatically categorizes, tags, and summarizes your content. No folders to create."
              icon={<Sparkles className="h-8 w-8" />}
            />
            <StepCard
              number="03"
              title="Find"
              description="Search naturally or browse visual boards. Everything is exactly where you expect it."
              icon={<Search className="h-8 w-8" />}
            />
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="privacy" className="py-24 px-4 bg-warm-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500/20 rounded-2xl mb-6">
            <Shield className="h-8 w-8 text-primary-400" />
          </div>
          <h2 className="text-display-md font-bold text-warm-50 mb-6">
            Your thoughts stay private
          </h2>
          <p className="text-xl text-warm-400 max-w-2xl mx-auto mb-10">
            Unlike other AI tools, Novamind processes everything locally in your browser.
            Your ideas, bookmarks, and notes never leave your device. No servers. No data mining. Just you and your second brain.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <PrivacyBadge icon={<Lock className="h-4 w-4" />} text="End-to-end encrypted" />
            <PrivacyBadge icon={<Zap className="h-4 w-4" />} text="On-device AI" />
            <PrivacyBadge icon={<Shield className="h-4 w-4" />} text="No data selling" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-display-md font-bold text-warm-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-warm-600 max-w-xl mx-auto">
              Start free, upgrade when you need more. No hidden fees, cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Free Tier Card */}
            <div className="bg-white rounded-2xl border-2 border-warm-200 p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-warm-900 mb-2">Free</h3>
                <p className="text-warm-500 text-sm">Perfect for getting started</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-warm-900">₹0</span>
                  <span className="text-warm-500 text-sm">/forever</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <PricingFeature text="Up to 50 items" />
                <PricingFeature text="Basic AI categorization" />
                <PricingFeature text="1 custom board" />
                <PricingFeature text="Web app access" />
              </ul>
              <Link
                href="/signup"
                className="w-full py-3 px-6 bg-warm-900 hover:bg-warm-800 text-warm-50 font-medium rounded-xl text-center transition-all active:scale-[0.98]"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Tier Card */}
            <div className="relative bg-white rounded-2xl border-2 border-primary-500 p-8 flex flex-col shadow-glow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-warm-900 mb-2">Pro</h3>
                <p className="text-warm-500 text-sm">For power users who want it all</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-warm-500">₹</span>
                  <span className="text-4xl font-bold text-warm-900">749</span>
                  <span className="text-warm-500 text-sm">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                <PricingFeature text="Unlimited items" />
                <PricingFeature text="Advanced AI categorization" />
                <PricingFeature text="Unlimited boards" />
                <PricingFeature text="Browser extension" />
                <PricingFeature text="Priority support" />
                <PricingFeature text="Export your data" />
              </ul>
              <Link
                href="/signup"
                className="w-full py-3 px-6 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-center transition-all shadow-glow hover:shadow-lg active:scale-[0.98]"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          {/* Payment badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-warm-400">
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-5 h-5" />
              <span>Cards</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">UPI</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Net Banking</span>
            </div>
            <span className="text-sm">Powered by Razorpay</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-display-md font-bold text-warm-900 mb-6">
            Ready to extend your mind?
          </h2>
          <p className="text-xl text-warm-600 max-w-xl mx-auto mb-10">
            Join thousands of thinkers, creators, and professionals who trust Novamind with their ideas.
          </p>
          <Link
            href="/signup"
            className="btn-primary text-lg px-10 py-4 shadow-glow hover:shadow-lg"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-warm-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-warm-900">Novamind</span>
            </div>

            <p className="text-sm text-warm-500">
              Your ideas, organized. Automatically.
            </p>

            <div className="flex items-center gap-6 text-sm text-warm-500">
              <a href="#" className="hover:text-warm-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-warm-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-warm-900 transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-warm-200 text-center text-sm text-warm-400">
            © {new Date().getFullYear()} Novamind. Built for thinkers.
          </div>
        </div>
      </footer>
    </div>
  )
}

function ContentTypeCard({
  icon,
  title,
  description,
  color
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: 'primary' | 'accent' | 'emerald' | 'rose'
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600 border-primary-100',
    accent: 'bg-accent-50 text-accent-600 border-accent-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  }

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]} card-hover`}>
      <div className="mb-4">{icon}</div>
      <h3 className="font-semibold text-warm-900 mb-1">{title}</h3>
      <p className="text-sm text-warm-500">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  gradient
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group bg-white p-6 rounded-2xl border border-warm-200 card-hover">
      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl text-white mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-warm-900 mb-2">{title}</h3>
      <p className="text-warm-600">{description}</p>
    </div>
  )
}

function StepCard({
  number,
  title,
  description,
  icon
}: {
  number: string
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="text-8xl font-bold text-warm-100 absolute -top-4 -left-2 select-none">
        {number}
      </div>
      <div className="relative pt-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-2xl text-primary-600 mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-warm-900 mb-2">{title}</h3>
        <p className="text-warm-600">{description}</p>
      </div>
    </div>
  )
}

function PrivacyBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-warm-800 rounded-full">
      <span className="text-primary-400">{icon}</span>
      <span className="text-sm font-medium text-warm-300">{text}</span>
    </div>
  )
}

function PricingFeature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-primary-600" />
      </div>
      <span className="text-warm-600 text-sm">{text}</span>
    </li>
  )
}
