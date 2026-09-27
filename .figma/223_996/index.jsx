import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.vendors}>
      <img
        src="../image/mjvn43wq-zuq77sd.png"
        className={styles.nightCrawlersLogoWhi}
      />
      <div className={styles.autoWrapper3}>
        <div className={styles.autoWrapper}>
          <div className={styles.menuNav}>
            <p className={styles.home}>Home</p>
            <p className={styles.home}>Contact Us</p>
            <p className={styles.home}>Partners</p>
            <p className={styles.home}>FAQs</p>
          </div>
          <div className={styles.navButtons}>
            <div className={styles.buttonLogIn}>
              <img
                src="../image/mjvn43wq-xeroy9i.png"
                className={styles.shoppingCart}
              />
            </div>
            <div className={styles.buttonLogIn2}>
              <img
                src="../image/mjvn43wq-uou4vky.png"
                className={styles.customer}
              />
            </div>
          </div>
        </div>
        <img src="../image/mjvn43v7-1c3q838.svg" className={styles.vector1} />
        <div className={styles.heroSection2}>
          <div className={styles.aboutNightCrawlers2}>
            <p className={styles.aboutNightCrawlers}>Become a Partner</p>
          </div>
          <div className={styles.heroSection2Inner1}>
            <div className={styles.heroSection2Inner2}>
              <p className={styles.partnerWithUsAndBeco}>
                Earn with Night Crawlers! Become a partner
              </p>
              <p className={styles.joinThousandsOfResta}>
                Join thousands of restaurants, supermarkets, beauty stores and
                pharmacies reaching millions of customers daily on Chowdeck.
              </p>
              <div className={styles.checkOutContainer}>
                <div className={styles.buttonCheckOut}>
                  <p className={styles.signUpAsPartner}>Sign up as a Partner</p>
                </div>
                <div className={styles.buttonContinueDhoppi}>
                  <p className={styles.logIn}>Log In</p>
                </div>
              </div>
            </div>
            <img
              src="../image/mjvn43wq-svel9ot.png"
              className={styles.hero2Image}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.autoWrapper2}>
            <div className={styles.logoFooterText}>
              <img
                src="../image/mjvn43wq-7wkas9o.png"
                className={styles.nightCrawlersLogoBla}
              />
              <p className={styles.getYourFavoriteMeals}>
                Get your favorite meals delivered fast, fresh, and right to your
                door.
              </p>
            </div>
            <div className={styles.links}>
              <div className={styles.aFooterLinksColumn}>
                <p className={styles.heading}>Product</p>
                <div className={styles.footerLinks}>
                  <p className={styles.text}>Overview</p>
                  <p className={styles.text}>Features</p>
                </div>
              </div>
              <div className={styles.aFooterLinksColumn}>
                <p className={styles.heading}>Company</p>
                <div className={styles.footerLinks}>
                  <p className={styles.text}>About us</p>
                  <p className={styles.text}>Contact</p>
                </div>
              </div>
              <div className={styles.aFooterLinksColumn}>
                <p className={styles.heading}>Legal</p>
                <div className={styles.footerLinks}>
                  <p className={styles.text}>Terms</p>
                  <p className={styles.text}>Privacy</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.footerIncSocials}>
            <p className={styles.footerText}>© 2026 Night Crawlers.inc</p>
            <div className={styles.socials}>
              <img
                src="../image/mjvn43wq-eut0w27.png"
                className={styles.instagram}
              />
              <img
                src="../image/mjvn43wq-2woss13.png"
                className={styles.instagram}
              />
              <img
                src="../image/mjvn43wq-mpcbr39.png"
                className={styles.instagram}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
