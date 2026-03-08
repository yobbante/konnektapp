import { Link } from "react-router-dom";
import { Package, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

const footerLinks = {
  services: [
    { label: "GP Bagages", href: "/offres" },
    { label: "Fret Maritime", href: "/offres" },
    { label: "Fret Aérien", href: "/offres" },
    { label: "Transport Routier", href: "/offres" },
    { label: "Coursier Express", href: "/offres" },
  ],
  entreprise: [
    { label: "Devenir Transporteur", href: "/transporteur/inscription" },
    { label: "Envoyer un colis", href: "/envoyer" },
    { label: "Suivi de colis", href: "/tracking" },
  ],
  support: [
    { label: "Suivi de colis", href: "/tracking" },
    { label: "Mes réservations", href: "/reservations" },
    { label: "Mon profil", href: "/profil" },
    { label: "Paramètres", href: "/settings" },
  ],
  legal: [
    { label: "Conditions d'utilisation", href: "#" },
    { label: "Politique de confidentialité", href: "#" },
    { label: "Mentions légales", href: "#" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gold-gradient flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-secondary leading-tight tracking-tight">Konnekt</span>
                <span className="text-sm font-semibold text-secondary/70 -mt-1">Transport</span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 mb-6 max-w-sm">
              La marketplace de référence pour le transport de fret en Afrique de l'Ouest. 
              Connectez-vous avec des milliers de transporteurs fiables.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-primary-foreground/70">
                <MapPin className="w-5 h-5 text-secondary" />
                <span>Dakar, Sénégal</span>
              </div>
              <div className="flex items-center gap-3 text-primary-foreground/70">
                <Phone className="w-5 h-5 text-secondary" />
                <span>+221 33 123 45 67</span>
              </div>
              <div className="flex items-center gap-3 text-primary-foreground/70">
                <Mail className="w-5 h-5 text-secondary" />
                <span>contact@konnekt.app</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">Services</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">Entreprise</h4>
            <ul className="space-y-3">
              {footerLinks.entreprise.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-primary-foreground/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-secondary hover:text-primary transition-all"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/60">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="hover:text-secondary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} Konnekt. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
