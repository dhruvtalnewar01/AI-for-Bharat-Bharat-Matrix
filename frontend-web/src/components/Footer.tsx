export default function Footer() {
    return (
        <footer className="w-full bg-[var(--charcoal)] text-[var(--pale-pink)] py-16 px-6 border-t border-[rgba(241,233,233,0.05)] relative z-50">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">

                {/* Brand */}
                <div>
                    <h4 className="font-serif-display text-3xl text-gradient-gold mb-4">Bharat MatrixAI</h4>
                    <p className="text-xs tracking-[1px] opacity-70 leading-relaxed max-w-sm font-mono">
                        A proprietary Cognitive Visual Engine designed strictly for automated vernacular interaction across Indian digital infrastructure.
                    </p>
                </div>

                {/* Links */}
                <div className="flex flex-col gap-3 text-sm opacity-80">
                    <h5 className="text-[var(--soft-gold)] tracking-[3px] uppercase text-xs mb-2">Systems</h5>
                    <a href="#" className="hover:text-[var(--soft-gold)] hover:translate-x-1 transition-transform">Architecture Core</a>
                    <a href="#" className="hover:text-[var(--soft-gold)] hover:translate-x-1 transition-transform">Deployment Ops</a>
                    <a href="#" className="hover:text-[var(--soft-gold)] hover:translate-x-1 transition-transform">Security Protocols</a>
                </div>

                {/* Ethics & Contact */}
                <div className="flex flex-col gap-3 text-sm opacity-80">
                    <h5 className="text-[var(--soft-gold)] tracking-[3px] uppercase text-xs mb-2">Initialize</h5>
                    <a href="#" className="hover:text-[var(--soft-gold)] transition-colors">Contact Protocol</a>
                    <a href="#" className="hover:text-[var(--soft-gold)] transition-colors">Ethical AI Framework</a>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs tracking-[2px] uppercase font-mono">Systems Online</span>
                    </div>
                </div>

            </div>

            <div className="container mx-auto mt-16 pt-8 border-t border-[rgba(241,233,233,0.1)] flex flex-col md:flex-row justify-between items-center text-xs opacity-50 font-mono tracking-[1px]">
                <p>© {new Date().getFullYear()} Bharat MatrixAI. All R&D Proprietary.</p>
                <p>CONFIDENTIAL — DO NOT DISTRIBUTE</p>
            </div>
        </footer>
    );
}
