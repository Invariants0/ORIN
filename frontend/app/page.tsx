'use client';

import React from 'react';
import { Button } from '@/components/core/brand/Button';
import { Card } from '@/components/core/brand/Card';
import { InfiniteGrid } from '@/components/core/brand/InfiniteGrid';
import { Navbar } from '@/components/layout/Navbar';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Shield,
  Brain,
  Layers,
  Layout,
  Users,
  Star,
  Github,
  Twitter,
  CheckCircle2,
  Database,
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#ffe17c] font-sans overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-8 min-h-screen flex flex-col lg:flex-row items-center gap-12">
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#000 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="flex-1 z-10 space-y-8">
          <div className="inline-block bg-white border-2 border-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_#000000]">
            THE CONTEXT-AWARE MEMORY LAYER
          </div>

          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter leading-[0.9] text-black uppercase">
            TURN NOTION <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px black' }}>
              INTO A LIVING
            </span>{' '}
            <br />
            MEMORY.
          </h1>

          <p className="text-xl font-medium text-black/80 max-w-lg">
            Orin turns Notion into a living memory. Read, structure, and act on your knowledge
            across every workflow with Gemini.
          </p>

          <div className="flex flex-wrap gap-6 pt-4">
            <Link href="/auth">
              <Button size="lg" className="px-10">
                TRY DEMO <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a
              href="https://github.com/Invariants0/ORIN"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg" className="px-10">
                <Github className="mr-2 w-5 h-5" />
                GITHUB
              </Button>
            </a>
          </div>
        </div>

        <div className="flex-1 w-full h-[500px] lg:h-[600px] relative z-10">
          <Card variant="white" shadowSize="lg" className="w-full h-full p-0 overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-8 bg-black flex items-center px-4 gap-2 z-20">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              <div className="ml-4 text-[10px] text-white/50 font-mono">orin.ai/dashboard</div>
            </div>
            <div className="w-full h-full pt-8">
              <InfiniteGrid />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Card variant="charcoal" className="p-4 w-64 shadow-none border-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-[#ffe17c] rounded-md border-2 border-black" />
                    <div className="h-2 w-24 bg-white/20 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/10 rounded" />
                    <div className="h-2 w-full bg-white/10 rounded" />
                    <div className="h-2 w-2/3 bg-white/10 rounded" />
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-[#171e19] border-y-2 border-black py-6 overflow-hidden flex whitespace-nowrap">
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex gap-20 items-center px-10"
        >
          {[
            'RESEARCH REPOSITORY',
            'SECOND BRAIN',
            'CONTENT ENGINE',
            'MEETING NOTES',
            'KNOWLEDGE BASE',
            'PROJECT TRACKING',
            'BRAIN DUMP',
            'SYSTEM DESIGN',
          ].flatMap((u, i) => [
            <span key={u} className="text-3xl font-extrabold text-[#b7c6c2]/50 tracking-tighter uppercase">
              {u}
            </span>,
            <span key={u + '_dot'} className="text-[#b7c6c2]/20">✦</span>,
          ])}
        </motion.div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-24 px-8 bg-[#ffe17c] border-b-2 border-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-16 uppercase">
            Built for <br /> Deep Work.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Brain, title: 'Explore Mode', desc: 'Read-only intelligence. Ask questions about your entire Notion memory.' },
              { icon: Zap, title: 'Build Mode', desc: 'Active operator. Create pages, databases, and systems with natural language.' },
              { icon: Layers, title: 'Capture Mode', desc: 'The ultimate brain dump. Save everything instantly and Orin will organize it.' },
              { icon: Shield, title: 'Secure Auth', desc: 'Enterprise-grade security. Your private data stays private and encrypted.' },
              { icon: Layout, title: 'Notion Sync', desc: 'Bi-directional sync with your existing Notion databases and workspaces.' },
              { icon: Users, title: 'Multi-Agent', desc: 'Collaborate with AI agents that understand your specific business context.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  variant="white"
                  className="group hover:-translate-x-2 hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all cursor-default h-full"
                >
                  <div className="w-12 h-12 bg-[#b7c6c2] border-2 border-black flex items-center justify-center mb-6 group-hover:bg-[#ffe17c] transition-colors">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-extrabold mb-4 uppercase">{feature.title}</h3>
                  <p className="font-bold text-black/60 leading-relaxed">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 px-8 bg-[#171e19] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-20 gap-8">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase">
              Three Steps <br /> to Genius.
            </h2>
            <div className="h-2 w-32 bg-[#b7c6c2]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-1 bg-white/5 z-0" />
            {[
              { step: '01', title: 'CONNECT', desc: 'Link your Notion workspace and Gemini API key in seconds.', color: '#b7c6c2' },
              { step: '02', title: 'CAPTURE', desc: 'Drop links, text, or files into the universal input layer.', color: '#ffe17c' },
              { step: '03', title: 'OPERATE', desc: 'Ask questions or generate docs based on your stored memory.', color: '#ffffff' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="relative z-10 space-y-6 group cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <motion.div
                  className="w-24 h-24 rounded-full border-4 flex items-center justify-center text-3xl font-black bg-[#171e19] transition-all relative"
                  style={{ borderColor: item.color }}
                  whileHover={{
                    scale: 1.15,
                    rotate: [0, -10, 10, 0],
                    backgroundColor: item.color,
                    color: '#171e19',
                    boxShadow: `0 0 40px ${item.color}66`,
                  }}
                >
                  {item.step}
                  <motion.div
                    className="absolute inset-[-8px] border-2 border-dashed rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ borderColor: item.color }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  />
                </motion.div>
                <h3
                  className="text-4xl font-black uppercase transition-all group-hover:tracking-widest"
                  style={{ color: item.color }}
                >
                  {item.title}
                </h3>
                <p className="text-white/50 font-bold text-lg group-hover:text-white transition-colors leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-32 px-8 bg-[#ffe17c] border-y-4 border-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-black/5 pointer-events-none select-none uppercase tracking-tighter">
          VS
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none">
              THE EVOLUTION <br /> OF MEMORY.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] bg-black">
            <div className="bg-white p-12 space-y-10 group hover:bg-neutral-50 transition-colors border-b-4 lg:border-b-0 lg:border-r-4 border-black">
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black uppercase tracking-tight flex items-center gap-4">
                  <div className="w-10 h-10 bg-black rounded-sm rotate-45" />
                  Legacy Notion
                </h3>
                <span className="text-xs font-black bg-black text-white px-3 py-1 uppercase">Boring</span>
              </div>
              <ul className="space-y-6">
                {[
                  'Manual tagging and categorization',
                  'Static pages that require constant maintenance',
                  'Siloed data across different databases',
                  'Slow retrieval via manual search',
                  'No context awareness between documents',
                ].map((point, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0.5 }}
                    whileInView={{ opacity: 1 }}
                    whileHover={{ x: 10 }}
                    className="flex items-start gap-4 font-bold text-black/60 group-hover:text-black transition-all cursor-default"
                  >
                    <div className="w-6 h-6 border-2 border-black/20 flex-shrink-0 mt-1 group-hover:border-black transition-colors" />
                    {point}
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="bg-[#171e19] p-12 space-y-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffe17c] translate-x-16 -translate-y-16 rotate-45" />
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-4xl font-black uppercase tracking-tight flex items-center gap-4 text-[#ffe17c]">
                  <div className="w-10 h-10 bg-[#ffe17c] rounded-sm -rotate-12" />
                  ORIN OS
                </h3>
                <span className="text-xs font-black bg-[#ffe17c] text-black px-3 py-1 uppercase">Future</span>
              </div>
              <ul className="space-y-6 relative z-10">
                {[
                  'AI-powered automatic structuring',
                  'Living memory that evolves with your work',
                  'Cross-workspace context retrieval',
                  'Instant capture via universal input',
                  'Gemini-powered reasoning across all data',
                ].map((point, i) => (
                  <motion.li
                    key={i}
                    whileHover={{ x: 10 }}
                    className="flex items-start gap-4 font-bold text-white group-hover:text-[#ffe17c] transition-all"
                  >
                    <div className="w-6 h-6 bg-[#ffe17c] border-2 border-black flex-shrink-0 mt-1 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </div>
                    {point}
                  </motion.li>
                ))}
              </ul>
              <div className="pt-8 border-t border-white/10 mt-auto">
                <p className="text-[#b7c6c2] text-xs font-black uppercase tracking-[0.2em]">
                  Context-Aware Intelligence
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech-stack" className="py-24 px-8 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase mb-4">
              THE ENGINE UNDER THE HOOD.
            </h2>
            <p className="text-xl font-bold text-black/50">
              Built with the most modern stack for performance and reliability.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { name: 'Next.js 16', desc: 'Framework', icon: Layout },
              { name: 'Gemini 2.5 Flash', desc: 'AI Engine', icon: Brain },
              { name: 'Notion MCP', desc: 'Memory Store', icon: Database },
              { name: 'Tailwind 4', desc: 'Styling', icon: Zap },
              { name: 'Zustand', desc: 'State', icon: Layers },
              { name: 'Framer', desc: 'Motion', icon: Star },
            ].map((tech, i) => (
              <Card
                key={i}
                variant="white"
                className="p-6 text-center group hover:bg-[#ffe17c] transition-all cursor-default"
              >
                <div className="w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <tech.icon className="w-6 h-6" />
                </div>
                <h4 className="font-black uppercase text-sm">{tech.name}</h4>
                <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{tech.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8 bg-[#ffe17c] text-center border-t-2 border-black">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-6xl md:text-8xl font-extrabold tracking-tighter uppercase leading-none">
            Ready to <br /> Upgrade your <br /> Notion?
          </h2>
          <div className="flex justify-center">
            <Link href="/auth">
              <Button size="lg" className="px-16 py-6 text-2xl">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#171e19] py-20 px-8 text-white border-t-2 border-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#ffe17c] flex items-center justify-center border-2 border-black">
                <div className="w-3 h-3 bg-black rotate-45" />
              </div>
              <span className="text-xl font-extrabold tracking-tighter uppercase">ORIN</span>
            </div>
            <p className="text-white/40 font-bold">The context operating system for deep thinkers.</p>
          </div>

          {[
            { title: 'Product', links: ['Features', 'API', 'Docs'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
            { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
          ].map((col, i) => (
            <div key={i} className="space-y-6">
              <h4 className="font-black uppercase tracking-widest text-[#ffe17c]">{col.title}</h4>
              <ul className="space-y-4">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="font-bold text-white/60 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/40 font-bold">© 2026 ORIN AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a
              href="https://github.com/Invariants0/ORIN"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-[#272727] border border-white/10 flex items-center justify-center hover:bg-[#ffe17c] hover:text-black transition-all cursor-pointer"
            >
              <Github className="w-5 h-5" />
            </a>
            <div className="w-10 h-10 bg-[#272727] border border-white/10 flex items-center justify-center hover:bg-[#ffe17c] hover:text-black transition-all cursor-pointer">
              <Twitter className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 bg-[#272727] border border-white/10 flex items-center justify-center hover:bg-[#ffe17c] hover:text-black transition-all cursor-pointer">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
