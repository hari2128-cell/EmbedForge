import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircuitBoard, LockKeyhole, ShieldCheck } from 'lucide-react'
import './styles.css'

declare global { interface Window { Cashfree?: (options: { mode: 'sandbox' | 'production' }) => { checkout: (options: { paymentSessionId: string; redirectTarget: '_self' | '_blank' }) => void } } }

const stageTeaser = [
  ['01', 'FOUNDATIONS', 'Understand the hardware.'],
  ['02', 'COMMUNICATION', 'Make systems talk.'],
  ['03', 'EMBEDDED C', 'Write firmware that interacts with hardware.'],
  ['04', 'SYSTEM THINKING', 'Debug and reason about the complete system.'],
  ['05', 'BUILD', 'Apply the concepts.'],
]

const previewCards = [
  ['01', 'Microcontroller Fundamentals', 'Core concepts, architecture and registers.', '/notes/day-01.png'],
  ['09', 'SPI communication', 'Timing diagrams & implementation notes', '/notes/day-09.png'],
  ['12', 'PWM fundamentals', 'Frequency, duty cycle and motor control', '/notes/day-12.png'],
  ['24', 'Watchdog timers', 'Reliable recovery patterns', '/notes/day-24.png'],
]

type ProductStatus = 'available' | 'coming_soon' | 'sold_out' | 'archived'
type LearningStage = { number: string; title: string; description: string }
type PreviewItem = { label: string; title: string; description: string; image: string }
type Product = {
  id: string
  title: string
  description: string
  status: ProductStatus
  price?: number
  duration?: string
  learningPath?: LearningStage[]
  previewItems?: PreviewItem[]
}

const products: Product[] = [
  {
    id: '30-day-microcontroller-learning-kit',
    title: '30-Day Microcontroller Challenge',
    description: 'Thirty deliberate days across fundamentals, peripherals, Embedded C, debugging, and practical system thinking.',
    status: 'available',
    price: 49,
    duration: '30 days',
    learningPath: stageTeaser.map(([number, title, description]) => ({ number, title, description })),
    previewItems: previewCards.map(([label, title, description, image]) => ({ label: `Day ${label}`, title, description, image })),
  },
  { id: 'coming-soon-01', title: 'Coming Soon', description: 'A new structured embedded-systems learning experience is being developed.', status: 'coming_soon' },
  { id: 'coming-soon-02', title: 'Coming Soon', description: 'More practical learning resources and engineering challenges are on the way.', status: 'coming_soon' },
]

const featuredProduct = products[0]

function InteractiveSignalDiagram() {
  return (
    <div className="signal-diagram">
      <svg viewBox="0 0 800 200" role="img" style={{ width: '100%', height: 'auto' }}>
        <path className="trace" d="M50 100 H200 L250 50 H350" />
        <path className="trace trace-reverse" d="M450 50 H550 L600 100 H750" />
        <path className="trace" d="M50 150 H200 L250 150 H350" />
        <path className="trace trace-reverse" d="M450 150 H550 L600 150 H750" />
        <rect x="350" y="30" width="100" height="140" rx="12" className="mcu-chip" />
        <text x="400" y="105" textAnchor="middle" fill="white" style={{fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '2px'}}>MCU</text>
        <circle cx="50" cy="100" r="6" fill="var(--accent-cyan)" />
        <circle cx="50" cy="150" r="6" fill="var(--accent-cyan)" />
        <circle cx="750" cy="100" r="6" fill="var(--accent-blue-gray)" />
        <circle cx="750" cy="150" r="6" fill="var(--accent-blue-gray)" />
      </svg>
      <div style={{display: 'flex', justifyContent: 'space-between', padding: '16px 24px'}}>
        <span className="label-mono">Sensors</span>
        <span className="label-mono">Firmware Core</span>
        <span className="label-mono">Actuators</span>
      </div>
    </div>
  )
}

function EmbeddedEcosystem() {
  return (
    <div className="svg-ecosystem-container why-embedded-orbit">
      {/* Desktop Version */}
      <svg className="desktop-eco" viewBox="0 0 700 500" preserveAspectRatio="xMidYMid meet">
        {/* Orbit Path */}
        <circle cx="350" cy="250" r="180" fill="none" stroke="var(--border-active)" strokeWidth="1.5" strokeDasharray="6 6" />
        
        {/* Animated Orbits */}
        <motion.circle cx="350" cy="250" r="180" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Central MCU Node */}
        <rect x="270" y="170" width="160" height="160" rx="24" fill="var(--bg-surface-elevated)" stroke="var(--accent-cyan)" strokeWidth="1.5" />
        <text x="350" y="245" fill="var(--accent-cyan)" fontSize="32" textAnchor="middle" style={{fontFamily: 'system-ui', fontWeight: 800}}>MCU</text>
        <text x="350" y="275" fill="white" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>EMBEDDED SYSTEM</text>

        {/* Industry Nodes */}
        <g transform="translate(350, 40)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>AUTOMOTIVE</text>
        </g>
        <g transform="translate(530, 120)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>INDUSTRIAL</text>
        </g>
        <g transform="translate(530, 340)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>ROBOTICS</text>
        </g>
        <g transform="translate(350, 420)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>IoT</text>
        </g>
        <g transform="translate(170, 340)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>MEDICAL</text>
        </g>
        <g transform="translate(170, 120)">
          <rect x="-60" y="0" width="120" height="40" rx="8" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="24" fill="var(--text-muted)" fontSize="12" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>CONSUMER</text>
        </g>
      </svg>
      {/* Mobile Version: intentionally recomposed for a readable six-node orbit. */}
      <svg className="mobile-eco" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid meet">
        <circle cx="200" cy="210" r="148" fill="none" stroke="var(--border-active)" strokeWidth="1.5" strokeDasharray="6 6" />
        <motion.circle cx="200" cy="210" r="148" fill="none" stroke="var(--accent-cyan)" strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <rect x="130" y="160" width="140" height="100" rx="18" fill="var(--bg-surface-elevated)" stroke="var(--accent-cyan)" strokeWidth="1.5" />
        <text x="200" y="204" fill="var(--accent-cyan)" fontSize="31" textAnchor="middle" style={{fontFamily: 'system-ui', fontWeight: 800}}>MCU</text>
        <text x="200" y="230" fill="white" fontSize="11" letterSpacing="1" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>EMBEDDED SYSTEM</text>
        <g transform="translate(200, 48)">
          <rect x="-61" y="-18" width="122" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>AUTOMOTIVE</text>
        </g>
        <g transform="translate(80, 132)">
          <rect x="-54" y="-18" width="108" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>CONSUMER</text>
        </g>
        <g transform="translate(320, 132)">
          <rect x="-54" y="-18" width="108" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>INDUSTRIAL</text>
        </g>
        <g transform="translate(80, 288)">
          <rect x="-54" y="-18" width="108" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>MEDICAL</text>
        </g>
        <g transform="translate(320, 288)">
          <rect x="-54" y="-18" width="108" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>ROBOTICS</text>
        </g>
        <g transform="translate(200, 372)">
          <rect x="-54" y="-18" width="108" height="36" rx="7" fill="var(--bg-surface)" stroke="var(--border-subtle)" strokeWidth="1.5" />
          <text x="0" y="4" fill="var(--text-muted)" fontSize="11" letterSpacing=".7" textAnchor="middle" style={{fontFamily: 'var(--font-mono)'}}>IoT</text>
        </g>
      </svg>
    </div>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}} transition={{duration: 0.3}} className="page-wrapper">
      {children}
    </motion.div>
  )
}

function GlobalNav({ user, authOpen, setAuthOpen, accountOpen, setAccountOpen, beginSignIn, authenticating, signOut, authMessage, canTakeOver, signOutOtherDevices }: any) {
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()
  
  return (
    <>
      <nav>
        <div className="nav-container">
          <Link className="brand" to="/"><CircuitBoard size={24}/> EMBED<span style={{color: 'var(--text-high)'}}>FORGE</span></Link>
          <div className="nav-links">
            <Link to="/philosophy">Philosophy</Link>
            <Link to="/#products">Collection</Link>
            <Link to={`/products/${featuredProduct.id}`}>Featured Product</Link>
          </div>
          <div className="nav-actions">
            {user ? (
              <div style={{position: 'relative'}}>
                <button className="account-trigger" onClick={() => setAccountOpen(!accountOpen)}>
                  <div className="avatar">{user.name.slice(0,1)}</div>
                  {user.name.split(' ')[0]}
                </button>
                {accountOpen && (
                  <div className="account-menu">
                    <button onClick={() => { navigate('/dashboard'); setAccountOpen(false) }}>My Dashboard</button>
                    <button onClick={() => { signOut(); setAccountOpen(false) }}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-secondary" onClick={() => setAuthOpen(true)}>Sign In</button>
            )}
          </div>
          <button className="mobile-menu-btn" aria-label="Open navigation menu" onClick={() => setMenu(!menu)}>
            MENU
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {menu && (
          <motion.div className="drawer-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setMenu(false)}>
            <motion.div className="mobile-drawer" initial={{x: '100%'}} animate={{x: 0}} exit={{x: '100%'}} transition={{type: 'tween', ease: 'easeOut', duration: 0.25}} onClick={e => e.stopPropagation()}>
              <div style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '32px'}}>
                <button className="close-btn" onClick={() => setMenu(false)}>×</button>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <Link to="/philosophy" onClick={() => setMenu(false)}>Philosophy</Link>
                <Link to="/#products" onClick={() => setMenu(false)}>Collection</Link>
                <Link to={`/products/${featuredProduct.id}`} onClick={() => setMenu(false)}>Featured Product</Link>
                <hr style={{borderColor: 'var(--border-subtle)', opacity: 0.5, margin: '8px 0'}} />
                {user ? (
                  <>
                    <button className="btn-primary" onClick={() => { navigate('/dashboard'); setMenu(false) }} style={{justifyContent: 'center'}}>Dashboard</button>
                    <button className="btn-secondary" onClick={() => { signOut(); setMenu(false) }} style={{justifyContent: 'center'}}>Sign Out</button>
                  </>
                ) : (
                  <button className="btn-primary" onClick={() => {setMenu(false); setAuthOpen(true)}} style={{justifyContent: 'center'}}>Sign In / Unlock</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {authOpen && (
          <motion.div className="modal-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setAuthOpen(false)}>
            <motion.div className="auth-box" initial={{y: 20, scale: 0.95}} animate={{y: 0, scale: 1}} exit={{y: 20, scale: 0.95}} onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setAuthOpen(false)}>×</button>
              <p className="label-mono" style={{marginBottom: '16px'}}>SECURE ACCOUNT ACCESS</p>
              <h3>Continue with Google</h3>
              <p className="body-standard" style={{marginTop: '16px'}}>Use your Google account to unlock the full preview and securely deliver your purchase.</p>
              {authMessage && <p style={{color: '#ff6b6b', marginTop: '12px', fontSize: '14px'}}>{authMessage}</p>}
              {canTakeOver && <button className="btn-secondary" onClick={signOutOtherDevices} style={{width: '100%', marginTop: '16px'}}>Log out from all other devices</button>}
              <button className="google-btn" onClick={beginSignIn} disabled={authenticating}>
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {authenticating ? 'Redirecting...' : 'Continue with Google'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function GlobalFooter() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const Chevron = ({ open }: { open: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}} className="mobile-only-icon"><path d="m6 9 6 6 6-6"/></svg>
  );

  return (
    <motion.footer initial={{opacity: 0, y: 20}} whileInView={{opacity: 1, y: 0}} viewport={{once: true}} transition={{duration: 0.5}}>
      <div className="footer-grid">
        <div>
          <div className="brand" style={{marginBottom: '16px'}}><CircuitBoard size={20}/> EMBED<span style={{color: 'var(--text-muted)'}}>FORGE</span></div>
          <div className="label-mono" style={{marginBottom: '16px'}}>START WITH REGISTERS. END WITH SYSTEMS.</div>
          <p className="body-standard" style={{marginBottom: '8px', color: 'var(--text-high)'}}>Build the fundamentals.<br/>Understand the system.<br/>Think like an embedded engineer.</p>
          <p className="body-standard" style={{marginTop: '24px', fontSize: '14px'}}>Created & curated by Hari Sakthivel.</p>
          <div style={{marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px'}}>
            <a href="mailto:harisakthivel2128@gmail.com" style={{color: 'var(--accent-cyan)'}}>harisakthivel2128@gmail.com</a>
            <a href="https://www.linkedin.com/in/hari-sakthivel-2532a1384" target="_blank" rel="noreferrer" style={{color: 'var(--text-muted)'}}>LinkedIn</a>
          </div>
        </div>
        <div className="footer-col">
          <h4 onClick={() => toggleSection('explore')} className="accordion-header">
            EXPLORE <Chevron open={openSection === 'explore'} />
          </h4>
          <div className={`footer-links ${openSection === 'explore' ? 'open' : ''}`}>
            <Link to="/philosophy">The Philosophy</Link>
            <Link to="/path">The Learning Path</Link>
            <Link to="/preview">Preview</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
        </div>
        <div className="footer-col">
          <h4 onClick={() => toggleSection('support')} className="accordion-header">
            SUPPORT & LEGAL <Chevron open={openSection === 'support'} />
          </h4>
          <div className={`footer-links ${openSection === 'support' ? 'open' : ''}`}>
            <Link to="/contact">Contact</Link>
            <Link to="/refund">Refund Policy</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Use</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="label-mono">© 2026 EMBEDFORGE</p>
      </div>
    </motion.footer>
  )
}

function Home({ user, setAuthOpen }: any) {
  const navigate = useNavigate()
  const { hash, pathname } = useLocation()

  useEffect(() => {
    const sectionForRoute: Record<string, string> = {
      '/philosophy': 'why-embedded',
    }
    const target = hash ? hash.replace('#', '') : sectionForRoute[pathname]
    if (target) {
      setTimeout(() => {
        const element = document.getElementById(target)
        if (element) element.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [hash, pathname])

  return <PageTransition>
    <main>
      <section className="hero" id="top">
        <div className="hero-grid-bg"></div>
        <div className="container">
          <div className="split-layout">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.6}}>
              <p className="label-mono" style={{marginBottom: '24px'}}>Embedded Systems Learning Journey</p>
              <h1>From the first register<br/><em>to systems-level thinking.</em></h1>
              <p className="body-hero" style={{marginTop: '24px'}}>A growing collection of deliberate learning experiences for engineers who want to understand systems from the register upward.</p>
              <div className="hero-actions">
                <button className="btn-primary" onClick={() => navigate('/#products')}>Explore the Collection <ArrowRight size={18}/></button>
                <button className="btn-text" onClick={() => navigate(`/products/${featuredProduct.id}`)}>Explore the Featured Product <ArrowRight size={18}/></button>
              </div>
              <p className="hero-price">Focused learning products · One-time purchase · No subscription</p>
            </motion.div>
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} transition={{duration:0.8, delay:0.2}}>
              <InteractiveSignalDiagram />
            </motion.div>
          </div>
        </div>
      </section>

      <section id="products" className="section story-section">
        <div className="container">
          <div className="story-content">
            <div className="story-header">
              <p className="label-mono" style={{marginBottom: '16px'}}>THE EMBEDFORGE COLLECTION</p>
              <h2>Curated journeys for embedded-systems thinkers.</h2>
              <p className="body-large" style={{marginTop: '24px'}}>EmbedForge is a growing collection of focused, practical learning experiences.</p>
            </div>
            <div className="product-grid">
              {products.map((product, index) => <article className={`product-card ${product.status}`} key={product.id}>
                <span className="product-number">{String(index + 1).padStart(2, '0')}</span>
                <p className="label-mono">{product.status === 'available' ? 'AVAILABLE NOW' : 'COMING SOON'}</p>
                <h3>{product.title}</h3>
                <p className="body-standard">{product.description}</p>
                {product.status === 'available' ? <><p className="product-price">₹{product.price} <span>one-time access</span></p><button className="btn-primary" onClick={() => navigate(`/products/${product.id}`)}>Explore Product <ArrowRight size={18}/></button></> : <span className="product-status">Coming Soon</span>}
              </article>)}
            </div>
          </div>
        </div>
      </section>

      <section id="why-embedded" className="section story-section">
        <div className="container">
          <div className="story-line-container"><div className="story-line-fill" style={{height: '100%'}}></div></div>
          <div className="split-layout story-content">
            <div className="story-header" style={{marginBottom: 0}}>
              <p className="label-mono" style={{marginBottom: '16px'}}>WHY EMBEDDED SYSTEMS</p>
              <h2>Software becomes physical here.</h2>
              <p className="body-large" style={{marginTop: '24px'}}>Embedded systems connect code to the physical world — from vehicles and industrial machines to robots and connected devices.</p>
            </div>
            
            <EmbeddedEcosystem />
          </div>
        </div>
      </section>

    </main>
  </PageTransition>
}

function ProductLearningPath({ product }: { product: Product }) {
  if (!product.learningPath?.length) return null
  return <section id="learning-path" className="section story-section"><div className="container"><div className="story-line-container"><div className="story-line-fill" style={{height: '100%'}} /></div><div className="story-content"><div className="story-header"><p className="label-mono" style={{marginBottom: '16px'}}>LEARNING PATH</p><h2>{product.duration}.<br/>One deliberate progression.</h2><p className="body-large" style={{marginTop: '24px'}}>A structured path from microcontroller fundamentals to practical embedded-system thinking.</p></div><div className="stage-timeline">{product.learningPath.map((stage, i) => <motion.div className="stage-card" key={stage.number} initial={{opacity:0, x:-20}} whileInView={{opacity:1, x:0}} viewport={{once:true, margin: '-100px'}} transition={{delay: i * 0.1}}><div className="stage-number">{stage.number}</div><div><h3 className="card-heading">{stage.title}</h3><p className="body-standard">{stage.description}</p></div></motion.div>)}</div><div style={{marginTop: '48px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-faint)'}}><LockKeyhole size={18} /><span className="body-standard">The complete curriculum unlocks with this learning product.</span></div></div></div></section>
}

function ProductPreview({ product, user, setAuthOpen }: { product: Product; user: unknown; setAuthOpen: (open: boolean) => void }) {
  const [previewIndex, setPreviewIndex] = useState(0)
  const previewItems = product.previewItems ?? []
  if (!previewItems.length) return null
  const item = previewItems[previewIndex]
  return <section id="preview" className="section story-section"><div className="container"><div className="story-line-container"><div className="story-line-fill" style={{height: '100%'}} /></div><div className="story-content"><div className="story-header"><p className="label-mono" style={{marginBottom: '16px'}}>PRODUCT PREVIEW</p><h2>See the work before you buy.</h2><p className="body-large" style={{marginTop: '24px'}}>{user ? 'Explore the representative preview pages across this learning product.' : 'Sign in with Google to unlock the complete preview.'}</p></div><div className="preview-viewer"><div className="doc-display"><div className="doc-header"><span>{item.label.toUpperCase()}</span><span>EMBEDFORGE</span></div><h3 className="doc-title">{item.title}</h3><div className="doc-image-wrapper" style={{flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '4px', marginTop: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '300px'}}><img src={item.image} alt={`${item.label} preview`} style={{width: '100%', height: '100%', objectFit: 'contain', display: 'block'}} /></div>{!user && previewIndex > 0 && <div style={{position: 'absolute', inset: 0, backdropFilter: 'blur(8px)', background: 'rgba(26, 37, 40, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '4px', zIndex: 10}}><LockKeyhole size={32} style={{marginBottom: '16px', color: 'var(--accent-cyan)'}}/><h4 style={{marginBottom: '16px'}}>Sign in to view</h4><button className="btn-primary" onClick={() => setAuthOpen(true)}>Continue with Google</button></div>}</div><div className="preview-sidebar"><p className="preview-page-indicator label-mono" style={{marginBottom: '16px'}}>PAGE {previewIndex + 1} / {previewItems.length}</p><h3 className="preview-title" style={{fontSize: '20px', marginBottom: '8px'}}>{item.title}</h3><p className="preview-desc body-standard" style={{fontSize: '14px'}}>{item.description}</p><div className="thumbnail-grid">{previewItems.map((preview, i) => <button key={preview.label} className={`thumb-btn ${previewIndex === i ? 'active' : ''}`} onClick={() => user && setPreviewIndex(i)} disabled={!user && i > 0}>{preview.label.replace(/[^0-9A-Za-z]/g, '').slice(-3)}</button>)}</div><div className="preview-nav-btns" style={{marginTop: '32px', display: 'flex', gap: '16px'}}><button className="btn-secondary" onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} style={{padding: '0 16px', width: '100%'}}><ChevronLeft size={20}/></button><button className="btn-secondary" onClick={() => setPreviewIndex(Math.min(previewItems.length - 1, previewIndex + 1))} disabled={previewIndex === previewItems.length - 1} style={{padding: '0 16px', width: '100%'}}><ChevronRight size={20}/></button></div></div></div></div></div></section>
}

function ProductPricing({ product, beginCheckout, checkoutLoading, phone, setPhone, message, setAuthOpen, user, coupon, setCoupon, couponStatus, applyCoupon, couponLoading }: any) {
  return <section id="pricing" className="section story-section"><div className="container"><div className="pricing-layout">
          <div>
            <p className="label-mono" style={{marginBottom: '16px'}}>PRODUCT PRICING</p>
            <h2 style={{marginBottom: '24px'}}>Everything you need to build a stronger embedded foundation.</h2>
            <p className="body-large">Get verified access to the complete {product.duration} curriculum, approved technical notes, and this product's private learning dashboard.</p>
          </div>
          
          <div>
            <div className="price-val">{couponStatus?.valid ? <><s>₹{product.price}</s> ₹29</> : `₹${product.price}`}</div>
            <p className="label-mono" style={{marginTop: '16px'}}>ONE-TIME PURCHASE</p>
            <label className="coupon-label" htmlFor="coupon">Have a coupon?</label>
            <div className="coupon-row">
              <input id="coupon" className="phone-input" placeholder="Enter coupon code" value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} />
              <button className="btn-secondary" type="button" onClick={() => applyCoupon(product.id)} disabled={couponLoading || !coupon.trim()}>{couponLoading ? 'Checking…' : 'Apply'}</button>
            </div>
            {couponStatus && <p className={couponStatus.valid ? 'coupon-success' : 'coupon-error'} role="status">{couponStatus.message}</p>}
            
            <div className="purchase-features">
              {[
                'Structured journey (scaleable content)',
                'Technical notes',
                'Microcontroller fundamentals',
                'Communication protocols',
                'Embedded C',
                'System-level concepts',
                'Practical learning',
                'Final challenge'
              ].map(f => (
                <div className="feature-item" key={f}><Check size={18}/> {f}</div>
              ))}
            </div>

            <input type="tel" className="phone-input" placeholder="Enter your 10-digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} />
            <button className="btn-primary" style={{width: '100%'}} onClick={() => { if(!user) setAuthOpen(true); else beginCheckout(product.id); }} disabled={checkoutLoading}>
              {checkoutLoading ? 'Preparing Secure Checkout...' : `Pay ₹${couponStatus?.valid ? 29 : product.price}`} <ArrowRight size={20} />
            </button>
            {message && <p style={{color: '#ff6b6b', marginTop: '16px', fontSize: '14px', textAlign: 'center'}}>{message}</p>}
            
            <div style={{marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-faint)', fontSize: '13px'}}>
              <ShieldCheck size={16} /> Secure payment · One-time purchase · No subscription
            </div>
          </div>
        </div></div></section>
}

function ProductPage(props: any) {
  const { productId } = useParams()
  const { hash } = useLocation()
  const product = products.find(candidate => candidate.id === productId)
  useEffect(() => { if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({behavior: 'smooth'}), 100); else window.scrollTo(0, 0) }, [hash, productId])
  if (!product) return <NotFound />
  if (product.status !== 'available') return <PageTransition><main style={{paddingTop: '160px', minHeight: '80vh'}}><div className="container" style={{textAlign: 'center'}}><p className="label-mono" style={{marginBottom: '16px'}}>COMING SOON</p><h2>A new learning experience is in development.</h2><p className="body-large" style={{margin: '24px auto 48px', maxWidth: '560px'}}>{product.description}</p><Link className="btn-primary" to="/#products">Explore the Collection <ArrowRight size={18}/></Link></div></main></PageTransition>
  return <PageTransition><main><section className="hero" style={{paddingTop: '160px'}}><div className="hero-grid-bg"/><div className="container"><div className="split-layout"><div><p className="label-mono" style={{marginBottom: '24px'}}>AVAILABLE LEARNING PRODUCT</p><h1>{product.title}</h1><p className="body-hero" style={{marginTop: '24px'}}>{product.description}</p><div className="hero-actions"><a className="btn-primary" href="#learning-path">View Learning Path <ArrowRight size={18}/></a><a className="btn-text" href="#preview">Preview the Work <ArrowRight size={18}/></a></div><p className="hero-price">₹{product.price} · One-time product access · No subscription</p></div><InteractiveSignalDiagram /></div></div></section><ProductLearningPath product={product}/><ProductPreview product={product} user={props.user} setAuthOpen={props.setAuthOpen}/><ProductPricing product={product} {...props}/></main></PageTransition>
}

function Dashboard({ user, hasAccess, onSignIn }: { user: { name: string; email: string } | null; hasAccess: boolean; onSignIn: () => void }) {
  const navigate = useNavigate()
  
  if (!user) return (
    <PageTransition>
      <main className="dashboard-layout">
        <div className="container" style={{textAlign: 'center', paddingTop: '120px'}}>
          <LockKeyhole size={48} style={{color: 'var(--accent-cyan)', margin: '0 auto 32px'}} />
          <h2>Sign in to view your learning kit.</h2>
          <button className="btn-primary" style={{marginTop: '32px'}} onClick={onSignIn}>Continue with Google <ArrowRight size={20}/></button>
        </div>
      </main>
    </PageTransition>
  )

  return (
    <PageTransition>
      <main className="dashboard-layout">
        <header className="dash-header">
          <div className="container">
            <p className="label-mono" style={{marginBottom: '16px'}}>CUSTOMER WORKSPACE</p>
            <h1>Welcome back, {user.name.split(' ')[0]}.</h1>
          </div>
        </header>

        <section className="section">
          <div className="container">
            <div className="pricing-layout" style={{padding: '40px', gap: '32px', gridTemplateColumns: '1fr', background: 'var(--bg-surface)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px'}}>
                <div>
                  <p className="label-mono" style={{marginBottom: '8px'}}>YOUR LEARNING KIT</p>
                  <h3 style={{marginBottom: '8px'}}>30-Day Microcontroller Learning Kit</h3>
                  <p className="body-standard">A verified purchase unlocks your full learning path and provides access delivery to your verified email.</p>
                </div>
                {hasAccess ? <a className="btn-primary" href="/api/access/tool">Open Learning Kit <ArrowRight size={20}/></a> : <button className="btn-primary" onClick={() => navigate('/pricing')}>Unlock the Complete Kit</button>}
              </div>
            </div>

            <div style={{marginTop: '80px'}}>
              <h2 style={{marginBottom: '16px'}}>Your Learning Path</h2>
              <p className="body-large" style={{marginBottom: '48px'}}>{hasAccess ? 'Your verified purchase is active. Open the learning kit to continue.' : 'The complete day-by-day curriculum is loaded from protected access only after your purchase has been verified.'}</p>
              <div className="dashboard-stage-grid">
                {stageTeaser.map(([number, title, description]) => <article key={title} className="dashboard-stage"><span>{number}</span><h3>{title}</h3><p>{description}</p><LockKeyhole size={16}/></article>)}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PageTransition>
  )
}

type Material = { name: string; path: string; isFolder: boolean; url?: string }

function LearningKit({ user, hasAccess, authLoading, onSignIn }: { user: { name: string; email: string } | null; hasAccess: boolean; authLoading: boolean; onSignIn: () => void }) {
  const [query, setQuery] = useSearchParams()
  const path = query.get('path') ?? ''
  const [items, setItems] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !hasAccess) return
    setLoading(true); setError('')
    fetch(`/api/access/materials?path=${encodeURIComponent(path)}`, { credentials: 'include' })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => setItems(data.items ?? []))
      .catch(() => setError('Unable to load the learning materials. Please try again.'))
      .finally(() => setLoading(false))
  }, [user, hasAccess, path])

  if (authLoading) return <PageTransition><main className="dashboard-layout"><div className="container" style={{textAlign: 'center', paddingTop: '120px'}}><p className="label-mono">RESTORING YOUR SESSION</p><p className="body-large" style={{margin: '16px auto'}}>Loading your learning kit…</p></div></main></PageTransition>
  if (!user) return <PageTransition><main className="dashboard-layout"><div className="container" style={{textAlign: 'center', paddingTop: '120px'}}><LockKeyhole size={48} style={{color: 'var(--accent-cyan)', margin: '0 auto 32px'}} /><h2>Sign in to open your learning kit.</h2><button className="btn-primary" style={{marginTop: '32px'}} onClick={onSignIn}>Continue with Google <ArrowRight size={20}/></button></div></main></PageTransition>
  if (!hasAccess) return <PageTransition><main className="dashboard-layout"><div className="container" style={{textAlign: 'center', paddingTop: '120px'}}><LockKeyhole size={48} style={{color: 'var(--accent-cyan)', margin: '0 auto 32px'}} /><h2>Your learning kit unlocks after payment is verified.</h2><Link className="btn-primary" style={{marginTop: '32px'}} to="/pricing">Unlock the Complete Kit <ArrowRight size={20}/></Link></div></main></PageTransition>

  const parentPath = path.split('/').slice(0, -1).join('/')
  return <PageTransition><main className="dashboard-layout"><header className="dash-header"><div className="container"><p className="label-mono" style={{marginBottom: '16px'}}>YOUR LEARNING KIT</p><h1>30-Day Microcontroller Learning Kit</h1><p className="body-standard" style={{marginTop: '16px'}}>Files are available only while your signed-in device session is active.</p></div></header><section className="section"><div className="container" style={{maxWidth: '900px'}}>{path && <button className="btn-secondary" onClick={() => setQuery(parentPath ? {path: parentPath} : {})} style={{marginBottom: '24px'}}>← Back</button>}<p className="label-mono" style={{marginBottom: '16px'}}>{path || 'START HERE'}</p>{loading ? <p className="body-standard">Loading materials…</p> : error ? <p style={{color: '#ff6b6b'}}>{error}</p> : <div className="dashboard-stage-grid">{items.map(item => item.isFolder ? <button key={item.path} className="dashboard-stage" onClick={() => setQuery({path: item.path})} style={{textAlign: 'left'}}><span>FOLDER</span><h3>{item.name}</h3><p>Open this section</p><ArrowRight size={16}/></button> : <a key={item.path} className="dashboard-stage" href={item.url} target="_blank" rel="noreferrer"><span>FILE</span><h3>{item.name}</h3><p>Open securely</p><ArrowRight size={16}/></a>)}</div>}{!loading && !error && items.length === 0 && <p className="body-standard">This folder is empty.</p>}</div></section></main></PageTransition>
}

const legalCopy: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  privacy: { title: 'Your data should stay yours.', intro: 'How EmbedForge handles the limited information required to provide a secure learning-product experience.', sections: [['Google authentication','We use Google Sign-In only to identify your account and obtain your verified email address.'],['Payments and delivery','Payment processing is handled securely. Purchase access details are delivered to your verified email after server-side confirmation.'],['Protected content','Your access to the learning kit is tied directly to your verified account.']] },
  terms: { title: 'Clear terms. No surprises.', intro: 'The terms that apply when you use EmbedForge and purchase the 30-Day Microcontroller Learning Kit.', sections: [['Product access','The learning kit is a digital product for your personal learning use. Do not redistribute, resell, or share its material.'],['Payment and delivery','₹49 is a one-time payment. Access is provided after payment verification and delivery details are sent to your verified email.'],['Account responsibility','Keep access to your Google account secure. You are responsible for activity associated with your account.']] },
  refund: { title: 'Simple and transparent.', intro: 'A concise, transparent refund policy for this digital learning product.', sections: [['Digital delivery','Because access details for a digital product are sent after confirmed payment, refund requests are evaluated individually.'],['Need help?','If you experienced a payment issue, delivery problem, or duplicate charge, contact us with your order details.'],['No guaranteed outcomes','Refund eligibility is not based on personal learning outcomes, interviews, or placement results.']] },
  contact: { title: "Need help?", intro: 'Questions about the learning kit, account access, or payment? Get in touch.', sections: [['Email','harisakthivel2128@gmail.com'],['LinkedIn','www.linkedin.com/in/hari-sakthivel-2532a1384']] },
}

function LegalPage({ type }: { type: keyof typeof legalCopy }) {
  const page = legalCopy[type]
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return <PageTransition>
    <main style={{paddingTop: '120px', minHeight: '80vh'}}>
      <div className="container" style={{maxWidth: '800px'}}>
        <p className="label-mono" style={{marginBottom: '24px'}}>EMBEDFORGE · {type.toUpperCase()}</p>
        <h1 style={{marginBottom: '24px'}}>{page.title}</h1>
        <p className="body-large" style={{marginBottom: '64px'}}>{page.intro}</p>
        {page.sections.map(([title, text])=>
          <section key={title} style={{marginBottom: '48px', borderTop: '1px solid var(--border-subtle)', paddingTop: '32px'}}>
            <h3>{title}</h3>
            <p className="body-standard" style={{marginTop: '16px'}}>{text}</p>
          </section>
        )}
        {type === 'contact' && (
          <div style={{display: 'flex', gap: '16px', marginTop: '32px'}}>
            <a href="mailto:harisakthivel2128@gmail.com" className="btn-primary">Send an Email</a>
            <a href="https://www.linkedin.com/in/hari-sakthivel-2532a1384" target="_blank" rel="noreferrer" className="btn-secondary">Connect on LinkedIn</a>
          </div>
        )}
      </div>
    </main>
  </PageTransition>
}

function PaymentReturn() {
  const [query] = useSearchParams()
  const orderId = query.get('order_id')
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'failed' | 'error'>('checking')
  useEffect(() => { if (!orderId) { setStatus('error'); return }; fetch(`/api/payments/orders/${encodeURIComponent(orderId)}`, { credentials: 'include' }).then(async response => { if (!response.ok) throw new Error(); const data = await response.json() as {status: string}; setStatus(data.status === 'PAID' ? 'paid' : data.status === 'ACTIVE' ? 'pending' : 'failed') }).catch(() => setStatus('error')) }, [orderId])
  const copy = status === 'checking' ? ['Confirming your payment…', 'We are securely checking the payment result.'] : status === 'paid' ? ['Payment confirmed ✓', 'Your purchase is being prepared for secure access and email delivery.'] : status === 'pending' ? ['Payment verification in progress', 'Your payment has not been confirmed yet. Check again shortly.'] : status === 'failed' ? ['Payment was not completed', 'No learning-kit access has been granted. You can try checkout again.'] : ['We could not confirm this payment', 'Please return to the learning kit and try again, or contact support.']
  return <PageTransition><main style={{paddingTop: '160px', minHeight: '80vh'}}><div className="container" style={{textAlign: 'center'}}><ShieldCheck size={48} style={{color: 'var(--accent-cyan)', margin: '0 auto 32px'}} /><p className="label-mono" style={{marginBottom: '16px'}}>CASHFREE PAYMENT</p><h2>{copy[0]}</h2><p className="body-large" style={{margin: '24px auto 48px', maxWidth: '500px'}}>{copy[1]}</p>{status==='paid' ? <a className="btn-primary" href="/api/access/tool">Open Learning Kit <ArrowRight size={20}/></a> : <Link className="btn-primary" to="/">Return to EmbedForge <ArrowRight size={20}/></Link>}</div></main></PageTransition>
}

function NotFound() {
  return <PageTransition><main style={{paddingTop: '160px', minHeight: '80vh'}}><div className="container" style={{textAlign: 'center'}}><p className="label-mono" style={{marginBottom: '16px'}}>404 · PAGE NOT FOUND</p><h2>This page does not exist.</h2><p className="body-large" style={{margin: '24px auto 48px', maxWidth: '520px'}}>Return to EmbedForge to explore the learning kit, preview, or your dashboard.</p><Link className="btn-primary" to="/">Return to EmbedForge <ArrowRight size={20}/></Link></div></main></PageTransition>
}

function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState<{name: string; email: string} | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [canTakeOver, setCanTakeOver] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [coupon, setCoupon] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponStatus, setCouponStatus] = useState<{valid: boolean; message: string} | null>(null)
  const location = useLocation()

  useEffect(() => { fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(data => { setUser(data?.user ?? null); setHasAccess(Boolean(data?.hasAccess)) }).catch(() => undefined).finally(() => setAuthLoading(false)) }, [])
  useEffect(() => {
    const signInError = new URLSearchParams(location.search).get('sign_in_error')
    if (!signInError) return
    if (signInError === 'active_session') {
      setAuthMessage('This selected account is already active on another device.')
      setCanTakeOver(true)
    } else if (signInError === 'session_unavailable') {
      setAuthMessage('Account sessions are not configured yet. Apply the Supabase session migration, then try again.')
      setCanTakeOver(false)
    }
    setAuthOpen(true)
    window.history.replaceState({}, '', location.pathname)
  }, [location.search, location.pathname])
  
  const signOut = async () => { await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }).catch(() => undefined); setUser(null); setHasAccess(false) }
  const beginSignIn = () => {
    setAuthenticating(true)
    setMessage('')
    setAuthMessage('')
    setCanTakeOver(false)
    const destinationParams = new URLSearchParams(window.location.search)
    destinationParams.delete('sign_in_error')
    const destination = `${window.location.pathname}${destinationParams.size ? `?${destinationParams}` : ''}`
    window.location.assign(`/api/auth/google/start?next=${encodeURIComponent(destination)}`)
  }
  const signOutOtherDevices = async () => {
    try {
      const response = await fetch('/api/auth/sign-out-other-devices', { method: 'POST', credentials: 'include' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || 'We could not sign out the other device. Please try again.')
      const account = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      setUser(data.user ?? null); setHasAccess(Boolean(account?.hasAccess)); setAuthMessage(''); setCanTakeOver(false); setAuthOpen(false)
      window.history.replaceState({}, '', '/')
    } catch (error) { setAuthMessage(error instanceof Error ? error.message : 'We could not sign out the other device. Please try again.') }
  }
  const beginCheckout = async (productId: string) => {
    setCheckoutLoading(true); setMessage('')
    try {
      const response = await fetch('/api/payments/checkout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, phone, coupon: couponStatus?.valid ? coupon : '' }) })
      if (response.status === 401) { setAuthOpen(true); return }
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || 'Checkout is temporarily unavailable. Please try again shortly.')
      const { paymentSessionId } = data as { paymentSessionId?: string }
      if (!paymentSessionId || !window.Cashfree) throw new Error('Checkout is temporarily unavailable.')
      window.Cashfree({ mode: 'sandbox' }).checkout({ paymentSessionId, redirectTarget: '_self' })
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Checkout is temporarily unavailable. Please try again shortly.') }
    finally { setCheckoutLoading(false) }
  }
  const applyCoupon = async (productId: string) => {
    setCouponLoading(true); setCouponStatus(null); setMessage('')
    try {
      const response = await fetch('/api/payments/coupon', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, coupon }) })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.detail || 'Unable to validate this coupon right now.')
      setCouponStatus({valid: true, message: 'Coupon applied — you saved ₹20 (40.82% OFF). Total: ₹29.'})
    } catch (error) { setCouponStatus({valid: false, message: error instanceof Error ? error.message : 'Invalid coupon code.'}) }
    finally { setCouponLoading(false) }
  }

  return <>
    <GlobalNav user={user} authOpen={authOpen} setAuthOpen={setAuthOpen} accountOpen={accountOpen} setAccountOpen={setAccountOpen} beginSignIn={beginSignIn} authenticating={authenticating} signOut={signOut} authMessage={authMessage} canTakeOver={canTakeOver} signOutOtherDevices={signOutOtherDevices} />
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home user={user} setAuthOpen={setAuthOpen} />} />
        <Route path="/philosophy" element={<Home user={user} setAuthOpen={setAuthOpen} />} />
        <Route path="/products/:productId" element={<ProductPage user={user} setAuthOpen={setAuthOpen} beginCheckout={beginCheckout} checkoutLoading={checkoutLoading} phone={phone} setPhone={setPhone} message={message} coupon={coupon} setCoupon={setCoupon} couponStatus={couponStatus} applyCoupon={applyCoupon} couponLoading={couponLoading} />} />
        <Route path="/path" element={<Navigate replace to={`/products/${featuredProduct.id}#learning-path`} />} />
        <Route path="/preview" element={<Navigate replace to={`/products/${featuredProduct.id}#preview`} />} />
        <Route path="/pricing" element={<Navigate replace to={`/products/${featuredProduct.id}#pricing`} />} />
        <Route path="/dashboard" element={<Dashboard user={user} hasAccess={hasAccess} onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/learning-kit" element={<LearningKit user={user} hasAccess={hasAccess} authLoading={authLoading} onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/privacy" element={<LegalPage type="privacy"/>} />
        <Route path="/terms" element={<LegalPage type="terms"/>} />
        <Route path="/refund" element={<LegalPage type="refund"/>} />
        <Route path="/contact" element={<LegalPage type="contact"/>} />
        <Route path="/payment/return" element={<PaymentReturn/>} />
        <Route path="*" element={<NotFound/>} />
      </Routes>
    </AnimatePresence>
    <GlobalFooter />
  </>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
)
