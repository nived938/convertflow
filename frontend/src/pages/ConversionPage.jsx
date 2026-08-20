import Header from "../components/Header";
import Converter from "../components/Converter";
import Footer from "../components/Footer";

export default function ConversionPage() {
  return (
    <div className="app">

      <Header />

      <main className="conversion-page">

        <div className="conversion-page-header">

          <span className="section-label">
            ONLINE FILE CONVERTER
          </span>

          <h1>
            Convert your files
          </h1>

          <p>
            Upload your file, choose an output format,
            and start converting.
          </p>

        </div>

        <Converter />

      </main>

      <Footer />

    </div>
  );
}