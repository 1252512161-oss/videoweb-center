import {useEffect} from 'react';
import {BrowserRouter, Route, Routes, useLocation} from 'react-router-dom';
import {Footer} from './components/Footer';
import {Navbar} from './components/Navbar';
import {QuoteDrawer} from './components/QuoteDrawer';
import {QuoteCartProvider} from './context/QuoteCartContext';
import {AdminPage} from './pages/AdminPage';
import {BrandsPage} from './pages/BrandsPage';
import {CatalogPage} from './pages/CatalogPage';
import {HomePage} from './pages/HomePage';
import {NotFoundPage} from './pages/NotFoundPage';
import {ProductDetailPage} from './pages/ProductDetailPage';
import {QuotePage} from './pages/QuotePage';
import {SolutionsPage} from './pages/SolutionsPage';

function ScrollToTop() {
  const {pathname} = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <QuoteCartProvider>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col bg-[#09090B] text-zinc-100">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalogo" element={<CatalogPage />} />
              <Route path="/produto/:slug" element={<ProductDetailPage />} />
              <Route path="/marcas" element={<BrandsPage />} />
              <Route path="/solucoes" element={<SolutionsPage />} />
              <Route path="/orcamento" element={<QuotePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <QuoteDrawer />
        </div>
      </QuoteCartProvider>
    </BrowserRouter>
  );
}
