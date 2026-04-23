import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold text-gray-800">Farm Assistant</h1>
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link
                  href="/farms"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  My Farms
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            </SignedIn>
          </div>
        </nav>

        <div className="text-center py-24">
          <h2 className="text-6xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-6">
            Grounded agricultural
            <br />
            advice for your farm
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Register a farm, get an AI-generated analysis of your weather and
            conditions, then ask a conversational advisor for live guidance.
          </p>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105">
                Get Started
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/farms">
              <button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all transform hover:scale-105">
                Go to My Farms
              </button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}