import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function FarmsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      <div className="container mx-auto px-4 py-12">
        <nav className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-bold text-gray-800">Farm Assistant</h1>
          <UserButton afterSignOutUrl="/" />
        </nav>

        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            Hello, {user.firstName || "farmer"}.
          </h2>
          <p className="text-gray-600">
            Your farm list will appear here. We'll wire it up in Part 3.
          </p>
          <p className="text-sm text-gray-400 mt-6">
            Clerk user id: <code className="bg-gray-100 px-2 py-1 rounded">{user.id}</code>
          </p>
        </div>
      </div>
    </main>
  );
}