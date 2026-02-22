const Landing = () => {
  const features = [
    {
      icon: '📊',
      title: 'Dashboard & Analytics',
      desc: 'Real-time revenue, costs, and profit at a glance. Track sales trends and performance.',
    },
    {
      icon: '🧾',
      title: 'GST Compliance',
      desc: 'Built-in GST invoicing, HSN/SAC codes, and reports for GSTR-1 & GSTR-3B.',
    },
    {
      icon: '📕',
      title: 'Udhar Khata',
      desc: 'Credit book for Indian businesses. Track who owes what, in Hindi & English.',
    },
    {
      icon: '👥',
      title: 'Customers & Sales',
      desc: 'Manage customers, sales pipeline, proposals, and follow-ups in one place.',
    },
  ];

  const strengths = [
    'Built for Indian SMBs with GST, ₹, and local workflows',
    'Mobile-first design – works on phones and tablets',
    'Bilingual: Hindi and English',
    'Isolated deployment per client – your data stays yours',
    'No sign-up spam – admin-controlled access',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header - White, logo blends in */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/buzeye-logo.png" alt="Buzeye" className="h-14 w-auto object-contain" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Buzeye</span>
          </div>
          <nav className="flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-primary-600 transition font-medium">Features</a>
            <a href="#strengths" className="text-slate-600 hover:text-primary-600 transition font-medium">Why Us</a>
            <a href="#contact" className="text-slate-600 hover:text-primary-600 transition font-medium">Contact</a>
            <a
              href="https://admin.buzeye.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-accent-500 text-slate-900 font-semibold hover:bg-accent-400 transition shadow-lg shadow-accent-500/25"
            >
              Admin Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero - AI-style gradient mesh */}
      <section className="pt-36 pb-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(65,105,225,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(253,185,19,0.12)_0%,_transparent_50%)]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 shadow-sm border border-primary-100 mb-8 text-sm font-medium text-primary-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> AI-powered · Built for India
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
            Smart CRM for Indian{' '}
            <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Businesses</span>
          </h1>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Manage customers, sales, GST, and credit book in one place. Built for Indian SMBs with local needs in mind.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#contact"
              className="px-8 py-4 rounded-xl bg-accent-500 text-slate-900 font-semibold text-lg hover:bg-accent-400 transition shadow-lg shadow-accent-500/30 hover:shadow-accent-500/40"
            >
              Get in Touch
            </a>
            <a
              href="#features"
              className="px-8 py-4 rounded-xl border-2 border-primary-500/50 text-primary-600 font-semibold hover:bg-primary-50 transition"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-primary-50/20" />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-slate-900">What We Do</h2>
          <p className="text-slate-600 text-center mb-16 max-w-2xl mx-auto">
            Buzeye CRM helps small and medium businesses in India manage their day-to-day operations.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="group p-8 rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 hover:shadow-primary-200/40 hover:border-primary-200 transition-all duration-300"
              >
                <span className="text-5xl mb-6 block group-hover:scale-110 transition-transform">{f.icon}</span>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strengths - Blue gradient (logo colors) */}
      <section id="strengths" className="py-24 px-6 bg-gradient-to-br from-primary-600 to-primary-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Our Strengths</h2>
          <p className="text-primary-100 text-center mb-16 max-w-2xl mx-auto">
            Why businesses choose Buzeye over generic CRMs.
          </p>
          <ul className="max-w-2xl mx-auto space-y-6">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/90 flex items-center justify-center text-slate-900 font-bold">✓</span>
                <span className="text-lg text-primary-50">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4 text-slate-900">Contact Us</h2>
          <p className="text-slate-600 mb-12">
            Interested in Buzeye CRM? Contact us to learn more or get a demo.
          </p>
          <div className="space-y-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-200 transition">
              <span className="text-3xl">📧</span>
              <div>
                <p className="text-sm text-slate-500 font-medium">Email</p>
                <a href="mailto:hello@buzeye.com" className="text-primary-600 hover:text-primary-500 font-semibold hover:underline">
                  hello@buzeye.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-5 p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-primary-200 transition">
              <span className="text-3xl">🌐</span>
              <div>
                <p className="text-sm text-slate-500 font-medium">Admin / CRM Access</p>
                <a
                  href="https://admin.buzeye.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-500 font-semibold hover:underline"
                >
                  admin.buzeye.com
                </a>
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-10">
            No public sign-up. Contact your administrator or email us for access.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-slate-100 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/buzeye-logo.png" alt="Buzeye" className="h-12 w-auto" />
            <span className="text-slate-600">© {new Date().getFullYear()} Buzeye. All rights reserved.</span>
          </div>
          <a
            href="https://admin.buzeye.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-primary-600 font-medium transition"
          >
            Admin Login
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
