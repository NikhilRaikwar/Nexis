import { motion } from "framer-motion";
import { ArrowRight, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { FeaturesSection } from "@/components/features/FeaturesSection";
import { FAQSection } from "@/components/FAQSection";
import Footer from "@/components/Footer";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import HeroVideoDialog from "@/components/magicui/hero-video-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, signIn, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = async () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      try {
        await signIn();
        navigate('/dashboard');
      } catch (error) {
        console.error('Sign in failed:', error);
      }
    }
  };

  const scrollToFAQ = () => {
    const faqSection = document.getElementById('faq');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative container px-4 pt-40 pb-20"
      >
        {/* Background */}
        <div 
          className="absolute inset-0 -z-10 bg-[#0A0A0A]"
        />
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-block mb-4 px-4 py-1.5 rounded-full glass"
        >
          <span className="text-sm font-medium">
            <Command className="w-4 h-4 inline-block mr-2" />
            Nexis: Your AI-Powered Web3 Assistant
          </span>
        </motion.div>
        
        <div className="max-w-4xl relative z-10">
          <h1 className="text-5xl md:text-7xl font-normal mb-4 tracking-tight text-left">
            <span className="text-gray-200">
              <TextGenerateEffect words="Simplify Blockchain " />
            </span>
            <br />
            <span className="text-white font-medium">
              <TextGenerateEffect words="Interaction with AI" />
            </span>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl text-left"
          >
            Seamlessly connect your wallet and interact with the blockchain using our AI agent – tip, transfer, and more in a conversational interface.{" "}
            <span className="text-white">Get started in seconds.</span>
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 items-start"
          >
            <Button 
              size="lg" 
              className="button-gradient"
              onClick={handleGetStarted}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            </Button>
            <Button 
              size="lg" 
              variant="link" 
              className="text-white"
              onClick={scrollToFAQ}
            >
              Learn More <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative mx-auto max-w-5xl mt-20"
        >
          <HeroVideoDialog
            className="dark:hidden block"
            animationStyle="from-center"
            videoSrc="https://www.youtube.com/embed/E7Hr-_oFaB0"
            thumbnailSrc="/uploads/dashboard.png"
            thumbnailAlt="Nexis AI-Powered Web3 Assistant Demo"
          />
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <div id="features" className="bg-black">
        <FeaturesSection />
      </div>

      {/* FAQ Section */}
      <div id="faq" className="bg-black">
        <FAQSection />
      </div>

      {/* CTA Section */}
      <section className="container px-4 py-20 relative bg-black">
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'url("/uploads/21f3edfb-62b5-4e35-9d03-7339d803b980.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#0A0A0A]/80 backdrop-blur-lg border border-white/10 rounded-2xl p-8 md:p-12 text-center relative z-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the future of Web3 interaction with Nexis AI assistant.
          </p>
          <Button 
            size="lg" 
            className="button-gradient"
            onClick={handleGetStarted}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <div className="bg-black">
        <Footer />
      </div>
    </div>
  );
};

export default Index;