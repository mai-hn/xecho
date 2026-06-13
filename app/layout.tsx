import React from 'react';
import Link from 'next/link';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './global.css';

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="zh-CN">
    <body>
      <AntdRegistry>
        <div className="site-shell">
          <header className="site-header">
            <Link className="site-logo" href="/" aria-label="xEcho home">
              <span>xEcho</span>
              <i aria-hidden="true" />
            </Link>

            <nav className="site-nav" aria-label="primary navigation">
              <a href="#home">&#20027;&#39029;</a>
              <a href="#projects">&#39033;&#30446;</a>
              <a href="#tools">&#24037;&#20855;</a>
              <a href="#blog">&#21338;&#23458;</a>
              <a href="#about">&#20851;&#20110;</a>
            </nav>

            <a className="site-cta" href="#contact">
              &#32852;&#31995;&#25105;
            </a>
          </header>

          <main className="site-main">{children}</main>
        </div>
      </AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
