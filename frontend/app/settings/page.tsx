'use client';

import React, { useState } from 'react';
import { useOrinStore } from '@/stores/useOrinStore';
import { Card } from '@/components/core/brand/Card';
import { Button } from '@/components/core/brand/Button';
import { BrandInput } from '@/components/core/brand/Input';
import { BrandBadge } from '@/components/core/brand/Badge';
import { OrinSidebar } from '@/components/layout/OrinSidebar';
import {
  Database,
  Mail,
  Slack,
  Key,
  Bell,
  Shield,
  Zap,
  Check,
  ChevronRight,
  User,
  Palette,
  Globe,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { authClient } from '@/lib/auth';

type SettingsTab = 'profile' | 'connections' | 'api' | 'notifications' | 'appearance' | 'privacy';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'connections', label: 'Connections', icon: Globe },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy', icon: Shield },
];

export default function SettingsPage() {
  const { connections, updateConnection, user: storeUser, setUser: setStoreUser } = useOrinStore();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [notionKey, setNotionKey] = useState('');

  // Update local state when user session loads
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      if (activeTab === 'profile') {
        const { data, error } = await authClient.updateUser({
          name: name,
        });
        
        if (error) throw error;

        // Update the global store manually for immediate feedback
        if (storeUser) {
          setStoreUser({
            ...storeUser,
            name: name
          });
        }
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      <OrinSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b-2 border-black flex items-center px-5 sticky top-0 z-30 gap-4">
          <div className="w-10 h-10 bg-[#ffe17c] border-2 border-black flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter leading-none">Settings</h1>
            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
              Manage your ORIN workspace
            </p>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-2 text-sm font-black text-green-700 bg-green-50 border-2 border-green-700 px-4 py-2 rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  Saved!
                </motion.div>
              )}
            </AnimatePresence>
            <Button onClick={handleSave} variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Side Nav */}
          <nav className="w-56 border-r-2 border-black bg-white flex-shrink-0 flex flex-col overflow-y-auto">
            <div className="p-3 space-y-0.5 flex-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all font-black uppercase tracking-wide text-xs group',
                      isActive
                        ? 'border-black bg-[#ffe17c]'
                        : 'border-transparent hover:bg-neutral-50'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-black' : 'text-black/40 group-hover:text-black')} />
                    <span className={isActive ? 'text-black' : 'text-black/50 group-hover:text-black'}>
                      {tab.label}
                    </span>
                    {isActive && <ChevronRight className="ml-auto w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
            {/* Danger zone */}
            <div className="p-3 border-t-2 border-black/10">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-transparent hover:border-red-200 hover:bg-red-50 text-left transition-all font-black uppercase tracking-wide text-xs text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >

                {/* ── PROFILE ── */}
                {activeTab === 'profile' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="yellow" className="mb-3">PROFILE</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Your Identity</h2>
                      <p className="font-bold text-black/50 mt-1">Manage your personal information.</p>
                    </div>

                    <Card variant="white" className="space-y-8 p-8 shadow-[8px_8px_0px_0px_#000]">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl border-4 border-black bg-[#ffe17c] overflow-hidden flex-shrink-0 rotate-2 shadow-[4px_4px_0px_0px_#000]">
                          {user?.image ? (
                            <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-black uppercase">
                              {user?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Button variant="outline" size="sm">Change Photo</Button>
                          <p className="text-xs font-black text-black/40 uppercase tracking-widest">JPG, PNG up to 5MB</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest">Full Name</label>
                          <BrandInput value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-widest">Email (Read-Only)</label>
                          <BrandInput type="email" value={email} disabled className="opacity-50 cursor-not-allowed" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest">Bio</label>
                        <textarea
                          rows={3}
                          placeholder="Tell us about your role..."
                          className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#ffe17c] transition-all resize-none font-bold"
                        />
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── CONNECTIONS ── */}
                {activeTab === 'connections' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="sage" className="mb-3">CONNECTIONS</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Integrations</h2>
                      <p className="font-bold text-black/50 mt-1">Connect your tools to ORIN's memory layer.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          key: 'notion' as const,
                          icon: Database,
                          name: 'Notion',
                          desc: 'Read and write to your Notion workspace — the core memory store.',
                          color: 'bg-[#b7c6c2]',
                          docsUrl: 'https://developers.notion.com',
                        },
                        {
                          key: 'email' as const,
                          icon: Mail,
                          name: 'Email',
                          desc: 'Sync Gmail or Outlook to capture emails into your Notion inbox.',
                          color: 'bg-[#ffe17c]',
                          docsUrl: '#',
                        },
                        {
                          key: 'slack' as const,
                          icon: Slack,
                          name: 'Slack',
                          desc: 'Bridge Slack messages and threads into your living memory.',
                          color: 'bg-black',
                          docsUrl: '#',
                        },
                      ].map((conn) => {
                        const Icon = conn.icon;
                        const isConnected = connections[conn.key];
                        return (
                          <Card
                            key={conn.key}
                            variant="white"
                            className="flex items-center gap-6 p-6"
                          >
                            <div className={cn('w-14 h-14 border-2 border-black flex items-center justify-center flex-shrink-0', conn.color)}>
                              <Icon className={cn('w-7 h-7', conn.key === 'slack' ? 'text-white' : 'text-black')} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-black text-lg uppercase">{conn.name}</h3>
                                {isConnected
                                  ? <BrandBadge variant="sage" className="text-[10px]">CONNECTED</BrandBadge>
                                  : <BrandBadge variant="white" className="text-[10px]">NOT CONNECTED</BrandBadge>}
                              </div>
                              <p className="text-sm font-bold text-black/50">{conn.desc}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <a href={conn.docsUrl} target="_blank" rel="noopener noreferrer" className="text-black/30 hover:text-black transition-colors">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <Button
                                variant={isConnected ? 'outline' : 'secondary'}
                                size="sm"
                                onClick={() => updateConnection(conn.key, !isConnected)}
                              >
                                {isConnected ? 'Disconnect' : 'Connect'}
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── API KEYS ── */}
                {activeTab === 'api' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="black" className="mb-3">API KEYS</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Keys & Secrets</h2>
                      <p className="font-bold text-black/50 mt-1">Store your API keys securely. They never leave your session.</p>
                    </div>

                    <div className="space-y-6">
                      {[
                        {
                          label: 'Gemini API Key',
                          placeholder: 'AIzaSy...',
                          value: geminiKey,
                          onChange: setGeminiKey,
                          desc: 'Powers all AI reasoning in ORIN.',
                          link: 'https://aistudio.google.com/app/apikey',
                          linkText: 'Get key →',
                        },
                        {
                          label: 'Notion API Key',
                          placeholder: 'secret_...',
                          value: notionKey,
                          onChange: setNotionKey,
                          desc: 'Required for Notion read/write access.',
                          link: 'https://www.notion.so/my-integrations',
                          linkText: 'Create integration →',
                        },
                      ].map((field) => (
                        <Card key={field.label} variant="white" className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-widest">{field.label}</label>
                            <a href={field.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-black/40 hover:text-black underline underline-offset-2 transition-colors">
                              {field.linkText}
                            </a>
                          </div>
                          <BrandInput
                            type="password"
                            placeholder={field.placeholder}
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <p className="text-xs font-bold text-black/40">{field.desc}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── NOTIFICATIONS ── */}
                {activeTab === 'notifications' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="yellow" className="mb-3">NOTIFICATIONS</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Alert Preferences</h2>
                      <p className="font-bold text-black/50 mt-1">Choose what you want to be notified about.</p>
                    </div>

                    <Card variant="white" className="p-6 space-y-0 divide-y-2 divide-black/10">
                      {[
                        { label: 'Workflow Completions', desc: 'Get notified when a workflow finishes executing.', default: true },
                        { label: 'Memory Conflicts', desc: 'Alert when ORIN detects duplicate or conflicting content.', default: true },
                        { label: 'Notion Sync Errors', desc: 'Notify if a Notion write operation fails.', default: true },
                        { label: 'Build Mode Actions', desc: 'Confirm every action taken in Build mode.', default: false },
                        { label: 'Weekly Digest', desc: 'Weekly summary of your memory activity.', default: false },
                      ].map((item, i) => (
                        <ToggleRow key={i} label={item.label} desc={item.desc} defaultChecked={item.default} />
                      ))}
                    </Card>
                  </div>
                )}

                {/* ── APPEARANCE ── */}
                {activeTab === 'appearance' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="sage" className="mb-3">APPEARANCE</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Look & Feel</h2>
                      <p className="font-bold text-black/50 mt-1">Customize how ORIN looks for you.</p>
                    </div>

                    <Card variant="white" className="p-8 space-y-8">
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest">Theme</label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { name: 'Neo-Brutalist', bg: 'bg-[#ffe17c]', selected: true },
                            { name: 'Dark Ops', bg: 'bg-[#171e19]', selected: false },
                            { name: 'Minimal', bg: 'bg-white', selected: false },
                          ].map((theme) => (
                            <button
                              key={theme.name}
                              className={cn(
                                'p-4 border-2 rounded-xl text-left transition-all',
                                theme.selected
                                  ? 'border-black shadow-[4px_4px_0px_0px_#000]'
                                  : 'border-black/20 hover:border-black'
                              )}
                            >
                              <div className={cn('w-full h-12 rounded-lg border-2 border-black/20 mb-3', theme.bg)} />
                              <div className="text-xs font-black uppercase">{theme.name}</div>
                              {theme.selected && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-black/50">
                                  <Check className="w-3 h-3" /> Active
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest">Font Size</label>
                        <div className="flex gap-3">
                          {['Small', 'Medium', 'Large'].map((size, i) => (
                            <button
                              key={size}
                              className={cn(
                                'flex-1 py-3 border-2 border-black rounded-xl font-black uppercase text-xs transition-all',
                                i === 1 ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]' : 'hover:bg-neutral-50'
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* ── PRIVACY ── */}
                {activeTab === 'privacy' && (
                  <div className="max-w-2xl space-y-10">
                    <div>
                      <BrandBadge variant="black" className="mb-3">PRIVACY</BrandBadge>
                      <h2 className="text-4xl font-black uppercase tracking-tighter">Data & Security</h2>
                      <p className="font-bold text-black/50 mt-1">Control how your data is used.</p>
                    </div>

                    <Card variant="white" className="p-6 space-y-0 divide-y-2 divide-black/10">
                      {[
                        { label: 'Share anonymized usage data', desc: 'Help improve ORIN with anonymous analytics.', default: false },
                        { label: 'Retain session history', desc: 'Keep chat sessions for context continuity.', default: true },
                        { label: 'Allow AI training', desc: 'Contribute anonymized conversations to model training.', default: false },
                      ].map((item, i) => (
                        <ToggleRow key={i} label={item.label} desc={item.desc} defaultChecked={item.default} />
                      ))}
                    </Card>

                    <Card variant="charcoal" className="p-8 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#ffe17c] flex items-center justify-center border-2 border-[#ffe17c]">
                          <Shield className="w-5 h-5 text-black" />
                        </div>
                        <h3 className="text-xl font-black uppercase text-white">Data Export</h3>
                      </div>
                      <p className="font-bold text-white/50">Download a complete copy of all your ORIN data including sessions, memories, and settings.</p>
                      <Button variant="secondary" size="sm">Export My Data</Button>
                    </Card>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Toggle Row Helper ──────────────────────────────────────────
function ToggleRow({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-5">
      <div>
        <div className="font-black uppercase text-sm">{label}</div>
        <div className="text-xs font-bold text-black/40 mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          'relative w-14 h-7 border-2 border-black rounded-full transition-all flex-shrink-0',
          checked ? 'bg-[#ffe17c]' : 'bg-neutral-100'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full border-2 border-black bg-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]',
            checked ? 'left-7' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}
