import { useState } from 'react';

const WHATSAPP_NUMBER = '917827279181';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi, I want to know more about Buzeye CRM')}`;

const Landing = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [demoForm, setDemoForm] = useState({ name: '', phone: '', business_type: '', message: '' });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const features = [
    {
      title: 'Smart Dashboard & Analytics',
      description: 'Real-time insights into revenue, costs, and profit. Track sales trends, customer behavior, and business performance with AI-powered analytics.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'GST Compliance & Invoicing',
      description: 'Complete GST solution with automated invoicing, HSN/SAC codes, and ready-to-file GSTR-1 & GSTR-3B reports. Stay compliant effortlessly.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Udhar Khata (Credit Book)',
      description: 'Digital credit ledger designed for Indian businesses. Track outstanding payments, send reminders, and manage customer credit in Hindi & English.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      title: 'Customer & Sales Management',
      description: 'Complete CRM with customer profiles, sales pipeline, proposals, quotations, and automated follow-ups. Never miss an opportunity.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'AI Assistant with Voice',
      description: 'Hindi/Hinglish voice-enabled AI assistant. Record sales, check balances, and update data hands-free while you work on the shop floor.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      title: 'WhatsApp Integration',
      description: 'Customer engagement via WhatsApp. Send invoices, reminders, and updates directly. AI-powered responses to customer queries.',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
  ];

  const stats = [
    { value: '6+', label: 'Powerful Modules' },
    { value: '₹299', label: 'Starting Price/Month' },
    { value: 'Hindi', label: 'Voice AI Assistant' },
    { value: '100%', label: 'GST Compliant' }
  ];

  const businessTypes = [
    {
      type: 'Traders & Distributors',
      benefits: ['Bulk order management', 'Multi-location inventory', 'Supplier management', 'GST reconciliation']
    },
    {
      type: 'Service Businesses',
      benefits: ['Project tracking', 'Time billing', 'Client proposals', 'Service agreements']
    },
    {
      type: 'Retail & Shops',
      benefits: ['POS integration', 'Daily sales reports', 'Customer loyalty', 'Stock alerts']
    }
  ];

  const whyBuzeye = [
    {
      title: 'हिंदी में बोलो, काम हो जाए',
      description: 'Voice से sale record करो, balance check करो — typing की ज़रूरत नहीं। Shop floor से हाथ-free काम करो।',
      icon: '🗣️'
    },
    {
      title: 'Udhar Khata + CRM = Buzeye',
      description: 'सिर्फ ledger नहीं — complete customer management। Sales pipeline, proposals, follow-ups — सब एक जगह।',
      icon: '📒'
    },
    {
      title: 'WhatsApp से Customer Engage करो',
      description: 'Invoice, payment reminder, updates — सब WhatsApp पर directly भेजो। AI auto-reply भी available।',
      icon: '💬'
    }
  ];

  const pricing = [
    {
      name: 'Starter',
      price: '₹299',
      period: '/month',
      annual: '₹2,999/year',
      features: [
        'Up to 50 customers',
        '1 user account',
        'Dashboard & analytics',
        'GST invoicing',
        'Udhar Khata (Credit Book)',
        'Email support'
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      name: 'Professional',
      price: '₹799',
      period: '/month',
      annual: '₹7,999/year',
      features: [
        'Up to 500 customers',
        '5 user accounts',
        'AI Assistant (Hindi Voice)',
        'WhatsApp integration',
        'Sales pipeline & proposals',
        'Priority WhatsApp support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '₹1,999',
      period: '/month',
      annual: 'Custom',
      features: [
        'Unlimited customers & users',
        'Dedicated account manager',
        'Custom integrations',
        'Custom branding',
        'Priority phone support',
        'Training & onboarding'
      ],
      cta: 'Contact Us',
      popular: false
    }
  ];

  const faqs = [
    {
      q: 'Is Buzeye suitable for small businesses?',
      a: 'Absolutely! Buzeye is specifically designed for Indian SMBs. Our starter plan begins at just ₹299/month and includes all essential features like GST compliance, Udhar Khata, and customer management.'
    },
    {
      q: 'Do you support Hindi language?',
      a: 'Yes! Buzeye fully supports both Hindi (Devanagari) and English. Our AI assistant understands Hinglish as well, making it easy for you to work in your preferred language.'
    },
    {
      q: 'How secure is my data?',
      a: 'We take security seriously. Your data is isolated in dedicated databases, encrypted in transit and at rest, and backed up daily. We follow industry best practices for security and data protection.'
    },
    {
      q: 'Can I integrate with my existing tools?',
      a: 'Yes! Buzeye integrates with popular tools like WhatsApp, Tally, payment gateways, and more. Enterprise plans include custom integrations tailored to your workflow.'
    },
    {
      q: 'What about GST compliance?',
      a: 'Buzeye handles complete GST workflows including invoicing with HSN/SAC codes, automatic tax calculations, and ready-to-file GSTR-1 & GSTR-3B reports. Stay compliant effortlessly.'
    },
    {
      q: 'Is there a free trial?',
      a: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required. Message us on WhatsApp at +91 78272 79181 to get started.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/buzeye-logo.png" alt="Buzeye" className="h-12 w-auto object-contain" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Buzeye</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-primary-600 transition font-medium">Features</a>
              <a href="#pricing" className="text-slate-600 hover:text-primary-600 transition font-medium">Pricing</a>
              <a href="#testimonials" className="text-slate-600 hover:text-primary-600 transition font-medium">Testimonials</a>
              <a href="#faq" className="text-slate-600 hover:text-primary-600 transition font-medium">FAQ</a>
              <a href="#demo" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold hover:shadow-lg hover:shadow-primary-500/30 transition">
                Free Demo
              </a>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-primary-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200">
              <nav className="flex flex-col gap-4">
                <a href="#features" className="text-slate-600 hover:text-primary-600 transition font-medium" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#pricing" className="text-slate-600 hover:text-primary-600 transition font-medium" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <a href="#testimonials" className="text-slate-600 hover:text-primary-600 transition font-medium" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
                <a href="#faq" className="text-slate-600 hover:text-primary-600 transition font-medium" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
                <a href="#demo" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-center" onClick={() => setMobileMenuOpen(false)}>
                  Free Demo
                </a>
              </nav>
            </div>
          )}  
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-accent-50/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(245,158,11,0.12)_0%,_transparent_50%)]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 shadow-sm border border-primary-100 mb-8 text-sm font-medium text-primary-700 animate-fade-in">
              <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
              <span>AI-Powered CRM · Made in India, for Indian Businesses</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight animate-slide-up">
              Enterprise CRM Built for
              <span className="block bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 bg-clip-text text-transparent">
                Indian Businesses
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Complete business management with GST compliance, Udhar Khata, AI assistant, and WhatsApp integration. Built for traders, retailers, and service businesses.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold text-lg hover:shadow-lg hover:shadow-green-500/30 transition transform hover:scale-105 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp पर बात करें
              </a>
              <a
                href="#demo"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-slate-900 font-semibold text-lg hover:shadow-lg hover:shadow-accent-500/30 transition transform hover:scale-105"
              >
                Free Demo बुक करें
              </a>
            </div>


          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold mb-2 text-accent-400">{stat.value}</div>
                <div className="text-primary-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Powerful features designed specifically for Indian SMBs. From GST compliance to AI-powered insights, we have got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-8 rounded-2xl bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:shadow-primary-100/50 hover:border-primary-300 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business Types Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Built for Every Type of Business
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Whether you are a trader, service provider, or retailer, Buzeye adapts to your unique workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {businessTypes.map((type, index) => (
              <div key={index} className="p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-primary-50/30 border border-slate-200">
                <h3 className="text-2xl font-semibold text-slate-900 mb-6">{type.type}</h3>
                <ul className="space-y-4">
                  {type.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Buzeye Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Buzeye क्यों चुनें?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Indian business के लिए बनाया गया — simple, powerful, and affordable.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {whyBuzeye.map((item, index) => (
              <div key={index} className="p-8 rounded-2xl bg-white border border-slate-200 shadow-lg text-center">
                <div className="text-5xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Comparison strip */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-primary-50 border border-primary-200 text-center">
              <p className="text-sm text-primary-600 font-semibold mb-1">vs Khatabook / OkCredit</p>
              <p className="text-slate-700 text-sm">सिर्फ ledger नहीं — full CRM with sales, proposals, AI</p>
            </div>
            <div className="p-6 rounded-xl bg-primary-50 border border-primary-200 text-center">
              <p className="text-sm text-primary-600 font-semibold mb-1">vs Zoho / Salesforce</p>
              <p className="text-slate-700 text-sm">Hindi voice support, simple UI, 10x cheaper</p>
            </div>
            <div className="p-6 rounded-xl bg-primary-50 border border-primary-200 text-center">
              <p className="text-sm text-primary-600 font-semibold mb-1">vs Tally</p>
              <p className="text-slate-700 text-sm">CRM + follow-ups + WhatsApp — not just accounting</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Transparent Pricing for Every Business
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Start small and scale as you grow. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, index) => (
              <div 
                key={index}
                className={`p-8 rounded-2xl border-2 ${plan.popular ? 'border-primary-500 shadow-2xl shadow-primary-200/50 scale-105' : 'border-slate-200 shadow-lg'} bg-white relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600">{plan.period}</span>
                </div>
                {plan.annual && (
                  <p className="text-sm text-primary-600 font-medium mb-6">{plan.annual} (annual)</p>
                )}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block w-full py-3 px-6 rounded-xl font-semibold text-center transition ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:shadow-lg hover:shadow-primary-500/30' 
                      : 'border-2 border-slate-300 text-slate-700 hover:border-primary-500 hover:text-primary-600'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Got questions? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-slate-50 transition"
                >
                  <span className="font-semibold text-slate-900 pr-8">{faq.q}</span>
                  <svg 
                    className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === index && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-slate-700 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Request Section */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        
        <div className="max-w-5xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                अपने Business को Digital बनाएं
              </h2>
              <p className="text-xl text-primary-100 mb-8 leading-relaxed">
                14 दिन का free trial — कोई credit card नहीं चाहिए। WhatsApp पर message करें या form भरें, हम आपको setup कर देंगे।
              </p>
              
              <div className="space-y-4">
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-green-500/20 border border-green-400/30 hover:bg-green-500/30 transition"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-green-200">WhatsApp पर message करें</div>
                    <div className="font-semibold text-lg">+91 78272 79181</div>
                  </div>
                </a>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 border border-white/20">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-sm text-primary-200">Email करें</div>
                    <a href="mailto:contact@buzeye.com" className="font-semibold hover:text-accent-300 transition">
                      contact@buzeye.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Demo Form */}
            <div className="bg-white rounded-2xl p-8 text-slate-900 shadow-2xl">
              {demoSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h3>
                  <p className="text-slate-600 mb-6">हम जल्दी ही आपसे WhatsApp पर संपर्क करेंगे।</p>
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition"
                  >
                    WhatsApp पर Chat करें →
                  </a>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold mb-6">Free Demo बुक करें</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const msg = `New Demo Request!\nName: ${demoForm.name}\nPhone: ${demoForm.phone}\nBusiness: ${demoForm.business_type}\nMessage: ${demoForm.message}`;
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
                    setDemoSubmitted(true);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">आपका नाम *</label>
                      <input
                        type="text"
                        required
                        value={demoForm.name}
                        onChange={(e) => setDemoForm({...demoForm, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="e.g., Rajesh Kumar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({...demoForm, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Business Type *</label>
                      <select
                        required
                        value={demoForm.business_type}
                        onChange={(e) => setDemoForm({...demoForm, business_type: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                      >
                        <option value="">Select your business type</option>
                        <option value="trader">Trader / Distributor</option>
                        <option value="retailer">Retail / Shop</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="service">Service Business</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Message (optional)</label>
                      <textarea
                        value={demoForm.message}
                        onChange={(e) => setDemoForm({...demoForm, message: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
                        rows="2"
                        placeholder="कोई सवाल हो तो लिखें..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold text-lg hover:shadow-lg hover:shadow-primary-500/30 transition"
                    >
                      Demo Request भेजें →
                    </button>
                    <p className="text-xs text-slate-500 text-center">
                      Submit करने पर WhatsApp पर message जाएगा। कोई spam नहीं।
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/buzeye-logo.png" alt="Buzeye" className="h-12 w-auto" />
                <span className="text-2xl font-bold text-white">Buzeye</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                Indian business के लिए सबसे आसान CRM। उधार track करो, GST invoice बनाओ, customer manage करो — सब हिंदी में।
              </p>
            </div>

            {/* Products */}
            <div>
              <h3 className="font-semibold text-white mb-4">Products</h3>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition">CRM Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Why Buzeye</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-white mb-4">Contact</h3>
              <ul className="space-y-3 text-sm">
                <li><a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">WhatsApp: +91 78272 79181</a></li>
                <li><a href="mailto:contact@buzeye.com" className="hover:text-white transition">contact@buzeye.com</a></li>
                <li><a href="#demo" className="hover:text-white transition">Request Demo</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Buzeye. All rights reserved. Built with ❤️ for Indian businesses.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-slate-400 hover:text-white transition">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white transition">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition">Security</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-green-600 hover:scale-110 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
    </div>
  );
};

export default Landing;
