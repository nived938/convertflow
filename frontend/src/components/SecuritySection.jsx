import {
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Secure processing",
    description:
      "Your files are processed securely and are not used for purposes other than providing the conversion service.",
  },
  {
    icon: LockKeyhole,
    title: "Privacy focused",
    description:
      "We design ConvertFlow with privacy in mind and keep your conversion data protected.",
  },
  {
    icon: Zap,
    title: "Fast conversions",
    description:
      "Our conversion pipeline is designed to process supported files quickly and efficiently.",
  },
];

export default function SecuritySection() {
  return (
    <section className="security-section">

      <div className="security-content">

        <div className="security-copy">

          <span className="section-label">
            BUILT FOR TRUST
          </span>

          <h2>
            Your files deserve
            <span> better protection.</span>
          </h2>

          <p>
            ConvertFlow is designed around secure file
            processing, privacy, and reliable conversions.
          </p>

          <div className="security-checks">

            <div>
              <CheckCircle2 size={17} />
              Secure file processing
            </div>

            <div>
              <CheckCircle2 size={17} />
              Automatic temporary file cleanup
            </div>

            <div>
              <CheckCircle2 size={17} />
              No unnecessary file retention
            </div>

          </div>

        </div>

        <div className="security-features">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                className="security-card"
                key={feature.title}
              >
                <div className="security-icon">
                  <Icon size={21} />
                </div>

                <div>
                  <h3>
                    {feature.title}
                  </h3>

                  <p>
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}