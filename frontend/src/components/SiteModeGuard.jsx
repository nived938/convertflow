import BackendGuard from "./BackendGuard";

export default function SiteModeGuard({ children }) {
  return <BackendGuard>{children}</BackendGuard>;
}
