import Header from "../components/Header";
import Footer from "../components/Footer";

const features = [
  ["Convert files", "Choose an output format and convert images, audio, and video files in one place."],
  ["Batch conversion", "Add multiple files, select a format for each one, and get a single ZIP download."],
  ["Conversion progress", "Follow upload, processing, archive creation, and completion in real time."],
  ["100 MB upload limit", "A clear upload limit keeps conversion requests predictable and reliable."],
  ["Temporary downloads", "Completed files are kept temporarily and cleaned up automatically."],
  ["Private accounts", "Create an account to keep a personal conversion history and manage your jobs."],
  ["Email code sign-in", "Password sign-in is protected with a time-limited email verification code."],
  ["Conversion history", "See filenames, input and output formats, statuses, dates, downloads, and deletion controls."],
  ["Secure sessions", "Sessions use HTTP-only cookies so login tokens are not exposed to page JavaScript."],
  ["Free to use", "The main converter remains free. Optional contributions help fund future improvements."],
];

export default function About() {
  return (
    <div className="app">
      <Header />

      <main className="about-page">
        <section className="about-hero">
          <span className="section-label">ABOUT CONVERTFLOW</span>
          <h1>Simple conversion tools, built for real work.</h1>
          <p>
            ConvertFlow makes everyday file conversion easier: upload files,
            choose the output you need, and download the result without a complicated workflow.
          </p>
        </section>

        <section className="about-values">
          <article>
            <span className="section-label">FAST</span>
            <h2>One clear workflow</h2>
            <p>Drag, choose, convert, and download—with useful progress at every step.</p>
          </article>
          <article>
            <span className="section-label">PRIVATE</span>
            <h2>Files are temporary</h2>
            <p>Conversion files are stored only long enough to make the download available, then cleaned up.</p>
          </article>
          <article>
            <span className="section-label">GROWING</span>
            <h2>More is on the way</h2>
            <p>ConvertFlow is expanding with broader formats, advanced conversion options, and developer tools.</p>
          </article>
        </section>

        <section className="about-features">
          <div className="about-section-heading">
            <span className="section-label">FEATURES</span>
            <h2>What ConvertFlow can do today</h2>
          </div>
          <div className="about-feature-grid">
            {features.map(([title, description]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-roadmap">
          <span className="section-label">NEXT UP</span>
          <h2>Designed to keep getting better.</h2>
          <p>
            Upcoming work includes more document formats, richer conversion settings,
            public API access, shareable links, and integrations with cloud storage services.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
