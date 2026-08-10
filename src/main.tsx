import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, CircuitBoard, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import './styles.css'

const journey = [
  ['01–07', 'FOUNDATIONS', 'MCU Architecture · GPIO · Registers · Timers · Interrupts'],
  ['08–10', 'COMMUNICATION', 'UART · SPI · I²C'],
  ['11–14', 'ANALOG & CONTROL', 'ADC · PWM · DAC · Peripheral Integration'],
  ['15–20', 'EMBEDDED C', 'Pointers · Structures · Modular Programming · Memory'],
  ['21–26', 'SYSTEM LEVEL', 'Datasheets · Debugging · Watchdog · Bootloader · FreeRTOS'],
  ['27–30', 'PROJECT & ENGINEERING', 'Sensor Dashboard · Documentation · Final Challenge'],
]

const features = [
  ['30 Days of Notes', 'Handwritten-style technical notes, organized day by day.'],
  ['Practical Learning', 'Exercises and project-oriented concepts that connect.'],
  ['Embedded C', 'The C concepts firmware developers actually use.'],
  ['Communication Protocols', 'UART, SPI and I²C made clear and usable.'],
  ['System-Level Thinking', 'Debugging, power, bootloaders and FreeRTOS fundamentals.'],
  ['Interview Preparation', 'Placement-oriented questions and core concepts.'],
]

const previewCards = [
  ['01', 'GPIO & digital I/O', 'Pin modes, registers and pull configurations'],
  ['09', 'SPI communication', 'Timing diagrams & implementation notes'],
  ['13', 'PWM fundamentals', 'Frequency, duty cycle and motor control'],
  ['25', 'Watchdog timers', 'Reliable recovery patterns'],
]

function SignalDiagram() {
  return <div className="signal" aria-label="Microcontroller signal flow diagram">
    <svg viewBox="0 0 760 200" role="img">
      <path className="trace trace-a" d="M44 99 H170 L202 58 H325 L357 100 H474 L506 58 H688" />
      <path className="trace trace-b" d="M44 128 H139 L171 162 H284 L316 127 H441 L473 162 H690" />
      {[[44,99],[170,99],[202,58],[325,58],[357,100],[474,100],[506,58],[688,58],[139,128],[171,162],[284,162],[316,127],[441,127],[473,162],[690,162]].map(([cx, cy], i) => <circle key={i} className="node" cx={cx} cy={cy} r="5" />)}
      <rect x="281" y="66" width="112" height="68" rx="8" className="chip" /><text x="337" y="97" textAnchor="middle">MCU</text><text x="337" y="115" textAnchor="middle">CORE</text>
    </svg>
    <div className="signal-labels"><span>SENSORS</span><span>PERIPHERALS</span><span>COMMUNICATION</span><span>APPLICATION</span></div>
  </div>
}

function App() {
  const [menu, setMenu] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [message, setMessage] = useState('')
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  const beginSignIn = () => {
    setAuthenticating(true)
    setMessage('')
    window.location.assign('/api/auth/google/start')
  }
  const beginCheckout = async () => {
    setCheckoutLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/payments/checkout', { method: 'POST', credentials: 'include' })
      if (response.status === 401) { setAuthOpen(true); return }
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string } | null
        throw new Error(payload?.detail ?? 'Unable to start secure checkout. Please try again.')
      }
      const { checkoutUrl } = await response.json() as { checkoutUrl?: string }
      if (!checkoutUrl) throw new Error('Checkout is temporarily unavailable. Please try again.')
      window.location.assign(checkoutUrl)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.') }
    finally { setCheckoutLoading(false) }
  }
  return <main>
    <nav><a className="brand" href="#top"><CircuitBoard size={21}/> <span>EMBED</span><i/> FORGE</a><button className="menu" onClick={() => setMenu(!menu)}>Menu</button><div className={menu ? 'navlinks shown' : 'navlinks'}><a href="#overview">Overview</a><a href="#inside">What’s Inside</a><a href="#preview">Preview</a><a href="#faq">FAQ</a></div><button className="signin" onClick={() => setAuthOpen(true)}>Sign in with Google <ArrowRight size={16}/></button></nav>

    <section className="hero" id="top"><div className="grid"></div><motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.7}} className="hero-copy"><p className="eyebrow"><span/> 30 DAYS · EMBEDDED SYSTEMS · PRACTICAL LEARNING</p><h1>Master Microcontrollers.<br/><em>Build Like an Embedded Engineer.</em></h1><p className="lede">A structured 30-day journey from microcontroller fundamentals to embedded-system thinking, practical projects and interview preparation.</p><div className="actions"><button className="button primary" onClick={() => scrollTo('inside')}>Explore the Learning Kit <ArrowRight size={18}/></button><span>₹49 · One-time access</span></div></motion.div><motion.div className="hero-visual" initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} transition={{delay:.25,duration:.8}}><SignalDiagram/></motion.div><div className="hero-foot">LEARN <b/> BUILD <b/> DEBUG <b/> THINK</div></section>

    <section id="overview" className="intro section"><p className="eyebrow">WHY EMBEDDED SYSTEMS</p><div><h2>Embedded systems power<br/>the world around us.</h2><p>From automotive control units and medical devices to industrial automation, robotics and the everyday products in your pocket—embedded engineers make physical technology work.</p></div><div className="industries">{['AUTOMOTIVE','INDUSTRIAL','IoT DEVICES','ROBOTICS','MEDICAL','CONSUMER'].map(x=><span key={x}>{x}</span>)}</div></section>

    <section id="inside" className="section journey"><div className="section-heading"><p className="eyebrow">THE CURRICULUM</p><h2>One deliberate<br/>learning path.</h2><p>Progress from the first register write to systems-level engineering, with every day building on the last.</p></div><div className="timeline">{journey.map(([days,title,description],i)=><motion.article key={title} initial={{opacity:0,x:20}} whileInView={{opacity:1,x:0}} viewport={{once:true,amount:.25}} transition={{delay:i*.06}}><div className="day">DAYS<br/><strong>{days}</strong></div><div><h3>{title}</h3><p>{description}</p></div><span className="index">0{i+1}</span></motion.article>)}</div></section>

    <section className="section features"><div className="section-heading"><p className="eyebrow">WHAT YOU GET</p><h2>Everything organized<br/>into one learning path.</h2></div><div className="feature-grid">{features.map(([title,text],i)=><motion.article key={title} whileHover={{y:-5}} transition={{duration:.2}}><span>0{i+1}</span><h3>{title}</h3><p>{text}</p><ArrowRight size={17}/></motion.article>)}</div></section>

    <section id="preview" className="section preview"><div className="preview-head"><div><p className="eyebrow">PRODUCT PREVIEW</p><h2>Built for focused<br/>study sessions.</h2></div><p>A glimpse into the learning kit. Sign in to explore each day in full.</p></div><div className="notes">{previewCards.map(([day,title,text],i)=><article className={i>1 ? 'note locked' : 'note'} key={day}><div className="paper-top"><span>DAY {day}</span><span>30D / EMBEDDED</span></div><h3>{title}</h3><div className="scribble"></div><div className="lines"><i/><i/><i/><i/></div><p>{text}</p>{i>1 && <div className="lock"><LockKeyhole size={18}/><span>LOCKED</span></div>}</article>)}<div className="unlock"><LockKeyhole size={19}/><h3>Continue your exploration.</h3><p>Sign in with Google to unlock the complete preview.</p><button className="button primary" onClick={() => setAuthOpen(true)}>Continue with Google <ArrowRight size={17}/></button></div></div></section>

    <section className="purchase"><div className="purchase-grid"></div><div className="product-card"><p className="eyebrow">EMBEDFORGE · FULL ACCESS</p><h2>30-Day Microcontroller<br/>Learning Kit</h2><div className="price"><strong>₹49</strong><span>One-time payment</span></div><ul>{['30 days of structured notes','Embedded C & MCU peripherals','UART / SPI / I²C · ADC / PWM / DAC','Debugging, watchdog & bootloader','FreeRTOS, mini projects & final challenge','Interview preparation'].map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><button className="button primary wide" onClick={beginCheckout} disabled={checkoutLoading}>{checkoutLoading ? 'Opening secure checkout…' : 'Buy the Complete Kit — ₹49'} <ArrowRight size={18}/></button>{message && <p className="action-error" role="alert">{message}</p>}<p className="secure"><ShieldCheck size={15}/> Secure payment · Email delivery · No subscription</p></div></section>

    <section id="faq" className="section faq"><p className="eyebrow">COMMON QUESTIONS</p><h2>Clear from the start.</h2>{[['Who is this for?','Students, beginners and aspiring embedded engineers who want a structured practical path.'],['Do I need prior embedded experience?','Basic C is helpful, but the journey begins from core microcontroller fundamentals.'],['What do I receive?','The complete 30-day learning kit plus supporting resources and the final challenge.'],['Is this a subscription?','No. ₹49 is a one-time purchase.'],['How will I receive the material?','After confirmed payment, access details are sent to your verified email.']].map(([q,a],i)=><article key={q}><button onClick={()=>setOpenFaq(openFaq===i?null:i)}>{q}<ChevronDown size={19} className={openFaq===i?'rotated':''}/></button>{openFaq===i&&<p>{a}</p>}</article>)}</section>

    <section className="creator"><Sparkles size={20}/><p>Created & Curated by <strong>Hari Sakthivel</strong> · Electronics Engineering · Embedded Systems</p><span>Developed from a focused 30-day journey through practical embedded-system fundamentals.</span></section>
    <footer><div className="brand"><CircuitBoard size={20}/> <span>EMBED</span><i/> FORGE</div><p>© 2026 Hari Sakthivel</p><div><a href="#">Privacy Policy</a><a href="#">Terms of Use</a><a href="#">Refund Policy</a><a href="#">Contact</a></div></footer>
    {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="signin-title" onMouseDown={event => event.stopPropagation()}><button className="close" aria-label="Close sign in" onClick={() => setAuthOpen(false)}>×</button><div className="google-mark">G</div><p className="eyebrow">SECURE ACCOUNT ACCESS</p><h2 id="signin-title">Continue with Google</h2><p>Use your Google account to unlock the full preview and securely deliver your purchase to the right email address.</p><button className="google-button" onClick={beginSignIn} disabled={authenticating}>{authenticating ? 'Redirecting to Google…' : 'Continue with Google'} <ArrowRight size={18}/></button><small><ShieldCheck size={14}/> We request only your basic profile and verified email.</small></section></div>}
  </main>
}
export default App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
