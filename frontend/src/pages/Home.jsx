import Header from "../components/Header";
import Hero from "../components/Hero";
import Converter from "../components/Converter";
import PopularConversions from "../components/PopularConversions";
import SecuritySection from "../components/SecuritySection";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="app">

      <Header />

      <main>

        <Hero />

        <div id="converter">
          <Converter />
        </div>

        <PopularConversions />

        <SecuritySection />

      </main>

      <Footer />

    </div>
  );
}