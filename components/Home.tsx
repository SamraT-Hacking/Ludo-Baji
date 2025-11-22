
import React, { useState, useEffect, useContext } from 'react';
import { LudoLogoSVG } from '../assets/icons';
import { AppConfigContext } from '../App';
import { supabase } from '../utils/supabase';

// --- SVG Icons for Landing Page ---
const TournamentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V2Z"/>
    </svg>
);
const MoneyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
);
const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);
const socialIcons = {
    facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`,
    twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>`,
    instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>`
}

interface HomeProps {
    onNavigateToLogin: () => void;
}

const Home: React.FC<HomeProps> = ({ onNavigateToLogin }) => {
    const { appTitle } = useContext(AppConfigContext);
    const [images, setImages] = useState({
        about_image: 'https://i.imgur.com/PhJByIb.jpeg',
        screenshots: Array.from({ length: 6 }).map((_, i) => `https://picsum.photos/400/800?random=${i+1}`),
        avatars: Array.from({ length: 3 }).map((_, i) => `https://i.pravatar.cc/150?u=a042581f4e29026704${String.fromCharCode(100+i)}`)
    });

    useEffect(() => {
        if (!supabase) return;
        const fetchImages = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'home_page_config').single();
            if (data && data.value) {
                const config = data.value as any;
                setImages(prev => ({
                    about_image: config.about_image || prev.about_image,
                    screenshots: config.screenshots && config.screenshots.length === 6 ? config.screenshots : prev.screenshots,
                    avatars: config.avatars && config.avatars.length === 3 ? config.avatars : prev.avatars
                }));
            }
        };
        fetchImages();
    }, []);

    return (
        <div className="landing-page-container">
            <header className="landing-header">
                <a href="#home" className="logo">
                    <div dangerouslySetInnerHTML={{ __html: LudoLogoSVG(36) }} />
                    <span className="logo-title">{appTitle}</span>
                </a>
                <nav className="main-nav">
                    <a href="#home">Home</a>
                    <a href="#about">About</a>
                    <a href="#feature">Feature</a>
                    <a href="#screenshot">Screenshot</a>
                    <a href="#testimonial">Clients</a>
                </nav>
            </header>

            <main>
                <section id="home" className="hero-section">
                    <h1>Play Ludo, <br />Win Real Money</h1>
                    <p className="subtitle">
                        The ultimate online Ludo platform where your skills turn into real cash prizes. Join thousands of players in exciting tournaments and prove you are the Ludo champion.
                    </p>
                    <button className="cta-button" onClick={onNavigateToLogin}>
                        Login & Play Now
                    </button>
                </section>
                
                <section id="about" className="about-section">
                    <div className="about-content">
                        <div className="about-image">
                            <img src={images.about_image} alt="Ludo dice and pieces" />
                        </div>
                        <div className="about-text">
                            <h2>About {appTitle}</h2>
                            <p>Are you addicted to Online Games? Have you ever thought of earning through Online Gaming? {appTitle} is an Online Portal which Offers Rewards and Unlimited Entertainment for Participating and Playing Games Online.</p>
                            <p>Ludo is among the most popular board games. Play Ludo with real players in our app and win real cash. Withdraw within 1 Hour in your favorite medium:</p>
                            <ul>
                                <li><CheckIcon /> PayTM, PhonePay, or any other wallet</li>
                                <li><CheckIcon /> UPI, Gpay, Bank transfer, etc.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section id="feature" className="features-section">
                    <div className="section-title">
                        <h2>Our App Features</h2>
                        <p>We have developed our app using the latest technology. Our creative team works on UI/UX regularly for a user-friendly interface.</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon"><TournamentIcon /></div>
                            <h3>Join Custom Match</h3>
                            <p>Enjoy custom matches every time. Play with real players, perform well, and get rewarded for your skills.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><MoneyIcon /></div>
                            <h3>Win Big Prizes</h3>
                            <p>Play {appTitle} and climb the leaderboard to smash exciting prize pools in every match you win.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><ClockIcon /></div>
                            <h3>24x7 Withdrawal</h3>
                            <p>You can withdraw your prize money at any time using your chosen method like PayTM, UPI, and more.</p>
                        </div>
                    </div>
                </section>

                <section id="screenshot" className="screenshot-section">
                     <div className="section-title">
                        <h2>App Screenshots</h2>
                        <p>For a better understanding of the app layout and how it works, here are our app snapshots.</p>
                    </div>
                    <div className="screenshot-grid">
                        {images.screenshots.map((src: string, i: number) => (
                             <div key={i} className="screenshot-item">
                                <img src={src} alt={`App screenshot ${i + 1}`} />
                            </div>
                        ))}
                    </div>
                </section>

                <section id="testimonial" className="testimonial-section">
                    <div className="section-title">
                        <h2>What Our Clients Say</h2>
                        <p>We are trusted by thousands of players worldwide. Here's what some of them have to say about {appTitle}.</p>
                    </div>
                    <div className="testimonial-grid">
                        <div className="testimonial-card">
                            <p className="testimonial-text">"The best Ludo earning app I've ever played. The withdrawals are super fast and the community is great!"</p>
                            <div className="testimonial-author">
                                <div className="author-avatar"><img src={images.avatars[0]} alt="Mickel Harice" /></div>
                                <span className="author-name">Mickel Harice</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <p className="testimonial-text">"Finally, a fair and secure platform. I love the constant tournaments and the thrill of competition. Highly recommended."</p>
                             <div className="testimonial-author">
                                <div className="author-avatar"><img src={images.avatars[1]} alt="Natasa" /></div>
                                <span className="author-name">Natasa</span>
                            </div>
                        </div>
                        <div className="testimonial-card">
                            <p className="testimonial-text">"I was skeptical at first, but {appTitle} is legit. I've won and withdrawn money multiple times without any issues."</p>
                            <div className="testimonial-author">
                                <div className="author-avatar"><img src={images.avatars[2]} alt="Akash" /></div>
                                <span className="author-name">Akash</span>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="social-links">
                    <a href="#" dangerouslySetInnerHTML={{ __html: socialIcons.facebook }} />
                    <a href="#" dangerouslySetInnerHTML={{ __html: socialIcons.twitter }} />
                    <a href="#" dangerouslySetInnerHTML={{ __html: socialIcons.instagram }} />
                    <a href="#" dangerouslySetInnerHTML={{ __html: socialIcons.linkedin }} />
                </div>
                <div className="footer-nav">
                    <a href="#">Contact</a>
                    <a href="#">Rules</a>
                    <a href="#">Privacy Policy</a>
                    <a href="#">Terms & Condition</a>
                </div>
                <p className="copyright">&copy; {new Date().getFullYear()} {appTitle}. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default Home;
