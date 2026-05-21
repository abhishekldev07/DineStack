import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MainLayout({ children }) {

  return (

    <div className="flex min-h-screen flex-col bg-gray-900">

      <Navbar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-screen-xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <Footer />

    </div>
  );
}