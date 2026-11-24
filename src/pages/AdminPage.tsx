import {Database, Globe, Lock, LogOut, Pencil, Plus, Trash2, X} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {useSeo} from '../hooks/useSeo';
import {formatBrl, formatDateTimeBr, STUDIO_IMAGE_PRESETS} from '../lib/format';
import type {
  AdminAuthStatus,
  AvailabilityStatus,
  Brand,
  Category,
  DatabaseStatusInfo,
  Product,
  ProductSpec,
  QuoteRequest,
  QuoteStatus,
} from '../types/domain';

type AdminTab = 'overview' | 'quotes' | 'products' | 'taxonomy';

const QUOTE_STATUS_OPTIONS: QuoteStatus[] = ['Novo', 'Em Análise', 'Proposta Enviada', 'Aprovado', 'Arquivado'];

export function AdminPage() {
  useSeo({
    title: 'Área Administrativa Protegida',
    description: 'Painel de gerenciamento de catálogo, orçamentos e integração de banco de dados da VideoWeb Center.',
    canonicalPath: '/admin',
    noindex: true,
    nofollow: true,
  });

  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [dbStatus, setDbStatus] = useState<DatabaseStatusInfo | null>(null);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Selected quote editor
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [quoteStatusInput, setQuoteStatusInput] = useState<QuoteStatus>('Novo');
  const [quoteAdminNotes, setQuoteAdminNotes] = useState('');

  // Product modal editor
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pSku, setPSku] = useState('');
  const [pShortDesc, setPShortDesc] = useState('');
  const [pFullDesc, setPFullDesc] = useState('');
  const [pCategoryId, setPCategoryId] = useState<number>(1);
  const [pBrandId, setPBrandId] = useState<number>(1);
  const [pPrice, setPPrice] = useState('');
  const [pAvailability, setPAvailability] = useState<AvailabilityStatus>('Pronta Entrega');
  const [pFeatured, setPFeatured] = useState(false);
  const [pImageUrl, setPImageUrl] = useState(STUDIO_IMAGE_PRESETS[0].url);
  const [pWarranty, setPWarranty] = useState('24');
  const [pSpecs, setPSpecs] = useState<ProductSpec[]>([{label: '', value: ''}]);
  const [pInBoxText, setPInBoxText] = useState('');

  // Taxonomy creation forms
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatImg, setNewCatImg] = useState(STUDIO_IMAGE_PRESETS[1].url);

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCountry, setNewBrandCountry] = useState('');
  const [newBrandSpec, setNewBrandSpec] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  useEffect(() => {
    fetch('/api/admin/auth-status')
      .then((res) => res.json() as Promise<AdminAuthStatus>)
      .then((status) => setAuthStatus(status))
      .catch(() => setAuthError('Não foi possível verificar o status de autenticação.'));
  }, []);

  const fetchAdminData = useCallback(async (authToken: string) => {
    try {
      setDataLoading(true);
      const headers = {Authorization: `Bearer ${authToken}`};
      const [ovRes, qRes, pRes, cRes, bRes] = await Promise.all([
        fetch('/api/admin/overview', {headers}),
        fetch('/api/admin/quotes', {headers}),
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/brands'),
      ]);

      if (ovRes.status === 401 || qRes.status === 401) {
        setToken(null);
        setAuthError('Sua sessão administrativa expirou. Entre novamente.');
        return;
      }

      const [ovJson, qJson, pJson, cJson, bJson] = await Promise.all([
        ovRes.json() as Promise<{status: DatabaseStatusInfo}>,
        qRes.json() as Promise<{quotes: QuoteRequest[]}>,
        pRes.json() as Promise<{products: Product[]}>,
        cRes.json() as Promise<{categories: Category[]}>,
        bRes.json() as Promise<{brands: Brand[]}>,
      ]);

      setDbStatus(ovJson.status);
      setQuotes(qJson.quotes);
      setProducts(pJson.products);
      setCategories(cJson.categories);
      setBrands(bJson.brands);
    } catch {
      setActionError('Erro ao carregar dados do painel administrativo.');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchAdminData(token);
    }
  }, [token, fetchAdminData]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passcode.trim().length < 8) {
      setAuthError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (passcode !== confirmPasscode) {
      setAuthError('A confirmação de senha não confere.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({passcode}),
      });
      const data = (await res.json()) as {token?: string; error?: string};
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Erro ao configurar senha administrativa.');
      }
      setPasscode('');
      setConfirmPasscode('');
      setAuthStatus({configured: true, mode: 'db'});
      setToken(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro na configuração inicial.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!passcode.trim()) {
      setAuthError('Informe a senha administrativa.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({passcode}),
      });
      const data = (await res.json()) as {token?: string; error?: string};
      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Credencial inválida.');
      }
      setPasscode('');
      setToken(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Falha ao autenticar.');
    } finally {
      setAuthLoading(false);
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setPName('');
    setPSku('');
    setPShortDesc('');
    setPFullDesc('');
    setPCategoryId(categories[0]?.id || 1);
    setPBrandId(brands[0]?.id || 1);
    setPPrice('');
    setPAvailability('Pronta Entrega');
    setPFeatured(false);
    setPImageUrl(STUDIO_IMAGE_PRESETS[0].url);
    setPWarranty('24');
    setPSpecs([{label: 'Montagem / Interface', value: ''}, {label: 'Alimentação', value: ''}]);
    setPInBoxText('Unidade principal\nManual e certificado de garantia');
    setActionError(null);
    setProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPSku(prod.sku);
    setPShortDesc(prod.shortDescription);
    setPFullDesc(prod.fullDescription);
    setPCategoryId(prod.categoryId);
    setPBrandId(prod.brandId);
    setPPrice(prod.priceBrl !== null ? String(prod.priceBrl) : '');
    setPAvailability(prod.availability);
    setPFeatured(prod.featured);
    setPImageUrl(prod.imageUrl);
    setPWarranty(String(prod.warrantyMonths));
    setPSpecs(prod.specs.length > 0 ? prod.specs : [{label: '', value: ''}]);
    setPInBoxText(prod.inBox.join('\n'));
    setActionError(null);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionError(null);
    setFeedback(null);

    const payload = {
      name: pName,
      sku: pSku,
      shortDescription: pShortDesc,
      fullDescription: pFullDesc,
      categoryId: Number(pCategoryId),
      brandId: Number(pBrandId),
      priceBrl: pPrice.trim() ? Number(pPrice) : null,
      availability: pAvailability,
      featured: pFeatured,
      imageUrl: pImageUrl,
      warrantyMonths: Number(pWarranty || 24),
      specs: pSpecs.filter((s) => s.label.trim() && s.value.trim()),
      inBox: pInBoxText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar equipamento.');
      setProductModalOpen(false);
      setFeedback(editingProduct ? 'Equipamento atualizado com sucesso.' : 'Novo equipamento publicado no catálogo.');
      await fetchAdminData(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao salvar equipamento.');
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!token) return;
    setActionError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${token}`},
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Não foi possível excluir o item.');
      setFeedback(`Equipamento "${name}" removido do catálogo.`);
      await fetchAdminData(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao excluir.');
    }
  };

  const handleSaveQuoteUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedQuote) return;
    setActionError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/quotes/${selectedQuote.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({status: quoteStatusInput, adminNotes: quoteAdminNotes}),
      });
      const data = (await res.json()) as {quote?: QuoteRequest; error?: string};
      if (!res.ok || !data.quote) throw new Error(data.error || 'Falha ao atualizar orçamento.');
      setSelectedQuote(data.quote);
      setFeedback(`Protocolo ${data.quote.protocol} atualizado para "${data.quote.status}".`);
      await fetchAdminData(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao atualizar orçamento.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionError(null);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({name: newCatName, description: newCatDesc, imageUrl: newCatImg}),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Erro ao criar categoria.');
      setNewCatName('');
      setNewCatDesc('');
      setFeedback('Categoria adicionada.');
      await fetchAdminData(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionError(null);
    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
        body: JSON.stringify({
          name: newBrandName,
          country: newBrandCountry,
          specialty: newBrandSpec,
          description: newBrandDesc,
        }),
      });
      const data = (await res.json()) as {error?: string};
      if (!res.ok) throw new Error(data.error || 'Erro ao criar marca.');
      setNewBrandName('');
      setNewBrandCountry('');
      setNewBrandSpec('');
      setNewBrandDesc('');
      setFeedback('Marca parceira cadastrada.');
      await fetchAdminData(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erro ao salvar marca.');
    }
  };

  // Unauthenticated Screen (Setup or Login)
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-lg border border-zinc-800 bg-[#121216] p-7 sm:p-8">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-semibold tracking-wider uppercase">Área Administrativa Protegida</span>
          </div>

          {authStatus === null ? (
            <p className="mt-5 text-sm text-zinc-400">Verificando política de segurança...</p>
          ) : authStatus.mode === 'setup' ? (
            <form onSubmit={handleSetupSubmit} className="mt-5 space-y-4">
              <h1 className="font-display text-xl font-semibold text-zinc-100">
                Configuração Inicial de Acesso
              </h1>
              <p className="text-xs leading-relaxed text-zinc-400">
                Nenhuma variável <code className="font-mono text-zinc-200">ADMIN_PASSCODE</code> foi definida no ambiente. Defina agora a senha mestre do painel administrativo (armazenada com hash criptográfico no servidor).
              </p>

              {authError && (
                <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  {authError}
                </div>
              )}

              <div>
                <label htmlFor="setup-pass" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nova senha administrativa (mín. 8 caracteres)
                </label>
                <input
                  id="setup-pass"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="setup-confirm" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Confirmar senha
                </label>
                <input
                  id="setup-confirm"
                  type="password"
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                {authLoading ? 'Salvando credencial...' : 'Criar Senha e Acessar Painel'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <h1 className="font-display text-xl font-semibold text-zinc-100">Autenticação VideoWeb Center</h1>
              <p className="text-xs leading-relaxed text-zinc-400">
                Informe sua senha administrativa para gerenciar produtos, categorias, marcas e solicitações de orçamento.
              </p>

              {authError && (
                <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                  {authError}
                </div>
              )}

              <div>
                <label htmlFor="login-pass" className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Senha Administrativa
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                {authLoading ? 'Autenticando...' : 'Entrar no Painel'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Admin Top Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Administração & CMS</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-zinc-100">
            Painel Operacional VideoWeb Center
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setToken(null)}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white self-start cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Encerrar Sessão</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-800/80 pb-4">
        {[
          {id: 'overview' as const, label: 'Visão Geral & Banco'},
          {id: 'quotes' as const, label: `Orçamentos (${quotes.length})`},
          {id: 'products' as const, label: `Catálogo (${products.length})`},
          {id: 'taxonomy' as const, label: 'Categorias & Marcas'},
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-zinc-950'
                : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="mt-5 rounded-md border border-emerald-800/70 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-300">
          {feedback}
        </div>
      )}
      {actionError && (
        <div className="mt-5 rounded-md border border-red-800/70 bg-red-950/30 px-4 py-3 text-xs text-red-300">
          {actionError}
        </div>
      )}

      {dataLoading && !dbStatus ? (
        <div className="mt-8 h-64 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
      ) : null}

      {/* TAB 1: Overview & Database Integration Status */}
      {activeTab === 'overview' && dbStatus && (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-[#121216] p-5">
              <p className="text-xs text-zinc-400">Equipamentos no Catálogo</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-zinc-100 tabular-nums">
                {dbStatus.counts.products}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-[#121216] p-5">
              <p className="text-xs text-zinc-400">Pronta Entrega</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-emerald-400 tabular-nums">
                {dbStatus.counts.inStockProducts}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-[#121216] p-5">
              <p className="text-xs text-zinc-400">Orçamentos Recebidos</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-zinc-100 tabular-nums">
                {dbStatus.counts.totalQuotes}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-[#121216] p-5">
              <p className="text-xs text-zinc-400">Aguardando Resposta</p>
              <p className="mt-2 font-mono text-3xl font-semibold text-amber-400 tabular-nums">
                {dbStatus.counts.pendingQuotes}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6">
            <div className="flex items-center gap-2.5">
              <Database className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-base font-semibold text-zinc-100">
                Arquitetura de Persistência & Integrações Externas
              </h2>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Motor de Banco Ativo</dt>
                <dd className="mt-1 font-mono text-zinc-100">{dbStatus.engine}</dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Arquivo de Dados Persistente</dt>
                <dd className="mt-1 font-mono text-zinc-100">{dbStatus.storagePath}</dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Variável DATABASE_URL (PostgreSQL / Supabase)</dt>
                <dd className="mt-1 font-mono text-zinc-300">
                  {dbStatus.externalDatabaseConfigured ? 'Configurada' : 'Opcional — não configurada (.env.example)'}
                </dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">SMTP_HOST / CRM_WEBHOOK_URL</dt>
                <dd className="mt-1 font-mono text-zinc-300">
                  {dbStatus.smtpConfigured || dbStatus.crmWebhookConfigured
                    ? 'Credenciais externas ativas'
                    : 'Modo local — configure em Variáveis de Ambiente para disparo externo'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-base font-semibold text-zinc-100">
                SEO Técnico, Sitemap Dinâmico & Integrações Google
              </h2>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Sitemap Dinâmico & Robots</dt>
                <dd className="mt-1 font-mono text-zinc-100">
                  <a href={dbStatus.seo.sitemapPath} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                    {dbStatus.seo.sitemapPath}
                  </a>
                  {' · '}
                  <a href={dbStatus.seo.robotsPath} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                    {dbStatus.seo.robotsPath}
                  </a>
                </dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Google Search Console</dt>
                <dd className="mt-1 font-mono text-zinc-300">
                  {dbStatus.seo.searchConsoleConfigured
                    ? 'Tag de verificação ativa'
                    : 'Defina GOOGLE_SITE_VERIFICATION'}
                </dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Google Analytics 4</dt>
                <dd className="mt-1 font-mono text-zinc-300">
                  {dbStatus.seo.ga4Configured ? 'ID G-XXXX ativo' : 'Defina GA4_MEASUREMENT_ID'}
                </dd>
              </div>
              <div className="rounded border border-zinc-800/80 bg-zinc-950/50 p-4">
                <dt className="text-zinc-500">Google Tag Manager</dt>
                <dd className="mt-1 font-mono text-zinc-300">
                  {dbStatus.seo.gtmConfigured ? 'Contêiner GTM ativo' : 'Defina GTM_ID (opcional)'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* TAB 2: Quotes Management */}
      {activeTab === 'quotes' && (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 overflow-hidden rounded-lg border border-zinc-800 bg-[#121216]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Protocolo</th>
                    <th className="px-4 py-3 font-medium">Empresa / Solicitante</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Itens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {quotes.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => {
                        setSelectedQuote(q);
                        setQuoteStatusInput(q.status);
                        setQuoteAdminNotes(q.adminNotes);
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedQuote?.id === q.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/70'
                      }`}
                    >
                      <td className="px-4 py-3.5 font-mono text-amber-400 whitespace-nowrap">{q.protocol}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-zinc-100">{q.companyName}</p>
                        <p className="text-zinc-400">{q.customerName}</p>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-300 whitespace-nowrap">{q.status}</td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums text-zinc-300">
                        {q.items.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5">
            {!selectedQuote ? (
              <div className="rounded-lg border border-zinc-800 bg-[#121216] p-8 text-center text-xs text-zinc-400">
                Selecione um protocolo na tabela ao lado para inspecionar os itens solicitados e atualizar o andamento comercial.
              </div>
            ) : (
              <form onSubmit={handleSaveQuoteUpdate} className="rounded-lg border border-zinc-800 bg-[#121216] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <p className="font-mono text-xs text-amber-400">{selectedQuote.protocol}</p>
                    <h3 className="font-display text-base font-semibold text-zinc-100">{selectedQuote.companyName}</h3>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {formatDateTimeBr(selectedQuote.createdAt)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-zinc-300">
                  <p>
                    <span className="text-zinc-500">Contato:</span> {selectedQuote.customerName} · {selectedQuote.phone}
                  </p>
                  <p>
                    <span className="text-zinc-500">E-mail:</span> {selectedQuote.email}
                  </p>
                  <p>
                    <span className="text-zinc-500">Modalidade:</span> {selectedQuote.projectType} · {selectedQuote.timeline}
                  </p>
                  {selectedQuote.notes && (
                    <p className="mt-2 rounded bg-zinc-950/60 p-3 text-zinc-400 leading-relaxed">{selectedQuote.notes}</p>
                  )}
                </div>

                {selectedQuote.items.length > 0 && (
                  <div className="border-t border-zinc-800 pt-3">
                    <p className="text-xs font-medium text-zinc-400 mb-2">Equipamentos solicitados</p>
                    <ul className="space-y-1.5 text-xs">
                      {selectedQuote.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-2 text-zinc-200">
                          <span className="truncate">
                            <span className="font-mono text-zinc-400">{it.quantity}×</span> {it.name}
                          </span>
                          <span className="font-mono text-zinc-400 tabular-nums shrink-0">
                            {formatBrl(it.priceBrl)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <div>
                    <label htmlFor="q-status" className="block text-xs font-medium text-zinc-300 mb-1">
                      Atualizar Status
                    </label>
                    <select
                      id="q-status"
                      value={quoteStatusInput}
                      onChange={(e) => setQuoteStatusInput(e.target.value as QuoteStatus)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
                    >
                      {QUOTE_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="q-notes" className="block text-xs font-medium text-zinc-300 mb-1">
                      Anotações Internas da Engenharia
                    </label>
                    <textarea
                      id="q-notes"
                      rows={3}
                      value={quoteAdminNotes}
                      onChange={(e) => setQuoteAdminNotes(e.target.value)}
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                  >
                    Salvar Atualização do Protocolo
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Products CRUD */}
      {activeTab === 'products' && (
        <div className="mt-8 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Gerencie especificações técnicas, disponibilidade e valores do catálogo.</p>
            <button
              type="button"
              onClick={openNewProductModal}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Equipamento</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-[#121216]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">Equipamento</th>
                    <th className="px-4 py-3 font-medium">Marca / Categoria</th>
                    <th className="px-4 py-3 font-medium">Disponibilidade</th>
                    <th className="px-4 py-3 font-medium text-right">Valor BRL</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/50">
                      <td className="px-4 py-3 font-mono text-zinc-400 whitespace-nowrap">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-zinc-100">{p.name}</td>
                      <td className="px-4 py-3 text-zinc-400">
                        {p.brandName} · {p.categoryName}
                      </td>
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{p.availability}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-100 whitespace-nowrap">
                        {formatBrl(p.priceBrl)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(p)}
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400 cursor-pointer"
                            aria-label={`Editar ${p.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 cursor-pointer"
                            aria-label={`Excluir ${p.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Categories & Brands */}
      {activeTab === 'taxonomy' && (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-zinc-100">Categorias Ativas ({categories.length})</h2>
            <ul className="divide-y divide-zinc-800/80 text-xs">
              {categories.map((c) => (
                <li key={c.id} className="py-2.5 flex items-center justify-between">
                  <span className="text-zinc-200 font-medium">{c.name}</span>
                  <span className="font-mono text-zinc-500 tabular-nums">{c.productCount ?? 0} itens</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleCreateCategory} className="border-t border-zinc-800 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-300">Adicionar Categoria</h3>
              <input
                type="text"
                required
                placeholder="Nome da categoria (ex.: Monitores de Referência)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
              />
              <input
                type="text"
                required
                placeholder="Descrição técnica breve"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
              />
              <select
                value={newCatImg}
                onChange={(e) => setNewCatImg(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
              >
                {STUDIO_IMAGE_PRESETS.map((img) => (
                  <option key={img.url} value={img.url}>
                    {img.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Cadastrar Categoria
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6 space-y-5">
            <h2 className="font-display text-base font-semibold text-zinc-100">Marcas Parceiras ({brands.length})</h2>
            <ul className="divide-y divide-zinc-800/80 text-xs">
              {brands.map((b) => (
                <li key={b.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-zinc-200 font-medium">{b.name}</span>
                    <span className="ml-2 text-zinc-500">· {b.country}</span>
                  </div>
                  <span className="font-mono text-zinc-500 tabular-nums">{b.productCount ?? 0} itens</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleCreateBrand} className="border-t border-zinc-800 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-300">Adicionar Marca Oficial</h3>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da marca"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
                />
                <input
                  type="text"
                  required
                  placeholder="País de origem"
                  value={newBrandCountry}
                  onChange={(e) => setNewBrandCountry(e.target.value)}
                  className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <input
                type="text"
                required
                placeholder="Especialidade principal"
                value={newBrandSpec}
                onChange={(e) => setNewBrandSpec(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
              />
              <input
                type="text"
                required
                placeholder="Descrição institucional"
                value={newBrandDesc}
                onChange={(e) => setNewBrandDesc(e.target.value)}
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Cadastrar Marca
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Product Modal (Create / Edit) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-[#121216] p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="font-display text-lg font-semibold text-zinc-100">
                {editingProduct ? `Editar: ${editingProduct.name}` : 'Cadastrar Novo Equipamento'}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-300 mb-1">Nome do Equipamento *</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    placeholder="VW-CAM-001"
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-zinc-300 mb-1">Categoria *</label>
                  <select
                    value={pCategoryId}
                    onChange={(e) => setPCategoryId(Number(e.target.value))}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Marca *</label>
                  <select
                    value={pBrandId}
                    onChange={(e) => setPBrandId(Number(e.target.value))}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-zinc-300 mb-1">Valor BRL (vazio = Sob consulta)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Disponibilidade</label>
                  <select
                    value={pAvailability}
                    onChange={(e) => setPAvailability(e.target.value as AvailabilityStatus)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                  >
                    <option value="Pronta Entrega">Pronta Entrega</option>
                    <option value="Sob Encomenda">Sob Encomenda</option>
                    <option value="Locação & Venda">Locação & Venda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-300 mb-1">Garantia (meses)</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={pWarranty}
                    onChange={(e) => setPWarranty(e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Fotografia do Estúdio *</label>
                <select
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                >
                  {STUDIO_IMAGE_PRESETS.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Resumo Comercial (1 linha) *</label>
                <input
                  type="text"
                  required
                  value={pShortDesc}
                  onChange={(e) => setPShortDesc(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Descrição Técnica Completa *</label>
                <textarea
                  rows={3}
                  required
                  value={pFullDesc}
                  onChange={(e) => setPFullDesc(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-300">Especificações Técnicas</label>
                  <button
                    type="button"
                    onClick={() => setPSpecs((prev) => [...prev, {label: '', value: ''}])}
                    className="text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    + Adicionar especificação
                  </button>
                </div>
                <div className="space-y-2">
                  {pSpecs.map((spec, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Parâmetro (ex.: Sensor)"
                        value={spec.label}
                        onChange={(e) =>
                          setPSpecs((prev) =>
                            prev.map((s, i) => (i === idx ? {...s, label: e.target.value} : s))
                          )
                        }
                        className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-zinc-100"
                      />
                      <input
                        type="text"
                        placeholder="Valor (ex.: Super 35 4.6K)"
                        value={spec.value}
                        onChange={(e) =>
                          setPSpecs((prev) =>
                            prev.map((s, i) => (i === idx ? {...s, value: e.target.value} : s))
                          )
                        }
                        className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 font-mono text-zinc-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1">Itens Inclusos (1 por linha)</label>
                <textarea
                  rows={3}
                  value={pInBoxText}
                  onChange={(e) => setPInBoxText(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pFeatured}
                  onChange={(e) => setPFeatured(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 accent-amber-500"
                />
                <span>Destacar na Página Inicial</span>
              </label>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="rounded-md border border-zinc-700 px-4 py-2 text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-500 px-5 py-2 font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Publicar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
