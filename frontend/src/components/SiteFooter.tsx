export function SiteFooter() {
  return (
    <footer
      className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 text-[11px]"
      style={{ borderTop: "1px solid currentColor", opacity: 0.5 }}
    >
      <span>Photon · Async image pipeline</span>
      <span className="flex items-center gap-4">
        <a
          href="https://github.com/VectorSigmaOmega/Photon"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:underline"
        >
          GitHub
        </a>
        <a href="#" className="underline-offset-4 hover:underline">
          Portfolio
        </a>
      </span>
    </footer>
  );
}
