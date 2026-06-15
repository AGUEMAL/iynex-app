export function Footer() {
  return (
    <footer className="glass text-center py-3 px-4 text-[11px] text-muted-foreground border-t border-border/40">
      <p className="brand-footer gradient-text">Developed by Iyad Agmal</p>
      <div className="flex justify-center gap-3 mt-1">
        <a href="https://instagram.com/iyad.agm" target="_blank" rel="noreferrer" className="hover:text-primary">
          @iyad.agm
        </a>
        <span>·</span>
        <a href="https://tiktok.com/@iyyad.agm" target="_blank" rel="noreferrer" className="hover:text-primary">
          @iyyad.agm
        </a>
      </div>
    </footer>
  );
}

