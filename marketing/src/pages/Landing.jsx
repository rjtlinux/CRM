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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/buzeye-logo.png" alt="Buzeye" className="h-9 w-auto" />
            <span className="text-xl font-bold text-white">Buzeye</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
            <a href="#strengths" className="text-slate-300 hover:text-white transition">Why Us</a>
            <a href="#contact" className="text-slate-300 hover:text-white transition">Contact</a>
            <a
              href="https://admin.buzeye.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition"
            >
              Admin Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Smart CRM for Indian Businesses
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Manage customers, sales, GST, and credit book in one place. Built for Indian SMBs with local needs in mind.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#contact"
              className="px-8 py-4 rounded-xl bg-amber-500 text-slate-900 font-semibold text-lg hover:bg-amber-400 transition"
            >
              Get in Touch
            </a>
            <a
              href="#features"
              className="px-8 py-4 rounded-xl border border-slate-500 text-white font-semibold hover:bg-slate-800 transition"
            >
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What We Do</h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Buzeye CRM helps small and medium businesses in India manage their day-to-day operations.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:border-amber-500/50 transition"
              >
                <span className="text-4xl mb-4 block">{f.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Strengths */}
      <section id="strengths" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Our Strengths</h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            Why businesses choose Buzeye over generic CRMs.
          </p>
          <ul className="max-w-2xl mx-auto space-y-4">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-4 text-slate-200">
                <span className="text-amber-500 mt-1">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-6 bg-slate-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Contact Us</h2>
          <p className="text-slate-400 mb-10">
            Interested in Buzeye CRM? Contact us to learn more or get a demo.
          </p>
          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <span className="text-2xl">📧</span>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <a href="mailto:hello@buzeye.com" className="text-amber-500 hover:underline">
                  hello@buzeye.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/80 border border-slate-700/50">
              <span className="text-2xl">🌐</span>
              <div>
                <p className="text-sm text-slate-500">Admin / CRM Access</p>
                <a
                  href="https://admin.buzeye.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:underline"
                >
                  admin.buzeye.com
                </a>
              </div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-8">
            No public sign-up. Contact your administrator or email us for access.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-700/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/buzeye-logo.png" alt="Buzeye" className="h-8 w-auto opacity-80" />
            <span className="text-slate-500">© {new Date().getFullYear()} Buzeye. All rights reserved.</span>
          </div>
          <a
            href="https://admin.buzeye.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-amber-500 transition"
          >
            Admin Login
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
