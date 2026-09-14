import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/Button';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  /*
  const features = [
    {
      icon: '🎯',
      title: 'Create Challenges',
      description: 'Set personalized fitness goals and track your progress in real-time',
    },
    {
      icon: '💪',
      title: 'Log Workouts',
      description: 'Record your workouts with detailed metrics and performance data',
    },
    {
      icon: '📊',
      title: 'Smart Scoring',
      description: 'Get normalized scores and compete fairly with friends',
    },
    {
      icon: '🏆',
      title: 'Leaderboards',
      description: 'Climb the ranks and compete with other fitness enthusiasts',
    },
    {
      icon: '📈',
      title: 'Analytics',
      description: 'Visualize your progress with detailed statistics and insights',
    },
    {
      icon: '🎁',
      title: 'Rewards',
      description: 'Unlock achievements and celebrate your fitness milestones',
    },
  ];
  */

  const howItWorks = [
    {
      number: '01',
      title: 'Record',
      description: 'Log your running, walking, cycling, swimming, gym sessions or daily steps.',
    },
    {
      number: '02',
      title: 'Earn',
      description: "Your activity is automatically converted into points using FitChallenge's scoring system.",
    },
    {
      number: '03',
      title: 'Climb',
      description: 'Track your progress and see where you stand on the global leaderboard.',
    },
  ];
  return (
    <div className="min-h-screen bg-[#fffaf5]">
      {/* Hero Section */}
      <section className="relative bg-[#fffaf5] flex items-start py-14 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center text-gray-950"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6"
            >
              <span className="text-6xl font-bold">∞</span>
            </motion.div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              FitChallenge
            </h1>
            <p className="text-lg md:text-xl mb-6 text-gray-700 max-w-2xl mx-auto">
              Track your activity. Earn points. Climb the leaderboard.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              {isAuthenticated ? (
                <Button
                  variant="secondary"
                  size="md"
                  className="!rounded-lg !bg-orange-500 !px-6 !py-2 !text-white hover:!bg-orange-600"
                  onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/dashboard')}
                >
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="secondary" size="md" className="!rounded-lg !bg-orange-500 !px-6 !py-2 !text-white hover:!bg-orange-600" onClick={() => navigate('/register')}>
                    Get Started
                  </Button>
                  <Button variant="outline" size="lg" className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                    <Link to="/login">Login</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 bg-[#fffaf5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-950 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to turn activity into progress
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {howItWorks.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="how-it-works-card"
              >
                <div className="how-it-works-card-inner">
                  <div className="how-it-works-card-face flex min-h-44 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-7 text-left shadow-sm">
                    <span className="text-4xl font-bold leading-none text-orange-500">{feature.number}</span>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-950">{feature.title}</h3>
                      <p className="mt-2 text-sm text-gray-500">Hover to learn more</p>
                    </div>
                  </div>
                  <div className="how-it-works-card-face how-it-works-card-back flex min-h-44 flex-col justify-center rounded-2xl border border-orange-200 bg-orange-500 p-7 text-left shadow-sm">
                    <span className="text-sm font-semibold tracking-wide text-orange-100">{feature.number}</span>
                    <h3 className="mt-2 text-2xl font-bold text-white">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-orange-50">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 bg-[#fffaf5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-gray-950 mb-4">
              Ready to make every move count?
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              Start tracking your activities and see how far you can climb.
            </p>

            {!isAuthenticated && (
              <div className="flex gap-4 justify-center flex-wrap">
                <Button variant="secondary" size="md" className="!rounded-lg !bg-orange-500 !px-6 !py-2 !text-white hover:!bg-orange-600" onClick={() => navigate('/register')}>
                  Sign Up Now
                </Button>
                <p className="self-center text-gray-950">
                  Already a member?{' '}
                  <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
                    Login
                  </Link>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-stone-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">∞</span>
              </div>
              <span className="font-bold text-white">FitChallenge</span>
            </div>
            <p className="text-sm">&copy; 2024 FitChallenge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
