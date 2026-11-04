import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  {
    question: 'How fast are orders delivered?',
    answer:
      'Order delivery begins automatically within minutes for most services once payment is confirmed. Depending on network volume and the requested quantity, completion times can range from a few minutes to several hours for natural, gradual pacing. Exact estimated start times and speeds are listed in each individual service description in our catalog.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We support a wide variety of instant, secure payment gateways including UPI (Google Pay, PhonePe, Paytm, BHIM), instant QR scanning, Binance Pay (USDT/crypto), TRC20 USDT, and direct cryptocurrency deposits. All transactions are securely processed via automated server-side verification.',
  },
  {
    question: 'Do you offer an API and child panels?',
    answer:
      'Yes! We provide a high-performance RESTful API for developers and resellers with instant order placement, status checks, and balance inquiries. We also offer fully hosted, turnkey Child Panels that connect directly to YouthSMM, enabling you to run your own branded SMM business with custom pricing.',
  },
  {
    question: 'Are the services safe for my accounts?',
    answer:
      'Our platform utilizes high-retention profiles, gradual delivery algorithms, and standard platform compliance practices designed to minimize risk. We never ask for your account passwords. Because third-party social media algorithms update regularly, we advise pacing large orders and selecting services with refill guarantees.',
  },
  {
    question: 'How does the affiliate program work?',
    answer:
      'Our affiliate program lets you earn generous lifetime commissions on every deposit made by users who sign up through your referral link. Tracking is automatic, and earnings are credited directly to your account balance for ordering services or requesting payouts once minimum withdrawal thresholds are met.',
  },
];

export const LoginFaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      id="faq-section"
      className="w-full py-16 sm:py-20 px-4 sm:px-6 border-t border-[#EAE3D2] relative z-10 box-border"
    >
      <div className="w-full max-w-3xl mx-auto relative z-10 box-border">
        {/* Section Heading */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-stone-900 font-display">
            Questions, answered
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-2.5 max-w-md mx-auto leading-relaxed">
            Everything you need to know about our services, delivery times, and reseller platform.
          </p>
        </div>

        {/* Accordion List with subtle cream divider lines */}
        <div className="divide-y divide-[#EAE3D2] border-y border-[#EAE3D2]">
          {FAQ_DATA.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="py-4 sm:py-5 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between text-left group cursor-pointer py-1"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm sm:text-base font-bold text-stone-900 transition-colors group-hover:text-red-600 pr-4 ${
                      isOpen ? 'text-red-600' : ''
                    }`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-xl transition-all flex-shrink-0 ${
                      isOpen
                        ? 'bg-red-50 text-red-600 shadow-xs'
                        : 'bg-[#F5F0E4] group-hover:bg-red-50 text-stone-500 group-hover:text-red-600'
                    }`}
                  >
                    <ChevronDown
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-red-600' : ''
                      }`}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed pt-3 pb-1">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
