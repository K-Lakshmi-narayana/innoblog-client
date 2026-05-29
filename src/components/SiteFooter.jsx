import logo from "../assets/logo-dark.png";
import { FaEnvelope, FaFacebook, FaInstagram, FaMapMarkerAlt, FaPhoneAlt, FaYoutube } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa6";

const contactLocations = [
  {
    city: 'Hyderabad',
    address: '#205, 2nd Floor, Fortune Signature, Near JNTU Metro Station, Kukatpally, Hyderabad, Telangana 500085',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Fortune%20Signature%20JNTU%20Metro%20Station%20Kukatpally%20Hyderabad',
  },
  {
    city: 'Pune',
    address: '2nd Floor, Sai Sayaji Apartment, 201, Paud Rd, beside VANAZ Metro, above Bata showroom, Kothrud, Pune, Maharashtra 411038',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Sai%20Sayaji%20Apartment%20Paud%20Road%20Kothrud%20Pune',
  },
  {
    city: 'Bengaluru',
    address: 'Swetha Arcade, NO.576/B, 3rd Floor, Service Rd, 100 Feet Ring Rd, 6th Sector, HSR Layout, Bengaluru, Karnataka 560068',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Swetha%20Arcade%20576%20HSR%20Layout%20Bengaluru',
  },
  {
    city: 'Dilsukhnagar',
    address: '2nd Floor, Innomatics Research Labs, Plot no. 109, beside Victoria Memorial Metro Station, Saroornagar, Narsimha Puri Colony, Huda Colony, Kothapet, Hyderabad, Telangana 500035',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Innomatics%20Research%20Labs%20Victoria%20Memorial%20Metro%20Station%20Dilsukhnagar',
  },
]

const phoneLinks = [
  { label: '+91-1800 412 8076', href: 'tel:+9118004128076' },
  { label: '+91-9951666671', href: 'https://wa.me/919951666671' },
  { label: '+91-9951666672', href: 'https://wa.me/919951666672' },
  { label: '+91-9951666674', href: 'https://wa.me/919951666674' },
]

export default function SiteFooter({ domains = [] }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div>
          <a className="brand brand--footer" href="/">
            <img width={44} height={48} src={logo} alt="logo" />
            <span className="brand__wordmark">
              <strong>I N N O B L O G</strong>
              <span>Explore knowledge and share insights</span>
            </span>
          </a>
          <p className="site-footer__note">
            A vibrant community where readers and writers share knowledge, insights, and expertise across diverse topics.
          </p>
        </div>

        <div>
          <h3>Navigate</h3>
          <div className="footer-links">
            <a href="/">Home</a>
            <a href="/articles">Browse Articles</a>
            <a href="/top-articles">Popular Articles</a>
          </div>
        </div>

        <div>
          <h3>Topics</h3>
          <div className="footer-links footer-links--pills">
            {domains.slice(0, 6).map((domain) => (
              <a key={domain.slug} href={`/topic/${domain.slug}`}>
                {domain.name}
              </a>
            ))}
          </div>
        </div>

        <div className="site-footer__contact">
          <h3>Contact Details</h3>
          <div className="footer-contact-grid">
            {contactLocations.map((location) => (
              <a
                key={location.city}
                className="footer-contact-card"
                href={location.mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FaMapMarkerAlt aria-hidden="true" />
                <span>
                  <strong>{location.city}</strong>
                  <small>{location.address}</small>
                </span>
              </a>
            ))}
          </div>

          <div className="footer-contact-row">
            <FaPhoneAlt aria-hidden="true" />
            <span>
              <strong>Phone/Whatsapp</strong>
              <span className="footer-inline-links">
                {phoneLinks.map((phone) => (
                  <a key={phone.label} href={phone.href} target={phone.href.startsWith('http') ? '_blank' : undefined} rel={phone.href.startsWith('http') ? 'noreferrer' : undefined}>
                    {phone.label}
                  </a>
                ))}
              </span>
            </span>
          </div>

          <div className="footer-contact-row">
            <FaEnvelope aria-hidden="true" />
            <span>
              <strong>For Course</strong>
              <a href="mailto:info@innomatics.in">info@innomatics.in</a>
            </span>
          </div>
        </div>

        <div className="site-footer__social">
          <h3>Social</h3>
          <div className="f-smedia-con">
            <a href="https://www.linkedin.com/school/innomatics-research-labs/" target="_blank" rel="noreferrer" className="f-smedia linked" aria-label="LinkedIn"><FaLinkedin /></a>
            <a href="https://www.instagram.com/innomatics_research_labs/" target="_blank" rel="noreferrer" className="f-smedia insta" aria-label="Instagram"><FaInstagram /></a>
            <a href="https://www.facebook.com/innomaticsresearchlabs" target="_blank" rel="noreferrer" className="f-smedia medium" aria-label="Facebook"><FaFacebook /></a>
            <a href="https://www.youtube.com/c/InnomaticsResearchLabs" target="_blank" rel="noreferrer" className="f-smedia youtube" aria-label="YouTube"><FaYoutube /></a>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom">
        <p>&copy;Copyright 2026 Innomatics Research Labs &middot; All rights reserved.</p>
      </div>
    </footer>
  )
}
