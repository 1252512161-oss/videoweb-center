import {CheckCircle2, Mail, MapPin, Minus, Phone, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuoteCart} from '../context/QuoteCartContext';
import {useSeo} from '../hooks/useSeo';
import {apiFetch} from '../lib/api';
import {formatBrl} from '../lib/format';
import type {QuoteRequest} from '../types/domain';

export function QuotePage() {
  useSeo({
    title: 'Solicitar Orçamento Técnico e Contato',
    description:
      'Solicite proposta comercial para câmeras profissionais, equipamentos cinematográficos, lentes cinematográficas e projetos audiovisuais na VideoWeb Center em São Paulo.',
    canonicalPath: '/orcamento',
    breadcrumbs: [
      {name: 'Início', path: '/'},
      {name: 'Orçamento', path: '/orcamento'},
    ],
  });

  const {items, updateQuantity, removeItem, clearItems, estimatedSubtotal} = useQuoteCart();

  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [projectType, setProjectType] = useState('Compra de Equipamento');
  const [timeline, setTimeline] = useState('Imediato (até 15 dias)');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedQuote, setSubmittedQuote] = useState<QuoteRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (customerName.trim().length < 3) {
      setError('Informe seu nome completo (mínimo 3 caracteres).');
      return;
    }
    if (companyName.trim().length < 2) {
      setError('Informe o nome da produtora, emissora ou empresa.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um endereço de e-mail corporativo ou pessoal válido.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Informe um número de telefone ou WhatsApp válido com DDD.');
      return;
    }

    try {
      setSubmitting(true);
      const data = await apiFetch<{quote?: QuoteRequest}>('/api/quotes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          customerName,
          companyName,
          documentId,
          email,
          phone,
          projectType,
          timeline,
          notes,
          items,
        }),
      });
      if (!data.quote) {
        throw new Error('Erro ao enviar solicitação de orçamento.');
      }
      setSubmittedQuote(data.quote);
      clearItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na comunicação com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedQuote) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-zinc-800 bg-[#121216] p-8 sm:p-10">
          <div className="flex items-center gap-3 text-emerald-400">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <span className="text-sm font-semibold">Solicitação registrada com sucesso</span>
          </div>

          <h1 className="mt-4 font-display text-2xl font-semibold text-zinc-100 sm:text-3xl">
            Protocolo {submittedQuote.protocol}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Recebemos os dados de <strong className="text-zinc-200">{submittedQuote.companyName}</strong>. Nossa equipe de engenharia comercial analisará disponibilidade em estoque, condições de faturamento PJ e retornará para{' '}
            <span className="font-mono text-zinc-200">{submittedQuote.email}</span>.
          </p>

          <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-950/60 p-5 space-y-2 text-xs text-zinc-300">
            <div className="flex justify-between">
              <span className="text-zinc-500">Solicitante</span>
              <span>{submittedQuote.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Modalidade</span>
              <span>{submittedQuote.projectType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Prazo Desejado</span>
              <span>{submittedQuote.timeline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Itens Selecionados</span>
              <span className="font-mono tabular-nums">{submittedQuote.items.length}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/catalogo"
              className="rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
            >
              Continuar no Catálogo
            </Link>
            <button
              type="button"
              onClick={() => setSubmittedQuote(null)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:text-white cursor-pointer"
            >
              Enviar Nova Solicitação
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl border-b border-zinc-800/80 pb-8">
        <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Atendimento B2B & Projetos</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Solicitação de Orçamento Técnico
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Preencha os dados da sua produção ou empresa. Você pode anexar itens do catálogo abaixo ou descrever um projeto completo de engenharia audiovisual.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-7" noValidate>
          {error && (
            <div className="rounded-md border border-red-800/70 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="customerName" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nome completo *
              </label>
              <input
                id="customerName"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex.: Rafael Monteiro"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Empresa / Produtora / Emissora *
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex.: Horizonte Filmes Ltda."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-300 mb-1.5">
                E-mail corporativo *
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@produtora.com.br"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Telefone / WhatsApp *
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="documentId" className="block text-xs font-medium text-zinc-300 mb-1.5">
                CNPJ ou CPF (opcional para pré-faturamento)
              </label>
              <input
                id="documentId"
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="projectType" className="block text-xs font-medium text-zinc-300 mb-1.5">
                Finalidade do atendimento *
              </label>
              <select
                id="projectType"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="Compra de Equipamento">Compra de Equipamento</option>
                <option value="Integração de Estúdio">Integração de Estúdio / Broadcast</option>
                <option value="Locação Corporativa">Locação Corporativa / Série</option>
                <option value="Manutenção & Calibração">Manutenção & Colimação Óptica</option>
                <option value="Licitação / Edital Público">Licitação / Edital Público</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="timeline" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Prazo estimado de entrega ou implantação *
            </label>
            <select
              id="timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="Imediato (até 15 dias)">Imediato (até 15 dias)</option>
              <option value="30 a 60 dias">30 a 60 dias</option>
              <option value="Planejamento Trimestral (90+ dias)">Planejamento Trimestral (90+ dias)</option>
              <option value="Levantamento Orçamentário">Apenas Levantamento Orçamentário</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-medium text-zinc-300 mb-1.5">
              Observações técnicas, acessórios ou escopo do projeto
            </label>
            <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva requisitos de montagem (PL/LPL), cabeamento, cronograma de rodagem ou necessidade de visita técnica..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-amber-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Registrando solicitação...' : 'Enviar Solicitação de Orçamento'}
          </button>
        </form>

        {/* Right Sidebar: Selected Items + Contact Details */}
        <aside className="space-y-6 lg:col-span-5">
          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-zinc-100">Equipamentos Anexados</h2>
              <Link to="/catalogo" className="text-xs font-medium text-amber-400 hover:text-amber-300">
                + Adicionar do catálogo
              </Link>
            </div>

            {items.length === 0 ? (
              <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                Nenhum item específico do catálogo anexado. Você pode enviar este formulário mesmo assim para projetos sob medida ou consultoria.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <ul className="divide-y divide-zinc-800/80">
                  {items.map((item) => (
                    <li key={item.productId} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-400">
                            {item.brandName} · <span className="font-mono">{item.sku}</span>
                          </p>
                          <p className="text-sm font-medium text-zinc-100 mt-0.5">{item.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer"
                          aria-label={`Remover ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-mono text-xs text-amber-400 tabular-nums">
                          {formatBrl(item.priceBrl)}
                        </span>
                        <div className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                            aria-label="Diminuir"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                            aria-label="Aumentar"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between border-t border-zinc-800 pt-3 text-xs">
                  <span className="text-zinc-400">Estimativa referencial</span>
                  <span className="font-mono text-sm font-semibold text-zinc-100 tabular-nums">
                    {estimatedSubtotal !== null ? formatBrl(estimatedSubtotal) : 'Sob consulta'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[#121216] p-6 space-y-4">
            <h2 className="font-display text-base font-semibold text-zinc-100">Showroom & Engenharia</h2>
            <div className="space-y-3 text-xs text-zinc-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Rua da Mooca, 2518, Sala 71 · Mooca, São Paulo – SP · CEP 03104-002
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="font-mono text-zinc-200 tabular-nums">+55 11 98339-9639</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>financeiro@videowebcenter.com.br</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
