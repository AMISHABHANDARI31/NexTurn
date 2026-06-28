import { Activity, ArrowRight, BarChart3, Check, CheckCircle2, Clock3, MapPin, ShieldCheck, Sparkles, TrendingDown, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'

const benefits = [
  { icon: Clock3, title: 'Wait with freedom', text: 'Join remotely, step away, and return at the right moment without losing your place.' },
  { icon: BarChart3, title: 'Plan with confidence', text: 'Live prediction ranges adapt to counter speed, demand, and service complexity.' },
  { icon: Users, title: 'Serve with focus', text: 'Give teams a calm operating view that turns queue pressure into clear next actions.' },
]

export function LandingPage() {
  return <>
    <section className="relative overflow-hidden border-b border-slate-200/70 px-4 pb-20 pt-14 sm:px-6 lg:pb-28 lg:pt-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(42,166,164,.18),transparent_34%),radial-gradient(circle_at_10%_82%,rgba(18,60,105,.08),transparent_28%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-aqua/30 bg-white/80 px-3.5 py-2 text-xs font-bold text-ocean shadow-sm backdrop-blur"><Sparkles size={14} />Smart queues. Calmer days.</div>
          <h1 className="display max-w-3xl text-5xl font-extrabold leading-[1.02] text-ink sm:text-6xl lg:text-[4.7rem]">Your time belongs<br /><span className="relative text-ocean">to you.<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 280 12" fill="none" aria-hidden="true"><path d="M3 8C78 2 185 2 277 6" stroke="#2aa6a4" strokeWidth="5" strokeLinecap="round" /></svg></span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">NexTurn predicts real wait times and keeps every visitor in the loop, so public services feel thoughtful before the conversation even begins.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/register"><Button className="w-full px-6 sm:w-auto" icon={<ArrowRight size={18} />}>Get your next turn</Button></Link><Link to="/locations"><Button variant="secondary" className="w-full px-6 sm:w-auto">Find a location</Button></Link></div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600"><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-aqua" />Privacy-first</span><span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-aqua" />No app required</span><span className="flex items-center gap-2"><Users size={17} className="text-aqua" />Accessible by design</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl pb-10">
          <div className="card relative overflow-hidden border-white bg-white p-5 shadow-[0_35px_80px_-35px_rgba(16,42,67,.45)] sm:p-7">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-mint/60" />
            <div className="relative flex items-start justify-between"><div><p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.14em] text-slate-400"><MapPin size={13} />Central Civic Hub</p><h2 className="mt-2 text-xl font-bold">Identity services</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live</span></div>
            <div className="my-8 grid grid-cols-2 gap-5"><div><p className="text-sm text-slate-500">Estimated wait</p><p className="display mt-1 text-5xl font-bold text-navy">18<span className="ml-1 text-lg text-slate-500">min</span></p><p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><TrendingDown size={14} />3 min faster</p></div><div className="border-l border-slate-200 pl-5"><p className="text-sm text-slate-500">People ahead</p><p className="display mt-1 text-5xl font-bold text-navy">4</p><p className="mt-2 text-xs text-slate-500">2 counters active</p></div></div>
            <div className="rounded-2xl bg-slate-50 p-4"><div className="mb-3 flex justify-between text-xs font-semibold"><span>Queue progress</span><span className="text-ocean">67%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-ocean to-aqua" /></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Activity size={15} className="text-ocean" />The prediction refreshes automatically as the queue moves.</div></div>
          </div>
          <div className="absolute -bottom-1 -left-3 rounded-2xl bg-coral p-4 text-white shadow-xl sm:-left-8"><Clock3 size={20} /><p className="mt-2 text-lg font-bold">7,400 hours</p><p className="text-xs text-white/80">returned this month</p></div>
          <div className="absolute -right-2 top-1/2 hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:block"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Accuracy</p><p className="mt-1 text-xl font-bold text-ink">92%</p></div>
        </div>
      </div>
    </section>

    <section aria-label="Trust indicators" className="bg-white px-4 py-7"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center sm:flex-row sm:text-left"><p className="text-sm font-semibold text-slate-500">Built for dependable public service at every scale</p><div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-bold text-slate-400"><span>CIVIC CENTRES</span><span>HEALTH NETWORKS</span><span>SERVICE HUBS</span></div></div></section>

    <section className="bg-navy px-4 py-20 text-white sm:px-6 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="eyebrow text-mint">One queue, better for everyone</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">From uncertainty to a clear next step.</h2><p className="mt-4 text-slate-300">NexTurn gives visitors freedom and teams the operational clarity to deliver it.</p></div><div className="mt-12 grid gap-8 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }, index) => <article key={title} className="border-t border-white/20 pt-6"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-mint"><Icon size={21} /></span><p className="mt-7 text-xs font-bold text-aqua">0{index + 1}</p><h3 className="mt-2 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-300">{text}</p></article>)}</div></div></section>

    <section className="px-4 py-20 sm:px-6 lg:py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"><div><p className="eyebrow">Designed around real life</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">A queue that works around your day.</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">Join from anywhere, follow a prediction you can understand, and arrive with confidence. No crowded waiting room required.</p><ul className="mt-8 space-y-4">{['Find the right location and service', 'Reserve your place with a digital token', 'Receive live updates as conditions change'].map((item) => <li key={item} className="flex items-center gap-3 font-semibold text-ink"><span className="grid h-7 w-7 place-items-center rounded-full bg-mint text-ocean"><Check size={15} /></span>{item}</li>)}</ul></div><div className="card grid gap-3 bg-white p-5 sm:grid-cols-3">{[['1','Choose','Select a nearby service'],['2','Join','Receive your live token'],['3','Arrive','Walk in at the right time']].map(([number, title, text]) => <article key={number} className="rounded-2xl bg-cream p-5"><span className="display text-3xl font-bold text-aqua">{number}</span><h3 className="mt-8 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}</div></div></section>

    <section className="px-4 pb-20 sm:px-6"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-aqua px-6 py-12 text-center text-ink sm:px-12 sm:py-16"><p className="text-sm font-bold uppercase tracking-[.16em]">Your next turn can feel different</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold sm:text-5xl">Spend less time waiting.<br />More time living.</h2><Link to="/register"><Button className="mt-8 px-7" icon={<ArrowRight size={18} />}>Start with NexTurn</Button></Link></div></section>
  </>
}
