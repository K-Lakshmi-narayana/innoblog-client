import logo from "../assets/logo-dark.png";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaLinkedin } from "react-icons/fa6";

export default function SiteFooter({ domains }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div>
          <a className="brand brand--footer" href="#/">
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
            <a href="#/">Home</a>
            <a href="#/articles">Browse Articles</a>
            <a href="#/top">Popular Articles</a>
            <a href="#/create">Submit Article</a>
          </div>
        </div>

        <div>
          <h3>Domains</h3>
          <div className="footer-links footer-links--pills">
            {domains.map((domain) => (
              <a key={domain.slug} href={`#/domain/${domain.slug}`}>
                {domain.label}
              </a>
            ))}
          </div>
          <div className="f-con-1">
            <p className="f-ad">Contact: <a className="td-none" href="mailto:info@innomatics.in">info@innomatics.in</a></p>
            <br />
            <div className="f-smedia-con">
              <a href="https://www.linkedin.com/school/innomatics-research-labs/" target="_blank" rel="noreferrer" className="f-smedia linked"><FaLinkedin /></a>
              <a href="https://www.instagram.com/innomatics_research_labs/" target="_blank" rel="noreferrer" className="f-smedia insta"><FaInstagram /></a>
              <a href="https://www.facebook.com/innomaticsresearchlabs" target="_blank" rel="noreferrer" className="f-smedia medium"><FaFacebook /></a>
              <a href="https://www.youtube.com/c/InnomaticsResearchLabs" target="_blank" rel="noreferrer" className="f-smedia youtube"><FaYoutube /></a>
            </div>
          </div>
        </div>
      </div>
      <center>
        <p>&copy;Copyright 2026 Innomatics Research Labs &middot; All rights reserved.</p>
      </center>
    </footer>
  )
}
