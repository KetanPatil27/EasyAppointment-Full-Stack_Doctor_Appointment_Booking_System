import { Heart, Clock, Users } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 py-10 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-foreground mb-4">EasyAppointment</h3>
            <p className="text-sm text-foreground/60">Making healthcare accessible to everyone, everywhere.</p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-foreground/60">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 md:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-foreground/60 text-center sm:text-left">
            <div>© 2026 EasyAppointment. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-foreground transition-colors">Facebook</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
