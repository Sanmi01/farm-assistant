import Link from "next/link";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import {
  Sprout,
  Zap,
  MessageCircle,
  TrendingUp,
  CloudSun,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/Card";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Zap,
    title: "Grounded Recommendations",
    description:
      "AI-generated crop, technique, and service recommendations tied to your farm's real coordinates and budget.",
  },
  {
    icon: CloudSun,
    title: "Live Weather Analysis",
    description:
      "Sixteen-day forecasts and seasonal patterns pulled from Open-Meteo, no manual data entry required.",
  },
  {
    icon: MessageCircle,
    title: "Conversational Advisor",
    description:
      "Ask questions about your farm and get answers grounded in stored context or live weather data on demand.",
  },
  {
    icon: TrendingUp,
    title: "Continuous Updates",
    description:
      "Retry weather and recommendations any time conditions change. Conversation history persists across sessions.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description:
      "Sign in once, and every farm and chat is automatically scoped to your account with verified identity.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <Sprout className="h-8 w-8 text-emerald-600" />
              <span className="text-xl font-semibold text-gray-900">
                Farm Assistant
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/farms">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    My Farms
                  </Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Grounded agricultural advice
            <span className="block bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              for your farm
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Register your farm, get an AI-generated weather analysis and
            recommendations, then talk to a conversational advisor that knows
            your specific conditions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/farms">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Go to My Farms
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Built for the way farms actually run
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Five capabilities, working together, in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  hover
                  className="p-8 transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="bg-emerald-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-3xl p-12 text-center text-white shadow-xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to register your first farm?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Sign in, walk through a four-step wizard, and watch the analysis
              and recommendations land in seconds.
            </p>
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  size="lg"
                  className="bg-white text-emerald-700 hover:bg-gray-50 px-8 py-6 text-base font-semibold shadow-lg"
                >
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/farms/new">
                <Button
                  size="lg"
                  className="bg-white text-emerald-700 hover:bg-gray-50 px-8 py-6 text-base font-semibold shadow-lg"
                >
                  Register a Farm
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sprout className="h-7 w-7 text-emerald-400" />
            <span className="text-xl font-semibold">Farm Assistant</span>
          </div>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            A capstone-scale AI farm advisor demonstrating production patterns
            in agentic chat, structured outputs, and AWS deployment.
          </p>
          <div className="border-t border-gray-700 pt-8">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Farm Assistant. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}